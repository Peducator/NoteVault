const express = require('express');
const router = express.Router();
const bankingController = require('./bankingController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Tất cả endpoints đều bắt buộc đăng nhập với Bearer JWT Token
router.use(authenticateToken);

router.post('/', bankingController.createAccount);
router.get('/', bankingController.getAccounts);
router.get('/:id', bankingController.getAccountById);
router.put('/:id', bankingController.updateAccount);
router.delete('/:id', bankingController.deleteAccount);

module.exports = router;
