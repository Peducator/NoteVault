// backend/prisma/seed_special_org.js
/**
 * SEED SCRIPT: Kịch bản Cơ cấu Tổ chức Đặc biệt (Đại Việt Group)
 * -------------------------------------------------------------
 * 1. Root User tạo Tenant: "Tập Đoàn Công Nghệ & Thương Mại Đại Việt" (code: "daiviet")
 * 2. Root Unit: "Tổng Công Ty Đại Việt" (parentId = null, owner = Root)
 * 3. Root ủy quyền 2 Cha quản lý 2 Khối trung gian:
 *    - Cha 1: Trần Văn Cha 1 -> Quản lý "Khối Vận Hành & Kỹ Thuật" (allowCreateSubUnit = true)
 *    - Cha 2: Lê Văn Cha 2  -> Quản lý "Khối Kinh Doanh & Tiếp Thị" (allowCreateSubUnit = true)
 * 4. 4 Phòng ban ban đầu:
 *    - Dưới Cha 1: "Phòng Kỹ Thuật Hạ Tầng" (Anh Cả 1) & "Phòng Vận Hành Hệ Thống" (Anh Cả 2)
 *    - Dưới Cha 2: "Phòng Kinh Doanh Nội Địa" (Anh Cả 3) & "Phòng Kinh Doanh Quốc Tế" (Anh Cả 4)
 * 5. 2 Nhóm Nest do 2 Cha tự tạo thêm:
 *    - Cha 1 tạo: "Đội Phát Triển IT" (Anh Cả IT)
 *    - Cha 2 tạo: "Đội Marketing & Media" (Anh Cả MKT)
 * 6. Đúng 4 người mỗi nhóm (1 Anh Cả, 1 Người Đặc Biệt, 2 nhân viên chuyên trách)
 * 7. 1 "Người Đặc Biệt" (dacbiet.kiemtoan@daiviet.test) nằm trong TẤT CẢ 6 nhóm!
 */

const { PrismaClient } = require('@prisma/client');
let bcrypt;
try { bcrypt = require('bcrypt'); } catch { bcrypt = require('bcryptjs'); }

BigInt.prototype.toJSON = function () { return this.toString(); };

const prisma = new PrismaClient();
const M = 1_000_000n; // 1 triệu VND

