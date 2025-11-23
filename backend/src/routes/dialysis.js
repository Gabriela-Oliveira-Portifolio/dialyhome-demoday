const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const {
  createRecord,
  getRecords,
  getStats,
  getRecordById,
  updateRecord,
  deleteRecord
} = require('../controllers/dialysisController');

// Todas as rotas requerem autenticação e role de paciente
router.use(authenticateToken);
router.use(authorizeRole(['paciente']));

// POST /api/dialysis/records - Criar novo registro
router.post('/records', createRecord);

// GET /api/dialysis/records - Buscar registros do paciente
router.get('/records', getRecords);

// GET /api/dialysis/stats - Buscar estatísticas
router.get('/stats', getStats);

// GET /api/dialysis/records/:id - Buscar registro específico
router.get('/records/:id', getRecordById);

// PUT /api/dialysis/records/:id - Atualizar registro
router.put('/records/:id', updateRecord);

// DELETE /api/dialysis/records/:id - Deletar registro
router.delete('/records/:id', deleteRecord);

module.exports = router;

// PUT /api/users/profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const nome = req.body.nome ?? null;
    const email = req.body.email ?? null;
    const telefone = req.body.telefone ?? null;
    // Atualiza apenas a tabela usuarios (nome e email)
    await db.query(
      `UPDATE usuarios 
       SET nome = COALESCE($1, nome), 
           email = COALESCE($2, email) 
       WHERE id = $3`,
      [nome, email, userId]
    );

    // Atualiza tabela pacientes
    if (req.user.tipo_usuario === "paciente") {
      await db.query(
        `UPDATE pacientes 
         SET telefone = COALESCE($1, telefone) 
         WHERE usuario_id = $3`,
        [telefone, userId]
      );
    }

    let updated;
    if (req.user.tipo_usuario === "paciente") {
      updated = await db.query(
        `SELECT u.id, u.nome, u.email, p.telefone
         FROM usuarios u
         JOIN pacientes p ON p.usuario_id = u.id
         WHERE u.id = $1`,
        [userId]
      );
    } else if (req.user.tipo_usuario === "medico") {
      updated = await db.query(
        `SELECT u.id, u.nome, u.email, m.crm, m.telefone_contato
         FROM usuarios u
         JOIN medicos m ON m.usuario_id = u.id
         WHERE u.id = $1`,
        [userId]
      );
    }

    res.json({
      message: "Perfil atualizado com sucesso",
      user: updated.rows[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error.message);
    res.status(500).json({ error: "Erro ao atualizar perfil", details: error.message });
  }
};
