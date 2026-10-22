const prisma = require('../config/prisma');
const unitService = require('../unit/unitService');
const unitTreeHelper = require('../unit/unitTreeHelper');

/**
 * 1. Tạo khoản chi tiêu mới (chỉ được tạo ở unit lá)
 * Trạng thái mặc định: SUBMITTED
 * Tiền: BigInt VND
 */
const createTransaction = async ({ userId, tenantId, unitId, categoryId, amount, note, transactionDate, s3Key, scanStatus = 'CLEAN' }) => {
  if (!unitId) {
    const error = new Error('Đơn vị (unitId) là bắt buộc');
    error.statusCode = 400;
    throw error;
  }

  if (!categoryId) {
    const error = new Error('Danh mục (categoryId) là bắt buộc');
    error.statusCode = 400;
    throw error;
  }

  if (!amount) {
    const error = new Error('Số tiền chi tiêu (amount) là bắt buộc');
    error.statusCode = 400;
    throw error;
  }

  let bigIntAmount;
  try {
    bigIntAmount = BigInt(amount);
  } catch (err) {
    const error = new Error('Số tiền không hợp lệ (phải là số nguyên VND)');
    error.statusCode = 400;
    throw error;
  }

  if (bigIntAmount <= 0n) {
    const error = new Error('Số tiền chi tiêu phải lớn hơn 0 VND');
    error.statusCode = 400;
    throw error;
  }

  const resolvedTenantId = Number(tenantId);
  const resolvedUnitId = Number(unitId);
  const resolvedUserId = Number(userId);
  const resolvedCatId = Number(categoryId);

  // 1. Kiểm tra Unit: Bắt buộc phải là NÚT LÁ (không có đơn vị con)
  const unit = await prisma.unit.findFirst({
    where: { id: resolvedUnitId, tenantId: resolvedTenantId, deletedAt: null },
  });

  if (!unit) {
    const error = new Error('Đơn vị không tồn tại hoặc không thuộc công ty này');
    error.statusCode = 404;
    throw error;
  }

  // 2. Kiểm tra người tạo: Phải thuộc unit đó hoặc là owner của unit
  const creator = await prisma.user.findFirst({
    where: { id: resolvedUserId, tenantId: resolvedTenantId, deletedAt: null },
  });

  if (!creator) {
    const error = new Error('Người tạo giao dịch không hợp lệ');
    error.statusCode = 401;
    throw error;
  }

  const memberRecord = await prisma.unitMember.findFirst({
    where: { unitId: resolvedUnitId, userId: resolvedUserId },
  });
  const isMemberOfUnit = creator.unitId === resolvedUnitId || Boolean(memberRecord);
  const isOwnerOfUnit = unit.ownerId === resolvedUserId;
  const isRoot = creator.role === 'ROOT';

  if (!isMemberOfUnit && !isOwnerOfUnit && !isRoot) {
    const error = new Error('Bạn không thuộc đơn vị này nên không thể tạo đề nghị chi tiêu.');
    error.statusCode = 403;
    throw error;
  }

  // 3. Kiểm tra danh mục: Phải thuộc cùng tenant (chống rò rỉ chéo tenant)
  const category = await prisma.category.findFirst({
    where: { id: resolvedCatId, tenantId: resolvedTenantId },
  });

  if (!category) {
    const error = new Error('Danh mục chi tiêu không tồn tại hoặc không thuộc công ty này');
    error.statusCode = 404;
    throw error;
  }

  // 4. Tạo giao dịch (Mặc định SUBMITTED)
  const tx = await prisma.transaction.create({
    data: {
      tenantId: resolvedTenantId,
      unitId: resolvedUnitId,
      userId: resolvedUserId,
      categoryId: resolvedCatId,
      amount: bigIntAmount,
      type: 'EXPENSE',
      status: 'SUBMITTED',
      note: note ? String(note).trim() : null,
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      s3Key: s3Key || null,
      scanStatus: scanStatus || 'CLEAN',
    },
    include: {
      category: { select: { id: true, name: true, type: true, icon: true } },
      user: { select: { id: true, name: true, email: true, role: true } },
      unit: { select: { id: true, name: true } },
    },
  });

  // Bắn thông báo: "Có hóa đơn chờ duyệt" tới Anh Cả và các cấp Cha ở trên
  try {
    const notificationService = require('../notification/notificationService');
    const approverOwnerIds = await unitTreeHelper.getAncestorOwnerIds(resolvedUnitId, resolvedTenantId, true);
    const recipients = Array.from(approverOwnerIds).filter((oId) => oId !== resolvedUserId);
    if (recipients.length > 0) {
      await notificationService.createManyNotifications(
        recipients.map((rId) => ({
          tenantId: resolvedTenantId,
          userId: rId,
          title: 'Có hóa đơn chờ duyệt',
          message: `Nhân viên ${tx.user?.name || tx.user?.email || 'Thành viên'} vừa nộp hóa đơn ${Number(tx.amount).toLocaleString('vi-VN')} đ chờ bạn phê duyệt.`,
          type: 'EXPENSE_PENDING',
          data: { transactionId: tx.id, unitId: resolvedUnitId },
        }))
      );
    }
  } catch (err) {
    // Non-blocking
  }

  return {
    ...tx,
    amount: tx.amount.toString(),
  };
};

