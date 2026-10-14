const request = require('supertest');
const app = require('../../app');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { uploads } = require('./uploadModel');
const { getFormattedDate } = require('./uploadService');

describe('Upload Service & API Tests with Multi-tenant & Date Formatting', () => {
  let userTokenWithoutTenant;
  let userTokenWithTenant;
  const todayStr = getFormattedDate();

  beforeAll(() => {
    // 1. User cá nhân không thuộc tenant
    userTokenWithoutTenant = jwt.sign(
      { userId: 1, email: 'lan@notevault.com', tenantId: null },
      config.jwt.secret,
      { expiresIn: '20m' }
    );

    // 2. User thuộc công ty (tenantId = 10)
    userTokenWithTenant = jwt.sign(
      { userId: 2, email: 'nhanvien@fpt.com', tenantId: 10 },
      config.jwt.secret,
      { expiresIn: '20m' }
    );
  });

  beforeEach(() => {
    uploads.length = 0;
  });

  describe('POST /api/upload/presigned-url (S3 Key with YYYY-MM-DD and Tenant)', () => {
    it('user cá nhân -> S3 Key có format: users/{userId}/receipts/YYYY-MM-DD/{uuid}.jpg', async () => {
      const res = await request(app)
        .post('/api/upload/presigned-url')
        .set('Authorization', `Bearer ${userTokenWithoutTenant}`)
        .send({
          fileName: 'hoa_don_an_trua.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(1);
      expect(res.body.data.date).toBe(todayStr);
      // Kiểm tra pattern S3 Key mới
      const regex = new RegExp(`^users/1/receipts/${todayStr}/[a-f0-9\\-]+.jpg$`);
      expect(res.body.data.s3Key).toMatch(regex);
    });

    it('user thuộc công ty -> S3 Key có format: tenants/{tenantId}/users/{userId}/receipts/YYYY-MM-DD/{uuid}.png', async () => {
      const res = await request(app)
        .post('/api/upload/presigned-url')
        .set('Authorization', `Bearer ${userTokenWithTenant}`)
        .send({
          fileName: 'hoa_don_tiep_khach.png',
          contentType: 'image/png',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tenantId).toBe(10);
      expect(res.body.data.userId).toBe(2);
      expect(res.body.data.date).toBe(todayStr);

      const regex = new RegExp(`^tenants/10/users/2/receipts/${todayStr}/[a-f0-9\\-]+.png$`);
      expect(res.body.data.s3Key).toMatch(regex);
    });

    it('bảo mật: luôn lấy userId & tenantId từ token, phớt lờ tham số truyền giả mạo qua body', async () => {
      const res = await request(app)
        .post('/api/upload/presigned-url')
        .set('Authorization', `Bearer ${userTokenWithTenant}`)
        .send({
          userId: 999, // Cố tình mạo danh
          tenantId: 999,
          fileName: 'test.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.statusCode).toBe(200);
      // Phải lấy đúng tenant 10 và user 2 từ token
      expect(res.body.data.tenantId).toBe(10);
      expect(res.body.data.userId).toBe(2);
      expect(res.body.data.s3Key).toMatch(new RegExp(`^tenants/10/users/2/receipts/`));
    });
  });

  describe('GET /api/upload/download-url', () => {
    it('cho phép xem ảnh hợp lệ của chính user', async () => {
      const myS3Key = `tenants/10/users/2/receipts/${todayStr}/bill.jpg`;
      const res = await request(app)
        .get('/api/upload/download-url')
        .set('Authorization', `Bearer ${userTokenWithTenant}`)
        .query({ s3Key: myS3Key });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.s3Key).toBe(myS3Key);
    });

    it('chặn nếu user cố tình dùng s3Key của công ty/user khác để xem trộm (Bảo vệ dữ liệu công ty)', async () => {
      // User 2 (tenant 10) cố tình xem ảnh của user 3 (tenant 20)
      const res = await request(app)
        .get('/api/upload/download-url')
        .set('Authorization', `Bearer ${userTokenWithTenant}`)
        .query({
          s3Key: `tenants/20/users/3/receipts/${todayStr}/secret_bill.jpg`,
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/không có quyền truy cập/i);
    });
  });
});
