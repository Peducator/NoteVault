const prisma = require('../config/prisma');

/**
 * 1. Lấy danh sách tất cả các Cha ở trên (Ancestor Chain) của một Unit
 * Trả về mảng các unit từ cha trực tiếp -> ông -> cụ -> ... -> nút gốc
 * @param {number} unitId 
 * @param {number} tenantId 
 * @returns {Promise<Array>}
 */
const getAncestorsOfUnit = async (unitId, tenantId) => {
  const resolvedUnitId = Number(unitId);
  const resolvedTenantId = Number(tenantId);

  const allUnits = await prisma.unit.findMany({
    where: { tenantId: resolvedTenantId, deletedAt: null },
    select: {
      id: true,
      name: true,
      parentId: true,
      ownerId: true,
      allowCreateSubUnit: true,
      allowMemberViewBalance: true,
    },
  });

  const unitMap = new Map(allUnits.map((u) => [u.id, u]));
  const ancestors = [];
  let curr = unitMap.get(resolvedUnitId);
  const visited = new Set();

  while (curr && curr.parentId && !visited.has(curr.parentId)) {
    visited.add(curr.parentId);
    const parent = unitMap.get(curr.parentId);
    if (!parent) break;
    ancestors.push(parent);
    curr = parent;
  }

  return ancestors;
};

/**
 * 2. Lấy danh sách ID của Anh Cả và tất cả các Cha ở trên
 * @param {number} unitId 
 * @param {number} tenantId 
 * @param {boolean} includeSelf - Có bao gồm ownerId của chính unitId hay không
 * @returns {Promise<Set<number>>}
 */
const getAncestorOwnerIds = async (unitId, tenantId, includeSelf = true) => {
  const resolvedUnitId = Number(unitId);
  const resolvedTenantId = Number(tenantId);

  const unit = await prisma.unit.findFirst({
    where: { id: resolvedUnitId, tenantId: resolvedTenantId, deletedAt: null },
    select: { id: true, ownerId: true, parentId: true },
  });

  const ownerIds = new Set();
  if (!unit) return ownerIds;

  if (includeSelf && unit.ownerId) {
    ownerIds.add(unit.ownerId);
  }

  const ancestors = await getAncestorsOfUnit(resolvedUnitId, resolvedTenantId);
  ancestors.forEach((a) => {
    if (a.ownerId) ownerIds.add(a.ownerId);
  });

  return ownerIds;
};

/**
 * 3. Lấy danh sách tất cả các unit con, cháu, chắt... trực thuộc một hoặc nhiều unit
 * @param {number|number[]} rootUnitIds 
 * @param {number} tenantId 
 * @returns {Promise<Set<number>>}
 */
const getDescendantUnitIds = async (rootUnitIds, tenantId) => {
  const resolvedTenantId = Number(tenantId);
  const roots = Array.isArray(rootUnitIds)
    ? rootUnitIds.map(Number)
    : [Number(rootUnitIds)];

  const allUnits = await prisma.unit.findMany({
    where: { tenantId: resolvedTenantId, deletedAt: null },
    select: { id: true, parentId: true, ownerId: true },
  });

  const descendantIds = new Set(roots);
  let addedNew = true;

  while (addedNew) {
    addedNew = false;
    for (const u of allUnits) {
      if (u.parentId && descendantIds.has(u.parentId) && !descendantIds.has(u.id)) {
        descendantIds.add(u.id);
        addedNew = true;
      }
    }
  }

  return descendantIds;
};

/**
 * 4. Kiểm tra user có phải là người đứng đầu đơn vị cha cao nhất (parentId = null) hay không.
 * Quy ước hệ thống: Chỉ có khái niệm parent (cha) và children (con).
 * Đơn vị cha cao nhất đơn giản là đơn vị có parentId == null (không có cha phía trên).
 * @param {number} userId 
 * @param {number} tenantId 
 * @returns {Promise<boolean>}
 */
