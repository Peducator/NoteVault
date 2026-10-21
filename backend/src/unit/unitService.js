const prisma = require('../config/prisma');
const unitTreeHelper = require('./unitTreeHelper');

/**
 * Tính số dư an toàn của một đơn vị (bằng truy vấn động, không lưu cột):
 * Số dư = Tổng Allocations nhận vào - Tổng Allocations cấp cho con - Tổng Transactions ĐÃ DUYỆT (APPROVED)
 * @param {number} unitId
 * @param {number} [tenantId] - Xác thực IDOR chống rò rỉ đa công ty
 * @returns {Promise<bigint>}
 */
const calculateSafeBalance = async (unitId, tenantId = null) => {
  const id = Number(unitId);

  // Anti-IDOR: Nếu có truyền tenantId, kiểm tra đơn vị có thuộc tenant và chưa bị xóa
  if (tenantId !== null && tenantId !== undefined) {
    const unitExists = await prisma.unit.findFirst({
      where: {
        id,
        tenantId: Number(tenantId),
        deletedAt: null,
      },
    });
    if (!unitExists) {
      const error = new Error('Đơn vị không tồn tại hoặc không thuộc tổ chức của bạn');
      error.statusCode = 404;
      throw error;
    }
  }

  const [received, sent, approvedExpenses] = await Promise.all([
    prisma.allocation.aggregate({
      where: { targetUnitId: id },
      _sum: { amount: true },
    }),
    prisma.allocation.aggregate({
      where: { sourceUnitId: id },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { unitId: id, status: { in: ['APPROVED', 'PAID'] } },
      _sum: { amount: true },
    }),
  ]);

  const totalIn = received._sum.amount || 0n;
  const totalOut = sent._sum.amount || 0n;
  const totalSpent = approvedExpenses._sum.amount || 0n;

  const netBalance = totalIn - totalOut - totalSpent;
  return netBalance < 0n ? 0n : netBalance;
};

/**
 * Tạo mới đơn vị (Unit)
 * - Mỗi unit có 1 owner; 1 user ĐƯỢC PHÉP quản lý nhiều nhóm khác nhau
 * - Hỗ trợ cờ allowMemberViewBalance (cho phép thành viên xem số dư quỹ)
 */
