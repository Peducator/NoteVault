const express = require('express');
const router = express.Router();
const transactionController = require('./transactionController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Tất cả endpoints của transaction đều bắt buộc lấy userId từ Access Token chính chủ
router.use(authenticateToken);

// API sao kê chi tiêu tháng
router.get('/statement/monthly', transactionController.getMonthlyStatement);

// CRUD giao dịch
router.get('/', transactionController.getTransactions);
router.post('/', transactionController.createTransaction);
router.get('/:id', transactionController.getTransactionById);
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router;
