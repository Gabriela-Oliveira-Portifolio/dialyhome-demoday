const db = require('../config/database');

const generatePatientReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let patientId;

    if (req.user.tipo_usuario === 'paciente') {
      const patientResult = await db.query('SELECT id FROM pacientes WHERE usuario_id = $1', [req.user.id]);
      if (patientResult.rows.length === 0) {
        return res.status(404).json({ error: 'Paciente não encontrado' });
      }
      patientId = patientResult.rows[0].id;
    } else if (req.user.tipo_usuario === 'medico') {
      patientId = req.params.patientId;
      // Verificar se o paciente pertence ao médico
      const doctorResult = await db.query('SELECT id FROM medicos WHERE usuario_id = $1', [req.user.id]);
      const verifyResult = await db.query(
        'SELECT id FROM pacientes WHERE id = $1 AND medico_responsavel_id = $2',
        [patientId, doctorResult.rows[0].id]
      );
      if (verifyResult.rows.length === 0) {
        return res.status(403).json({ error: 'Acesso negado a este paciente' });
      }
    }

    // Buscar dados do paciente
    const patientData = await db.query(`
      SELECT p.*, u.nome, u.email
      FROM pacientes p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.id = $1
    `, [patientId]);

    // Buscar registros de diálise no período
    const dialysisRecords = await db.query(`
      SELECT * FROM registros_dialise 
      WHERE paciente_id = $1 
      AND data_registro BETWEEN $2 AND $3
      ORDER BY data_registro DESC, horario_inicio DESC
    `, [patientId, startDate, endDate]);

    // Calcular estatísticas
    const stats = {
      totalSessions: dialysisRecords.rows.length,
      averageUF: 0,
      averageSystolic: 0,
      averageDiastolic: 0,
      sessionsWithSymptoms: 0
    };

    if (dialysisRecords.rows.length > 0) {
      const totals = dialysisRecords.rows.reduce((acc, record) => {
        acc.uf += record.uf_total || 0;
        acc.systolic += record.pressao_arterial_sistolica || 0;
        acc.diastolic += record.pressao_arterial_diastolica || 0;
        if (record.sintomas && record.sintomas.trim()) {
          acc.symptomsCount++;
        }
        return acc;
      }, { uf: 0, systolic: 0, diastolic: 0, symptomsCount: 0 });

      stats.averageUF = Math.round(totals.uf / dialysisRecords.rows.length);
      stats.averageSystolic = Math.round(totals.systolic / dialysisRecords.rows.length);
      stats.averageDiastolic = Math.round(totals.diastolic / dialysisRecords.rows.length);
      stats.sessionsWithSymptoms = totals.symptomsCount;
    }

    // Buscar medicamentos
    const medications = await db.query(
      'SELECT * FROM medicamentos WHERE paciente_id = $1 AND ativo = true',
      [patientId]
    );

    const report = {
      patient: patientData.rows[0],
      period: { startDate, endDate },
      statistics: stats,
      dialysisRecords: dialysisRecords.rows,
      medications: medications.rows,
      generatedAt: new Date().toISOString()
    };

    res.json(report);
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const generateDoctorReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Buscar médico
    const doctorResult = await db.query('SELECT id FROM medicos WHERE usuario_id = $1', [req.user.id]);
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    const medicId = doctorResult.rows[0].id;

    // Buscar pacientes do médico
    const patients = await db.query(`
      SELECT p.*, u.nome, u.email
      FROM pacientes p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.medico_responsavel_id = $1
    `, [medicId]);

    // Estatísticas gerais
    const stats = {
      totalPatients: patients.rows.length,
      activeSessions: 0,
      totalAlerts: 0,
      averageSessionsPerPatient: 0
    };

    const patientReports = [];

    for (const patient of patients.rows) {
      // Buscar sessões do paciente no período
      const sessions = await db.query(`
        SELECT COUNT(*) as count, AVG(uf_total) as avg_uf
        FROM registros_dialise 
        WHERE paciente_id = $1 AND data_registro BETWEEN $2 AND $3
      `, [patient.id, startDate, endDate]);

      // Buscar alertas do paciente no período
      const alerts = await db.query(`
        SELECT COUNT(*) as count
        FROM notificacoes n
        WHERE n.usuario_destinatario_id = $1 
        AND n.data_criacao BETWEEN $2 AND $3
        AND n.tipo = 'alerta_medico'
      `, [req.user.id, startDate, endDate]);

      const sessionCount = parseInt(sessions.rows[0].count);
      const alertCount = parseInt(alerts.rows[0].count);

      stats.activeSessions += sessionCount;
      stats.totalAlerts += alertCount;

      patientReports.push({
        patient: {
          id: patient.id,
          nome: patient.nome,
          email: patient.email
        },
        sessionsInPeriod: sessionCount,
        averageUF: Math.round(sessions.rows[0].avg_uf || 0),
        alertsInPeriod: alertCount
      });
    }

    stats.averageSessionsPerPatient = patients.rows.length > 0 
      ? Math.round(stats.activeSessions / patients.rows.length) 
      : 0;

    const report = {
      doctor: req.user.nome,
      period: { startDate, endDate },
      statistics: stats,
      patientReports,
      generatedAt: new Date().toISOString()
    };

    res.json(report);
  } catch (error) {
    console.error('Erro ao gerar relatório do médico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = { generatePatientReport, generateDoctorReport };