const isTopParentOwner = async (userId, tenantId) => {
  const resolvedUserId = Number(userId);
  const resolvedTenantId = Number(tenantId);

  // 1. Kiểm tra đơn vị cha cao nhất có parentId = null
  const topParentUnit = await prisma.unit.findFirst({
    where: {
      tenantId: resolvedTenantId,
      parentId: null,
      deletedAt: null,
    },
    select: { id: true, ownerId: true },
  });

  if (topParentUnit && topParentUnit.ownerId === resolvedUserId) {
    return true;
  }

  // Fallback tương thích nếu tài khoản mang role ROOT trong legacy test
  const user = await prisma.user.findFirst({
    where: { id: resolvedUserId, tenantId: resolvedTenantId, deletedAt: null },
    select: { id: true, role: true },
  });

  return Boolean(user && user.role === 'ROOT');
};

// Alias giữ tương thích cho các caller
const isTopRootOwner = isTopParentOwner;

/**
 * 5. Kiểm tra quyền quản lý unit:
 * User có phải là Anh Cả của unit này HOẶC là một trong các Cha ở trên hay không?
 * @param {number} userId 
 * @param {number} targetUnitId 
 * @param {number} tenantId 
 * @returns {Promise<boolean>}
 */
const canManageUnit = async (userId, targetUnitId, tenantId) => {
  const uId = Number(userId);
  const tId = Number(targetUnitId);
  const tenId = Number(tenantId);

  // Nếu là người đứng đầu cao nhất của công ty
  const isTop = await isTopRootOwner(uId, tenId);
  if (isTop) return true;

  const target = await prisma.unit.findFirst({
    where: { id: tId, tenantId: tenId, deletedAt: null },
    select: { id: true, ownerId: true, parentId: true },
  });
  if (!target) return false;

  // Là Anh Cả của chính unit này
  if (target.ownerId === uId) return true;

  // Kiểm tra xem có phải là Cha ở trên (trong chuỗi tổ tiên) hay không
  const ancestors = await getAncestorsOfUnit(tId, tenId);
  if (ancestors.some((a) => a.ownerId === uId)) return true;

  // Kiểm tra nếu là thành viên trong unit_members với role = 'EDIT' (Đồng quản lý)
  const editMember = await prisma.unitMember.findFirst({
    where: { unitId: tId, userId: uId, role: 'EDIT' },
  });
  return Boolean(editMember);
};

/**
 * 6. Kiểm tra quyền TẠO NEST (tạo unit con mới bên dưới parentUnitId):
 * - Cha cấp cao nhất (gốc): Luôn có quyền tạo nest.
 * - Các Cha ở trên của parentUnit: Luôn có quyền tạo nest con cho cấp dưới.
 * - Anh Cả của parentUnit: CHỈ ĐƯỢC TẠO NEST NẾU parentUnit có allowCreateSubUnit === true!
 * @param {number} userId 
 * @param {number} parentUnitId 
 * @param {number} tenantId 
 * @returns {Promise<boolean>}
 */
const canCreateNestUnder = async (userId, parentUnitId, tenantId) => {
  const uId = Number(userId);
  const pId = Number(parentUnitId);
  const tenId = Number(tenantId);

  // Người đứng đầu cao nhất luôn được tạo nest
  const isTop = await isTopRootOwner(uId, tenId);
  if (isTop) return true;

  const parentUnit = await prisma.unit.findFirst({
    where: { id: pId, tenantId: tenId, deletedAt: null },
    select: { id: true, ownerId: true, parentId: true, allowCreateSubUnit: true },
  });
  if (!parentUnit) return false;

  // Nếu là một trong các Cha ở trên của parentUnit -> Luôn có quyền tạo nest
  const ancestors = await getAncestorsOfUnit(pId, tenId);
  if (ancestors.some((a) => a.ownerId === uId)) {
    return true;
  }

  // Nếu là Anh Cả của chính parentUnit này -> BẮT BUỘC parentUnit phải có cờ allowCreateSubUnit = true
  if (parentUnit.ownerId === uId) {
    return Boolean(parentUnit.allowCreateSubUnit);
  }

  return false;
};

