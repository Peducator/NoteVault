const express = require('express');
const router = express.Router();
const ocrController = require('./ocrController');

// POST /api/ocr/scan - Bóc tách hóa đơn & tra cứu mã số thuế doanh nghiệp
router.post('/scan', ocrController.scanInvoice);

module.exports = router;
