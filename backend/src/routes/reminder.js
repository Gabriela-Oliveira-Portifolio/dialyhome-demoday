const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const remindersController = require('../controllers/remindersController');

// Todas as rotas requerem autenticação de paciente
router.use(authenticateToken);
router.use(authorizeRole(['paciente']));

// Rotas
router.get('/', remindersController.getReminders);
router.get('/upcoming', remindersController.getUpcomingReminders);
router.post('/', remindersController.createReminder);
router.put('/:id', remindersController.updateReminder);
router.delete('/:id', remindersController.deleteReminder);

module.exports = router;