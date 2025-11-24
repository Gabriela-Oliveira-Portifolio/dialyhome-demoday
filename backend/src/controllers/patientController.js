const db = require('../config/database');
const { checkAdmin, checkDoctor } = require("../middleware/auth");

// ============= FUNÇÕES AUXILIARES =============
const helpers = {
  // Buscar paciente por ID
  async findPatient(patientId) {
    const result = await db.query(
      "SELECT * FROM pacientes WHERE id = $1 AND ativo = true", 
      [patientId]
    );
    return result.rows[0] || null;
  },

  // Buscar paciente_id a partir do usuario_id
  async findPatientIdByUserId(userId) {
    const result = await db.query(
      'SELECT id FROM pacientes WHERE usuario_id = $1',
      [userId]
    );
    return result.rows[0]?.id || null;
  },

  // Verificar se paciente existe
  validatePatientExists(patient, res) {
    if (!patient) {
      res.status(404).json({ error: "Paciente não encontrado" });
      return false;
    }
    return true;
  },

  // Verificar permissões de acesso
  checkAccess(user, patient, allowedTypes = ['admin', 'medico']) {
    if (user.tipo === 'admin') return true;
    if (allowedTypes.includes('medico') && 
        user.tipo === 'medico' && 
        patient.medico_id === user.id) return true;
    if (allowedTypes.includes('paciente') && 
        user.tipo === 'paciente' && 
        user.id === patient.usuario_id) return true;
    return false;
  },

  // Verificar se é médico ou admin
  checkDoctorOrAdmin(user, res) {
    if (!checkDoctor(user) && !checkAdmin(user)) {
      res.status(403).json({ error: "Acesso negado" });
      return false;
    }
    return true;
  },

  // Verificar se é admin
  checkAdminOnly(user, res) {
    if (!checkAdmin(user)) {
      res.status(403).json({ error: "Acesso negado" });
      return false;
    }
    return true;
  },

  // Tratamento de erro padrão
  handleError(res, error, message = "Erro ao processar requisição") {
    console.error(`${message}:`, error);
    res.status(500).json({ error: message });
  },

  // Calcular dias em tratamento
  calculateDaysSince(date) {
    if (!date) return null;
    const inicio = new Date(date);
    const hoje = new Date();
    return Math.floor((hoje - inicio) / (1000 * 60 * 60 * 24));
  },

  // Calcular tendência
  calculateTrend(recent, previous) {
    if (!recent || !previous) return 'stable';
    const diff = ((recent - previous) / previous) * 100;
    if (diff > 5) return 'up';
    if (diff < -5) return 'down';
    return 'stable';
  }
};

