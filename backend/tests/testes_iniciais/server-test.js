// server-test.js
const express = require('express');
const app = express();

app.use(express.json());

// Rota de teste básica
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Servidor funcionando!', 
    timestamp: new Date().toISOString() 
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

app.post('/api/test/register', (req, res) => {
  console.log('Dados recebidos:', req.body);
  res.json({ 
    success: true, 
    received: req.body 
  });
});


const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token necessário' });
  }

  try {
    const decoded = jwt.verify(token, 'test_secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido' });
  }
};

// Rota protegida de teste
app.get('/api/test/protected', authenticateToken, (req, res) => {
  res.json({ 
    message: 'Acesso autorizado!', 
    user: req.user 
  });
});