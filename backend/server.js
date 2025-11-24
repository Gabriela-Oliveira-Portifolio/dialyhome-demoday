const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();


const remindersRoutes = require('./src/routes/reminder');
const authRoutes = require('./src/routes/auth');
const usersRoutes = require('./src/routes/users');
const dialysisRoutes = require('./src/routes/dialysis.js');
const patientRoutes = require('./src/routes/patients');
const symptomsRoutes = require('./src/routes/symptoms');
const adminRoutes = require('./src/routes/admin');
const doctorRoutes = require('./src/routes/doctor');
const alertaMedicoRoutes = require('./src/routes/alertaMedico');




const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Middlewares de segurança
app.use(helmet());

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
app.use('/api/patients', patientRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/symptoms', symptomsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/doctor/alerta', alertaMedicoRoutes);

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;