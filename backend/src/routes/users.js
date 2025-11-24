const express = require('express');
const { getProfile, updateProfile, changePassword, getUserById, toggleUserStatus, deleteUser} = require('../controllers/userController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

router.get('/getProfile', authenticateToken, getProfile);
router.put('/updateProfile', authenticateToken, updateProfile);
router.put('/changePassword', authenticateToken, changePassword);
router.get('/:id', authenticateToken, authorizeRole(['admin']), getUserById); // só ADM
router.put('/:id/toggle-status', authenticateToken, authorizeRole(['admin']), toggleUserStatus);
router.delete('/:id', authenticateToken, authorizeRole(['admin']), deleteUser);

module.exports = router;
