
const bcrypt = require("bcrypt");
const db = require('../config/database');
const {checkAdmin } = require("../middleware/auth");

// GET /api/users/profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await db.query("SELECT * FROM usuarios WHERE id = $1", [userId]);

    if (!user.rows.length) return res.status(404).json({ error: "Usuário não encontrado" });

    // Se tiver tabelas específicas para paciente/medico
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

// PUT /api/users/profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { nome, email, telefone, cpf, endereco, peso_inicial, altura } = req.body;

    console.log('📝 Atualizando perfil para usuário:', userId);
    console.log('📦 Dados recebidos:', req.body);

    // Atualiza apenas a tabela usuarios (nome e email, se fornecidos)
    if (nome || email) {
      await db.query(
        `UPDATE usuarios 
         SET nome = COALESCE($1, nome), 
             email = COALESCE($2, email),
             data_atualizacao = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [nome || null, email || null, userId]
      );
      console.log('✅ Tabela usuarios atualizada');
    }

    // Atualiza tabela pacientes (todos os campos permitidos)
    if (req.user.tipo_usuario === "paciente") {
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      // Adiciona campos dinamicamente apenas se foram fornecidos
      if (cpf !== undefined) {
        updateFields.push(`cpf = $${paramIndex++}`);
        updateValues.push(cpf);
      }
      if (telefone !== undefined) {
        updateFields.push(`telefone = $${paramIndex++}`);
        updateValues.push(telefone);
      }
      if (endereco !== undefined) {
        updateFields.push(`endereco = $${paramIndex++}`);
        updateValues.push(endereco);
      }
      if (peso_inicial !== undefined) {
        updateFields.push(`peso_inicial = $${paramIndex++}`);
        updateValues.push(parseFloat(peso_inicial) || null);
      }
      if (altura !== undefined) {
        updateFields.push(`altura = $${paramIndex++}`);
        updateValues.push(parseFloat(altura) || null);
      }

      // Se houver campos para atualizar
      if (updateFields.length > 0) {
        updateValues.push(userId);
        const query = `UPDATE pacientes SET ${updateFields.join(', ')} WHERE usuario_id = $${paramIndex}`;
        
        console.log('🔄 Query de atualização:', query);
        console.log('🔄 Valores:', updateValues);
        
        await db.query(query, updateValues);
        console.log('✅ Tabela pacientes atualizada');
      }
    }

    // Retorna perfil atualizado completo
    let updated;
    if (req.user.tipo_usuario === "paciente") {
      updated = await db.query(
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
    } else {
      updated = await db.query(
        `SELECT id, nome, email FROM usuarios WHERE id = $1`,
        [userId]
      );
    }

    console.log('✅ Perfil atualizado com sucesso');

    res.json({
      message: "Perfil atualizado com sucesso",
      user: updated.rows[0],
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar perfil:", error.message);
    res.status(500).json({ error: "Erro ao atualizar perfil", details: error.message });
  }
};

// PUT /api/users/change-password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    console.log('🔐 Alterando senha para usuário:', userId);

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

    console.log('✅ Senha alterada com sucesso');

    res.json({ message: "Senha alterada com sucesso" });
  } catch (error) {
    console.error("❌ Erro ao alterar senha:", error);
    res.status(500).json({ error: "Erro ao alterar senha" });
  }
};

// GET /api/users/:id (admin only)
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

// PUT /api/users/:id/toggle-status (admin only)
const toggleUserStatus = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    if (req.user.tipo_usuario !== 'admin') {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
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

// DELETE /api/users/:id (admin only)
const deleteUser = async (req, res) => {
  try {
    if (req.user.tipo_usuario !== 'admin') {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const userId = req.params.id;
    
    // Soft delete com anonimização
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


// // userController.js
// const bcrypt = require("bcrypt");
// const db = require('../config/database');
// const {checkAdmin } = require("../middleware/auth"); // middleware para verificar admin
//   // GET /api/users/profile
//     const  getProfile =  async (req, res) => {
//         try {
//         const userId = req.user.id; // Assume que o middleware JWT colocou req.user
//         const user = await db.query("SELECT * FROM usuarios WHERE id = $1", [userId]);

//         if (!user.rows.length) return res.status(404).json({ error: "Usuário não encontrado" });

//         // Se tiver tabelas específicas para paciente/medico
//         let details = {};
//         if (user.rows[0].tipo === "paciente") {
//             const paciente = await db.query("SELECT * FROM pacientes WHERE usuario_id = $1", [userId]);
//             details = paciente.rows[0];
//         } else if (user.rows[0].tipo === "medico") {
//             const medico = await db.query("SELECT * FROM medicos WHERE usuario_id = $1", [userId]);
//             details = medico.rows[0];
//         }

//         res.json({ ...user.rows[0], ...details });
//         } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: "Erro ao buscar perfil" });
//         }
//   };

//   // // PUT /api/users/profile
//   // const updateProfile = async (req, res) => {
//   //       try {
//   //       const userId = req.user.id;
//   //       const { nome, email, telefone, endereco } = req.body;

//   //       // Atualiza tabela usuarios
//   //       await db.query(
//   //           "UPDATE usuarios SET nome = $1, email = $2, telefone = $3 WHERE id = $4",
//   //           [nome, email, telefone, userId]
//   //       );

//   //       // Atualiza tabela específica
//   //       if (req.user.tipo === "paciente") {
//   //           const { convenio } = req.body;
//   //           await db.query("UPDATE pacientes SET convenio = $1 WHERE usuario_id = $2", [convenio, userId]);
//   //       } else if (req.user.tipo === "medico") {
//   //           const { crm } = req.body;
//   //           await db.query("UPDATE medicos SET crm = $1 WHERE usuario_id = $2", [crm, userId]);
//   //       }

//   //       // Retorna dados atualizados
//   //       const updated = await db.query("SELECT * FROM usuarios WHERE id = $1", [userId]);
//   //       res.json(updated.rows[0]);
//   //       } catch (error) {
//   //       console.error(error);
//   //       res.status(500).json({ error: "Erro ao atualizar perfil" });
//   //       }
//   // };
// // PUT /api/users/profile
// const updateProfile = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const nome = req.body.nome ?? null;
//     const email = req.body.email ?? null;
//     const telefone = req.body.telefone ?? null;
//     // Atualiza apenas a tabela usuarios (nome e email)
//     await db.query(
//       `UPDATE usuarios 
//        SET nome = COALESCE($1, nome), 
//            email = COALESCE($2, email) 
//        WHERE id = $3`,
//       [nome, email, userId]
//     );

//     // Atualiza tabela pacientes
//       if (req.user.tipo_usuario === "paciente") {
//         await db.query(
//           `UPDATE pacientes 
//           SET telefone = COALESCE($1, telefone) 
//           WHERE usuario_id = $2`,   // <-- aqui
//           [telefone, userId]         // dois parâmetros
//         );
//       }


//     // Retorna perfil atualizado (já juntando usuários + tabela específica)
//     let updated;
//     if (req.user.tipo_usuario === "paciente") {
//       updated = await db.query(
//         `SELECT u.id, u.nome, u.email, p.telefone
//          FROM usuarios u
//          JOIN pacientes p ON p.usuario_id = u.id
//          WHERE u.id = $1`,
//         [userId]
//       );
//     }

//     res.json({
//       message: "Perfil atualizado com sucesso",
//       user: updated.rows[0],
//     });
//   } catch (error) {
//     console.error("Erro ao atualizar perfil:", error.message);
//     res.status(500).json({ error: "Erro ao atualizar perfil", details: error.message });
//   }
// };

//   // PUT /api/users/change-password
//   const changePassword = async (req, res) => {
//     try {
//       const userId = req.user.id;
//       const { currentPassword, newPassword } = req.body;

//       const user = await db.query("SELECT senha FROM usuarios WHERE id = $1", [userId]);
//       if (!user.rows.length) return res.status(404).json({ error: "Usuário não encontrado" });

//       const match = await bcrypt.compare(currentPassword, user.rows[0].senha);
//       if (!match) return res.status(400).json({ error: "Senha atual incorreta" });

//       const hashedPassword = await bcrypt.hash(newPassword, 10);
//       await db.query("UPDATE usuarios SET senha = $1 WHERE id = $2", [hashedPassword, userId]);

//       res.json({ message: "Senha alterada com sucesso" });
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ error: "Erro ao alterar senha" });
//     }
//   };