const createUnit = async ({
  tenantId,
  name,
  parentId,
  ownerId,
  allowMemberViewBalance = false,
  allowCreateSubUnit = false,
  creatorUser = null,
}) => {
  if (!name || name.trim() === '') {
    const error = new Error('Tên đơn vị là bắt buộc');
    error.statusCode = 400;
    throw error;
  }

  if (!ownerId) {
    const error = new Error('Người phụ trách (ownerId) là bắt buộc');
    error.statusCode = 400;
    throw error;
  }

  const resolvedTenantId = Number(tenantId);
  const resolvedOwnerId = Number(ownerId);
  const resolvedParentId = parentId ? Number(parentId) : null;

  // 1. Kiểm tra owner có tồn tại và cùng tenant
  const ownerUser = await prisma.user.findFirst({
    where: { id: resolvedOwnerId, tenantId: resolvedTenantId, deletedAt: null },
  });
  if (!ownerUser) {
    const error = new Error('Người phụ trách (owner) không tồn tại hoặc không thuộc công ty này');
    error.statusCode = 404;
    throw error;
  }

  // 2. Nếu có parentId, kiểm tra unit cha có tồn tại và cùng tenant, chưa bị xóa
  if (resolvedParentId) {
    const parentUnit = await prisma.unit.findFirst({
      where: { id: resolvedParentId, tenantId: resolvedTenantId, deletedAt: null },
    });
    if (!parentUnit) {
      const error = new Error('Đơn vị cấp cha không tồn tại hoặc không thuộc công ty này');
      error.statusCode = 404;
      throw error;
    }

    // Kiểm tra quyền tạo Nest: Cấp Cha ở trên hoặc Anh Cả được phép (allowCreateSubUnit = true)
    if (creatorUser) {
      const canCreate = await unitTreeHelper.canCreateNestUnder(creatorUser.id, resolvedParentId, resolvedTenantId);
      if (!canCreate) {
        const error = new Error('Đơn vị cha này chưa được cấp trên cấp quyền tạo thêm đơn vị con (nest).');
        error.statusCode = 403;
        throw error;
      }
    }
  }

  // 3. Tạo Unit và gán owner vào chính unit đó nếu user chưa có unitId
  const result = await prisma.$transaction(async (tx) => {
    const newUnit = await tx.unit.create({
      data: {
        name: name.trim(),
        tenantId: resolvedTenantId,
        parentId: resolvedParentId,
        ownerId: resolvedOwnerId,
        allowMemberViewBalance: Boolean(allowMemberViewBalance),
        allowCreateSubUnit: Boolean(allowCreateSubUnit),
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (!ownerUser.unitId) {
      await tx.user.update({
        where: { id: resolvedOwnerId },
        data: { unitId: newUnit.id },
      });
    }

    await tx.unitMember.upsert({
      where: {
        unitId_userId: {
          unitId: newUnit.id,
          userId: resolvedOwnerId,
        },
      },
      create: {
        unitId: newUnit.id,
        userId: resolvedOwnerId,
      },
      update: {},
    });

    return newUnit;
  });

  return {
    ...result,
    safeBalance: '0',
  };
};

/**
 * Lấy toàn bộ cây đơn vị của tenant kèm số dư và phân quyền hiển thị
 * - ROOT: Xem toàn bộ cây công ty kèm số dư.
 * - Admin nhóm (Unit Owner): Thấy các nhóm mình quản lý, số dư các nhóm mình quản lý.
 * - Member thường: Số dư bị ẩn (null) trừ khi Admin nhóm đó bật allowMemberViewBalance.
 */
const getUnitTree = async (tenantId, user = null) => {
  const resolvedTenantId = Number(tenantId);

  const units = await prisma.unit.findMany({
    where: {
      tenantId: resolvedTenantId,
      deletedAt: null,
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true, role: true },
      },
      members: {
        where: { deletedAt: null },
        select: { id: true, name: true, email: true, role: true },
      },
      memberships: {
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, deletedAt: true },
          },
        },
      },
      _count: {
        select: {
          children: { where: { deletedAt: null } },
          transactions: true,
        },
      },
    },
    orderBy: { id: 'asc' },
  });

  const isRoot = user?.role === 'ROOT';
  const userId = user?.id;

  // Lấy danh sách ID các unit mà user có quyền quản lý và tầm nhìn ("Cha luôn thấy con")
  const accessibleUnitIds = user
    ? await unitTreeHelper.getAccessibleUnitIdsForUser(user, resolvedTenantId)
    : new Set();

  // Tính số dư cho từng unit song song và áp dụng quy tắc Data Masking
  const unitsWithBalance = await Promise.all(
    units.map(async (u) => {
      // Hợp nhất danh sách thành viên từ user.unitId và unit_members
      const memberMap = new Map();
      (u.members || []).forEach((m) => memberMap.set(m.id, m));
      (u.memberships || []).forEach((ms) => {
        if (ms.user && !ms.user.deletedAt) {
          memberMap.set(ms.user.id, {
            id: ms.user.id,
            name: ms.user.name,
            email: ms.user.email,
            role: ms.user.role,
          });
        }
      });
      const mergedMembers = Array.from(memberMap.values());

      const isOwnerOrAncestor = accessibleUnitIds.has(u.id);
      const isMemberOfUnit = mergedMembers.some((m) => m.id === userId);

      // Xác định xem user có được xem số dư của unit này hay không
      const canViewBalance =
        isRoot ||
        isOwnerOrAncestor ||
        (isMemberOfUnit && u.allowMemberViewBalance);

      let safeBalance = null;
      if (canViewBalance) {
        const balance = await calculateSafeBalance(u.id, resolvedTenantId);
        safeBalance = balance.toString();
      }

      const { memberships, ...unitData } = u;

      return {
        ...unitData,
        members: mergedMembers,
        isLeaf: u._count.children === 0,
        canViewBalance,
        safeBalance,
      };
    })
  );

  // Dựng cây phân cấp (Tree)
  const map = {};
  unitsWithBalance.forEach((u) => {
    map[u.id] = { ...u, children: [] };
  });

  const roots = [];
  unitsWithBalance.forEach((u) => {
    if (u.parentId && map[u.parentId]) {
      map[u.parentId].children.push(map[u.id]);
    } else {
      roots.push(map[u.id]);
    }
  });

  return {
    flat: Object.values(map),
    tree: roots,
  };
};

