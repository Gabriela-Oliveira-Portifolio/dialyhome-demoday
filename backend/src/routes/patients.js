const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const patientController = require('../controllers/patientController');

// Todas as rotas requerem autenticação e role de paciente
router.use(authenticateToken);
router.use(authorizeRole(['paciente']));

router.get('/profile', authorizeRole(['paciente']), patientController.getProfile);
router.get('/stats', authorizeRole(['paciente']), patientController.getStats);
router.get('/', patientController.getAllPatients);
router.post('/', patientController.createPatient);
router.get('/:id', patientController.getPatientById);
router.put('/:id', patientController.updatePatient);
router.get('/:id/medical-data', patientController.getMedicalData);
router.put('/:id/medical-data', patientController.updateMedicalData);
router.get('/:id/dialysis-history', patientController.getDialysisHistory);
router.put('/:id/assign-doctor', patientController.assignDoctor);

module.exports = router;
