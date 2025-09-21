const db = require('../config/database');

const createDialysisRecord = async (req, res) => {
  try {
    const {
      data_registro,
      horario_inicio,
      horario_fim,
      pressao_arterial_sistolica,
      pressao_arterial_diastolica,
      peso_pre_dialise,
      peso_pos_dialise,
      drenagem_inicial,
      uf_total,
      tempo_permanencia,
      concentracao_glicose,
      concentracao_dextrose,
      sintomas,
      observacoes
    } = req.body;

    // Obter paciente_id baseado no usuário logado
    const patientResult = await db.query('SELECT id FROM pacientes WHERE usuario_id = $1', [req.user.id]);
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    const paciente_id = patientResult.rows[0].id;

    const result = await db.query(
      `INSERT INTO registros_dialise 
       (paciente_id, data_registro, horario_inicio, horario_fim, pressao_arterial_sistolica,
        pressao_arterial_diastolica, peso_pre_dialise, peso_pos_dialise, drenagem_inicial,
        uf_total, tempo_permanencia, concentracao_glicose, concentracao_dextrose, sintomas, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id`,
      [
        paciente_id, data_registro, horario_inicio, horario_fim, pressao_arterial_sistolica,
        pressao_arterial_diastolica, peso_pre_dialise, peso_pos_dialise, drenagem_inicial,
        uf_total, tempo_permanencia, concentracao_glicose, concentracao_dextrose, sintomas, observacoes
      ]
    );

    // Verificar se há alertas necessários
    await checkAndCreateAlerts(paciente_id, req.body);

    res.status(201).json({ 
      message: 'Registro de diálise criado com sucesso', 
      id: result.rows[0].id 
    });
  } catch (error) {
    console.error('Erro ao criar registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const getDialysisHistory = async (req, res) => {
  try {
    const patientResult = await db.query('SELECT id FROM pacientes WHERE usuario_id = $1', [req.user.id]);
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    const paciente_id = patientResult.rows[0].id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await db.query(
      `SELECT * FROM registros_dialise 
       WHERE paciente_id = $1 
       ORDER BY data_registro DESC, horario_inicio DESC 
       LIMIT $2 OFFSET $3`,
      [paciente_id, limit, offset]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const checkAndCreateAlerts = async (paciente_id, data) => {
  // Lógica para verificar parâmetros e criar alertas
  const alerts = [];

  // Verificar pressão arterial
  if (data.pressao_arterial_sistolica > 140 || data.pressao_arterial_diastolica > 90) {
    alerts.push({
      tipo: 'alerta_medico',
      titulo: 'Pressão Arterial Elevada',
      mensagem: `Pressão arterial registrada: ${data.pressao_arterial_sistolica}/${data.pressao_arterial_diastolica} mmHg`
    });
  }

  // Verificar UF muito baixa ou alta
  if (data.uf_total < 100 || data.uf_total > 4000) {
    alerts.push({
      tipo: 'alerta_medico',
      titulo: 'Ultrafiltração Anormal',
      mensagem: `UF registrada: ${data.uf_total} mL`
    });
  }

  // Criar notificações para o médico
  if (alerts.length > 0) {
    const medicResult = await db.query(
      'SELECT m.usuario_id FROM pacientes p JOIN medicos m ON p.medico_responsavel_id = m.id WHERE p.id = $1',
      [paciente_id]
    );

    if (medicResult.rows.length > 0) {
      for (const alert of alerts) {
        await db.query(
          'INSERT INTO notificacoes (usuario_destinatario_id, tipo, titulo, mensagem) VALUES ($1, $2, $3, $4)',
          [medicResult.rows[0].usuario_id, alert.tipo, alert.titulo, alert.mensagem]
        );
      }
    }
  }
};

module.exports = { createDialysisRecord, getDialysisHistory };