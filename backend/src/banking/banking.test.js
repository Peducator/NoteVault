const request = require('supertest');
const app = require('../../app');
const prisma = require('../config/prisma');
const redis = require('../config/redis');

describe('User Banking Information API (TDD)', () => {
  let userAToken;
  let userAId;
  let userBToken;
  let userBId;
  let createdBankId;

  beforeAll(async () => {
    // 1. Tạo User A
    const signupA = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'banking_user_a@notevault.com',
        password: 'Password123!',
        name: 'Lan Nguyễn (User A)',
      });

    const loginA = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'banking_user_a@notevault.com',
        password: 'Password123!',
      });
    userAToken = loginA.body.data.accessToken;
    userAId = loginA.body.data.user.id;

    // 2. Tạo User B (dùng để test bảo mật và cô lập dữ liệu)
    const signupB = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'banking_user_b@notevault.com',
        password: 'Password123!',
        name: 'Tuấn Trần (User B)',
      });

    const loginB = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'banking_user_b@notevault.com',
        password: 'Password123!',
      });
    userBToken = loginB.body.data.accessToken;
    userBId = loginB.body.data.user.id;
  });

  afterAll(async () => {
    // Dọn dẹp dữ liệu test
    await prisma.bankingInformation.deleteMany({
      where: {
        userId: { in: [userAId, userBId] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [userAId, userBId] },
      },
    });
    await redis.quit();
    await prisma.$disconnect();
  });

  // ========================================================
  // 1. KIỂM TRA XÁC THỰC (AUTHENTICATION)
  // ========================================================
  describe('Bảo mật & Xác thực token', () => {
    it('Từ chối truy cập 401 nếu không có Bearer token', async () => {
      const res = await request(app).get('/api/banking');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ========================================================
  // 2. THÊM TÀI KHOẢN NGÂN HÀNG (POST /api/banking)
  // ========================================================
  describe('POST /api/banking - Thêm mới thông tin banking', () => {
    it('Báo lỗi 400 nếu thiếu tên ngân hàng, số tài khoản hoặc chủ tài khoản', async () => {
      const res = await request(app)
        .post('/api/banking')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          bankName: 'Techcombank',
          // thiếu accountNumber và accountHolder
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Tạo thành công tài khoản ngân hàng đầu tiên (mặc định là isDefault)', async () => {
      const res = await request(app)
        .post('/api/banking')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          bankName: 'Techcombank',
          bankCode: 'TCB',
          accountNumber: '1903688888888',
          accountHolder: 'LAN NGUYEN',
          branch: 'Chi nhánh Hà Nội',
          isDefault: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bankName).toBe('Techcombank');
      expect(res.body.data.accountNumber).toBe('1903688888888');
      expect(res.body.data.accountHolder).toBe('LAN NGUYEN');
      expect(res.body.data.isDefault).toBe(true);
      expect(res.body.data.userId).toBe(userAId);

      createdBankId = res.body.data.id;
    });

    it('Thêm tài khoản thứ 2 đặt isDefault: true thì tài khoản thứ 1 tự động chuyển isDefault: false', async () => {
      const res = await request(app)
        .post('/api/banking')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          bankName: 'MB Bank',
          bankCode: 'MBB',
          accountNumber: '09888889999',
          accountHolder: 'LAN NGUYEN',
          branch: 'Sở Giao Dịch',
          isDefault: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.isDefault).toBe(true);

      // Kiểm tra lại tài khoản thứ 1 trong DB đã bị hạ cờ isDefault
      const prevAccount = await prisma.bankingInformation.findUnique({
        where: { id: createdBankId },
      });
      expect(prevAccount.isDefault).toBe(false);
    });
  });

  // ========================================================
  // 3. LẤY DANH SÁCH & CÔ LẬP DỮ LIỆU (GET /api/banking)
  // ========================================================
  describe('GET /api/banking - Lấy danh sách tài khoản banking của user', () => {
    it('User A lấy danh sách thấy đúng 2 tài khoản đã thêm', async () => {
      const res = await request(app)
        .get('/api/banking')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data.every((acc) => acc.userId === userAId)).toBe(true);
    });

    it('User B lấy danh sách chỉ thấy danh sách rỗng (Không thấy tài khoản của User A)', async () => {
      const res = await request(app)
        .get('/api/banking')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(0);
    });
  });

  // ========================================================
  // 4. LẤY CHI TIẾT TÀI KHOẢN (GET /api/banking/:id)
  // ========================================================
  describe('GET /api/banking/:id - Chi tiết 1 tài khoản banking', () => {
    it('User A xem chi tiết tài khoản của mình thành công', async () => {
      const res = await request(app)
        .get(`/api/banking/${createdBankId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdBankId);
      expect(res.body.data.accountNumber).toBe('1903688888888');
    });

    it('User B cố tình xem tài khoản của User A bị chặn (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/banking/${createdBankId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ========================================================
  // 5. CẬP NHẬT TÀI KHOẢN (PUT /api/banking/:id)
  // ========================================================
  describe('PUT /api/banking/:id - Cập nhật thông tin tài khoản', () => {
    it('User A cập nhật chi nhánh và đặt lại isDefault thành công', async () => {
      const res = await request(app)
        .put(`/api/banking/${createdBankId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          branch: 'Chi nhánh Hoàn Kiếm (Cập nhật)',
          isDefault: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.branch).toBe('Chi nhánh Hoàn Kiếm (Cập nhật)');
      expect(res.body.data.isDefault).toBe(true);
    });

    it('User B cố tình cập nhật tài khoản của User A bị chặn (403 Forbidden)', async () => {
      const res = await request(app)
        .put(`/api/banking/${createdBankId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          branch: 'Hacker Branch',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ========================================================
  // 6. XÓA TÀI KHOẢN (DELETE /api/banking/:id)
  // ========================================================
  describe('DELETE /api/banking/:id - Xóa tài khoản banking', () => {
    it('User B cố tình xóa tài khoản của User A bị chặn (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/banking/${createdBankId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('User A xóa tài khoản của mình thành công', async () => {
      const res = await request(app)
        .delete(`/api/banking/${createdBankId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('thành công');

      // Kiểm tra trong DB không còn tồn tại
      const checkInDb = await prisma.bankingInformation.findUnique({
        where: { id: createdBankId },
      });
      expect(checkInDb).toBeNull();
    });
  });
});