/**
 * 2. Lấy danh sách giao dịch chi tiêu theo thẩm quyền
 */
const getTransactions = async ({ userId, userRole, tenantId, unitId, status, page = 1, limit = 20 }) => {
  const resolvedTenantId = Number(tenantId);
  const resolvedUserId = Number(userId);

  const where = {
    tenantId: resolvedTenantId,
  };

  if (unitId) {
    where.unitId = Number(unitId);
  }

  if (status) {
    where.status = status;
  }

  // Phân quyền xem: "Cha quản lý các cha nhỏ, Cha luôn thấy con"
  // - Top Root: Xem toàn bộ công ty
  // - Cha / Anh Cả: Xem chi tiêu của chính mình + toàn bộ chi tiêu của các đơn vị con/cháu thuộc nhánh mình
  // - Member thường: Chỉ xem chi tiêu do chính mình tạo
  const isTop = await unitTreeHelper.isTopRootOwner(resolvedUserId, resolvedTenantId);
  if (!isTop && userRole !== 'ROOT') {
    const accessibleUnitIds = await unitTreeHelper.getAccessibleUnitIdsForUser(
      { id: resolvedUserId, role: userRole },
      resolvedTenantId
    );
    const unitIdArray = Array.from(accessibleUnitIds);

    const isManagerOfAny = await prisma.unit.findFirst({
      where: { ownerId: resolvedUserId, tenantId: resolvedTenantId, deletedAt: null },
      select: { id: true },
    });

    if (isManagerOfAny && unitIdArray.length > 0) {
      where.OR = [
        { userId: resolvedUserId },
        { unitId: { in: unitIdArray } },
      ];
    } else {
      where.userId = resolvedUserId;
    }
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [total, items] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { transactionDate: 'desc' },
      include: {
        category: { select: { id: true, name: true, type: true, icon: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
        unit: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)),
    items: items.map((t) => ({
      ...t,
      amount: t.amount.toString(),
    })),
  };
};

/**
 * 3. Chi tiết 1 giao dịch
 */
const getTransactionById = async (transactionId, userOrTenantId) => {
  const isUserObj = typeof userOrTenantId === 'object' && userOrTenantId !== null;
  const tenantId = isUserObj ? userOrTenantId.tenantId : userOrTenantId;
  const userId = isUserObj ? userOrTenantId.id : null;
  const userRole = isUserObj ? userOrTenantId.role : null;

  const tx = await prisma.transaction.findFirst({
    where: { id: Number(transactionId), tenantId: Number(tenantId) },
    include: {
      category: true,
      user: { select: { id: true, name: true, email: true, role: true, unitId: true } },
      unit: {
        include: {
          owner: { select: { id: true, name: true, email: true } },
          parent: { select: { id: true, name: true, ownerId: true } },
        },
      },
      approver: { select: { id: true, name: true, email: true } },
    },
  });

  if (!tx) {
    const error = new Error('Không tìm thấy giao dịch hoặc không thuộc doanh nghiệp của bạn');
    error.statusCode = 404;
    throw error;
  }

  // Phân quyền xem chi tiết giao dịch (chống đọc lén chéo đơn vị / chéo user):
  // Cho phép: ROOT, chính chủ (userId), Anh Cả của unit, hoặc bất kỳ Cha nào ở trên của unit
  if (isUserObj) {
    const isTop = await unitTreeHelper.isTopRootOwner(userId, tenantId);
    if (!isTop && userRole !== 'ROOT') {
      const isCreator = tx.userId === Number(userId);
      const canManage = await unitTreeHelper.canManageUnit(userId, tx.unitId, tenantId);

      if (!isCreator && !canManage) {
        const error = new Error('Bị từ chối: Bạn không có quyền truy cập thông tin giao dịch của người dùng hoặc đơn vị khác');
        error.statusCode = 403;
        throw error;
      }
    }
  }

  return {
    ...tx,
    amount: tx.amount.toString(),
  };
};

/**
 * Kiểm tra thẩm quyền duyệt chi tiêu:
 * - Cả Anh Cả của unit và tất cả các Cha ở trên đều có quyền duyệt chi tiêu
 * - Chặn tự duyệt (trừ khi là người đứng đầu unit gốc tối cao)
 */
const isDirectManager = async (creatorUser, unit, approverUser, tenantId) => {
  return unitTreeHelper.canApproveExpense(
    approverUser,
    { userId: creatorUser.id, unitId: unit.id },
    tenantId || approverUser.tenantId
  );
};

/**
 * 4. Duyệt chi tiêu (APPROVE)
 * - Cả Anh Cả của unit và các Cha ở trên đều có quyền duyệt
 * - Kiểm tra số dư an toàn của nhóm lá
 * - Cập nhật status = APPROVED
 */
const approveTransaction = async (transactionId, approverUser) => {
  const id = Number(transactionId);
  const tenantId = Number(approverUser.tenantId);

  const tx = await prisma.transaction.findFirst({
    where: { id, tenantId },
    include: {
      user: true,
      unit: {
        include: {
          parent: true,
        },
      },
    },
  });

  if (!tx) {
    const error = new Error('Không tìm thấy giao dịch');
    error.statusCode = 404;
    throw error;
  }

  if (tx.status !== 'SUBMITTED') {
    const error = new Error(`Giao dịch này hiện ở trạng thái "${tx.status}", không thể duyệt lại.`);
    error.statusCode = 400;
    throw error;
  }

  // 1. Kiểm tra thẩm quyền người duyệt: Anh Cả của unit hoặc bất kỳ cấp Cha ở trên nào
  const canApprove = await unitTreeHelper.canApproveExpense(approverUser, tx, tenantId);
  if (!canApprove) {
    const error = new Error('Bạn không phải là người quản lý trực tiếp hoặc cấp Cha ở trên của nhân viên này để duyệt chi tiêu.');
    error.statusCode = 403;
    throw error;
  }

  // 2. Kiểm tra số dư an toàn của đơn vị lá: safeBalance >= amount
  const safeBalance = await unitService.calculateSafeBalance(tx.unitId);
  if (safeBalance < tx.amount) {
    const error = new Error(`Số dư khả dụng của nhóm "${tx.unit.name}" (${safeBalance.toLocaleString('vi-VN')} đ) không đủ để duyệt khoản chi này (${tx.amount.toLocaleString('vi-VN')} đ).`);
    error.statusCode = 400;
    throw error;
  }

  // 3. Cập nhật APPROVED
  const approvedTx = await prisma.transaction.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approvedById: approverUser.id,
      approvedAt: new Date(),
    },
    include: {
      category: true,
      user: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true, email: true } },
      unit: { select: { id: true, name: true } },
    },
  });

  // Bắn thông báo: "Hóa đơn của bạn đã được duyệt"
  try {
    const notificationService = require('../notification/notificationService');
    await notificationService.createManyNotifications([
      {
        tenantId,
        userId: tx.userId,
        title: 'Hóa đơn của bạn đã được duyệt',
        message: `Hóa đơn ${Number(approvedTx.amount).toLocaleString('vi-VN')} đ (${tx.note || 'Chi tiêu'}) của bạn đã được phê duyệt.`,
        type: 'EXPENSE_APPROVED',
        data: { transactionId: id, unitId: tx.unitId },
      },
    ]);
  } catch (err) {
    // Non-blocking
  }

  return {
    ...approvedTx,
    amount: approvedTx.amount.toString(),
  };
};

