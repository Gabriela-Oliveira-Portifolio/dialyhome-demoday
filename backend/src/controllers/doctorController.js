// backend/src/controllers/doctorController.js - VERSÃO CORRIGIDA

const db = require('../config/database');

// Perfil do médico
const getProfile = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT m.*, u.nome, u.email
      FROM medicos m
      JOIN usuarios u ON m.usuario_id = u.id
      WHERE m.usuario_id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    res.json({ doctor: result.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar perfil do médico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Lista de pacientes vinculados
const getPatients = async (req, res) => {
  try {
    const doctorResult = await db.query('SELECT id FROM medicos WHERE usuario_id = $1', [req.user.id]);
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    const medico_id = doctorResult.rows[0].id;

    const result = await db.query(`
      SELECT 
        p.id as paciente_id,
        u.nome,
        u.email,
        p.cpf,
        p.data_nascimento,
        p.telefone,
        p.data_inicio_tratamento,
        EXTRACT(YEAR FROM AGE(p.data_nascimento)) as idade,
        (SELECT COUNT(*) FROM registros_dialise WHERE paciente_id = p.id) as total_registros,
        (SELECT MAX(data_registro) FROM registros_dialise WHERE paciente_id = p.id) as ultimo_registro,
        (SELECT COUNT(*) FROM notificacoes n 
         WHERE n.tipo = 'alerta_medico' 
         AND n.usuario_destinatario_id = $1 
         AND n.lida = false
         AND n.mensagem LIKE '%' || u.nome || '%') as alertas_nao_lidos
      FROM pacientes p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.medico_responsavel_id = $2 AND u.ativo = true
      ORDER BY u.nome
    `, [req.user.id, medico_id]);

    res.json({ patients: result.rows });
  } catch (error) {
    console.error('Erro ao buscar pacientes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Detalhes completos de um paciente - CORRIGIDO
const getPatientDetails = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    console.log('=== DEBUG getPatientDetails ===');
    console.log('Patient ID:', patientId);
    console.log('User ID:', req.user.id);
    
    // Buscar o ID do médico
    const doctorResult = await db.query('SELECT id FROM medicos WHERE usuario_id = $1', [req.user.id]);
    
    if (doctorResult.rows.length === 0) {
      console.error('Médico não encontrado para usuario_id:', req.user.id);
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    const medico_id = doctorResult.rows[0].id;
    console.log('Medico ID:', medico_id);

    // Buscar dados do paciente
    const patientQuery = `
      SELECT 
        p.*,
        u.nome,
        u.email,
        EXTRACT(YEAR FROM AGE(p.data_nascimento)) as idade
      FROM pacientes p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.id = $1 AND p.medico_responsavel_id = $2
    `;
    
    console.log('Executando query de paciente...');
    const patientResult = await db.query(patientQuery, [patientId, medico_id]);

    if (patientResult.rows.length === 0) {
      console.error('Paciente não encontrado ou não pertence ao médico');
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    console.log('Paciente encontrado:', patientResult.rows[0].nome);

    // Últimos 10 registros de diálise
    const dialysisQuery = `
      SELECT * FROM registros_dialise 
      WHERE paciente_id = $1 
      ORDER BY data_registro DESC, horario_inicio DESC 
      LIMIT 10
    `;
    
    console.log('Buscando registros de diálise...');
    const dialysisResult = await db.query(dialysisQuery, [patientId]);
    console.log('Registros de diálise encontrados:', dialysisResult.rows.length);

    // Medicamentos ativos
    const medicationsQuery = `
      SELECT * FROM medicamentos 
      WHERE paciente_id = $1 AND ativo = true 
      ORDER BY nome
    `;
    
    console.log('Buscando medicamentos...');
    const medicationsResult = await db.query(medicationsQuery, [patientId]);
    console.log('Medicamentos encontrados:', medicationsResult.rows.length);

    // Estatísticas do último mês
    const statsQuery = `
      SELECT 
        COUNT(*) as total_sessoes,
        AVG(pressao_arterial_sistolica) as media_sistolica,
        AVG(pressao_arterial_diastolica) as media_diastolica,
        AVG(uf_total) as media_uf,
        AVG(concentracao_glicose) as media_glicose
      FROM registros_dialise
      WHERE paciente_id = $1 
        AND data_registro >= CURRENT_DATE - INTERVAL '30 days'
    `;
    
    console.log('Buscando estatísticas...');
    const statsResult = await db.query(statsQuery, [patientId]);
    console.log('Estatísticas calculadas');

    const response = {
      patient: patientResult.rows[0],
      recentDialysis: dialysisResult.rows,
      medications: medicationsResult.rows,
      stats: statsResult.rows[0]
    };

    console.log('=== Resposta final ===');
    console.log('Patient:', response.patient.nome);
    console.log('Recent dialysis records:', response.recentDialysis.length);
    console.log('Medications:', response.medications.length);
    console.log('Stats:', response.stats);

    res.json(response);
  } catch (error) {
    console.error('=== ERRO em getPatientDetails ===');
    console.error('Erro completo:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Histórico completo de diálise de um paciente
const getPatientDialysisHistory = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { startDate, endDate, limit = 50, offset = 0 } = req.query;
    
    const doctorResult = await db.query('SELECT id FROM medicos WHERE usuario_id = $1', [req.user.id]);
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    // Verificar se o paciente pertence ao médico
    const verifyResult = await db.query(
      'SELECT id FROM pacientes WHERE id = $1 AND medico_responsavel_id = $2',
      [patientId, doctorResult.rows[0].id]
    );

    if (verifyResult.rows.length === 0) {
      return res.status(403).json({ error: 'Acesso negado a este paciente' });
    }

    let query = `
      SELECT * FROM registros_dialise 
      WHERE paciente_id = $1
    `;
    const params = [patientId];

    if (startDate && endDate) {
      query += ` AND data_registro BETWEEN $${params.length + 1} AND $${params.length + 2}`;
      params.push(startDate, endDate);
    }

    query += ` ORDER BY data_registro DESC, horario_inicio DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({ records: result.rows });
  } catch (error) {
    console.error('Erro ao buscar histórico de diálise:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Documentos do paciente
const getPatientDocuments = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const doctorResult = await db.query('SELECT id FROM medicos WHERE usuario_id = $1', [req.user.id]);
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    // Verificar acesso
    const verifyResult = await db.query(
      'SELECT id FROM pacientes WHERE id = $1 AND medico_responsavel_id = $2',
      [patientId, doctorResult.rows[0].id]
    );

    if (verifyResult.rows.length === 0) {
      return res.status(403).json({ error: 'Acesso negado a este paciente' });
    }

    const result = await db.query(
      'SELECT * FROM documentos WHERE paciente_id = $1 ORDER BY data_upload DESC',
      [patientId]
    );

    res.json({ documents: result.rows });
  } catch (error) {
    console.error('Erro ao buscar documentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Enviar recomendação para paciente
const sendRecommendation = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { titulo, mensagem, prioridade } = req.body;

    if (!titulo || !mensagem) {
      return res.status(400).json({ error: 'Título e mensagem são obrigatórios' });
    }
    
    const doctorResult = await db.query('SELECT id FROM medicos WHERE usuario_id = $1', [req.user.id]);
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    // Verificar acesso
    const patientResult = await db.query(
      'SELECT usuario_id FROM pacientes WHERE id = $1 AND medico_responsavel_id = $2',
      [patientId, doctorResult.rows[0].id]
    );

    if (patientResult.rows.length === 0) {
      return res.status(403).json({ error: 'Acesso negado a este paciente' });
    }

    // Criar notificação
    const result = await db.query(`
      INSERT INTO notificacoes (
        usuario_destinatario_id,
        tipo,
        titulo,
        mensagem,
        lida
      ) VALUES ($1, $2, $3, $4, false)
      RETURNING *
    `, [
      patientResult.rows[0].usuario_id,
      'recomendacao_medica',
      titulo,
      mensagem
    ]);

    res.status(201).json({
      message: 'Recomendação enviada com sucesso',
      notification: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao enviar recomendação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Notificações e alertas do médico
const getNotifications = async (req, res) => {
  try {
    const { limit = 50, offset = 0, lida } = req.query;

    let query = `
      SELECT * FROM notificacoes 
      WHERE usuario_destinatario_id = $1
    `;
    const params = [req.user.id];

    if (lida !== undefined) {
      query += ` AND lida = $${params.length + 1}`;
      params.push(lida === 'true');
    }

    query += ` ORDER BY data_criacao DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({ notifications: result.rows });
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Marcar notificação como lida
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      UPDATE notificacoes 
      SET lida = true, data_leitura = CURRENT_TIMESTAMP
      WHERE id = $1 AND usuario_destinatario_id = $2
      RETURNING *
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    res.json({ notification: result.rows[0] });
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Estatísticas do dashboard
const getDashboardStats = async (req, res) => {
  try {
    const doctorResult = await db.query('SELECT id FROM medicos WHERE usuario_id = $1', [req.user.id]);
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    const medico_id = doctorResult.rows[0].id;

    // Total de pacientes
    const totalPatients = await db.query(
      'SELECT COUNT(*) as total FROM pacientes WHERE medico_responsavel_id = $1',
      [medico_id]
    );

    // Alertas não lidos
    const unreadAlerts = await db.query(`
      SELECT COUNT(*) as total FROM notificacoes 
      WHERE usuario_destinatario_id = $1 
        AND tipo = 'alerta_medico' 
        AND lida = false
    `, [req.user.id]);

    // Sessões de diálise hoje
    const sessionsToday = await db.query(`
      SELECT COUNT(*) as total FROM registros_dialise rd
      JOIN pacientes p ON rd.paciente_id = p.id
      WHERE p.medico_responsavel_id = $1 
        AND rd.data_registro = CURRENT_DATE
    `, [medico_id]);

    // Pacientes com valores fora do padrão (últimos 7 dias)
    const patientsAtRisk = await db.query(`
      SELECT COUNT(DISTINCT rd.paciente_id) as total
      FROM registros_dialise rd
      JOIN pacientes p ON rd.paciente_id = p.id
      WHERE p.medico_responsavel_id = $1
        AND rd.data_registro >= CURRENT_DATE - INTERVAL '7 days'
        AND (
          rd.pressao_arterial_sistolica > 140 
          OR rd.pressao_arterial_sistolica < 90
          OR rd.pressao_arterial_diastolica > 90
          OR rd.pressao_arterial_diastolica < 60
          OR rd.concentracao_glicose > 200
        )
    `, [medico_id]);

    res.json({
      totalPatients: parseInt(totalPatients.rows[0].total),
      unreadAlerts: parseInt(unreadAlerts.rows[0].total),
      sessionsToday: parseInt(sessionsToday.rows[0].total),
      patientsAtRisk: parseInt(patientsAtRisk.rows[0].total)
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Relatório individual de paciente
const getPatientReport = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { startDate, endDate } = req.query;

    const doctorResult = await db.query('SELECT id FROM medicos WHERE usuario_id = $1', [req.user.id]);
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    // Verificar acesso
    const patientResult = await db.query(`
      SELECT p.*, u.nome, u.email
      FROM pacientes p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.id = $1 AND p.medico_responsavel_id = $2
    `, [patientId, doctorResult.rows[0].id]);

    if (patientResult.rows.length === 0) {
      return res.status(403).json({ error: 'Acesso negado a este paciente' });
    }

    // Registros de diálise no período
    const dialysisRecords = await db.query(`
      SELECT * FROM registros_dialise 
      WHERE paciente_id = $1 
        AND data_registro BETWEEN $2 AND $3
      ORDER BY data_registro DESC
    `, [patientId, startDate, endDate]);

    // Estatísticas do período
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_sessoes,
        AVG(pressao_arterial_sistolica) as media_sistolica,
        AVG(pressao_arterial_diastolica) as media_diastolica,
        AVG(uf_total) as media_uf,
        AVG(concentracao_glicose) as media_glicose,
        COUNT(CASE WHEN sintomas IS NOT NULL AND sintomas != '' THEN 1 END) as sessoes_com_sintomas
      FROM registros_dialise
      WHERE paciente_id = $1 
        AND data_registro BETWEEN $2 AND $3
    `, [patientId, startDate, endDate]);

    // Medicamentos
    const medications = await db.query(
      'SELECT * FROM medicamentos WHERE paciente_id = $1 AND ativo = true',
      [patientId]
    );

    res.json({
      patient: patientResult.rows[0],
      period: { startDate, endDate },
      statistics: {
        totalSessions: parseInt(stats.rows[0].total_sessoes) || 0,
        averageSystolic: stats.rows[0].media_sistolica ? Math.round(stats.rows[0].media_sistolica) : null,
        averageDiastolic: stats.rows[0].media_diastolica ? Math.round(stats.rows[0].media_diastolica) : null,
        averageUF: stats.rows[0].media_uf ? (stats.rows[0].media_uf / 1000).toFixed(1) : null,
        averageGlucose: stats.rows[0].media_glicose ? Math.round(stats.rows[0].media_glicose) : null,
        sessionsWithSymptoms: parseInt(stats.rows[0].sessoes_com_sintomas) || 0
      },
      dialysisRecords: dialysisRecords.rows,
      medications: medications.rows,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao gerar relatório do paciente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Relatório geral de todos os pacientes
const getGeneralReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const doctorResult = await db.query('SELECT id FROM medicos WHERE usuario_id = $1', [req.user.id]);
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    const medico_id = doctorResult.rows[0].id;

    // Lista de pacientes
    const patients = await db.query(`
      SELECT p.id, u.nome, u.email
      FROM pacientes p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.medico_responsavel_id = $1
      ORDER BY u.nome
    `, [medico_id]);

    // Estatísticas gerais
    const generalStats = {
      totalPatients: patients.rows.length,
      totalSessions: 0,
      totalAlerts: 0,
      averageSessionsPerPatient: 0
    };

    const patientReports = [];

    for (const patient of patients.rows) {
      // Sessões do paciente no período
      const sessions = await db.query(`
        SELECT 
          COUNT(*) as count, 
          AVG(uf_total) as avg_uf,
          AVG(pressao_arterial_sistolica) as avg_systolic,
          AVG(pressao_arterial_diastolica) as avg_diastolic
        FROM registros_dialise 
        WHERE paciente_id = $1 
          AND data_registro BETWEEN $2 AND $3
      `, [patient.id, startDate, endDate]);

      // Alertas do paciente no período
      const alerts = await db.query(`
        SELECT COUNT(*) as count
        FROM registros_dialise
        WHERE paciente_id = $1 
          AND data_registro BETWEEN $2 AND $3
          AND (
            pressao_arterial_sistolica > 140 
            OR pressao_arterial_sistolica < 90
            OR pressao_arterial_diastolica > 90
            OR pressao_arterial_diastolica < 60
          )
      `, [patient.id, startDate, endDate]);

      const sessionCount = parseInt(sessions.rows[0].count) || 0;
      const alertCount = parseInt(alerts.rows[0].count) || 0;

      generalStats.totalSessions += sessionCount;
      generalStats.totalAlerts += alertCount;

      patientReports.push({
        patient: {
          id: patient.id,
          nome: patient.nome,
          email: patient.email
        },
        sessionsInPeriod: sessionCount,
        averageUF: sessions.rows[0].avg_uf ? (sessions.rows[0].avg_uf / 1000).toFixed(1) : null,
        averageSystolic: sessions.rows[0].avg_systolic ? Math.round(sessions.rows[0].avg_systolic) : null,
        averageDiastolic: sessions.rows[0].avg_diastolic ? Math.round(sessions.rows[0].avg_diastolic) : null,
        alertsInPeriod: alertCount
      });
    }

    generalStats.averageSessionsPerPatient = generalStats.totalPatients > 0
      ? Math.round(generalStats.totalSessions / generalStats.totalPatients)
      : 0;

    res.json({
      period: { startDate, endDate },
      statistics: generalStats,
      patientReports,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao gerar relatório geral:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  getProfile,
  getPatients,
  getPatientDetails,
  getPatientDialysisHistory,
  getPatientDocuments,
  sendRecommendation,
  getNotifications,
  markNotificationAsRead,
  getDashboardStats,
  getPatientReport,
  getGeneralReport
};
// const db = require('../config/database');

// // Perfil do médico
// const getProfile = async (req, res) => {
//   try {
//     const result = await db.query(`
//       SELECT m.*, u.nome, u.email
//       FROM medicos m
//       JOIN usuarios u ON m.usuario_id = u.id
//       WHERE m.usuario_id = $1
//     `, [req.user.id]);

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: 'Médico não encontrado' });
//     }

//     res.json({ doctor: result.rows[0] });
//   } catch (error) {
//     console.error('Erro ao buscar perfil do médico:', error);
//     res.status(500).json({ error: 'Erro interno do servidor' });
//   }
// };

// // Lista de pacientes vinculados
// const getPatients = async (req, res) => {
//   try {
//     const doctorResult = await db.query('SELECT id FROM medicos WHERE usuario_id = $1', [req.user.id]);
//     if (doctorResult.rows.length === 0) {
//       return res.status(404).json({ error: 'Médico não encontrado' });
//     }

//     const medico_id = doctorResult.rows[0].id;

//     const result = await db.query(`
//       SELECT 
//         p.id as paciente_id,
//         u.nome,
//         u.email,
//         p.cpf,
//         p.data_nascimento,
//         p.telefone,
//         p.data_inicio_tratamento,
//         EXTRACT(YEAR FROM AGE(p.data_nascimento)) as idade,
//         (SELECT COUNT(*) FROM registros_dialise WHERE paciente_id = p.id) as total_registros,
//         (SELECT MAX(data_registro) FROM registros_dialise WHERE paciente_id = p.id) as ultimo_registro,
//         (SELECT COUNT(*) FROM notificacoes n 
//          WHERE n.tipo = 'alerta_medico' 
//          AND n.usuario_destinatario_id = $1 
//          AND n.lida = false
//          AND n.mensagem LIKE '%' || u.nome || '%') as alertas_nao_lidos
//       FROM pacientes p
//       JOIN usuarios u ON p.usuario_id = u.id
//       WHERE p.medico_responsavel_id = $2 AND u.ativo = true
//       ORDER BY u.nome
//     `, [req.user.id, medico_id]);

//     res.json({ patients: result.rows });
//   } catch (error) {
//     console.error('Erro ao buscar pacientes:', error);
//     res.status(500).json({ error: 'Erro interno do servidor' });
//   }
// };

// // Detalhes completos de um paciente
// const getPatientDetails = async (req, res) => {
//   try {
//     const { patientId } = req.params;
    
//     const doctorResult = await db.query('SELECT id FROM medicos WHERE usuario_id = $1', [req.user.id]);
//     if (doctorResult.rows.length === 0) {
//       return res.status(404).json({ error: 'Médico não encontrado' });
//     }

//     const result = await db.query(`
//       SELECT 
//         p.*,
//         u.nome,
//         u.email,
//         EXTRACT(YEAR FROM AGE(p.data_nascimento)) as idade
//       FROM pacientes p
//       JOIN usuarios u ON p.usuario_id = u.id
//       WHERE p.id = $1 AND p.medico_responsavel_id = $2
//     `, [patientId, doctorResult.rows[0].id]);

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: 'Paciente não encontrado' });
//     }

//     // Últimos 10 registros de diálise
//     const dialysisResult = await db.query(`
//       SELECT * FROM registros_dialise 
//       WHERE paciente_id = $1 
//       ORDER BY data_registro DESC, horario_inicio DESC 
//       LIMIT 10
//     `, [patientId]);

//     // Medicamentos ativos
//     const medicationsResult = await db.query(
//       'SELECT * FROM medicamentos WHERE paciente_id = $1 AND ativo = true ORDER BY nome',
//       [patientId]
//     );

//     // Estatísticas do último mês
//     const statsResult = await db.query(`
//       SELECT 
//         COUNT(*) as total_sessoes,
//         AVG(pressao_arterial_sistolica) as media_sistolica,
//         AVG(pressao_arterial_diastolica) as media_diastolica,
//         AVG(uf_total) as media_uf,
//         AVG(concentracao_glicose) as media_glicose
//       FROM registros_dialise
//       WHERE paciente_id = $1 
//         AND data_registro >= CURRENT_DATE - INTERVAL '30 days'
//     `, [patientId]);

//     res.json({
//       patient: result.rows[0],
//       recentDialysis: dialysisResult.rows,
//       medications: medicationsResult.rows,
//       stats: statsResult.rows[0]
//     });
//   } catch (error) {
//     console.error('Erro ao buscar detalhes do paciente:', error);
//     res.status(500).json({ error: 'Erro interno do servidor' });
//   }
// };

// // Histórico completo de diálise de um paciente
// const getPatientDialysisHistory = async (req, res) => {
//   try {
//     const { patientId } = req.params;
//     const { startDate, endDate, limit = 50, offset = 0 } = req.query;
    
//     const doctorResult = await db.query('SELECT id FROM medicos WHERE usuario_id = $1', [req.user.id]);
//     if (doctorResult.rows.length === 0) {
//       return res.status(404).json({ error: 'Médico não encontrado' });
//     }

//     // Verificar se o paciente pertence ao médico
//     const verifyResult = await db.query(
//       'SELECT id FROM pacientes WHERE id = $1 AND medico_responsavel_id = $2',
//       [patientId, doctorResult.rows[0].id]
//     );

//     if (verifyResult.rows.length === 0) {
//       return res.status(403).json({ error: 'Acesso negado a este paciente' });
//     }

//     let query = `
//       SELECT * FROM registros_dialise 
//       WHERE paciente_id = $1
//     `;
//     const params = [patientId];

//     if (startDate && endDate) {
//       query += ` AND data_registro BETWEEN $${params.length + 1} AND $${params.length + 2}`;
//       params.push(startDate, endDate);
//     }

//     query += ` ORDER BY data_registro DESC, horario_inicio DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
//     params.push(limit, offset);

//     const result = await db.query(query, params);

//     res.json({ records: result.rows });
//   } catch (error) {
//     console.error('Erro ao buscar histórico de diálise:', error);
//     res.status(500).json({ error: 'Erro interno do servidor' });
//   }
// };

// // Documentos do paciente
// const getPatientDocuments = async (req, res) => {
//   try {
//     const { patientId } = req.params;
    
//     const doctorResult = await db.query('SELECT id FROM medicos WHERE usuario_id = $1', [req.user.id]);
//     if (doctorResult.rows.length === 0) {
//       return res.status(404).json({ error: 'Médico não encontrado' });
//     }

//     // Verificar acesso
//     const verifyResult = await db.query(
//       'SELECT id FROM pacientes WHERE id = $1 AND medico_responsavel_id = $2',
//       [patientId, doctorResult.rows[0].id]
//     );

//     if (verifyResult.rows.length === 0) {
//       return res.status(403).json({ error: 'Acesso negado a este paciente' });
//     }

//     const result = await db.query(
//       'SELECT * FROM documentos WHERE paciente_id = $1 ORDER BY data_upload DESC',
//       [patientId]
//     );

//     res.json({ documents: result.rows });
//   } catch (error) {
//     console.error('Erro ao buscar documentos:', error);
//     res.status(500).json({ error: 'Erro interno do servidor' });
//   }
// };

// // Enviar recomendação para paciente
// const sendRecommendation = async (req, res) => {
//   try {
//     const { patientId } = req.params;
//     const { titulo, mensagem, prioridade } = req.body;

//     if (!titulo || !mensagem) {
//       return res.status(400).json({ error: 'Título e mensagem são obrigatórios' });
//     }
    
//     const doctorResult = await db.query('SELECT id FROM medicos WHERE usuario_id = $1', [req.user.id]);
//     if (doctorResult.rows.length === 0) {
//       return res.status(404).json({ error: 'Médico não encontrado' });
//     }

//     // Verificar acesso
//     const patientResult = await db.query(
//       'SELECT usuario_id FROM pacientes WHERE id = $1 AND medico_responsavel_id = $2',
//       [patientId, doctorResult.rows[0].id]
//     );

//     if (patientResult.rows.length === 0) {
//       return res.status(403).json({ error: 'Acesso negado a este paciente' });
//     }

//     // Criar notificação
//     const result = await db.query(`
//       INSERT INTO notificacoes (
//         usuario_destinatario_id,
//         tipo,
//         titulo,
//         mensagem,
//         lida
//       ) VALUES ($1, $2, $3, $4, false)
//       RETURNING *
//     `, [
//       patientResult.rows[0].usuario_id,
//       'recomendacao_medica',
//       titulo,
//       mensagem
//     ]);

//     // Aqui você pode adicionar lógica para enviar email se necessário

//     res.status(201).json({
//       message: 'Recomendação enviada com sucesso',
//       notification: result.rows[0]
//     });
//   } catch (error) {
//     console.error('Erro ao enviar recomendação:', error);
//     res.status(500).json({ error: 'Erro interno do servidor' });
//   }
// };

// // Notificações e alertas do médico
// const getNotifications = async (req, res) => {
//   try {
//     const { limit = 50, offset = 0, lida } = req.query;

//     let query = `
//       SELECT * FROM notificacoes 
//       WHERE usuario_destinatario_id = $1
//     `;
//     const params = [req.user.id];

//     if (lida !== undefined) {
//       query += ` AND lida = $${params.length + 1}`;
//       params.push(lida === 'true');
//     }

//     query += ` ORDER BY data_criacao DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
//     params.push(limit, offset);

//     const result = await db.query(query, params);

//     res.json({ notifications: result.rows });
//   } catch (error) {
//     console.error('Erro ao buscar notificações:', error);
//     res.status(500).json({ error: 'Erro interno do servidor' });
//   }
// };

// // Marcar notificação como lida
// const markNotificationAsRead = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const result = await db.query(`
//       UPDATE notificacoes 
//       SET lida = true, data_leitura = CURRENT_TIMESTAMP
//       WHERE id = $1 AND usuario_destinatario_id = $2
//       RETURNING *
//     `, [id, req.user.id]);

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: 'Notificação não encontrada' });
//     }

//     res.json({ notification: result.rows[0] });
//   } catch (error) {
//     console.error('Erro ao marcar notificação como lida:', error);
//     res.status(500).json({ error: 'Erro interno do servidor' });
//   }
// };

// // Estatísticas do dashboard
// const getDashboardStats = async (req, res) => {
//   try {
//     const doctorResult = await db.query('SELECT id FROM medicos WHERE usuario_id = $1', [req.user.id]);
//     if (doctorResult.rows.length === 0) {
//       return res.status(404).json({ error: 'Médico não encontrado' });
//     }

//     const medico_id = doctorResult.rows[0].id;

//     // Total de pacientes
//     const totalPatients = await db.query(
//       'SELECT COUNT(*) as total FROM pacientes WHERE medico_responsavel_id = $1',
//       [medico_id]
//     );

//     // Alertas não lidos
//     const unreadAlerts = await db.query(`
//       SELECT COUNT(*) as total FROM notificacoes 
//       WHERE usuario_destinatario_id = $1 
//         AND tipo = 'alerta_medico' 
//         AND lida = false
//     `, [req.user.id]);

//     // Sessões de diálise hoje
//     const sessionsToday = await db.query(`
//       SELECT COUNT(*) as total FROM registros_dialise rd
//       JOIN pacientes p ON rd.paciente_id = p.id
//       WHERE p.medico_responsavel_id = $1 
//         AND rd.data_registro = CURRENT_DATE
//     `, [medico_id]);

//     // Pacientes com valores fora do padrão (últimos 7 dias)
//     const patientsAtRisk = await db.query(`
//       SELECT COUNT(DISTINCT rd.paciente_id) as total
//       FROM registros_dialise rd
//       JOIN pacientes p ON rd.paciente_id = p.id
//       WHERE p.medico_responsavel_id = $1
//         AND rd.data_registro >= CURRENT_DATE - INTERVAL '7 days'
//         AND (
//           rd.pressao_arterial_sistolica > 140 
//           OR rd.pressao_arterial_sistolica < 90
//           OR rd.pressao_arterial_diastolica > 90
//           OR rd.pressao_arterial_diastolica < 60
//           OR rd.concentracao_glicose > 200
//         )
//     `, [medico_id]);

//     // Pacientes recentes (cadastrados nos últimos 30 dias)
//     const recentPatients = await db.query(`
//       SELECT 
//         p.id,
//         u.nome,
//         p.data_inicio_tratamento
//       FROM pacientes p
//       JOIN usuarios u ON p.usuario_id = u.id
//       WHERE p.medico_responsavel_id = $1
//         AND p.data_inicio_tratamento >= CURRENT_DATE - INTERVAL '30 days'
//       ORDER BY p.data_inicio_tratamento DESC
//       LIMIT 5
//     `, [medico_id]);

//     res.json({
//       totalPatients: parseInt(totalPatients.rows[0].total),
//       unreadAlerts: parseInt(unreadAlerts.rows[0].total),
//       sessionsToday: parseInt(sessionsToday.rows[0].total),
//       patientsAtRisk: parseInt(patientsAtRisk.rows[0].total),
//       recentPatients: recentPatients.rows
//     });
//   } catch (error) {
//     console.error('Erro ao buscar estatísticas do dashboard:', error);
//     res.status(500).json({ error: 'Erro interno do servidor' });
//   }
// };

// // Relatório individual de paciente
// const getPatientReport = async (req, res) => {
//   try {
//     const { patientId } = req.params;
//     const { startDate, endDate } = req.query;

//     const doctorResult = await db.query('SELECT id FROM medicos WHERE usuario_id = $1', [req.user.id]);
//     if (doctorResult.rows.length === 0) {
//       return res.status(404).json({ error: 'Médico não encontrado' });
//     }

//     // Verificar acesso
//     const patientResult = await db.query(`
//       SELECT p.*, u.nome, u.email
//       FROM pacientes p
//       JOIN usuarios u ON p.usuario_id = u.id
//       WHERE p.id = $1 AND p.medico_responsavel_id = $2
//     `, [patientId, doctorResult.rows[0].id]);

//     if (patientResult.rows.length === 0) {
//       return res.status(403).json({ error: 'Acesso negado a este paciente' });
//     }

//     // Registros de diálise no período
//     const dialysisRecords = await db.query(`
//       SELECT * FROM registros_dialise 
//       WHERE paciente_id = $1 
//         AND data_registro BETWEEN $2 AND $3
//       ORDER BY data_registro DESC
//     `, [patientId, startDate, endDate]);

//     // Estatísticas do período
//     const stats = await db.query(`
//       SELECT 
//         COUNT(*) as total_sessoes,
//         AVG(pressao_arterial_sistolica) as media_sistolica,
//         AVG(pressao_arterial_diastolica) as media_diastolica,
//         AVG(uf_total) as media_uf,
//         AVG(concentracao_glicose) as media_glicose,
//         COUNT(CASE WHEN sintomas IS NOT NULL AND sintomas != '' THEN 1 END) as sessoes_com_sintomas
//       FROM registros_dialise
//       WHERE paciente_id = $1 
//         AND data_registro BETWEEN $2 AND $3
//     `, [patientId, startDate, endDate]);

//     // Medicamentos
//     const medications = await db.query(
//       'SELECT * FROM medicamentos WHERE paciente_id = $1 AND ativo = true',
//       [patientId]
//     );

//     res.json({
//       patient: patientResult.rows[0],
//       period: { startDate, endDate },
//       statistics: {
//         totalSessions: parseInt(stats.rows[0].total_sessoes) || 0,
//         averageSystolic: stats.rows[0].media_sistolica ? Math.round(stats.rows[0].media_sistolica) : null,
//         averageDiastolic: stats.rows[0].media_diastolica ? Math.round(stats.rows[0].media_diastolica) : null,
//         averageUF: stats.rows[0].media_uf ? (stats.rows[0].media_uf / 1000).toFixed(1) : null,
//         averageGlucose: stats.rows[0].media_glicose ? Math.round(stats.rows[0].media_glicose) : null,
//         sessionsWithSymptoms: parseInt(stats.rows[0].sessoes_com_sintomas) || 0
//       },
//       dialysisRecords: dialysisRecords.rows,
//       medications: medications.rows,
//       generatedAt: new Date().toISOString()
//     });
//   } catch (error) {
//     console.error('Erro ao gerar relatório do paciente:', error);
//     res.status(500).json({ error: 'Erro interno do servidor' });
//   }
// };

// // Relatório geral de todos os pacientes
// const getGeneralReport = async (req, res) => {
//   try {
//     const { startDate, endDate } = req.query;
    
//     const doctorResult = await db.query('SELECT id, crm FROM medicos m JOIN usuarios u ON m.usuario_id = u.id WHERE m.usuario_id = $1', [req.user.id]);
//     if (doctorResult.rows.length === 0) {
//       return res.status(404).json({ error: 'Médico não encontrado' });
//     }

//     const medico_id = doctorResult.rows[0].id;

//     // Lista de pacientes
//     const patients = await db.query(`
//       SELECT p.id, u.nome, u.email
//       FROM pacientes p
//       JOIN usuarios u ON p.usuario_id = u.id
//       WHERE p.medico_responsavel_id = $1
//       ORDER BY u.nome
//     `, [medico_id]);

//     // Estatísticas gerais
//     const generalStats = {
//       totalPatients: patients.rows.length,
//       totalSessions: 0,
//       totalAlerts: 0,
//       averageSessionsPerPatient: 0
//     };

//     const patientReports = [];

//     for (const patient of patients.rows) {
//       // Sessões do paciente no período
//       const sessions = await db.query(`
//         SELECT 
//           COUNT(*) as count, 
//           AVG(uf_total) as avg_uf,
//           AVG(pressao_arterial_sistolica) as avg_systolic,
//           AVG(pressao_arterial_diastolica) as avg_diastolic
//         FROM registros_dialise 
//         WHERE paciente_id = $1 
//           AND data_registro BETWEEN $2 AND $3
//       `, [patient.id, startDate, endDate]);

//       // Alertas do paciente no período
//       const alerts = await db.query(`
//         SELECT COUNT(*) as count
//         FROM registros_dialise
//         WHERE paciente_id = $1 
//           AND data_registro BETWEEN $2 AND $3
//           AND (
//             pressao_arterial_sistolica > 140 
//             OR pressao_arterial_sistolica < 90
//             OR pressao_arterial_diastolica > 90
//             OR pressao_arterial_diastolica < 60
//           )
//       `, [patient.id, startDate, endDate]);

//       const sessionCount = parseInt(sessions.rows[0].count) || 0;
//       const alertCount = parseInt(alerts.rows[0].count) || 0;

//       generalStats.totalSessions += sessionCount;
//       generalStats.totalAlerts += alertCount;

//       patientReports.push({
//         patient: {
//           id: patient.id,
//           nome: patient.nome,
//           email: patient.email
//         },
//         sessionsInPeriod: sessionCount,
//         averageUF: sessions.rows[0].avg_uf ? (sessions.rows[0].avg_uf / 1000).toFixed(1) : null,
//         averageSystolic: sessions.rows[0].avg_systolic ? Math.round(sessions.rows[0].avg_systolic) : null,
//         averageDiastolic: sessions.rows[0].avg_diastolic ? Math.round(sessions.rows[0].avg_diastolic) : null,
//         alertsInPeriod: alertCount
//       });
//     }

//     generalStats.averageSessionsPerPatient = generalStats.totalPatients > 0
//       ? Math.round(generalStats.totalSessions / generalStats.totalPatients)
//       : 0;

//     res.json({
//       doctor: req.user.nome,
//       period: { startDate, endDate },
//       statistics: generalStats,
//       patientReports,
//       generatedAt: new Date().toISOString()
//     });
//   } catch (error) {
//     console.error('Erro ao gerar relatório geral:', error);
//     res.status(500).json({ error: 'Erro interno do servidor' });
//   }
// };

// module.exports = {
//   getProfile,
//   getPatients,
//   getPatientDetails,
//   getPatientDialysisHistory,
//   getPatientDocuments,
//   sendRecommendation,
//   getNotifications,
//   markNotificationAsRead,
//   getDashboardStats,
//   getPatientReport,
//   getGeneralReport
// };
// // const db = require('../config/database');

// // const getPatients = async (req, res) => {
// //   try {
// //     // Buscar médico baseado no usuário logado
// //     const doctorResult = await db.query('SELECT id FROM medicos WHERE usuario_id = $1', [req.user.id]);
// //     if (doctorResult.rows.length === 0) {
// //       return res.status(404).json({ error: 'Médico não encontrado' });
// //     }

// //     const medico_id = doctorResult.rows[0].id;

// //     const result = await db.query(`
// //       SELECT p.id, u.nome, u.email, p.cpf, p.data_nascimento, p.telefone, 
// //              p.data_inicio_tratamento, p.observacoes_medicas
// //       FROM pacientes p
// //       JOIN usuarios u ON p.usuario_id = u.id
// //       WHERE p.medico_responsavel_id = $1 AND u.ativo = true
// //       ORDER BY u.nome
// //     `, [medico_id]);

// //     res.json(result.rows);
// //   } catch (error) {
// //     console.error('Erro ao buscar pacientes:', error);
// //     res.status(500).json({ error: 'Erro interno do servidor' });
// //   }
// // };

// // const getPatientDetails = async (req, res) => {
// //   try {
// //     const { patientId } = req.params;
    
// //     // Verificar se o paciente pertence ao médico
// //     const doctorResult = await db.query('SELECT id FROM medicos WHERE usuario_id = $1', [req.user.id]);
// //     if (doctorResult.rows.length === 0) {
// //       return res.status(404).json({ error: 'Médico não encontrado' });
// //     }

// //     const result = await db.query(`
// //       SELECT p.*, u.nome, u.email
// //       FROM pacientes p
// //       JOIN usuarios u ON p.usuario_id = u.id
// //       WHERE p.id = $1 AND p.medico_responsavel_id = $2
// //     `, [patientId, doctorResult.rows[0].id]);

// //     if (result.rows.length === 0) {
// //       return res.status(404).json({ error: 'Paciente não encontrado' });
// //     }

// //     // Buscar últimos registros de diálise
// //     const dialysisResult = await db.query(`
// //       SELECT * FROM registros_dialise 
// //       WHERE paciente_id = $1 
// //       ORDER BY data_registro DESC, horario_inicio DESC 
// //       LIMIT 10
// //     `, [patientId]);

// //     // Buscar medicamentos
// //     const medicationsResult = await db.query(
// //       'SELECT * FROM medicamentos WHERE paciente_id = $1 AND ativo = true',
// //       [patientId]
// //     );

// //     res.json({
// //       patient: result.rows[0],
// //       recentDialysis: dialysisResult.rows,
// //       medications: medicationsResult.rows
// //     });
// //   } catch (error) {
// //     console.error('Erro ao buscar detalhes do paciente:', error);
// //     res.status(500).json({ error: 'Erro interno do servidor' });
// //   }
// // };

// // const getNotifications = async (req, res) => {
// //   try {
// //     const result = await db.query(`
// //       SELECT * FROM notificacoes 
// //       WHERE usuario_destinatario_id = $1 
// //       ORDER BY data_criacao DESC 
// //       LIMIT 50
// //     `, [req.user.id]);

// //     res.json(result.rows);
// //   } catch (error) {
// //     console.error('Erro ao buscar notificações:', error);
// //     res.status(500).json({ error: 'Erro interno do servidor' });
// //   }
// // };

// // module.exports = { getPatients, getPatientDetails, getNotifications };