const db = require('../config/database');

// Criar novo registro de diálise
const createRecord = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Buscar paciente_id do usuário
    const patientResult = await db.query(
      'SELECT id FROM pacientes WHERE usuario_id = $1',
      [userId]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    const pacienteId = patientResult.rows[0].id;

    const {
      pressaoSistolica,
      pressaoDiastolica,
      drenagemInicial,
      ufTotal,
      tempoPermanencia,
      glicose,
      dextrose,
      observacoes
    } = req.body;

    // Validações básicas
    if (!pressaoSistolica || !pressaoDiastolica) {
      return res.status(400).json({ error: 'Pressão arterial é obrigatória' });
    }

    const result = await db.query(
      `INSERT INTO registros_dialise (
        paciente_id,
        data_registro,
        pressao_arterial_sistolica,
        pressao_arterial_diastolica,
        drenagem_inicial,
        uf_total,
        tempo_permanencia,
        concentracao_glicose,
        concentracao_dextrose,
        observacoes
      ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        pacienteId,
        pressaoSistolica,
        pressaoDiastolica,
        drenagemInicial || null,
        ufTotal || null,
        tempoPermanencia ? Math.round(tempoPermanencia * 60) : null, // converter horas para minutos
        glicose || null,
        dextrose || null,
        observacoes || null
      ]
    );

    res.status(201).json({
      message: 'Registro criado com sucesso',
      record: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao criar registro:', error);
    res.status(500).json({ error: 'Erro ao criar registro de diálise' });
  }
};

// Buscar registros do paciente
const getRecords = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

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
        data_registro,
        horario_inicio,
        horario_fim,
        pressao_arterial_sistolica,
        pressao_arterial_diastolica,
        drenagem_inicial,
        uf_total,
        tempo_permanencia,
        concentracao_glicose,
        concentracao_dextrose,
        observacoes,
        data_criacao
      FROM registros_dialise
      WHERE paciente_id = $1
      ORDER BY data_registro DESC, data_criacao DESC
      LIMIT $2 OFFSET $3`,
      [pacienteId, limit, offset]
    );

    // Converter tempo_permanencia de minutos para horas
    const records = result.rows.map(record => ({
      ...record,
      tempo_permanencia: record.tempo_permanencia 
        ? (record.tempo_permanencia / 60).toFixed(1) 
        : null
    }));

    res.json({ records });
  } catch (error) {
    console.error('Erro ao buscar registros:', error);
    res.status(500).json({ error: 'Erro ao buscar registros' });
  }
};

