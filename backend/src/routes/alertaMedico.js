const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { enviarAlerta, listarAlertasEnviados, buscarAlerta, obterEstatisticas } = require('../controllers/alertaDoMedicoController');

// Middleware de autenticação e autorização
router.use(authenticateToken);
router.use(authorizeRole(['medico']));

// rotas
router.post('/enviar', enviarAlerta);
router.get('/enviados', listarAlertasEnviados);
router.get('/estatisticas', obterEstatisticas); 
router.get('/:id', buscarAlerta);  

module.exports = router;
