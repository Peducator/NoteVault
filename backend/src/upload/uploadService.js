const { getUploadPresignedUrl, getDownloadPresignedUrl } = require('../config/s3');
const { validateUploadMetadata, validateImageBuffer } = require('./uploadValidator');
const { getLatestUploadByUserId, createUploadRecord, uploads } = require('./uploadModel');
const crypto = require('crypto');
const prisma = require('../config/prisma');

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
 * Lấy thông tin user và đơn vị của user từ DB
 */
const getUserUnitInfo = async (userId, tenantId) => {
  try {
    if (!prisma) return null;
    return await prisma.user.findFirst({
      where: { id: Number(userId), deletedAt: null },
      select: { id: true, tenantId: true, unitId: true, role: true },
    });
  } catch (err) {
    return null;
  }
};

/**
 * Kiểm tra tính hợp lệ của unitId và quyền hạn của user trong unit:
 * - Unit phải tồn tại và thuộc cùng tenant
 * - User phải là ROOT, Owner của unit, thành viên của unit, hoặc Owner cấp trên
 */
const validateUserUnitAccess = async ({ userId, tenantId, unitId, userRole }) => {
  if (!unitId) return { valid: true, unit: null };

  const resolvedUnitId = Number(unitId);
  if (isNaN(resolvedUnitId) || resolvedUnitId <= 0) {
    const error = new Error('unitId không hợp lệ');
    error.statusCode = 400;
    throw error;
  }

  if (!prisma) return { valid: true, unit: null };

  // 1. Kiểm tra unit có tồn tại và thuộc tenant không
  const unit = await prisma.unit.findFirst({
    where: { id: resolvedUnitId, deletedAt: null },
  });

  if (!unit) {
    const error = new Error('Đơn vị (unit) không tồn tại hoặc đã bị xóa');
    error.statusCode = 404;
    throw error;
  }

  if (tenantId && Number(unit.tenantId) !== Number(tenantId)) {
    const error = new Error('Đơn vị (unit) không thuộc doanh nghiệp (tenant) của bạn');
    error.statusCode = 403;
    throw error;
  }

  // 2. ROOT của tenant có toàn quyền trên các unit của tenant đó
  if (userRole === 'ROOT') {
    return { valid: true, unit };
  }

  // 3. User là Owner (Admin) của chính unit này
  if (Number(unit.ownerId) === Number(userId)) {
    return { valid: true, unit };
  }

  // 4. User là thành viên thuộc unit này
  const user = await prisma.user.findFirst({
    where: { id: Number(userId), deletedAt: null },
  });

  if (user && Number(user.unitId) === resolvedUnitId) {
    return { valid: true, unit };
  }

  // 5. User là Quản lý cấp trên (Owner của unit tổ tiên)
  let curr = unit;
  while (curr.parentId) {
    const parent = await prisma.unit.findFirst({
      where: { id: curr.parentId, deletedAt: null },
    });
    if (!parent) break;
    if (Number(parent.ownerId) === Number(userId)) {
      return { valid: true, unit };
    }
    curr = parent;
  }

  const error = new Error('Bạn không có quyền tạo hoặc thao tác hóa đơn trong đơn vị (unit) này');
  error.statusCode = 403;
  throw error;
};

/**
 * Kiểm tra quyền xem/tải hóa đơn:
 * - Bảo vệ đa tầng: tenantId - unitId - userId
 * - Ngăn chặn triệt để đọc lén hóa đơn của đơn vị khác hoặc tenant khác
 */
