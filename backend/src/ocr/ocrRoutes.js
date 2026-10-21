const express = require('express');
const router = express.Router();
const ocrController = require('./ocrController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Bảo vệ bằng Access Token: Yêu cầu đăng nhập chính chủ, xác thực userId và tenantId
router.use(authenticateToken);

// POST /api/ocr/scan - Bóc tách hóa đơn & tra cứu mã số thuế doanh nghiệp
router.post('/scan', ocrController.scanInvoice);

module.exports = router;
