const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { findUserByEmail, findUserById, createUser } = require('./userModel');
const config = require('../config/env');
const redis = require('../config/redis');

const JWT_SECRET = config.jwt.secret;
const JWT_REFRESH_SECRET = config.jwt.refreshSecret;
const ACCESS_EXPIRES_IN = config.jwt.accessTokenExpiresIn; // 20m
const REFRESH_EXPIRES_IN = config.jwt.refreshTokenExpiresIn; // 7d

// Thời gian hết hạn tính theo giây cho Redis TTL
const ACCESS_TOKEN_TTL_SECONDS = 20 * 60; // 20 phút = 1200s
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 ngày = 604800s

/**
 * Helper kết nối Redis nếu chưa mở
 */
const ensureRedis = async () => {
  if (redis.status !== 'ready' && redis.status !== 'connecting') {
    await redis.connect();
  }
};

// Signup service - hỗ trợ đăng ký kèm tenantId hoặc tên công ty mới (companyName)
const signup = async ({ email, password, tenantId, companyName, name, role }) => {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    const error = new Error('User already exists');
    error.statusCode = 409;
    throw error;
  }

  let resolvedTenantId = tenantId ? Number(tenantId) : null;

  // Nếu client truyền companyName, tự động tạo mới Tenant hoặc tìm Tenant có sẵn
  if (companyName && !resolvedTenantId) {
    const prisma = require('../config/prisma');
    const slug = companyName.toLowerCase().trim().replace(/\s+/g, '-');
    const tenant = await prisma.tenant.upsert({
      where: { code: slug },
      update: { companyName: companyName.trim() },
      create: {
        companyName: companyName.trim(),
        code: slug,
      },
    });
    resolvedTenantId = tenant.id;
  }

  const resolvedRole = role || (companyName ? 'ADMIN' : 'USER');

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const newUser = await createUser({
    email,
    password: hashedPassword,
    tenantId: resolvedTenantId,
    name: name || null,
    role: resolvedRole,
  });

  return newUser;
};

