const prisma = require('../config/prisma');

/**
 * Thêm mới tài khoản ngân hàng cho user
 */
const createBankingAccount = async (userId, data) => {
  const { bankName, bankCode, accountNumber, accountHolder, branch, isDefault } = data;

  if (!bankName || !accountNumber || !accountHolder) {
    const error = new Error('Vui lòng cung cấp đầy đủ: Tên ngân hàng, Số tài khoản và Tên chủ tài khoản');
    error.statusCode = 400;
    throw error;
  }

  // Lấy thông tin user để gán tenantId nếu có
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
  });

  if (!user) {
    const error = new Error('Người dùng không tồn tại');
    error.statusCode = 404;
    throw error;
  }

  // Đếm số tài khoản hiện có của user
  const count = await prisma.bankingInformation.count({
    where: { userId: Number(userId) },
  });

  // Nếu là tài khoản đầu tiên hoặc được yêu cầu isDefault: true
  const shouldBeDefault = count === 0 || !!isDefault;

  // Nếu đặt là default, hạ cờ các tài khoản cũ của user này
  if (shouldBeDefault) {
    await prisma.bankingInformation.updateMany({
      where: { userId: Number(userId) },
      data: { isDefault: false },
    });
  }

  const created = await prisma.bankingInformation.create({
    data: {
      userId: Number(userId),
      tenantId: user.tenantId,
      bankName: bankName.trim(),
      bankCode: bankCode ? bankCode.trim().toUpperCase() : null,
      accountNumber: String(accountNumber).trim(),
      accountHolder: accountHolder.trim().toUpperCase(),
      branch: branch ? branch.trim() : null,
      isDefault: shouldBeDefault,
    },
  });

  return created;
};

/**
 * Lấy danh sách tất cả tài khoản ngân hàng của user
 */
const getBankingAccountsByUser = async (userId) => {
  const accounts = await prisma.bankingInformation.findMany({
    where: { userId: Number(userId) },
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'desc' },
    ],
  });
  return accounts;
};

/**
 * Lấy chi tiết 1 tài khoản ngân hàng
 * Quyền riêng tư tuyệt đối: Chỉ chính chủ sở hữu tài khoản mới được xem,
 * Kể cả ROOT hay ADMIN cũng tuyệt đối không có quyền đọc.
 */
const getBankingAccountById = async (userId, accountId) => {
  const accountIdNum = Number(accountId);
  const userIdNum = Number(userId);

  const account = await prisma.bankingInformation.findUnique({
    where: { id: accountIdNum },
  });

  if (!account) {
    const error = new Error('Tài khoản ngân hàng không tồn tại');
    error.statusCode = 404;
    throw error;
  }

  if (account.userId !== userIdNum) {
    const error = new Error('Forbidden: Thông tin tài khoản ngân hàng là quyền riêng tư cá nhân tuyệt đối. Kể cả ROOT hay Admin cũng không có quyền xem hoặc thao tác trên tài khoản của người khác.');
    error.statusCode = 403;
    throw error;
  }

  return account;
};

/**
 * Cập nhật thông tin tài khoản ngân hàng
 */
const updateBankingAccount = async (userId, accountId, data) => {
  // Kiểm tra quyền sở hữu
  const existing = await getBankingAccountById(userId, accountId);

  const { bankName, bankCode, accountNumber, accountHolder, branch, isDefault } = data;

  if (isDefault) {
    await prisma.bankingInformation.updateMany({
      where: { userId: Number(userId) },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.bankingInformation.update({
    where: { id: existing.id },
    data: {
      ...(bankName && { bankName: bankName.trim() }),
      ...(bankCode !== undefined && { bankCode: bankCode ? bankCode.trim().toUpperCase() : null }),
      ...(accountNumber && { accountNumber: String(accountNumber).trim() }),
      ...(accountHolder && { accountHolder: accountHolder.trim().toUpperCase() }),
      ...(branch !== undefined && { branch: branch ? branch.trim() : null }),
      ...(isDefault !== undefined && { isDefault: !!isDefault }),
    },
  });

  return updated;
};

/**
 * Xóa tài khoản ngân hàng
 */
const deleteBankingAccount = async (userId, accountId) => {
  const existing = await getBankingAccountById(userId, accountId);

  await prisma.bankingInformation.delete({
    where: { id: existing.id },
  });

  return { success: true };
};

module.exports = {
  createBankingAccount,
  getBankingAccountsByUser,
  getBankingAccountById,
  updateBankingAccount,
  deleteBankingAccount,
};
