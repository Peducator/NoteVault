const express = require('express');
const router = express.Router();
const uploadController = require('./uploadController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Áp dụng middleware kiểm tra Access Token (20p) + userId cho các route upload
// Hiện tại chưa cần location, tập trung kiểm tra chặt chẽ quyền hạn: userId - tenantId - unitId
router.use(authenticateToken);

// Lấy presigned URL để phía client tự PUT file lên S3
// Phải kiểm tra xem là userId đó chỉ được phép tạo link trong những unit mà nó đang ở trên cùng 1 tenantId
router.post('/presigned-url', uploadController.getPresignedUrl);

// Lấy link xem/tải ảnh từ S3
// Phải kiểm tra user id và tenant id và cùng unit id cùng thuộc về người đó mới cho phép tải về, tránh đọc lén hóa đơn người khác
router.get('/download-url', uploadController.getDownloadUrl);

// Backend tự lấy presigned URL rồi PUT thẳng dữ liệu ảnh lên S3
// Kiểm tra đầy đủ userId và tenantId mới được lấy và chọn đúng unitId để gửi lên S3
router.post('/direct', uploadController.uploadDirectFromBackend);

module.exports = router;