/**
 * Xem chi tiết 1 unit kèm danh sách con, thành viên và số dư
 * - Quyền xem: ROOT, Anh Cả của unit, cấp Cha ở trên, hoặc Member của chính unit đó
 */
const getUnitById = async (unitId, tenantId, user = null) => {
  const resolvedId = Number(unitId);
  const resolvedTenantId = Number(tenantId);

  const unit = await prisma.unit.findFirst({
    where: {
      id: resolvedId,
      tenantId: resolvedTenantId,
      deletedAt: null,
    },
    include: {
      parent: {
        select: { id: true, name: true, ownerId: true },
      },
      owner: {
        select: { id: true, name: true, email: true, role: true },
      },
      children: {
        where: { deletedAt: null },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { children: { where: { deletedAt: null } } } },
        },
      },
      members: {
        where: { deletedAt: null },
        select: { id: true, name: true, email: true, role: true },
      },
      memberships: {
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, deletedAt: true },
          },
        },
      },
    },
  });

  if (!unit) {
    const error = new Error('Không tìm thấy đơn vị');
    error.statusCode = 404;
    throw error;
  }

  // Hợp nhất danh sách thành viên từ user.unitId và unit_members
  const memberMap = new Map();
  (unit.members || []).forEach((m) => memberMap.set(m.id, m));
  (unit.memberships || []).forEach((ms) => {
    if (ms.user && !ms.user.deletedAt) {
      memberMap.set(ms.user.id, {
        id: ms.user.id,
        name: ms.user.name,
        email: ms.user.email,
        role: ms.user.role,
      });
    }
  });
  const mergedMembers = Array.from(memberMap.values());

  const isRoot = user?.role === 'ROOT';
  const userId = user?.id;
  const isMember = mergedMembers.some((m) => m.id === userId);
  const canManage = user ? await unitTreeHelper.canManageUnit(userId, resolvedId, resolvedTenantId) : false;

  // Kiểm tra quyền truy cập chi tiết unit: ROOT, Quản lý (Anh Cả hoặc Cha ở trên), hoặc Member của unit
  if (user && !isRoot && !canManage && !isMember) {
    const error = new Error('Forbidden: Bạn không có quyền xem thông tin đơn vị này');
    error.statusCode = 403;
    throw error;
  }

  // Quyền xem số dư
  const canViewBalance = isRoot || canManage || (isMember && unit.allowMemberViewBalance);

  let safeBalance = null;
  if (canViewBalance) {
    const balance = await calculateSafeBalance(resolvedId, resolvedTenantId);
    safeBalance = balance.toString();
  }

  const { memberships, ...unitData } = unit;

  return {
    ...unitData,
    members: mergedMembers,
    isLeaf: unit.children.length === 0,
    canViewBalance,
    safeBalance,
  };
};

/**
 * Cập nhật tên đơn vị, cờ allowMemberViewBalance hoặc đổi owner
 * - Admin của nhóm: Chỉ được sửa tên (name) và cấu hình allowMemberViewBalance.
 * - Chỉ ROOT mới được quyền đổi ownerId (bổ nhiệm/miễn nhiệm quản lý).
 */
