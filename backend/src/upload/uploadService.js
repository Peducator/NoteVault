const { getUploadPresignedUrl, getDownloadPresignedUrl } = require('../config/s3');
const { validateUploadMetadata, validateImageBuffer } = require('./uploadValidator');
const { getLatestUploadByUserId, createUploadRecord } = require('./uploadModel');
const crypto = require('crypto');

/**
 * Helper sinh chuỗi ngày theo định dạng YYYY-MM-DD
 */
const getFormattedDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Service xử lý tạo presigned URL cho upload ảnh
 * S3 Key format mới theo Multi-tenant và ngày tháng:
 * - Có tenant: tenants/{tenantId}/users/{userId}/receipts/{YYYY-MM-DD}/{randomId}.{ext}
 * - Không có tenant: users/{userId}/receipts/{YYYY-MM-DD}/{randomId}.{ext}
 */
const requestUploadUrl = async ({ tenantId, userId, fileName, contentType = 'image/jpeg', fileSize }) => {
  if (!userId) {
    const error = new Error('userId là bắt buộc để quản lý đường dẫn người dùng');
    error.statusCode = 400;
    throw error;
  }

  // 1. Validate thông tin upload (định dạng, kích thước tối đa 5MB)
  validateUploadMetadata({ fileName, contentType, fileSize });

  // 2. Lấy đuôi mở rộng file (.jpg, .png, .webp)
  const ext = fileName && fileName.includes('.') 
    ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase() 
    : '.jpg';

  // 3. Format ngày tháng YYYY-MM-DD
  const dateStr = getFormattedDate();

  // 4. Định danh duy nhất cho file (UUID ngẫu nhiên)
  const fileUniqueId = crypto.randomUUID();

  // 5. Cấu trúc S3 Key mới: tenants/{tenantId}/users/{userId}/receipts/{YYYY-MM-DD}/{uuid}.{ext}
  const prefix = tenantId ? `tenants/${tenantId}/users/${userId}` : `users/${userId}`;
  const s3Key = `${prefix}/receipts/${dateStr}/${fileUniqueId}${ext}`;

  // 6. Lấy Presigned PUT URL từ S3 (hết hạn sau 5 phút = 300s)
  const uploadUrl = await getUploadPresignedUrl(s3Key, contentType, 300);

  // 7. Lưu metadata vào DB/Memory (nếu cần quản lý lịch sử)
  await createUploadRecord({
    userId,
    tenantId: tenantId || null,
    s3Key,
    fileName,
    contentType,
  });

  return {
    uploadUrl,
    s3Key,
    tenantId: tenantId || null,
    userId,
    date: dateStr,
    fileName: `${fileUniqueId}${ext}`,
    method: 'PUT',
    expiresInSeconds: 300,
    headers: {
      'Content-Type': contentType,
    },
  };
};

/**
 * Service lấy link xem/tải ảnh
 */
const requestDownloadUrl = async ({ tenantId, userId, uploadId, s3Key, ext = '.jpg' }) => {
  let resolvedKey = s3Key;

  // Nếu không chỉ định s3Key, tự query lấy lần upload mới nhất
  if (!resolvedKey && userId) {
    const latestUpload = await getLatestUploadByUserId(userId);
    if (!latestUpload) {
      const error = new Error('User chưa từng upload ảnh nào');
      error.statusCode = 404;
      throw error;
    }
    resolvedKey = latestUpload.s3Key;
  }

  if (!resolvedKey || resolvedKey.includes('undefined')) {
    const error = new Error('Cần cung cấp s3Key hợp lệ');
    error.statusCode = 400;
    throw error;
  }

  const downloadUrl = await getDownloadPresignedUrl(resolvedKey, 300);
  return {
    downloadUrl,
    s3Key: resolvedKey,
    expiresInSeconds: 300,
  };
};

/**
 * Helper upload trực tiếp ảnh từ backend lên S3 bằng presigned URL (dùng PUT)
 */
const uploadImageViaPresignedUrl = async (uploadUrl, imageBuffer, contentType = 'image/jpeg') => {
  validateImageBuffer(imageBuffer, contentType);

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: imageBuffer,
  });

  if (!response.ok) {
    throw new Error(`Upload to S3 failed with status: ${response.status} ${response.statusText}`);
  }

  return {
    success: true,
    statusCode: response.status,
  };
};

module.exports = {
  requestUploadUrl,
  requestDownloadUrl,
  uploadImageViaPresignedUrl,
  getFormattedDate,
};
