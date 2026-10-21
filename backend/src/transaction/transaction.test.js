const request = require('supertest');
const app = require('../../app');
const prisma = require('../config/prisma');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const bcrypt = require('bcrypt');

describe('Transaction & Approval Module API Tests (/api/transactions)', () => {
  let tenant;
  let rootUser;
  let managerKD;
  let managerSales;
  let memberSales;
  let outsider;

  let rootToken;
  let kdToken;
  let salesManagerToken;
  let salesMemberToken;
  let outsiderToken;

  let uGoc;
  let uKD;
  let uSales;
  let category;

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
      data: { companyName: 'Công ty Test Chi Tiêu', code: 'test-expense-co' },
    });

    rootUser = await prisma.user.create({
      data: { email: 'giamdoc@test.co', name: 'Giám đốc', password: passwordHash, role: 'ROOT', tenantId: tenant.id },
    });

    managerKD = await prisma.user.create({
      data: { email: 'truongkd@test.co', name: 'Trưởng KD', password: passwordHash, role: 'MEMBER', tenantId: tenant.id },
    });

    managerSales = await prisma.user.create({
      data: { email: 'ansales@test.co', name: 'An (Admin Sales)', password: passwordHash, role: 'MEMBER', tenantId: tenant.id },
    });

    memberSales = await prisma.user.create({
      data: { email: 'dungsales@test.co', name: 'Dũng (Sales)', password: passwordHash, role: 'MEMBER', tenantId: tenant.id },
    });

    outsider = await prisma.user.create({
      data: { email: 'stranger@test.co', name: 'Người ngoài', password: passwordHash, role: 'MEMBER', tenantId: tenant.id },
    });

    rootToken = jwt.sign({ userId: rootUser.id, email: rootUser.email, role: 'ROOT', tenantId: tenant.id }, config.jwt.secret, { expiresIn: '1h' });
    kdToken = jwt.sign({ userId: managerKD.id, email: managerKD.email, role: 'MEMBER', tenantId: tenant.id }, config.jwt.secret, { expiresIn: '1h' });
    salesManagerToken = jwt.sign({ userId: managerSales.id, email: managerSales.email, role: 'MEMBER', tenantId: tenant.id }, config.jwt.secret, { expiresIn: '1h' });
    salesMemberToken = jwt.sign({ userId: memberSales.id, email: memberSales.email, role: 'MEMBER', tenantId: tenant.id }, config.jwt.secret, { expiresIn: '1h' });
    outsiderToken = jwt.sign({ userId: outsider.id, email: outsider.email, role: 'MEMBER', tenantId: tenant.id }, config.jwt.secret, { expiresIn: '1h' });

    // Tạo Cây: Gốc -> Khối KD -> Nhóm Sales (Lá)
    uGoc = await prisma.unit.create({
      data: { name: 'Gốc ABC', parentId: null, ownerId: rootUser.id, tenantId: tenant.id },
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
    await prisma.user.update({ where: { id: memberSales.id }, data: { unitId: uSales.id } });

    // Tạo Danh mục
    category = await prisma.category.create({
      data: { name: 'Tiếp khách', tenantId: tenant.id },
    });

    // Cấp ngân sách ban đầu: Gốc 1000tr -> Khối KD 400tr -> Nhóm Sales 150tr
    await prisma.allocation.create({
      data: { tenantId: tenant.id, sourceUnitId: null, targetUnitId: uGoc.id, amount: 1000n * M, createdById: rootUser.id },
    });
    await prisma.allocation.create({
      data: { tenantId: tenant.id, sourceUnitId: uGoc.id, targetUnitId: uKD.id, amount: 400n * M, createdById: rootUser.id },
    });
    await prisma.allocation.create({
      data: { tenantId: tenant.id, sourceUnitId: uKD.id, targetUnitId: uSales.id, amount: 150n * M, createdById: managerKD.id },
    });
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

  let createdTxId;
  let rejectedTxId;

  describe('Tạo đề nghị chi tiêu (POST /api/transactions)', () => {
    it('CHẶN TẠO CHI TIÊU Ở NÚT CHA: Khối KD có con nên không được tạo chi tiêu', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${kdToken}`)
        .send({
          unitId: uKD.id,
          categoryId: category.id,
          amount: '10000000',
          note: 'Mua máy chiếu',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('chỉ được phát sinh ở đơn vị lá');
    });

    it('Người ngoài không thuộc Nhóm Sales không thể tạo chi tiêu ở Sales', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({
          unitId: uSales.id,
          categoryId: category.id,
          amount: '5000000',
          note: 'Tiếp khách',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Bạn không thuộc đơn vị này');
    });

    it('Nhân viên Dũng tạo chi tiêu 12tr ở Nhóm Sales thành công -> status SUBMITTED', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${salesMemberToken}`)
        .send({
          unitId: uSales.id,
          categoryId: category.id,
          amount: '12000000',
          note: 'Tiếp khách đối tác VIP',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SUBMITTED');
      expect(res.body.data.amount).toBe('12000000');
      createdTxId = res.body.data.id;

      // Khoản chi SUBMITTED chưa trừ số dư an toàn
      const balRes = await request(app).get(`/api/units/${uSales.id}/balance`).set('Authorization', `Bearer ${rootToken}`);
      expect(balRes.body.data.safeBalance).toBe('150000000');
    });

    it('Tạo thêm 1 giao dịch để test từ chối (REJECT)', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${salesMemberToken}`)
        .send({
          unitId: uSales.id,
          categoryId: category.id,
          amount: '2000000',
          note: 'Chi tiêu thiếu hóa đơn',
        });

      expect(res.status).toBe(201);
      rejectedTxId = res.body.data.id;
    });
  });

  describe('Duyệt chi tiêu (POST /api/transactions/:id/approve)', () => {
    it('Người ngoài không có quyền duyệt chi tiêu của Nhóm Sales', async () => {
      const res = await request(app)
        .post(`/api/transactions/${createdTxId}/approve`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('không phải là người quản lý trực tiếp');
    });

    it('Quản lý trực tiếp (An - Admin Sales) duyệt thành công -> status APPROVED, trừ số dư', async () => {
      const res = await request(app)
        .post(`/api/transactions/${createdTxId}/approve`)
        .set('Authorization', `Bearer ${salesManagerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');
      expect(res.body.data.approvedById).toBe(managerSales.id);

      // Số dư Sales từ 150tr trừ 12tr đã duyệt = 138tr
      const balRes = await request(app).get(`/api/units/${uSales.id}/balance`).set('Authorization', `Bearer ${rootToken}`);
      expect(balRes.body.data.safeBalance).toBe('138000000');
    });

    it('Không thể duyệt lại giao dịch đã APPROVED', async () => {
      const res = await request(app)
        .post(`/api/transactions/${createdTxId}/approve`)
        .set('Authorization', `Bearer ${salesManagerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('không thể duyệt lại');
    });

    it('Cấp Cha ở trên (Trưởng KD - role MEMBER) duyệt thành công đơn chi tiêu của nhân viên Sales', async () => {
      // Dũng tạo đơn chi tiêu mới 8tr
      const txRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${salesMemberToken}`)
        .send({
          unitId: uSales.id,
          categoryId: category.id,
          amount: 8_000_000,
          note: 'Chi phí tiếp khách đợt 2',
        });
      expect(txRes.status).toBe(201);
      const newTxId = txRes.body.data.id;

      // Trưởng KD (kdToken - role MEMBER) là Cha ở trên duyệt đơn của Sales
      const approveRes = await request(app)
        .post(`/api/transactions/${newTxId}/approve`)
        .set('Authorization', `Bearer ${kdToken}`);

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.success).toBe(true);
      expect(approveRes.body.data.status).toBe('APPROVED');
      expect(approveRes.body.data.approvedById).toBe(managerKD.id);
    });

    it('Cấp Cha ở trên (Trưởng KD) nhìn thấy toàn bộ chi tiêu của nhóm con Sales (Cha luôn thấy con)', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${kdToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Trưởng KD phải thấy các đơn của uSales
      const salesTxs = res.body.data.items.filter((item) => item.unitId === uSales.id);
      expect(salesTxs.length).toBeGreaterThan(0);
    });

    it('Anh Cả tự tạo chi tiêu cá nhân thì không thể tự duyệt (403), cấp Cha ở trên duyệt thành công', async () => {
      // An (Anh Cả Sales) tự tạo hóa đơn 5tr
      const txRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${salesManagerToken}`)
        .send({
          unitId: uSales.id,
          categoryId: category.id,
          amount: 5_000_000,
          note: 'Công tác phí cá nhân của Quản lý An',
        });
      expect(txRes.status).toBe(201);
      const managerTxId = txRes.body.data.id;

      // An tự duyệt đơn của chính mình -> Bị chặn 403 Forbidden!
      const selfApproveRes = await request(app)
        .post(`/api/transactions/${managerTxId}/approve`)
        .set('Authorization', `Bearer ${salesManagerToken}`);

      expect(selfApproveRes.status).toBe(403);

      // Cấp Cha ở trên (Trưởng KD) duyệt đơn cho An -> Thành công 200
      const parentApproveRes = await request(app)
        .post(`/api/transactions/${managerTxId}/approve`)
        .set('Authorization', `Bearer ${kdToken}`);

      expect(parentApproveRes.status).toBe(200);
      expect(parentApproveRes.body.data.status).toBe('APPROVED');
      expect(parentApproveRes.body.data.approvedById).toBe(managerKD.id);
    });
  });

  describe('Từ chối chi tiêu (POST /api/transactions/:id/reject)', () => {
    it('Từ chối bắt buộc phải có lý do (rejectionReason)', async () => {
      const res = await request(app)
        .post(`/api/transactions/${rejectedTxId}/reject`)
        .set('Authorization', `Bearer ${salesManagerToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Lý do từ chối');
    });

    it('Quản lý trực tiếp từ chối kèm lý do -> status REJECTED, không trừ số dư', async () => {
      const res = await request(app)
        .post(`/api/transactions/${rejectedTxId}/reject`)
        .set('Authorization', `Bearer ${salesManagerToken}`)
        .send({ rejectionReason: 'Hóa đơn không hợp lệ' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('REJECTED');
      expect(res.body.data.rejectionReason).toBe('Hóa đơn không hợp lệ');

      // Số dư là 125tr (150tr - 12tr - 8tr - 5tr; khoản bị từ chối không trừ)
      const balRes = await request(app).get(`/api/units/${uSales.id}/balance`).set('Authorization', `Bearer ${rootToken}`);
      expect(balRes.body.data.safeBalance).toBe('125000000');
    });
  });

  describe('Bất biến dữ liệu (DELETE /api/transactions/:id)', () => {
    it('Chặn hành động xóa giao dịch', async () => {
      const res = await request(app)
        .delete(`/api/transactions/${createdTxId}`)
        .set('Authorization', `Bearer ${rootToken}`);

      expect(res.status).toBe(405);
      expect(res.body.message).toContain('Không được phép xóa giao dịch');
    });
  });
});
