const request = require('supertest');
const app = require('../../app');
const prisma = require('../config/prisma');
const redis = require('../config/redis');

describe('Join Team (Redis Pending 3 Days) & Admin Approval Workflow', () => {
  let tenantId;
  let adminToken;
  let adminUser;
  let regularToken;

  beforeAll(async () => {
    if (redis.status !== 'ready' && redis.status !== 'connecting') {
      await redis.connect();
    }

    // 1. Tạo Tenant công ty mẫu
    const tenant = await prisma.tenant.upsert({
      where: { code: 'vinfast-test' },
      update: {},
      create: {
        companyName: 'VinFast Auto Ltd',
        code: 'vinfast-test',
      },
    });
    tenantId = tenant.id;

    // 2. Tạo Admin user
    const adminRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'admin_jt@vinfast.vn',
        password: 'Password123!',
        tenantId,
        name: 'Trần Tổng Quản',
        role: 'ADMIN',
      });
    adminUser = adminRes.body.data;

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin_jt@vinfast.vn',
        password: 'Password123!',
      });
    adminToken = adminLogin.body.data.accessToken;

    // 3. Tạo Regular user
    await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'reg_jt@vinfast.vn',
        password: 'Password123!',
        tenantId,
        name: 'Nguyễn Văn Reg',
        role: 'USER',
      });

    const regLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'reg_jt@vinfast.vn',
        password: 'Password123!',
      });
    regularToken = regLogin.body.data.accessToken;
  });

  afterAll(async () => {
    // Dọn dẹp dữ liệu DB
    await prisma.departmentBudget.deleteMany({
      where: { tenantId },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'admin_jt@vinfast.vn',
            'reg_jt@vinfast.vn',
            'applicant_denied@vinfast.vn',
            'applicant_approved@vinfast.vn',
          ],
        },
      },
    });
    await prisma.tenant.deleteMany({
      where: { id: tenantId },
    });

    // Dọn dẹp Redis
    await redis.del(`tenant:${tenantId}:join_requests`);
    await redis.quit();
    await prisma.$disconnect();
  });

  // ========================================================
  // 1. GỬI YÊU CẦU GIA NHẬP (JOIN TEAM) QUA REDIS
  // ========================================================
  describe('POST /api/auth/join-team & GET /api/auth/companies', () => {
    it('0. Lấy danh sách công ty có sẵn trong Database để hiển thị thanh tìm kiếm', async () => {
      const res = await request(app).get('/api/auth/companies');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const companyCodes = res.body.data.map((c) => c.code);
      expect(companyCodes).toContain('vinfast-test');
    });

    it('1. Báo lỗi 400 nếu thiếu thông tin bắt buộc (email, password, name)', async () => {
      const res = await request(app)
        .post('/api/auth/join-team')
        .send({
          email: 'test@vinfast.vn',
          // Thiếu password và name
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Vui lòng cung cấp đầy đủ');
    });

    it('2. Báo lỗi 409 nếu email đã tồn tại trong Database', async () => {
      const res = await request(app)
        .post('/api/auth/join-team')
        .send({
          email: 'admin_jt@vinfast.vn',
          password: 'Password123!',
          name: 'Fake Admin',
          tenantId,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('đã tồn tại');
    });

    it('3. Gửi yêu cầu gia nhập thành công: Không cần nhập mã nhân viên, NoteVault tự cấp mã NV-xxxxxx, lưu Redis 3 ngày', async () => {
      const res = await request(app)
        .post('/api/auth/join-team')
        .send({
          email: 'applicant_denied@vinfast.vn',
          password: 'Password123!',
          name: 'Trần Văn Denied',
          department: 'Marketing',
          tenantId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.requestId).toBeDefined();
      expect(res.body.data.trackingToken).toBeDefined();
      expect(res.body.data.employeeCode).toMatch(/^NV-[A-F0-9]{6}$/);

      const reqId = res.body.data.requestId;

      // 🔥 Kiểm tra Redis: Dữ liệu tạm phải tồn tại trong Redis với TTL 3 ngày (<= 259200s)
      const rawInRedis = await redis.get(`join_request:${reqId}`);
      expect(rawInRedis).not.toBeNull();
      const parsed = JSON.parse(rawInRedis);
      expect(parsed.email).toBe('applicant_denied@vinfast.vn');
      expect(parsed.employeeCode).toMatch(/^NV-[A-F0-9]{6}$/);

      const ttl = await redis.ttl(`join_request:${reqId}`);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(3 * 24 * 60 * 60);

      // 🔥 Kiểm tra Set Redis
      const isMember = await redis.sismember(`tenant:${tenantId}:join_requests`, reqId);
      expect(isMember).toBe(1);

      // 🔥 Tuyệt đối KHÔNG có bản ghi nào trong Database PostgreSQL
      const userInDb = await prisma.user.findUnique({
        where: { email: 'applicant_denied@vinfast.vn' },
      });
      expect(userInDb).toBeNull();
    });
  });

  // ========================================================
  // 2. ADMIN XEM & TỪ CHỐI ĐƠN GIA NHẬP (DENIED - XÓA SẠCH REDIS)
  // ========================================================
  describe('Admin View & Reject Join Requests', () => {
    let deniedRequestId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/join-team')
        .send({
          email: 'applicant_denied@vinfast.vn',
          password: 'Password123!',
          name: 'Trần Văn Denied',
          employeeCode: 'VF-101',
          department: 'Marketing',
          tenantId,
        });
      deniedRequestId = res.body.data.requestId;
    });

    it('4. User thường KHÔNG THỂ xem danh sách join requests (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/users/join-requests')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(403);
    });

    it('5. Admin xem danh sách join requests thành công (Password bị ẩn)', async () => {
      const res = await request(app)
        .get('/api/users/join-requests')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const item = res.body.data.find((r) => r.requestId === deniedRequestId);
      expect(item).toBeDefined();
      expect(item.email).toBe('applicant_denied@vinfast.vn');
      expect(item.password).toBeUndefined(); // Bảo mật: không lộ hash mật khẩu
    });

    it('6. Admin từ chối đơn: XÓA SẠCH KHỎI REDIS (DEL + SREM), KHÔNG LƯU RÁC VÀO DB', async () => {
      const res = await request(app)
        .delete(`/api/users/join-requests/${deniedRequestId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('xóa sạch');

      // 🔥 Kiểm tra Redis: Đã bị xóa vĩnh viễn
      const rawInRedis = await redis.get(`join_request:${deniedRequestId}`);
      expect(rawInRedis).toBeNull();

      const isMember = await redis.sismember(`tenant:${tenantId}:join_requests`, deniedRequestId);
      expect(isMember).toBe(0);

      // 🔥 Kiểm tra Database: Vẫn là null, không lưu rác
      const userInDb = await prisma.user.findUnique({
        where: { email: 'applicant_denied@vinfast.vn' },
      });
      expect(userInDb).toBeNull();
    });
  });

  // ========================================================
  // 3. ADMIN PHÊ DUYỆT ĐƠN (APPROVED - ĐẨY THẲNG VÀO POSTGRES)
  // ========================================================
  describe('Admin Approve Join Request', () => {
    let approvedRequestId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/join-team')
        .send({
          email: 'applicant_approved@vinfast.vn',
          password: 'Password123!',
          name: 'Hoàng Văn Approved',
          employeeCode: 'VF-888',
          department: 'Kỹ thuật',
          tenantId,
        });
      approvedRequestId = res.body.data.requestId;
    });

    it('7. Admin phê duyệt đơn: Tạo user trong PostgreSQL, cấp Role & Phòng ban, dọn sạch Redis', async () => {
      const res = await request(app)
        .post(`/api/users/join-requests/${approvedRequestId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'USER',
          department: 'Kỹ thuật',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('applicant_approved@vinfast.vn');
      expect(res.body.data.role).toBe('USER');
      expect(res.body.data.department).toBe('Kỹ thuật');
      expect(res.body.data.employeeCode).toBe('VF-888');

      // 🔥 Kiểm tra DB: User chính thức có mặt trong DB
      const dbUser = await prisma.user.findUnique({
        where: { email: 'applicant_approved@vinfast.vn' },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser.tenantId).toBe(tenantId);
      expect(dbUser.employeeCode).toBe('VF-888');
      expect(dbUser.department).toBe('Kỹ thuật');

      // 🔥 Kiểm tra Redis: Đã dọn sạch sau khi duyệt
      const rawInRedis = await redis.get(`join_request:${approvedRequestId}`);
      expect(rawInRedis).toBeNull();
      const isMember = await redis.sismember(`tenant:${tenantId}:join_requests`, approvedRequestId);
      expect(isMember).toBe(0);
    });

    it('8. User vừa được phê duyệt có thể đăng nhập bình thường vào hệ thống', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'applicant_approved@vinfast.vn',
          password: 'Password123!',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.data.user.email).toBe('applicant_approved@vinfast.vn');
      expect(loginRes.body.data).toHaveProperty('accessToken');
    });

    it('9. User vừa được phê duyệt xuất hiện trong danh sách Quản lý nhân viên của Admin', async () => {
      const listRes = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      const emails = listRes.body.data.map((u) => u.email);
      expect(emails).toContain('applicant_approved@vinfast.vn');
    });
  });

  // ========================================================
  // 4. ADMIN XEM PHÒNG BAN & NGÂN SÁCH ĐÃ PHÂN BỔ
  // ========================================================
  describe('GET /api/users/departments-overview', () => {
    it('10. Admin xem tổng quan phòng ban kèm ngân sách phân bổ', async () => {
      const res = await request(app)
        .get('/api/users/departments-overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const kyThuat = res.body.data.find((d) => d.departmentName === 'Kỹ thuật');
      expect(kyThuat).toBeDefined();
      expect(kyThuat.memberCount).toBeGreaterThanOrEqual(1);
      expect(kyThuat.allowance).toBeDefined();
    });
  });

  // ========================================================
  // 5. ĐĂNG XUẤT XÓA SẠCH TOKEN (ACCESS & REFRESH) KHỎI REDIS
  // ========================================================
  describe('POST /api/auth/logout - Xóa sạch Access & Refresh Token', () => {
    it('11. Đăng xuất thu hồi token: Redis xóa sạch cả access & refresh token, chặn tái sử dụng', async () => {
      // Đăng nhập để lấy cặp token mới
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'applicant_approved@vinfast.vn',
          password: 'Password123!',
        });

      const { accessToken, refreshToken } = loginRes.body.data;

      // Đảm bảo ban đầu token tồn tại trong Redis
      expect(await redis.get(`access_token:${accessToken}`)).not.toBeNull();
      expect(await redis.get(`refresh_token:${refreshToken}`)).not.toBeNull();

      // Gọi Logout gửi kèm cả accessToken và refreshToken
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken, accessToken });

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // 🔥 Kiểm tra Redis: Cả access_token và refresh_token đều đã bị xóa
      expect(await redis.get(`access_token:${accessToken}`)).toBeNull();
      expect(await redis.get(`refresh_token:${refreshToken}`)).toBeNull();

      // 🔥 Gọi lại API với accessToken cũ -> Phải bị từ chối 401 do TOKEN_REVOKED
      const profileRes = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(profileRes.status).toBe(401);
      expect(profileRes.body.code).toBe('TOKEN_REVOKED');
    });
  });
});
