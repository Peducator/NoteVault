const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');

/**
 * 1. Lấy thông tin cá nhân của chính mình (Mọi user đã đăng nhập)
 */
const getProfile = async (userId) => {
  const user = await prisma.user.findFirst({
    where: {
      id: Number(userId),
      deletedAt: null,
    },
    select: {
      id: true,
      uuid: true,
      email: true,
      name: true,
      employeeCode: true,
      unitId: true,
      unit: {
        select: {
          id: true,
          name: true,
          parentId: true,
          ownerId: true,
        },
      },
      ownedUnits: {
        select: {
          id: true,
          name: true,
          parentId: true,
        },
      },
      unitMemberships: {
        include: {
          unit: {
            select: {
              id: true,
              name: true,
              parentId: true,
              ownerId: true,
              allowMemberViewBalance: true,
              allowCreateSubUnit: true,
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
      },
      role: true,
      tenantId: true,
      tenant: {
        select: {
          id: true,
          uuid: true,
          companyName: true,
          code: true,
        },
      },
      createdAt: true,
    },
  });

  if (!user) {
    const error = new Error('Người dùng không tồn tại hoặc đã bị xóa');
    error.statusCode = 404;
    throw error;
  }

  // Tự động gán UUID v4 nếu chưa có
  const crypto = require('crypto');
  if (!user.uuid) {
    user.uuid = crypto.randomUUID();
    await prisma.user.update({
      where: { id: user.id },
      data: { uuid: user.uuid },
    });
  }
  if (user.tenant && !user.tenant.uuid) {
    user.tenant.uuid = crypto.randomUUID();
    await prisma.tenant.update({
      where: { id: user.tenant.id },
      data: { uuid: user.tenant.uuid },
    });
  }

  if (user.unitId) {
    try {
      const { calculateSafeBalance } = require('../unit/unitService');
      const safeBal = await calculateSafeBalance(user.unitId);
      if (user.unit) {
        user.unit.safeBalance = safeBal.toString();
      }
    } catch (e) {
      // Ignore if calculation encounters edge case
    }
  }

  // Hợp nhất danh sách nhóm mà user tham gia
  const groupMap = new Map();
  if (user.unit) {
    groupMap.set(user.unit.id, {
      id: user.unit.id,
      name: user.unit.name,
      parentId: user.unit.parentId,
      ownerId: user.unit.ownerId,
      isOwner: user.unit.ownerId === user.id,
    });
  }
  if (user.unitMemberships) {
    user.unitMemberships.forEach((m) => {
      if (m.unit) {
        groupMap.set(m.unit.id, {
          id: m.unit.id,
          name: m.unit.name,
          parentId: m.unit.parentId,
          ownerId: m.unit.ownerId,
          isOwner: m.unit.ownerId === user.id,
          joinedAt: m.joinedAt,
        });
      }
    });
  }
  user.groups = Array.from(groupMap.values());

  return user;
};

/**
 * 2. Cập nhật thông tin cá nhân của chính mình (User thuần)
 * Chỉ cho phép đổi name hoặc đổi mật khẩu. Tuyệt đối không cho phép đổi role hay tenantId.
 */
const updateProfile = async (userId, { name, password }) => {
  const existingUser = await prisma.user.findFirst({
    where: {
      id: Number(userId),
      deletedAt: null,
    },
  });

  if (!existingUser) {
    const error = new Error('Người dùng không tồn tại hoặc đã bị xóa');
    error.statusCode = 404;
    throw error;
  }

  const updateData = {};
  if (name !== undefined) {
    updateData.name = name ? String(name).trim() : null;
  }

  if (password) {
    if (password.length < 6) {
      const error = new Error('Mật khẩu mới phải có tối thiểu 6 ký tự');
      error.statusCode = 400;
      throw error;
    }
    const saltRounds = 10;
    updateData.password = await bcrypt.hash(password, saltRounds);
  }

  const updatedUser = await prisma.user.update({
    where: { id: Number(userId) },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tenantId: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

/**
 * 3. Tạo nhân viên mới trong cùng tổ chức/tenant (Chỉ dành cho ADMIN)
 */
const createEmployee = async ({ adminTenantId, email, password, name, role, department, employeeCode, unitId }) => {
  if (!email || !password) {
    const error = new Error('Email và mật khẩu là bắt buộc');
    error.statusCode = 400;
    throw error;
  }

  if (password.length < 6) {
    const error = new Error('Mật khẩu phải có tối thiểu 6 ký tự');
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await prisma.user.findFirst({
    where: { email: normalizedEmail },
  });

  if (existing) {
    if (existing.deletedAt) {
      const error = new Error('Email này thuộc tài khoản đã bị xóa trước đó. Vui lòng liên hệ hỗ trợ để khôi phục.');
      error.statusCode = 409;
      throw error;
    }
    const error = new Error('Email nhân viên này đã tồn tại trong hệ thống');
    error.statusCode = 409;
    throw error;
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const crypto = require('crypto');
  const genCode = employeeCode ? String(employeeCode).trim() : `NV-${Math.floor(100000 + Math.random() * 900000)}`;

  // Kiểm tra unitId thuộc cùng tenant của admin (chống cross-tenant unit)
  if (unitId && adminTenantId) {
    const unit = await prisma.unit.findFirst({
      where: { id: Number(unitId), tenantId: Number(adminTenantId), deletedAt: null },
    });
    if (!unit) {
      const error = new Error('Đơn vị (unitId) không tồn tại hoặc không thuộc doanh nghiệp của bạn');
      error.statusCode = 400;
      throw error;
    }
  }

  const newEmployee = await prisma.user.create({
    data: {
      uuid: crypto.randomUUID(),
      email: normalizedEmail,
      password: hashedPassword,
      name: name ? String(name).trim() : null,
      employeeCode: genCode,
      unitId: unitId ? Number(unitId) : null,
      role: (role === 'ROOT' || role === 'ADMIN') ? 'ROOT' : 'MEMBER',
      tenantId: adminTenantId ? Number(adminTenantId) : null,
    },
    select: {
      id: true,
      uuid: true,
      email: true,
      name: true,
      employeeCode: true,
      unitId: true,
      role: true,
      tenantId: true,
      createdAt: true,
    },
  });

  return newEmployee;
};

/**
 * 4. Lấy danh sách nhân viên trong tenant
 * Tự động lọc bỏ các nhân viên đã bị xóa mềm (deletedAt !== null)
 */
const getEmployees = async ({ adminTenantId, search }) => {
  const whereClause = {
    deletedAt: null,
  };

  if (adminTenantId) {
    whereClause.tenantId = Number(adminTenantId);
  }

  if (search) {
    whereClause.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
      { employeeCode: { contains: search, mode: 'insensitive' } },
    ];
  }

  const employees = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      uuid: true,
      email: true,
      name: true,
      employeeCode: true,
      unitId: true,
      unit: {
        select: {
          id: true,
          name: true,
          parentId: true,
        },
      },
      ownedUnits: {
        select: {
          id: true,
          name: true,
        },
      },
      role: true,
      tenantId: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Tự động gán uuid & employeeCode cho các bản ghi cũ nếu thiếu
  const crypto = require('crypto');
  for (const emp of employees) {
    if (!emp.uuid || !emp.employeeCode) {
      const updateData = {};
      if (!emp.uuid) {
        emp.uuid = crypto.randomUUID();
        updateData.uuid = emp.uuid;
      }
      if (!emp.employeeCode) {
        emp.employeeCode = `NV-${Math.floor(100000 + Math.random() * 900000)}`;
        updateData.employeeCode = emp.employeeCode;
      }
      await prisma.user.update({
        where: { id: emp.id },
        data: updateData,
      });
    }
  }

  return employees;
};

/**
 * 5. Xóa mềm (soft delete) nhân viên trong tenant (Chỉ dành cho ADMIN)
 * Đặt deletedAt = new Date(), không xóa vĩnh viễn trong DB để bảo toàn dữ liệu giao dịch hóa đơn.
 */
const softDeleteEmployee = async ({ adminUserId, adminTenantId, targetUserId }) => {
  const targetId = Number(targetUserId);

  if (adminUserId === targetId) {
    const error = new Error('Quản trị viên không thể tự xóa tài khoản của chính mình');
    error.statusCode = 400;
    throw error;
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      id: targetId,
      deletedAt: null,
    },
  });

  if (!targetUser) {
    const error = new Error('Nhân viên không tồn tại hoặc đã bị xóa');
    error.statusCode = 404;
    throw error;
  }

  // Bảo mật Multi-tenant: Admin chỉ được xóa nhân viên trong cùng công ty
  if (adminTenantId && targetUser.tenantId !== Number(adminTenantId)) {
    const error = new Error('Bạn không có quyền xóa nhân viên của doanh nghiệp khác');
    error.statusCode = 403;
    throw error;
  }

  await prisma.user.update({
    where: { id: targetId },
    data: {
      deletedAt: new Date(),
    },
  });

  return { message: 'Đã xóa nhân viên thành công (Xóa mềm)' };
};

const redis = require('../config/redis');
const ensureRedis = async () => {
  if (redis.status !== 'ready' && redis.status !== 'connecting') {
    await redis.connect();
  }
};

/**
 * 6. Lấy danh sách yêu cầu gia nhập (Join Requests) đang chờ duyệt từ Redis
 */
const getJoinRequests = async (tenantId) => {
  await ensureRedis();
  const requestIds = await redis.smembers(`tenant:${tenantId}:join_requests`);

  if (!requestIds || requestIds.length === 0) {
    return [];
  }

  const keys = requestIds.map((id) => `join_request:${id}`);
  const rawList = await redis.mget(keys);

  const pendingRequests = [];
  for (let i = 0; i < requestIds.length; i++) {
    const raw = rawList[i];
    const id = requestIds[i];

    if (!raw) {
      // Đã hết hạn TTL 3 ngày -> tự động gỡ khỏi Set
      await redis.srem(`tenant:${tenantId}:join_requests`, id);
    } else {
      try {
        const parsed = JSON.parse(raw);
        // Không gửi hash mật khẩu về phía client
        delete parsed.password;
        pendingRequests.push(parsed);
      } catch (e) {
        // bỏ qua parse error
      }
    }
  }

  return pendingRequests;
};

/**
 * 7. Phê duyệt (Approve) đơn gia nhập:
 * Đẩy thẳng user vào bảng users trong PostgreSQL và xóa sạch khỏi Redis
 */
const approveJoinRequest = async (tenantId, requestId, { role, department } = {}) => {
  await ensureRedis();
  const raw = await redis.get(`join_request:${requestId}`);

  if (!raw) {
    const error = new Error('Yêu cầu gia nhập không tồn tại hoặc đã hết hạn');
    error.statusCode = 404;
    throw error;
  }

  const data = JSON.parse(raw);

  const crypto = require('crypto');
  const genCode = data.employeeCode || `NV-${Math.floor(100000 + Math.random() * 900000)}`;

  // Tạo user chính thức vào PostgreSQL
  const newUser = await prisma.user.create({
    data: {
      uuid: crypto.randomUUID(),
      email: data.email,
      password: data.password, // Đã băm bcrypt sẵn
      name: data.name,
      employeeCode: genCode,
      role: (role === 'ROOT' || role === 'ADMIN') ? 'ROOT' : 'MEMBER',
      tenantId: Number(tenantId),
    },
    select: {
      id: true,
      uuid: true,
      email: true,
      name: true,
      employeeCode: true,
      role: true,
      tenantId: true,
      createdAt: true,
    },
  });

  // Dọn sạch khỏi Redis (0 byte rác)
  await redis.del(`join_request:${requestId}`);
  await redis.srem(`tenant:${tenantId}:join_requests`, requestId);

  return {
    ...newUser,
    department: department || data.department || 'Kỹ thuật',
  };
};

/**
 * 8. Từ chối (Denied) đơn gia nhập:
 * Xóa vĩnh viễn khỏi Redis, không lưu bất kỳ thông tin rác nào vào Database
 */
const rejectJoinRequest = async (tenantId, requestId) => {
  await ensureRedis();
  await redis.del(`join_request:${requestId}`);
  await redis.srem(`tenant:${tenantId}:join_requests`, requestId);

  return { message: 'Đã từ chối và xóa sạch yêu cầu gia nhập' };
};

/**
 * 9. Lấy danh sách nhân viên theo phòng ban & ngân sách phân bổ
 */
const getDepartmentsOverview = async (tenantId) => {
  const units = await prisma.unit.findMany({
    where: {
      tenantId: Number(tenantId),
    },
    include: {
      members: {
        where: { deletedAt: null },
        select: {
          id: true,
          uuid: true,
          email: true,
          name: true,
          employeeCode: true,
          role: true,
          createdAt: true,
        },
      },
    },
  });

  if (units.length > 0) {
    return units.map((u) => ({
      departmentName: u.name,
      allowance: 20000000,
      memberCount: u.members.length,
      members: u.members,
    }));
  }

  const users = await prisma.user.findMany({
    where: {
      tenantId: Number(tenantId),
      deletedAt: null,
    },
    select: {
      id: true,
      uuid: true,
      email: true,
      name: true,
      employeeCode: true,
      role: true,
      createdAt: true,
    },
  });

  const defaultDepartments = ['Marketing', 'Kỹ thuật', 'Kinh doanh', 'Nhân sự'];
  return defaultDepartments.map((dept) => ({
    departmentName: dept,
    allowance: 20000000,
    memberCount: users.length,
    members: users,
  }));
};

/**
 * 10. Lấy thông tin ngữ cảnh Admin Doanh nghiệp theo cặp UUID:
 * URL: /:companyUuid/:userUuid/admin
 * Che giấu hoàn toàn Sequential DB ID, phòng chống IDOR
 */
const getAdminContext = async ({ companyUuid, userUuid, requesterUserUuid, requesterUserId, requesterTenantId }) => {
  // Kiểm tra bảo mật: UUID của thằng cầm Token PHẢI GIỐNG VỚI UUID của admin trên URL
  if (requesterUserUuid && requesterUserUuid !== userUuid) {
    const error = new Error('Truy cập bị từ chối: UUID trong Token không khớp với UUID Quản trị viên trên URL');
    error.statusCode = 403;
    throw error;
  }

  // 1. Tìm Tenant theo UUID
  const tenant = await prisma.tenant.findUnique({
    where: { uuid: companyUuid },
    select: {
      id: true,
      uuid: true,
      companyName: true,
      code: true,
      createdAt: true,
    },
  });

  if (!tenant) {
    const error = new Error('Doanh nghiệp không tồn tại hoặc UUID không hợp lệ');
    error.statusCode = 404;
    throw error;
  }

  // 2. Tìm User Admin theo UUID
  const adminUser = await prisma.user.findFirst({
    where: {
      uuid: userUuid,
      deletedAt: null,
    },
    select: {
      id: true,
      uuid: true,
      email: true,
      name: true,
      employeeCode: true,
      role: true,
      tenantId: true,
      createdAt: true,
      unit: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!adminUser) {
    const error = new Error('Người dùng quản trị không tồn tại');
    error.statusCode = 404;
    throw error;
  }

  // Kiểm tra phụ nếu token cũ chưa có userUuid:
  if (requesterUserId && requesterUserId !== adminUser.id) {
    const error = new Error('Truy cập bị từ chối: Bạn không phải là Quản trị viên này');
    error.statusCode = 403;
    throw error;
  }

  // 3. Kiểm tra User có thuộc Tenant này không và có vai trò ADMIN không
  if (adminUser.tenantId !== tenant.id) {
    const error = new Error('Người dùng không thuộc doanh nghiệp này');
    error.statusCode = 403;
    throw error;
  }

  if (adminUser.role !== 'ADMIN' && adminUser.role !== 'ROOT') {
    const error = new Error('Tài khoản này không có quyền Quản trị viên (ADMIN/ROOT)');
    error.statusCode = 403;
    throw error;
  }

  // 4. Multi-tenant isolation: requester chỉ được xem tenant của chính mình
  if (requesterTenantId && requesterTenantId !== tenant.id) {
    const error = new Error('Bạn không có quyền truy cập dữ liệu của doanh nghiệp khác');
    error.statusCode = 403;
    throw error;
  }

  // 5. Lấy danh sách nhân viên
  const employees = await getEmployees({ adminTenantId: tenant.id });

  // 6. Lấy danh sách yêu cầu gia nhập (Join Requests) từ Redis
  let joinRequests = [];
  try {
    joinRequests = await getJoinRequests(tenant.id);
  } catch (e) {
    joinRequests = [];
  }

  // 7. Lấy tổng quan phòng ban
  const departmentsOverview = await getDepartmentsOverview(tenant.id);

  return {
    tenant: {
      companyName: tenant.companyName,
      code: tenant.code,
      uuid: tenant.uuid,
      createdAt: tenant.createdAt,
      totalEmployees: employees.length,
    },
    admin: {
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role,
      uuid: adminUser.uuid,
      employeeCode: adminUser.employeeCode,
      department: adminUser.unit?.name || 'Ban Quản Trị',
    },
    employees,
    joinRequests,
    departmentsOverview,
  };
};

/**
 * 8. Lấy danh sách tất cả các nhóm/đơn vị mà user đang tham gia hoặc sở hữu
 */
const getUserUnits = async (userId, tenantId) => {
  const resolvedUserId = Number(userId);
  const resolvedTenantId = Number(tenantId);

  const [memberships, ownedUnits, user] = await Promise.all([
    prisma.unitMember.findMany({
      where: {
        userId: resolvedUserId,
        unit: { tenantId: resolvedTenantId, deletedAt: null },
      },
      include: {
        unit: {
          select: {
            id: true,
            name: true,
            parentId: true,
            ownerId: true,
            allowMemberViewBalance: true,
            allowCreateSubUnit: true,
            owner: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    }),
    prisma.unit.findMany({
      where: {
        ownerId: resolvedUserId,
        tenantId: resolvedTenantId,
        deletedAt: null,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.user.findFirst({
      where: { id: resolvedUserId, tenantId: resolvedTenantId, deletedAt: null },
      include: {
        unit: {
          include: {
            owner: { select: { id: true, name: true, email: true } },
          },
        },
      },
    }),
  ]);

  if (!user) {
    const error = new Error('Người dùng không tồn tại');
    error.statusCode = 404;
    throw error;
  }

  const unitMap = new Map();

  // Nhập từ user.unit nếu có
  if (user.unit && !user.unit.deletedAt) {
    unitMap.set(user.unit.id, {
      id: user.unit.id,
      name: user.unit.name,
      parentId: user.unit.parentId,
      ownerId: user.unit.ownerId,
      owner: user.unit.owner,
      isOwner: user.unit.ownerId === resolvedUserId,
      allowMemberViewBalance: user.unit.allowMemberViewBalance,
      allowCreateSubUnit: user.unit.allowCreateSubUnit,
    });
  }

  // Nhập từ ownedUnits
  ownedUnits.forEach((u) => {
    unitMap.set(u.id, {
      id: u.id,
      name: u.name,
      parentId: u.parentId,
      ownerId: u.ownerId,
      owner: u.owner,
      isOwner: true,
      allowMemberViewBalance: u.allowMemberViewBalance,
      allowCreateSubUnit: u.allowCreateSubUnit,
    });
  });

  // Nhập từ memberships
  memberships.forEach((m) => {
    if (m.unit) {
      unitMap.set(m.unit.id, {
        id: m.unit.id,
        name: m.unit.name,
        parentId: m.unit.parentId,
        ownerId: m.unit.ownerId,
        owner: m.unit.owner,
        isOwner: m.unit.ownerId === resolvedUserId,
        allowMemberViewBalance: m.unit.allowMemberViewBalance,
        allowCreateSubUnit: m.unit.allowCreateSubUnit,
        joinedAt: m.joinedAt,
      });
    }
  });

  return Array.from(unitMap.values());
};

module.exports = {
  getProfile,
  updateProfile,
  createEmployee,
  getEmployees,
  softDeleteEmployee,
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  getDepartmentsOverview,
  getAdminContext,
  getUserUnits,
};
