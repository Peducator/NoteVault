const jwt = require('jsonwebtoken');
const config = require('../config/env');
const redis = require('../config/redis');

/**
 * Middleware xác thực Access Token (20 phút)
 * - Kiểm tra chữ ký và thời hạn của token
 * - Kiểm tra thu hồi (revoked token do logout) trong Redis
 * - Giải mã và gắn thông tin req.user = { id, email, tenantId, role }
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token is required (Bearer token)',
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);

    // Kiểm tra xem token đã bị thu hồi do Đăng xuất (Logout) hay chưa
    try {
      if (redis.status === 'ready' || redis.status === 'connecting') {
        const isRevoked = await redis.get(`revoked_access_token:${token}`);
        if (isRevoked) {
          return res.status(401).json({
            success: false,
            code: 'TOKEN_REVOKED',
            message: 'Phiên đăng nhập đã kết thúc (Token đã đăng xuất). Vui lòng đăng nhập lại.',
          });
        }
      }
    } catch (redisErr) {
      // Bỏ qua lỗi kết nối redis tạm thời để không crash request
    }

    // Gắn thông tin user chính chủ đã giải mã vào req (bao gồm cả uuid, companyUuid, tenantId và role)
    req.user = {
      id: decoded.userId,
      uuid: decoded.userUuid || null,
      email: decoded.email,
      tenantId: decoded.tenantId || null,
      companyUuid: decoded.companyUuid || null,
      role: decoded.role || 'USER',
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Access token đã hết hạn (20 phút). Vui lòng dùng Refresh Token để cấp mới.',
      });
    }

    return res.status(403).json({
      success: false,
      message: 'Token không hợp lệ hoặc chữ ký sai',
    });
  }
};

/**
 * Middleware phân quyền chỉ dành riêng cho Quản trị viên (Admin)
 */
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Thao tác yêu cầu quyền Quản trị viên (Admin)',
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
};
