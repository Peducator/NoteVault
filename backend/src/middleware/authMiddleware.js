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
      role: decoded.role || 'MEMBER',
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
 * Middleware phân quyền chỉ dành riêng cho quyền ROOT có liên quan tới Tenant
 * - Bắt buộc tài khoản có role là 'ROOT'
 * - Bắt buộc phải thuộc một tenant hợp lệ (req.user.tenantId)
 * - Chỉ ROOT thuộc chính tenant đó mới được xem và thao tác trên tài nguyên của tenant
 */
const requireRoot = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Yêu cầu xác thực tài khoản',
    });
  }

  if (req.user.role !== 'ROOT') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Thao tác yêu cầu quyền ROOT cấp công ty',
    });
  }

  if (!req.user.tenantId) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Tài khoản ROOT chưa được liên kết với bất kỳ doanh nghiệp nào',
    });
  }

  // Kiểm tra tính tương thích Tenant: Chỉ ROOT liên quan tới tenant đó mới được coi / thao tác
  const targetTenantId = req.params?.tenantId || req.query?.tenantId || req.body?.tenantId || req.headers?.['x-tenant-id'];
  if (targetTenantId !== undefined && targetTenantId !== null && targetTenantId !== '') {
    const parsedTarget = Number(targetTenantId);
    if (!isNaN(parsedTarget) && parsedTarget !== Number(req.user.tenantId)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Chỉ ROOT liên quan tới doanh nghiệp này mới được quyền truy cập',
      });
    }
  }

  if (req.params?.companyUuid && req.user.companyUuid && req.params.companyUuid !== req.user.companyUuid) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Chỉ ROOT liên quan tới doanh nghiệp này mới được quyền truy cập',
    });
  }

  next();
};

/**
 * Middleware phân quyền Quản trị viên (ROOT hoặc ADMIN) có liên quan tới Tenant
 * - Bắt buộc vai trò là 'ROOT' hoặc 'ADMIN'
 * - Bắt buộc phải thuộc một tenant hợp lệ (req.user.tenantId)
 * - Chỉ ROOT và ADMIN liên quan tới chính tenant đó mới được coi và đụng chạm
 */
const requireAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Yêu cầu xác thực tài khoản',
    });
  }

  if (!req.user.tenantId) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Tài khoản chưa được liên kết với bất kỳ doanh nghiệp nào',
    });
  }

  // 1. Kiểm tra vai trò trực tiếp: ROOT hoặc ADMIN
  let isAuthorizedAdmin = req.user.role === 'ROOT' || req.user.role === 'ADMIN';

  // 2. Nếu là MEMBER nhưng là Quản lý/Owner của một đơn vị (unit.ownerId === user.id)
  if (!isAuthorizedAdmin && req.user.tenantId) {
    try {
      const prisma = require('../config/prisma');
      const ownedUnit = await prisma.unit.findFirst({
        where: {
          ownerId: Number(req.user.id),
          tenantId: Number(req.user.tenantId),
          deletedAt: null,
        },
      });
      if (ownedUnit) {
        isAuthorizedAdmin = true;
      } else {
        const editMembership = await prisma.unitMember.findFirst({
          where: {
            userId: Number(req.user.id),
            role: 'EDIT',
            unit: { tenantId: Number(req.user.tenantId), deletedAt: null },
          },
        });
        if (editMembership) {
          isAuthorizedAdmin = true;
        }
      }
    } catch (err) {
      // Bỏ qua lỗi query DB
    }
  }

  if (!isAuthorizedAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Thao tác yêu cầu quyền Quản trị viên (ROOT/Admin)',
    });
  }

  // Kiểm tra tính tương thích Tenant: Chỉ ROOT và Admin liên quan tới tenant này mới được đụng chạm
  const targetTenantId = req.params?.tenantId || req.query?.tenantId || req.body?.tenantId || req.headers?.['x-tenant-id'];
  if (targetTenantId !== undefined && targetTenantId !== null && targetTenantId !== '') {
    const parsedTarget = Number(targetTenantId);
    if (!isNaN(parsedTarget) && parsedTarget !== Number(req.user.tenantId)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Bạn chỉ có quyền quản trị đối với doanh nghiệp của mình',
      });
    }
  }

  if (req.params?.companyUuid && req.user.companyUuid && req.params.companyUuid !== req.user.companyUuid) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Bạn chỉ có quyền quản trị đối với doanh nghiệp của mình',
    });
  }

  next();
};

/**
 * Middleware kiểm tra quyền Quản lý của nhóm (Unit Owner) hoặc quyền ROOT thuộc chính Tenant đó
 */
const requireUnitAdminOrRoot = async (req, res, next) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Tài khoản chưa được liên kết với bất kỳ doanh nghiệp nào',
      });
    }

    const unitId = Number(req.params.id);
    if (!unitId || isNaN(unitId) || unitId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID đơn vị không hợp lệ',
      });
    }

    const prisma = require('../config/prisma');
    const unit = await prisma.unit.findFirst({
      where: {
        id: unitId,
        tenantId: Number(req.user.tenantId),
        deletedAt: null,
      },
    });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn vị hoặc đơn vị không thuộc doanh nghiệp của bạn',
      });
    }

    // ROOT thuộc chính tenant này được toàn quyền
    if (req.user?.role === 'ROOT') {
      req.unit = unit;
      return next();
    }

    // Unit Owner (Admin quản lý nhóm) thuộc chính unit này
    if (unit.ownerId === req.user.id) {
      req.unit = unit;
      return next();
    }

    // Hoặc là cấp Cha ở trên (Ancestor Owner trong cây tổ chức)
    const { canManageUnit } = require('../unit/unitTreeHelper');
    const isAncestorManager = await canManageUnit(req.user.id, unitId, Number(req.user.tenantId));
    if (isAncestorManager) {
      req.unit = unit;
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Forbidden: Thao tác yêu cầu quyền ROOT, Quản lý (Admin) hoặc cấp Cha ở trên của đơn vị này',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi kiểm tra quyền quản lý đơn vị',
    });
  }
};

/**
 * Rate Limiter cho tạo đơn vị: 1 lần mỗi 2 phút cho mỗi tài khoản
 */
const unitCreateRateMap = new Map();
const unitCreateRateLimiter = (req, res, next) => {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  const userId = req.user?.id;
  if (!userId) return next();
  const now = Date.now();
  const last = unitCreateRateMap.get(userId);
  const TWO_MINUTES = 2 * 60 * 1000;
  if (last && (now - last) < TWO_MINUTES) {
    const waitSeconds = Math.ceil((TWO_MINUTES - (now - last)) / 1000);
    return res.status(429).json({
      success: false,
      message: `Bạn thao tác quá nhanh. Thao tác tạo đơn vị chỉ được phép thực hiện 1 lần mỗi 2 phút (chờ thêm ${waitSeconds}s).`,
    });
  }
  unitCreateRateMap.set(userId, now);
  next();
};

module.exports = {
  authenticateToken,
  requireRoot,
  requireAdmin,
  requireUnitAdminOrRoot,
  unitCreateRateLimiter,
};