// ============= CONTROLLER =============
const patientController = {
  // Buscar perfil completo do paciente (próprio paciente)
  getProfile: async (req, res) => {
    try {
      const userId = req.user.id;
      
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
      const diasTratamento = helpers.calculateDaysSince(patient.data_inicio_tratamento);

      res.json({
        patient: {
          ...patient,
          dias_tratamento: diasTratamento
        }
      });
    } catch (error) {
      helpers.handleError(res, error, 'Erro ao buscar perfil do paciente');
    }
  },

  // Buscar estatísticas detalhadas
  getStats: async (req, res) => {
    try {
      const userId = req.user.id;
      const days = Number.parseInt(req.query.days) || 30;

      const pacienteId = await helpers.findPatientIdByUserId(userId);
      
      if (!pacienteId) {
        return res.status(404).json({ error: 'Paciente não encontrado' });
      }

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
        WHERE paciente_id = $1 AND sintomas is null
        AND data_registro >= CURRENT_DATE - INTERVAL '1 day' * $2`,
        [pacienteId, days]
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
        WHERE paciente_id = $1 AND sintomas is null
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
        WHERE paciente_id = $1 AND sintomas is null
          AND data_registro >= CURRENT_DATE - INTERVAL '14 days'
        GROUP BY period`,
        [pacienteId]
      );

      const statsData = stats.rows[0];
      const last = lastRecord.rows[0] || {};
      
      // Calcular tendências
      const recentTrends = trends.rows.find(t => t.period === 'recent') || {};
      const previousTrends = trends.rows.find(t => t.period === 'previous') || {};

      res.json({
        summary: {
          total_registros: Number.parseInt(statsData.total_registros) || 0,
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
            trend: helpers.calculateTrend(recentTrends.avg_sistolica, previousTrends.avg_sistolica)
          },
          pressao_diastolica: {
            value: statsData.media_diastolica ? Math.round(statsData.media_diastolica) : null,
            min: statsData.min_diastolica || null,
            max: statsData.max_diastolica || null,
            trend: helpers.calculateTrend(recentTrends.avg_diastolica, previousTrends.avg_diastolica)
          },
          uf_total: {
            value: statsData.media_uf ? (statsData.media_uf / 1000).toFixed(1) : null,
            trend: helpers.calculateTrend(recentTrends.avg_uf, previousTrends.avg_uf)
          },
          glicose: {
            value: statsData.media_glicose ? Math.round(statsData.media_glicose) : null,
            trend: helpers.calculateTrend(recentTrends.avg_glicose, previousTrends.avg_glicose)
          },
          tempo_permanencia: {
            value: statsData.media_tempo ? (statsData.media_tempo / 60).toFixed(1) : null
          }
        }
      });
    } catch (error) {
      helpers.handleError(res, error, 'Erro ao buscar estatísticas');
    }
  },

  // GET /api/patients (médicos/admin)
  getAllPatients: async (req, res) => {
    try {
      if (!helpers.checkDoctorOrAdmin(req.user, res)) return;

      const page = Number.parseInt(req.query.page) || 1;
      const limit = Number.parseInt(req.query.limit) || 20;
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
      helpers.handleError(res, error, "Erro ao buscar pacientes");
    }
  },

  // GET /api/patients/:id
  getPatientById: async (req, res) => {
    try {
      const patient = await helpers.findPatient(req.params.id);
      
      if (!helpers.validatePatientExists(patient, res)) return;

      // Verifica permissão: próprio paciente, médico responsável ou admin
      if (!helpers.checkAccess(req.user, patient, ['admin', 'medico', 'paciente'])) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      // Histórico recente, medicações e próximos lembretes
      const history = await db.query(
        "SELECT * FROM historico_pacientes WHERE paciente_id = $1 ORDER BY data DESC LIMIT 10", 
        [req.params.id]
      );
      const medications = await db.query(
        "SELECT * FROM medicacoes WHERE paciente_id = $1 AND ativo = true", 
        [req.params.id]
      );
      const reminders = await db.query(
        "SELECT * FROM lembretes WHERE paciente_id = $1 AND data >= NOW()", 
        [req.params.id]
      );

      res.json({
        ...patient,
        history: history.rows,
        medications: medications.rows,
        reminders: reminders.rows
      });
    } catch (error) {
      helpers.handleError(res, error, "Erro ao buscar paciente");
    }
  },

  // POST /api/patients (admin/médico)
  createPatient: async (req, res) => {
    try {
      if (!helpers.checkDoctorOrAdmin(req.user, res)) return;

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
      helpers.handleError(res, error, "Erro ao criar paciente");
    }
  },

  // PUT /api/patients/:id
  updatePatient: async (req, res) => {
    try {
      const patient = await helpers.findPatient(req.params.id);
      
      if (!helpers.validatePatientExists(patient, res)) return;

      // Permissão: admin ou médico responsável
      if (!helpers.checkAccess(req.user, patient, ['admin', 'medico'])) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const { nome, email, convenio } = req.body;

      // Atualiza usuário
      await db.query(
        "UPDATE usuarios SET nome = $1, email = $2 WHERE id = $3",
        [nome, email, patient.usuario_id]
      );

      // Atualiza paciente
      await db.query(
        "UPDATE pacientes SET convenio = $1 WHERE id = $2", 
        [convenio, req.params.id]
      );

      res.json({ message: "Paciente atualizado com sucesso" });
    } catch (error) {
      helpers.handleError(res, error, "Erro ao atualizar paciente");
    }
  },

  // GET /api/patients/:id/medical-data
  getMedicalData: async (req, res) => {
    try {
      if (!helpers.checkDoctorOrAdmin(req.user, res)) return;

      const medicalData = await db.query(
        "SELECT * FROM dados_medicos WHERE paciente_id = $1", 
        [req.params.id]
      );
      const weightHistory = await db.query(
        "SELECT data, peso FROM historico_medico WHERE paciente_id = $1 ORDER BY data", 
        [req.params.id]
      );
      const pressureHistory = await db.query(
        "SELECT data, pressao FROM historico_medico WHERE paciente_id = $1 ORDER BY data", 
        [req.params.id]
      );

      res.json({
        medicalData: medicalData.rows[0] || {},
        weightHistory: weightHistory.rows,
        pressureHistory: pressureHistory.rows
      });
    } catch (error) {
      helpers.handleError(res, error, "Erro ao buscar dados médicos");
    }
  },

  // PUT /api/patients/:id/medical-data
  updateMedicalData: async (req, res) => {
    try {
      if (!helpers.checkDoctorOrAdmin(req.user, res)) return;

      const { observacoes, medicacoes } = req.body;

      // Atualiza observações
      await db.query(
        "UPDATE dados_medicos SET observacoes = $1 WHERE paciente_id = $2", 
        [observacoes, req.params.id]
      );

      // Atualiza medicações (simples: desativa antigas e adiciona novas)
      await db.query(
        "UPDATE medicacoes SET ativo = false WHERE paciente_id = $1", 
        [req.params.id]
      );
      
      for (const med of medicacoes) {
        await db.query(
          "INSERT INTO medicacoes (paciente_id, nome, dose, ativo) VALUES ($1, $2, $3, true)",
          [req.params.id, med.nome, med.dose]
        );
      }

      res.json({ message: "Dados médicos atualizados com sucesso" });
    } catch (error) {
      helpers.handleError(res, error, "Erro ao atualizar dados médicos");
    }
  },

  // GET /api/patients/:id/dialysis-history
  getDialysisHistory: async (req, res) => {
    try {
      const patient = await helpers.findPatient(req.params.id);
      
      if (!helpers.validatePatientExists(patient, res)) return;

      // Permissão: próprio paciente, médico ou admin
      if (!helpers.checkAccess(req.user, patient, ['admin', 'medico', 'paciente'])) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const history = await db.query(
        "SELECT * FROM historico_dialise WHERE paciente_id = $1 ORDER BY data DESC", 
        [req.params.id]
      );

      res.json({ dialysisHistory: history.rows });
    } catch (error) {
      helpers.handleError(res, error, "Erro ao buscar histórico de diálise");
    }
  },

  // PUT /api/patients/:id/assign-doctor
  assignDoctor: async (req, res) => {
    try {
      if (!helpers.checkAdminOnly(req.user, res)) return;

      const { medico_id } = req.body;

      await db.query(
        "UPDATE pacientes SET medico_id = $1 WHERE id = $2", 
        [medico_id, req.params.id]
      );

      res.json({ message: "Médico responsável atualizado com sucesso" });
    } catch (error) {
      helpers.handleError(res, error, "Erro ao atribuir médico");
    }
  }
};

module.exports = patientController;