const uploadService = require('./uploadService');

/**
 * Controller sinh presigned URL để client PUT file ảnh lên S3
 * POST /api/upload/presigned-url
 * Body: { "fileName": "bill.jpg", "contentType": "image/jpeg", "unitId": 5 }
 * Bắt buộc lấy userId và tenantId từ token chính chủ (req.user)
 * Kiểm tra chặt chẽ: userId chỉ được phép tạo link trong những unit mà nó thuộc về hoặc quản lý trên cùng tenantId
 */
const getPresignedUrl = async (req, res) => {
  try {
    const { fileName, contentType, fileSize, unitId } = req.body;
    
    // BẢO MẬT: Bắt buộc lấy userId và tenantId từ Access Token chính chủ đã giải mã
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId || null;
    const userRole = req.user?.role || 'MEMBER';

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User identifier not found in token',
      });
    }

    let targetUnitId = unitId !== undefined && unitId !== null && unitId !== '' ? Number(unitId) : null;

    if (tenantId) {
      if (targetUnitId) {
        // Kiểm tra quyền hạn của user trong unit được chỉ định
        await uploadService.validateUserUnitAccess({
          userId,
          tenantId,
          unitId: targetUnitId,
          userRole,
        });
      } else {
        // Lấy unitId mặc định của user nếu không chỉ định trong body
        const userInDb = await uploadService.getUserUnitInfo(userId, tenantId);
        if (userInDb?.unitId) {
          targetUnitId = userInDb.unitId;
        }
      }
    }

    const result = await uploadService.requestUploadUrl({
      tenantId,
      userId,
      unitId: targetUnitId,
      fileName,
      contentType,
      fileSize,
      userRole,
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
 * Kiểm tra: userId, tenantId và unitId tương ứng phải thuộc về người đó, tránh đọc lén hóa đơn người khác
 */
const getDownloadUrl = async (req, res) => {
  try {
    const { s3Key, uploadId, ext, transactionId } = req.query;
    
    // BẢO MẬT: Lấy userId, tenantId, role từ Access Token chính chủ
    const authenticatedUserId = req.user?.id;
    const authenticatedTenantId = req.user?.tenantId || null;
    const authenticatedRole = req.user?.role || 'MEMBER';

    if (!authenticatedUserId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User identifier not found in token',
      });
    }

    if (!s3Key && !uploadId && !transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Cần cung cấp s3Key, uploadId hoặc transactionId',
      });
    }

    // Kiểm tra quyền hạn tải/xem hóa đơn: tenantId - unitId - userId
    await uploadService.validateDownloadPermission({
      userId: authenticatedUserId,
      tenantId: authenticatedTenantId,
      userRole: authenticatedRole,
      s3Key,
      uploadId,
      transactionId,
    });

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
 * Yêu cầu: Kiểm tra đủ userId, tenantId và chọn đúng unitId để gửi lên S3
 */
const uploadDirectFromBackend = async (req, res) => {
  try {
    const { fileName, contentType, base64Data, unitId } = req.body;
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId || null;
    const userRole = req.user?.role || 'MEMBER';

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User identifier not found in token',
      });
    }

    if (!base64Data) {
      return res.status(400).json({ success: false, message: 'base64Data is required' });
    }

    let targetUnitId = unitId !== undefined && unitId !== null && unitId !== '' ? Number(unitId) : null;

    if (tenantId) {
      if (targetUnitId) {
        await uploadService.validateUserUnitAccess({
          userId,
          tenantId,
          unitId: targetUnitId,
          userRole,
        });
      } else {
        const userInDb = await uploadService.getUserUnitInfo(userId, tenantId);
        if (userInDb?.unitId) {
          targetUnitId = userInDb.unitId;
        }
      }
    }

    // 1. Tạo presigned URL cho chính chủ userId, tenantId và unitId
    const { uploadUrl, s3Key } = await uploadService.requestUploadUrl({
      tenantId,
      userId,
      unitId: targetUnitId,
      fileName: fileName || 'upload.jpg',
      contentType: contentType || 'image/jpeg',
      userRole,
    });

    // 2. PUT ảnh lên S3
    const imageBuffer = Buffer.from(base64Data, 'base64');
    await uploadService.uploadImageViaPresignedUrl(uploadUrl, imageBuffer, contentType || 'image/jpeg');

    return res.status(200).json({
      success: true,
      message: 'Image uploaded to S3 successfully via Presigned PUT URL',
      data: { tenantId, userId, unitId: targetUnitId, s3Key },
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
