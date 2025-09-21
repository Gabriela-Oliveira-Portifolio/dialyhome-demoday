const express = require('express');
const { getProfile, updateProfile, changePassword, getUserById, toggleUserStatus, deleteUser  } = require('../controllers/userController');
const router = express.Router();


router.get('/getProfile', getProfile);
router.put('/updateProfile', updateProfile);
router.put('/changePassword', changePassword);
router.get('/getUserById', getUserById);
router.put('/toggleUserStatus', toggleUserStatus);
router.delete('/deleteUser', deleteUser);

module.exports = router;