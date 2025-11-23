const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const patientController = require('../controllers/patientController');

// Todas as rotas requerem autenticação e role de paciente
router.use(authenticateToken);
router.use(authorizeRole(['paciente']));

// GET /api/patients/profile - Buscar perfil completo
// router.get('/profile', patientController.getProfile);

router.get('/profile', authorizeRole(['paciente']), patientController.getProfile);
// GET /api/patients/stats
router.get('/stats', authorizeRole(['paciente']), patientController.getStats);





// GET /api/patients (Listar pacientes - Admin/Médico)
router.get('/', patientController.getAllPatients);
// POST /api/patients (Criar paciente - Admin/Médico)
router.post('/', patientController.createPatient);
// GET /api/patients/:id (Detalhes do paciente)
router.get('/:id', patientController.getPatientById);
// PUT /api/patients/:id (Atualizar paciente)
router.put('/:id', patientController.updatePatient);
// GET /api/patients/:id/medical-data
router.get('/:id/medical-data', patientController.getMedicalData);
// PUT /api/patients/:id/medical-data
router.put('/:id/medical-data', patientController.updateMedicalData);
// GET /api/patients/:id/dialysis-history
router.get('/:id/dialysis-history', patientController.getDialysisHistory);
// PUT /api/patients/:id/assign-doctor (Admin Only)
router.put('/:id/assign-doctor', patientController.assignDoctor);

module.exports = router;
