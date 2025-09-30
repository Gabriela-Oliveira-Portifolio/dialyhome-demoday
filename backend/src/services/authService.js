const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;

// Blacklist em memória (poderia ser no Redis para produção)
const blacklistedTokens = [];

// Funções auxiliares
const hashPassword = async (password) => {
  return await bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

const generateToken = (userId, tipo_usuario, type = 'access') => {
  const expiresIn = type === 'refresh'
    ? process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    : process.env.JWT_EXPIRES_IN || '15m';

  return jwt.sign(
    { userId, tipo_usuario, type },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Criar usuário
const createUser = async (userData) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { nome, email, senha, tipo_usuario, ...extra } = userData;

    // Verifica se já existe
    const existing = await client.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existing.rows.length > 0) throw new Error('Email já está em uso');

    const senhaHash = await hashPassword(senha);

    const userResult = await client.query(
      `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario) 
       VALUES ($1, $2, $3, $4) RETURNING id, nome, email, tipo_usuario`,
      [nome, email, senhaHash, tipo_usuario]
    );

    const user = userResult.rows[0];

    // Dados adicionais
    if (tipo_usuario === 'paciente') {
      await client.query(
        `INSERT INTO pacientes (usuario_id, cpf, data_nascimento, telefone, endereco, peso_inicial, altura) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [user.id, extra.cpf, extra.data_nascimento, extra.telefone, extra.endereco, extra.peso_inicial, extra.altura]
      );
    } else if (tipo_usuario === 'medico') {
      await client.query(
        `INSERT INTO medicos (usuario_id, crm, especialidade, local_atendimento, telefone_contato) 
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, extra.crm, extra.especialidade, extra.local_atendimento, extra.telefone_contato]
      );
    }

    await client.query('COMMIT');
    return user;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Autenticar usuário
const authenticateUser = async (email, senha) => {
  const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
  if (result.rows.length === 0) throw new Error('Credenciais inválidas');

  const user = result.rows[0];
  const valid = await comparePassword(senha, user.senha_hash);
  if (!valid) throw new Error('Credenciais inválidas');

  return user;
};

// Refresh de token
const refreshAccessToken = async (token) => {
  try {
    const decoded = verifyToken(token);
    if (decoded.type !== 'refresh') throw new Error('Token inválido');

    const user = await db.query('SELECT * FROM usuarios WHERE id = $1', [decoded.userId]);
    if (user.rows.length === 0) throw new Error('Usuário não encontrado');

    const newAccessToken = generateToken(decoded.userId, user.rows[0].tipo_usuario, 'access');
    const newRefreshToken = generateToken(decoded.userId, user.rows[0].tipo_usuario, 'refresh');

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  } catch {
    throw new Error('Refresh token inválido ou expirado');
  }
};

// Logout
const logoutUser = (token) => {
  if (blacklistedTokens.includes(token)) {
    throw new Error('Token já foi invalidado');
  }
  blacklistedTokens.push(token);
  return true;
};

module.exports = {
  createUser,
  authenticateUser,
  generateToken,
  refreshAccessToken,
  logoutUser,
  verifyToken,
};



// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const db = require('../config/database');
// const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;

// const hashPassword = async (password) => {
//   return await bcrypt.hash(password, saltRounds);
// };

// const comparePassword = async (password, hash) => {
//   return await bcrypt.compare(password, hash);
// };

// const generateToken = (userId, type = 'access') => {
//   const expiresIn = type === 'refresh'
//     ? process.env.JWT_REFRESH_EXPIRES_IN
//     : process.env.JWT_EXPIRES_IN;

//   return jwt.sign(
//     { userId, type },
//     process.env.JWT_SECRET,
//     { expiresIn }
//   );
// };

// const verifyToken = (token) => {
//   try {
//     return jwt.verify(token, process.env.JWT_SECRET);
//   } catch (error) {
//     throw new Error('Token inválido');
//   }
// };

// // 🔹 Lógica principal
// const createUser = async (userData) => {
//   const client = await db.connect();

//   try {
//     await client.query('BEGIN');

//     const { nome, email, senha, tipo_usuario } = userData;

//     // Verificar se o email já existe
//     const existingUser = await client.query(
//       'SELECT id FROM usuarios WHERE email = $1',
//       [email]
//     );

//     if (existingUser.rows.length > 0) {
//       throw new Error('Email já está em uso');
//     }

//     // Hash da senha
//     const senhaHash = await hashPassword(senha);

//     // Criar usuário
//     const userResult = await client.query(
//       `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario) 
//        VALUES ($1, $2, $3, $4) 
//        RETURNING id, nome, email, tipo_usuario, ativo, data_criacao`,
//       [nome, email, senhaHash, tipo_usuario]
//     );

//     const user = userResult.rows[0];

//     // Se for paciente ou médico, criar registro específico
//     if (tipo_usuario === 'paciente') {
//       await client.query(
//         'INSERT INTO pacientes (usuario_id) VALUES ($1)',
//         [user.id]
//       );
//     } else if (tipo_usuario === 'medico') {
//       await client.query(
//         'INSERT INTO medicos (usuario_id, crm) VALUES ($1, $2)',
//         [user.id, userData.crm || null]
//       );
//     }

//     await client.query('COMMIT');

//     // Remover dados sensíveis
//     delete user.senha_hash;
    
//     return user;

//   } catch (error) {
//     await client.query('ROLLBACK');
//     throw error;
//   } finally {
//     client.release();
//   }
// };

// const authenticateUser = async (email, senha) => {
//   const result = await db.query(
//     `SELECT id, nome, email, senha_hash, tipo_usuario, ativo 
//      FROM usuarios 
//      WHERE email = $1`,
//     [email]
//   );

//   if (result.rows.length === 0) {
//     throw new Error('Credenciais inválidas');
//   }

//   const user = result.rows[0];

//   if (!user.ativo) {
//     throw new Error('Conta desativada');
//   }

//   const senhaValida = await comparePassword(senha, user.senha_hash);
//   if (!senhaValida) {
//     throw new Error('Credenciais inválidas');
//   }

//   // Remover hash da senha do retorno
//   delete user.senha_hash;

//   return user;
// };

// const getUserById = async (userId) => {
//   const result = await db.query(
//     `SELECT id, nome, email, tipo_usuario, ativo, data_criacao 
//      FROM usuarios 
//      WHERE id = $1 AND ativo = true`,
//     [userId]
//   );

//   if (result.rows.length === 0) {
//     throw new Error('Usuário não encontrado');
//   }

//   return result.rows[0];
// };

// const refreshToken = async (refreshToken) => {
//   try {
//     const decoded = verifyToken(refreshToken);

//     if (decoded.type !== 'refresh') {
//       throw new Error('Token de refresh inválido');
//     }

//     const user = await getUserById(decoded.userId);

//     const newAccessToken = generateToken(user.id, 'access');
//     const newRefreshToken = generateToken(user.id, 'refresh');

//     return {
//       accessToken: newAccessToken,
//       refreshToken: newRefreshToken,
//       user
//     };

//   } catch (error) {
//     throw new Error('Token de refresh inválido');
//   }
// };

// // 🔹 Exporta todas as funções
// module.exports = {
//   hashPassword,
//   comparePassword,
//   generateToken,
//   verifyToken,
//   createUser,
//   authenticateUser,
//   getUserById,
//   refreshToken
// };






// // const bcrypt = require('bcryptjs');
// // const jwt = require('jsonwebtoken');
// // const authConfig = require('../config/auth');
// // const db = require('../config/database');

// // class AuthService {
  
// //   async hashPassword(password) {
// //     return await bcrypt.hash(password, authConfig.bcrypt.saltRounds);
// //   }

// //   async comparePassword(password, hash) {
// //     return await bcrypt.compare(password, hash);
// //   }

// //   generateToken(userId, type = 'access') {
// //     const expiresIn = type === 'refresh' 
// //       ? authConfig.jwt.refreshExpiresIn 
// //       : authConfig.jwt.expiresIn;
    
// //     return jwt.sign(
// //       { userId, type }, 
// //       authConfig.jwt.secret, 
// //       { expiresIn }
// //     );
// //   }

// //   verifyToken(token) {
// //     try {
// //       return jwt.verify(token, authConfig.jwt.secret);
// //     } catch (error) {
// //       throw new Error('Token inválido');
// //     }
// //   }

// //   async createUser(userData) {
// //     const client = await db.connect();
    
// //     try {
// //       await client.query('BEGIN');

// //       const { nome, email, senha, tipo_usuario } = userData;

// //       // Verificar se o email já existe
// //       const existingUser = await client.query(
// //         'SELECT id FROM usuarios WHERE email = $1',
// //         [email]
// //       );

// //       if (existingUser.rows.length > 0) {
// //         throw new Error('Email já está em uso');
// //       }

// //       // Hash da senha
// //       const senhaHash = await this.hashPassword(senha);

// //       // Criar usuário
// //       const userResult = await client.query(
// //         `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario) 
// //          VALUES ($1, $2, $3, $4) 
// //          RETURNING id, nome, email, tipo_usuario, ativo, data_criacao`,
// //         [nome, email, senhaHash, tipo_usuario]
// //       );

// //       const user = userResult.rows[0];

// //       // Se for paciente ou médico, criar registro específico
// //       if (tipo_usuario === 'paciente') {
// //         await client.query(
// //           'INSERT INTO pacientes (usuario_id) VALUES ($1)',
// //           [user.id]
// //         );
// //       } else if (tipo_usuario === 'medico') {
// //         await client.query(
// //           'INSERT INTO medicos (usuario_id, crm) VALUES ($1, $2)',
// //           [user.id, userData.crm || null]
// //         );
// //       }

// //       await client.query('COMMIT');

// //       // Remover dados sensíveis
// //       delete user.senha_hash;
      
// //       return user;

// //     } catch (error) {
// //       await client.query('ROLLBACK');
// //       throw error;
// //     } finally {
// //       client.release();
// //     }
// //   }

// //   async authenticateUser(email, senha) {
// //     const result = await db.query(
// //       `SELECT id, nome, email, senha_hash, tipo_usuario, ativo 
// //        FROM usuarios 
// //        WHERE email = $1`,
// //       [email]
// //     );

// //     if (result.rows.length === 0) {
// //       throw new Error('Credenciais inválidas');
// //     }

// //     const user = result.rows[0];

// //     if (!user.ativo) {
// //       throw new Error('Conta desativada');
// //     }

// //     const senhaValida = await this.comparePassword(senha, user.senha_hash);
// //     if (!senhaValida) {
// //       throw new Error('Credenciais inválidas');
// //     }

// //     // Remover hash da senha do retorno
// //     delete user.senha_hash;

// //     return user;
// //   }

// //   async getUserById(userId) {
// //     const result = await db.query(
// //       `SELECT id, nome, email, tipo_usuario, ativo, data_criacao 
// //        FROM usuarios 
// //        WHERE id = $1 AND ativo = true`,
// //       [userId]
// //     );

// //     if (result.rows.length === 0) {
// //       throw new Error('Usuário não encontrado');
// //     }

// //     return result.rows[0];
// //   }

// //   async refreshToken(refreshToken) {
// //     try {
// //       const decoded = this.verifyToken(refreshToken);
      
// //       if (decoded.type !== 'refresh') {
// //         throw new Error('Token de refresh inválido');
// //       }

// //       const user = await this.getUserById(decoded.userId);
      
// //       const newAccessToken = this.generateToken(user.id, 'access');
// //       const newRefreshToken = this.generateToken(user.id, 'refresh');

// //       return {
// //         accessToken: newAccessToken,
// //         refreshToken: newRefreshToken,
// //         user
// //       };

// //     } catch (error) {
// //       throw new Error('Token de refresh inválido');
// //     }
// //   }
// // }

// // module.exports = new AuthService();