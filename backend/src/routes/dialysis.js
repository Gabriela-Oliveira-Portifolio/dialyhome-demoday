const express = require('express');
const { createDialysisRecord, getDialysisHistory } = require('../controllers/dialysisController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const router = express.Router();

router.post('/', authenticateToken, authorizeRole(['paciente']), createDialysisRecord);
router.get('/history', authenticateToken, authorizeRole(['paciente']), getDialysisHistory);

module.exports = router;