// // // GET /api/users/:id (admin only)
//   const getUserById = async (req, res) => {
//   try {
//     const userId = req.params.id;
//     const user = await db.query("SELECT * FROM usuarios WHERE id = $1", [userId]);

//     if (!user.rows.length) return res.status(404).json({ error: "Usuário não encontrado" });

//     res.json(user.rows[0]);
//   } catch (error) {
//     console.error("Erro ao buscar usuário:", error.message);
//     res.status(500).json({ error: "Erro ao buscar usuário", details: error.message });
//   }
// };

// // PUT /api/users/:id/toggle-status (admin only)
// const toggleUserStatus = async (req, res) => {
//   try {
//     // Verifica se o usuário está autenticado
//     if (!req.user) {
//       return res.status(401).json({ error: "Não autenticado" });
//     }

//     // Verifica se é admin
//     if (req.user.tipo_usuario !== 'admin') {
//       return res.status(403).json({ error: "Acesso negado" });
//     }

//     const userId = parseInt(req.params.id);
    
//     // Valida se o ID é válido
//     if (isNaN(userId)) {
//       return res.status(400).json({ error: "ID inválido" });
//     }

//     // Impede que o admin desative a si mesmo
//     if (userId === req.user.id) {
//       return res.status(400).json({ error: "Você não pode desativar sua própria conta" });
//     }

