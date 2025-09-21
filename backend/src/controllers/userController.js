// userController.js
const bcrypt = require("bcrypt");
const db = require('../config/database');
const { checkAdmin } = require("../middleware/auth"); // middleware para verificar admin
  // GET /api/users/profile
    const  getProfile =  async (req, res) => {
        try {
        const userId = req.user.id; // Assume que o middleware JWT colocou req.user
        const user = await db.query("SELECT * FROM usuarios WHERE id = $1", [userId]);

        if (!user.rows.length) return res.status(404).json({ error: "Usuário não encontrado" });

        // Se tiver tabelas específicas para paciente/medico
        let details = {};
        if (user.rows[0].tipo === "paciente") {
            const paciente = await db.query("SELECT * FROM pacientes WHERE usuario_id = $1", [userId]);
            details = paciente.rows[0];
        } else if (user.rows[0].tipo === "medico") {
            const medico = await db.query("SELECT * FROM medicos WHERE usuario_id = $1", [userId]);
            details = medico.rows[0];
        }

        res.json({ ...user.rows[0], ...details });
        } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao buscar perfil" });
        }
  };

  // PUT /api/users/profile
  const updateProfile = async (req, res) => {
        try {
        const userId = req.user.id;
        const { nome, email, telefone, endereco } = req.body;

        // Atualiza tabela usuarios
        await db.query(
            "UPDATE usuarios SET nome = $1, email = $2, telefone = $3 WHERE id = $4",
            [nome, email, telefone, userId]
        );

        // Atualiza tabela específica
        if (req.user.tipo === "paciente") {
            const { convenio } = req.body;
            await db.query("UPDATE pacientes SET convenio = $1 WHERE usuario_id = $2", [convenio, userId]);
        } else if (req.user.tipo === "medico") {
            const { crm } = req.body;
            await db.query("UPDATE medicos SET crm = $1 WHERE usuario_id = $2", [crm, userId]);
        }

        // Retorna dados atualizados
        const updated = await db.query("SELECT * FROM usuarios WHERE id = $1", [userId]);
        res.json(updated.rows[0]);
        } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao atualizar perfil" });
        }
  };

  // PUT /api/users/change-password
  const changePassword = async (req, res) => {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      const user = await db.query("SELECT senha FROM usuarios WHERE id = $1", [userId]);
      if (!user.rows.length) return res.status(404).json({ error: "Usuário não encontrado" });

      const match = await bcrypt.compare(currentPassword, user.rows[0].senha);
      if (!match) return res.status(400).json({ error: "Senha atual incorreta" });

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.query("UPDATE usuarios SET senha = $1 WHERE id = $2", [hashedPassword, userId]);

      res.json({ message: "Senha alterada com sucesso" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao alterar senha" });
    }
  };

  // GET /api/users/:id (admin only)
  const getUserById = async (req, res) => {
    try {
      if (!checkAdmin(req.user)) return res.status(403).json({ error: "Acesso negado" });

      const userId = req.params.id;
      const user = await db.query("SELECT * FROM usuarios WHERE id = $1", [userId]);
      if (!user.rows.length) return res.status(404).json({ error: "Usuário não encontrado" });

      res.json(user.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao buscar usuário" });
    }
  };

  // PUT /api/users/:id/toggle-status (admin only)
  const toggleUserStatus = async (req, res) => {
    try {
      if (!checkAdmin(req.user)) return res.status(403).json({ error: "Acesso negado" });

      const userId = req.params.id;
      const user = await db.query("SELECT ativo FROM usuarios WHERE id = $1", [userId]);
      if (!user.rows.length) return res.status(404).json({ error: "Usuário não encontrado" });

      const newStatus = !user.rows[0].ativo;
      await db.query("UPDATE usuarios SET ativo = $1 WHERE id = $2", [newStatus, userId]);

      res.json({ message: `Usuário ${newStatus ? "ativado" : "desativado"} com sucesso` });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao alterar status do usuário" });
    }
  };

  // DELETE /api/users/:id (admin only)
  const deleteUser =  async (req, res) => {
    try {
      if (!checkAdmin(req.user)) return res.status(403).json({ error: "Acesso negado" });

      const userId = req.params.id;
      // Soft delete
      await db.query("UPDATE usuarios SET ativo = false, email = NULL, senha = NULL WHERE id = $1", [userId]);

      res.json({ message: "Usuário removido (soft delete) com sucesso" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao deletar usuário" });
    }
  };

module.exports = { getProfile, updateProfile, changePassword, getUserById, toggleUserStatus, deleteUser };