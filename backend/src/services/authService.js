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
const createUseraaaa = async (userData) => {
  const client = db; // usar pool direto

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

// // Autenticar usuário
const createUser = async (userData) => {
  try {
    const { nome, email, senha, tipo_usuario, ...extra } = userData;

    // Verifica se o email já existe
    const existing = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      throw new Error(`O email ${email} já está em uso`);
    }

    // Hash da senha
    const senhaHash = await hashPassword(senha);

    // Inserir usuário
    const userResult = await db.query(
      `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nome, email, tipo_usuario`,
      [nome, email, senhaHash, tipo_usuario]
    );

    const user = userResult.rows[0];

    // Inserir dados específicos
    if (tipo_usuario === 'paciente') {
      const { cpf, data_nascimento, telefone, endereco, peso_inicial, altura } = extra;
      await db.query(
        `INSERT INTO pacientes (usuario_id, cpf, data_nascimento, telefone, endereco, peso_inicial, altura)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [user.id, cpf, data_nascimento, telefone, endereco, peso_inicial, altura]
      );
    } else if (tipo_usuario === 'medico') {
      const { crm, especialidade, local_atendimento, telefone_contato } = extra;
      await db.query(
        `INSERT INTO medicos (usuario_id, crm, especialidade, local_atendimento, telefone_contato)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, crm, especialidade, local_atendimento, telefone_contato]
      );
    }

    return user; // retorna apenas os dados do usuário

  } catch (error) {
    console.error('Erro ao criar usuário:', error.message);
    throw new Error(`Falha ao criar usuário: ${error.message}`);
  }
};



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
