const express = require('express');
const router = express.Router();
const transactionController = require('./transactionController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// CRUD & Danh sách giao dịch
router.get('/', transactionController.getTransactions);
router.post('/', transactionController.createTransaction);
router.get('/:id', transactionController.getTransactionById);
router.delete('/:id', transactionController.deleteTransaction);

// Luồng duyệt chi tiêu & hoàn ứng
router.post('/:id/approve', transactionController.approveTransaction);
router.patch('/:id/approve', transactionController.approveTransaction);
router.post('/:id/reject', transactionController.rejectTransaction);
router.patch('/:id/reject', transactionController.rejectTransaction);
router.post('/:id/pay', transactionController.payTransaction);

module.exports = router;
