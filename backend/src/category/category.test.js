const request = require('supertest');
const app = require('../../app');
const prisma = require('../config/prisma');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const bcrypt = require('bcrypt');

describe('Category Multi-Tenant API Tests (/api/categories)', () => {
  let tenantA;
  let tenantB;
  let userA;
  let userB;
  let tokenA;
  let tokenB;

  beforeAll(async () => {
    await prisma.transaction.deleteMany();
    await prisma.allocation.deleteMany();
    await prisma.user.updateMany({ data: { unitId: null } });
    await prisma.unit.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();

    const passwordHash = await bcrypt.hash('Password123!', 10);

    tenantA = await prisma.tenant.create({ data: { companyName: 'Công ty A', code: 'tenant-a-cat' } });
    tenantB = await prisma.tenant.create({ data: { companyName: 'Công ty B', code: 'tenant-b-cat' } });

    userA = await prisma.user.create({
      data: { email: 'usera@cat.test', name: 'User A', password: passwordHash, role: 'MEMBER', tenantId: tenantA.id },
    });

    userB = await prisma.user.create({
      data: { email: 'userb@cat.test', name: 'User B', password: passwordHash, role: 'MEMBER', tenantId: tenantB.id },
    });

    tokenA = jwt.sign({ userId: userA.id, email: userA.email, role: 'MEMBER', tenantId: tenantA.id }, config.jwt.secret, { expiresIn: '1h' });
    tokenB = jwt.sign({ userId: userB.id, email: userB.email, role: 'MEMBER', tenantId: tenantB.id }, config.jwt.secret, { expiresIn: '1h' });
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

  let catAId;

  it('Tạo danh mục riêng cho Tenant A', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Ăn uống tiếp khách', type: 'EXPENSE', icon: 'utensils' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Ăn uống tiếp khách');
    expect(res.body.data.tenantId).toBe(tenantA.id);
    catAId = res.body.data.id;
  });

  it('Tạo danh mục riêng cho Tenant B', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Văn phòng phẩm', type: 'EXPENSE', icon: 'file' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Văn phòng phẩm');
    expect(res.body.data.tenantId).toBe(tenantB.id);
  });

  it('CÔ LẬP MULTI-TENANT: Tenant B không thấy danh mục của Tenant A', async () => {
    const resB = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(resB.status).toBe(200);
    const names = resB.body.data.map((c) => c.name);
    expect(names).toContain('Văn phòng phẩm');
    expect(names).not.toContain('Ăn uống tiếp khách');
  });

  it('Tenant A có thể cập nhật danh mục của mình', async () => {
    const res = await request(app)
      .put(`/api/categories/${catAId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Ăn uống khách VIP' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Ăn uống khách VIP');
  });

  it('Tenant B không thể xóa danh mục của Tenant A (403 Forbidden)', async () => {
    const res = await request(app)
      .delete(`/api/categories/${catAId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(403);
  });

  it('Tenant A xóa danh mục thành công khi chưa có giao dịch nào dùng', async () => {
    const res = await request(app)
      .delete(`/api/categories/${catAId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
