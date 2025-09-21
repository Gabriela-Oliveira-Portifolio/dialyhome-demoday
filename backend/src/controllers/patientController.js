const db = require('../config/database');
// patientController.js
const db = require("../config/db"); // conexão com o banco
const { checkAdmin, checkDoctor } = require("../middleware/auth"); // middleware para verificar permissões

const patientController = {

  // GET /api/patients (médicos/admin)
  getAllPatients: async (req, res) => {
    try {
      if (!checkDoctor(req.user) && !checkAdmin(req.user))
        return res.status(403).json({ error: "Acesso negado" });

      // Paginação e ordenação (query params)
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

      const patient = await db.query("SELECT * FROM pacientes WHERE id = $1 AND ativo = true", [patientId]);
      if (!patient.rows.length) return res.status(404).json({ error: "Paciente não encontrado" });

      // Verifica permissão: próprio paciente, médico responsável ou admin
      if (
        req.user.tipo !== "admin" &&
        !(req.user.tipo === "medico" && patient.rows[0].medico_id === req.user.id) &&
        !(req.user.tipo === "paciente" && req.user.id === patient.rows[0].usuario_id)
      ) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      // Histórico recente, medicações e próximos lembretes
      const history = await db.query("SELECT * FROM historico_pacientes WHERE paciente_id = $1 ORDER BY data DESC LIMIT 10", [patientId]);
      const medications = await db.query("SELECT * FROM medicacoes WHERE paciente_id = $1 AND ativo = true", [patientId]);
      const reminders = await db.query("SELECT * FROM lembretes WHERE paciente_id = $1 AND data >= NOW()", [patientId]);

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
      if (!checkDoctor(req.user) && !checkAdmin(req.user))
        return res.status(403).json({ error: "Acesso negado" });

      const { nome, email, senha, convenio, medico_id } = req.body;
      if (!nome || !email || !senha) return res.status(400).json({ error: "Dados obrigatórios ausentes" });

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

      // Aqui você poderia enviar email de boas-vindas
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
      if (!patient.rows.length) return res.status(404).json({ error: "Paciente não encontrado" });

      // Permissão: admin ou médico responsável
      if (
        !checkAdmin(req.user) &&
        !(req.user.tipo === "medico" && patient.rows[0].medico_id === req.user.id)
      ) return res.status(403).json({ error: "Acesso negado" });

      const { nome, email, convenio } = req.body;

      // Atualiza usuário
      await db.query("UPDATE usuarios SET nome = $1, email = $2 WHERE id = $3",
        [nome, email, patient.rows[0].usuario_id]);

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

      if (!checkDoctor(req.user) && !checkAdmin(req.user))
        return res.status(403).json({ error: "Acesso negado" });

      const medicalData = await db.query("SELECT * FROM dados_medicos WHERE paciente_id = $1", [patientId]);
      const weightHistory = await db.query("SELECT data, peso FROM historico_medico WHERE paciente_id = $1 ORDER BY data", [patientId]);
      const pressureHistory = await db.query("SELECT data, pressao FROM historico_medico WHERE paciente_id = $1 ORDER BY data", [patientId]);

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
      if (!checkDoctor(req.user) && !checkAdmin(req.user))
        return res.status(403).json({ error: "Acesso negado" });

      const { observacoes, medicacoes } = req.body;

      // Atualiza observações
      await db.query("UPDATE dados_medicos SET observacoes = $1 WHERE paciente_id = $2", [observacoes, patientId]);

      // Atualiza medicações (simples: desativa antigas e adiciona novas)
      await db.query("UPDATE medicacoes SET ativo = false WHERE paciente_id = $1", [patientId]);
      for (const med of medicacoes) {
        await db.query("INSERT INTO medicacoes (paciente_id, nome, dose, ativo) VALUES ($1, $2, $3, true)",
          [patientId, med.nome, med.dose]);
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

      // Permissão: próprio paciente, médico ou admin
      const patient = await db.query("SELECT * FROM pacientes WHERE id = $1", [patientId]);
      if (!patient.rows.length) return res.status(404).json({ error: "Paciente não encontrado" });

      if (
        req.user.tipo !== "admin" &&
        !(req.user.tipo === "medico" && patient.rows[0].medico_id === req.user.id) &&
        !(req.user.tipo === "paciente" && req.user.id === patient.rows[0].usuario_id)
      ) return res.status(403).json({ error: "Acesso negado" });

      const history = await db.query("SELECT * FROM historico_dialise WHERE paciente_id = $1 ORDER BY data DESC", [patientId]);

      res.json({ dialysisHistory: history.rows });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao buscar histórico de diálise" });
    }
  },

  // PUT /api/patients/:id/assign-doctor
  assignDoctor: async (req, res) => {
    try {
      if (!checkAdmin(req.user)) return res.status(403).json({ error: "Acesso negado" });

      const patientId = req.params.id;
      const { medico_id } = req.body;

      await db.query("UPDATE pacientes SET medico_id = $1 WHERE id = $2", [medico_id, patientId]);

      res.json({ message: "Médico responsável atualizado com sucesso" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao atribuir médico" });
    }
  }
};

module.exports = patientController;


// const createMedication = async (req, res) => {
//   try {
//     const { nome, dosagem, frequencia, horario_principal, observacoes } = req.body;
    
//     const patientResult = await db.query('SELECT id FROM pacientes WHERE usuario_id = $1', [req.user.id]);
//     if (patientResult.rows.length === 0) {
//       return res.status(404).json({ error: 'Paciente não encontrado' });
//     }

//     const paciente_id = patientResult.rows[0].id;

//     const result = await db.query(
//       'INSERT INTO medicamentos (paciente_id, nome, dosagem, frequencia, horario_principal, observacoes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
//       [paciente_id, nome, dosagem, frequencia, horario_principal, observacoes]
//     );

//     res.status(201).json({ 
//       message: 'Medicamento adicionado com sucesso', 
//       id: result.rows[0].id 
//     });
//   } catch (error) {
//     console.error('Erro ao adicionar medicamento:', error);
//     res.status(500).json({ error: 'Erro interno do servidor' });
//   }
// };

// const getMedications = async (req, res) => {
//   try {
//     const patientResult = await db.query('SELECT id FROM pacientes WHERE usuario_id = $1', [req.user.id]);
//     if (patientResult.rows.length === 0) {
//       return res.status(404).json({ error: 'Paciente não encontrado' });
//     }

//     const result = await db.query(
//       'SELECT * FROM medicamentos WHERE paciente_id = $1 AND ativo = true ORDER BY horario_principal',
//       [patientResult.rows[0].id]
//     );

//     res.json(result.rows);
//   } catch (error) {
//     console.error('Erro ao buscar medicamentos:', error);
//     res.status(500).json({ error: 'Erro interno do servidor' });
//   }
// };

// module.exports = { createMedication, getMedications };