const validateDownloadPermission = async ({ userId, tenantId, userRole, s3Key, uploadId, transactionId }) => {
  const resolvedUserId = Number(userId);
  const resolvedTenantId = tenantId ? Number(tenantId) : null;

  // 1. Kiểm tra qua transactionId hoặc s3Key trong Database (bảng Transaction)
  let tx = null;
  if (prisma) {
    try {
      if (transactionId) {
        tx = await prisma.transaction.findFirst({
          where: { id: Number(transactionId) },
          include: { unit: true },
        });
      } else if (s3Key) {
        tx = await prisma.transaction.findFirst({
          where: { s3Key },
          include: { unit: true },
        });
      }
    } catch (e) {
      // Bỏ qua lỗi query DB
    }
  }

  if (tx) {
    // 1a. Kiểm tra Tenant Isolation
    if (resolvedTenantId && Number(tx.tenantId) !== resolvedTenantId) {
      const error = new Error('Bị từ chối: Hóa đơn thuộc doanh nghiệp khác!');
      error.statusCode = 403;
      throw error;
    }

    // 1b. Chính chủ tạo giao dịch -> Được quyền xem
    if (Number(tx.userId) === resolvedUserId) {
      return true;
    }

    // 1c. ROOT của tenant đó -> Được quyền xem
    if (userRole === 'ROOT' && (!resolvedTenantId || Number(tx.tenantId) === resolvedTenantId)) {
      return true;
    }

    // 1d. Quản lý của unit (ownerId) hoặc quản lý cấp trên
    if (tx.unit && Number(tx.unit.ownerId) === resolvedUserId) {
      return true;
    }
    if (tx.unit?.parentId && prisma) {
      let curr = tx.unit;
      while (curr.parentId) {
        const parent = await prisma.unit.findFirst({ where: { id: curr.parentId, deletedAt: null } });
        if (!parent) break;
        if (Number(parent.ownerId) === resolvedUserId) {
          return true;
        }
        curr = parent;
      }
    }

    // 1e. Bị từ chối nếu không thuộc đơn vị hoặc không có thẩm quyền (chống đọc lén hóa đơn)
    const error = new Error('Bị từ chối: Hóa đơn thuộc đơn vị hoặc người dùng khác, bạn không có quyền xem!');
    error.statusCode = 403;
    throw error;
  }

  // 2. Kiểm tra qua uploadModel (in-memory uploads history)
  if (s3Key && uploads && uploads.length > 0) {
    const uploadRec = uploads.find(item => item.s3Key === s3Key);
    if (uploadRec) {
      if (resolvedTenantId && uploadRec.tenantId && Number(uploadRec.tenantId) !== resolvedTenantId) {
        const error = new Error('Bị từ chối: Hóa đơn thuộc doanh nghiệp khác!');
        error.statusCode = 403;
        throw error;
      }
      if (Number(uploadRec.userId) === resolvedUserId) {
        return true;
      }
      if (userRole === 'ROOT') {
        return true;
      }
      const error = new Error('Bị từ chối: Bạn không có quyền truy cập ảnh của người dùng khác!');
      error.statusCode = 403;
      throw error;
    }
  }

  // 3. Phân tích cấu trúc s3Key qua regex pattern
  if (s3Key) {
    const tenantUnitUserRegex = /^tenants\/(\d+)\/units\/(\d+)\/users\/(\d+)\//;
    const tenantUserRegex = /^tenants\/(\d+)\/users\/(\d+)\//;
    const userRegex = /^users\/(\d+)\//;

    const matchUnit = s3Key.match(tenantUnitUserRegex);
    const matchTenant = s3Key.match(tenantUserRegex);
    const matchUser = s3Key.match(userRegex);

    if (matchUnit) {
      const keyTenantId = Number(matchUnit[1]);
      const keyUnitId = Number(matchUnit[2]);
      const keyUserId = Number(matchUnit[3]);

      if (resolvedTenantId && keyTenantId !== resolvedTenantId) {
        const error = new Error('Bị từ chối: Bạn không có quyền truy cập ảnh của doanh nghiệp khác!');
        error.statusCode = 403;
        throw error;
      }

      if (keyUserId === resolvedUserId) {
        return true;
      }

      if (userRole === 'ROOT') {
        return true;
      }

      if (prisma) {
        try {
          const unit = await prisma.unit.findFirst({ where: { id: keyUnitId, deletedAt: null } });
          if (unit && Number(unit.ownerId) === resolvedUserId) {
            return true;
          }
        } catch (e) {}
      }

      const error = new Error('Bị từ chối: Hóa đơn thuộc đơn vị hoặc người dùng khác, bạn không có quyền xem!');
      error.statusCode = 403;
      throw error;
    }

    if (matchTenant) {
      const keyTenantId = Number(matchTenant[1]);
      const keyUserId = Number(matchTenant[2]);

      if (resolvedTenantId && keyTenantId !== resolvedTenantId) {
        const error = new Error('Bị từ chối: Bạn không có quyền truy cập ảnh của doanh nghiệp khác!');
        error.statusCode = 403;
        throw error;
      }

      if (keyUserId === resolvedUserId) {
        return true;
      }

      if (userRole === 'ROOT') {
        return true;
      }

      const error = new Error('Bị từ chối: Bạn không có quyền truy cập ảnh của người dùng khác!');
      error.statusCode = 403;
      throw error;
    }

    if (matchUser) {
      const keyUserId = Number(matchUser[1]);
      if (keyUserId !== resolvedUserId) {
        const error = new Error('Bị từ chối: Bạn không có quyền truy cập ảnh của người dùng khác!');
        error.statusCode = 403;
        throw error;
      }
      return true;
    }

    const error = new Error('Bị từ chối: Đường dẫn s3Key không hợp lệ hoặc bạn không có quyền truy cập!');
    error.statusCode = 403;
    throw error;
  }

  return true;
};

