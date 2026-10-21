const prisma = require('../config/prisma');

/**
 * Kiểm tra xem người gọi (requester) có quyền quản lý targetUser hay không:
 * 1. Nếu requester.id === targetUserId: Chính chủ -> CÓ QUYỀN.
 * 2. Nếu requester.role === 'ROOT' và cùng tenantId -> CÓ QUYỀN (ROOT quản lý toàn bộ công ty).
 * 3. Nếu requester là Admin/Owner của đơn vị mà targetUser đang trực thuộc,
 *    hoặc là Owner của một đơn vị cấp trên (ancestor) trong nhánh cây của targetUser -> CÓ QUYỀN.
 * 4. Ngược lại (ví dụ cross-unit, hoặc nhân viên khác không có thẩm quyền) -> KHÔNG CÓ QUYỀN.
 */
const checkIfUserManagesTarget = async (requesterUser, targetUserId, tenantId) => {
  const reqId = Number(requesterUser.id);
  const targetId = Number(targetUserId);
  const resolvedTenantId = Number(tenantId);

  // 1. Chính chủ
  if (reqId === targetId) return true;

  // 2. ROOT cùng tenant
  if (requesterUser.role === 'ROOT' && Number(requesterUser.tenantId) === resolvedTenantId) {
    return true;
  }

  // Lấy thông tin targetUser
  const target = await prisma.user.findFirst({
    where: { id: targetId, tenantId: resolvedTenantId, deletedAt: null },
    select: { id: true, unitId: true },
  });

  if (!target || !target.unitId) {
    return false;
  }

  // Lấy tất cả các unit trong tenant để duyệt ngược lên cây cha (ancestor chain)
  const allUnits = await prisma.unit.findMany({
    where: { tenantId: resolvedTenantId, deletedAt: null },
    select: { id: true, parentId: true, ownerId: true },
  });

  const unitMap = new Map();
  allUnits.forEach((u) => unitMap.set(u.id, u));

  let currentUnitId = target.unitId;
  const visited = new Set();

  while (currentUnitId && !visited.has(currentUnitId)) {
    visited.add(currentUnitId);
    const unit = unitMap.get(currentUnitId);
    if (!unit) break;

    // Nếu requester là Owner của đơn vị này hoặc đơn vị cha cấp trên
    if (unit.ownerId === reqId) {
      return true;
    }

    currentUnitId = unit.parentId;
  }

  return false;
};

/**
 * Lấy danh sách ID của tất cả người dùng thuộc thẩm quyền quản lý của requester
 */
const getManagedUserIds = async (requesterUser, tenantId) => {
  const reqId = Number(requesterUser.id);
  const resolvedTenantId = Number(tenantId);

  if (requesterUser.role === 'ROOT') {
    const allUsers = await prisma.user.findMany({
      where: { tenantId: resolvedTenantId, deletedAt: null },
      select: { id: true },
    });
    return allUsers.map((u) => u.id);
  }

  // Tìm tất cả các unit mà requester là owner
  const allUnits = await prisma.unit.findMany({
    where: { tenantId: resolvedTenantId, deletedAt: null },
    select: { id: true, parentId: true, ownerId: true },
  });

  // Tìm các unit do user làm owner
  const myOwnedUnits = allUnits.filter((u) => u.ownerId === reqId).map((u) => u.id);
  if (myOwnedUnits.length === 0) {
    return [reqId];
  }

  // Mở rộng tất cả các unit con/cháu trong các cây đó
  const managedUnitIds = new Set(myOwnedUnits);
  let added = true;
  while (added) {
    added = false;
    for (const u of allUnits) {
      if (u.parentId && managedUnitIds.has(u.parentId) && !managedUnitIds.has(u.id)) {
        managedUnitIds.add(u.id);
        added = true;
      }
    }
  }

  const managedUsers = await prisma.user.findMany({
    where: {
      tenantId: resolvedTenantId,
      unitId: { in: Array.from(managedUnitIds) },
      deletedAt: null,
    },
    select: { id: true },
  });

  const ids = new Set(managedUsers.map((u) => u.id));
  ids.add(reqId);
  return Array.from(ids);
};

