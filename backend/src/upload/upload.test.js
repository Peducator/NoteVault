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

  describe('Kiểm tra bảo mật bộ ba userId - tenantId - unitId (Chống đọc lén & vi phạm ranh giới)', () => {
    const prisma = require('../config/prisma');
    let rootToken;
    let otherUserToken;

    beforeAll(() => {
      rootToken = jwt.sign(
        { userId: 99, email: 'root@fpt.com', tenantId: 10, role: 'ROOT' },
        config.jwt.secret,
        { expiresIn: '20m' }
      );
      otherUserToken = jwt.sign(
        { userId: 5, email: 'other@fpt.com', tenantId: 10, role: 'MEMBER' },
        config.jwt.secret,
        { expiresIn: '20m' }
      );
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('POST /api/upload/presigned-url với unitId', () => {
      it('chặn nếu unitId thuộc về tenant khác (Cross-tenant unit)', async () => {
        jest.spyOn(prisma.unit, 'findFirst').mockResolvedValue({
          id: 50,
          tenantId: 999, // Thuộc tenant khác
          ownerId: 2,
        });

        const res = await request(app)
          .post('/api/upload/presigned-url')
          .set('Authorization', `Bearer ${userTokenWithTenant}`)
          .send({
            fileName: 'invoice.png',
            contentType: 'image/png',
            unitId: 50,
          });

        expect(res.statusCode).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/không thuộc doanh nghiệp/i);
      });

      it('chặn nếu user không thuộc unit và không phải quản lý unit', async () => {
        jest.spyOn(prisma.unit, 'findFirst').mockResolvedValue({
          id: 30,
          tenantId: 10,
          ownerId: 88, // Owner là người khác
          parentId: null,
        });
        jest.spyOn(prisma.user, 'findFirst').mockResolvedValue({
          id: 2,
          unitId: 15, // User thuộc unit 15, không phải 30
        });

        const res = await request(app)
          .post('/api/upload/presigned-url')
          .set('Authorization', `Bearer ${userTokenWithTenant}`)
          .send({
            fileName: 'invoice.png',
            contentType: 'image/png',
            unitId: 30,
          });

        expect(res.statusCode).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/không có quyền tạo hoặc thao tác/i);
      });

      it('cho phép tạo link upload nếu user là thành viên của unit', async () => {
        jest.spyOn(prisma.unit, 'findFirst').mockResolvedValue({
          id: 15,
          tenantId: 10,
          ownerId: 88,
          parentId: null,
        });
        jest.spyOn(prisma.user, 'findFirst').mockResolvedValue({
          id: 2,
          unitId: 15,
        });

        const res = await request(app)
          .post('/api/upload/presigned-url')
          .set('Authorization', `Bearer ${userTokenWithTenant}`)
          .send({
            fileName: 'invoice.png',
            contentType: 'image/png',
            unitId: 15,
          });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.unitId).toBe(15);
        expect(res.body.data.tenantId).toBe(10);
      });

      it('cho phép ROOT tạo link upload trong bất kỳ unit nào của tenant', async () => {
        jest.spyOn(prisma.unit, 'findFirst').mockResolvedValue({
          id: 40,
          tenantId: 10,
          ownerId: 88,
          parentId: null,
        });

        const res = await request(app)
          .post('/api/upload/presigned-url')
          .set('Authorization', `Bearer ${rootToken}`)
          .send({
            fileName: 'root_upload.png',
            contentType: 'image/png',
            unitId: 40,
          });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.unitId).toBe(40);
      });
    });

    describe('GET /api/upload/download-url (Chống đọc lén hóa đơn người khác)', () => {
      it('chặn user khác đơn vị đọc lén hóa đơn của transaction', async () => {
        const secretS3Key = `tenants/10/users/2/receipts/${todayStr}/confidential.jpg`;
        jest.spyOn(prisma.transaction, 'findFirst').mockResolvedValue({
          id: 101,
          tenantId: 10,
          unitId: 15,
          userId: 2, // Tạo bởi user 2 trong unit 15
          s3Key: secretS3Key,
          unit: { id: 15, ownerId: 88, parentId: null },
        });
        jest.spyOn(prisma.user, 'findFirst').mockResolvedValue({
          id: 5,
          unitId: 20, // User 5 thuộc unit 20
        });

        // User 5 cố tình tải ảnh của User 2
        const res = await request(app)
          .get('/api/upload/download-url')
          .set('Authorization', `Bearer ${otherUserToken}`)
          .query({ s3Key: secretS3Key });

        expect(res.statusCode).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Hóa đơn thuộc đơn vị hoặc người dùng khác/i);
      });

      it('cho phép Quản lý unit (Unit Owner) xem hóa đơn của thành viên trong unit', async () => {
        const memberS3Key = `tenants/10/users/2/receipts/${todayStr}/member_bill.jpg`;
        const managerToken = jwt.sign(
          { userId: 88, email: 'manager@fpt.com', tenantId: 10, role: 'MEMBER' },
          config.jwt.secret,
          { expiresIn: '20m' }
        );

        jest.spyOn(prisma.transaction, 'findFirst').mockResolvedValue({
          id: 102,
          tenantId: 10,
          unitId: 15,
          userId: 2,
          s3Key: memberS3Key,
          unit: { id: 15, ownerId: 88, parentId: null }, // Manager 88 là owner của unit 15
        });

        const res = await request(app)
          .get('/api/upload/download-url')
          .set('Authorization', `Bearer ${managerToken}`)
          .query({ s3Key: memberS3Key });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.s3Key).toBe(memberS3Key);
      });

      it('cho phép ROOT của tenant xem hóa đơn để kiểm toán', async () => {
        const memberS3Key = `tenants/10/users/2/receipts/${todayStr}/member_bill.jpg`;

        jest.spyOn(prisma.transaction, 'findFirst').mockResolvedValue({
          id: 102,
          tenantId: 10,
          unitId: 15,
          userId: 2,
          s3Key: memberS3Key,
          unit: { id: 15, ownerId: 88, parentId: null },
        });

        const res = await request(app)
          .get('/api/upload/download-url')
          .set('Authorization', `Bearer ${rootToken}`)
          .query({ s3Key: memberS3Key });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.s3Key).toBe(memberS3Key);
      });
    });

    describe('POST /api/upload/direct (Upload trực tiếp qua Backend)', () => {
      const uploadService = require('./uploadService');

      it('chặn nếu unitId thuộc về tenant khác', async () => {
        jest.spyOn(prisma.unit, 'findFirst').mockResolvedValue({
          id: 999,
          tenantId: 888, // Khác tenant 10
        });

        const res = await request(app)
          .post('/api/upload/direct')
          .set('Authorization', `Bearer ${userTokenWithTenant}`)
          .send({
            fileName: 'direct_bill.jpg',
            contentType: 'image/jpeg',
            base64Data: 'dummybase64',
            unitId: 999,
          });

        expect(res.statusCode).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/không thuộc doanh nghiệp/i);
      });

      it('thành công upload trực tiếp khi đầy đủ userId, tenantId và unitId hợp lệ', async () => {
        jest.spyOn(prisma.unit, 'findFirst').mockResolvedValue({
          id: 15,
          tenantId: 10,
          ownerId: 2, // User 2 là owner
          parentId: null,
        });
        jest.spyOn(uploadService, 'uploadImageViaPresignedUrl').mockResolvedValue({
          success: true,
          statusCode: 200,
        });

        const res = await request(app)
          .post('/api/upload/direct')
          .set('Authorization', `Bearer ${userTokenWithTenant}`)
          .send({
            fileName: 'direct_bill.jpg',
            contentType: 'image/jpeg',
            base64Data: 'dGVzdA==',
            unitId: 15,
          });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.userId).toBe(2);
        expect(res.body.data.tenantId).toBe(10);
        expect(res.body.data.unitId).toBe(15);
        expect(res.body.data.s3Key).toMatch(/^tenants\/10\/users\/2\/receipts\//);
      });
    });
  });
});