// Login service - cấp Access Token (20p) và Refresh Token (7 ngày) lưu vào Redis kèm tenantId
const login = async ({ email, password }) => {
  if (!email || !password) {
    const error = new Error('Email and password are required');
    error.statusCode = 400;
    throw error;
  }

  const user = await findUserByEmail(email);
  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  if (user.deletedAt) {
    const error = new Error('Tài khoản đã bị xóa hoặc vô hiệu hóa');
    error.statusCode = 403;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Tự động gán UUID v4 nếu bản ghi cũ chưa có uuid
  const crypto = require('crypto');
  const prisma = require('../config/prisma');
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

  const tokenPayload = {
    userId: user.id,
    userUuid: user.uuid,
    email: user.email,
    tenantId: user.tenantId || null,
    companyUuid: user.tenant ? user.tenant.uuid : null,
    role: user.role || 'USER',
  };

  // 1. Cấp Access Token (hạn 20 phút)
  const accessToken = jwt.sign(
    tokenPayload,
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );

  // 2. Cấp Refresh Token (hạn 7 ngày)
  const refreshToken = jwt.sign(
    { userId: user.id, userUuid: user.uuid, tenantId: user.tenantId || null, companyUuid: user.tenant ? user.tenant.uuid : null, role: user.role || 'USER' },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );

  // 3. LƯU CẢ ACCESS TOKEN VÀ REFRESH TOKEN VÀO REDIS VỚI TTL TỰ ĐỘNG HỦY
  await ensureRedis();
  
  await redis.set(
    `access_token:${accessToken}`,
    JSON.stringify(tokenPayload),
    'EX',
    ACCESS_TOKEN_TTL_SECONDS
  );

  await redis.set(
    `refresh_token:${refreshToken}`,
    JSON.stringify(tokenPayload),
    'EX',
    REFRESH_TOKEN_TTL_SECONDS
  );

  return {
    user: {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      name: user.name,
      employeeCode: user.employeeCode,
      role: user.role,
      tenantId: user.tenantId,
      companyUuid: user.tenant ? user.tenant.uuid : null,
      companyName: user.tenant ? user.tenant.companyName : null,
      tenant: user.tenant ? {
        id: user.tenant.id,
        uuid: user.tenant.uuid,
        companyName: user.tenant.companyName,
        code: user.tenant.code,
      } : null,
      createdAt: user.createdAt,
    },
    accessToken,
    refreshToken,
    token: accessToken,
    expiresIn: ACCESS_EXPIRES_IN,
  };
};

// Refresh token service - kiểm tra Refresh Token trực tiếp từ REDIS
const refreshAccessToken = async ({ refreshToken }) => {
  if (!refreshToken) {
    const error = new Error('refreshToken is required');
    error.statusCode = 400;
    throw error;
  }

  await ensureRedis();

  // 1. Kiểm tra tồn tại trong Redis
  const rawTokenData = await redis.get(`refresh_token:${refreshToken}`);
  if (!rawTokenData) {
    const error = new Error('Refresh token không tồn tại trong Redis hoặc đã hết hạn');
    error.statusCode = 403;
    throw error;
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    const user = await findUserById(decoded.userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.deletedAt) {
      const error = new Error('Tài khoản đã bị xóa hoặc vô hiệu hóa');
      error.statusCode = 403;
      throw error;
    }

    const tokenPayload = {
      userId: user.id,
      userUuid: user.uuid,
      email: user.email,
      tenantId: user.tenantId || null,
      companyUuid: user.tenant ? user.tenant.uuid : null,
      role: user.role || 'USER',
    };

    // 2. Cấp Access Token mới (20 phút)
    const newAccessToken = jwt.sign(
      tokenPayload,
      JWT_SECRET,
      { expiresIn: ACCESS_EXPIRES_IN }
    );

    // Lưu Access Token mới vào Redis
    await redis.set(
      `access_token:${newAccessToken}`,
      JSON.stringify(tokenPayload),
      'EX',
      ACCESS_TOKEN_TTL_SECONDS
    );

    return {
      accessToken: newAccessToken,
      token: newAccessToken,
      expiresIn: ACCESS_EXPIRES_IN,
    };
  } catch (err) {
    const error = new Error(err.message || 'Refresh token không hợp lệ');
    error.statusCode = 403;
    throw error;
  }
};

// Logout service - xóa ngay lập tức token khỏi Redis (Thu hồi quyền lập tức)
const logout = async (refreshToken, accessToken) => {
  await ensureRedis();
  if (refreshToken) {
    await redis.del(`refresh_token:${refreshToken}`);
  }
  if (accessToken) {
    await redis.del(`access_token:${accessToken}`);
    // Lưu blacklist để authenticateToken từ chối lập tức
    await redis.set(`revoked_access_token:${accessToken}`, '1', 'EX', ACCESS_TOKEN_TTL_SECONDS);
  }
  return { message: 'Logged out successfully' };
};

// Lấy danh sách công ty (Tenants) có sẵn trong database để người dùng chọn/tìm kiếm
const getCompanies = async () => {
  const prisma = require('../config/prisma');
  const companies = await prisma.tenant.findMany({
    select: {
      id: true,
      companyName: true,
      code: true,
    },
    orderBy: {
      companyName: 'asc',
    },
  });
  return companies;
};

// Join team service - lưu yêu cầu vào Redis với TTL 3 ngày (259.200 giây)
// Bỏ yêu cầu nhập mã nhân viên (NoteVault tự sinh mã dựa trên hash token)
const joinTeam = async ({ email, password, name, employeeCode, department, tenantId, companyCode }) => {
  if (!email || !password || !name) {
    const error = new Error('Vui lòng cung cấp đầy đủ: Email, Mật khẩu và Họ tên');
    error.statusCode = 400;
    throw error;
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    const error = new Error('Tài khoản với email này đã tồn tại trong hệ thống');
    error.statusCode = 409;
    throw error;
  }

  const prisma = require('../config/prisma');
  let resolvedTenantId = tenantId ? Number(tenantId) : null;

  if (!resolvedTenantId && companyCode) {
    const tenant = await prisma.tenant.findUnique({
      where: { code: companyCode.toLowerCase().trim() },
    });
    if (tenant) resolvedTenantId = tenant.id;
  }

  if (!resolvedTenantId) {
    const firstTenant = await prisma.tenant.findFirst();
    if (firstTenant) {
      resolvedTenantId = firstTenant.id;
    } else {
      const defaultTenant = await prisma.tenant.create({
        data: { companyName: 'VinFast Auto', code: 'vinfast' },
      });
      resolvedTenantId = defaultTenant.id;
    }
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const crypto = require('crypto');
  const requestId = 'req_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);

  // NoteVault tự động cấp mã nhân viên dựa trên mã băm jwt token / crypto hash
  const hashSuffix = crypto.createHash('sha256').update(email.toLowerCase() + Date.now()).digest('hex').slice(0, 6).toUpperCase();
  const autoEmployeeCode = employeeCode ? employeeCode.trim().toUpperCase() : `NV-${hashSuffix}`;

  const requestPayload = {
    requestId,
    email: email.trim().toLowerCase(),
    password: hashedPassword,
    name: name.trim(),
    employeeCode: autoEmployeeCode,
    department: (department || 'Marketing').trim(),
    tenantId: resolvedTenantId,
    createdAt: new Date().toISOString(),
  };

  await ensureRedis();

  // Lưu vào Redis với TTL 3 ngày (3 * 24 * 3600 = 259.200 giây)
  const THREE_DAYS_SECONDS = 3 * 24 * 60 * 60;
  await redis.set(
    `join_request:${requestId}`,
    JSON.stringify(requestPayload),
    'EX',
    THREE_DAYS_SECONDS
  );

  // Thêm vào tập hợp chỉ mục theo Tenant
  await redis.sadd(`tenant:${resolvedTenantId}:join_requests`, requestId);

  // Ký token tạm 3 ngày để nhân viên có thể tra cứu
  const trackingToken = jwt.sign(
    { requestId, email: requestPayload.email, tenantId: resolvedTenantId, employeeCode: autoEmployeeCode },
    JWT_SECRET,
    { expiresIn: '3d' }
  );

  return {
    requestId,
    employeeCode: requestPayload.employeeCode,
    trackingToken,
    message: 'Yêu cầu gia nhập đã được gửi tới Quản trị viên (hạn phê duyệt 3 ngày)',
    data: {
      requestId,
      email: requestPayload.email,
      name: requestPayload.name,
      employeeCode: requestPayload.employeeCode,
      department: requestPayload.department,
      tenantId: resolvedTenantId,
    },
  };
};

module.exports = {
  signup,
  login,
  logout,
  refreshAccessToken,
  joinTeam,
  getCompanies,
};

