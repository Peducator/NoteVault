const express = require('express');
const router = express.Router();
const notificationController = require('./notificationController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Lấy danh sách thông báo của user (hoặc người mà user có thẩm quyền quản lý)
router.get('/', notificationController.getNotifications);

// Đánh dấu 1 thông báo đã đọc
router.patch('/:id/read', notificationController.markAsRead);

// Đánh dấu tất cả thông báo là đã đọc
router.patch('/read-all', notificationController.markAllAsRead);

// Người nào quản lý ai thì mới được thấy thông báo, tránh cross-unit đọc lén thông báo của người khác

module.exports = router;
