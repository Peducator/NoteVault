const uploadService = require('./uploadService');

/**
 * Controller sinh presigned URL để client PUT file ảnh lên S3
 * POST /api/upload/presigned-url
 * Body: { "fileName": "bill.jpg", "contentType": "image/jpeg" }
 * Bắt buộc lấy userId và tenantId từ token chính chủ (req.user)
 */
const getPresignedUrl = async (req, res) => {
  try {
    const { fileName, contentType, fileSize } = req.body;
    
    // BẢO MẬT: Bắt buộc lấy userId và tenantId từ Access Token chính chủ đã giải mã
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId || null;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User identifier not found in token',
      });
    }

    const result = await uploadService.requestUploadUrl({
      tenantId,
      userId,
      fileName,
      contentType,
      fileSize,
    });

    return res.status(200).json({
      success: true,
      message: 'Presigned PUT URL generated successfully',
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Controller lấy link xem/tải ảnh
 * GET /api/upload/download-url?s3Key=...
 */
const getDownloadUrl = async (req, res) => {
  try {
    const { s3Key, uploadId, ext } = req.query;
    
    // BẢO MẬT: Lấy userId và tenantId từ Access Token chính chủ
    const authenticatedUserId = req.user?.id;
    const authenticatedTenantId = req.user?.tenantId || null;

    if (!authenticatedUserId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User identifier not found in token',
      });
    }

    // Kiểm tra quyền xem ảnh:
    // S3Key phải thuộc về chính chủ user này (hoặc cùng tenant/user)
    const expectedPrefix1 = authenticatedTenantId 
      ? `tenants/${authenticatedTenantId}/users/${authenticatedUserId}/`
      : `users/${authenticatedUserId}/`;
    const expectedPrefix2 = `users/${authenticatedUserId}/`;

    if (s3Key && !s3Key.startsWith(expectedPrefix1) && !s3Key.startsWith(expectedPrefix2)) {
      return res.status(403).json({
        success: false,
        message: 'Bị từ chối: Bạn không có quyền truy cập ảnh của người dùng khác!',
      });
    }

    const result = await uploadService.requestDownloadUrl({
      tenantId: authenticatedTenantId,
      userId: authenticatedUserId,
      uploadId,
      s3Key,
      ext,
    });

    return res.status(200).json({
      success: true,
      message: 'Download presigned URL generated successfully',
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Controller upload file trực tiếp bằng backend (dùng PUT presigned URL)
 * POST /api/upload/direct
 */
const uploadDirectFromBackend = async (req, res) => {
  try {
    const { fileName, contentType, base64Data } = req.body;
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId || null;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User identifier not found in token',
      });
    }

    if (!base64Data) {
      return res.status(400).json({ success: false, message: 'base64Data is required' });
    }

    // 1. Tạo presigned URL cho chính chủ userId & tenantId
    const { uploadUrl, s3Key } = await uploadService.requestUploadUrl({
      tenantId,
      userId,
      fileName: fileName || 'upload.jpg',
      contentType: contentType || 'image/jpeg',
    });

    // 2. PUT ảnh lên S3
    const imageBuffer = Buffer.from(base64Data, 'base64');
    await uploadService.uploadImageViaPresignedUrl(uploadUrl, imageBuffer, contentType || 'image/jpeg');

    return res.status(200).json({
      success: true,
      message: 'Image uploaded to S3 successfully via Presigned PUT URL',
      data: { tenantId, userId, s3Key },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getPresignedUrl,
  getDownloadUrl,
  uploadDirectFromBackend,
};
