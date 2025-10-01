const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
// Verifica se o token está na blacklist
    const blacklisted = await db.query(
      "SELECT id FROM tokens_invalidados WHERE token = $1 AND expira_em > NOW()",
      [token]
    );
    if (blacklisted.rows.length > 0) {
      return res.status(401).json({ error: "Token inválido ou expirado" });
    }
  if (!token) {
    return res.status(401).json({ error: 'Token de acesso necessário' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await db.query('SELECT * FROM usuarios WHERE id = $1', [decoded.userId]);
    
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Usuário não encontrado' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido' });
  }
};

const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.tipo_usuario)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRole };



// require("dotenv").config({ path: __dirname + "/../.env" });


// import jwt from 'jsonwebtoken';
// import bcrypt from 'bcryptjs';


// export const generateToken = (userId: number, userType: string) => {
//   return jwt.sign(
//     { userId, userType },
//     process.env.JWT_SECRET,
//     { expiresIn: '7d' }
//   );
// };

// export const verifyToken = (token: string) => {
//   return jwt.verify(token, process.env.JWT_SECRET);
// };

// export const hashPassword = async (password: string) => {
//   return await bcrypt.hash(password, 12);
// };

// export const comparePassword = async (password: string, hashedPassword: string) => {
//   return await bcrypt.compare(password, hashedPassword);
// };