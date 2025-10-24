// backend/src/routes/messaging.js

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const messagingController = require('../controllers/messagingController');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// POST /api/messaging/send - Enviar mensagem
router.post('/send', messagingController.sendMessage);

// GET /api/messaging/conversations - Listar todas as conversas
router.get('/conversations', messagingController.getConversations);

// GET /api/messaging/:userId - Obter mensagens de uma conversa específica
router.get('/:userId', messagingController.getMessages);

// PUT /api/messaging/:messageId/read - Marcar mensagem como lida
router.put('/:messageId/read', messagingController.markAsRead);

// DELETE /api/messaging/:messageId - Deletar mensagem
router.delete('/:messageId', messagingController.deleteMessage);

// GET /api/messaging/contact/info - Obter informações do contato (médico ou pacientes)
router.get('/contact/info', messagingController.getContactInfo);

module.exports = router;