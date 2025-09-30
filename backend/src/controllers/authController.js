const AuthService = require('../services/AuthService');

// Registro
const register = async (req, res) => {
  try {
    const user = await AuthService.createUser(req.body);
    res.status(201).json({ message: "Usuário criado com sucesso", user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, senha } = req.body;
    const user = await AuthService.authenticateUser(email, senha);

    const accessToken = AuthService.generateToken(user.id, user.tipo_usuario, 'access');
    const refreshToken = AuthService.generateToken(user.id, user.tipo_usuario, 'refresh');

    res.json({ accessToken, refreshToken, user });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(400).json({ error: "Token não fornecido" });

    AuthService.logoutUser(token);
    res.json({ message: "Logout realizado com sucesso" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Refresh
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "Refresh token não fornecido" });

    const tokens = await AuthService.refreshAccessToken(refreshToken);
    res.json(tokens);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

module.exports = { register, login, logout, refreshToken };



// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const db = require('../config/database');

// const blacklistedTokens = [];

// const register = async (req, res) => {
//   try {
//     const { nome, email, senha, tipo_usuario, ...additionalData } = req.body;
    
//     // Verificar se usuário já existe
//     const existingUser = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
//     if (existingUser.rows.length > 0) {
//       return res.status(400).json({ error: 'Usuário já existe' });
//     }

//     // Hash da senha
//     const hashedPassword = await bcrypt.hash(senha, 10);

//     // Inserir usuário
//     const userResult = await db.query(
//       'INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario) VALUES ($1, $2, $3, $4) RETURNING id',
//       [nome, email, hashedPassword, tipo_usuario]
//     );

//     const userId = userResult.rows[0].id;

//     // Inserir dados específicos baseado no tipo de usuário
//     if (tipo_usuario === 'paciente') {
//       await db.query(
//         'INSERT INTO pacientes (usuario_id, cpf, data_nascimento, telefone, endereco, peso_inicial, altura) VALUES ($1, $2, $3, $4, $5, $6, $7)',
//         [userId, additionalData.cpf, additionalData.data_nascimento, additionalData.telefone, additionalData.endereco, additionalData.peso_inicial, additionalData.altura]
//       );
//     } else if (tipo_usuario === 'medico') {
//       await db.query(
//         'INSERT INTO medicos (usuario_id, crm, especialidade, local_atendimento, telefone_contato) VALUES ($1, $2, $3, $4, $5)',
//         [userId, additionalData.crm, additionalData.especialidade, additionalData.local_atendimento, additionalData.telefone_contato]
//       );
//     }

//     res.status(201).json({ message: 'Usuário criado com sucesso', userId });
//   } catch (error) {
//     console.error('Erro no registro:', error);
//     res.status(500).json({ error: 'Erro interno do servidor' });
//   }
// };

// const login = async (req, res) => {
//   try {
//     const { email, senha } = req.body;

//     const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
//     if (result.rows.length === 0) {
//       return res.status(401).json({ error: 'Credenciais inválidas' });
//     }

//     const user = result.rows[0];
//     const validPassword = await bcrypt.compare(senha, user.senha_hash);

//     if (!validPassword) {
//       return res.status(401).json({ error: 'Credenciais inválidas' });
//     }

//     const token = jwt.sign(
//       { userId: user.id, tipo_usuario: user.tipo_usuario },
//       process.env.JWT_SECRET,
//       { expiresIn: '24h' }
//     );

//     res.json({
//       token,
//       user: {
//         id: user.id,
//         nome: user.nome,
//         email: user.email,
//         tipo_usuario: user.tipo_usuario
//       }
//     });
//   } catch (error) {
//     console.error('Erro no login:', error);
//     res.status(500).json({ error: 'Erro interno do servidor' });
//   }
// };

// // const logout = async (req, res) => {
// //    try {
// //     const token = req.headers.authorization?.split(" ")[1];
// //     if (!token) return res.status(400).json({ error: "Token não fornecido" });

// //     blacklistedTokens.push(token); // Adiciona à blacklist
// //     res.json({ message: "Logout realizado com sucesso" });
// //   } catch (error) {
// //     console.error("Erro no logout:", error);
// //     res.status(500).json({ error: "Erro interno do servidor" });
// //   }
// // };

// const logout = async (req, res) => {
//   try {
//     const token = req.headers.authorization?.split(" ")[1];
//     if (!token) return res.status(400).json({ error: "Token não fornecido" });

//     // Verifica se já está na blacklist
//     if (blacklistedTokens.includes(token)) {
//       return res.status(400).json({ error: "Token já foi invalidado" });
//     }

//     // Verifica se o token é válido (não expirou ou não foi adulterado)
//     jwt.verify(token, process.env.JWT_SECRET, (err) => {
//       if (err) return res.status(401).json({ error: "Token inválido ou expirado" });

//       blacklistedTokens.push(token); // só entra aqui se o token for válido
//       return res.json({ message: "Logout realizado com sucesso" });
//     });
//   } catch (error) {
//     console.error("Erro no logout:", error);
//     res.status(500).json({ error: "Erro interno do servidor" });
//   }
// };


// const refreshToken = async (req, res) => {
//   try {
//     const { refreshToken } = req.body;
//     if (!refreshToken) return res.status(400).json({ error: "Refresh token não fornecido" });

//     // Validar refreshToken
//     const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

//     // Gerar novo accessToken
//     const newAccessToken = jwt.sign(
//       { userId: decoded.userId, tipo_usuario: decoded.tipo_usuario },
//       process.env.JWT_SECRET,
//       { expiresIn: "15m" }
//     );

//     res.json({ accessToken: newAccessToken });
//   } catch (error) {
//     console.error("Erro no refreshToken:", error);
//     res.status(401).json({ error: "Refresh token inválido ou expirado" });
//   }
// };

// module.exports = { register, login, logout, refreshToken };