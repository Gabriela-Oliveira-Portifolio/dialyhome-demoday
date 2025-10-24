// backend/src/controllers/messagingController.js

const db = require('../config/database');

// ===============================
// ENVIAR MENSAGEM
// ===============================
const sendMessage = async (req, res) => {
  try {
    const { destinatario_id, assunto, mensagem } = req.body;

    if (!destinatario_id || !mensagem) {
      return res.status(400).json({ error: 'Destinatário e mensagem são obrigatórios' });
    }

    // Verificar se o destinatário existe
    const destinatarioCheck = await db.query(
      'SELECT id, role FROM usuarios WHERE id = $1',
      [destinatario_id]
    );

    if (destinatarioCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Destinatário não encontrado' });
    }

    // Verificar relacionamento médico-paciente
    if (req.user.role === 'paciente') {
      // Paciente só pode enviar para seu médico
      const patientResult = await db.query(
        'SELECT medico_responsavel_id FROM pacientes WHERE usuario_id = $1',
        [req.user.id]
      );

      if (patientResult.rows.length === 0) {
        return res.status(404).json({ error: 'Paciente não encontrado' });
      }

      const medicoResult = await db.query(
        'SELECT usuario_id FROM medicos WHERE id = $1',
        [patientResult.rows[0].medico_responsavel_id]
      );

      if (medicoResult.rows.length === 0 || medicoResult.rows[0].usuario_id !== parseInt(destinatario_id)) {
        return res.status(403).json({ error: 'Você só pode enviar mensagens para seu médico' });
      }
    } else if (req.user.role === 'medico') {
      // Médico só pode enviar para seus pacientes
      const medicoResult = await db.query(
        'SELECT id FROM medicos WHERE usuario_id = $1',
        [req.user.id]
      );

      if (medicoResult.rows.length === 0) {
        return res.status(404).json({ error: 'Médico não encontrado' });
      }

      const patientResult = await db.query(
        'SELECT id FROM pacientes WHERE usuario_id = $1 AND medico_responsavel_id = $2',
        [destinatario_id, medicoResult.rows[0].id]
      );

      if (patientResult.rows.length === 0) {
        return res.status(403).json({ error: 'Você só pode enviar mensagens para seus pacientes' });
      }
    }

    // Inserir mensagem
    const result = await db.query(`
      INSERT INTO mensagens (
        remetente_id,
        destinatario_id,
        assunto,
        mensagem,
        lida,
        data_criacao
      ) VALUES ($1, $2, $3, $4, false, CURRENT_TIMESTAMP)
      RETURNING *
    `, [req.user.id, destinatario_id, assunto, mensagem]);

    // Criar notificação para o destinatário
    await db.query(`
      INSERT INTO notificacoes (
        usuario_destinatario_id,
        tipo,
        titulo,
        mensagem,
        lida
      ) VALUES ($1, $2, $3, $4, false)
    `, [
      destinatario_id,
      'nova_mensagem',
      'Nova mensagem',
      `Você recebeu uma nova mensagem${assunto ? `: ${assunto}` : ''}`
    ]);

    res.status(201).json({
      message: 'Mensagem enviada com sucesso',
      mensagem: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ===============================
// LISTAR CONVERSAS
// ===============================
const getConversations = async (req, res) => {
  try {
    const result = await db.query(`
      WITH ultimas_mensagens AS (
        SELECT DISTINCT ON (
          CASE 
            WHEN remetente_id = $1 THEN destinatario_id 
            ELSE remetente_id 
          END
        )
        CASE 
          WHEN remetente_id = $1 THEN destinatario_id 
          ELSE remetente_id 
        END as outro_usuario_id,
        mensagem,
        data_criacao,
        lida,
        remetente_id
        FROM mensagens
        WHERE remetente_id = $1 OR destinatario_id = $1
        ORDER BY 
          CASE 
            WHEN remetente_id = $1 THEN destinatario_id 
            ELSE remetente_id 
          END,
          data_criacao DESC
      )
      SELECT 
        um.*,
        u.nome,
        u.email,
        (SELECT COUNT(*) 
         FROM mensagens 
         WHERE destinatario_id = $1 
           AND remetente_id = um.outro_usuario_id 
           AND lida = false) as mensagens_nao_lidas
      FROM ultimas_mensagens um
      JOIN usuarios u ON u.id = um.outro_usuario_id
      ORDER BY um.data_criacao DESC
    `, [req.user.id]);

    res.json({ conversations: result.rows });
  } catch (error) {
    console.error('Erro ao buscar conversas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ===============================
// LISTAR MENSAGENS DE UMA CONVERSA
// ===============================
const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verificar relacionamento
    if (req.user.role === 'paciente') {
      const patientResult = await db.query(
        'SELECT medico_responsavel_id FROM pacientes WHERE usuario_id = $1',
        [req.user.id]
      );

      if (patientResult.rows.length === 0) {
        return res.status(404).json({ error: 'Paciente não encontrado' });
      }

      const medicoResult = await db.query(
        'SELECT usuario_id FROM medicos WHERE id = $1',
        [patientResult.rows[0].medico_responsavel_id]
      );

      if (medicoResult.rows.length === 0 || medicoResult.rows[0].usuario_id !== parseInt(userId)) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
    } else if (req.user.role === 'medico') {
      const medicoResult = await db.query(
        'SELECT id FROM medicos WHERE usuario_id = $1',
        [req.user.id]
      );

      if (medicoResult.rows.length === 0) {
        return res.status(404).json({ error: 'Médico não encontrado' });
      }

      const patientResult = await db.query(
        'SELECT id FROM pacientes WHERE usuario_id = $1 AND medico_responsavel_id = $2',
        [userId, medicoResult.rows[0].id]
      );

      if (patientResult.rows.length === 0) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
    }

    // Buscar mensagens
    const result = await db.query(`
      SELECT 
        m.*,
        u_rem.nome as remetente_nome,
        u_dest.nome as destinatario_nome
      FROM mensagens m
      JOIN usuarios u_rem ON m.remetente_id = u_rem.id
      JOIN usuarios u_dest ON m.destinatario_id = u_dest.id
      WHERE (m.remetente_id = $1 AND m.destinatario_id = $2)
         OR (m.remetente_id = $2 AND m.destinatario_id = $1)
      ORDER BY m.data_criacao DESC
      LIMIT $3 OFFSET $4
    `, [req.user.id, userId, limit, offset]);

    // Marcar mensagens como lidas
    await db.query(`
      UPDATE mensagens 
      SET lida = true, data_leitura = CURRENT_TIMESTAMP
      WHERE destinatario_id = $1 AND remetente_id = $2 AND lida = false
    `, [req.user.id, userId]);

    res.json({ messages: result.rows.reverse() });
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ===============================
// MARCAR MENSAGEM COMO LIDA
// ===============================
const markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;

    const result = await db.query(`
      UPDATE mensagens 
      SET lida = true, data_leitura = CURRENT_TIMESTAMP
      WHERE id = $1 AND destinatario_id = $2
      RETURNING *
    `, [messageId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mensagem não encontrada' });
    }

    res.json({ message: 'Mensagem marcada como lida', mensagem: result.rows[0] });
  } catch (error) {
    console.error('Erro ao marcar mensagem como lida:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ===============================
// DELETAR MENSAGEM
// ===============================
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const result = await db.query(`
      DELETE FROM mensagens 
      WHERE id = $1 AND remetente_id = $2
      RETURNING *
    `, [messageId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mensagem não encontrada ou você não tem permissão para deletá-la' });
    }

    res.json({ message: 'Mensagem deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar mensagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ===============================
// OBTER INFORMAÇÕES DO CONTATO
// ===============================
const getContactInfo = async (req, res) => {
  try {
    if (req.user.role === 'paciente') {
      // Buscar médico do paciente
      const result = await db.query(`
        SELECT 
          u.id,
          u.nome,
          u.email,
          u.role,
          m.crm,
          m.especialidade
        FROM pacientes p
        JOIN medicos m ON p.medico_responsavel_id = m.id
        JOIN usuarios u ON m.usuario_id = u.id
        WHERE p.usuario_id = $1
      `, [req.user.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Médico não encontrado' });
      }

      res.json({ contact: result.rows[0] });
    } else if (req.user.role === 'medico') {
      // Retornar lista de pacientes
      const medicoResult = await db.query(
        'SELECT id FROM medicos WHERE usuario_id = $1',
        [req.user.id]
      );

      if (medicoResult.rows.length === 0) {
        return res.status(404).json({ error: 'Médico não encontrado' });
      }

      const result = await db.query(`
        SELECT 
          u.id,
          u.nome,
          u.email,
          u.role,
          p.data_nascimento,
          EXTRACT(YEAR FROM AGE(p.data_nascimento)) as idade
        FROM pacientes p
        JOIN usuarios u ON p.usuario_id = u.id
        WHERE p.medico_responsavel_id = $1
        ORDER BY u.nome
      `, [medicoResult.rows[0].id]);

      res.json({ contacts: result.rows });
    }
  } catch (error) {
    console.error('Erro ao buscar contato:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  sendMessage,
  getConversations,
  getMessages,
  markAsRead,
  deleteMessage,
  getContactInfo
};