/**
 * Service xử lý tạo presigned URL cho upload ảnh
 * S3 Key format theo Multi-tenant và ngày tháng:
 * - Có tenant: tenants/{tenantId}/users/{userId}/receipts/{YYYY-MM-DD}/{randomId}.{ext}
 * - Không có tenant: users/{userId}/receipts/{YYYY-MM-DD}/{randomId}.{ext}
 */
const requestUploadUrl = async ({ tenantId, userId, unitId, fileName, contentType = 'image/jpeg', fileSize, userRole }) => {
  if (!userId) {
    const error = new Error('userId là bắt buộc để quản lý đường dẫn người dùng');
    error.statusCode = 400;
    throw error;
  }

  // 1. Validate thông tin upload (định dạng, kích thước tối đa 5MB)
  validateUploadMetadata({ fileName, contentType, fileSize });

  // 2. Validate quyền trong unit nếu có unitId
  if (tenantId && unitId) {
    await validateUserUnitAccess({ userId, tenantId, unitId, userRole });
  }

  // 3. Lấy đuôi mở rộng file (.jpg, .png, .webp)
  const ext = fileName && fileName.includes('.') 
    ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase() 
    : '.jpg';

  // 4. Format ngày tháng YYYY-MM-DD
  const dateStr = getFormattedDate();

  // 5. Định danh duy nhất cho file (UUID ngẫu nhiên)
  const fileUniqueId = crypto.randomUUID();

  // 6. Cấu trúc S3 Key
  const prefix = tenantId ? `tenants/${tenantId}/users/${userId}` : `users/${userId}`;
  const s3Key = `${prefix}/receipts/${dateStr}/${fileUniqueId}${ext}`;

  // 7. Lấy Presigned PUT URL từ S3 (hết hạn sau 5 phút = 300s)
  const uploadUrl = await getUploadPresignedUrl(s3Key, contentType, 300);

  // 8. Lưu metadata vào DB/Memory (nếu cần quản lý lịch sử)
  await createUploadRecord({
    userId,
    tenantId: tenantId || null,
    unitId: unitId ? Number(unitId) : null,
    s3Key,
    fileName,
    contentType,
  });

  return {
    uploadUrl,
    s3Key,
    tenantId: tenantId || null,
    userId,
    unitId: unitId ? Number(unitId) : null,
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
  validateUserUnitAccess,
  validateDownloadPermission,
  getUserUnitInfo,
  getFormattedDate,
};
