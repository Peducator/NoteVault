const request = require('supertest');
const app = require('../../app');
const prisma = require('../config/prisma');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const bcrypt = require('bcrypt');

describe('Allocation Request Module API Tests (/api/allocations/requests)', () => {
  let tenant;
  let rootUser;
  let bossB;
  let coBossB;
  let viewerB;
  let bossC;
  let bossD;
  let coBossD;
  let outsider;

  let rootToken;
  let bossBToken;
  let coBossBToken;
  let viewerBToken;
  let bossCToken;
  let bossDToken;
  let coBossDToken;
  let outsiderToken;

  let uGoc;
  let uB;
  let uC;
  let uD;

  beforeAll(async () => {
    // Dọn dẹp dữ liệu test
    await prisma.transaction.deleteMany();
    await prisma.allocationRequest.deleteMany();
    await prisma.allocation.deleteMany();
    await prisma.unitMember.deleteMany();
    await prisma.user.updateMany({ data: { unitId: null } });
    await prisma.unit.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();

    const passwordHash = await bcrypt.hash('Password123!', 10);

    tenant = await prisma.tenant.create({
      data: { companyName: 'Công ty Tiên Phong Corp', code: 'req-corp' },
    });

    rootUser = await prisma.user.create({
      data: { email: 'root@req.corp', name: 'Giám Đốc Root', password: passwordHash, role: 'ROOT', tenantId: tenant.id },
    });

    bossB = await prisma.user.create({
      data: { email: 'bossb@req.corp', name: 'Sếp B', password: passwordHash, role: 'MEMBER', tenantId: tenant.id },
    });

    coBossB = await prisma.user.create({
      data: { email: 'cobossb@req.corp', name: 'Đồng Quản Lý B', password: passwordHash, role: 'MEMBER', tenantId: tenant.id },
    });

    viewerB = await prisma.user.create({
      data: { email: 'viewerb@req.corp', name: 'Xem Viên B', password: passwordHash, role: 'MEMBER', tenantId: tenant.id },
    });

    bossC = await prisma.user.create({
      data: { email: 'bossc@req.corp', name: 'Sếp C', password: passwordHash, role: 'MEMBER', tenantId: tenant.id },
    });

    bossD = await prisma.user.create({
      data: { email: 'bossd@req.corp', name: 'Sếp D', password: passwordHash, role: 'MEMBER', tenantId: tenant.id },
    });

    coBossD = await prisma.user.create({
      data: { email: 'cobossd@req.corp', name: 'Phó Phòng D', password: passwordHash, role: 'MEMBER', tenantId: tenant.id },
    });

    outsider = await prisma.user.create({
      data: { email: 'outsider@req.corp', name: 'Người Ngoài Cuộc', password: passwordHash, role: 'MEMBER', tenantId: tenant.id },
    });

    rootToken = jwt.sign({ userId: rootUser.id, email: rootUser.email, role: 'ROOT', tenantId: tenant.id }, config.jwt.secret, { expiresIn: '1h' });
    bossBToken = jwt.sign({ userId: bossB.id, email: bossB.email, role: 'MEMBER', tenantId: tenant.id }, config.jwt.secret, { expiresIn: '1h' });
    coBossBToken = jwt.sign({ userId: coBossB.id, email: coBossB.email, role: 'MEMBER', tenantId: tenant.id }, config.jwt.secret, { expiresIn: '1h' });
    viewerBToken = jwt.sign({ userId: viewerB.id, email: viewerB.email, role: 'MEMBER', tenantId: tenant.id }, config.jwt.secret, { expiresIn: '1h' });
    bossCToken = jwt.sign({ userId: bossC.id, email: bossC.email, role: 'MEMBER', tenantId: tenant.id }, config.jwt.secret, { expiresIn: '1h' });
    bossDToken = jwt.sign({ userId: bossD.id, email: bossD.email, role: 'MEMBER', tenantId: tenant.id }, config.jwt.secret, { expiresIn: '1h' });
    coBossDToken = jwt.sign({ userId: coBossD.id, email: coBossD.email, role: 'MEMBER', tenantId: tenant.id }, config.jwt.secret, { expiresIn: '1h' });
    outsiderToken = jwt.sign({ userId: outsider.id, email: outsider.email, role: 'MEMBER', tenantId: tenant.id }, config.jwt.secret, { expiresIn: '1h' });

    // Tạo cây 4 cấp: uGoc (Root) -> uB (Khối B) -> uC (Phòng C) -> uD (Nhóm D)
    uGoc = await prisma.unit.create({
      data: { name: 'Tổng Công Ty Gốc', parentId: null, ownerId: rootUser.id, tenantId: tenant.id },
    });
    uB = await prisma.unit.create({
      data: { name: 'Khối B', parentId: uGoc.id, ownerId: bossB.id, tenantId: tenant.id },
    });
    uC = await prisma.unit.create({
      data: { name: 'Phòng C', parentId: uB.id, ownerId: bossC.id, tenantId: tenant.id },
    });
    uD = await prisma.unit.create({
      data: { name: 'Nhóm D', parentId: uC.id, ownerId: bossD.id, tenantId: tenant.id },
    });

    // Gán thành viên và phân quyền trong unit_members
    await prisma.unitMember.create({ data: { unitId: uB.id, userId: coBossB.id, role: 'EDIT' } });
    await prisma.unitMember.create({ data: { unitId: uB.id, userId: viewerB.id, role: 'VIEWER' } });
    await prisma.unitMember.create({ data: { unitId: uD.id, userId: coBossD.id, role: 'EDIT' } });

    // Cấp ngân sách ban đầu:
    // Root nạp 1.000.000.000 đ vào Gốc
    await prisma.allocation.create({
      data: { tenantId: tenant.id, sourceUnitId: null, targetUnitId: uGoc.id, amount: 1_000_000_000n, createdById: rootUser.id, note: 'Nạp vốn ban đầu' },
    });

    // Gốc cấp 600.000.000 đ cho Khối B -> Gốc còn 400M, Khối B có 600M
    await prisma.allocation.create({
      data: { tenantId: tenant.id, sourceUnitId: uGoc.id, targetUnitId: uB.id, amount: 600_000_000n, createdById: rootUser.id, note: 'Cấp vốn Khối B' },
    });

    // Khối B cấp 100.000.000 đ cho Phòng C -> Khối B còn 500M, Phòng C có 100M
    await prisma.allocation.create({
      data: { tenantId: tenant.id, sourceUnitId: uB.id, targetUnitId: uC.id, amount: 100_000_000n, createdById: bossB.id, note: 'Cấp vốn Phòng C' },
    });

    // Nhóm D hiện có 0 đ. Cần 300.000.000 đ.
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany();
    await prisma.allocationRequest.deleteMany();
    await prisma.allocation.deleteMany();
    await prisma.unitMember.deleteMany();
    await prisma.user.updateMany({ data: { unitId: null } });
    await prisma.unit.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();
    await prisma.$disconnect();
  });

  describe('1. Khởi tạo Yêu cầu Xin Cấp Ngân Sách (Request Creation)', () => {
    it('Đơn vị gốc không có cấp trên cố tạo request -> Bị từ chối 400', async () => {
      const res = await request(app)
        .post('/api/allocations/requests')
        .set('Authorization', `Bearer ${rootToken}`)
        .send({
          destinationUnitId: uGoc.id,
          amount: '100000000',
          reason: 'Xin thêm tiền cho gốc',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('không có cấp trên');
    });

    it('Người ngoài không có quyền tại đơn vị D cố tạo request -> Bị từ chối 403', async () => {
      const res = await request(app)
        .post('/api/allocations/requests')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({
          destinationUnitId: uD.id,
          amount: '300000000',
          reason: 'Cần tiền mở chiến dịch quảng cáo',
        });

      expect(res.status).toBe(403);
    });

    it('Sếp D tạo request xin 300 triệu thành công -> Tự động hướng lên Cha trực tiếp (Phòng C)', async () => {
      const res = await request(app)
        .post('/api/allocations/requests')
        .set('Authorization', `Bearer ${bossDToken}`)
        .send({
          destinationUnitId: uD.id,
          amount: '300000000',
          reason: 'Chi phí triển khai server quý 4',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe('300000000');
      expect(res.body.data.destinationUnitId).toBe(uD.id);
      expect(res.body.data.currentUnitId).toBe(uC.id); // Tự động hướng tới Cha trực tiếp!
      expect(res.body.data.status).toBe('PENDING');

      // Kiểm tra chuỗi audit trail khởi tạo
      expect(res.body.data.forwardingHistory).toHaveLength(1);
      expect(res.body.data.forwardingHistory[0].action).toBe('CREATE');
      expect(res.body.data.forwardingHistory[0].unitId).toBe(uD.id);
    });

    it('Đồng quản lý (role EDIT) của Nhóm D cũng có quyền tạo request', async () => {
      const res = await request(app)
        .post('/api/allocations/requests')
        .set('Authorization', `Bearer ${coBossDToken}`)
        .send({
          destinationUnitId: uD.id,
          amount: '50000000',
          reason: 'Mua sắm thiết bị văn phòng',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('2. Duyệt & Chuyển tiếp theo chuỗi cấp trên (Multi-tier Endorsement)', () => {
    let activeRequestId;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/allocations/requests')
        .set('Authorization', `Bearer ${bossDToken}`)
        .send({
          destinationUnitId: uD.id,
          amount: '300000000',
          reason: 'Kinh phí dự án BigData',
        });
      activeRequestId = createRes.body.data.id;
    });

    it('Thành viên VIEWER tại Khối B cố chuyển tiếp -> Bị chặn 403', async () => {
      const res = await request(app)
        .post(`/api/allocations/requests/${activeRequestId}/forward`)
        .set('Authorization', `Bearer ${viewerBToken}`)
        .send({ note: 'Chuyển tiếp' });

      expect(res.status).toBe(403);
    });

    it('Sếp C kiểm tra thấy số dư chỉ có 100M (< 300M) nên bấm Duyệt & Chuyển tiếp lên Khối B', async () => {
      const res = await request(app)
        .post(`/api/allocations/requests/${activeRequestId}/forward`)
        .set('Authorization', `Bearer ${bossCToken}`)
        .send({ note: 'Phòng C số dư không đủ, kính chuyển Khối B cấp trên phê duyệt' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currentUnitId).toBe(uB.id); // Đã chuyển lên Khối B!
      expect(res.body.data.status).toBe('PENDING');

      // Kiểm tra chuỗi audit trail đã ghi nhận chữ ký duyệt của Phòng C
      const history = res.body.data.forwardingHistory;
      expect(history).toHaveLength(2);
      expect(history[1].action).toBe('ENDORSE_AND_FORWARD');
      expect(history[1].unitId).toBe(uC.id);
      expect(history[1].userName).toContain('Sếp C');
      expect(history[1].note).toContain('kính chuyển Khối B');
    });
  });

  describe('3. Khóa chống Race Condition giữa 2 sếp cùng phòng ban (5 phút TTL & 409 Conflict)', () => {
    let targetRequestId;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/allocations/requests')
        .set('Authorization', `Bearer ${bossDToken}`)
        .send({
          destinationUnitId: uD.id,
          amount: '300000000',
          reason: 'Chi phí server AI',
        });
      targetRequestId = createRes.body.data.id;

      // Sếp C duyệt & chuyển tiếp lên Khối B
      await request(app)
        .post(`/api/allocations/requests/${targetRequestId}/forward`)
        .set('Authorization', `Bearer ${bossCToken}`)
        .send({ note: 'Chuyển lên Khối B' });
    });

    it('Sếp B (Owner Khối B) bấm lock để tiến hành xử lý -> Khóa thành công trong 5 phút (300s)', async () => {
      const res = await request(app)
        .post(`/api/allocations/requests/${targetRequestId}/lock`)
        .set('Authorization', `Bearer ${bossBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ALLOCATING');
      expect(res.body.data.lockedById).toBe(bossB.id);
      expect(res.body.data.lockedByName).toBe('Sếp B');
      expect(res.body.data.remainingSeconds).toBe(300);
    });

    it('Đồng quản lý B (role EDIT) cố bấm lock hoặc approve cùng lúc -> Bị chặn 409 Conflict kèm tên Sếp B', async () => {
      // Thử bấm lock
      const lockRes = await request(app)
        .post(`/api/allocations/requests/${targetRequestId}/lock`)
        .set('Authorization', `Bearer ${coBossBToken}`);

      expect(lockRes.status).toBe(409);
      expect(lockRes.body.message).toContain('Yêu cầu đang chờ được xử lý hoặc có thể bị hủy bởi Sếp B');

      // Thử bấm approve
      const approveRes = await request(app)
        .post(`/api/allocations/requests/${targetRequestId}/approve`)
        .set('Authorization', `Bearer ${coBossBToken}`)
        .send({ confirmation: 'CONFIRM' });

      expect(approveRes.status).toBe(409);
      expect(approveRes.body.message).toContain('Yêu cầu đang chờ được xử lý hoặc có thể bị hủy bởi Sếp B');
    });

    it('Đồng quản lý B không thể tự ý unlock khóa của Sếp B -> Bị từ chối 403', async () => {
      const res = await request(app)
        .post(`/api/allocations/requests/${targetRequestId}/unlock`)
        .set('Authorization', `Bearer ${coBossBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Chỉ người đang giữ khóa hoặc ROOT');
    });

    it('Sếp B chủ động bấm unlock -> Giải phóng khóa trở về PENDING', async () => {
      const res = await request(app)
        .post(`/api/allocations/requests/${targetRequestId}/unlock`)
        .set('Authorization', `Bearer ${bossBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PENDING');
    });

    it('Stale Lock Eviction: Khóa quá 5 phút sẽ tự động hết hạn và cho phép sếp khác chiếm quyền', async () => {
      // Sếp B lock lại
      await request(app)
        .post(`/api/allocations/requests/${targetRequestId}/lock`)
        .set('Authorization', `Bearer ${bossBToken}`);

      // Giả lập thời gian trôi qua 6 phút (360 giây > 300 giây)
      const sixMinutesAgo = new Date(Date.now() - 360 * 1000);
      await prisma.allocationRequest.update({
        where: { id: targetRequestId },
        data: { lockedAt: sixMinutesAgo },
      });

      // Đồng quản lý B thao tác lại -> Chiếm khóa thành công vì khóa cũ đã hết hạn!
      const res = await request(app)
        .post(`/api/allocations/requests/${targetRequestId}/lock`)
        .set('Authorization', `Bearer ${coBossBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.lockedById).toBe(coBossB.id);
      expect(res.body.data.lockedByName).toBe('Đồng Quản Lý B');
    });
  });

  describe('4. Xác nhận CONFIRM & Rót tiền Trực tiếp từ cấp đủ ngân sách (Direct Funding)', () => {
    let fundRequestId;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/allocations/requests')
        .set('Authorization', `Bearer ${bossDToken}`)
        .send({
          destinationUnitId: uD.id,
          amount: '300000000',
          reason: 'Chi phí mở rộng thị trường miền Trung',
        });
      fundRequestId = createRes.body.data.id;

      // Sếp C chuyển tiếp lên Khối B
      await request(app)
        .post(`/api/allocations/requests/${fundRequestId}/forward`)
        .set('Authorization', `Bearer ${bossCToken}`)
        .send({ note: 'Phòng C kính chuyển Khối B duyệt kinh phí' });
    });

    it('Quên hoặc gõ sai confirmation (không phải CONFIRM) -> Bị chặn 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/allocations/requests/${fundRequestId}/approve`)
        .set('Authorization', `Bearer ${bossBToken}`)
        .send({ confirmation: 'OK_GO' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Vui lòng nhập chính xác "CONFIRM" hoặc "XÁC NHẬN"');
    });

    it('Sếp B gửi confirmation: "CONFIRM" -> Giải ngân thành công trực tiếp từ Khối B xuống Nhóm D', async () => {
      const res = await request(app)
        .post(`/api/allocations/requests/${fundRequestId}/approve`)
        .set('Authorization', `Bearer ${bossBToken}`)
        .send({
          confirmation: 'CONFIRM',
          note: 'Khối B phê duyệt giải ngân trực tiếp cho Nhóm D',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');
      expect(res.body.data.fundedByUnitId).toBe(uB.id);
      expect(res.body.data.fundedByUserId).toBe(bossB.id);
      expect(res.body.data.allocationId).toBeDefined();

      // Kiểm tra biến động số dư:
      // Khối B ban đầu có 500M -> sau khi rót 300M còn đúng 200M
      const balB = await request(app).get(`/api/units/${uB.id}/balance`).set('Authorization', `Bearer ${rootToken}`);
      expect(balB.body.data.safeBalance).toBe('200000000');

      // Nhóm D ban đầu có 0M -> nhận 300M trực tiếp thành 300M
      const balD = await request(app).get(`/api/units/${uD.id}/balance`).set('Authorization', `Bearer ${rootToken}`);
      expect(balD.body.data.safeBalance).toBe('300000000');

      // Phòng C (trung gian) KHÔNG BỊ TRỪ VÀ CŨNG KHÔNG BỊ CỘNG -> Giữ nguyên 100M
      const balC = await request(app).get(`/api/units/${uC.id}/balance`).set('Authorization', `Bearer ${rootToken}`);
      expect(balC.body.data.safeBalance).toBe('100000000');
    });
  });

  describe('5. Minh bạch Tuyệt đối khi Từ chối (Transparent Rejection Audit Trail)', () => {
    let rejectRequestId;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/allocations/requests')
        .set('Authorization', `Bearer ${bossDToken}`)
        .send({
          destinationUnitId: uD.id,
          amount: '80000000',
          reason: 'Mua dàn máy trạm đồ họa',
        });
      rejectRequestId = createRes.body.data.id;
    });

    it('Từ chối mà không có lý do -> Bị chặn 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/allocations/requests/${rejectRequestId}/reject`)
        .set('Authorization', `Bearer ${bossCToken}`)
        .send({ reason: '' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Lý do từ chối (reason) là bắt buộc');
    });

    it('Sếp C từ chối kèm lý do -> Lưu đầy đủ phòng ban từ chối, người từ chối, timestamp và lý do', async () => {
      const res = await request(app)
        .post(`/api/allocations/requests/${rejectRequestId}/reject`)
        .set('Authorization', `Bearer ${bossCToken}`)
        .send({ reason: 'Chi phí chưa nằm trong danh mục ngân sách được phê duyệt quý này' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('REJECTED');
      expect(res.body.data.rejectedByUnitId).toBe(uC.id);
      expect(res.body.data.rejectedByUserId).toBe(bossC.id);
      expect(res.body.data.rejectionReason).toBe('Chi phí chưa nằm trong danh mục ngân sách được phê duyệt quý này');
      expect(res.body.data.rejectedAt).toBeDefined();

      // Kiểm tra GET chi tiết: Nhóm D xem thấy rõ ràng, minh bạch
      const detailRes = await request(app)
        .get(`/api/allocations/requests/${rejectRequestId}`)
        .set('Authorization', `Bearer ${bossDToken}`);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.status).toBe('REJECTED');
      expect(detailRes.body.data.rejectedByUnit.name).toBe('Phòng C');
      expect(detailRes.body.data.rejectedByUser.name).toBe('Sếp C');
      expect(detailRes.body.data.rejectionReason).toMatch(/chưa nằm trong danh mục/i);
    });
  });

  describe('6. Hủy Yêu Cầu bởi Người Tạo (Cancel Request)', () => {
    let cancelRequestId;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/allocations/requests')
        .set('Authorization', `Bearer ${bossDToken}`)
        .send({
          destinationUnitId: uD.id,
          amount: '20000000',
          reason: 'Chi phí party nội bộ',
        });
      cancelRequestId = createRes.body.data.id;
    });

    it('Người ngoài không thể hủy yêu cầu của người khác -> 403', async () => {
      const res = await request(app)
        .post(`/api/allocations/requests/${cancelRequestId}/cancel`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
    });

    it('Người tạo chủ động hủy yêu cầu khi đang PENDING thành công', async () => {
      const res = await request(app)
        .post(`/api/allocations/requests/${cancelRequestId}/cancel`)
        .set('Authorization', `Bearer ${bossDToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CANCELLED');
    });
  });

  describe('7. Phân quyền Tầm nhìn & Danh sách Yêu cầu (Visibility & Filters)', () => {
    it('ROOT xem được danh sách tất cả các yêu cầu trong toàn công ty', async () => {
      const res = await request(app)
        .get('/api/allocations/requests')
        .set('Authorization', `Bearer ${rootToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(3);
    });

    it('Lọc yêu cầu theo trạng thái status = "APPROVED"', async () => {
      const res = await request(app)
        .get('/api/allocations/requests?status=APPROVED')
        .set('Authorization', `Bearer ${rootToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.items[0].status).toBe('APPROVED');
    });

    it('Lọc yêu cầu theo unitId của Nhóm D', async () => {
      const res = await request(app)
        .get(`/api/allocations/requests?unitId=${uD.id}`)
        .set('Authorization', `Bearer ${bossDToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
    });
  });
});
