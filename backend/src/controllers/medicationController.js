// const db = require('../config/database');

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



const db = require('../config/database');

// Função utilitária para buscar o ID do paciente logado
const getPacienteId = async (userId, res) => {
  const patientResult = await db.query(
    'SELECT id FROM pacientes WHERE usuario_id = $1',
    [userId]
  );

  if (patientResult.rows.length === 0) {
    res.status(404).json({ error: 'Paciente não encontrado' });
    return null;
  }

  return patientResult.rows[0].id;
};

const createMedication = async (req, res) => {
  try {
    const { nome, dosagem, frequencia, horario_principal, observacoes } = req.body;
    const paciente_id = await getPacienteId(req.user.id, res);
    if (!paciente_id) return;

    const result = await db.query(
      `INSERT INTO medicamentos 
        (paciente_id, nome, dosagem, frequencia, horario_principal, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [paciente_id, nome, dosagem, frequencia, horario_principal, observacoes]
    );

    res.status(201).json({
      message: 'Medicamento adicionado com sucesso',
      id: result.rows[0].id
    });
  } catch (error) {
    console.error('Erro ao adicionar medicamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const getMedications = async (req, res) => {
  try {
    const paciente_id = await getPacienteId(req.user.id, res);
    if (!paciente_id) return;

    const result = await db.query(
      `SELECT * 
       FROM medicamentos 
       WHERE paciente_id = $1 AND ativo = true 
       ORDER BY horario_principal`,
      [paciente_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar medicamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = { createMedication, getMedications };
