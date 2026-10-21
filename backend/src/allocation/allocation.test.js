const request = require('supertest');
const app = require('../../app');
const prisma = require('../config/prisma');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const bcrypt = require('bcrypt');

describe('Allocation Module API Tests (/api/allocations)', () => {
  let tenant;
  let rootUser;
  let managerKD;
  let managerSales;
  let outsider;
  let rootToken;
  let kdToken;
  let salesToken;
  let outsiderToken;

  let uGoc;
  let uKD;
  let uSales;

  const M = 1_000_000n;

  beforeAll(async () => {
    await prisma.transaction.deleteMany();
    await prisma.allocation.deleteMany();
    await prisma.user.updateMany({ data: { unitId: null } });
    await prisma.unit.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();

    const passwordHash = await bcrypt.hash('Password123!', 10);

    tenant = await prisma.tenant.create({
      data: { companyName: 'Công ty Cấp Tiền ABC', code: 'alloc-abc' },
    });

    rootUser = await prisma.user.create({
      data: { email: 'root@alloc.co', name: 'Giám đốc', password: passwordHash, role: 'ROOT', tenantId: tenant.id },
    });

    managerKD = await prisma.user.create({
      data: { email: 'kd@alloc.co', name: 'Trưởng KD', password: passwordHash, role: 'MEMBER', tenantId: tenant.id },
    });

    managerSales = await prisma.user.create({
      data: { email: 'sales@alloc.co', name: 'Trưởng Sales', password: passwordHash, role: 'MEMBER', tenantId: tenant.id },
    });

    outsider = await prisma.user.create({
      data: { email: 'other@alloc.co', name: 'Người ngoài', password: passwordHash, role: 'MEMBER', tenantId: tenant.id },
    });

    rootToken = jwt.sign({ userId: rootUser.id, email: rootUser.email, role: 'ROOT', tenantId: tenant.id }, config.jwt.secret, { expiresIn: '1h' });
    kdToken = jwt.sign({ userId: managerKD.id, email: managerKD.email, role: 'MEMBER', tenantId: tenant.id }, config.jwt.secret, { expiresIn: '1h' });
    salesToken = jwt.sign({ userId: managerSales.id, email: managerSales.email, role: 'MEMBER', tenantId: tenant.id }, config.jwt.secret, { expiresIn: '1h' });
    outsiderToken = jwt.sign({ userId: outsider.id, email: outsider.email, role: 'MEMBER', tenantId: tenant.id }, config.jwt.secret, { expiresIn: '1h' });

    // Tạo cây 3 cấp: Gốc -> Khối KD -> Nhóm Sales
    uGoc = await prisma.unit.create({
      data: { name: 'ABC Gốc', parentId: null, ownerId: rootUser.id, tenantId: tenant.id },
    });
    uKD = await prisma.unit.create({
      data: { name: 'Khối KD', parentId: uGoc.id, ownerId: managerKD.id, tenantId: tenant.id },
    });
    uSales = await prisma.unit.create({
      data: { name: 'Nhóm Sales', parentId: uKD.id, ownerId: managerSales.id, tenantId: tenant.id },
    });

    await prisma.user.update({ where: { id: rootUser.id }, data: { unitId: uGoc.id } });
    await prisma.user.update({ where: { id: managerKD.id }, data: { unitId: uKD.id } });
    await prisma.user.update({ where: { id: managerSales.id }, data: { unitId: uSales.id } });
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany();
    await prisma.allocation.deleteMany();
    await prisma.user.updateMany({ data: { unitId: null } });
    await prisma.unit.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();
    await prisma.$disconnect();
  });

  describe('Nạp vốn ban đầu (Initial Funding)', () => {
    it('Chỉ ROOT mới có quyền nạp vốn ban đầu vào đơn vị gốc', async () => {
      const res = await request(app)
        .post('/api/allocations')
        .set('Authorization', `Bearer ${kdToken}`)
        .send({
          sourceUnitId: null,
          targetUnitId: uGoc.id,
          amount: '1000000000',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Chỉ người dùng có quyền ROOT');
    });

    it('ROOT nạp thành công 1.000.000.000 VND vào ABC Gốc', async () => {
      const res = await request(app)
        .post('/api/allocations')
        .set('Authorization', `Bearer ${rootToken}`)
        .send({
          sourceUnitId: null,
          targetUnitId: uGoc.id,
          amount: '1000000000',
          note: 'Nạp vốn ban đầu',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe('1000000000');

      // Kiểm tra số dư ABC Gốc hiện tại phải là 1.000.000.000 đ
      const balanceRes = await request(app)
        .get(`/api/units/${uGoc.id}/balance`)
        .set('Authorization', `Bearer ${rootToken}`);
      expect(balanceRes.body.data.safeBalance).toBe('1000000000');
    });
  });

  describe('Cấp tiền từ cha xuống con (Hierarchical Allocation)', () => {
    it('CHẶN VƯỢT SỐ DƯ: Khối KD chưa có tiền thì không thể cấp cho Sales', async () => {
      const res = await request(app)
        .post('/api/allocations')
        .set('Authorization', `Bearer ${kdToken}`)
        .send({
          sourceUnitId: uKD.id,
          targetUnitId: uSales.id,
          amount: '50000000',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('vượt quá số dư an toàn');
    });

    it('Gốc cấp 400tr xuống Khối KD thành công -> Gốc còn 600tr, KD có 400tr', async () => {
      const res = await request(app)
        .post('/api/allocations')
        .set('Authorization', `Bearer ${rootToken}`)
        .send({
          sourceUnitId: uGoc.id,
          targetUnitId: uKD.id,
          amount: '400000000',
          note: 'Cấp ngân sách Khối KD',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const balGoc = await request(app).get(`/api/units/${uGoc.id}/balance`).set('Authorization', `Bearer ${rootToken}`);
      const balKD = await request(app).get(`/api/units/${uKD.id}/balance`).set('Authorization', `Bearer ${rootToken}`);

      expect(balGoc.body.data.safeBalance).toBe('600000000');
      expect(balKD.body.data.safeBalance).toBe('400000000');
    });

    it('Người ngoài không có quyền cấp tiền của Khối KD', async () => {
      const res = await request(app)
        .post('/api/allocations')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({
          sourceUnitId: uKD.id,
          targetUnitId: uSales.id,
          amount: '100000000',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Quản trị viên|người quản lý|ROOT/i);
    });

    it('Trưởng Khối KD cấp 150tr xuống Nhóm Sales thành công -> KD còn 250tr, Sales có 150tr', async () => {
      const res = await request(app)
        .post('/api/allocations')
        .set('Authorization', `Bearer ${kdToken}`)
        .send({
          sourceUnitId: uKD.id,
          targetUnitId: uSales.id,
          amount: '150000000',
          note: 'Cấp ngân sách Sales',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const balKD = await request(app).get(`/api/units/${uKD.id}/balance`).set('Authorization', `Bearer ${rootToken}`);
      const balSales = await request(app).get(`/api/units/${uSales.id}/balance`).set('Authorization', `Bearer ${rootToken}`);

      expect(balKD.body.data.safeBalance).toBe('250000000');
      expect(balSales.body.data.safeBalance).toBe('150000000');
    });

    it('Cho phép cấp tiền từ Gốc xuống thẳng nút con trong cây (kèm thông báo theo yêu cầu mới)', async () => {
      const res = await request(app)
        .post('/api/allocations')
        .set('Authorization', `Bearer ${rootToken}`)
        .send({
          sourceUnitId: uGoc.id,
          targetUnitId: uSales.id,
          amount: '100000000',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const balGoc = await request(app).get(`/api/units/${uGoc.id}/balance`).set('Authorization', `Bearer ${rootToken}`);
      const balSales = await request(app).get(`/api/units/${uSales.id}/balance`).set('Authorization', `Bearer ${rootToken}`);

      expect(balGoc.body.data.safeBalance).toBe('500000000');
      expect(balSales.body.data.safeBalance).toBe('250000000');
    });
  });

  describe('GET /api/allocations (Lịch sử cấp tiền)', () => {
    it('Lấy danh sách lịch sử cấp tiền', async () => {
      const res = await request(app)
        .get('/api/allocations')
        .set('Authorization', `Bearer ${rootToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(3);
    });

    it('Lọc lịch sử cấp tiền theo unitId', async () => {
      const res = await request(app)
        .get(`/api/allocations?unitId=${uSales.id}`)
        .set('Authorization', `Bearer ${rootToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.items[0].targetUnitId).toBe(uSales.id);
    });
  });

  describe('Thu hồi ngân sách (POST /api/allocations/recall) & Bảo đảm không bao giờ âm', () => {
    it('Chặn số tiền thu hồi là số âm hoặc bằng 0 (amount <= 0)', async () => {
      const res = await request(app)
        .post('/api/allocations/recall')
        .set('Authorization', `Bearer ${kdToken}`)
        .send({
          sourceUnitId: uSales.id,
          targetUnitId: uKD.id,
          amount: '-50000000',
          reason: 'Thu hồi nhầm',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/lớn hơn 0 VND/i);
    });

    it('Chặn thu hồi nếu không có lý do (reason)', async () => {
      const res = await request(app)
        .post('/api/allocations/recall')
        .set('Authorization', `Bearer ${kdToken}`)
        .send({
          sourceUnitId: uSales.id,
          targetUnitId: uKD.id,
          amount: '50000000',
          reason: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Lý do thu hồi');
    });

    it('Chặn cấp dưới tự ý thu hồi tiền của cấp trên (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/allocations/recall')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          sourceUnitId: uKD.id,
          targetUnitId: uSales.id,
          amount: '50000000',
          reason: 'Sales đòi tiền KD',
        });

      expect(res.status).toBe(400); // targetUnit (Sales) không phải là tổ tiên của KD
      expect(res.body.message).toContain('không phải là cấp trên');
    });

    it('Chặn thu hồi vượt quá số dư an toàn của đơn vị con (Bảo đảm số dư không bao giờ âm)', async () => {
      // Sales hiện có 250M. Thử thu hồi 300M (> 250M) -> Bị chặn!
      const res = await request(app)
        .post('/api/allocations/recall')
        .set('Authorization', `Bearer ${kdToken}`)
        .send({
          sourceUnitId: uSales.id,
          targetUnitId: uKD.id,
          amount: '300000000',
          reason: 'Thu hồi quá tay',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Số dư không bao giờ được phép âm');
    });

    it('Sếp Khối KD thu hồi 100tr từ Nhóm Sales về Khối KD thành công -> KD tăng 100tr, Sales giảm 100tr', async () => {
      // Trước khi thu hồi: KD = 250M, Sales = 250M
      const res = await request(app)
        .post('/api/allocations/recall')
        .set('Authorization', `Bearer ${kdToken}`)
        .send({
          sourceUnitId: uSales.id,
          targetUnitId: uKD.id,
          amount: '100000000',
          reason: 'Thu hồi hạn mức dư thừa quý 3',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe('100000000');
      expect(res.body.data.note).toContain('[THU HỒI]');

      // Sau khi thu hồi:
      // KD tăng từ 250M lên 350M
      const balKD = await request(app).get(`/api/units/${uKD.id}/balance`).set('Authorization', `Bearer ${rootToken}`);
      expect(balKD.body.data.safeBalance).toBe('350000000');

      // Sales giảm từ 250M xuống còn 150M (luôn >= 0)
      const balSales = await request(app).get(`/api/units/${uSales.id}/balance`).set('Authorization', `Bearer ${rootToken}`);
      expect(balSales.body.data.safeBalance).toBe('150000000');
    });
  });
});
