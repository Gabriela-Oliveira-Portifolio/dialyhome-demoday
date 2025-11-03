const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso necessário' });
  }

  // Em ambiente de teste, pular verificação de blacklist
  if (process.env.NODE_ENV !== 'test') {
    // Verifica se o token está na blacklist
    const blacklisted = await db.query(
      "SELECT id FROM tokens_invalidados WHERE token = $1 AND expira_em > NOW()",
      [token]
    );
    if (blacklisted.rows.length > 0) {
      return res.status(401).json({ error: "Token inválido ou expirado" });
    }
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Suportar tanto 'userId' quanto 'id' no token (para compatibilidade)
    const userId = decoded.userId || decoded.id;

    // Em ambiente de teste, não verificar no banco
    if (process.env.NODE_ENV === 'test') {
      req.user = {
        id: userId,
        tipo_usuario: decoded.tipo_usuario,
        email: decoded.email,
        nome: decoded.nome || 'Test User'
      };
      return next();
    }

    // Em produção, verificar se o usuário existe
    const result = await db.query('SELECT * FROM usuarios WHERE id = $1', [userId]);
    
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Usuário não encontrado' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(403).json({ error: 'Token inválido' });
  }
};

const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    
    if (!roles.includes(req.user.tipo_usuario)) {
      return res.status(403).json({ 
        error: 'Acesso negado',
        required: roles,
        current: req.user.tipo_usuario
      });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRole };
// const jwt = require('jsonwebtoken');
// const db = require('../config/database');

// const authenticateToken = async (req, res, next) => {
//   const authHeader = req.headers['authorization'];
//   const token = authHeader && authHeader.split(' ')[1];
// // Verifica se o token está na blacklist
//     const blacklisted = await db.query(
//       "SELECT id FROM tokens_invalidados WHERE token = $1 AND expira_em > NOW()",
//       [token]
//     );
//     if (blacklisted.rows.length > 0) {
//       return res.status(401).json({ error: "Token inválido ou expirado" });
//     }
//   if (!token) {
//     return res.status(401).json({ error: 'Token de acesso necessário' });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const result = await db.query('SELECT * FROM usuarios WHERE id = $1', [decoded.userId]);
    
//     if (result.rows.length === 0) {
//       return res.status(403).json({ error: 'Usuário não encontrado' });
//     }

//     req.user = result.rows[0];
//     next();
//   } catch (error) {
//     return res.status(403).json({ error: 'Token inválido' });
//   }
// };

// const authorizeRole = (roles) => {
//   return (req, res, next) => {
//     if (!roles.includes(req.user.tipo_usuario)) {
//       return res.status(403).json({ error: 'Acesso negado' });
//     }
//     next();
//   };
// };

// module.exports = { authenticateToken, authorizeRole };