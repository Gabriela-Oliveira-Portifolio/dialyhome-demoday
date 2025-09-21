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