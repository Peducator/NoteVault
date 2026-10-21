const request = require('supertest');
const app = require('../../app');
const prisma = require('../config/prisma');
const redis = require('../config/redis');

const { cleanDatabase } = require('../testDb');

describe('Auth Service & API Tests with Prisma Client & Redis Verification', () => {
  beforeAll(async () => {
    if (redis.status !== 'ready' && redis.status !== 'connecting') {
      await redis.connect();
    }
  });

  beforeEach(async () => {
    // 1. Dùng cleanDatabase xóa sạch theo đúng thứ tự FK
    await cleanDatabase();
    // 2. Dọn sạch cache Redis
    await redis.flushdb();
  });

  afterAll(async () => {
    // Ngắt kết nối Prisma và Redis sau khi test xong
    await prisma.$disconnect();
    await redis.quit();
  });

  describe('POST /api/auth/signup', () => {
    it('đăng ký thành công và DÙNG PRISMA CLIENT QUERY THUẦN kiểm tra Database đã lưu user', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'lan@notevault.com',
          password: 'Password@123',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.email).toBe('lan@notevault.com');

      // 🔥 DÙNG PRISMA CLIENT QUERY XEM DATABASE ĐÃ LƯU USER CHƯA
      const userInDb = await prisma.user.findUnique({
        where: { email: 'lan@notevault.com' },
      });

      expect(userInDb).not.toBeNull();
      expect(userInDb.email).toBe('lan@notevault.com');
      expect(userInDb.id).toBe(res.body.data.id);
      // Mật khẩu trong DB phải được băm bằng bcrypt
      expect(userInDb.password).not.toBe('Password@123');
      expect(userInDb.password).toMatch(/^\$2[aby]\$/);
    });

    it('đăng ký kèm tên công ty (companyName) -> tự động tạo Tenant và gắn tenantId cho User', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'ceo@vinfast.vn',
          password: 'Password@123',
          companyName: 'VinFast Auto',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tenantId).not.toBeNull();

      // Kiểm tra trong Postgres đã tạo bản ghi Tenant
      const tenant = await prisma.tenant.findUnique({
        where: { id: res.body.data.tenantId },
      });
      expect(tenant).not.toBeNull();
      expect(tenant.companyName).toBe('VinFast Auto');
    });

    it('should fail if email or password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'lan@notevault.com',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail if user already exists', async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'lan@notevault.com',
          password: 'Password@123',
        });

      const duplicateRes = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'lan@notevault.com',
          password: 'DifferentPassword456',
        });

      expect(duplicateRes.statusCode).toBe(409);
      expect(duplicateRes.body.success).toBe(false);
      expect(duplicateRes.body.message).toMatch(/already exists/i);
    });
  });

  describe('POST /api/auth/login & Redis Token Storage', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'lan@notevault.com',
          password: 'Password@123',
        });
    });

    it('đăng nhập thành công và KIỂM TRA TRỰC TIẾP REDIS đã lưu cả accessToken và refreshToken', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'lan@notevault.com',
          password: 'Password@123',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');

      const { accessToken, refreshToken } = res.body.data;

      // 🔥 KIỂM TRA REDIS: Access token phải tồn tại trong Redis và có TTL (20 phút = 1200s)
      const rawAccessToken = await redis.get(`access_token:${accessToken}`);
      expect(rawAccessToken).not.toBeNull();
      const accessTokenTtl = await redis.ttl(`access_token:${accessToken}`);
      expect(accessTokenTtl).toBeGreaterThan(0);
      expect(accessTokenTtl).toBeLessThanOrEqual(1200);

      // 🔥 KIỂM TRA REDIS: Refresh token phải tồn tại trong Redis và có TTL (7 ngày = 604800s)
      const rawRefreshToken = await redis.get(`refresh_token:${refreshToken}`);
      expect(rawRefreshToken).not.toBeNull();
      const refreshTokenTtl = await redis.ttl(`refresh_token:${refreshToken}`);
      expect(refreshTokenTtl).toBeGreaterThan(0);
      expect(refreshTokenTtl).toBeLessThanOrEqual(7 * 24 * 60 * 60);

      const parsedRefresh = JSON.parse(rawRefreshToken);
      expect(parsedRefresh.email).toBe('lan@notevault.com');
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'lan@notevault.com',
          password: 'WrongPassword',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });
  });

  describe('POST /api/auth/refresh & POST /api/auth/logout with Redis', () => {
    let refreshToken;
    let accessToken;

    beforeEach(async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'lan@notevault.com',
          password: 'Password@123',
        });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'lan@notevault.com',
          password: 'Password@123',
        });

      refreshToken = loginRes.body.data.refreshToken;
      accessToken = loginRes.body.data.accessToken;
    });

    it('cấp lại accessToken mới dựa trên refreshToken trong Redis', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      // Token mới được lưu vào Redis
      const cachedNewToken = await redis.get(`access_token:${res.body.data.accessToken}`);
      expect(cachedNewToken).not.toBeNull();
    });

    it('đăng xuất thành công và XÓA SẠCH TOKEN KHỎI REDIS', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      expect(res.statusCode).toBe(200);
      // Đảm bảo token trong Redis đã bị xóa
      const checkRevoked = await redis.get(`refresh_token:${refreshToken}`);
      expect(checkRevoked).toBeNull();
    });
  });
});