/**
 * 5. Từ chối chi tiêu (REJECT)
 * - Cả Anh Cả của unit và các Cha ở trên đều có quyền từ chối
 * - Bắt buộc có lý do từ chối (rejectionReason)
 * - Không xóa giao dịch, chỉ cập nhật status = REJECTED (bảo toàn lịch sử kiểm toán)
 */
const rejectTransaction = async (transactionId, approverUser, rejectionReason) => {
  const id = Number(transactionId);
  const tenantId = Number(approverUser.tenantId);

  if (!rejectionReason || String(rejectionReason).trim() === '') {
    const error = new Error('Lý do từ chối (rejectionReason) là bắt buộc');
    error.statusCode = 400;
    throw error;
  }

  const tx = await prisma.transaction.findFirst({
    where: { id, tenantId },
    include: {
      user: true,
      unit: {
        include: {
          parent: true,
        },
      },
    },
  });

  if (!tx) {
    const error = new Error('Không tìm thấy giao dịch');
    error.statusCode = 404;
    throw error;
  }

  if (tx.status !== 'SUBMITTED') {
    const error = new Error(`Giao dịch này hiện ở trạng thái "${tx.status}", không thể từ chối.`);
    error.statusCode = 400;
    throw error;
  }

  const canReject = await unitTreeHelper.canApproveExpense(approverUser, tx, tenantId);
  if (!canReject) {
    const error = new Error('Bạn không phải là người quản lý trực tiếp hoặc cấp Cha ở trên của nhân viên này để từ chối chi tiêu.');
    error.statusCode = 403;
    throw error;
  }

  const rejectedTx = await prisma.transaction.update({
    where: { id },
    data: {
      status: 'REJECTED',
      rejectionReason: String(rejectionReason).trim(),
      approvedById: approverUser.id,
      approvedAt: new Date(),
    },
    include: {
      category: true,
      user: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true, email: true } },
      unit: { select: { id: true, name: true } },
    },
  });

  // Bắn thông báo: "Hóa đơn của bạn bị từ chối"
  try {
    const notificationService = require('../notification/notificationService');
    await notificationService.createManyNotifications([
      {
        tenantId,
        userId: tx.userId,
        title: 'Hóa đơn của bạn bị từ chối',
        message: `Hóa đơn ${Number(rejectedTx.amount).toLocaleString('vi-VN')} đ của bạn bị từ chối. Lý do: ${String(rejectionReason).trim()}`,
        type: 'EXPENSE_REJECTED',
        data: { transactionId: id, unitId: tx.unitId },
      },
    ]);
  } catch (err) {
    // Non-blocking
  }

  return {
    ...rejectedTx,
    amount: rejectedTx.amount.toString(),
  };
};

