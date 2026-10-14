const request = require('supertest');
const app = require('../../app');
const prisma = require('../config/prisma');
const redis = require('../config/redis');

describe('User Management API & RBAC (Admin vs Regular User)', () => {
  let tenantId;
  let adminToken;
  let adminUser;
  let regularToken;
  let regularUser;
  let createdEmployeeId;

  beforeAll(async () => {
    // 1. Tạo Tenant công ty mẫu
    const tenant = await prisma.tenant.upsert({
      where: { code: 'techcorp-test' },
      update: {},
      create: {
        companyName: 'TechCorp Vietnam',
        code: 'techcorp-test',
      },
    });
    tenantId = tenant.id;

    // 2. Tạo Admin user
    const adminRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'admin_test@techcorp.vn',
        password: 'Password123!',
        tenantId,
        name: 'Trần Admin',
        role: 'ADMIN',
      });
    adminUser = adminRes.body.data;

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin_test@techcorp.vn',
        password: 'Password123!',
      });
    adminToken = adminLogin.body.data.accessToken;

    // 3. Tạo Regular User (nhân viên bình thường)
    const regularRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'employee_test@techcorp.vn',
        password: 'Password123!',
        tenantId,
        name: 'Nguyễn Nhân Viên',
        role: 'USER',
      });
    regularUser = regularRes.body.data;

    const regularLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'employee_test@techcorp.vn',
        password: 'Password123!',
      });
    regularToken = regularLogin.body.data.accessToken;
  });

  afterAll(async () => {
    // Dọn dẹp dữ liệu test
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'admin_test@techcorp.vn',
            'employee_test@techcorp.vn',
            'new_staff@techcorp.vn',
          ],
        },
      },
    });
    await prisma.tenant.deleteMany({
      where: { code: 'techcorp-test' },
    });
    await redis.quit();
  });

  // ========================================================
  // A. USER THUẦN (REGULAR USER)
  // ========================================================
  describe('User thuần - Chỉ xem và sửa thông tin cá nhân', () => {
    it('1. User thuần xem thông tin cá nhân thành công', async () => {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('employee_test@techcorp.vn');
      expect(res.body.data.role).toBe('USER');
    });

    it('2. User thuần sửa thông tin cá nhân (name) thành công', async () => {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ name: 'Nguyễn Văn Nhân Viên (Updated)' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Nguyễn Văn Nhân Viên (Updated)');
    });

    it('3. User thuần KHÔNG THỂ truy cập danh sách quản lý nhân viên (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Admin');
    });

    it('4. User thuần KHÔNG THỂ tự ý thêm nhân viên (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          email: 'hack_staff@techcorp.vn',
          password: 'Password123!',
          name: 'Hacker',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('5. User thuần KHÔNG THỂ xóa nhân viên (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ========================================================
  // B. QUẢN TRỊ VIÊN (ADMIN ONLY)
  // ========================================================
  describe('Admin - Quản lý nhân viên (Thêm, Xem, Xóa mềm)', () => {
    it('6. Admin thêm nhân viên mới thành công vào công ty', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'new_staff@techcorp.vn',
          password: 'Password123!',
          name: 'Lê Kế Toán',
          role: 'USER',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('new_staff@techcorp.vn');
      expect(res.body.data.tenantId).toBe(tenantId);
      createdEmployeeId = res.body.data.id;
    });

    it('7. Admin xem danh sách nhân viên trong công ty', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const emails = res.body.data.map((u) => u.email);
      expect(emails).toContain('new_staff@techcorp.vn');
      expect(emails).toContain('admin_test@techcorp.vn');
    });

    it('8. Admin KHÔNG THỂ tự xóa tài khoản của chính mình', async () => {
      const res = await request(app)
        .delete(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('không thể tự xóa');
    });

    it('9. Admin xóa mềm (soft delete) nhân viên thành công', async () => {
      const res = await request(app)
        .delete(`/api/users/${createdEmployeeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Xóa mềm');

      // Kiểm tra DB: deletedAt được cập nhật, bản ghi không bị xóa mất
      const dbUser = await prisma.user.findUnique({
        where: { id: createdEmployeeId },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser.deletedAt).not.toBeNull();
    });

    it('10. Nhân viên đã bị xóa mềm KHÔNG còn xuất hiện trong danh sách của Admin', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const emails = res.body.data.map((u) => u.email);
      expect(emails).not.toContain('new_staff@techcorp.vn');
    });

    it('11. Nhân viên đã bị xóa mềm KHÔNG THỂ đăng nhập vào hệ thống', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'new_staff@techcorp.vn',
          password: 'Password123!',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('đã bị xóa');
    });

    it('12. Lấy thông tin admin-context qua UUID thành công (bảo vệ chống IDOR)', async () => {
      // Lấy profile admin để lấy UUID
      const profRes = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const compUuid = profRes.body.data.tenant.uuid;
      const admUuid = profRes.body.data.uuid;

      expect(compUuid).toBeDefined();
      expect(admUuid).toBeDefined();

      const contextRes = await request(app)
        .get(`/api/users/admin-context/${compUuid}/${admUuid}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(contextRes.status).toBe(200);
      expect(contextRes.body.success).toBe(true);
      expect(contextRes.body.data.tenant.uuid).toBe(compUuid);
      expect(contextRes.body.data.tenant.companyName).toBe('TechCorp Vietnam');
      expect(contextRes.body.data.admin.uuid).toBe(admUuid);
      expect(contextRes.body.data.admin.role).toBe('ADMIN');
      expect(Array.isArray(contextRes.body.data.employees)).toBe(true);
      expect(Array.isArray(contextRes.body.data.departmentsOverview)).toBe(true);
    });

    it('13. Regular user KHÔNG có quyền truy cập admin-context (RBAC 403)', async () => {
      const profRes = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${regularToken}`);
      
      const compUuid = profRes.body.data.tenant.uuid;
      const userUuid = profRes.body.data.uuid;

      const contextRes = await request(app)
        .get(`/api/users/admin-context/${compUuid}/${userUuid}`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(contextRes.status).toBe(403);
    });

    it('14. Admin dùng token có UUID khác với UUID trên URL -> Bị chặn 403', async () => {
      const profRes = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const compUuid = profRes.body.data.tenant.uuid;
      const fakeUuid = '00000000-0000-0000-0000-000000000000';

      const contextRes = await request(app)
        .get(`/api/users/admin-context/${compUuid}/${fakeUuid}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(contextRes.status).toBe(403);
      expect(contextRes.body.message).toContain('UUID trong Token không khớp');
    });
  });
});