//     const user = await db.query("SELECT ativo FROM usuarios WHERE id = $1", [userId]);
    
//     if (!user.rows.length) {
//       return res.status(404).json({ error: "Usuário não encontrado" });
//     }

//     // Garante conversão correta do boolean
//     const currentStatus = user.rows[0].ativo;
//     const newStatus = !currentStatus;
    
//     await db.query("UPDATE usuarios SET ativo = $1 WHERE id = $2", [newStatus, userId]);

//     res.json({ 
//       message: `Usuário ${newStatus ? "ativado" : "desativado"} com sucesso`,
//       ativo: newStatus
//     });
//   } catch (error) {
//     console.error("Erro ao alterar status:", error);
//     res.status(500).json({ error: "Erro ao alterar status do usuário" });
//   }
// };

//   // // PUT /api/users/:id/toggle-status (admin only)
//   // const toggleUserStatus = async (req, res) => {
//   //   try {
//   //     if (!checkAdmin(req.user)) return res.status(403).json({ error: "Acesso negado" });

//   //     const userId = req.params.id;
//   //     const user = await db.query("SELECT ativo FROM usuarios WHERE id = $1", [userId]);
//   //     if (!user.rows.length) return res.status(404).json({ error: "Usuário não encontrado" });

//   //     const newStatus = !user.rows[0].ativo;
//   //     await db.query("UPDATE usuarios SET ativo = $1 WHERE id = $2", [newStatus, userId]);

//   //     res.json({ message: `Usuário ${newStatus ? "ativado" : "desativado"} com sucesso` });
//   //   } catch (error) {
//   //     console.error(error);
//   //     res.status(500).json({ error: "Erro ao alterar status do usuário" });
//   //   }
//   // };

//   // DELETE /api/users/:id (admin only)
//   const deleteUser =  async (req, res) => {
//     try {
//       // if (!checkAdmin(req.user)) return res.status(403).json({ error: "Acesso negado" });
//       // Verifica se é admin
//           if (req.user.tipo_usuario !== 'admin') {
//             return res.status(403).json({ error: "Acesso negado" });
//           }
//       const userId = req.params.id;
//       // Soft delete
//         // Soft delete com anonimização
//     await db.query(
//       `UPDATE usuarios 
//        SET ativo = false,
//            email = CONCAT('deleted_', id, '@anonimizado.com'),
//            nome = 'Usuário Removido',
//            data_atualizacao = CURRENT_TIMESTAMP 
//        WHERE id = $1`,
//       [userId]
//     );

//     res.json({ message: "Usuário removido e dados anonimizados com sucesso" });
//   } catch (error) {
//     console.error("Erro ao deletar usuário:", error);
//     res.status(500).json({ error: "Erro ao deletar usuário" });
//   }
// };

// module.exports = { getProfile, updateProfile, changePassword, getUserById, toggleUserStatus, deleteUser };