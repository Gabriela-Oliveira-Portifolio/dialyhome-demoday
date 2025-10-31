// // src/routes/alertaMedico.js
// // Rotas para gerenciamento de alertas médicos
// const express = require('express');
// const router = express.Router();
// const { authenticateToken, authorizeRole } = require('../middleware/auth');
// const { enviarAlerta, listarAlertasEnviados, buscarAlerta, obterEstatisticas   } = require('../controllers/alertaDoMedicoController');

// router.use(authenticateToken);
// router.use(authorizeRole(['medico']));

// router.post('/enviar', enviarAlerta);

// router.get('/enviados', listarAlertasEnviados);

// router.get('/estatisticas', buscarAlerta);

// router.get('/:id', obterEstatisticas);

// module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { enviarAlerta, listarAlertasEnviados, buscarAlerta, obterEstatisticas } = require('../controllers/alertaDoMedicoController');
// const { register, login, logout, refreshToken  } = require('../controllers/authController');

// Middleware de autenticação e autorização
router.use(authenticateToken);
router.use(authorizeRole(['medico']));

// ROTAS CORRIGIDAS
// POST /api/medico/alertas/enviar
router.post('/enviar', enviarAlerta);

// GET /api/medico/alertas/enviados
router.get('/enviados', listarAlertasEnviados);

// GET /api/medico/alertas/estatisticas
router.get('/estatisticas', obterEstatisticas);  // ✅ CORRIGIDO

// GET /api/medico/alertas/:id
router.get('/:id', buscarAlerta);  // ✅ CORRIGIDO

module.exports = router;
