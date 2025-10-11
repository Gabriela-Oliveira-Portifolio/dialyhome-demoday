const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const patientController = require('../controllers/patientController');

// Todas as rotas requerem autenticação e role de paciente
router.use(authenticateToken);
router.use(authorizeRole(['paciente']));

// GET /api/patients/profile - Buscar perfil completo
router.get('/profile', patientController.getProfile);

// GET /api/patients/stats - Buscar estatísticas detalhadas
router.get('/stats', patientController.getStats);

module.exports = router;

// const express = require('express');
// const router = express.Router();
// const { authenticateToken, authorizeRole } = require('../middleware/auth');
// const { getProfile, getStats } = require('../controllers/patientController');

// // Todas as rotas requerem autenticação e role de paciente
// router.use(authenticateToken);
// router.use(authorizeRole(['paciente']));

// // GET /api/patients/profile - Buscar perfil completo
// router.get('/profile', getProfile);

// // GET /api/patients/stats - Buscar estatísticas detalhadas
// router.get('/stats', getStats);

// module.exports = router;