/**
 * 7. Kiểm tra quyền DUYỆT CHI TIÊU cho một giao dịch:
 * - Cả Anh Cả của unit và các Cha ở trên đều có quyền duyệt chi chung
 * - Quy tắc tự duyệt: Nếu người tạo đơn chi tiêu là chính approver:
 *   + Chỉ người đứng đầu unit gốc tối cao (parentId = null) mới được tự duyệt đơn của mình
 *   + Anh Cả hay Cha nhỏ khác nộp đơn cá nhân bắt buộc phải để cấp Cha ở trên duyệt
 * @param {object} approverUser - { id, role, tenantId }
 * @param {object} transaction - { id, userId, unitId, tenantId }
 * @param {number} tenantId 
 * @returns {Promise<boolean>}
 */
const canApproveExpense = async (approverUser, transaction, tenantId) => {
  const appId = Number(approverUser.id);
  const tenId = Number(tenantId);

  // 1. Kiểm tra quy tắc tự duyệt
  if (Number(transaction.userId) === appId) {
    const isTop = await isTopRootOwner(appId, tenId);
    return isTop;
  }

  // 2. Thẩm quyền quản lý: Phải là Anh Cả của unit hoặc một trong các Cha ở trên
  return canManageUnit(appId, transaction.unitId, tenId);
};

/**
 * 8. Lấy tất cả các unitId mà user có quyền quản lý và tầm nhìn ("Cha luôn thấy con")
 * - Nếu là Top Root: Thấy toàn bộ đơn vị trong tenant
 * - Nếu là Cha / Anh Cả: Thấy các unit mình làm owner + toàn bộ các unit con/cháu/lá bên dưới
 * - Nếu chỉ là Member: Thấy unit của chính mình
 * @param {object} user - { id, role }
 * @param {number} tenantId 
 * @returns {Promise<Set<number>>}
 */
const getAccessibleUnitIdsForUser = async (user, tenantId) => {
  const uId = Number(user.id);
  const tenId = Number(tenantId);

  const isTop = await isTopRootOwner(uId, tenId);
  if (isTop) {
    const allUnits = await prisma.unit.findMany({
      where: { tenantId: tenId, deletedAt: null },
      select: { id: true },
    });
    return new Set(allUnits.map((u) => u.id));
  }

  // Tìm các unit mà user làm Owner (Anh Cả hoặc Cha)
  const ownedUnits = await prisma.unit.findMany({
    where: { ownerId: uId, tenantId: tenId, deletedAt: null },
    select: { id: true },
  });

  const ownedUnitIds = ownedUnits.map((u) => u.id);
  const accessible = ownedUnitIds.length > 0
    ? await getDescendantUnitIds(ownedUnitIds, tenId)
    : new Set();

  // Bổ sung các unit mà user tham gia làm thành viên (qua unit_members và user.unitId)
  const [memberRecords, userRecord] = await Promise.all([
    prisma.unitMember.findMany({
      where: { userId: uId, unit: { tenantId: tenId, deletedAt: null } },
      select: { unitId: true },
    }),
    prisma.user.findFirst({
      where: { id: uId, tenantId: tenId, deletedAt: null },
      select: { unitId: true },
    }),
  ]);

  memberRecords.forEach((m) => accessible.add(m.unitId));
  if (userRecord?.unitId) {
    accessible.add(userRecord.unitId);
  }

  return accessible;
};

/**
 * 9. Lấy dữ liệu phân tích tác động khi Tái Cấu Trúc Đơn Vị (Reorganization Wizard):
 * - Tìm chuỗi các sếp cũ trung gian (con của B và cha của D) bằng cách leo ngược parentId từ D lên newParentId
 * - Tìm các đơn vị con cháu của D (nhóm E, ...)
 * - Kiểm tra chống vòng lặp chu trình
 * @param {number} unitId - Đơn vị D cần chuyển
 * @param {number|null} newParentId - Đơn vị cha mới (hoặc null nếu lên Top Root)
 * @param {number} tenantId 
 */
