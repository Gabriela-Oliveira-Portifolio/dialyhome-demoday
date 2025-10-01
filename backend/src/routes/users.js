// const express = require('express');
// const { getProfile, updateProfile, changePassword, getUserById, toggleUserStatus, deleteUser  } = require('../controllers/userController');
// const router = express.Router();


// router.get('/getProfile', getProfile);
// router.put('/updateProfile', updateProfile);
// router.put('/changePassword', changePassword);
// router.get('/getUserById', getUserById);
// router.put('/toggleUserStatus', toggleUserStatus);
// router.delete('/deleteUser', deleteUser);

// module.exports = router;


const express = require('express');
const { 
  getProfile, 
  updateProfile, 
  changePassword, 
  getUserById, 
  toggleUserStatus, 
  deleteUser  
} = require('../controllers/userController');

const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// 🔒 Todas essas rotas exigem login
router.get('/getProfile', authenticateToken, getProfile);
router.put('/updateProfile', authenticateToken, updateProfile);
router.put('/changePassword', authenticateToken, changePassword);

// 🔒 Rotas só para administradores
router.get('/:id', authenticateToken, authorizeRole(['admin']), getUserById);
router.put('/:id/toggle-status', authenticateToken, authorizeRole(['admin']), toggleUserStatus);
router.delete('/:id', authenticateToken, authorizeRole(['admin']), deleteUser);

module.exports = router;
