const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const remindersController = require('../controllers/remindersController');

// Todas as rotas requerem autenticação e role de paciente
router.use(authenticateToken);
router.use(authorizeRole(['paciente']));

// GET /api/reminders - Buscar todos os lembretes
router.get('/', remindersController.getReminders);

// GET /api/reminders/upcoming - Buscar lembretes próximos
router.get('/upcoming', remindersController.getUpcomingReminders);

// POST /api/reminders - Criar novo lembrete
router.post('/', remindersController.createReminder);

// PUT /api/reminders/:id - Atualizar lembrete
router.put('/:id', remindersController.updateReminder);

// DELETE /api/reminders/:id - Deletar lembrete
router.delete('/:id', remindersController.deleteReminder);

module.exports = router;