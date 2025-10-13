const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// Todas as rotas requerem autenticação e role de admin
router.use(authenticateToken);
router.use(authorizeRole(['admin']));

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// Gerenciamento de Usuários
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Vinculação Médico-Paciente
router.get('/relations', adminController.getPatientDoctorRelations);
router.post('/relations/assign', adminController.assignDoctorToPatient);

// Auditoria
router.get('/audit-logs', adminController.getAuditLogs);

// Relatórios
router.get('/reports', adminController.getSystemReports);

// Backup
router.get('/backup/status', adminController.getBackupStatus);
router.post('/backup/trigger', adminController.triggerBackup);

module.exports = router;