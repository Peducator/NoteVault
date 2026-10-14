const express = require('express');
const router = express.Router();
const uploadController = require('./uploadController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Áp dụng middleware kiểm tra Access Token (20p) + userId + Location cho các route upload
router.use(authenticateToken);

// Lấy presigned URL để phía client tự PUT file lên S3
router.post('/presigned-url', uploadController.getPresignedUrl);

// Lấy link xem/tải ảnh từ S3
router.get('/download-url', uploadController.getDownloadUrl);

// Backend tự lấy presigned URL rồi PUT thẳng dữ liệu ảnh lên S3
router.post('/direct', uploadController.uploadDirectFromBackend);

module.exports = router;
