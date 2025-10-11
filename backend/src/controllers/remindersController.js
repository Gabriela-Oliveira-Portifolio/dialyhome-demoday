const db = require('../config/database');

const remindersController = {
  // Buscar todos os lembretes do usuário
  getReminders: async (req, res) => {
    try {
      const userId = req.user.id;
      const { limit, offset } = req.query;

      // Buscar paciente_id
      const patientResult = await db.query(
        'SELECT id FROM pacientes WHERE usuario_id = $1',
        [userId]
      );

      if (patientResult.rows.length === 0) {
        return res.status(404).json({ error: 'Paciente não encontrado' });
      }

      const pacienteId = patientResult.rows[0].id;

      let query = `
        SELECT 
          id,
          tipo,
          titulo,
          descricao,
          data_hora,
          recorrente,
          frequencia_recorrencia,
          ativo,
          data_criacao
        FROM lembretes
        WHERE paciente_id = $1 AND ativo = true
        ORDER BY data_hora ASC
      `;

      const params = [pacienteId];

      if (limit) {
        query += ` LIMIT ${params.length + 1}`;
        params.push(parseInt(limit));
      }

      if (offset) {
        query += ` OFFSET ${params.length + 1}`;
        params.push(parseInt(offset));
      }

      const result = await db.query(query, params);

      res.json({ 
        reminders: result.rows,
        total: result.rows.length 
      });
    } catch (error) {
      console.error('Erro ao buscar lembretes:', error);
      res.status(500).json({ error: 'Erro ao buscar lembretes' });
    }
  },

  // Criar novo lembrete
  createReminder: async (req, res) => {
    try {
      const userId = req.user.id;
      const { tipo, titulo, descricao, data_hora, recorrente, frequencia_recorrencia } = req.body;

      // Validações
      if (!tipo || !titulo || !data_hora) {
        return res.status(400).json({ error: 'Tipo, título e data/hora são obrigatórios' });
      }

      // Validar tipo
      const tiposValidos = ['medicacao', 'dialise', 'consulta', 'exame', 'outro'];
      if (!tiposValidos.includes(tipo)) {
        return res.status(400).json({ error: 'Tipo de lembrete inválido' });
      }

      // Buscar paciente_id
      const patientResult = await db.query(
        'SELECT id FROM pacientes WHERE usuario_id = $1',
        [userId]
      );

      if (patientResult.rows.length === 0) {
        return res.status(404).json({ error: 'Paciente não encontrado' });
      }

      const pacienteId = patientResult.rows[0].id;

      const result = await db.query(
        `INSERT INTO lembretes (
          paciente_id,
          tipo,
          titulo,
          descricao,
          data_hora,
          recorrente,
          frequencia_recorrencia,
          ativo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        RETURNING *`,
        [
          pacienteId,
          tipo,
          titulo,
          descricao || null,
          data_hora,
          recorrente || false,
          frequencia_recorrencia || null
        ]
      );

      res.status(201).json({
        message: 'Lembrete criado com sucesso',
        reminder: result.rows[0]
      });
    } catch (error) {
      console.error('Erro ao criar lembrete:', error);
      res.status(500).json({ error: 'Erro ao criar lembrete', details: error.message });
    }
  },

  // Atualizar lembrete
  updateReminder: async (req, res) => {
    try {
      const userId = req.user.id;
      const reminderId = req.params.id;
      const { tipo, titulo, descricao, data_hora, recorrente, frequencia_recorrencia } = req.body;

      // Buscar paciente_id
      const patientResult = await db.query(
        'SELECT id FROM pacientes WHERE usuario_id = $1',
        [userId]
      );

      if (patientResult.rows.length === 0) {
        return res.status(404).json({ error: 'Paciente não encontrado' });
      }

      const pacienteId = patientResult.rows[0].id;

      // Verificar se o lembrete pertence ao usuário
      const checkResult = await db.query(
        'SELECT id FROM lembretes WHERE id = $1 AND paciente_id = $2',
        [reminderId, pacienteId]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Lembrete não encontrado' });
      }

      const result = await db.query(
        `UPDATE lembretes SET
          tipo = COALESCE($1, tipo),
          titulo = COALESCE($2, titulo),
          descricao = COALESCE($3, descricao),
          data_hora = COALESCE($4, data_hora),
          recorrente = COALESCE($5, recorrente),
          frequencia_recorrencia = COALESCE($6, frequencia_recorrencia)
        WHERE id = $7
        RETURNING *`,
        [tipo, titulo, descricao, data_hora, recorrente, frequencia_recorrencia, reminderId]
      );

      res.json({
        message: 'Lembrete atualizado com sucesso',
        reminder: result.rows[0]
      });
    } catch (error) {
      console.error('Erro ao atualizar lembrete:', error);
      res.status(500).json({ error: 'Erro ao atualizar lembrete' });
    }
  },

  // Deletar lembrete (soft delete)
  deleteReminder: async (req, res) => {
    try {
      const userId = req.user.id;
      const reminderId = req.params.id;

      // Buscar paciente_id
      const patientResult = await db.query(
        'SELECT id FROM pacientes WHERE usuario_id = $1',
        [userId]
      );

      if (patientResult.rows.length === 0) {
        return res.status(404).json({ error: 'Paciente não encontrado' });
      }

      const pacienteId = patientResult.rows[0].id;

      const result = await db.query(
        `UPDATE lembretes
        SET ativo = false
        WHERE id = $1 AND paciente_id = $2
        RETURNING id`,
        [reminderId, pacienteId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Lembrete não encontrado' });
      }

      res.json({ message: 'Lembrete deletado com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar lembrete:', error);
      res.status(500).json({ error: 'Erro ao deletar lembrete' });
    }
  },

  // Buscar lembretes próximos (hoje e amanhã)
  getUpcomingReminders: async (req, res) => {
    try {
      const userId = req.user.id;

      // Buscar paciente_id
      const patientResult = await db.query(
        'SELECT id FROM pacientes WHERE usuario_id = $1',
        [userId]
      );

      if (patientResult.rows.length === 0) {
        return res.status(404).json({ error: 'Paciente não encontrado' });
      }

      const pacienteId = patientResult.rows[0].id;

      const result = await db.query(
        `SELECT 
          id,
          tipo,
          titulo,
          descricao,
          data_hora
        FROM lembretes
        WHERE paciente_id = $1 
          AND ativo = true
          AND data_hora >= NOW()
          AND data_hora <= NOW() + INTERVAL '2 days'
        ORDER BY data_hora ASC
        LIMIT 10`,
        [pacienteId]
      );

      res.json({ reminders: result.rows });
    } catch (error) {
      console.error('Erro ao buscar lembretes próximos:', error);
      res.status(500).json({ error: 'Erro ao buscar lembretes próximos' });
    }
  }
};

module.exports = remindersController;