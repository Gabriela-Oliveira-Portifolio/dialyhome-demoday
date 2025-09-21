const db = require('../config/database');

const getPatients = async (req, res) => {
  try {
    // Buscar médico baseado no usuário logado
    const doctorResult = await db.query('SELECT id FROM medicos WHERE usuario_id = $1', [req.user.id]);
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    const medico_id = doctorResult.rows[0].id;

    const result = await db.query(`
      SELECT p.id, u.nome, u.email, p.cpf, p.data_nascimento, p.telefone, 
             p.data_inicio_tratamento, p.observacoes_medicas
      FROM pacientes p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.medico_responsavel_id = $1 AND u.ativo = true
      ORDER BY u.nome
    `, [medico_id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar pacientes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const getPatientDetails = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Verificar se o paciente pertence ao médico
    const doctorResult = await db.query('SELECT id FROM medicos WHERE usuario_id = $1', [req.user.id]);
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    const result = await db.query(`
      SELECT p.*, u.nome, u.email
      FROM pacientes p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.id = $1 AND p.medico_responsavel_id = $2
    `, [patientId, doctorResult.rows[0].id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    // Buscar últimos registros de diálise
    const dialysisResult = await db.query(`
      SELECT * FROM registros_dialise 
      WHERE paciente_id = $1 
      ORDER BY data_registro DESC, horario_inicio DESC 
      LIMIT 10
    `, [patientId]);

    // Buscar medicamentos
    const medicationsResult = await db.query(
      'SELECT * FROM medicamentos WHERE paciente_id = $1 AND ativo = true',
      [patientId]
    );

    res.json({
      patient: result.rows[0],
      recentDialysis: dialysisResult.rows,
      medications: medicationsResult.rows
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes do paciente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const getNotifications = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM notificacoes 
      WHERE usuario_destinatario_id = $1 
      ORDER BY data_criacao DESC 
      LIMIT 50
    `, [req.user.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = { getPatients, getPatientDetails, getNotifications };