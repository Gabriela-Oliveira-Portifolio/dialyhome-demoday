const db = require('../config/database');
const { checkAdmin, checkDoctor } = require("../middleware/auth");

const patientController = {
  // Buscar perfil completo do paciente (próprio paciente)
  getProfile: async (req, res) => {
    try {
      const userId = req.user.id;

    //   const result = await db.query(
        const result = await db.query(
        `SELECT 
          u.id as usuario_id,
          u.nome,
          u.email,
          u.tipo_usuario,
          p.id as paciente_id,
          p.cpf,
          p.data_nascimento,
          p.telefone,
          p.endereco,
          p.peso_inicial,
          p.altura,
          p.data_inicio_tratamento,
          p.observacoes_medicas,
          EXTRACT(YEAR FROM AGE(p.data_nascimento)) as idade,
          m.id as medico_id,
          u_medico.nome as nome_medico,
          u_medico.email as email_medico,
          med.crm,
          med.especialidade
        FROM usuarios u
        JOIN pacientes p ON u.id = p.usuario_id
        LEFT JOIN medicos m ON p.medico_responsavel_id = m.id
        LEFT JOIN usuarios u_medico ON m.usuario_id = u_medico.id
        LEFT JOIN medicos med ON m.id = med.id
        WHERE u.id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Paciente não encontrado' });
      }

      const patient = result.rows[0];

      // Calcular dias em tratamento
      let diasTratamento = null;
      if (patient.data_inicio_tratamento) {
        const inicio = new Date(patient.data_inicio_tratamento);
        const hoje = new Date();
        diasTratamento = Math.floor((hoje - inicio) / (1000 * 60 * 60 * 24));
      }

      res.json({
        patient: {
          ...patient,
          dias_tratamento: diasTratamento
        }
      });
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      res.status(500).json({ error: 'Erro ao buscar perfil do paciente' });
    }
  },

  // Buscar estatísticas detalhadas
  getStats: async (req, res) => {
    try {
      const userId = req.user.id;
      const days = parseInt(req.query.days) || 30;

      // Buscar paciente_id
      const patientResult = await db.query(
        'SELECT id FROM pacientes WHERE usuario_id = $1',
        [userId]
      );

      if (patientResult.rows.length === 0) {
        return res.status(404).json({ error: 'Paciente não encontrado' });
      }

      const pacienteId = patientResult.rows[0].id;

      // Estatísticas do período especificado
      const stats = await db.query(
        `SELECT
          COUNT(*) as total_registros,
          AVG(pressao_arterial_sistolica) as media_sistolica,
          AVG(pressao_arterial_diastolica) as media_diastolica,
          MIN(pressao_arterial_sistolica) as min_sistolica,
          MAX(pressao_arterial_sistolica) as max_sistolica,
          MIN(pressao_arterial_diastolica) as min_diastolica,
          MAX(pressao_arterial_diastolica) as max_diastolica,
          AVG(uf_total) as media_uf,
          AVG(concentracao_glicose) as media_glicose,
          AVG(tempo_permanencia) as media_tempo,
          MIN(data_registro) as primeira_sessao,
          MAX(data_registro) as ultima_sessao
        FROM registros_dialise
        WHERE paciente_id = $1
        AND data_registro >= CURRENT_DATE - INTERVAL '1 day' * $2`,
        [pacienteId, days]

        //   AND data_registro >= CURRENT_DATE - $2::interval`,
        // [pacienteId, `${days} days`]
      );

      // Último registro
      const lastRecord = await db.query(
        `SELECT 
          pressao_arterial_sistolica,
          pressao_arterial_diastolica,
          uf_total,
          concentracao_glicose,
          tempo_permanencia,
          data_registro
        FROM registros_dialise
        WHERE paciente_id = $1
        ORDER BY data_registro DESC, data_criacao DESC
        LIMIT 1`,
        [pacienteId]
      );

      // Tendências (comparar últimos 7 dias com 7 dias anteriores)
      const trends = await db.query(
        `SELECT 
          CASE 
            WHEN data_registro >= CURRENT_DATE - INTERVAL '7 days' THEN 'recent'
            ELSE 'previous'
          END as period,
          AVG(pressao_arterial_sistolica) as avg_sistolica,
          AVG(pressao_arterial_diastolica) as avg_diastolica,
          AVG(uf_total) as avg_uf,
          AVG(concentracao_glicose) as avg_glicose
        FROM registros_dialise
        WHERE paciente_id = $1
          AND data_registro >= CURRENT_DATE - INTERVAL '14 days'
        GROUP BY period`,
        [pacienteId]
      );

      const statsData = stats.rows[0];
      const last = lastRecord.rows[0] || {};
      
      // Calcular tendências
      const recentTrends = trends.rows.find(t => t.period === 'recent') || {};
      const previousTrends = trends.rows.find(t => t.period === 'previous') || {};

      const calculateTrend = (recent, previous) => {
        if (!recent || !previous) return 'stable';
        const diff = ((recent - previous) / previous) * 100;
        if (diff > 5) return 'up';
        if (diff < -5) return 'down';
        return 'stable';
      };

      res.json({
        summary: {
          total_registros: parseInt(statsData.total_registros) || 0,
          dias_periodo: days,
          primeira_sessao: statsData.primeira_sessao,
          ultima_sessao: statsData.ultima_sessao
        },
        current: {
          pressao_arterial: {
            sistolica: last.pressao_arterial_sistolica || null,
            diastolica: last.pressao_arterial_diastolica || null,
            data: last.data_registro
          },
          uf_total: last.uf_total ? (last.uf_total / 1000).toFixed(1) : null,
          glicose: last.concentracao_glicose || null,
          tempo_permanencia: last.tempo_permanencia ? (last.tempo_permanencia / 60).toFixed(1) : null
        },
        averages: {
          pressao_sistolica: {
            value: statsData.media_sistolica ? Math.round(statsData.media_sistolica) : null,
            min: statsData.min_sistolica || null,
            max: statsData.max_sistolica || null,
            trend: calculateTrend(recentTrends.avg_sistolica, previousTrends.avg_sistolica)
          },
          pressao_diastolica: {
            value: statsData.media_diastolica ? Math.round(statsData.media_diastolica) : null,
            min: statsData.min_diastolica || null,
            max: statsData.max_diastolica || null,
            trend: calculateTrend(recentTrends.avg_diastolica, previousTrends.avg_diastolica)
          },
          uf_total: {
            value: statsData.media_uf ? (statsData.media_uf / 1000).toFixed(1) : null,
            trend: calculateTrend(recentTrends.avg_uf, previousTrends.avg_uf)
          },
          glicose: {
            value: statsData.media_glicose ? Math.round(statsData.media_glicose) : null,
            trend: calculateTrend(recentTrends.avg_glicose, previousTrends.avg_glicose)
          },
          tempo_permanencia: {
            value: statsData.media_tempo ? (statsData.media_tempo / 60).toFixed(1) : null
          }
        }
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  },

  // GET /api/patients (médicos/admin)
  getAllPatients: async (req, res) => {
    try {
      if (!checkDoctor(req.user) && !checkAdmin(req.user)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const orderBy = req.query.orderBy || "nome";

      let query = "SELECT * FROM pacientes WHERE ativo = true";
      const params = [];

      // Se for médico, filtra apenas pacientes do médico
      if (req.user.tipo === "medico") {
        query += " AND medico_id = $1";
        params.push(req.user.id);
      }

      query += ` ORDER BY ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const patients = await db.query(query, params);
      res.json(patients.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao buscar pacientes" });
    }
  },

  // GET /api/patients/:id
  getPatientById: async (req, res) => {
    try {
      const patientId = req.params.id;

      const patient = await db.query(
        "SELECT * FROM pacientes WHERE id = $1 AND ativo = true", 
        [patientId]
      );
      
      if (!patient.rows.length) {
        return res.status(404).json({ error: "Paciente não encontrado" });
      }

      // Verifica permissão: próprio paciente, médico responsável ou admin
      if (
        req.user.tipo !== "admin" &&
        !(req.user.tipo === "medico" && patient.rows[0].medico_id === req.user.id) &&
        !(req.user.tipo === "paciente" && req.user.id === patient.rows[0].usuario_id)
      ) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      // Histórico recente, medicações e próximos lembretes
      const history = await db.query(
        "SELECT * FROM historico_pacientes WHERE paciente_id = $1 ORDER BY data DESC LIMIT 10", 
        [patientId]
      );
      const medications = await db.query(
        "SELECT * FROM medicacoes WHERE paciente_id = $1 AND ativo = true", 
        [patientId]
      );
      const reminders = await db.query(
        "SELECT * FROM lembretes WHERE paciente_id = $1 AND data >= NOW()", 
        [patientId]
      );

      res.json({
        ...patient.rows[0],
        history: history.rows,
        medications: medications.rows,
        reminders: reminders.rows
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao buscar paciente" });
    }
  },

  // POST /api/patients (admin/médico)
  createPatient: async (req, res) => {
    try {
      if (!checkDoctor(req.user) && !checkAdmin(req.user)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const { nome, email, senha, convenio, medico_id } = req.body;
      
      if (!nome || !email || !senha) {
        return res.status(400).json({ error: "Dados obrigatórios ausentes" });
      }

      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash(senha, 10);

      // Cria usuário base
      const newUser = await db.query(
        "INSERT INTO usuarios (nome, email, senha, tipo) VALUES ($1, $2, $3, 'paciente') RETURNING id",
        [nome, email, hashedPassword]
      );

      const usuario_id = newUser.rows[0].id;

      // Cria registro paciente
      await db.query(
        "INSERT INTO pacientes (usuario_id, convenio, medico_id, ativo) VALUES ($1, $2, $3, true)",
        [usuario_id, convenio, medico_id || null]
      );

      res.status(201).json({ message: "Paciente criado com sucesso", usuario_id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao criar paciente" });
    }
  },

  // PUT /api/patients/:id
  updatePatient: async (req, res) => {
    try {
      const patientId = req.params.id;

      const patient = await db.query("SELECT * FROM pacientes WHERE id = $1", [patientId]);
      
      if (!patient.rows.length) {
        return res.status(404).json({ error: "Paciente não encontrado" });
      }

      // Permissão: admin ou médico responsável
      if (
        !checkAdmin(req.user) &&
        !(req.user.tipo === "medico" && patient.rows[0].medico_id === req.user.id)
      ) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const { nome, email, convenio } = req.body;

      // Atualiza usuário
      await db.query(
        "UPDATE usuarios SET nome = $1, email = $2 WHERE id = $3",
        [nome, email, patient.rows[0].usuario_id]
      );

      // Atualiza paciente
      await db.query("UPDATE pacientes SET convenio = $1 WHERE id = $2", [convenio, patientId]);

      res.json({ message: "Paciente atualizado com sucesso" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao atualizar paciente" });
    }
  },

  // GET /api/patients/:id/medical-data
  getMedicalData: async (req, res) => {
    try {
      const patientId = req.params.id;

      if (!checkDoctor(req.user) && !checkAdmin(req.user)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const medicalData = await db.query(
        "SELECT * FROM dados_medicos WHERE paciente_id = $1", 
        [patientId]
      );
      const weightHistory = await db.query(
        "SELECT data, peso FROM historico_medico WHERE paciente_id = $1 ORDER BY data", 
        [patientId]
      );
      const pressureHistory = await db.query(
        "SELECT data, pressao FROM historico_medico WHERE paciente_id = $1 ORDER BY data", 
        [patientId]
      );

      res.json({
        medicalData: medicalData.rows[0] || {},
        weightHistory: weightHistory.rows,
        pressureHistory: pressureHistory.rows
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao buscar dados médicos" });
    }
  },

  // PUT /api/patients/:id/medical-data
  updateMedicalData: async (req, res) => {
    try {
      const patientId = req.params.id;
      
      if (!checkDoctor(req.user) && !checkAdmin(req.user)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const { observacoes, medicacoes } = req.body;

      // Atualiza observações
      await db.query(
        "UPDATE dados_medicos SET observacoes = $1 WHERE paciente_id = $2", 
        [observacoes, patientId]
      );

      // Atualiza medicações (simples: desativa antigas e adiciona novas)
      await db.query("UPDATE medicacoes SET ativo = false WHERE paciente_id = $1", [patientId]);
      
      for (const med of medicacoes) {
        await db.query(
          "INSERT INTO medicacoes (paciente_id, nome, dose, ativo) VALUES ($1, $2, $3, true)",
          [patientId, med.nome, med.dose]
        );
      }

      res.json({ message: "Dados médicos atualizados com sucesso" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao atualizar dados médicos" });
    }
  },

  // GET /api/patients/:id/dialysis-history
  getDialysisHistory: async (req, res) => {
    try {
      const patientId = req.params.id;

      const patient = await db.query("SELECT * FROM pacientes WHERE id = $1", [patientId]);
      
      if (!patient.rows.length) {
        return res.status(404).json({ error: "Paciente não encontrado" });
      }

      // Permissão: próprio paciente, médico ou admin
      if (
        req.user.tipo !== "admin" &&
        !(req.user.tipo === "medico" && patient.rows[0].medico_id === req.user.id) &&
        !(req.user.tipo === "paciente" && req.user.id === patient.rows[0].usuario_id)
      ) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const history = await db.query(
        "SELECT * FROM historico_dialise WHERE paciente_id = $1 ORDER BY data DESC", 
        [patientId]
      );

      res.json({ dialysisHistory: history.rows });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao buscar histórico de diálise" });
    }
  },

  // PUT /api/patients/:id/assign-doctor
  assignDoctor: async (req, res) => {
    try {
      if (!checkAdmin(req.user)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const patientId = req.params.id;
      const { medico_id } = req.body;

      await db.query(
        "UPDATE pacientes SET medico_id = $1 WHERE id = $2", 
        [medico_id, patientId]
      );

      res.json({ message: "Médico responsável atualizado com sucesso" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao atribuir médico" });
    }
  }
};

module.exports = patientController;











// const db = require('../config/database');
// const { checkAdmin, checkDoctor } = require("../middleware/auth");
// const bcrypt = require("bcrypt"); // Mova o require do bcrypt para o topo

// const patientController = {
//   // Buscar perfil completo do paciente (próprio paciente)
//   getProfile: async (req, res) => {
//     try {
//       const userId = req.user.id;

//       const result = await db.query(
//         `SELECT 
//           u.id as usuario_id,
//           u.nome,
//           u.email,
//           u.tipo_usuario,
//           p.id as paciente_id,
//           p.cpf,
//           p.data_nascimento,
//           p.telefone,
//           p.endereco,
//           p.peso_inicial,
//           p.altura,
//           p.data_inicio_tratamento,
//           p.observacoes_medicas,
//           EXTRACT(YEAR FROM AGE(p.data_nascimento)) as idade,
//           m_reg.id as medico_id,
//           u_medico.nome as nome_medico,
//           u_medico.email as email_medico,
//           m_reg.crm,
//           m_reg.especialidade
//         FROM usuarios u
//         JOIN pacientes p ON u.id = p.usuario_id
//         LEFT JOIN medicos m_reg ON p.medico_responsavel_id = m_reg.id
//         LEFT JOIN usuarios u_medico ON m_reg.usuario_id = u_medico.id
//         WHERE u.id = $1`,
//         [userId]
//       );

//       if (result.rows.length === 0) {
//         return res.status(404).json({ error: 'Paciente não encontrado' });
//       }

//       const patient = result.rows[0];

//       // Calcular dias em tratamento
//       let diasTratamento = null;
//       if (patient.data_inicio_tratamento) {
//         const inicio = new Date(patient.data_inicio_tratamento);
//         const hoje = new Date();
//         diasTratamento = Math.floor((hoje - inicio) / (1000 * 60 * 60 * 24));
//       }

//       res.json({
//         patient: {
//           ...patient,
//           dias_tratamento: diasTratamento
//         }
//       });
//     } catch (error) {
//       console.error('Erro ao buscar perfil:', error);
//       res.status(500).json({ error: 'Erro ao buscar perfil do paciente' });
//     }
//   },

//   // Buscar estatísticas detalhadas
//   getStats: async (req, res) => {
//     try {
//       const userId = req.user.id;
//       const days = parseInt(req.query.days) || 30;

//       // Buscar paciente_id
//       const patientResult = await db.query(
//         'SELECT id FROM pacientes WHERE usuario_id = $1',
//         [userId]
//       );

//       if (patientResult.rows.length === 0) {
//         return res.status(404).json({ error: 'Paciente não encontrado' });
//       }

//       const pacienteId = patientResult.rows[0].id;

//       // Estatísticas do período especificado
//       const stats = await db.query(
//         `SELECT 
//           COUNT(*) as total_registros,
//           AVG(pressao_arterial_sistolica) as media_sistolica,
//           AVG(pressao_arterial_diastolica) as media_diastolica,
//           MIN(pressao_arterial_sistolica) as min_sistolica,
//           MAX(pressao_arterial_sistolica) as max_sistolica,
//           MIN(pressao_arterial_diastolica) as min_diastolica,
//           MAX(pressao_arterial_diastolica) as max_diastolica,
//           AVG(uf_total) as media_uf,
//           AVG(concentracao_glicose) as media_glicose,
//           AVG(tempo_permanencia) as media_tempo,
//           MIN(data_registro) as primeira_sessao,
//           MAX(data_registro) as ultima_sessao
//         FROM registros_dialise
//         WHERE paciente_id = $1
//         AND data_registro >= CURRENT_DATE - INTERVAL '1 day' * $2`,
//         [pacienteId, days]
//       );

//       // Último registro
//       const lastRecord = await db.query(
//         `SELECT 
//           pressao_arterial_sistolica,
//           pressao_arterial_diastolica,
//           uf_total,
//           concentracao_glicose,
//           tempo_permanencia,
//           data_registro
//         FROM registros_dialise
//         WHERE paciente_id = $1
//         ORDER BY data_registro DESC, data_criacao DESC
//         LIMIT 1`,
//         [pacienteId]
//       );

//       // Tendências (comparar últimos 7 dias com 7 dias anteriores)
//       const trends = await db.query(
//         `SELECT 
//           CASE 
//             WHEN data_registro >= CURRENT_DATE - INTERVAL '7 days' THEN 'recent'
//             ELSE 'previous'
//           END as period,
//           AVG(pressao_arterial_sistolica) as avg_sistolica,
//           AVG(pressao_arterial_diastolica) as avg_diastolica,
//           AVG(uf_total) as avg_uf,
//           AVG(concentracao_glicose) as avg_glicose
//         FROM registros_dialise
//         WHERE paciente_id = $1
//           AND data_registro >= CURRENT_DATE - INTERVAL '14 days'
//         GROUP BY period`,
//         [pacienteId]
//       );

//       const statsData = stats.rows[0];
//       const last = lastRecord.rows[0] || {};
//       
//       // Calcular tendências
//       const recentTrends = trends.rows.find(t => t.period === 'recent') || {};
//       const previousTrends = trends.rows.find(t => t.period === 'previous') || {};

//       const calculateTrend = (recent, previous) => {
//         if (!recent || !previous) return 'stable';
//         const diff = ((recent - previous) / previous) * 100;
//         if (diff > 5) return 'up';
//         if (diff < -5) return 'down';
//         return 'stable';
//       };

//       res.json({
//         summary: {
//           total_registros: parseInt(statsData.total_registros) || 0,
//           dias_periodo: days,
//           primeira_sessao: statsData.primeira_sessao,
//           ultima_sessao: statsData.ultima_sessao
//         },
//         current: {
//           pressao_arterial: {
//             sistolica: last.pressao_arterial_sistolica || null,
//             diastolica: last.pressao_arterial_diastolica || null,
//             data: last.data_registro
//           },
//           uf_total: last.uf_total ? (last.uf_total / 1000).toFixed(1) : null,
//           glicose: last.concentracao_glicose || null,
//           tempo_permanencia: last.tempo_permanencia ? (last.tempo_permanencia / 60).toFixed(1) : null
//         },
//         averages: {
//           pressao_sistolica: {
//             value: statsData.media_sistolica ? Math.round(statsData.media_sistolica) : null,
//             min: statsData.min_sistolica || null,
//             max: statsData.max_sistolica || null,
//             trend: calculateTrend(recentTrends.avg_sistolica, previousTrends.avg_sistolica)
//           },
//           pressao_diastolica: {
//             value: statsData.media_diastolica ? Math.round(statsData.media_diastolica) : null,
//             min: statsData.min_diastolica || null,
//             max: statsData.max_diastolica || null,
//             trend: calculateTrend(recentTrends.avg_diastolica, previousTrends.avg_diastolica)
//           },
//           uf_total: {
//             value: statsData.media_uf ? (statsData.media_uf / 1000).toFixed(1) : null,
//             trend: calculateTrend(recentTrends.avg_uf, previousTrends.avg_uf)
//           },
//           glicose: {
//             value: statsData.media_glicose ? Math.round(statsData.media_glicose) : null,
//             trend: calculateTrend(recentTrends.avg_glicose, previousTrends.avg_glicose)
//           },
//           tempo_permanencia: {
//             value: statsData.media_tempo ? (statsData.media_tempo / 60).toFixed(1) : null
//           }
//         }
//       });
//     } catch (error) {
//       console.error('Erro ao buscar estatísticas:', error);
//       res.status(500).json({ error: 'Erro ao buscar estatísticas' });
//     }
//   },

//   // GET /api/patients (médicos/admin)
//   getAllPatients: async (req, res) => {
//     try {
//         // 1. Verifica permissão (Admin ou Médico)
//         if (!checkDoctor(req.user) && !checkAdmin(req.user)) {
//             return res.status(403).json({ error: "Acesso negado" });
//         }

//         const page = parseInt(req.query.page) || 1;
//         const limit = parseInt(req.query.limit) || 20;
//         const offset = (page - 1) * limit;
//         const orderBy = req.query.orderBy || "nome";

//         let query = `SELECT 
//                 p.id, p.usuario_id, p.cpf, p.data_nascimento, p.telefone, 
//                 u.nome, u.email 
//             FROM pacientes p
//             JOIN usuarios u ON p.usuario_id = u.id
//             WHERE p.ativo = true AND u.ativo = true`;
//         const params = [];
//         let paramIndex = 1;

//         // 2. Se for médico, filtra apenas pacientes do médico (Solução A: busca o ID do médico na tabela 'medicos')
//         if (checkDoctor(req.user)) {
//             // Encontra o ID do registro médico (medicos.id) usando o ID do usuário (usuarios.id)
//             const medicoResult = await db.query(
//                 'SELECT id FROM medicos WHERE usuario_id = $1',
//                 [req.user.id]
//             );

//             if (medicoResult.rows.length === 0) {
//                 return res.status(404).json({ error: "Registro médico não encontrado" });
//             }

//             const medicoId = medicoResult.rows[0].id;

//             // Filtra a query usando o ID do médico (medico_responsavel_id referencia medicos.id)
//             query += ` AND p.medico_responsavel_id = $${paramIndex}`;
//             params.push(medicoId);
//             paramIndex++;
//         }

//         // 3. Adiciona paginação e ordenação
//         query += ` ORDER BY u.${orderBy} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
//         params.push(limit, offset);

//         const patients = await db.query(query, params);
//         res.json(patients.rows);
//     } catch (error) {
//         console.error('Erro em getAllPatients:', error);
//         res.status(500).json({ error: "Erro ao buscar pacientes" });
//     }
//   },

//   // GET /api/patients/:id
//   getPatientById: async (req, res) => {
//      try {
//         const patientId = req.params.id;

//         // Traz os dados do paciente e usuário
//         const patientResult = await db.query(
//             `SELECT p.*, u.id as usuario_id_fk, u.tipo_usuario
//              FROM pacientes p 
//              JOIN usuarios u ON p.usuario_id = u.id
//              WHERE p.id = $1 AND u.ativo = true`,
//             [patientId]
//         );
//         
//         if (!patientResult.rows.length) {
//             return res.status(404).json({ error: "Paciente não encontrado" });
//         }

//         const patient = patientResult.rows[0];

//         // 1. Verifica Permissão: próprio paciente, médico responsável ou admin
//         let isMedicoResponsavel = false;
//         
//         if (checkDoctor(req.user)) {
//             const medicoResult = await db.query(
//                 'SELECT id FROM medicos WHERE usuario_id = $1',
//                 [req.user.id]
//             );
//             
//             const medicoId = medicoResult.rows[0]?.id;
//             if (medicoId && patient.medico_responsavel_id === medicoId) {
//                 isMedicoResponsavel = true;
//             }
//         }

//         if (
//             !checkAdmin(req.user) &&
//             !isMedicoResponsavel &&
//             !(req.user.tipo_usuario === "paciente" && req.user.id === patient.usuario_id)
//         ) {
//             return res.status(403).json({ error: "Acesso negado" });
//         }

//         // 2. Busca dados adicionais
//         const history = await db.query(
//             "SELECT * FROM historico_pacientes WHERE paciente_id = $1 ORDER BY data DESC LIMIT 10", 
//             [patientId]
//         );
//         const medications = await db.query(
//             "SELECT * FROM medicamentos WHERE paciente_id = $1 AND ativo = true", 
//             [patientId]
//         );
//         const reminders = await db.query(
//             "SELECT * FROM lembretes WHERE paciente_id = $1 AND data_hora >= NOW()", 
//             [patientId]
//         );

//         res.json({
//             ...patient,
//             history: history.rows,
//             medications: medications.rows,
//             reminders: reminders.rows
//         });
//       } catch (error) {
//         console.error('Erro em getPatientById:', error);
//         res.status(500).json({ error: "Erro ao buscar paciente" });
//       }
//   },

//   // POST /api/patients (admin/médico)
//   createPatient: async (req, res) => {
//     try {
//       // A ordem de checagem foi mantida como estava, confiando no seu modelo de negócio
//       if (!checkDoctor(req.user) && !checkAdmin(req.user)) {
//         return res.status(403).json({ error: "Acesso negado" });
//       }

//       const { nome, email, senha, convenio, medico_id } = req.body;
//       
//       if (!nome || !email || !senha) {
//         return res.status(400).json({ error: "Dados obrigatórios ausentes" });
//       }

//       const hashedPassword = await bcrypt.hash(senha, 10);

//       // Cria usuário base
//       const newUser = await db.query(
//         "INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario) VALUES ($1, $2, $3, 'paciente') RETURNING id",
//         [nome, email, hashedPassword]
//       );

//       const usuario_id = newUser.rows[0].id;

//       // Cria registro paciente (medico_id é o ID da tabela 'medicos', não do usuário)
//       await db.query(
//         "INSERT INTO pacientes (usuario_id, convenio, medico_responsavel_id, ativo) VALUES ($1, $2, $3, true)",
//         [usuario_id, convenio, medico_id || null]
//       );

//       res.status(201).json({ message: "Paciente criado com sucesso", usuario_id });
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ error: "Erro ao criar paciente" });
//     }
//   },

//   // PUT /api/patients/:id
//   updatePatient: async (req, res) => {
//      try {
//         const patientId = req.params.id;

//         const patientResult = await db.query("SELECT * FROM pacientes WHERE id = $1", [patientId]);
//         
//         if (!patientResult.rows.length) {
//             return res.status(404).json({ error: "Paciente não encontrado" });
//         }

//         const patient = patientResult.rows[0];

//         // 1. Verifica Permissão: admin ou médico responsável (CORREÇÃO DE LÓGICA)
//         let isMedicoResponsavel = false;
//         
//         if (checkDoctor(req.user)) {
//             const medicoResult = await db.query(
//                 'SELECT id FROM medicos WHERE usuario_id = $1',
//                 [req.user.id]
//             );
//             
//             const medicoId = medicoResult.rows[0]?.id;
//             if (medicoId && patient.medico_responsavel_id === medicoId) {
//                 isMedicoResponsavel = true;
//             }
//         }

//         if (
//             !checkAdmin(req.user) &&
//             !isMedicoResponsavel
//         ) {
//             return res.status(403).json({ error: "Acesso negado" });
//         }

//         const { nome, email, convenio } = req.body;

//         // 2. Atualiza usuário (se nome ou email existirem)
//         if (nome || email) {
//             const updates = [];
//             const updateParams = [];
//             let pIndex = 1;

//             if (nome) { updates.push(`nome = $${pIndex}`); updateParams.push(nome); pIndex++; }
//             if (email) { updates.push(`email = $${pIndex}`); updateParams.push(email); pIndex++; }
//             
//             if (updates.length > 0) {
//                 await db.query(
//                     `UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${pIndex}`,
//                     [...updateParams, patient.usuario_id]
//                 );
//             }
//         }

//         // 3. Atualiza paciente
//         await db.query("UPDATE pacientes SET convenio = $1 WHERE id = $2", [convenio, patientId]);

//         res.json({ message: "Paciente atualizado com sucesso" });
//       } catch (error) {
//         console.error('Erro em updatePatient:', error);
//         res.status(500).json({ error: "Erro ao atualizar paciente" });
//       }
//   },

//   // GET /api/patients/:id/medical-data
//   getMedicalData: async (req, res) => {
//     try {
//       const patientId = req.params.id;

//       if (!checkDoctor(req.user) && !checkAdmin(req.user)) {
//         return res.status(403).json({ error: "Acesso negado" });
//       }

//       const medicalData = await db.query(
//         "SELECT * FROM dados_medicos WHERE paciente_id = $1", 
//         [patientId]
//       );
//       const weightHistory = await db.query(
//         "SELECT data, peso FROM historico_medico WHERE paciente_id = $1 ORDER BY data", 
//         [patientId]
//       );
//       const pressureHistory = await db.query(
//         "SELECT data, pressao FROM historico_medico WHERE paciente_id = $1 ORDER BY data", 
//         [patientId]
//       );

//       res.json({
//         medicalData: medicalData.rows[0] || {},
//         weightHistory: weightHistory.rows,
//         pressureHistory: pressureHistory.rows
//       });
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ error: "Erro ao buscar dados médicos" });
//     }
//   },

//   // PUT /api/patients/:id/medical-data
//   updateMedicalData: async (req, res) => {
//     try {
//       const patientId = req.params.id;
//       
//       if (!checkDoctor(req.user) && !checkAdmin(req.user)) {
//         return res.status(403).json({ error: "Acesso negado" });
//       }

//       const { observacoes, medicacoes } = req.body;

//       // Atualiza observações
//       await db.query(
//         "UPDATE dados_medicos SET observacoes = $1 WHERE paciente_id = $2", 
//         [observacoes, patientId]
//       );

//       // Atualiza medicações (simples: desativa antigas e adiciona novas)
//       await db.query("UPDATE medicacoes SET ativo = false WHERE paciente_id = $1", [patientId]);
//       
//       // CORRIGINDO NOME DA TABELA DE MEDICAÇÕES (uso 'medicamentos' no Schema)
//       for (const med of medicacoes) {
//         await db.query(
//           "INSERT INTO medicamentos (paciente_id, nome, dosagem, ativo) VALUES ($1, $2, $3, true)",
//           [patientId, med.nome, med.dose] // A coluna dose pode ser diferente no DB, confira!
//         );
//       }

//       res.json({ message: "Dados médicos atualizados com sucesso" });
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ error: "Erro ao atualizar dados médicos" });
//     }
//   },

//   // GET /api/patients/:id/dialysis-history
//   getDialysisHistory: async (req, res) => {
//     try {
//       const patientId = req.params.id;

//       const patientResult = await db.query("SELECT * FROM pacientes WHERE id = $1", [patientId]);
//       
//       if (!patientResult.rows.length) {
//         return res.status(404).json({ error: "Paciente não encontrado" });
//       }

//       const patient = patientResult.rows[0];

//       // Permissão: próprio paciente, médico ou admin (CORREÇÃO DE LÓGICA)
//       let isMedicoResponsavel = false;
//         
//       if (checkDoctor(req.user)) {
//           const medicoResult = await db.query(
//               'SELECT id FROM medicos WHERE usuario_id = $1',
//               [req.user.id]
//           );
//           
//           const medicoId = medicoResult.rows[0]?.id;
//           if (medicoId && patient.medico_responsavel_id === medicoId) {
//               isMedicoResponsavel = true;
//           }
//       }

//       if (
//         req.user.tipo_usuario !== "admin" &&
//         !isMedicoResponsavel &&
//         !(req.user.tipo_usuario === "paciente" && req.user.id === patient.usuario_id)
//       ) {
//         return res.status(403).json({ error: "Acesso negado" });
//       }

//       // CORRIGINDO NOME DA TABELA (uso 'registros_dialise' no Schema)
//       const history = await db.query(
//         "SELECT * FROM registros_dialise WHERE paciente_id = $1 ORDER BY data_registro DESC", 
//         [patientId]
//       );

//       res.json({ dialysisHistory: history.rows });
//     } catch (error) {
//       console.error('Erro ao buscar histórico de diálise:', error);
//       res.status(500).json({ error: "Erro ao buscar histórico de diálise" });
//     }
//   },

//   // PUT /api/patients/:id/assign-doctor
//   assignDoctor: async (req, res) => {
//     try {
//       if (!checkAdmin(req.user)) {
//         return res.status(403).json({ error: "Acesso negado" });
//       }

//       const patientId = req.params.id;
//       const { medico_id } = req.body;

//       // CORRIGINDO NOME DA COLUNA
//       await db.query(
//         "UPDATE pacientes SET medico_responsavel_id = $1 WHERE id = $2", 
//         [medico_id, patientId]
//       );

//       res.json({ message: "Médico responsável atualizado com sucesso" });
//     } catch (error) {
//       console.error('Erro ao atribuir médico:', error);
//       res.status(500).json({ error: "Erro ao atribuir médico" });
//     }
//   }
// };

// module.exports = patientController;


























// const db = require('../config/database');
// const { checkAdmin, checkDoctor, authorizeRole } = require("../middleware/auth");
// const bcrypt = require("bcrypt"); 

// const patientController = {
//   // Buscar perfil completo do paciente (próprio paciente)
//   getProfile: async (req, res) => {
//     try {
//       const userId = req.user.id;



//         // const result = await db.query("SELECT 1 AS teste");

// const result = await db.query(`SELECT u.id as usuario_id, u.nome, u.email, u.tipo_usuario, p.id as paciente_id,
//           p.cpf,
//           p.data_nascimento,
//           p.telefone,
//           p.endereco,
//           p.peso_inicial,
//           p.altura,
//           p.data_inicio_tratamento,
//           p.observacoes_medicas,
//           EXTRACT(YEAR FROM AGE(p.data_nascimento)) as idade,
//           m_reg.id as medico_id,
//           u_medico.nome as nome_medico,
//           u_medico.email as email_medico, m_reg.crm, m_reg.especialidade
//         FROM usuarios u
//         JOIN pacientes p ON u.id = p.usuario_id
//         LEFT JOIN medicos m_reg ON p.medico_responsavel_id = m_reg.id
//         LEFT JOIN usuarios u_medico ON m_reg.usuario_id = u_medico.id
//         WHERE u.id = $1`,
//         [userId]
//       );

//       if (result.rows.length === 0) {
//         return res.status(404).json({ error: 'Paciente não encontrado' });
//       }

//       const patient = result.rows[0];

//       // Calcular dias em tratamento
//       let diasTratamento = null;
//       if (patient.data_inicio_tratamento) {
//         const inicio = new Date(patient.data_inicio_tratamento);
//         const hoje = new Date();
//         diasTratamento = Math.floor((hoje - inicio) / (1000 * 60 * 60 * 24));
//       }

//       res.json({
//         patient: {
//           ...patient,
//           dias_tratamento: diasTratamento
//         }
//       });
//     } catch (error) {
//       console.error('Erro ao buscar perfil:', error);
//       res.status(500).json({ error: 'Erro ao buscar perfil do paciente' });
//     }
//   },

//   // Buscar estatísticas detalhadas
//   getStats: async (req, res) => {
//     try {
//       const userId = req.user.id;
//       const days = parseInt(req.query.days) || 30;

//       // Buscar paciente_id
//       const patientResult = await db.query(
//         'SELECT id FROM pacientes WHERE usuario_id = $1',
//         [userId]
//       );

//       if (patientResult.rows.length === 0) {
//         return res.status(404).json({ error: 'Paciente não encontrado' });
//       }

//       const pacienteId = patientResult.rows[0].id;

//       // Estatísticas do período especificado
//       const stats = await db.query(
//         `SELECT 
//           COUNT(*) as total_registros,
//           AVG(pressao_arterial_sistolica) as media_sistolica,
//           AVG(pressao_arterial_diastolica) as media_diastolica,
//           MIN(pressao_arterial_sistolica) as min_sistolica,
//           MAX(pressao_arterial_sistolica) as max_sistolica,
//           MIN(pressao_arterial_diastolica) as min_diastolica,
//           MAX(pressao_arterial_diastolica) as max_diastolica,
//           AVG(uf_total) as media_uf,
//           AVG(concentracao_glicose) as media_glicose,
//           AVG(tempo_permanencia) as media_tempo,
//           MIN(data_registro) as primeira_sessao,
//           MAX(data_registro) as ultima_sessao
//         FROM registros_dialise
//         WHERE paciente_id = $1
//         AND data_registro >= CURRENT_DATE - INTERVAL '1 day' * $2`,
//         [pacienteId, days]
//       );

//       // Último registro
//       const lastRecord = await db.query(
//         `SELECT 
//           pressao_arterial_sistolica,
//           pressao_arterial_diastolica,
//           uf_total,
//           concentracao_glicose,
//           tempo_permanencia,
//           data_registro
//         FROM registros_dialise
//         WHERE paciente_id = $1
//         ORDER BY data_registro DESC, data_criacao DESC
//         LIMIT 1`,
//         [pacienteId]
//       );

//       // Tendências (comparar últimos 7 dias com 7 dias anteriores)
//       const trends = await db.query(
//         `SELECT 
//           CASE 
//             WHEN data_registro >= CURRENT_DATE - INTERVAL '7 days' THEN 'recent'
//             ELSE 'previous'
//           END as period,
//           AVG(pressao_arterial_sistolica) as avg_sistolica,
//           AVG(pressao_arterial_diastolica) as avg_diastolica,
//           AVG(uf_total) as avg_uf,
//           AVG(concentracao_glicose) as avg_glicose
//         FROM registros_dialise
//         WHERE paciente_id = $1
//           AND data_registro >= CURRENT_DATE - INTERVAL '14 days'
//         GROUP BY period`,
//         [pacienteId]
//       );

//       const statsData = stats.rows[0];
//       const last = lastRecord.rows[0] || {};
//       
//       // Calcular tendências
//       const recentTrends = trends.rows.find(t => t.period === 'recent') || {};
//       const previousTrends = trends.rows.find(t => t.period === 'previous') || {};

//       const calculateTrend = (recent, previous) => {
//         if (!recent || !previous) return 'stable';
//         const diff = ((recent - previous) / previous) * 100;
//         if (diff > 5) return 'up';
//         if (diff < -5) return 'down';
//         return 'stable';
//       };

//       res.json({
//         summary: {
//           total_registros: parseInt(statsData.total_registros) || 0,
//           dias_periodo: days,
//           primeira_sessao: statsData.primeira_sessao,
//           ultima_sessao: statsData.ultima_sessao
//         },
//         current: {
//           pressao_arterial: {
//             sistolica: last.pressao_arterial_sistolica || null,
//             diastolica: last.pressao_arterial_diastolica || null,
//             data: last.data_registro
//           },
//           uf_total: last.uf_total ? (last.uf_total / 1000).toFixed(1) : null,
//           glicose: last.concentracao_glicose || null,
//           tempo_permanencia: last.tempo_permanencia ? (last.tempo_permanencia / 60).toFixed(1) : null
//         },
//         averages: {
//           pressao_sistolica: {
//             value: statsData.media_sistolica ? Math.round(statsData.media_sistolica) : null,
//             min: statsData.min_sistolica || null,
//             max: statsData.max_sistolica || null,
//             trend: calculateTrend(recentTrends.avg_sistolica, previousTrends.avg_sistolica)
//           },
//           pressao_diastolica: {
//             value: statsData.media_diastolica ? Math.round(statsData.media_diastolica) : null,
//             min: statsData.min_diastolica || null,
//             max: statsData.max_diastolica || null,
//             trend: calculateTrend(recentTrends.avg_diastolica, previousTrends.avg_diastolica)
//           },
//           uf_total: {
//             value: statsData.media_uf ? (statsData.media_uf / 1000).toFixed(1) : null,
//             trend: calculateTrend(recentTrends.avg_uf, previousTrends.avg_uf)
//           },
//           glicose: {
//             value: statsData.media_glicose ? Math.round(statsData.media_glicose) : null,
//             trend: calculateTrend(recentTrends.avg_glicose, previousTrends.avg_glicose)
//           },
//           tempo_permanencia: {
//             value: statsData.media_tempo ? (statsData.media_tempo / 60).toFixed(1) : null
//           }
//         }
//       });
//     } catch (error) {
//       console.error('Erro ao buscar estatísticas:', error);   
//       res.status(500).json({ error: 'Erro ao buscar estatísticas' });
//     }
//   },

//   // GET /api/patients (médicos/admin)
//   getAllPatients: async (req, res) => {
//     try {
//         // 1. Verifica permissão (Admin ou Médico)
//         if (!checkDoctor(req.user) && !checkAdmin(req.user)) {
//             return res.status(403).json({ error: "Acesso negado" });
//         }

//         const page = parseInt(req.query.page) || 1;
//         const limit = parseInt(req.query.limit) || 20;
//         const offset = (page - 1) * limit;
//         const orderBy = req.query.orderBy || "nome";

//         let query = `SELECT 
//                 p.id, p.usuario_id, p.cpf, p.data_nascimento, p.telefone, 
//                 u.nome, u.email 
//             FROM pacientes p
//             JOIN usuarios u ON p.usuario_id = u.id
//             WHERE p.ativo = true AND u.ativo = true`;
//         const params = [];
//         let paramIndex = 1;

//         // 2. Se for médico, filtra apenas pacientes do médico (Solução A: busca o ID do médico na tabela 'medicos')
//         if (checkDoctor(req.user)) {
//             // Encontra o ID do registro médico (medicos.id) usando o ID do usuário (usuarios.id)
//             const medicoResult = await db.query(
//                 'SELECT id FROM medicos WHERE usuario_id = $1',
//                 [req.user.id]
//             );

//             if (medicoResult.rows.length === 0) {
//                 // Se é um médico mas não tem registro na tabela medicos, não tem pacientes
//                 return res.json([]); 
//             }

//             const medicoId = medicoResult.rows[0].id;

//             // Filtra a query usando o ID do médico (medico_responsavel_id referencia medicos.id)
//             query += ` AND p.medico_responsavel_id = $${paramIndex}`;
//             params.push(medicoId);
//             paramIndex++;
//         }

//         // 3. Adiciona paginação e ordenação
//         query += ` ORDER BY u.${orderBy} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
//         params.push(limit, offset);

//         const patients = await db.query(query, params);
//         res.json(patients.rows);
//     } catch (error) {
//         console.error('Erro em getAllPatients:', error);
//         res.status(500).json({ error: "Erro ao buscar pacientes" });
//     }
//   },

//   // GET /api/patients/:id
//   getPatientById: async (req, res) => {
//      try {
//         const patientId = req.params.id;

//         // Traz os dados do paciente e usuário
//         const patientResult = await db.query(
//             `SELECT p.*, u.id as usuario_id_fk, u.nome as nome_usuario, u.email as email_usuario, u.tipo_usuario
//              FROM pacientes p 
//              JOIN usuarios u ON p.usuario_id = u.id
//              WHERE p.id = $1 AND u.ativo = true`,
//             [patientId]
//         );
//         
//         if (!patientResult.rows.length) {
//             return res.status(404).json({ error: "Paciente não encontrado" });
//         }

//         const patient = patientResult.rows[0];

//         // 1. Verifica Permissão: próprio paciente, médico responsável ou admin
//         let isMedicoResponsavel = false;
//         
//         if (checkDoctor(req.user)) {
//             const medicoResult = await db.query(
//                 'SELECT id FROM medicos WHERE usuario_id = $1',
//                 [req.user.id]
//             );
//             
//             const medicoId = medicoResult.rows[0]?.id;
//             if (medicoId && patient.medico_responsavel_id === medicoId) {
//                 isMedicoResponsavel = true;
//             }
//         }

//         if (
//             !checkAdmin(req.user) &&
//             !isMedicoResponsavel &&
//             !(req.user.tipo_usuario === "paciente" && req.user.id === patient.usuario_id)
//         ) {
//             return res.status(403).json({ error: "Acesso negado" });
//         }

//         // 2. Busca dados adicionais
//         // Nota: A tabela 'historico_pacientes' foi renomeada para 'registros_dialise' em algumas partes, 
//         // mantendo a original aqui para a rota que busca histórico geral.
//         const history = await db.query(
//             `SELECT * FROM historico_pacientes WHERE paciente_id = $1 ORDER BY data DESC LIMIT 10`, 
//             [patientId]
//         );
//         const medications = await db.query(
//             `SELECT * FROM medicamentos WHERE paciente_id = $1 AND ativo = true`, 
//             [patientId]
//         );
//         const reminders = await db.query(
//             `SELECT * FROM lembretes WHERE paciente_id = $1 AND data_hora >= NOW()`, 
//             [patientId]
//         );

//         res.json({
//             // Inclui nome e email do usuário no retorno principal
//             id: patient.id,
//             nome: patient.nome_usuario,
//             email: patient.email_usuario,
//             usuario_id: patient.usuario_id,
//             ...patient, // Mantém todos os campos de 'pacientes'
//             history: history.rows,
//             medications: medications.rows,
//             reminders: reminders.rows
//         });
//       } catch (error) {
//         console.error('Erro em getPatientById:', error);
//         res.status(500).json({ error: "Erro ao buscar paciente" });
//       }
//   },

//   // POST /api/patients (admin/médico)
//   createPatient: async (req, res) => {
//     try {
//       // Verifica permissão
//       if (!checkDoctor(req.user) && !checkAdmin(req.user)) {
//         return res.status(403).json({ error: "Acesso negado" });
//       }

//       const { nome, email, senha, convenio, medico_id } = req.body;
//       
//       if (!nome || !email || !senha) {
//         return res.status(400).json({ error: "Dados obrigatórios ausentes" });
//       }

//       const hashedPassword = await bcrypt.hash(senha, 10);

//       // Cria usuário base
//       const newUser = await db.query(
//         "INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario) VALUES ($1, $2, $3, 'paciente') RETURNING id",
//         [nome, email, hashedPassword]
//       );

//       const usuario_id = newUser.rows[0].id;

//       // Cria registro paciente (medico_id é o ID da tabela 'medicos', não do usuário)
//       await db.query(
//         "INSERT INTO pacientes (usuario_id, convenio, medico_responsavel_id, ativo) VALUES ($1, $2, $3, true)",
//         [usuario_id, convenio, medico_id || null]
//       );

//       res.status(201).json({ message: "Paciente criado com sucesso", usuario_id });
//     } catch (error) {
//       console.error('Erro em createPatient:', error);
//       res.status(500).json({ error: "Erro ao criar paciente" });
//     }
//   },

//   // PUT /api/patients/:id
//   updatePatient: async (req, res) => {
//      try {
//         const patientId = req.params.id;

//         const patientResult = await db.query(`SELECT * FROM pacientes WHERE id = $1`, [patientId]);
//         
//         if (!patientResult.rows.length) {
//             return res.status(404).json({ error: "Paciente não encontrado" });
//         }

//         const patient = patientResult.rows[0];

//         // 1. Verifica Permissão: admin ou médico responsável
//         let isMedicoResponsavel = false;
//         
//         if (checkDoctor(req.user)) {
//             const medicoResult = await db.query(
//                 'SELECT id FROM medicos WHERE usuario_id = $1',
//                 [req.user.id]
//             );
//             
//             const medicoId = medicoResult.rows[0]?.id;
//             if (medicoId && patient.medico_responsavel_id === medicoId) {
//                 isMedicoResponsavel = true;
//             }
//         }

//         if (
//             !checkAdmin(req.user) &&
//             !isMedicoResponsavel
//         ) {
//             return res.status(403).json({ error: "Acesso negado" });
//         }

//         const { nome, email, convenio } = req.body;

//         // 2. Atualiza usuário (se nome ou email existirem)
//         if (nome || email) {
//             const updates = [];
//             const updateParams = [];
//             let pIndex = 1;

//             if (nome) { updates.push(`nome = $${pIndex}`); updateParams.push(nome); pIndex++; }
//             if (email) { updates.push(`email = $${pIndex}`); updateParams.push(email); pIndex++; }
//             
//             if (updates.length > 0) {
//                 await db.query(
//                     `UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${pIndex}`,
//                     [...updateParams, patient.usuario_id]
//                 );
//             }
//         }

//         // 3. Atualiza paciente
//         await db.query("UPDATE pacientes SET convenio = $1 WHERE id = $2", [convenio, patientId]);

//         res.json({ message: "Paciente atualizado com sucesso" });
//       } catch (error) {
//         console.error('Erro em updatePatient:', error);
//         res.status(500).json({ error: "Erro ao atualizar paciente" });
//       }
//   },

//   // GET /api/patients/:id/medical-data
//   getMedicalData: async (req, res) => {
//     try {
//       const patientId = req.params.id;

//       if (!checkDoctor(req.user) && !checkAdmin(req.user)) {
//         return res.status(403).json({ error: "Acesso negado" });
//       }

//       const medicalData = await db.query(
//         `SELECT * FROM dados_medicos WHERE paciente_id = $1`, 
//         [patientId]
//       );
//       const weightHistory = await db.query(
//         `SELECT data, peso FROM historico_medico WHERE paciente_id = $1 ORDER BY data`, 
//         [patientId]
//       );
//       const pressureHistory = await db.query(
//         `SELECT data, pressao FROM historico_medico WHERE paciente_id = $1 ORDER BY data`, 
//         [patientId]
//       );

//       res.json({
//         medicalData: medicalData.rows[0] || {},
//         weightHistory: weightHistory.rows,
//         pressureHistory: pressureHistory.rows
//       });
//     } catch (error) {
//       console.error('Erro em getMedicalData:', error);
//       res.status(500).json({ error: "Erro ao buscar dados médicos" });
//     }
//   },

//   // PUT /api/patients/:id/medical-data
//   updateMedicalData: async (req, res) => {
//     try {
//       const patientId = req.params.id;
//       
//       if (!checkDoctor(req.user) && !checkAdmin(req.user)) {
//         return res.status(403).json({ error: "Acesso negado" });
//       }

//       const { observacoes, medicacoes } = req.body;

//       // Atualiza observações (usando a tabela que existe)
//       await db.query(
//         "UPDATE pacientes SET observacoes_medicas = $1 WHERE id = $2", 
//         [observacoes, patientId]
//       );

//       // Atualiza medicações (desativa antigas e adiciona novas)
//       await db.query("UPDATE medicamentos SET ativo = false WHERE paciente_id = $1", [patientId]);
//       
//       for (const med of medicacoes) {
//         await db.query(
//           "INSERT INTO medicamentos (paciente_id, nome, dosagem, ativo) VALUES ($1, $2, $3, true)",
//           [patientId, med.nome, med.dose] 
//         );
//       }

//       res.json({ message: "Dados médicos atualizados com sucesso" });
//     } catch (error) {
//       console.error('Erro em updateMedicalData:', error);
//       res.status(500).json({ error: "Erro ao atualizar dados médicos" });
//     }
//   },

//   // GET /api/patients/:id/dialysis-history
//   getDialysisHistory: async (req, res) => {
//     try {
//       const patientId = req.params.id;

//       const patientResult = await db.query(`SELECT * FROM pacientes WHERE id = $1`, [patientId]);
//       
//       if (!patientResult.rows.length) {
//         return res.status(404).json({ error: "Paciente não encontrado" });
//       }

//       const patient = patientResult.rows[0];

//       // Permissão: próprio paciente, médico ou admin
//       let isMedicoResponsavel = false;
//         
//       if (checkDoctor(req.user)) {
//           const medicoResult = await db.query(
//               'SELECT id FROM medicos WHERE usuario_id = $1',
//               [req.user.id]
//           );
//           
//           const medicoId = medicoResult.rows[0]?.id;
//           if (medicoId && patient.medico_responsavel_id === medicoId) {
//               isMedicoResponsavel = true;
//           }
//       }

//       if (
//         req.user.tipo_usuario !== "admin" &&
//         !isMedicoResponsavel &&
//         !(req.user.tipo_usuario === "paciente" && req.user.id === patient.usuario_id)
//       ) {
//         return res.status(403).json({ error: "Acesso negado" });
//       }

//       // Busca histórico de diálise
//       const history = await db.query(
//         `SELECT * FROM registros_dialise WHERE paciente_id = $1 ORDER BY data_registro DESC`, 
//         [patientId]
//       );

//       res.json({ dialysisHistory: history.rows });
//     } catch (error) {
//       console.error('Erro ao buscar histórico de diálise:', error);
//       res.status(500).json({ error: "Erro ao buscar histórico de diálise" });
//     }
//   },

//   // PUT /api/patients/:id/assign-doctor
//   assignDoctor: async (req, res) => {
//     try {
//       if (!checkAdmin(req.user)) {
//         return res.status(403).json({ error: "Acesso negado" });
//       }

//       const patientId = req.params.id;
//       const { medico_id } = req.body;

//       // Atualiza o ID do médico responsável
//       await db.query(
//         "UPDATE pacientes SET medico_responsavel_id = $1 WHERE id = $2", 
//         [medico_id, patientId]
//       );

//       res.json({ message: "Médico responsável atualizado com sucesso" });
//     } catch (error) {
//       console.error('Erro ao atribuir médico:', error);
//       res.status(500).json({ error: "Erro ao atribuir médico" });
//     }
//   }
// };

// module.exports = patientController;