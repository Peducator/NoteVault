const request = require('supertest');
const app = require('../../app');
const prisma = require('../config/prisma');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const bcrypt = require('bcrypt');
const unitService = require('./unitService');

describe('Unit Module API Tests (/api/units)', () => {
  let tenant;
  let rootUser;
  let memberUser1;
  let memberUser2;
  let rootToken;
  let memberToken;

  beforeAll(async () => {
    // Dọn dẹp dữ liệu test
    await prisma.transaction.deleteMany();
    await prisma.allocation.deleteMany();
    await prisma.unitMember.deleteMany();
    await prisma.user.updateMany({ data: { unitId: null } });
    await prisma.unit.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();

    const passwordHash = await bcrypt.hash('Password123!', 10);

    // Tạo tenant
    tenant = await prisma.tenant.create({
      data: {
        companyName: 'Công ty Test Unit',
        code: 'test-unit-co',
      },
    });

    // Tạo ROOT user
    rootUser = await prisma.user.create({
      data: {
        email: 'root@testunit.co',
        name: 'Giám đốc Test',
        password: passwordHash,
        role: 'ROOT',
        tenantId: tenant.id,
      },
    });

    // Tạo MEMBER users
    memberUser1 = await prisma.user.create({
      data: {
        email: 'member1@testunit.co',
        name: 'Trưởng phòng A',
        password: passwordHash,
        role: 'MEMBER',
        tenantId: tenant.id,
      },
    });

    memberUser2 = await prisma.user.create({
      data: {
        email: 'member2@testunit.co',
        name: 'Nhân viên B',
        password: passwordHash,
        role: 'MEMBER',
        tenantId: tenant.id,
      },
    });

    // Tạo Tokens
    rootToken = jwt.sign(
      { userId: rootUser.id, email: rootUser.email, role: 'ROOT', tenantId: tenant.id },
      config.jwt.secret,
      { expiresIn: '1h' }
    );

    memberToken = jwt.sign(
      { userId: memberUser1.id, email: memberUser1.email, role: 'MEMBER', tenantId: tenant.id },
      config.jwt.secret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany();
    await prisma.allocation.deleteMany();
    await prisma.unitMember.deleteMany();
    await prisma.user.updateMany({ data: { unitId: null } });
    await prisma.unit.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();
    await prisma.$disconnect();
  });

  let rootUnit;
  let childUnit;

  describe('POST /api/units (Tạo đơn vị)', () => {
    it('Nên từ chối nếu người gọi không phải ROOT', async () => {
      const res = await request(app)
        .post('/api/units')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Đơn vị gốc',
          ownerId: rootUser.id,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('ROOT có thể tạo đơn vị gốc (parentId = null)', async () => {
      const res = await request(app)
        .post('/api/units')
        .set('Authorization', `Bearer ${rootToken}`)
        .send({
          name: 'Tổng Công Ty Gốc',
          parentId: null,
          ownerId: rootUser.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Tổng Công Ty Gốc');
      expect(res.body.data.ownerId).toBe(rootUser.id);
      rootUnit = res.body.data;

      // Kiểm tra quy tắc: Owner PHẢI tự động thuộc chính unit đó
      const updatedOwner = await prisma.user.findUnique({ where: { id: rootUser.id } });
      expect(updatedOwner.unitId).toBe(rootUnit.id);
    });

    it('ROOT có thể tạo đơn vị con (Khối con có parentId)', async () => {
      const res = await request(app)
        .post('/api/units')
        .set('Authorization', `Bearer ${rootToken}`)
        .send({
          name: 'Khối Kinh Doanh',
          parentId: rootUnit.id,
          ownerId: memberUser1.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.parentId).toBe(rootUnit.id);
      childUnit = res.body.data;

      // Owner memberUser1 cũng phải được gán vào childUnit
      const updatedMember1 = await prisma.user.findUnique({ where: { id: memberUser1.id } });
      expect(updatedMember1.unitId).toBe(childUnit.id);
    });

    it('Cho phép 1 người làm quản lý (owner) của nhiều nhóm khác nhau', async () => {
      const res = await request(app)
        .post('/api/units')
        .set('Authorization', `Bearer ${rootToken}`)
        .send({
          name: 'Nhóm Dự Án Đặc Biệt',
          parentId: rootUnit.id,
          ownerId: memberUser1.id, // memberUser1 đã là owner của Khối Kinh Doanh
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Nhóm Dự Án Đặc Biệt');

      // Dọn dẹp nhóm phụ này để các test phía sau giữ nguyên cấu trúc 2 units
      await prisma.unit.delete({ where: { id: res.body.data.id } });
    });

    it('Anh Cả chưa được Cha cấp quyền tạo nest -> Bị chặn 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/units')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Nhóm Con Của Khối KD',
          parentId: childUnit.id,
          ownerId: memberUser2.id,
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('chưa được cấp trên cấp quyền tạo thêm đơn vị con');
    });

    it('Cha cấp quyền allowCreateSubUnit = true -> Anh Cả tạo nest thành công', async () => {
      // Cha (rootUser) bật allowCreateSubUnit cho childUnit
      await prisma.unit.update({
        where: { id: childUnit.id },
        data: { allowCreateSubUnit: true },
      });

      // Anh Cả (memberUser1) tạo unit con thành công
      const res = await request(app)
        .post('/api/units')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Nhóm Con Của Khối KD',
          parentId: childUnit.id,
          ownerId: memberUser2.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Nhóm Con Của Khối KD');

      // Dọn dẹp unit con và reset allowCreateSubUnit
      await prisma.unit.delete({ where: { id: res.body.data.id } });
      await prisma.unit.update({
        where: { id: childUnit.id },
        data: { allowCreateSubUnit: false },
      });
    });
  });

  describe('GET /api/units (Lấy cây đơn vị)', () => {
    it('Lấy danh sách và cấu trúc cây thành công', async () => {
      const res = await request(app)
        .get('/api/units')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.flat.length).toBe(2);
      expect(res.body.data.tree.length).toBe(1); // 1 root unit
      expect(res.body.data.tree[0].children.length).toBe(1); // 1 child
      expect(res.body.data.tree[0].children[0].name).toBe('Khối Kinh Doanh');
    });
  });

  describe('GET /api/units/:id & /api/units/:id/balance', () => {
    it('Xem chi tiết 1 đơn vị bởi Unit Owner', async () => {
      const res = await request(app)
        .get(`/api/units/${childUnit.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(childUnit.id);
      expect(res.body.data.safeBalance).toBe('0');
      expect(res.body.data.isLeaf).toBe(true);
    });

    it('Unit Owner có thể lấy số dư an toàn tức thời', async () => {
      const res = await request(app)
        .get(`/api/units/${childUnit.id}/balance`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.safeBalance).toBe('0');
    });

    it('Member thường bị chặn xem số dư tức thời nếu Admin chưa bật allowMemberViewBalance (403)', async () => {
      const regularMemberToken = jwt.sign(
        { userId: memberUser2.id, email: memberUser2.email, role: 'MEMBER', tenantId: tenant.id },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get(`/api/units/${childUnit.id}/balance`)
        .set('Authorization', `Bearer ${regularMemberToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('không có quyền xem số dư');
    });

    it('Member thường xem được số dư sau khi Admin bật allowMemberViewBalance', async () => {
      // Admin bật cờ cho phép thành viên xem số dư
      await prisma.unit.update({
        where: { id: childUnit.id },
        data: { allowMemberViewBalance: true },
      });

      // Gán memberUser2 vào childUnit
      await prisma.user.update({
        where: { id: memberUser2.id },
        data: { unitId: childUnit.id },
      });

      const regularMemberToken = jwt.sign(
        { userId: memberUser2.id, email: memberUser2.email, role: 'MEMBER', tenantId: tenant.id },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get(`/api/units/${childUnit.id}/balance`)
        .set('Authorization', `Bearer ${regularMemberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.safeBalance).toBe('0');

      // Reset lại về null
      await prisma.user.update({
        where: { id: memberUser2.id },
        data: { unitId: null },
      });
    });
  });

  describe('Quản lý thành viên trong Unit (/members)', () => {
    it('Admin nhóm (Unit Owner) gán nhân viên vào unit thành công', async () => {
      const res = await request(app)
        .post(`/api/units/${childUnit.id}/members`)
        .set('Authorization', `Bearer ${memberToken}`) // memberToken là Owner của childUnit
        .send({ userId: memberUser2.id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.unitId).toBe(childUnit.id);

      const dbUser = await prisma.user.findUnique({ where: { id: memberUser2.id } });
      expect(dbUser.unitId).toBe(childUnit.id);
    });

    it('Lấy danh sách thành viên trong Unit (GET /api/units/:id/members)', async () => {
      const res = await request(app)
        .get(`/api/units/${childUnit.id}/members`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalMembers).toBeGreaterThanOrEqual(2);
      expect(res.body.data.members.some((m) => m.id === memberUser1.id && m.isOwner)).toBe(true);
      expect(res.body.data.members.some((m) => m.id === memberUser2.id)).toBe(true);
    });

    it('Cho phép 1 user thuộc nhiều đơn vị/nhóm cùng lúc và xem qua GET /api/users/me/units', async () => {
      // memberUser2 đã ở childUnit. Giờ thêm memberUser2 vào rootUnit
      await request(app)
        .post(`/api/units/${rootUnit.id}/members`)
        .set('Authorization', `Bearer ${rootToken}`)
        .send({ userId: memberUser2.id });

      const user2Token = jwt.sign(
        { userId: memberUser2.id, email: memberUser2.email, role: 'MEMBER', tenantId: tenant.id },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      const meUnitsRes = await request(app)
        .get('/api/users/me/units')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(meUnitsRes.status).toBe(200);
      expect(meUnitsRes.body.success).toBe(true);
      const unitIds = meUnitsRes.body.data.map((u) => u.id);
      expect(unitIds).toContain(childUnit.id);
      expect(unitIds).toContain(rootUnit.id);

      // Kiểm tra GET /api/users/profile cũng trả về groups
      const profileRes = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.data.groups).toBeDefined();
      const profileGroupIds = profileRes.body.data.groups.map((g) => g.id);
      expect(profileGroupIds).toContain(childUnit.id);
      expect(profileGroupIds).toContain(rootUnit.id);

      // Gỡ memberUser2 khỏi rootUnit để giữ cấu trúc
      await request(app)
        .delete(`/api/units/${rootUnit.id}/members/${memberUser2.id}`)
        .set('Authorization', `Bearer ${rootToken}`);
    });

    it('Không thể gỡ owner ra khỏi unit của họ', async () => {
      const res = await request(app)
        .delete(`/api/units/${childUnit.id}/members/${memberUser1.id}`)
        .set('Authorization', `Bearer ${rootToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Không thể gỡ người phụ trách');
    });

    it('Gỡ thành viên thông thường ra khỏi unit thành công', async () => {
      const res = await request(app)
        .delete(`/api/units/${childUnit.id}/members/${memberUser2.id}`)
        .set('Authorization', `Bearer ${memberToken}`); // Unit Owner gỡ

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.unitId).toBeNull();

      const dbUser = await prisma.user.findUnique({ where: { id: memberUser2.id } });
      expect(dbUser.unitId).toBeNull();
    });
  });

  describe('PUT /api/units/:id (Cập nhật)', () => {
    it('Admin nhóm (Unit Owner) đổi tên đơn vị thành công', async () => {
      const res = await request(app)
        .put(`/api/units/${childUnit.id}`)
        .set('Authorization', `Bearer ${memberToken}`) // Unit Owner
        .send({ name: 'Khối Kinh Doanh & Tiếp Thị' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Khối Kinh Doanh & Tiếp Thị');
    });

    it('Admin nhóm KHÔNG THỂ tự ý đổi người quản lý (ownerId) (403 Forbidden)', async () => {
      const res = await request(app)
        .put(`/api/units/${childUnit.id}`)
        .set('Authorization', `Bearer ${memberToken}`) // Unit Owner cố tình đổi owner sang memberUser2
        .send({ ownerId: memberUser2.id });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Chỉ ROOT cấp công ty mới có quyền');
    });
  });

  describe('DELETE /api/units/:id (Xóa)', () => {
    it('Không thể xóa đơn vị đang có con', async () => {
      const res = await request(app)
        .delete(`/api/units/${rootUnit.id}`)
        .set('Authorization', `Bearer ${rootToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('đang có đơn vị con');
    });

    it('Xóa đơn vị lá thành công (Soft Delete)', async () => {
      const res = await request(app)
        .delete(`/api/units/${childUnit.id}`)
        .set('Authorization', `Bearer ${rootToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = await prisma.unit.findUnique({ where: { id: childUnit.id } });
      expect(check).not.toBeNull();
      expect(check.deletedAt).not.toBeNull();

      // Kiểm tra API lấy cây đơn vị không còn chứa đơn vị đã bị xóa mềm
      const listRes = await request(app)
        .get('/api/units')
        .set('Authorization', `Bearer ${rootToken}`);
      expect(listRes.body.data.flat.some((u) => u.id === childUnit.id)).toBe(false);
    });
  });

  describe('Reorganization Wizard & Phân quyền EDIT / VIEWER', () => {
    let unitB, unitC, unitD, unitE;
    let userC, userD, tokenC;

    beforeAll(async () => {
      const passwordHash = await bcrypt.hash('Password123!', 10);

      userC = await prisma.user.create({
        data: {
          email: 'userC@testunit.co',
          name: 'Sếp C',
          password: passwordHash,
          role: 'MEMBER',
          tenantId: tenant.id,
        },
      });

      userD = await prisma.user.create({
        data: {
          email: 'userD@testunit.co',
          name: 'Sếp D',
          password: passwordHash,
          role: 'MEMBER',
          tenantId: tenant.id,
        },
      });

      tokenC = jwt.sign(
        { userId: userC.id, email: userC.email, role: 'MEMBER', tenantId: tenant.id },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      // Cây: rootUnit (R) -> unitB (B) -> unitC (C) -> unitD (D) -> unitE (E)
      unitB = await prisma.unit.create({
        data: {
          name: 'Khối B',
          parentId: rootUnit.id,
          ownerId: rootUser.id,
          tenantId: tenant.id,
        },
      });

      unitC = await prisma.unit.create({
        data: {
          name: 'Phòng C',
          parentId: unitB.id,
          ownerId: userC.id,
          tenantId: tenant.id,
        },
      });

      unitD = await prisma.unit.create({
        data: {
          name: 'Đơn vị D',
          parentId: unitC.id,
          ownerId: userD.id,
          tenantId: tenant.id,
        },
      });

      unitE = await prisma.unit.create({
        data: {
          name: 'Nhóm E',
          parentId: unitD.id,
          ownerId: userD.id,
          tenantId: tenant.id,
        },
      });
    });

    it('Chặn tái cấu trúc gây chu trình lặp (Cycle Prevention: newParentId nằm trong con cháu)', async () => {
      const res = await request(app)
        .post(`/api/units/${unitD.id}/reorganize/preview`)
        .set('Authorization', `Bearer ${rootToken}`)
        .send({ newParentId: unitE.id });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('chu trình lặp');
    });

    it('Preview Reorganize Wizard trả về đúng sếp cũ (Đoạn 1: C, B) và con cháu (Đoạn 2: E)', async () => {
      const res = await request(app)
        .post(`/api/units/${unitD.id}/reorganize/preview`)
        .set('Authorization', `Bearer ${rootToken}`)
        .send({ newParentId: rootUnit.id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.targetUnit.id).toBe(unitD.id);
      expect(data.newParent.id).toBe(rootUnit.id);

      // Sếp cũ trung gian giữa B và D: C và B
      const managerIds = data.intermediateManagers.map((m) => m.id);
      expect(managerIds).toContain(unitC.id);
      expect(managerIds).toContain(unitB.id);

      // Con cháu của D: E
      const descendantIds = data.descendantUnits.map((d) => d.id);
      expect(descendantIds).toContain(unitE.id);

      // Có đủ 2 options
      expect(data.options.strategyOptions).toHaveLength(2);
      expect(data.options.strategyOptions[0].key).toBe('SHARED_CHILDREN');
      expect(data.options.strategyOptions[1].key).toBe('FULL_ISOLATION');
    });

    it('Confirm Reorganize với SHARED_CHILDREN: D lên ngang hàng B, C cùng quản lý E với vai trò EDIT', async () => {
      const res = await request(app)
        .post(`/api/units/${unitD.id}/reorganize/confirm`)
        .set('Authorization', `Bearer ${rootToken}`)
        .send({
          newParentId: rootUnit.id,
          strategy: 'SHARED_CHILDREN',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // 1. Kiểm tra D đã đổi cha sang rootUnit
      const updatedD = await prisma.unit.findUnique({ where: { id: unitD.id } });
      expect(updatedD.parentId).toBe(rootUnit.id);

      // 2. Kiểm tra sếp C được add vào unit_members của E với role EDIT
      const memberRecord = await prisma.unitMember.findUnique({
        where: {
          unitId_userId: {
            unitId: unitE.id,
            userId: userC.id,
          },
        },
      });
      expect(memberRecord).not.toBeNull();
      expect(memberRecord.role).toBe('EDIT');

      // 3. Kiểm tra thẩm quyền duyệt chi tiêu: User C có quyền duyệt hóa đơn của E!
      const canApprove = await unitService.canApproveExpense(
        userC,
        { id: 9999, userId: userD.id, unitId: unitE.id },
        tenant.id
      );
      expect(canApprove).toBe(true);
    });

    it('Người mang vai trò VIEWER trong unit_members không có quyền duyệt hóa đơn', async () => {
      // Đổi vai trò của User C trong E sang VIEWER
      await prisma.unitMember.update({
        where: {
          unitId_userId: {
            unitId: unitE.id,
            userId: userC.id,
          },
        },
        data: { role: 'VIEWER' },
      });

      const canApprove = await unitService.canApproveExpense(
        userC,
        { id: 9999, userId: userD.id, unitId: unitE.id },
        tenant.id
      );
      expect(canApprove).toBe(false);
    });

    it('Confirm Reorganize với FULL_ISOLATION: Cắt sạch quyền của sếp cũ khỏi các con', async () => {
      // Đưa D về lại dưới C để kiểm tra việc cắt đứt toàn bộ quan hệ
      await prisma.unit.update({
        where: { id: unitD.id },
        data: { parentId: unitC.id },
      });

      // Chuyển D lên rootUnit với FULL_ISOLATION
      const res = await request(app)
        .post(`/api/units/${unitD.id}/reorganize/confirm`)
        .set('Authorization', `Bearer ${rootToken}`)
        .send({
          newParentId: rootUnit.id,
          strategy: 'FULL_ISOLATION',
        });

      expect(res.status).toBe(200);

      // Kiểm tra sếp C đã bị xóa khỏi unit_members của E
      const memberRecord = await prisma.unitMember.findUnique({
        where: {
          unitId_userId: {
            unitId: unitE.id,
            userId: userC.id,
          },
        },
      });
      expect(memberRecord).toBeNull();
    });
  });
});

