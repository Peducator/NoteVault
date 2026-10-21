const prisma = require('../config/prisma');
const unitService = require('../unit/unitService');
const unitTreeHelper = require('../unit/unitTreeHelper');
const notificationService = require('../notification/notificationService');

/**
 * Cấp tiền (Allocation)
 * Quy tắc:
 * 1. Nạp vốn gốc: sourceUnitId = null -> ROOT nạp vốn vào bất kỳ nút nào trong cây tổ chức.
 * 2. Cấp tiền từ đơn vị nguồn:
 *    - sourceUnitId != null
 *    - Không vượt số dư: amount <= safeBalance của sourceUnit
 *    - Quyền: Người thực hiện phải là ROOT hoặc là Owner của sourceUnit
 * 3. Thông báo (Notifications):
 *    - Tự động phát thông báo lưu Database cho Admin quản lý cây đó, các admin nhánh con phía dưới và các ROOT có liên quan tới Tenant.
 * 4. Bất biến: Chỉ ghi thêm (append-only ledger), không sửa, không xóa.
 * 5. Tiền tệ: BigInt VND
 */
const createAllocation = async ({ tenantId, sourceUnitId, targetUnitId, amount, createdById, userRole, note }) => {
  if (!amount) {
    const error = new Error('Số tiền cấp phát (amount) là bắt buộc');
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
    const error = new Error('Số tiền cấp phát phải lớn hơn 0 VND');
    error.statusCode = 400;
    throw error;
  }

  if (!targetUnitId) {
    const error = new Error('Đơn vị nhận tiền (targetUnitId) là bắt buộc');
    error.statusCode = 400;
    throw error;
  }

  const resolvedTenantId = Number(tenantId);
  const resolvedTargetId = Number(targetUnitId);
  const resolvedSourceId = sourceUnitId ? Number(sourceUnitId) : null;
  const resolvedUserId = Number(createdById);

  // 1. Kiểm tra đơn vị đích (targetUnit)
  const targetUnit = await prisma.unit.findFirst({
    where: { id: resolvedTargetId, tenantId: resolvedTenantId, deletedAt: null },
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  if (!targetUnit) {
    const error = new Error('Đơn vị nhận tiền không tồn tại hoặc không thuộc công ty này');
    error.statusCode = 404;
    throw error;
  }

  let sourceUnit = null;

  // 2. Phân loại luồng cấp tiền: Nạp vốn hay Cấp tiền từ đơn vị nguồn
  if (!resolvedSourceId) {
    // Luồng Nạp vốn (sourceUnitId = null): ROOT hoặc cấp Cha ở trên nạp tiền cho unit con
    const isTop = await unitTreeHelper.isTopRootOwner(resolvedUserId, resolvedTenantId);
    const canFund = isTop || userRole === 'ROOT' || await unitTreeHelper.canManageUnit(resolvedUserId, resolvedTargetId, resolvedTenantId);
    if (!canFund) {
      const error = new Error('Chỉ người dùng có quyền ROOT mới có quyền nạp vốn vào đơn vị');
      error.statusCode = 403;
      throw error;
    }
  } else {
    // Luồng Cấp tiền từ đơn vị nguồn sang đơn vị đích
    if (resolvedSourceId === resolvedTargetId) {
      const error = new Error('Không thể tự cấp tiền cho chính đơn vị nguồn');
      error.statusCode = 400;
      throw error;
    }

    sourceUnit = await prisma.unit.findFirst({
      where: { id: resolvedSourceId, tenantId: resolvedTenantId, deletedAt: null },
    });

    if (!sourceUnit) {
      const error = new Error('Đơn vị nguồn cấp tiền không tồn tại hoặc không thuộc công ty này');
      error.statusCode = 404;
      throw error;
    }

    // KIỂM TRA QUYỀN: Phải là ROOT, là Anh Cả của sourceUnit, hoặc là cấp Cha ở trên của sourceUnit
    const isTop = await unitTreeHelper.isTopRootOwner(resolvedUserId, resolvedTenantId);
    const canManageSource = isTop || userRole === 'ROOT' || await unitTreeHelper.canManageUnit(resolvedUserId, sourceUnit.id, resolvedTenantId);
    if (!canManageSource) {
      const error = new Error(`Chỉ ROOT hoặc người quản lý của "${sourceUnit.name}" mới có quyền cấp tiền.`);
      error.statusCode = 403;
      throw error;
    }

    // CHẶN VƯỢT SỐ DƯ: safeBalance của sourceUnit phải >= amount
    const sourceSafeBalance = await unitService.calculateSafeBalance(sourceUnit.id);
    if (sourceSafeBalance < bigIntAmount) {
      const error = new Error(`Số tiền cấp (${bigIntAmount.toLocaleString('vi-VN')} đ) vượt quá số dư an toàn hiện có của đơn vị nguồn (${sourceSafeBalance.toLocaleString('vi-VN')} đ).`);
      error.statusCode = 400;
      throw error;
    }
  }

  // 3. Tạo bản ghi cấp tiền (Bất biến)
  const allocation = await prisma.allocation.create({
    data: {
      tenantId: resolvedTenantId,
      sourceUnitId: resolvedSourceId,
      targetUnitId: resolvedTargetId,
      amount: bigIntAmount,
      createdById: resolvedUserId,
      note: note ? String(note).trim() : null,
    },
    include: {
      sourceUnit: { select: { id: true, name: true } },
      targetUnit: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  // 4. Phát thông báo cho đối tượng CÓ LIÊN QUAN (Scope nhỏ, chuẩn xác)
  try {
    const creatorName = allocation.createdBy?.name || allocation.createdBy?.email || 'Quản trị viên';
    const formattedAmount = Number(bigIntAmount).toLocaleString('vi-VN');

    // a. Lấy tất cả các đơn vị trong tenant để tìm cây con nhận tiền
    const allTenantUnits = await prisma.unit.findMany({
      where: { tenantId: resolvedTenantId, deletedAt: null },
      select: { id: true, parentId: true, ownerId: true, name: true },
    });

    // Tìm tất cả các nút con/cháu trong cây bắt đầu từ targetUnit
    const subtreeUnitIds = new Set([targetUnit.id]);
    let addedNew = true;
    while (addedNew) {
      addedNew = false;
      for (const u of allTenantUnits) {
        if (u.parentId && subtreeUnitIds.has(u.parentId) && !subtreeUnitIds.has(u.id)) {
          subtreeUnitIds.add(u.id);
          addedNew = true;
        }
      }
    }

    const recipientUserIds = new Set();

    // Thêm Admin quản lý cây nhận tiền và các admin quản lý các nhánh con phía dưới
    for (const u of allTenantUnits) {
      if (subtreeUnitIds.has(u.id) && u.ownerId) {
        recipientUserIds.add(u.ownerId);
      }
    }

    // b. Thêm toàn bộ các ROOT CÓ LIÊN QUAN (cùng tenant)
    const tenantRoots = await prisma.user.findMany({
      where: {
        tenantId: resolvedTenantId,
        role: 'ROOT',
        deletedAt: null,
      },
      select: { id: true },
    });
    tenantRoots.forEach((r) => recipientUserIds.add(r.id));

    const recipientAdminName = targetUnit.owner?.name || targetUnit.owner?.email || 'Admin đơn vị';

    // c. Tạo danh sách bản ghi thông báo
    const messageContent = sourceUnit
      ? `Sếp ${creatorName} đã cấp ${formattedAmount} đ từ đơn vị "${sourceUnit.name}" cho đơn vị "${targetUnit.name}". Người tiếp nhận ngân sách: ${recipientAdminName}.${note ? ` Ghi chú: ${note}` : ''}`
      : `Đơn vị "${targetUnit.name}" vừa nhận được khoản nạp ${formattedAmount} đ từ Quỹ công ty do Sếp ${creatorName} thực hiện. Người tiếp nhận ngân sách: ${recipientAdminName}.${note ? ` Ghi chú: ${note}` : ''}`;

    const notificationItems = Array.from(recipientUserIds).map((uid) => ({
      tenantId: resolvedTenantId,
      userId: uid,
      title: 'Thông báo cấp phát ngân sách',
      message: messageContent,
      type: 'ALLOCATION',
      data: {
        allocationId: allocation.id,
        sourceUnitId: sourceUnit ? sourceUnit.id : null,
        sourceUnitName: sourceUnit ? sourceUnit.name : 'Quỹ công ty',
        targetUnitId: targetUnit.id,
        targetUnitName: targetUnit.name,
        amount: allocation.amount.toString(),
        createdById: resolvedUserId,
        createdByName: creatorName,
        recipientAdminId: targetUnit.ownerId,
        recipientAdminName,
        createdAt: allocation.createdAt,
      },
    }));

    if (notificationItems.length > 0) {
      await notificationService.createManyNotifications(notificationItems);
    }
  } catch (notifErr) {
    console.error('[Notification Warning] Không thể tạo thông báo cấp tiền:', notifErr.message);
  }

  return {
    ...allocation,
    amount: allocation.amount.toString(),
  };
};

/**
 * Lấy lịch sử cấp tiền của tenant
 */
const getAllocations = async ({ tenantId, unitId, sourceUnitId, targetUnitId, page = 1, limit = 50 }) => {
  const resolvedTenantId = Number(tenantId);
  const where = {
    tenantId: resolvedTenantId,
  };

  if (unitId) {
    const uId = Number(unitId);
    where.OR = [
      { sourceUnitId: uId },
      { targetUnitId: uId },
    ];
  }

  if (sourceUnitId) {
    where.sourceUnitId = Number(sourceUnitId);
  }

  if (targetUnitId) {
    where.targetUnitId = Number(targetUnitId);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [total, items] = await Promise.all([
    prisma.allocation.count({ where }),
    prisma.allocation.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        sourceUnit: { select: { id: true, name: true } },
        targetUnit: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)),
    items: items.map((item) => ({
      ...item,
      amount: item.amount.toString(),
    })),
  };
};

/**
 * Thu hồi ngân sách (Budget Recall / Reversal Allocation)
 * Quy tắc:
 * 1. Thu hồi từ đơn vị con về đơn vị cha cấp trên (targetUnitId phải là tổ tiên của sourceUnitId).
 * 2. Số tiền thu hồi phải > 0 VND (Bảo đảm không bao giờ âm).
 * 3. Số tiền thu hồi <= safeBalance của đơn vị con (Không được vượt số dư an toàn).
 * 4. Quyền: Người quản lý của đơn vị cha (targetUnitId) hoặc ROOT.
 * 5. Bất biến: Tạo bản ghi Allocation mới ghi nhận luồng thu hồi đảo ngược.
 */
const recallAllocation = async ({ tenantId, sourceUnitId, targetUnitId, amount, reason, requesterUser }) => {
  if (!amount) {
    const error = new Error('Số tiền thu hồi (amount) là bắt buộc');
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
    const error = new Error('Số tiền thu hồi phải lớn hơn 0 VND (không được là số âm hoặc bằng 0)');
    error.statusCode = 400;
    throw error;
  }

  if (!reason || !String(reason).trim()) {
    const error = new Error('Lý do thu hồi ngân sách (reason) là bắt buộc để đảm bảo tính minh bạch');
    error.statusCode = 400;
    throw error;
  }

  const resolvedTenantId = Number(tenantId);
  const resolvedSourceId = Number(sourceUnitId); // Đơn vị con bị thu hồi
  const resolvedTargetId = Number(targetUnitId); // Đơn vị cha nhận lại
  const resolvedUserId = Number(requesterUser.id);

  if (resolvedSourceId === resolvedTargetId) {
    const error = new Error('Đơn vị bị thu hồi và đơn vị nhận lại không thể trùng nhau');
    error.statusCode = 400;
    throw error;
  }

  // 1. Kiểm tra 2 đơn vị
  const [sourceUnit, targetUnit] = await Promise.all([
    prisma.unit.findFirst({
      where: { id: resolvedSourceId, tenantId: resolvedTenantId, deletedAt: null },
      include: { owner: { select: { id: true, name: true, email: true } } },
    }),
    prisma.unit.findFirst({
      where: { id: resolvedTargetId, tenantId: resolvedTenantId, deletedAt: null },
      include: { owner: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  if (!sourceUnit) {
    const error = new Error('Đơn vị bị thu hồi không tồn tại hoặc không thuộc công ty này');
    error.statusCode = 404;
    throw error;
  }

  if (!targetUnit) {
    const error = new Error('Đơn vị nhận lại ngân sách không tồn tại hoặc không thuộc công ty này');
    error.statusCode = 404;
    throw error;
  }

  // 2. Kiểm tra quan hệ tổ tiên: targetUnit PHẢI là cha hoặc tổ tiên cấp trên của sourceUnit!
  const ancestors = await unitTreeHelper.getAncestorsOfUnit(resolvedSourceId, resolvedTenantId);
  const isAncestor = ancestors.some((a) => a.id === resolvedTargetId);

  if (!isAncestor) {
    const error = new Error(`Chỉ được phép thu hồi ngân sách từ đơn vị con về đơn vị cha cấp trên. "${targetUnit.name}" không phải là cấp trên của "${sourceUnit.name}".`);
    error.statusCode = 400;
    throw error;
  }

  // 3. Kiểm tra thẩm quyền: User phải là Owner của targetUnit hoặc cấp trên nữa, hoặc ROOT
  const isTop = await unitTreeHelper.isTopRootOwner(resolvedUserId, resolvedTenantId);
  const canManageTarget = isTop || requesterUser.role === 'ROOT' || await unitTreeHelper.canManageUnit(resolvedUserId, resolvedTargetId, resolvedTenantId);
  if (!canManageTarget) {
    const error = new Error(`Chỉ người quản lý của đơn vị cấp trên ("${targetUnit.name}") hoặc ROOT mới có quyền thu hồi ngân sách.`);
    error.statusCode = 403;
    throw error;
  }

  // 4. CHẶN VƯỢT SỐ DƯ & BẢO ĐẢM KHÔNG ÂM: safeBalance của sourceUnit phải >= bigIntAmount
  const sourceSafeBalance = await unitService.calculateSafeBalance(sourceUnit.id);
  if (sourceSafeBalance < bigIntAmount) {
    const error = new Error(`Số tiền thu hồi (${bigIntAmount.toLocaleString('vi-VN')} đ) vượt quá số dư an toàn hiện có của đơn vị con "${sourceUnit.name}" (${sourceSafeBalance.toLocaleString('vi-VN')} đ). Số dư không bao giờ được phép âm.`);
    error.statusCode = 400;
    throw error;
  }

  // 5. Tạo bản ghi Allocation thu hồi: sourceUnitId = sourceUnit.id (con, trừ tiền), targetUnitId = targetUnit.id (cha, cộng tiền)
  const allocation = await prisma.allocation.create({
    data: {
      tenantId: resolvedTenantId,
      sourceUnitId: resolvedSourceId,
      targetUnitId: resolvedTargetId,
      amount: bigIntAmount,
      createdById: resolvedUserId,
      note: `[THU HỒI] Thu hồi ngân sách từ "${sourceUnit.name}" về "${targetUnit.name}". Lý do: ${String(reason).trim()}`,
    },
    include: {
      sourceUnit: { select: { id: true, name: true } },
      targetUnit: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  // 6. Phát thông báo chi tiết
  try {
    const creatorName = allocation.createdBy?.name || allocation.createdBy?.email || 'Quản trị viên';
    const childAdminName = sourceUnit.owner?.name || sourceUnit.owner?.email || 'Admin đơn vị con';
    const parentAdminName = targetUnit.owner?.name || targetUnit.owner?.email || 'Admin đơn vị cha';
    const formattedAmount = Number(bigIntAmount).toLocaleString('vi-VN');

    const recipientUserIds = new Set();
    if (sourceUnit.ownerId) recipientUserIds.add(sourceUnit.ownerId);
    if (targetUnit.ownerId) recipientUserIds.add(targetUnit.ownerId);

    const tenantRoots = await prisma.user.findMany({
      where: { tenantId: resolvedTenantId, role: 'ROOT', deletedAt: null },
      select: { id: true },
    });
    tenantRoots.forEach((r) => recipientUserIds.add(r.id));

    const messageContent = `Sếp ${creatorName} vừa thực hiện thu hồi ${formattedAmount} đ từ đơn vị "${sourceUnit.name}" (Người phụ trách: ${childAdminName}) về lại đơn vị "${targetUnit.name}" (Người tiếp nhận: ${parentAdminName}). Lý do: ${String(reason).trim()}`;

    const notificationItems = Array.from(recipientUserIds).map((uid) => ({
      tenantId: resolvedTenantId,
      userId: uid,
      title: 'Thông báo thu hồi ngân sách',
      message: messageContent,
      type: 'ALLOCATION_RECALL',
      data: {
        allocationId: allocation.id,
        sourceUnitId: sourceUnit.id,
        sourceUnitName: sourceUnit.name,
        targetUnitId: targetUnit.id,
        targetUnitName: targetUnit.name,
        amount: allocation.amount.toString(),
        createdById: resolvedUserId,
        createdByName: creatorName,
        childAdminName,
        parentAdminName,
        reason: String(reason).trim(),
        createdAt: allocation.createdAt,
      },
    }));

    if (notificationItems.length > 0) {
      await notificationService.createManyNotifications(notificationItems);
    }
  } catch (notifErr) {
    console.error('[Notification Warning] Không thể tạo thông báo thu hồi ngân sách:', notifErr.message);
  }

  return {
    ...allocation,
    amount: allocation.amount.toString(),
  };
};

module.exports = {
  createAllocation,
  getAllocations,
  recallAllocation,
};

