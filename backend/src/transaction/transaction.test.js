const request = require('supertest');
const app = require('../../app');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const prisma = require('../config/prisma');
const redis = require('../config/redis');

describe('Category & Transaction API Tests with Monthly Statement', () => {
  let userToken;
  let testUserId;
  let testCategoryId;

  beforeAll(async () => {
    // 1. Tạo test user bằng Prisma
    const testUser = await prisma.user.upsert({
      where: { email: 'transaction_test@notevault.com' },
      update: {},
      create: {
        email: 'transaction_test@notevault.com',
        password: 'hashed_password_123',
      },
    });
    testUserId = testUser.id;

    // 2. Cấp Access Token
    userToken = jwt.sign(
      { userId: testUserId, email: testUser.email },
      config.jwt.secret,
      { expiresIn: '20m' }
    );
  });

  afterAll(async () => {
    // Dọn dẹp
    await prisma.transaction.deleteMany({ where: { userId: testUserId } });
    await prisma.category.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await redis.quit();
    await prisma.$disconnect();
  });

  describe('Categories API', () => {
    it('POST /api/categories - tạo danh mục mới cho user', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Cà phê & Trà sữa',
          type: 'EXPENSE',
          icon: 'coffee',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Cà phê & Trà sữa');
      expect(res.body.data.userId).toBe(testUserId);
      testCategoryId = res.body.data.id;
    });

    it('GET /api/categories - lấy danh sách danh mục của user', async () => {
      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.some((c) => c.id === testCategoryId);
      expect(found).toBe(true);
    });
  });

  describe('Transactions & Monthly Statement API', () => {
    it('POST /api/transactions - tạo giao dịch chi tiêu kèm ảnh S3', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          categoryId: testCategoryId,
          amount: 65000,
          type: 'EXPENSE',
          note: 'Mua 2 cốc cà phê muối',
          s3Key: `users/${testUserId}/uploads/1.jpg`,
          scanStatus: 'CLEAN',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(65000);
      expect(res.body.data.userId).toBe(testUserId);
      expect(res.body.data.s3Key).toBe(`users/${testUserId}/uploads/1.jpg`);
    });

    it('POST /api/transactions - tạo thêm 1 khoản thu nhập (lương)', async () => {
      // Tạo danh mục lương
      const salaryCat = await prisma.category.create({
        data: {
          name: 'Lương tháng 10',
          type: 'INCOME',
          userId: testUserId,
        },
      });

      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          categoryId: salaryCat.id,
          amount: 15000000,
          type: 'INCOME',
          note: 'Lương công ty chuyển khoản',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.amount).toBe(15000000);
      expect(res.body.data.type).toBe('INCOME');
    });

    it('GET /api/transactions/statement/monthly - tạo sao kê tổng hợp thu chi tháng', async () => {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const res = await request(app)
        .get(`/api/transactions/statement/monthly?month=${currentMonth}&year=${currentYear}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.totalExpense).toBe(65000);
      expect(res.body.data.summary.totalIncome).toBe(15000000);
      expect(res.body.data.summary.netSavings).toBe(15000000 - 65000);
      expect(res.body.data.history.length).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(res.body.data.byCategory)).toBe(true);
    });
  });
});
