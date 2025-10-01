const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./src/routes/auth');
const usersRoutes = require('./src/routes/users');

const dialysisRoutes = require('./src/routes/dialysis');
// const medicationRoutes = require('./src/routes/medications');
// const doctorRoutes = require('./src/routes/doctor');
// const documentRoutes = require('./src/routes/documents');

const app = express();

// Middlewares de segurança
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máximo 100 requests por IP por janela
});
app.use(limiter);

// Middleware para parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);


app.use('/api/dialysis', dialysisRoutes);
// app.use('/api/medications', medicationRoutes);
// app.use('/api/doctor', doctorRoutes);
// app.use('/api/documents', documentRoutes);

// Rota de saúde
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  console.error('Erro:', error);
  res.status(error.status || 500).json({
    error: error.message || 'Erro interno do servidor'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});


const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;


// // require("dotenv").config();

// require("dotenv").config({ path: __dirname + "/../.env" });

// const db = require("./src/config/db");


// const port = process.env.PORT;

// const express = require("express");

// const app = express();


// console.log("Backend Rodando");

// app.get('/health', (req, res) => {
//     res.json({ message: 'DialyHome API está funcionando!' });
// });

// app.get('/healtha', (req, res) => {
//     res.json({ message: 'DialyHome API está funcionandaaaaaaao!' });
// });

// app.listen(port, () => {
//     console.log(`Servidor rodando na porta ${port}`);
// });

// app.get('/Sintomas', async (req, res) => {

//         const sintomas = await db.SelectSintomas();
//         res.json(sintomas);
// })

// app.get('/Usuarios', async (req, res) => {

//     const email = await db.SelectUserByEmail("ana.souza@example.com");
//     res.json(email);
// })


