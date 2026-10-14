const ocrService = require('./ocrService');

/**
 * Controller xử lý bóc tách hóa đơn
 */
const scanInvoice = async (req, res, next) => {
  try {
    const { imageBase64, mimeType } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu dữ liệu ảnh hóa đơn (imageBase64)',
      });
    }

    const result = await ocrService.scanInvoice({
      imageBase64,
      mimeType: mimeType || 'image/jpeg',
    });

    return res.status(200).json({
      success: true,
      message: 'Hóa đơn đã được bóc tách và xác thực thành công',
      data: result,
    });
  } catch (error) {
    console.error('[OCR Controller Error]:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi xử lý bóc tách hóa đơn trên máy chủ',
    });
  }
};

module.exports = {
  scanInvoice,
};