/**
 * 6. Hoàn ứng chi tiêu (PAID) - kế toán / cấp Cha bấm tay xác nhận đã hoàn ứng
 */
const payTransaction = async (transactionId, user) => {
  const id = Number(transactionId);
  const tenantId = Number(user.tenantId);

  const tx = await prisma.transaction.findFirst({
    where: { id, tenantId },
    include: {
      user: true,
      unit: true,
    },
  });

  if (!tx) {
    const error = new Error('Không tìm thấy giao dịch');
    error.statusCode = 404;
    throw error;
  }

  if (tx.status !== 'APPROVED') {
    const error = new Error(`Chỉ có thể hoàn ứng cho giao dịch đã được phê duyệt (APPROVED). Trạng thái hiện tại: "${tx.status}".`);
    error.statusCode = 400;
    throw error;
  }

  const canManage = await unitTreeHelper.canManageUnit(user.id, tx.unitId, tenantId);
  if (!canManage && user.role !== 'ROOT') {
    const error = new Error('Forbidden: Bạn không có quyền xác nhận hoàn ứng cho giao dịch này.');
    error.statusCode = 403;
    throw error;
  }

  const paidTx = await prisma.transaction.update({
    where: { id },
    data: {
      status: 'PAID',
    },
    include: {
      category: true,
      user: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true, email: true } },
      unit: { select: { id: true, name: true } },
    },
  });

  // Bắn thông báo: "Khoản chi của bạn đã được hoàn ứng"
  try {
    const notificationService = require('../notification/notificationService');
    await notificationService.createManyNotifications([
      {
        tenantId,
        userId: tx.userId,
        title: 'Khoản chi của bạn đã được hoàn ứng',
        message: `Khoản chi ${Number(paidTx.amount).toLocaleString('vi-VN')} đ (${tx.note || 'Chi tiêu'}) đã được xác nhận hoàn ứng (Đã thanh toán).`,
        type: 'EXPENSE_PAID',
        data: { transactionId: id, unitId: tx.unitId },
      },
    ]);
  } catch (err) {
    // Non-blocking
  }

  return {
    ...paidTx,
    amount: paidTx.amount.toString(),
  };
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  approveTransaction,
  rejectTransaction,
  payTransaction,
};
