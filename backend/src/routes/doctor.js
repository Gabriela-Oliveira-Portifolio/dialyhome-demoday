const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const doctorController = require('../controllers/doctorController');

// Todas as rotas requerem autenticação e role de médico
router.use(authenticateToken);
router.use(authorizeRole(['medico']));

// GET /api/doctor/profile - Perfil do médico
router.get('/profile', doctorController.getProfile);

// GET /api/doctor/patients - Lista de pacientes vinculados
router.get('/patients', doctorController.getPatients);

// GET /api/doctor/patients/:patientId - Detalhes de um paciente específico
router.get('/patients/:patientId', doctorController.getPatientDetails);

// GET /api/doctor/patients/:patientId/dialysis - Histórico de diálise do paciente
router.get('/patients/:patientId/dialysis', doctorController.getPatientDialysisHistory);

// GET /api/doctor/patients/:patientId/documents - Documentos do paciente
router.get('/patients/:patientId/documents', doctorController.getPatientDocuments);

// POST /api/doctor/patients/:patientId/recommendations - Enviar recomendação
router.post('/patients/:patientId/recommendations', doctorController.sendRecommendation);

// GET /api/doctor/notifications - Notificações e alertas
router.get('/notifications', doctorController.getNotifications);

// PUT /api/doctor/notifications/:id/read - Marcar notificação como lida
router.put('/notifications/:id/read', doctorController.markNotificationAsRead);

// GET /api/doctor/dashboard/stats - Estatísticas do dashboard
router.get('/dashboard/stats', doctorController.getDashboardStats);

// GET /api/doctor/reports/patient/:patientId - Relatório individual
router.get('/reports/patient/:patientId', doctorController.getPatientReport);

// GET /api/doctor/reports/general - Relatório geral de todos os pacientes
router.get('/reports/general', doctorController.getGeneralReport);

module.exports = router;