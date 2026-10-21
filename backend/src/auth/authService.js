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

  let resolvedRole = 'MEMBER';
  if (role === 'ROOT' || role === 'ADMIN' || (!role && companyName)) {
    resolvedRole = 'ROOT';
  } else {
    resolvedRole = 'MEMBER';
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const newUser = await createUser({
    email,
    password: hashedPassword,
    tenantId: resolvedTenantId,
    name: name || null,
    role: resolvedRole,
  });

  // Tự động tạo Đơn vị gốc (Root Unit, parentId = null) cho công ty mới nếu chưa có
  if (resolvedTenantId && resolvedRole === 'ROOT') {
    const prisma = require('../config/prisma');
    const existingRoot = await prisma.unit.findFirst({
      where: { tenantId: resolvedTenantId, parentId: null, deletedAt: null },
    });
    if (!existingRoot) {
      const rootUnitName = companyName ? companyName.trim() : 'Đơn vị gốc';
      const rootUnit = await prisma.unit.create({
        data: {
          tenantId: resolvedTenantId,
          name: rootUnitName,
          parentId: null,
          ownerId: newUser.id,
          allowCreateSubUnit: true,
          allowMemberViewBalance: true,
        },
      });
      await prisma.user.update({
        where: { id: newUser.id },
        data: { unitId: rootUnit.id },
      });
      newUser.unitId = rootUnit.id;
      newUser.unit = rootUnit;
    }
  }

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
    role: user.role || 'MEMBER',
  };

  // 1. Cấp Access Token (hạn 20 phút)
  const accessToken = jwt.sign(
    tokenPayload,
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );

  // 2. Cấp Refresh Token (hạn 7 ngày)
  const refreshToken = jwt.sign(
    { userId: user.id, userUuid: user.uuid, tenantId: user.tenantId || null, companyUuid: user.tenant ? user.tenant.uuid : null, role: user.role || 'MEMBER' },
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
      role: user.role || 'MEMBER',
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

module.exports = {
  signup,
  login,
  logout,
  refreshAccessToken,
};