const updateUnit = async (unitId, tenantId, { name, ownerId, allowMemberViewBalance, allowCreateSubUnit }, user = null) => {
  const resolvedId = Number(unitId);
  const resolvedTenantId = Number(tenantId);

  const unit = await prisma.unit.findFirst({
    where: {
      id: resolvedId,
      tenantId: resolvedTenantId,
      deletedAt: null,
    },
  });
  if (!unit) {
    const error = new Error('Không tìm thấy đơn vị');
    error.statusCode = 404;
    throw error;
  }

  const isRoot = user?.role === 'ROOT';
  const isOwner = unit.ownerId === user?.id;
  const canManage = user ? await unitTreeHelper.canManageUnit(user.id, resolvedId, resolvedTenantId) : false;

  if (user && !isRoot && !isOwner && !canManage) {
    const error = new Error('Forbidden: Bạn không có quyền cập nhật đơn vị này');
    error.statusCode = 403;
    throw error;
  }

  const updateData = {};

  if (name && name.trim()) {
    updateData.name = name.trim();
  }

  if (typeof allowMemberViewBalance === 'boolean') {
    updateData.allowMemberViewBalance = allowMemberViewBalance;
  }

  // Cờ allowCreateSubUnit: Chỉ cấp Cha ở trên (hoặc ROOT) mới được cấu hình
  if (typeof allowCreateSubUnit === 'boolean') {
    const ancestors = await unitTreeHelper.getAncestorsOfUnit(resolvedId, resolvedTenantId);
    const isAncestor = isRoot || (user && ancestors.some((a) => a.ownerId === user.id));
    if (!isAncestor) {
      const error = new Error('Forbidden: Chỉ cấp Cha ở trên mới có quyền cấu hình quyền tạo nhánh con (nest)');
      error.statusCode = 403;
      throw error;
    }
    updateData.allowCreateSubUnit = allowCreateSubUnit;
  }

  if (ownerId && Number(ownerId) !== unit.ownerId) {
    // Chỉ ROOT hoặc cấp Cha ở trên mới được đổi người quản lý (ownerId)
    const ancestors = await unitTreeHelper.getAncestorsOfUnit(resolvedId, resolvedTenantId);
    const isAncestor = isRoot || (user && ancestors.some((a) => a.ownerId === user.id));
    if (!isAncestor) {
      const error = new Error('Forbidden: Chỉ ROOT cấp công ty mới có quyền bổ nhiệm hoặc thay đổi người quản lý (owner)');
      error.statusCode = 403;
      throw error;
    }

    const resolvedOwnerId = Number(ownerId);
    const newOwner = await prisma.user.findFirst({
      where: { id: resolvedOwnerId, tenantId: resolvedTenantId, deletedAt: null },
    });
    if (!newOwner) {
      const error = new Error('Người phụ trách mới không tồn tại hoặc không thuộc công ty này');
      error.statusCode = 404;
      throw error;
    }

    updateData.ownerId = resolvedOwnerId;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.unit.update({
      where: { id: resolvedId },
      data: updateData,
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (updateData.ownerId) {
      await tx.user.update({
        where: { id: updateData.ownerId },
        data: { unitId: resolvedId },
      });
    }

    return result;
  });

  // Audit Logging
  console.log(`[AUDIT LOG] User ${user?.id || 'SYSTEM'} (${user?.role}) updated Unit ${resolvedId}:`, JSON.stringify(updateData));

  const balance = await calculateSafeBalance(resolvedId, resolvedTenantId);
  return {
    ...updated,
    safeBalance: balance.toString(),
  };
};

/**
 * Xóa đơn vị (Soft Delete - chỉ cho phép nếu là nút lá, không có con và không có giao dịch/cấp tiền)
 */
const deleteUnit = async (unitId, tenantId, user = null) => {
  const resolvedId = Number(unitId);
  const resolvedTenantId = Number(tenantId);

  const unit = await prisma.unit.findFirst({
    where: {
      id: resolvedId,
      tenantId: resolvedTenantId,
      deletedAt: null,
    },
    include: {
      _count: {
        select: {
          children: { where: { deletedAt: null } },
          transactions: true,
          allocationsSent: true,
          allocationsReceived: true,
        },
      },
    },
  });

  if (!unit) {
    const error = new Error('Không tìm thấy đơn vị');
    error.statusCode = 404;
    throw error;
  }

  if (unit._count.children > 0) {
    const error = new Error('Không thể xóa đơn vị đang có đơn vị con. Hãy xóa hoặc chuyển đơn vị con trước.');
    error.statusCode = 400;
    throw error;
  }

  if (unit._count.transactions > 0 || unit._count.allocationsSent > 0 || unit._count.allocationsReceived > 0) {
    const error = new Error('Không thể xóa đơn vị đã có lịch sử chi tiêu hoặc dòng tiền cấp phát.');
    error.statusCode = 400;
    throw error;
  }

  await prisma.$transaction(async (tx) => {
    // 1. Gỡ liên kết unitId của các thành viên trước khi soft-delete
    await tx.user.updateMany({
      where: { unitId: resolvedId },
      data: { unitId: null },
    });

    // 2. Gỡ các bản ghi liên kết unit_members
    await tx.unitMember.deleteMany({
      where: { unitId: resolvedId },
    });

    // 3. Soft delete: Đánh dấu deletedAt thay vì xóa vĩnh viễn
    await tx.unit.update({
      where: { id: resolvedId },
      data: { deletedAt: new Date() },
    });
  });

  console.log(`[AUDIT LOG] ROOT ${user?.id || 'SYSTEM'} soft-deleted Unit ${resolvedId} (${unit.name}) at ${new Date().toISOString()}`);

  return { success: true, message: 'Đã xóa đơn vị thành công (Soft Delete)' };
};

/**
 * Gán/chuyển nhân viên vào unit (Admin Invitation / Direct Add)
 * - Admin của nhóm hoặc ROOT có quyền thêm nhân viên.
 * - Hỗ trợ đa nhóm: Thêm vào bảng unit_members và cập nhật unitId chính
 */
const addMember = async (unitId, userId, tenantId, user = null, role = 'VIEWER') => {
  const resolvedUnitId = Number(unitId);
  const resolvedUserId = Number(userId);
  const resolvedTenantId = Number(tenantId);
  const assignedRole = role === 'EDIT' ? 'EDIT' : 'VIEWER';

  const unit = await prisma.unit.findFirst({
    where: {
      id: resolvedUnitId,
      tenantId: resolvedTenantId,
      deletedAt: null,
    },
  });
  if (!unit) {
    const error = new Error('Không tìm thấy đơn vị');
    error.statusCode = 404;
    throw error;
  }

  const targetUser = await prisma.user.findFirst({
    where: { id: resolvedUserId, tenantId: resolvedTenantId, deletedAt: null },
  });
  if (!targetUser) {
    const error = new Error('Nhân viên không tồn tại hoặc không thuộc công ty này');
    error.statusCode = 404;
    throw error;
  }

  const previousUnitId = targetUser.unitId;

  const updatedUser = await prisma.$transaction(async (tx) => {
    await tx.unitMember.upsert({
      where: {
        unitId_userId: {
          unitId: resolvedUnitId,
          userId: resolvedUserId,
        },
      },
      create: {
        unitId: resolvedUnitId,
        userId: resolvedUserId,
        role: assignedRole,
      },
      update: {
        role: assignedRole,
      },
    });

    return tx.user.update({
      where: { id: resolvedUserId },
      data: { unitId: resolvedUnitId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        unitId: true,
      },
    });
  });

  // Ghi nhận Audit Log chuyển giao / kết nạp nhân viên
  if (previousUnitId && previousUnitId !== resolvedUnitId) {
    console.log(`[AUDIT LOG] User ${user?.id || 'SYSTEM'} (${user?.role}) transferred employee ${targetUser.id} (${targetUser.name}) from Unit ${previousUnitId} to Unit ${resolvedUnitId} (${unit.name}) at ${new Date().toISOString()}`);
  } else {
    console.log(`[AUDIT LOG] User ${user?.id || 'SYSTEM'} (${user?.role}) added employee ${targetUser.id} (${targetUser.name}) into Unit ${resolvedUnitId} (${unit.name}) at ${new Date().toISOString()}`);
  }

  return updatedUser;
};

/**
 * Gỡ nhân viên ra khỏi unit
 * - Chỉ ROOT hoặc Admin của nhóm mới có quyền gỡ.
 * - Chặn tuyệt đối gỡ Owner của nhóm.
 * - Gỡ khỏi unit_members; nếu user.unitId đang trỏ tới nhóm này, chuyển sang nhóm khác hoặc null
 */
const removeMember = async (unitId, userId, tenantId, user = null) => {
  const resolvedUnitId = Number(unitId);
  const resolvedUserId = Number(userId);
  const resolvedTenantId = Number(tenantId);

  const unit = await prisma.unit.findFirst({
    where: {
      id: resolvedUnitId,
      tenantId: resolvedTenantId,
      deletedAt: null,
    },
  });
  if (!unit) {
    const error = new Error('Không tìm thấy đơn vị');
    error.statusCode = 404;
    throw error;
  }

  if (unit.ownerId === resolvedUserId) {
    const error = new Error('Không thể gỡ người phụ trách (owner) ra khỏi đơn vị của họ. Hãy chuyển giao vị trí owner trước.');
    error.statusCode = 400;
    throw error;
  }

  const isMemberRecord = await prisma.unitMember.findFirst({
    where: { unitId: resolvedUnitId, userId: resolvedUserId },
  });

  const targetUser = await prisma.user.findFirst({
    where: {
      id: resolvedUserId,
      tenantId: resolvedTenantId,
      deletedAt: null,
      OR: [
        { unitId: resolvedUnitId },
        { id: isMemberRecord ? resolvedUserId : -1 },
      ],
    },
  });
  if (!targetUser) {
    const error = new Error('Nhân viên không thuộc đơn vị này');
    error.statusCode = 404;
    throw error;
  }

  const updatedUser = await prisma.$transaction(async (tx) => {
    await tx.unitMember.deleteMany({
      where: {
        unitId: resolvedUnitId,
        userId: resolvedUserId,
      },
    });

    let newUnitId = targetUser.unitId;
    if (targetUser.unitId === resolvedUnitId) {
      const remainingMembership = await tx.unitMember.findFirst({
        where: { userId: resolvedUserId },
      });
      newUnitId = remainingMembership ? remainingMembership.unitId : null;
    }

    return tx.user.update({
      where: { id: resolvedUserId },
      data: { unitId: newUnitId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        unitId: true,
      },
    });
  });

  console.log(`[AUDIT LOG] User ${user?.id || 'SYSTEM'} (${user?.role}) removed employee ${targetUser.id} (${targetUser.name}) from Unit ${resolvedUnitId} (${unit.name}) at ${new Date().toISOString()}`);

  return updatedUser;
};

/**
 * Lấy danh sách thành viên của một đơn vị (kèm thông tin chức vụ, ngày gia nhập)
 * - Quyền truy cập: ROOT, Quản lý unit (Anh Cả hoặc Cha ở trên), hoặc Member thuộc unit
 */
const getUnitMembers = async (unitId, tenantId, user = null) => {
  const resolvedUnitId = Number(unitId);
  const resolvedTenantId = Number(tenantId);

  const unit = await prisma.unit.findFirst({
    where: { id: resolvedUnitId, tenantId: resolvedTenantId, deletedAt: null },
    include: {
      owner: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  if (!unit) {
    const error = new Error('Không tìm thấy đơn vị');
    error.statusCode = 404;
    throw error;
  }

  const isRoot = user?.role === 'ROOT';
  const userId = user?.id;
  const canManage = user ? await unitTreeHelper.canManageUnit(userId, resolvedUnitId, resolvedTenantId) : false;

  const [memberships, legacyMembers] = await Promise.all([
    prisma.unitMember.findMany({
      where: { unitId: resolvedUnitId, user: { deletedAt: null } },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, employeeCode: true } },
      },
      orderBy: { joinedAt: 'asc' },
    }),
    prisma.user.findMany({
      where: { unitId: resolvedUnitId, deletedAt: null, tenantId: resolvedTenantId },
      select: { id: true, name: true, email: true, role: true, employeeCode: true, createdAt: true },
    }),
  ]);

  const memberMap = new Map();

  legacyMembers.forEach((m) => {
    memberMap.set(m.id, {
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      employeeCode: m.employeeCode,
      isOwner: m.id === unit.ownerId,
      joinedAt: m.createdAt,
    });
  });

  memberships.forEach((ms) => {
    if (ms.user) {
      memberMap.set(ms.user.id, {
        id: ms.user.id,
        name: ms.user.name,
        email: ms.user.email,
        role: ms.user.role,
        employeeCode: ms.user.employeeCode,
        isOwner: ms.user.id === unit.ownerId,
        joinedAt: ms.joinedAt,
      });
    }
  });

  if (unit.owner && !memberMap.has(unit.owner.id)) {
    memberMap.set(unit.owner.id, {
      id: unit.owner.id,
      name: unit.owner.name,
      email: unit.owner.email,
      role: unit.owner.role,
      isOwner: true,
      joinedAt: null,
    });
  }

  const members = Array.from(memberMap.values());
  const isMember = members.some((m) => m.id === userId);

  if (user && !isRoot && !canManage && !isMember) {
    const error = new Error('Forbidden: Bạn không có quyền xem danh sách thành viên đơn vị này');
    error.statusCode = 403;
    throw error;
  }

  return {
    unit: {
      id: unit.id,
      name: unit.name,
      owner: unit.owner,
    },
    totalMembers: members.length,
    members,
  };
};

/**
 * Xem trước phân tích tái cấu trúc đơn vị (Reorganization Wizard Preview)
 * - Kiểm tra quyền: Chỉ ROOT / Top Parent Owner cấp công ty
 * - Lấy sếp cũ trung gian (con của B và cha của D)
 * - Lấy các con cháu của D (nhóm E, ...)
 * - Cung cấp 2 lựa chọn (SHARED_CHILDREN vs FULL_ISOLATION)
 */
const previewReorganizeUnit = async (unitId, newParentId, user, tenantId) => {
  const resolvedTenantId = Number(tenantId);
  const isTop = await unitTreeHelper.isTopRootOwner(user.id, resolvedTenantId);
  if (!isTop) {
    const error = new Error('Forbidden: Chỉ người đứng đầu cấp cao nhất của công ty mới có quyền tái cấu trúc cây.');
    error.statusCode = 403;
    throw error;
  }

  const impactData = await unitTreeHelper.getReorgImpactData(unitId, newParentId, resolvedTenantId);

  return {
    targetUnit: impactData.targetUnit,
    newParent: impactData.newParent,
    intermediateManagers: impactData.intermediateManagers, // Con của B và cha của D (sếp cũ)
    descendantUnits: impactData.descendantUnits,           // Con của D (nhóm E, ...)
    options: {
      strategyOptions: [
        {
          key: 'SHARED_CHILDREN',
          title: 'Dùng chung con (Shared Children)',
          description: 'Sếp cũ không thấy D, nhưng sếp cũ và D CÙNG THẤY và CÙNG QUẢN LÝ (duyệt hóa đơn) cho các con của D (vai trò EDIT).',
        },
        {
          key: 'FULL_ISOLATION',
          title: 'Tách trọn gói (Full Isolation)',
          description: 'Sếp cũ không thấy D, và cũng KHÔNG THẤY các con của D. Cắt đứt sạch sẽ 100%.',
        },
      ],
    },
  };
};

/**
 * Xác nhận thực thi tái cấu trúc đơn vị (Reorganization Wizard Confirm)
 * - strategy = 'SHARED_CHILDREN' | 'FULL_ISOLATION'
 * - Cập nhật D.parentId = newParentId
 * - Nếu SHARED_CHILDREN: gán sếp cũ vào unit_members của các con D với role = 'EDIT'
 * - Nếu FULL_ISOLATION: cắt sạch liên kết của sếp cũ khỏi D và các con D
 */
const confirmReorganizeUnit = async (unitId, newParentId, strategy, user, tenantId) => {
  const resolvedTenantId = Number(tenantId);
  const resolvedUnitId = Number(unitId);
  const resolvedNewParentId = newParentId ? Number(newParentId) : null;

  const isTop = await unitTreeHelper.isTopRootOwner(user.id, resolvedTenantId);
  if (!isTop) {
    const error = new Error('Forbidden: Chỉ người đứng đầu cấp cao nhất của công ty mới có quyền tái cấu trúc cây.');
    error.statusCode = 403;
    throw error;
  }

  if (!['SHARED_CHILDREN', 'FULL_ISOLATION'].includes(strategy)) {
    const error = new Error("Chiến lược tái cấu trúc không hợp lệ. Phải là 'SHARED_CHILDREN' hoặc 'FULL_ISOLATION'.");
    error.statusCode = 400;
    throw error;
  }

  const impactData = await unitTreeHelper.getReorgImpactData(resolvedUnitId, resolvedNewParentId, resolvedTenantId);

  await prisma.$transaction(async (tx) => {
    // 1. Chuyển nhánh cho targetUnit D
    await tx.unit.update({
      where: { id: resolvedUnitId },
      data: { parentId: resolvedNewParentId },
    });

    const oldManagerUserIds = impactData.intermediateManagers
      .map((m) => m.ownerId)
      .filter(Boolean);

    const descendantIds = impactData.descendantUnits.map((d) => d.id);

    if (strategy === 'SHARED_CHILDREN') {
      // Gán các sếp cũ vào con cháu của D với vai trò EDIT
      for (const managerUserId of oldManagerUserIds) {
        for (const childUnitId of descendantIds) {
          await tx.unitMember.upsert({
            where: {
              unitId_userId: {
                unitId: childUnitId,
                userId: managerUserId,
              },
            },
            create: {
              unitId: childUnitId,
              userId: managerUserId,
              role: 'EDIT',
            },
            update: {
              role: 'EDIT',
            },
          });
        }
      }
    } else if (strategy === 'FULL_ISOLATION') {
      // Cắt sạch quyền của các sếp cũ trên cả D lẫn con cháu của D
      const targetUnitIds = [resolvedUnitId, ...descendantIds];
      if (oldManagerUserIds.length > 0 && targetUnitIds.length > 0) {
        await tx.unitMember.deleteMany({
          where: {
            unitId: { in: targetUnitIds },
            userId: { in: oldManagerUserIds },
          },
        });
      }
    }
  });

  console.log(`[AUDIT LOG] User ${user.id} (${user.role}) reorganized Unit ${resolvedUnitId} to Parent ${resolvedNewParentId} with strategy '${strategy}' at ${new Date().toISOString()}`);

  return {
    success: true,
    message: 'Tái cấu trúc đơn vị thành công',
    targetUnitId: resolvedUnitId,
    newParentId: resolvedNewParentId,
    strategy,
  };
};

module.exports = {
  calculateSafeBalance,
  createUnit,
  getUnitTree,
  getUnitById,
  updateUnit,
  deleteUnit,
  addMember,
  removeMember,
  getUnitMembers,
  previewReorganizeUnit,
  confirmReorganizeUnit,
  // Helper phả hệ cây
  getAncestorsOfUnit: unitTreeHelper.getAncestorsOfUnit,
  getAncestorOwnerIds: unitTreeHelper.getAncestorOwnerIds,
  getDescendantUnitIds: unitTreeHelper.getDescendantUnitIds,
  canManageUnit: unitTreeHelper.canManageUnit,
  canCreateNestUnder: unitTreeHelper.canCreateNestUnder,
  canApproveExpense: unitTreeHelper.canApproveExpense,
  isTopRootOwner: unitTreeHelper.isTopRootOwner,
  getAccessibleUnitIdsForUser: unitTreeHelper.getAccessibleUnitIdsForUser,
  getReorgImpactData: unitTreeHelper.getReorgImpactData,
};
