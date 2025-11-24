// backend/src/routes/doctorRoutes.js

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getProfile, updateProfile, changePassword, getPatients, getPatientDetails, getPatientDialysisHistory, getPatientDocuments, sendRecommendation, sendAlert, getNotifications, markNotificationAsRead, getDashboardStats, getPatientReport, getGeneralReport, getPatientAnalytics} = require('../controllers/doctorController');

// Todas as rotas requerem autenticação e verificação de tipo de usuário 'medico'
router.use(authenticateToken);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.get('/dashboard/stats', getDashboardStats);
router.get('/patients', getPatients);
router.get('/patients/:patientId', getPatientDetails);
router.get('/patients/:patientId/dialysis', getPatientDialysisHistory);
router.get('/patients/:patientId/documents', getPatientDocuments);
router.post('/patients/:patientId/recommendations', sendRecommendation);
router.post('/patients/:patientId/alert', sendAlert);
router.get('/reports/patient/:patientId', getPatientReport);
router.get('/reports/general', getGeneralReport);
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationAsRead);
router.get('/patients/:patientId/analytics', getPatientAnalytics);

module.exports = router;
