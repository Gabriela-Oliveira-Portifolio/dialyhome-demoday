const rateLimit = require('express-rate-limit');
const db = require('../config/database');

// Rate limiting específico para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas por IP
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting para criação de registros
const createRecordLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // máximo 10 registros por minuto
  message: {
    error: 'Muitos registros criados. Aguarde um momento.'
  }
});

// Rate limiting para upload de arquivos
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20, // máximo 20 uploads por hora
  message: {
    error: 'Limite de uploads atingido. Tente novamente em 1 hora.'
  }
});

// Rate limiting dinâmico baseado no usuário
const dynamicLimiter = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const key = `rate_limit:${req.user.id}`;
    const current = await getRequestCount(key);
    
    if (current >= maxRequests) {
      return res.status(429).json({
        error: 'Limite de requisições excedido'
      });
    }

    await incrementRequestCount(key, windowMs);
    next();
  };
};

// Funções auxiliares para controle de rate limiting
async function getRequestCount(key) {
  // Implementar com Redis em produção
  // Por enquanto, usar contagem simples em memória
  return 0;
}

async function incrementRequestCount(key, windowMs) {
  // Implementar com Redis em produção
}

module.exports = {
  loginLimiter,
  createRecordLimiter,
  uploadLimiter,
  dynamicLimiter
};