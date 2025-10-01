const express = require('express');
const { createDialysisRecord, getDialysisHistory } = require('../controllers/dialysisController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const db = require('../config/database');
const router = express.Router();

router.post('/', authenticateToken, authorizeRole(['paciente']), createDialysisRecord);
router.get('/history', authenticateToken, authorizeRole(['paciente']), getDialysisHistory);

module.exports = router;
// // PUT /api/users/profile
// const updateProfile = async (req, res) => {
//       try {
//       const userId = req.user.id;
//       const { nome, email, telefone, endereco } = req.body;
//       // Atualiza tabela usuarios
//       await db.query(
//           "UPDATE usuarios SET nome = $1, email = $2, telefone = $3 WHERE id = $4",
//           [nome, email, telefone, userId]
//       );
//       // Atualiza tabela específica
//       if (req.user.tipo === "paciente") {
//           const { convenio } = req.body;
//           await db.query("UPDATE pacientes SET convenio = $1 WHERE usuario_id = $2", [convenio, userId]);
//       } else if (req.user.tipo === "medico") {
//           const { crm } = req.body;
//           await db.query("UPDATE medicos SET crm = $1 WHERE usuario_id = $2", [crm, userId]);
//       }
//       // Retorna dados atualizados
//       const updated = await db.query("SELECT * FROM usuarios WHERE id = $1", [userId]);
//       res.json(updated.rows[0]);
//       } catch (error) {
//       console.error(error);
//       res.status(500).json({ error: "Erro ao atualizar perfil" });
//       }
// };
// PUT /api/users/profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    // const { nome, email, telefone } = req.body;
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

    // // Se no futuro for médico, você ajusta aqui com os campos de médico
    // if (req.user.tipo_usuario === "medico") {
    //   const { crm, telefone_contato } = req.body;
    //   await db.query(
    //     `UPDATE medicos 
    //      SET crm = COALESCE($1, crm),
    //          telefone_contato = COALESCE($2, telefone_contato)
    //      WHERE usuario_id = $3`,
    //     [crm, telefone_contato, userId]
    //   );
    // }
    // Retorna perfil atualizado (já juntando usuários + tabela específica)
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