const getReorgImpactData = async (unitId, newParentId, tenantId) => {
  const resolvedUnitId = Number(unitId);
  const resolvedNewParentId = newParentId ? Number(newParentId) : null;
  const resolvedTenantId = Number(tenantId);

  // 1. Kiểm tra chống vòng lặp chu trình
  if (resolvedNewParentId === resolvedUnitId) {
    const error = new Error('Một đơn vị không thể làm cha của chính mình.');
    error.statusCode = 400;
    throw error;
  }

  const descendantIds = await getDescendantUnitIds(resolvedUnitId, resolvedTenantId);
  if (resolvedNewParentId && descendantIds.has(resolvedNewParentId)) {
    const error = new Error('Không thể chuyển đơn vị vào bên trong nhánh con của chính nó (gây chu trình lặp)!');
    error.statusCode = 400;
    throw error;
  }

  // 2. Lấy tất cả các unit trong tenant
  const allUnits = await prisma.unit.findMany({
    where: { tenantId: resolvedTenantId, deletedAt: null },
    include: {
      owner: {
        select: { id: true, name: true, email: true, employeeCode: true, role: true },
      },
    },
  });

  const unitMap = new Map(allUnits.map((u) => [u.id, u]));
  const targetUnit = unitMap.get(resolvedUnitId);
  if (!targetUnit) {
    const error = new Error('Không tìm thấy đơn vị cần tái cấu trúc');
    error.statusCode = 404;
    throw error;
  }

  const newParentUnit = resolvedNewParentId ? unitMap.get(resolvedNewParentId) : null;
  if (resolvedNewParentId && !newParentUnit) {
    const error = new Error('Đơn vị cha mới không tồn tại hoặc không thuộc công ty này');
    error.statusCode = 404;
    throw error;
  }

  // 3. Leo ngược parentId từ cha của targetUnit lên newParentId
  // Đây chính là tập hợp các sếp cũ trung gian (con của B và cha của D)
  const intermediateManagers = [];
  let currId = targetUnit.parentId;
  const visited = new Set();

  while (currId && currId !== resolvedNewParentId && !visited.has(currId)) {
    visited.add(currId);
    const parent = unitMap.get(currId);
    if (!parent) break;
    intermediateManagers.push({
      id: parent.id,
      name: parent.name,
      parentId: parent.parentId,
      ownerId: parent.ownerId,
      owner: parent.owner,
    });
    currId = parent.parentId;
  }

  // 4. Lấy danh sách các con của targetUnit (Đoạn con cháu của D)
  const descendantUnits = [];
  for (const u of allUnits) {
    if (u.id !== resolvedUnitId && descendantIds.has(u.id)) {
      descendantUnits.push({
        id: u.id,
        name: u.name,
        parentId: u.parentId,
        ownerId: u.ownerId,
        owner: u.owner,
      });
    }
  }

  return {
    targetUnit: {
      id: targetUnit.id,
      name: targetUnit.name,
      parentId: targetUnit.parentId,
      ownerId: targetUnit.ownerId,
      owner: targetUnit.owner,
    },
    newParent: newParentUnit
      ? {
          id: newParentUnit.id,
          name: newParentUnit.name,
          ownerId: newParentUnit.ownerId,
          owner: newParentUnit.owner,
        }
      : null,
    intermediateManagers, // Con của B và là cha của D (sếp cũ)
    descendantUnits,      // Các con cháu của D
  };
};

module.exports = {
  getAncestorsOfUnit,
  getAncestorOwnerIds,
  getDescendantUnitIds,
  isTopParentOwner,
  isTopRootOwner,
  canManageUnit,
  canCreateNestUnder,
  canApproveExpense,
  getAccessibleUnitIdsForUser,
  getReorgImpactData,
};
