const bcrypt = require("bcrypt");
const db = require('../config/database');

// api perfil usuario
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await db.query("SELECT * FROM usuarios WHERE id = $1", [userId]);

    if (!user.rows.length) return res.status(404).json({ error: "Usuário não encontrado" });

    let details = {};
    if (user.rows[0].tipo === "paciente" || user.rows[0].tipo_usuario === "paciente") {
      const paciente = await db.query("SELECT * FROM pacientes WHERE usuario_id = $1", [userId]);
      details = paciente.rows[0];
    } else if (user.rows[0].tipo === "medico" || user.rows[0].tipo_usuario === "medico") {
      const medico = await db.query("SELECT * FROM medicos WHERE usuario_id = $1", [userId]);
      details = medico.rows[0];
    }

    res.json({ ...user.rows[0], ...details });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar perfil" });
  }
};

// Funções auxiliares para updateProfile
const updateUsuariosTable = async (userId, nome, email) => {
  if (!nome && !email) return;
  
  await db.query(
    `UPDATE usuarios 
     SET nome = COALESCE($1, nome), 
         email = COALESCE($2, email),
         data_atualizacao = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [nome || null, email || null, userId]
  );
};

const buildPacientesUpdate = (data) => {
  const { cpf, telefone, endereco, peso_inicial, altura } = data;
  const updateFields = [];
  const updateValues = [];
  let paramIndex = 1;

  const fieldsMap = {
    cpf,
    telefone,
    endereco,
    peso_inicial: peso_inicial !== undefined ? parseFloat(peso_inicial) || null : undefined,
    altura: altura !== undefined ? parseFloat(altura) || null : undefined
  };

  for (const [field, value] of Object.entries(fieldsMap)) {
    if (value !== undefined) {
      updateFields.push(`${field} = $${paramIndex++}`);
      updateValues.push(value);
    }
  }


  return { updateFields, updateValues, paramIndex };
};

const updatePacientesTable = async (userId, data) => {
  const { updateFields, updateValues, paramIndex } = buildPacientesUpdate(data);
  
  if (updateFields.length === 0) return;

  updateValues.push(userId);
  const query = `UPDATE pacientes SET ${updateFields.join(', ')} WHERE usuario_id = $${paramIndex}`;
  
  
  await db.query(query, updateValues);
};

const getUpdatedProfile = async (userId, isPaciente) => {
  if (isPaciente) {
    return await db.query(
      `SELECT 
        u.id, 
        u.nome, 
        u.email, 
        p.cpf,
        p.telefone,
        p.endereco,
        p.peso_inicial,
        p.altura,
        p.data_nascimento
       FROM usuarios u
       JOIN pacientes p ON p.usuario_id = u.id
       WHERE u.id = $1`,
      [userId]
    );
  }
  
  return await db.query(
    `SELECT id, nome, email FROM usuarios WHERE id = $1`,
    [userId]
  );
};

// atualizar o perfil do usuario
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { nome, email } = req.body;
    const isPaciente = req.user.tipo_usuario === "paciente";

    await updateUsuariosTable(userId, nome, email);

    if (isPaciente) {
      await updatePacientesTable(userId, req.body);
    }

    const updated = await getUpdatedProfile(userId, isPaciente);

    res.json({
      message: "Perfil atualizado com sucesso",
      user: updated.rows[0],
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar perfil:", error.message);
    res.status(500).json({ error: "Erro ao atualizar perfil", details: error.message });
  }
};

// mudar senha
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Validações
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Senha atual e nova senha são obrigatórias" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "A nova senha deve ter no mínimo 6 caracteres" });
    }

    // Busca senha atual do usuário
    const user = await db.query("SELECT senha_hash FROM usuarios WHERE id = $1", [userId]);
    if (!user.rows.length) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    // Verifica se a senha atual está correta
    const match = await bcrypt.compare(currentPassword, user.rows[0].senha_hash);
    if (!match) {
      return res.status(400).json({ error: "Senha atual incorreta" });
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Atualiza senha
    await db.query(
      "UPDATE usuarios SET senha_hash = $1, data_atualizacao = CURRENT_TIMESTAMP WHERE id = $2",
      [hashedPassword, userId]
    );

    res.json({ message: "Senha alterada com sucesso" });
  } catch (error) {
    console.error("❌ Erro ao alterar senha:", error);
    res.status(500).json({ error: "Erro ao alterar senha" });
  }
};

// pesquisa de usuarios
const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await db.query("SELECT * FROM usuarios WHERE id = $1", [userId]);

    if (!user.rows.length) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json(user.rows[0]);
  } catch (error) {
    console.error("Erro ao buscar usuário:", error.message);
    res.status(500).json({ error: "Erro ao buscar usuário", details: error.message });
  }
};

// alterar ativo ou inativo usuario
const toggleUserStatus = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    if (req.user.tipo_usuario !== 'admin') {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const userId = Number.parseInt(req.params.id);
    
    if (Number.isNaN(userId)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ error: "Você não pode desativar sua própria conta" });
    }

    const user = await db.query("SELECT ativo FROM usuarios WHERE id = $1", [userId]);
    
    if (!user.rows.length) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const currentStatus = user.rows[0].ativo;
    const newStatus = !currentStatus;
    
    await db.query("UPDATE usuarios SET ativo = $1 WHERE id = $2", [newStatus, userId]);

    res.json({ 
      message: `Usuário ${newStatus ? "ativado" : "desativado"} com sucesso`,
      ativo: newStatus
    });
  } catch (error) {
    console.error("Erro ao alterar status:", error);
    res.status(500).json({ error: "Erro ao alterar status do usuário" });
  }
};

// Deletar um usuário
const deleteUser = async (req, res) => {
  try {
    if (req.user.tipo_usuario !== 'admin') {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const userId = req.params.id;
    
    // anonimização de dados
    await db.query(
      `UPDATE usuarios 
       SET ativo = false,
           email = CONCAT('deleted_', id, '@anonimizado.com'),
           nome = 'Usuário Removido',
           data_atualizacao = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [userId]
    );

    res.json({ message: "Usuário removido e dados anonimizados com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar usuário:", error);
    res.status(500).json({ error: "Erro ao deletar usuário" });
  }
};

module.exports = { 
  getProfile, 
  updateProfile, 
  changePassword, 
  getUserById, 
  toggleUserStatus, 
  deleteUser 
};