const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const symptomsController = require('../controllers/symptomsController');

// Todas as rotas requerem autenticação de paciente
router.use(authenticateToken);
router.use(authorizeRole(['paciente']));

//Rotas
router.get('/predefined', symptomsController.getPredefinedSymptoms);
router.post('/register', symptomsController.registerSymptoms);
router.post('/isolated', symptomsController.registerIsolatedSymptom);
router.get('/record/:registroId', symptomsController.getSymptomsByRecord);
router.get('/history', symptomsController.getSymptomsHistory);

module.exports = router;