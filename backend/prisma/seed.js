const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  console.log('=== BẮT ĐẦU SEED DỮ LIỆU THỰC VÀO DATABASE ===');

  // 1. Tạo hoặc lấy Doanh nghiệp: Tập Đoàn Công Nghệ A
  let tenantA = await prisma.tenant.findUnique({
    where: { code: 'cong-ty-a' },
  });

  if (!tenantA) {
    tenantA = await prisma.tenant.create({
      data: {
        companyName: 'Tập Đoàn Công Nghệ A',
        code: 'cong-ty-a',
        uuid: crypto.randomUUID(),
      },
    });
    console.log(`[1] Đã tạo Doanh nghiệp: ${tenantA.companyName} (UUID: ${tenantA.uuid})`);
  } else {
    if (!tenantA.uuid) {
      tenantA = await prisma.tenant.update({
        where: { id: tenantA.id },
        data: { uuid: crypto.randomUUID() },
      });
    }
    console.log(`[1] Đã tìm thấy Doanh nghiệp: ${tenantA.companyName} (UUID: ${tenantA.uuid})`);
  }

  // 2. Tạo các Danh mục chi tiêu (Categories) thực tế
  const categoryNames = [
    { name: 'Ăn uống', type: 'EXPENSE', icon: 'utensils' },
    { name: 'Đi lại', type: 'EXPENSE', icon: 'car' },
    { name: 'Mua sắm', type: 'EXPENSE', icon: 'shopping-bag' },
    { name: 'Phần mềm', type: 'EXPENSE', icon: 'laptop' },
  ];

  const categoryMap = {};
  for (const cat of categoryNames) {
    let existingCat = await prisma.category.findFirst({
      where: {
        name: cat.name,
        tenantId: tenantA.id,
      },
    });

    if (!existingCat) {
      existingCat = await prisma.category.create({
        data: {
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          tenantId: tenantA.id,
        },
      });
    }
    categoryMap[cat.name] = existingCat.id;
  }
  console.log('[2] Đã tạo danh mục chi tiêu:', Object.keys(categoryMap).join(', '));

  // 3. Tạo tài khoản Quản trị viên (ADMIN)
  const adminPasswordHash = await bcrypt.hash('Admin@123456', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@congty-a.vn' },
    update: {
      password: adminPasswordHash,
      tenantId: tenantA.id,
      role: 'ADMIN',
      name: 'Trần Quản Trị (Admin A)',
      employeeCode: 'NV-ADMIN01',
      department: 'Ban Giám Đốc',
      deletedAt: null,
    },
    create: {
      uuid: crypto.randomUUID(),
      email: 'admin@congty-a.vn',
      password: adminPasswordHash,
      name: 'Trần Quản Trị (Admin A)',
      role: 'ADMIN',
      employeeCode: 'NV-ADMIN01',
      department: 'Ban Giám Đốc',
      tenantId: tenantA.id,
    },
  });
  console.log(`[3] Đã tạo Admin: ${adminUser.email} (UUID: ${adminUser.uuid})`);

  // 4. Tạo các tài khoản Nhân viên (USER)
  const defaultUserPasswordHash = await bcrypt.hash('User@123456', 10);
  const sampleStaff = [
    {
      email: 'hoang.dev@congty-a.vn',
      name: 'Hoàng Văn Dev',
      employeeCode: 'NV-100201',
      department: 'Kỹ thuật',
      role: 'USER',
    },
    {
      email: 'lan.marketing@congty-a.vn',
      name: 'Lê Thị Marketing',
      employeeCode: 'NV-100202',
      department: 'Marketing',
      role: 'USER',
    },
    {
      email: 'tuan.sales@congty-a.vn',
      name: 'Phạm Tuấn Sales',
      employeeCode: 'NV-100203',
      department: 'Kinh doanh',
      role: 'USER',
    },
    {
      email: 'mai.hr@congty-a.vn',
      name: 'Đỗ Tuyết Mai',
      employeeCode: 'NV-100204',
      department: 'Nhân sự',
      role: 'USER',
    },
  ];

  const userMap = { [adminUser.email]: adminUser };
  for (const u of sampleStaff) {
    const createdUser = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password: defaultUserPasswordHash,
        tenantId: tenantA.id,
        role: u.role,
        name: u.name,
        employeeCode: u.employeeCode,
        department: u.department,
        deletedAt: null,
      },
      create: {
        uuid: crypto.randomUUID(),
        email: u.email,
        password: defaultUserPasswordHash,
        name: u.name,
        role: u.role,
        employeeCode: u.employeeCode,
        department: u.department,
        tenantId: tenantA.id,
      },
    });
    userMap[u.email] = createdUser;
  }
  console.log(`[4] Đã tạo ${sampleStaff.length} tài khoản nhân viên chính thức.`);

  // 5. Khởi tạo Giao Dịch Chi Tiêu Thực Tế (Transactions trong DB)
  // Xóa các transaction mẫu cũ của tenant nếu có để tránh trùng lặp
  await prisma.transaction.deleteMany({
    where: { tenantId: tenantA.id },
  });

  const sampleTransactions = [
    {
      userEmail: 'lan.marketing@congty-a.vn',
      categoryName: 'Ăn uống',
      amount: 1250000,
      note: 'Tiếp khách đối tác Agency truyền thông',
      scanStatus: 'CLEAN',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Hôm qua
    },
    {
      userEmail: 'lan.marketing@congty-a.vn',
      categoryName: 'Đi lại',
      amount: 350000,
      note: 'Taxi Grab đi sự kiện TechExpo 2026',
      scanStatus: 'CLEAN',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      userEmail: 'hoang.dev@congty-a.vn',
      categoryName: 'Phần mềm',
      amount: 1450000,
      note: 'Gia hạn bản quyền phần mềm Figma & Adobe Cloud',
      scanStatus: 'CLEAN',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      userEmail: 'tuan.sales@congty-a.vn',
      categoryName: 'Đi lại',
      amount: 3200000,
      note: 'Vé máy bay Vietnam Airlines công tác Hà Nội',
      scanStatus: 'CLEAN',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      userEmail: 'mai.hr@congty-a.vn',
      categoryName: 'Mua sắm',
      amount: 890000,
      note: 'Văn phòng phẩm và giấy in hợp đồng quý 4',
      scanStatus: 'CLEAN',
      date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    },
    {
      userEmail: 'admin@congty-a.vn',
      categoryName: 'Ăn uống',
      amount: 2400000,
      note: 'Tiếp đoàn đối tác khách hàng VIP ký kết dự án',
      scanStatus: 'CLEAN',
      date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    },
    {
      userEmail: 'hoang.dev@congty-a.vn',
      categoryName: 'Mua sắm',
      amount: 4500000,
      note: 'Màn hình phụ lập trình viên phòng Kỹ thuật',
      scanStatus: 'CLEAN',
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const tx of sampleTransactions) {
    const user = userMap[tx.userEmail];
    const categoryId = categoryMap[tx.categoryName];

    if (user && categoryId) {
      await prisma.transaction.create({
        data: {
          userId: user.id,
          tenantId: tenantA.id,
          categoryId,
          amount: tx.amount,
          note: tx.note,
          scanStatus: tx.scanStatus,
          transactionDate: tx.date,
        },
      });
    }
  }
  console.log(`[5] Đã tạo ${sampleTransactions.length} hóa đơn chi tiêu thực tế trong database.`);

  // 6. Khởi tạo Ngân Sách Các Phòng Ban
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const budgets = [
    { departmentName: 'Marketing', allowance: 35000000 },
    { departmentName: 'Kỹ thuật', allowance: 50000000 },
    { departmentName: 'Kinh doanh', allowance: 40000000 },
    { departmentName: 'Nhân sự', allowance: 20000000 },
  ];

  for (const b of budgets) {
    await prisma.departmentBudget.upsert({
      where: {
        departmentName_month_year: {
          departmentName: b.departmentName,
          month: currentMonth,
          year: currentYear,
        },
      },
      update: {
        allowance: b.allowance,
        tenantId: tenantA.id,
      },
      create: {
        departmentName: b.departmentName,
        tenantId: tenantA.id,
        allowance: b.allowance,
        month: currentMonth,
        year: currentYear,
      },
    });
  }
  console.log('[6] Đã phân bổ ngân sách tháng cho 4 phòng ban.');

  // 7. Thông tin tài khoản ngân hàng nhận tiền hoàn ứng cho Admin
  await prisma.bankingInformation.upsert({
    where: { id: 1 },
    update: {
      userId: adminUser.id,
      tenantId: tenantA.id,
      bankName: 'Techcombank',
      bankCode: 'TCB',
      accountNumber: '1903686868888',
      accountHolder: 'TRAN QUAN TRI',
      isDefault: true,
    },
    create: {
      userId: adminUser.id,
      tenantId: tenantA.id,
      bankName: 'Techcombank',
      bankCode: 'TCB',
      accountNumber: '1903686868888',
      accountHolder: 'TRAN QUAN TRI',
      isDefault: true,
    },
  });

  console.log('=== SEED DỮ LIỆU HOÀN TẤT THÀNH CÔNG 100% ===');
  console.log(`Đăng nhập Admin: admin@congty-a.vn | Mật khẩu: Admin@123456`);
  console.log(`Đường dẫn Route Admin: /${tenantA.uuid}/${adminUser.uuid}/admin`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
