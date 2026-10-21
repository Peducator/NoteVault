const request = require('supertest');
const app = require('../../app');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const prisma = require('../config/prisma');

describe('Notification API & Anti Cross-Unit Snooping Tests (/api/notifications)', () => {
  let user1Token;
  let user2Token;
  let rootToken;

  beforeAll(() => {
    user1Token = jwt.sign(
      { userId: 1, email: 'user1@fpt.com', tenantId: 10, role: 'MEMBER' },
      config.jwt.secret,
      { expiresIn: '20m' }
    );
    user2Token = jwt.sign(
      { userId: 2, email: 'user2@fpt.com', tenantId: 10, role: 'MEMBER' },
      config.jwt.secret,
      { expiresIn: '20m' }
    );
    rootToken = jwt.sign(
      { userId: 99, email: 'root@fpt.com', tenantId: 10, role: 'ROOT' },
      config.jwt.secret,
      { expiresIn: '20m' }
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/notifications Authentication & Isolation', () => {
    it('chặn 401 nếu không có Bearer token', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('cho phép user lấy thông báo của chính mình', async () => {
      jest.spyOn(prisma.notification, 'count').mockResolvedValue(0);
      jest.spyOn(prisma.notification, 'findMany').mockResolvedValue([]);

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toEqual([]);
    });

    it('chặn cross-unit khi user 1 cố tình đọc lén thông báo của user 2 (?userId=2)', async () => {
      // Mock user 1 thuộc unit 10, user 2 thuộc unit 20 (khác đơn vị)
      jest.spyOn(prisma.user, 'findFirst')
        .mockResolvedValueOnce({ id: 1, tenantId: 10, unitId: 10, role: 'MEMBER' }) // requester
        .mockResolvedValueOnce({ id: 2, tenantId: 10, unitId: 20, role: 'MEMBER' }); // target

      jest.spyOn(prisma.unit, 'findFirst').mockResolvedValue({
        id: 20,
        tenantId: 10,
        ownerId: 88, // Owner là người khác
        parentId: null,
      });

      const res = await request(app)
        .get('/api/notifications?userId=2')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/không quản lý người dùng này|Cross-unit/i);
    });

    it('cho phép ROOT đọc thông báo của cấp dưới trong tenant', async () => {
      jest.spyOn(prisma.notification, 'count').mockResolvedValue(1);
      jest.spyOn(prisma.notification, 'findMany').mockResolvedValue([
        { id: 1, userId: 2, title: 'Thông báo', message: 'Cấp tiền', isRead: false },
      ]);

      const res = await request(app)
        .get('/api/notifications?userId=2')
        .set('Authorization', `Bearer ${rootToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBe(1);
    });
  });
});