// Buscar estatísticas do paciente
const getStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const patientResult = await db.query(
      'SELECT id FROM pacientes WHERE usuario_id = $1',
      [userId]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    const pacienteId = patientResult.rows[0].id;

    // Buscar último registro
    const lastRecord = await db.query(
      `SELECT 
        pressao_arterial_sistolica,
        pressao_arterial_diastolica,
        uf_total,
        concentracao_glicose,
        tempo_permanencia
      FROM registros_dialise
      WHERE paciente_id = $1
      ORDER BY data_registro DESC, data_criacao DESC
      LIMIT 1`,
      [pacienteId]
    );

    // Buscar médias dos últimos 7 dias
    const averages = await db.query(
      `SELECT 
        AVG(pressao_arterial_sistolica) as avg_sistolica,
        AVG(pressao_arterial_diastolica) as avg_diastolica,
        AVG(uf_total) as avg_uf,
        AVG(concentracao_glicose) as avg_glicose
      FROM registros_dialise
      WHERE paciente_id = $1
        AND data_registro >= CURRENT_DATE - INTERVAL '7 days'`,
      [pacienteId]
    );

    const last = lastRecord.rows[0] || {};
    const avg = averages.rows[0] || {};

    res.json({
      stats: {
        pressaoArterial: {
          value: last.pressao_arterial_sistolica && last.pressao_arterial_diastolica
            ? `${last.pressao_arterial_sistolica}/${last.pressao_arterial_diastolica}`
            : 'N/A',
          unit: 'mmHg',
          trend: 'normal'
        },
        ufTotal: {
          value: last.uf_total ? (last.uf_total / 1000).toFixed(1) : 'N/A',
          unit: 'L',
          trend: 'normal'
        },
        glicose: {
          value: last.concentracao_glicose || 'N/A',
          unit: 'mg/dL',
          trend: 'normal'
        },
        tempoPermanencia: {
          value: last.tempo_permanencia 
            ? (last.tempo_permanencia / 60).toFixed(1) 
            : 'N/A',
          unit: 'horas',
          trend: 'normal'
        }
      },
      averages: {
        sistolica: avg.avg_sistolica ? Math.round(avg.avg_sistolica) : null,
        diastolica: avg.avg_diastolica ? Math.round(avg.avg_diastolica) : null,
        uf: avg.avg_uf ? (avg.avg_uf / 1000).toFixed(1) : null,
        glicose: avg.avg_glicose ? Math.round(avg.avg_glicose) : null
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};

// Buscar registro específico
const getRecordById = async (req, res) => {
  try {
    const userId = req.user.id;
    const recordId = req.params.id;

    const result = await db.query(
      `SELECT rd.* 
      FROM registros_dialise rd
      JOIN pacientes p ON rd.paciente_id = p.id
      WHERE rd.id = $1 AND p.usuario_id = $2`,
      [recordId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registro não encontrado' });
    }

    res.json({ record: result.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar registro:', error);
    res.status(500).json({ error: 'Erro ao buscar registro' });
  }
};

// Atualizar registro
const updateRecord = async (req, res) => {
  try {
    const userId = req.user.id;
    const recordId = req.params.id;

    // Verificar se o registro pertence ao paciente
    const checkResult = await db.query(
      `SELECT rd.id 
      FROM registros_dialise rd
      JOIN pacientes p ON rd.paciente_id = p.id
      WHERE rd.id = $1 AND p.usuario_id = $2`,
      [recordId, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Registro não encontrado' });
    }

    const {
      pressaoSistolica,
      pressaoDiastolica,
      drenagemInicial,
      ufTotal,
      tempoPermanencia,
      glicose,
      dextrose,
      observacoes
    } = req.body;

    const result = await db.query(
      `UPDATE registros_dialise SET
        pressao_arterial_sistolica = COALESCE($1, pressao_arterial_sistolica),
        pressao_arterial_diastolica = COALESCE($2, pressao_arterial_diastolica),
        drenagem_inicial = COALESCE($3, drenagem_inicial),
        uf_total = COALESCE($4, uf_total),
        tempo_permanencia = COALESCE($5, tempo_permanencia),
        concentracao_glicose = COALESCE($6, concentracao_glicose),
        concentracao_dextrose = COALESCE($7, concentracao_dextrose),
        observacoes = COALESCE($8, observacoes)
      WHERE id = $9
      RETURNING *`,
      [
        pressaoSistolica,
        pressaoDiastolica,
        drenagemInicial,
        ufTotal,
        tempoPermanencia ? Math.round(tempoPermanencia * 60) : null,
        glicose,
        dextrose,
        observacoes,
        recordId
      ]
    );

    res.json({
      message: 'Registro atualizado com sucesso',
      record: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar registro:', error);
    res.status(500).json({ error: 'Erro ao atualizar registro' });
  }
};

// Deletar registro
const deleteRecord = async (req, res) => {
  try {
    const userId = req.user.id;
    const recordId = req.params.id;

    const result = await db.query(
      `DELETE FROM registros_dialise rd
      USING pacientes p
      WHERE rd.id = $1 
        AND rd.paciente_id = p.id 
        AND p.usuario_id = $2
      RETURNING rd.id`,
      [recordId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registro não encontrado' });
    }

    res.json({ message: 'Registro deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar registro:', error);
    res.status(500).json({ error: 'Erro ao deletar registro' });
  }
};

module.exports = {
  createRecord,
  getRecords,
  getStats,
  getRecordById,
  updateRecord,
  deleteRecord
};







// const db = require('../config/database');

// const createDialysisRecord = async (req, res) => {
//   try {
//     const {
//       data_registro,
//       horario_inicio,
//       horario_fim,
//       pressao_arterial_sistolica,
//       pressao_arterial_diastolica,
//       peso_pre_dialise,
//       peso_pos_dialise,
//       drenagem_inicial,
//       uf_total,
//       tempo_permanencia,
//       concentracao_glicose,
//       concentracao_dextrose,
//       sintomas,
//       observacoes
//     } = req.body;

//     // Obter paciente_id baseado no usuário logado
//     const patientResult = await db.query('SELECT id FROM pacientes WHERE usuario_id = $1', [req.user.id]);
//     if (patientResult.rows.length === 0) {
//       return res.status(404).json({ error: 'Paciente não encontrado' });
//     }

//     const paciente_id = patientResult.rows[0].id;

//     const result = await db.query(
//       `INSERT INTO registros_dialise 
//        (paciente_id, data_registro, horario_inicio, horario_fim, pressao_arterial_sistolica,
//         pressao_arterial_diastolica, peso_pre_dialise, peso_pos_dialise, drenagem_inicial,
//         uf_total, tempo_permanencia, concentracao_glicose, concentracao_dextrose, sintomas, observacoes)
//        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
//        RETURNING id`,
//       [
//         paciente_id, data_registro, horario_inicio, horario_fim, pressao_arterial_sistolica,
//         pressao_arterial_diastolica, peso_pre_dialise, peso_pos_dialise, drenagem_inicial,
//         uf_total, tempo_permanencia, concentracao_glicose, concentracao_dextrose, sintomas, observacoes
//       ]
//     );

//     // Verificar se há alertas necessários
//     await checkAndCreateAlerts(paciente_id, req.body);

//     res.status(201).json({ 
//       message: 'Registro de diálise criado com sucesso', 
//       id: result.rows[0].id 
//     });
//   } catch (error) {
//     console.error('Erro ao criar registro:', error);
//     res.status(500).json({ error: 'Erro interno do servidor' });
//   }
// };

// const getDialysisHistory = async (req, res) => {
//   try {
//     const patientResult = await db.query('SELECT id FROM pacientes WHERE usuario_id = $1', [req.user.id]);
//     if (patientResult.rows.length === 0) {
//       return res.status(404).json({ error: 'Paciente não encontrado' });
//     }

//     const paciente_id = patientResult.rows[0].id;
//     const { page = 1, limit = 10 } = req.query;
//     const offset = (page - 1) * limit;

//     const result = await db.query(
//       `SELECT * FROM registros_dialise 
//        WHERE paciente_id = $1 
//        ORDER BY data_registro DESC, horario_inicio DESC 
//        LIMIT $2 OFFSET $3`,
//       [paciente_id, limit, offset]
//     );

//     res.json(result.rows);
//   } catch (error) {
//     console.error('Erro ao buscar histórico:', error);
//     res.status(500).json({ error: 'Erro interno do servidor' });
//   }
// };

// const checkAndCreateAlerts = async (paciente_id, data) => {
//   // Lógica para verificar parâmetros e criar alertas
//   const alerts = [];

//   // Verificar pressão arterial
//   if (data.pressao_arterial_sistolica > 140 || data.pressao_arterial_diastolica > 90) {
//     alerts.push({
//       tipo: 'alerta_medico',
//       titulo: 'Pressão Arterial Elevada',
//       mensagem: `Pressão arterial registrada: ${data.pressao_arterial_sistolica}/${data.pressao_arterial_diastolica} mmHg`
//     });
//   }

//   // Verificar UF muito baixa ou alta
//   if (data.uf_total < 100 || data.uf_total > 4000) {
//     alerts.push({
//       tipo: 'alerta_medico',
//       titulo: 'Ultrafiltração Anormal',
//       mensagem: `UF registrada: ${data.uf_total} mL`
//     });
//   }

//   // Criar notificações para o médico
//   if (alerts.length > 0) {
//     const medicResult = await db.query(
//       'SELECT m.usuario_id FROM pacientes p JOIN medicos m ON p.medico_responsavel_id = m.id WHERE p.id = $1',
//       [paciente_id]
//     );

//     if (medicResult.rows.length > 0) {
//       for (const alert of alerts) {
//         await db.query(
//           'INSERT INTO notificacoes (usuario_destinatario_id, tipo, titulo, mensagem) VALUES ($1, $2, $3, $4)',
//           [medicResult.rows[0].usuario_id, alert.tipo, alert.titulo, alert.mensagem]
//         );
//       }
//     }
//   }
// };

// module.exports = { createDialysisRecord, getDialysisHistory };