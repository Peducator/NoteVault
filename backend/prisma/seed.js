// backend/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
let bcrypt;
try { bcrypt = require('bcrypt'); } catch { bcrypt = require('bcryptjs'); }

BigInt.prototype.toJSON = function () { return this.toString(); };

const prisma = new PrismaClient();
const M = 1_000_000n; // 1 triệu VND

async function calculateSafeBalance(unitId) {
  const received = await prisma.allocation.aggregate({
    where: { targetUnitId: unitId },
    _sum: { amount: true },
  });
  const sent = await prisma.allocation.aggregate({
    where: { sourceUnitId: unitId },
    _sum: { amount: true },
  });
  const approvedExpenses = await prisma.transaction.aggregate({
    where: { unitId, status: 'APPROVED' },
    _sum: { amount: true },
  });

  const totalIn = received._sum.amount || 0n;
  const totalOut = sent._sum.amount || 0n;
  const totalSpent = approvedExpenses._sum.amount || 0n;

  return totalIn - totalOut - totalSpent;
}

async function main() {
  console.log('🌱 Bắt đầu dọn dẹp và nạp dữ liệu mẫu (Seed)...');

  // ============ 0. CLEANUP (Tránh lỗi FK vòng) ============
  await prisma.transaction.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.bankingInformation.deleteMany();
  await prisma.user.updateMany({ data: { unitId: null } });
  await prisma.unit.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);
  const now = new Date();

  // ============ 1. CÔNG TY ABC (code "abc") ============
  const tenantA = await prisma.tenant.create({
    data: { companyName: 'Công ty ABC', code: 'abc' },
  });

  const mkUser = (tenantId, email, name, role) =>
    prisma.user.create({ data: { tenantId, email, name, password: passwordHash, role } });

  const giamdoc  = await mkUser(tenantA.id, 'giamdoc@abc.test', 'Giám đốc Hoàng', 'ROOT');
  const truongkd = await mkUser(tenantA.id, 'truongkd@abc.test', 'Trưởng khối KD Khoa', 'ROOT');
  const an       = await mkUser(tenantA.id, 'an@abc.test', 'An (Sales)', 'MEMBER');
  const dung     = await mkUser(tenantA.id, 'dung@abc.test', 'Dũng (Sales)', 'MEMBER');
  const em       = await mkUser(tenantA.id, 'em@abc.test', 'Em (Sales)', 'MEMBER');
  const binh     = await mkUser(tenantA.id, 'binh@abc.test', 'Bình (Marketing)', 'MEMBER');
  const phuong   = await mkUser(tenantA.id, 'phuong@abc.test', 'Phương (Marketing)', 'MEMBER');

  const mkUnit = (tenantId, name, parentId, ownerId) =>
    prisma.unit.create({ data: { tenantId, name, parentId, ownerId } });

  const uGoc   = await mkUnit(tenantA.id, 'ABC (gốc)', null, giamdoc.id);
  const uKD    = await mkUnit(tenantA.id, 'Khối Kinh doanh', uGoc.id, truongkd.id);
  const uSales = await mkUnit(tenantA.id, 'Nhóm Sales', uKD.id, an.id);
  const uMkt   = await mkUnit(tenantA.id, 'Nhóm Marketing', uKD.id, binh.id);

  // Gán unitId: Owner của unit PHẢI thuộc chính unit đó
  const assign = [
    [giamdoc, uGoc],
    [truongkd, uKD],
    [an, uSales], [dung, uSales], [em, uSales],
    [binh, uMkt], [phuong, uMkt],
  ];
  for (const [u, unit] of assign) {
    await prisma.user.update({ where: { id: u.id }, data: { unitId: unit.id } });
  }

  // Cấp tiền (Allocation)
  const alloc = (tenantId, sourceUnitId, targetUnitId, amount, createdById, note) =>
    prisma.allocation.create({
      data: { tenantId, sourceUnitId, targetUnitId, amount, createdById, note },
    });

  await alloc(tenantA.id, null, uGoc.id, 1000n * M, giamdoc.id, 'Nạp vốn ban đầu');
  await alloc(tenantA.id, uGoc.id, uKD.id, 400n * M, giamdoc.id, 'Cấp khối KD');
  await alloc(tenantA.id, uKD.id, uSales.id, 150n * M, truongkd.id, 'Cấp Sales');
  await alloc(tenantA.id, uKD.id, uMkt.id, 100n * M, truongkd.id, 'Cấp Marketing');

  // Danh mục công ty ABC
  const catAn    = await prisma.category.create({ data: { tenantId: tenantA.id, name: 'Ăn uống' } });
  const catDiLai = await prisma.category.create({ data: { tenantId: tenantA.id, name: 'Đi lại' } });

  // Giao dịch ở Sales và Marketing
  const tx = (tenantId, categoryId, unitId, userId, amount, status, note, extra = {}) =>
    prisma.transaction.create({
      data: { tenantId, categoryId, unitId, userId, amount, status, note, ...extra },
    });
  const approvedBy = (by) => ({ approvedById: by.id, approvedAt: now });

  // Sales:
  await tx(tenantA.id, catAn.id, uSales.id, dung.id, 12n * M, 'APPROVED', 'Tiếp khách', approvedBy(an));
  await tx(tenantA.id, catDiLai.id, uSales.id, dung.id, 8n * M, 'APPROVED', 'Công tác Đà Nẵng', approvedBy(an));
  await tx(tenantA.id, catAn.id, uSales.id, em.id, 3n * M, 'SUBMITTED', 'Ăn trưa khách hàng');
  await tx(tenantA.id, catAn.id, uSales.id, em.id, 2n * M, 'REJECTED', 'Chi tiêu công tác',
    { approvedById: an.id, approvedAt: now, rejectionReason: 'Thiếu hóa đơn VAT hợp lệ' });
  await tx(tenantA.id, catDiLai.id, uSales.id, an.id, 6n * M, 'APPROVED', 'Taxi họp đối tác', approvedBy(truongkd));
  await tx(tenantA.id, catAn.id, uSales.id, an.id, 5n * M, 'SUBMITTED', 'Liên hoan nhóm');

  // Marketing:
  await tx(tenantA.id, catAn.id, uMkt.id, phuong.id, 20n * M, 'APPROVED', 'Chạy quảng cáo', approvedBy(binh));
  await tx(tenantA.id, catAn.id, uMkt.id, phuong.id, 1n * M, 'SUBMITTED', 'Văn phòng phẩm');

  // ============ 2. CÔNG TY XYZ (code "xyz") ============
  const tenantB = await prisma.tenant.create({
    data: { companyName: 'Công ty XYZ', code: 'xyz' },
  });
  const rootb = await prisma.user.create({
    data: { tenantId: tenantB.id, email: 'root@xyz.test', name: 'Chủ XYZ', password: passwordHash, role: 'ROOT' },
  });
  const nv = await prisma.user.create({
    data: { tenantId: tenantB.id, email: 'nv@xyz.test', name: 'Nhân viên XYZ', password: passwordHash, role: 'MEMBER' },
  });
  const uB = await mkUnit(tenantB.id, 'XYZ (gốc)', null, rootb.id);
  await prisma.user.update({ where: { id: rootb.id }, data: { unitId: uB.id } });
  await prisma.user.update({ where: { id: nv.id }, data: { unitId: uB.id } });

  await alloc(tenantB.id, null, uB.id, 50n * M, rootb.id, 'Nạp vốn ban đầu');
  const catB = await prisma.category.create({ data: { tenantId: tenantB.id, name: 'Văn phòng' } });

  await tx(tenantB.id, catB.id, uB.id, rootb.id, 5n * M, 'APPROVED', 'Mua máy in', approvedBy(rootb));
  await tx(tenantB.id, catB.id, uB.id, nv.id, 2n * M, 'SUBMITTED', 'Mua đồ văn phòng');

  // ============ 3. KIỂM TRA SỐ DƯ ĐỐI CHIẾU ============
  console.log('\n📊 ĐỐI CHIẾU SỐ DƯ KỲ VỌNG SAU SEED:');
  const expectedList = [
    { name: 'ABC gốc', unitId: uGoc.id, expected: 600n * M },
    { name: 'Khối KD', unitId: uKD.id, expected: 150n * M },
    { name: 'Sales', unitId: uSales.id, expected: 124n * M },
    { name: 'Marketing', unitId: uMkt.id, expected: 80n * M },
    { name: 'XYZ gốc', unitId: uB.id, expected: 45n * M },
  ];

  let hasError = false;
  for (const item of expectedList) {
    const actual = await calculateSafeBalance(item.unitId);
    const isMatch = actual === item.expected;
    const actualStr = `${actual / M}tr`.padEnd(6);
    const expectedStr = `${item.expected / M}tr`.padEnd(6);
    console.log(`- ${item.name.padEnd(12)}: Thực tế = ${actualStr} | Kỳ vọng = ${expectedStr} -> ${isMatch ? '✅ KHỚP' : '❌ LỆCH'}`);
    if (!isMatch) {
      hasError = true;
    }
  }

  if (hasError) {
    throw new Error('❌ CÓ SỐ DƯ BỊ LỆCH SO VỚI KỲ VỌNG!');
  }

  console.log('\n🎉 SEED THÀNH CÔNG VÀ TOÀN BỘ SỐ DƯ KHỚP 100%!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi Seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
