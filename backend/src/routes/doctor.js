// backend/src/routes/doctorRoutes.js

const express = require('express');
const router = express.Router();
const { authenticateToken} = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  changePassword,
  getPatients,
  getPatientDetails,
  getPatientDialysisHistory,
  getPatientDocuments,
  sendRecommendation,
  getNotifications,
  markNotificationAsRead,
  getDashboardStats,
  getPatientReport,
  getGeneralReport
} = require('../controllers/doctorController');

// Todas as rotas requerem autenticação e verificação de tipo de usuário 'medico'
router.use(authenticateToken);
// router.use(checkDoctor);

// ===============================
// Perfil do médico
// ===============================
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);

// ===============================
// Dashboard e estatísticas
// ===============================
router.get('/dashboard/stats', getDashboardStats);

// ===============================
// Pacientes
// ===============================
router.get('/patients', getPatients);
router.get('/patients/:patientId', getPatientDetails);
router.get('/patients/:patientId/dialysis', getPatientDialysisHistory);
router.get('/patients/:patientId/documents', getPatientDocuments);
router.post('/patients/:patientId/recommendations', sendRecommendation);

// ===============================
// Relatórios
// ===============================
router.get('/reports/patient/:patientId', getPatientReport);
router.get('/reports/general', getGeneralReport);

// ===============================
// Notificações
// ===============================
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationAsRead);

module.exports = router;

// const express = require('express');
// const router = express.Router();
// const { authenticateToken, authorizeRole } = require('../middleware/auth');
// const doctorController = require('../controllers/doctorController');

// // Todas as rotas requerem autenticação e role de médico
// router.use(authenticateToken);
// router.use(authorizeRole(['medico']));

// // GET /api/doctor/profile - Perfil do médico
// router.get('/profile', doctorController.getProfile);

// // GET /api/doctor/patients - Lista de pacientes vinculados
// router.get('/patients', doctorController.getPatients);

// // GET /api/doctor/patients/:patientId - Detalhes de um paciente específico
// router.get('/patients/:patientId', doctorController.getPatientDetails);

// // GET /api/doctor/patients/:patientId/dialysis - Histórico de diálise do paciente
// router.get('/patients/:patientId/dialysis', doctorController.getPatientDialysisHistory);

// // GET /api/doctor/patients/:patientId/documents - Documentos do paciente
// router.get('/patients/:patientId/documents', doctorController.getPatientDocuments);

// // POST /api/doctor/patients/:patientId/recommendations - Enviar recomendação
// router.post('/patients/:patientId/recommendations', doctorController.sendRecommendation);

// // GET /api/doctor/notifications - Notificações e alertas
// router.get('/notifications', doctorController.getNotifications);

// // PUT /api/doctor/notifications/:id/read - Marcar notificação como lida
// router.put('/notifications/:id/read', doctorController.markNotificationAsRead);

// // GET /api/doctor/dashboard/stats - Estatísticas do dashboard
// router.get('/dashboard/stats', doctorController.getDashboardStats);

// // GET /api/doctor/reports/patient/:patientId - Relatório individual
// router.get('/reports/patient/:patientId', doctorController.getPatientReport);

// // GET /api/doctor/reports/general - Relatório geral de todos os pacientes
// router.get('/reports/general', doctorController.getGeneralReport);

// module.exports = router;