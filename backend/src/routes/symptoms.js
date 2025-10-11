const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const symptomsController = require('../controllers/symptomsController');

// Todas as rotas requerem autenticação e role de paciente
router.use(authenticateToken);
router.use(authorizeRole(['paciente']));

// GET /api/symptoms/predefined - Buscar sintomas pré-definidos
router.get('/predefined', symptomsController.getPredefinedSymptoms);

// POST /api/symptoms/register - Registrar sintomas para um registro de diálise
router.post('/register', symptomsController.registerSymptoms);

// POST /api/symptoms/isolated - Registrar sintoma isolado (sem registro de diálise)
router.post('/isolated', symptomsController.registerIsolatedSymptom);

// GET /api/symptoms/record/:registroId - Buscar sintomas de um registro específico
router.get('/record/:registroId', symptomsController.getSymptomsByRecord);

// GET /api/symptoms/history - Buscar histórico de sintomas
router.get('/history', symptomsController.getSymptomsHistory);

module.exports = router;