async function main() {
  console.log('🚀 Bắt đầu khởi tạo bộ dữ liệu thực tế: Tập Đoàn Đại Việt...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Dọn dẹp dữ liệu cũ của tenant daiviet nếu đã tồn tại để đảm bảo tính lũy kế (idempotent)
  const existingTenant = await prisma.tenant.findUnique({
    where: { code: 'daiviet' },
  });

  if (existingTenant) {
    console.log('🧹 Dọn dẹp dữ liệu cũ của tenant "daiviet"...');
    const tenantId = existingTenant.id;
    await prisma.transaction.deleteMany({ where: { tenantId } });
    await prisma.allocation.deleteMany({ where: { tenantId } });
    await prisma.unitMember.deleteMany({ where: { unit: { tenantId } } });
    await prisma.user.updateMany({ where: { tenantId }, data: { unitId: null } });
    await prisma.unit.deleteMany({ where: { tenantId } });
    await prisma.category.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
  }

  // 2. Tạo Tenant Đại Việt
  const tenant = await prisma.tenant.create({
    data: {
      companyName: 'Tập Đoàn Công Nghệ & Thương Mại Đại Việt',
      code: 'daiviet',
    },
  });
  const tenantId = tenant.id;
  console.log(`✅ Đã tạo Tenant: ${tenant.companyName} (ID: ${tenantId})`);

  // Helper tạo user
  const createUser = async (email, name, role = 'MEMBER', employeeCode = null) => {
    return prisma.user.create({
      data: {
        tenantId,
        email,
        name,
        password: passwordHash,
        role,
        employeeCode,
      },
    });
  };

  // Helper thêm vào unitMember
  const addUnitMember = async (unitId, userId) => {
    return prisma.unitMember.upsert({
      where: {
        unitId_userId: { unitId, userId },
      },
      create: { unitId, userId },
      update: {},
    });
  };

  // 3. Tạo Người Đứng Đầu & Đơn Vị Cha Cao Nhất (parentId = null)
  const rootUser = await createUser('root@daiviet.test', 'Nguyễn Văn Đại', 'ROOT', 'DV-TOP');

  const rootUnit = await prisma.unit.create({
    data: {
      name: 'Tổng Công Ty Đại Việt',
      tenantId,
      parentId: null,
      ownerId: rootUser.id,
      allowMemberViewBalance: true,
      allowCreateSubUnit: true,
    },
  });
  await prisma.user.update({ where: { id: rootUser.id }, data: { unitId: rootUnit.id } });
  await addUnitMember(rootUnit.id, rootUser.id);
  console.log(`✅ Đã tạo Đơn vị cha cao nhất (parentId = null): ${rootUnit.name} (Owner: ${rootUser.name})`);

  // 4. Tạo 2 Người làm "Cha" do Root ủy quyền quản lý 2 Khối
  const cha1 = await createUser('cha1.vanhanh@daiviet.test', 'Trần Văn Cha 1', 'MEMBER', 'DV-CHA1');
  const cha2 = await createUser('cha2.kinhdoanh@daiviet.test', 'Lê Văn Cha 2', 'MEMBER', 'DV-CHA2');

  const unitKhoiVanHanh = await prisma.unit.create({
    data: {
      name: 'Khối Vận Hành & Kỹ Thuật',
      tenantId,
      parentId: rootUnit.id,
      ownerId: cha1.id,
      allowMemberViewBalance: true,
      allowCreateSubUnit: true, // Cha 1 có quyền tạo nhánh IT
    },
  });
  await prisma.user.update({ where: { id: cha1.id }, data: { unitId: unitKhoiVanHanh.id } });
  await addUnitMember(unitKhoiVanHanh.id, cha1.id);

  const unitKhoiKinhDoanh = await prisma.unit.create({
    data: {
      name: 'Khối Kinh Doanh & Tiếp Thị',
      tenantId,
      parentId: rootUnit.id,
      ownerId: cha2.id,
      allowMemberViewBalance: true,
      allowCreateSubUnit: true, // Cha 2 có quyền tạo nhánh Marketing
    },
  });
  await prisma.user.update({ where: { id: cha2.id }, data: { unitId: unitKhoiKinhDoanh.id } });
  await addUnitMember(unitKhoiKinhDoanh.id, cha2.id);

  console.log(`✅ Đã tạo 2 Khối Cha: "${unitKhoiVanHanh.name}" và "${unitKhoiKinhDoanh.name}"`);

  // 5. Tạo 1 NGƯỜI ĐẶC BIỆT (Kế toán trưởng / Kiểm toán nội bộ)
  const specialUser = await createUser(
    'dacbiet.kiemtoan@daiviet.test',
    'Vũ Thị Đặc Biệt (Kiểm Toán & Giám Sát)',
    'MEMBER',
    'DV-SPECIAL'
  );
  console.log(`⭐ Đã tạo Người Đặc Biệt: ${specialUser.name} (${specialUser.email})`);

  // 6. Tạo 4 Nhóm ban đầu + 2 Nhóm Nest do 2 Cha tạo thêm
  // Tổng cộng 6 nhóm lá:
  const groupConfigs = [
    {
      name: 'Phòng Kỹ Thuật Hạ Tầng',
      parentUnitId: unitKhoiVanHanh.id,
      anhCa: { email: 'anhca.hatang@daiviet.test', name: 'Hoàng Anh Cả 1 (Hạ Tầng)', code: 'AC-HT' },
      members: [
        { email: 'nv1.hatang@daiviet.test', name: 'Nguyễn Văn Thắng (Kỹ sư Cloud)', code: 'NV-HT1' },
        { email: 'nv2.hatang@daiviet.test', name: 'Trần Thị Mai (Kỹ sư Network)', code: 'NV-HT2' },
      ],
    },
    {
      name: 'Phòng Vận Hành Hệ Thống',
      parentUnitId: unitKhoiVanHanh.id,
      anhCa: { email: 'anhca.vanhanh@daiviet.test', name: 'Phạm Anh Cả 2 (Vận Hành)', code: 'AC-VH' },
      members: [
        { email: 'nv1.vanhanh@daiviet.test', name: 'Lê Văn Lực (DevOps Engineer)', code: 'NV-VH1' },
        { email: 'nv2.vanhanh@daiviet.test', name: 'Phạm Thị Lan (SysAdmin)', code: 'NV-VH2' },
      ],
    },
    {
      name: 'Đội Phát Triển IT', // Nest do Cha 1 tạo
      parentUnitId: unitKhoiVanHanh.id,
      anhCa: { email: 'anhca.it@daiviet.test', name: 'Bùi Anh Cả IT (Trưởng Nhóm Dev)', code: 'AC-IT' },
      members: [
        { email: 'nv1.it@daiviet.test', name: 'Trần Văn Dev (Backend Senior)', code: 'NV-IT1' },
        { email: 'nv2.it@daiviet.test', name: 'Lê Thị Tester (QA Lead)', code: 'NV-IT2' },
      ],
    },
    {
      name: 'Phòng Kinh Doanh Nội Địa',
      parentUnitId: unitKhoiKinhDoanh.id,
      anhCa: { email: 'anhca.kdnoidia@daiviet.test', name: 'Đỗ Anh Cả 3 (KD Nội Địa)', code: 'AC-KDN' },
      members: [
        { email: 'nv1.kdnoidia@daiviet.test', name: 'Hoàng Văn Nam (Account Manager)', code: 'NV-KDN1' },
        { email: 'nv2.kdnoidia@daiviet.test', name: 'Vũ Thị Hoa (Sales Executive)', code: 'NV-KDN2' },
      ],
    },
    {
      name: 'Phòng Kinh Doanh Quốc Tế',
      parentUnitId: unitKhoiKinhDoanh.id,
      anhCa: { email: 'anhca.kdquocte@daiviet.test', name: 'Ngô Anh Cả 4 (KD Quốc Tế)', code: 'AC-KDQ' },
      members: [
        { email: 'nv1.kdquocte@daiviet.test', name: 'Đinh Văn Phong (Overseas Sales)', code: 'NV-KDQ1' },
        { email: 'nv2.kdquocte@daiviet.test', name: 'Nguyễn Thị Linh (Global Partnership)', code: 'NV-KDQ2' },
      ],
    },
    {
      name: 'Đội Marketing & Media', // Nest do Cha 2 tạo
      parentUnitId: unitKhoiKinhDoanh.id,
      anhCa: { email: 'anhca.mkt@daiviet.test', name: 'Đặng Anh Cả MKT (Trưởng Đội MKT)', code: 'AC-MKT' },
      members: [
        { email: 'nv1.mkt@daiviet.test', name: 'Ngô Văn Content (Content Lead)', code: 'NV-MKT1' },
        { email: 'nv2.mkt@daiviet.test', name: 'Đặng Thị Designer (UI Designer)', code: 'NV-MKT2' },
      ],
    },
  ];

  const createdUnits = [];

  for (const cfg of groupConfigs) {
    // A. Tạo Anh Cả của nhóm
    const anhCaUser = await createUser(cfg.anhCa.email, cfg.anhCa.name, 'MEMBER', cfg.anhCa.code);

    // B. Tạo đơn vị (Unit)
    const unit = await prisma.unit.create({
      data: {
        name: cfg.name,
        tenantId,
        parentId: cfg.parentUnitId,
        ownerId: anhCaUser.id,
        allowMemberViewBalance: true,
        allowCreateSubUnit: false,
      },
    });

    await prisma.user.update({ where: { id: anhCaUser.id }, data: { unitId: unit.id } });
    await addUnitMember(unit.id, anhCaUser.id);

    // C. Thêm 2 nhân viên chuyên trách
    for (const m of cfg.members) {
      const u = await createUser(m.email, m.name, 'MEMBER', m.code);
      await prisma.user.update({ where: { id: u.id }, data: { unitId: unit.id } });
      await addUnitMember(unit.id, u.id);
    }

    // D. GÁN NGƯỜI ĐẶC BIỆT VÀO NHÓM NÀY (Bảng unit_members)
    await addUnitMember(unit.id, specialUser.id);

    createdUnits.push(unit);
    console.log(`📌 Tạo nhóm "${unit.name}" (4 thành viên: 1 Anh Cả, 2 Chuyên trách, 1 Người Đặc Biệt)`);
  }

  // Gán đơn vị chính (primary unitId) cho Người Đặc Biệt vào nhóm IT (hoặc bất kỳ)
  await prisma.user.update({
    where: { id: specialUser.id },
    data: { unitId: createdUnits[2].id }, // Đội Phát Triển IT
  });

  // 7. Tạo Danh Mục Chi Tiêu chuẩn doanh nghiệp
  const catIT = await prisma.category.create({
    data: { tenantId, name: 'Hạ tầng máy chủ & Bản quyền phần mềm', type: 'EXPENSE', icon: 'server' },
  });
  const catMkt = await prisma.category.create({
    data: { tenantId, name: 'Quảng cáo & Tổ chức sự kiện', type: 'EXPENSE', icon: 'campaign' },
  });
  const catTravel = await prisma.category.create({
    data: { tenantId, name: 'Công tác phí & Vé máy bay', type: 'EXPENSE', icon: 'flight' },
  });
  const catOffice = await prisma.category.create({
    data: { tenantId, name: 'Văn phòng phẩm & Phúc lợi', type: 'EXPENSE', icon: 'coffee' },
  });

  // 8. Cấp Vốn & Dòng tiền ngân sách (Allocations)
  console.log('💰 Khởi tạo ngân sách dòng tiền phân bổ...');

  // A. Nạp vốn ban đầu 10 tỷ cho Tổng Công Ty
  await prisma.allocation.create({
    data: {
      tenantId,
      sourceUnitId: null,
      targetUnitId: rootUnit.id,
      amount: 10_000n * M, // 10.000.000.000 VND
      createdById: rootUser.id,
      note: 'Vốn điều lệ ban đầu Tập Đoàn Đại Việt 2026',
    },
  });

  // B. Gốc cấp cho 2 Khối Cha (mỗi khối 4 tỷ)
  await prisma.allocation.create({
    data: {
      tenantId,
      sourceUnitId: rootUnit.id,
      targetUnitId: unitKhoiVanHanh.id,
      amount: 4_000n * M, // 4 tỷ
      createdById: rootUser.id,
      note: 'Ngân sách Quý 4 cho Khối Vận Hành & Kỹ Thuật',
    },
  });

  await prisma.allocation.create({
    data: {
      tenantId,
      sourceUnitId: rootUnit.id,
      targetUnitId: unitKhoiKinhDoanh.id,
      amount: 4_000n * M, // 4 tỷ
      createdById: rootUser.id,
      note: 'Ngân sách Quý 4 cho Khối Kinh Doanh & Tiếp Thị',
    },
  });

  // C. 2 Khối Cha cấp tiếp cho các nhóm lá (mỗi nhóm 800 triệu - 1 tỷ)
  const budgets = [800n * M, 800n * M, 1_200n * M, 900n * M, 1_100n * M, 1_000n * M];
  for (let i = 0; i < createdUnits.length; i++) {
    const u = createdUnits[i];
    const creatorId = u.parentId === unitKhoiVanHanh.id ? cha1.id : cha2.id;
    await prisma.allocation.create({
      data: {
        tenantId,
        sourceUnitId: u.parentId,
        targetUnitId: u.id,
        amount: budgets[i],
        createdById: creatorId,
        note: `Ngân sách hoạt động cho ${u.name}`,
      },
    });
  }

  // 9. Tạo một số khoản chi tiêu mẫu (Transactions)
  // Người đặc biệt tạo chi tiêu ở các nhóm khác nhau:
  await prisma.transaction.create({
    data: {
      tenantId,
      unitId: createdUnits[2].id, // Đội Phát Triển IT
      userId: specialUser.id,
      categoryId: catIT.id,
      amount: 45n * M, // 45tr
      type: 'EXPENSE',
      status: 'APPROVED',
      note: 'Gia hạn chứng chỉ SSL và hạ tầng Kubernetes kiểm toán',
      transactionDate: new Date(),
    },
  });

  await prisma.transaction.create({
    data: {
      tenantId,
      unitId: createdUnits[5].id, // Đội Marketing
      userId: specialUser.id,
      categoryId: catMkt.id,
      amount: 30n * M, // 30tr
      type: 'EXPENSE',
      status: 'SUBMITTED',
      note: 'Kiểm toán chi phí sự kiện ra mắt thương hiệu',
      transactionDate: new Date(),
    },
  });

  console.log('🎉 Hoàn tất Seed dữ liệu Cơ cấu Tổ chức Tập Đoàn Đại Việt!');
  console.log('📌 THÔNG TIN TỔ CHỨC ĐÃ TẠO (QUY ƯỚC: CHỈ CÓ PARENT VÀ CHILDREN):');
  console.log('• Tenant Code: "daiviet" | Tên: "Tập Đoàn Công Nghệ & Thương Mại Đại Việt"');
  console.log('• Đơn vị cha cao nhất (parentId = null): Tổng Công Ty Đại Việt (Chủ tịch: Nguyễn Văn Đại - root@daiviet.test)');
  console.log('• Đơn vị con (children) cấp 1 - Khối Vận Hành: cha1.vanhanh@daiviet.test');
  console.log('• Đơn vị con (children) cấp 1 - Khối Kinh Doanh: cha2.kinhdoanh@daiviet.test');
  console.log('• Người Đặc Biệt (Trong CẢ 6 nhóm children cấp lá): dacbiet.kiemtoan@daiviet.test');
  console.log('• Tổng số nhóm con cấp lá (children rỗng): 6 nhóm (mỗi nhóm đúng 4 thành viên)');
  console.log('------------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi chạy Seed Script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