/**
 * Tạo nhiều thông báo cùng lúc
 */
const createManyNotifications = async (items) => {
  if (!items || items.length === 0) return [];

  const created = await prisma.notification.createMany({
    data: items.map((item) => ({
      tenantId: Number(item.tenantId),
      userId: Number(item.userId),
      title: item.title,
      message: item.message,
      type: item.type || 'ALLOCATION',
      data: item.data || null,
      isRead: false,
    })),
  });

  return created;
};

/**
 * Lấy danh sách thông báo theo phân quyền quản lý (chống cross-unit đọc lén)
 */
const getNotifications = async ({ requesterUser, targetUserId, includeManaged, isRead, page = 1, limit = 20 }) => {
  const tenantId = Number(requesterUser.tenantId);
  const resolvedPage = Math.max(1, Number(page) || 1);
  const resolvedLimit = Math.max(1, Math.min(100, Number(limit) || 20));
  const skip = (resolvedPage - 1) * resolvedLimit;

  let where = { tenantId };

  if (targetUserId) {
    const targetId = Number(targetUserId);
    // Kiểm tra thẩm quyền: Người nào quản lý ai thì mới được thấy thông báo
    const hasPermission = await checkIfUserManagesTarget(requesterUser, targetId, tenantId);
    if (!hasPermission) {
      const error = new Error('Forbidden: Bạn không quản lý người dùng này. Không được phép đọc thông báo của người khác hoặc khác phòng ban (Cross-unit).');
      error.statusCode = 403;
      throw error;
    }
    where.userId = targetId;
  } else if (includeManaged === 'true' || includeManaged === true) {
    // Lấy thông báo của toàn bộ những người thuộc quyền quản lý của requester
    const managedIds = await getManagedUserIds(requesterUser, tenantId);
    where.userId = { in: managedIds };
  } else {
    // Mặc định: Chỉ xem thông báo của chính mình
    where.userId = Number(requesterUser.id);
  }

  if (isRead !== undefined && isRead !== null) {
    where.isRead = isRead === 'true' || isRead === true;
  }

  const [total, unreadCount, items] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, isRead: false } }),
    prisma.notification.findMany({
      where,
      skip,
      take: resolvedLimit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, employeeCode: true } },
      },
    }),
  ]);

  return {
    total,
    unreadCount,
    page: resolvedPage,
    limit: resolvedLimit,
    totalPages: Math.ceil(total / resolvedLimit),
    items,
  };
};

/**
 * Đánh dấu 1 thông báo là đã đọc (Chính chủ hoặc người quản lý)
 */
const markAsRead = async ({ id, requesterUser }) => {
  const notifId = Number(id);
  const tenantId = Number(requesterUser.tenantId);

  const existing = await prisma.notification.findFirst({
    where: {
      id: notifId,
      tenantId,
    },
  });

  if (!existing) {
    const error = new Error('Thông báo không tồn tại');
    error.statusCode = 404;
    throw error;
  }

  // Kiểm tra quyền: Phải là chính chủ hoặc người quản lý trực tiếp/cấp trên của chủ thông báo
  const hasPermission = await checkIfUserManagesTarget(requesterUser, existing.userId, tenantId);
  if (!hasPermission) {
    const error = new Error('Forbidden: Bạn không có quyền thao tác trên thông báo của người dùng khác (Cross-unit).');
    error.statusCode = 403;
    throw error;
  }

  const updated = await prisma.notification.update({
    where: { id: notifId },
    data: { isRead: true },
  });

  return updated;
};

/**
 * Đánh dấu toàn bộ thông báo là đã đọc
 */
const markAllAsRead = async ({ requesterUser }) => {
  const userId = Number(requesterUser.id);
  const tenantId = Number(requesterUser.tenantId);

  const result = await prisma.notification.updateMany({
    where: {
      userId,
      tenantId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  return {
    message: 'Đã đánh dấu tất cả thông báo của bạn là đã đọc',
    updatedCount: result.count,
  };
};

module.exports = {
  checkIfUserManagesTarget,
  getManagedUserIds,
  createManyNotifications,
  getNotifications,
  markAsRead,
  markAllAsRead,
};
