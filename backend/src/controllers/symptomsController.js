const db = require('../config/database');

const symptomsController = {
  // Buscar sintomas pré-definidos
  getPredefinedSymptoms: async (req, res) => {
    try {
      const result = await db.query(
        `SELECT 
          id,
          nome,
          categoria,
          severidade_padrao
        FROM sintomas_predefinidos
        ORDER BY categoria, nome`
      );

      // Agrupar por categoria
      const grouped = result.rows.reduce((acc, symptom) => {
        const categoria = symptom.categoria || 'Outros';
        if (!acc[categoria]) {
          acc[categoria] = [];
        }
        acc[categoria].push(symptom);
        return acc;
      }, {});

      res.json({ 
        symptoms: result.rows,
        grouped: grouped
      });
    } catch (error) {
      console.error('Erro ao buscar sintomas:', error);
      res.status(500).json({ error: 'Erro ao buscar sintomas' });
    }
  },

  // Registrar sintomas para um registro de diálise
  registerSymptoms: async (req, res) => {
    try {
      const userId = req.user.id;
      const { registro_dialise_id, sintomas } = req.body;

      // Validações
      if (!registro_dialise_id || !sintomas || sintomas.length === 0) {
        return res.status(400).json({ 
          error: 'ID do registro de diálise e sintomas são obrigatórios' 
        });
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

      // Verificar se o registro de diálise pertence ao paciente
      const dialysisCheck = await db.query(
        'SELECT id FROM registros_dialise WHERE id = $1 AND paciente_id = $2',
        [registro_dialise_id, pacienteId]
      );

      if (dialysisCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Registro de diálise não encontrado' });
      }

      // Deletar sintomas anteriores deste registro
      await db.query(
        'DELETE FROM registro_sintomas WHERE registro_dialise_id = $1',
        [registro_dialise_id]
      );

      // Inserir novos sintomas
      const insertedSymptoms = [];
      for (const sintoma of sintomas) {
        const result = await db.query(
          `INSERT INTO registro_sintomas (
            registro_dialise_id,
            sintoma_id,
            severidade,
            observacoes
          ) VALUES ($1, $2, $3, $4)
          RETURNING *`,
          [
            registro_dialise_id,
            sintoma.sintoma_id,
            sintoma.severidade || 'leve',
            sintoma.observacoes || null
          ]
        );
        insertedSymptoms.push(result.rows[0]);
      }

      res.status(201).json({
        message: 'Sintomas registrados com sucesso',
        symptoms: insertedSymptoms
      });
    } catch (error) {
      console.error('Erro ao registrar sintomas:', error);
      res.status(500).json({ error: 'Erro ao registrar sintomas' });
    }
  },

  // Registrar sintoma sem vínculo com registro de diálise (sintoma isolado)
  registerIsolatedSymptom: async (req, res) => {
    try {
      const userId = req.user.id;
      const { sintomas } = req.body;

      if (!sintomas || sintomas.length === 0) {
        return res.status(400).json({ error: 'Sintomas são obrigatórios' });
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

      // Criar um registro de diálise "sintoma isolado" apenas com sintomas
      const dialysisRecord = await db.query(
        `INSERT INTO registros_dialise (
          paciente_id,
          data_registro,
          sintomas
        ) VALUES ($1, CURRENT_DATE, $2)
        RETURNING id`,
        [pacienteId, 'Registro de sintomas']
      );

      const registroDialiseId = dialysisRecord.rows[0].id;

      // Inserir sintomas
      const insertedSymptoms = [];
      for (const sintoma of sintomas) {
        const result = await db.query(
          `INSERT INTO registro_sintomas (
            registro_dialise_id,
            sintoma_id,
            severidade,
            observacoes
          ) VALUES ($1, $2, $3, $4)
          RETURNING *`,
          [
            registroDialiseId,
            sintoma.sintoma_id,
            sintoma.severidade || 'leve',
            sintoma.observacoes || null
          ]
        );
        insertedSymptoms.push(result.rows[0]);
      }

      res.status(201).json({
        message: 'Sintomas registrados com sucesso',
        registro_id: registroDialiseId,
        symptoms: insertedSymptoms
      });
    } catch (error) {
      console.error('Erro ao registrar sintoma isolado:', error);
      res.status(500).json({ error: 'Erro ao registrar sintoma isolado' });
    }
  },

  // Buscar sintomas de um registro específico
  getSymptomsByRecord: async (req, res) => {
    try {
      const userId = req.user.id;
      const registroId = req.params.registroId;

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
          rs.id,
          rs.severidade,
          rs.observacoes,
          sp.nome as sintoma_nome,
          sp.categoria,
          sp.severidade_padrao
        FROM registro_sintomas rs
        JOIN sintomas_predefinidos sp ON rs.sintoma_id = sp.id
        JOIN registros_dialise rd ON rs.registro_dialise_id = rd.id
        WHERE rd.id = $1 AND rd.paciente_id = $2`,
        [registroId, pacienteId]
      );

      res.json({ symptoms: result.rows });
    } catch (error) {
      console.error('Erro ao buscar sintomas do registro:', error);
      res.status(500).json({ error: 'Erro ao buscar sintomas' });
    }
  },

  // Buscar histórico de sintomas do paciente
  getSymptomsHistory: async (req, res) => {
    try {
      const userId = req.user.id;
      const { limit = 20, offset = 0 } = req.query;

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
          rd.id as registro_id,
          rd.data_registro,
          rs.id as sintoma_registro_id,
          rs.severidade,
          rs.observacoes,
          sp.nome as sintoma_nome,
          sp.categoria
        FROM registro_sintomas rs
        JOIN sintomas_predefinidos sp ON rs.sintoma_id = sp.id
        JOIN registros_dialise rd ON rs.registro_dialise_id = rd.id
        WHERE rd.paciente_id = $1
        ORDER BY rd.data_registro DESC, rs.id DESC
        LIMIT $2 OFFSET $3`,
        [pacienteId, limit, offset]
      );

      res.json({ 
        symptoms: result.rows,
        total: result.rows.length
      });
    } catch (error) {
      console.error('Erro ao buscar histórico de sintomas:', error);
      res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
  }
};

module.exports = symptomsController;