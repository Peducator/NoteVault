const prisma = require('../config/prisma');
const unitService = require('../unit/unitService');
const unitTreeHelper = require('../unit/unitTreeHelper');
const notificationService = require('../notification/notificationService');

// Thời gian hết hạn của khóa chống Race Condition: 5 phút = 300.000 ms
const LOCK_TTL_MS = 5 * 60 * 1000;

/**
 * Kiểm tra thẩm quyền thao tác tại một Unit:
 * - ROOT của tenant: Luôn có quyền.
 * - Owner của chính unit đó: Có quyền.
 * - Thành viên trong unit_members của unit đó có role === 'EDIT': Có quyền.
 * - Người ngoài hoặc role === 'VIEWER': Không có quyền.
 */
const canActOnUnit = async (userId, unitId, tenantId, userRole) => {
  const resolvedUserId = Number(userId);
  const resolvedUnitId = Number(unitId);
  const resolvedTenantId = Number(tenantId);

  if (userRole === 'ROOT') return true;

  const isTop = await unitTreeHelper.isTopRootOwner(resolvedUserId, resolvedTenantId);
  if (isTop) return true;

  const unit = await prisma.unit.findFirst({
    where: { id: resolvedUnitId, tenantId: resolvedTenantId, deletedAt: null },
    select: { id: true, ownerId: true },
  });

  if (!unit) return false;
  if (unit.ownerId === resolvedUserId) return true;

  const editMembership = await prisma.unitMember.findFirst({
    where: {
      unitId: resolvedUnitId,
      userId: resolvedUserId,
      role: 'EDIT',
    },
  });

  return Boolean(editMembership);
};

/**
 * Lấy tên hiển thị của người dùng (nếu user trong req không có name thì lấy từ DB)
 */
const getUserDisplayName = async (user) => {
  if (user && user.name) return user.name;
  if (!user || !user.id) return user?.email || 'Người dùng';
  const dbUser = await prisma.user.findUnique({
    where: { id: Number(user.id) },
    select: { name: true, email: true },
  });
  return dbUser?.name || dbUser?.email || user.email || 'Người dùng';
};

/**
 * 1. Khởi tạo Yêu cầu xin cấp thêm ngân sách (Allocation Request)
 * Đơn vị xin tiền chỉ được gửi lên Cha trực tiếp (destinationUnit.parentId)
 */
const createRequest = async ({ destinationUnitId, amount, reason, requesterUser, tenantId }) => {
  if (!amount) {
    const error = new Error('Số tiền yêu cầu cấp phát (amount) là bắt buộc');
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
    const error = new Error('Số tiền yêu cầu phải lớn hơn 0 VND');
    error.statusCode = 400;
    throw error;
  }

  if (!reason || !String(reason).trim()) {
    const error = new Error('Lý do xin thêm ngân sách (reason) là bắt buộc');
    error.statusCode = 400;
    throw error;
  }

  const resolvedTenantId = Number(tenantId);
  const resolvedDestId = Number(destinationUnitId);
  const resolvedUserId = Number(requesterUser.id);

  // 1. Kiểm tra đơn vị đích
  const destinationUnit = await prisma.unit.findFirst({
    where: { id: resolvedDestId, tenantId: resolvedTenantId, deletedAt: null },
  });

  if (!destinationUnit) {
    const error = new Error('Đơn vị yêu cầu ngân sách không tồn tại hoặc không thuộc công ty này');
    error.statusCode = 404;
    throw error;
  }

  // 2. Đơn vị gốc không có cha -> không thể xin ngân sách
  if (!destinationUnit.parentId) {
    const error = new Error('Đơn vị gốc cao nhất của công ty không có cấp trên để gửi yêu cầu xin ngân sách.');
    error.statusCode = 400;
    throw error;
  }

  // 3. Kiểm tra quyền của người tạo đơn tại destinationUnit
  const hasPermission = await canActOnUnit(resolvedUserId, resolvedDestId, resolvedTenantId, requesterUser.role);
  if (!hasPermission) {
    const error = new Error('Bạn không có quyền đại diện đơn vị này để gửi yêu cầu xin cấp ngân sách (Yêu cầu vai trò Owner hoặc EDIT).');
    error.statusCode = 403;
    throw error;
  }

  // 4. Lấy thông tin Cha trực tiếp
  const directParent = await prisma.unit.findFirst({
    where: { id: destinationUnit.parentId, tenantId: resolvedTenantId, deletedAt: null },
  });

  if (!directParent) {
    const error = new Error('Không tìm thấy đơn vị cấp trên trực tiếp');
    error.statusCode = 404;
    throw error;
  }

  // 5. Khởi tạo nhật ký chuỗi phê duyệt
  const initialHistory = [
    {
      unitId: destinationUnit.id,
      unitName: destinationUnit.name,
      action: 'CREATE',
      userId: resolvedUserId,
      userName: await getUserDisplayName(requesterUser),
      note: String(reason).trim(),
      timestamp: new Date().toISOString(),
    },
  ];

  const request = await prisma.allocationRequest.create({
    data: {
      tenantId: resolvedTenantId,
      destinationUnitId: resolvedDestId,
      requesterId: resolvedUserId,
      amount: bigIntAmount,
      reason: String(reason).trim(),
      status: 'PENDING',
      currentUnitId: directParent.id,
      forwardingHistory: initialHistory,
    },
    include: {
      destinationUnit: { select: { id: true, name: true } },
      currentUnit: { select: { id: true, name: true } },
      requester: { select: { id: true, name: true, email: true } },
    },
  });

  // 6. Phát thông báo cho cấp trên trực tiếp (Owner và EDIT members của directParent)
  try {
    const parentEditMembers = await prisma.unitMember.findMany({
      where: { unitId: directParent.id, role: 'EDIT' },
      select: { userId: true },
    });

    const recipientIds = new Set();
    if (directParent.ownerId) recipientIds.add(directParent.ownerId);
    parentEditMembers.forEach((m) => recipientIds.add(m.userId));

    const formattedAmount = Number(bigIntAmount).toLocaleString('vi-VN');
    const notifs = Array.from(recipientIds).map((uid) => ({
      tenantId: resolvedTenantId,
      userId: uid,
      title: 'Yêu cầu xin cấp ngân sách mới',
      message: `Đơn vị "${destinationUnit.name}" vừa gửi yêu cầu xin cấp ${formattedAmount} đ lên phòng ban của bạn. Lý do: ${request.reason}`,
      type: 'ALLOCATION_REQUEST',
      data: {
        requestId: request.id,
        destinationUnitId: destinationUnit.id,
        destinationUnitName: destinationUnit.name,
        amount: request.amount.toString(),
      },
    }));

    if (notifs.length > 0) {
      await notificationService.createManyNotifications(notifs);
    }
  } catch (notifErr) {
    console.error('[Notification Warning] Không thể tạo thông báo tạo yêu cầu xin tiền:', notifErr.message);
  }

  return {
    ...request,
    amount: request.amount.toString(),
  };
};

/**
 * 2. Khóa chống Race Condition (CAS Lock với TTL 5 phút)
 * Khi một sếp bấm vào tiến trình xử lý / thanh toán
 */
const lockRequest = async ({ requestId, user, tenantId }) => {
  const reqId = Number(requestId);
  const resolvedTenantId = Number(tenantId);
  const resolvedUserId = Number(user.id);

  const request = await prisma.allocationRequest.findFirst({
    where: { id: reqId, tenantId: resolvedTenantId },
    include: {
      currentUnit: true,
      lockedBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!request) {
    const error = new Error('Không tìm thấy yêu cầu xin cấp ngân sách');
    error.statusCode = 404;
    throw error;
  }

  if (request.status === 'APPROVED' || request.status === 'REJECTED' || request.status === 'CANCELLED') {
    const error = new Error(`Yêu cầu đã ở trạng thái kết thúc (${request.status}), không thể khóa.`);
    error.statusCode = 400;
    throw error;
  }

  // Kiểm tra quyền tại đơn vị hiện tại
  const hasPermission = await canActOnUnit(resolvedUserId, request.currentUnitId, resolvedTenantId, user.role);
  if (!hasPermission) {
    const error = new Error('Bạn không có quyền quản lý tại phòng ban đang thụ lý yêu cầu này');
    error.statusCode = 403;
    throw error;
  }

  const now = Date.now();

  // Kiểm tra xem có người đang giữ khóa hay không
  if (request.status === 'ALLOCATING' && request.lockedById) {
    // Nếu chính mình đang giữ khóa -> Refresh TTL
    if (request.lockedById === resolvedUserId) {
      const updated = await prisma.allocationRequest.update({
        where: { id: reqId },
        data: { lockedAt: new Date() },
        include: { lockedBy: { select: { id: true, name: true, email: true } } },
      });
      return {
        success: true,
        message: 'Gia hạn khóa thành công (5 phút)',
        data: {
          requestId: updated.id,
          status: updated.status,
          lockedById: updated.lockedById,
          lockedByName: updated.lockedBy?.name || updated.lockedBy?.email,
          lockedAt: updated.lockedAt,
          remainingSeconds: 300,
        },
      };
    }

    // Nếu người khác đang giữ khóa: kiểm tra xem khóa còn hạn không (< 5 phút)
    const lockedTime = request.lockedAt ? new Date(request.lockedAt).getTime() : 0;
    const elapsed = now - lockedTime;

    if (elapsed < LOCK_TTL_MS) {
      const remainingSeconds = Math.max(1, Math.ceil((LOCK_TTL_MS - elapsed) / 1000));
      const lockerName = request.lockedBy?.name || request.lockedBy?.email || 'Người quản lý khác';
      const error = new Error(`Yêu cầu đang chờ được xử lý hoặc có thể bị hủy bởi ${lockerName}`);
      error.statusCode = 409;
      error.data = {
        lockedById: request.lockedById,
        lockedByName: lockerName,
        lockedAt: request.lockedAt,
        remainingSeconds,
      };
      throw error;
    }
  }

  // Chiếm khóa (Atomic update)
  const updated = await prisma.allocationRequest.update({
    where: { id: reqId },
    data: {
      status: 'ALLOCATING',
      lockedById: resolvedUserId,
      lockedAt: new Date(),
    },
    include: {
      lockedBy: { select: { id: true, name: true, email: true } },
    },
  });

  return {
    success: true,
    message: 'Khóa yêu cầu thành công trong 5 phút để tiến hành phê duyệt / thanh toán',
    data: {
      requestId: updated.id,
      status: updated.status,
      lockedById: updated.lockedById,
      lockedByName: updated.lockedBy?.name || updated.lockedBy?.email,
      lockedAt: updated.lockedAt,
      remainingSeconds: 300,
    },
  };
};

/**
 * 3. Hủy Khóa (Release Lock)
 * Cho phép người đang giữ khóa hoặc ROOT giải phóng khóa trở lại PENDING
 */
const unlockRequest = async ({ requestId, user, tenantId }) => {
  const reqId = Number(requestId);
  const resolvedTenantId = Number(tenantId);
  const resolvedUserId = Number(user.id);

  const request = await prisma.allocationRequest.findFirst({
    where: { id: reqId, tenantId: resolvedTenantId },
  });

  if (!request) {
    const error = new Error('Không tìm thấy yêu cầu xin cấp ngân sách');
    error.statusCode = 404;
    throw error;
  }

  if (request.status !== 'ALLOCATING') {
    return {
      success: true,
      message: 'Yêu cầu không trong trạng thái khóa',
    };
  }

  // Chỉ người đang giữ khóa hoặc ROOT mới được mở khóa chủ động
  const isLocker = request.lockedById === resolvedUserId;
  const isRoot = user.role === 'ROOT';
  if (!isLocker && !isRoot) {
    const error = new Error('Chỉ người đang giữ khóa hoặc ROOT mới có quyền mở khóa yêu cầu này.');
    error.statusCode = 403;
    throw error;
  }

  const updated = await prisma.allocationRequest.update({
    where: { id: reqId },
    data: {
      status: 'PENDING',
      lockedById: null,
      lockedAt: null,
    },
  });

  return {
    success: true,
    message: 'Đã mở khóa yêu cầu thành công',
    data: {
      requestId: updated.id,
      status: updated.status,
    },
  };
};

/**
 * 4. Duyệt & Chuyển tiếp (Endorse & Forward) lên cấp trên
 * Bắt buộc cấp hiện tại phải bấm DUYỆT (Endorse) thì mới chuyển tiếp lên cha tiếp theo.
 */
const forwardRequest = async ({ requestId, user, note, tenantId }) => {
  const reqId = Number(requestId);
  const resolvedTenantId = Number(tenantId);
  const resolvedUserId = Number(user.id);

  const request = await prisma.allocationRequest.findFirst({
    where: { id: reqId, tenantId: resolvedTenantId },
    include: {
      currentUnit: true,
      destinationUnit: true,
      lockedBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!request) {
    const error = new Error('Không tìm thấy yêu cầu xin cấp ngân sách');
    error.statusCode = 404;
    throw error;
  }

  if (request.status === 'APPROVED' || request.status === 'REJECTED' || request.status === 'CANCELLED') {
    const error = new Error(`Yêu cầu đã kết thúc (${request.status}), không thể chuyển tiếp.`);
    error.statusCode = 400;
    throw error;
  }

  // Kiểm tra quyền tại currentUnit
  const hasPermission = await canActOnUnit(resolvedUserId, request.currentUnitId, resolvedTenantId, user.role);
  if (!hasPermission) {
    const error = new Error('Bạn không có quyền phê duyệt và chuyển tiếp tại phòng ban hiện tại (Yêu cầu vai trò Owner hoặc EDIT).');
    error.statusCode = 403;
    throw error;
  }

  // Kiểm tra lock
  if (request.status === 'ALLOCATING' && request.lockedById && request.lockedById !== resolvedUserId) {
    const elapsed = Date.now() - (request.lockedAt ? new Date(request.lockedAt).getTime() : 0);
    if (elapsed < LOCK_TTL_MS) {
      const lockerName = request.lockedBy?.name || request.lockedBy?.email || 'Người khác';
      const error = new Error(`Yêu cầu đang chờ được xử lý hoặc có thể bị hủy bởi ${lockerName}`);
      error.statusCode = 409;
      throw error;
    }
  }

  // Kiểm tra xem currentUnit có cha cấp trên hay không
  if (!request.currentUnit.parentId) {
    const error = new Error('Yêu cầu đã ở cấp cao nhất trong tổ chức, không thể chuyển tiếp lên cấp trên được nữa.');
    error.statusCode = 400;
    throw error;
  }

  // Lấy đơn vị cha tiếp theo
  const nextParent = await prisma.unit.findFirst({
    where: { id: request.currentUnit.parentId, tenantId: resolvedTenantId, deletedAt: null },
  });

  if (!nextParent) {
    const error = new Error('Không tìm thấy đơn vị cấp trên tiếp theo');
    error.statusCode = 404;
    throw error;
  }

  // Ghi nhận bước DUYỆT & CHUYỂN TIẾP (ENDORSE_AND_FORWARD)
  const history = Array.isArray(request.forwardingHistory) ? [...request.forwardingHistory] : [];
  const actorName = await getUserDisplayName(user);
  history.push({
    unitId: request.currentUnit.id,
    unitName: request.currentUnit.name,
    action: 'ENDORSE_AND_FORWARD',
    userId: resolvedUserId,
    userName: actorName,
    note: note ? String(note).trim() : 'Đã phê duyệt và chuyển tiếp lên cấp trên xem xét cấp ngân sách',
    timestamp: new Date().toISOString(),
  });

  // Cập nhật currentUnitId lên nextParent.id và trả lại PENDING
  const updated = await prisma.allocationRequest.update({
    where: { id: reqId },
    data: {
      currentUnitId: nextParent.id,
      status: 'PENDING',
      lockedById: null,
      lockedAt: null,
      forwardingHistory: history,
    },
    include: {
      destinationUnit: { select: { id: true, name: true } },
      currentUnit: { select: { id: true, name: true } },
    },
  });

  // Bắn thông báo cho nextParent
  try {
    const nextEditMembers = await prisma.unitMember.findMany({
      where: { unitId: nextParent.id, role: 'EDIT' },
      select: { userId: true },
    });

    const recipientIds = new Set();
    if (nextParent.ownerId) recipientIds.add(nextParent.ownerId);
    nextEditMembers.forEach((m) => recipientIds.add(m.userId));

    const formattedAmount = Number(request.amount).toLocaleString('vi-VN');
    const notifs = Array.from(recipientIds).map((uid) => ({
      tenantId: resolvedTenantId,
      userId: uid,
      title: 'Yêu cầu xin ngân sách được chuyển tiếp đến phòng ban bạn',
      message: `Phòng ban "${request.currentUnit.name}" vừa duyệt và chuyển tiếp yêu cầu xin ${formattedAmount} đ của "${request.destinationUnit.name}" lên phòng ban của bạn.`,
      type: 'ALLOCATION_REQUEST',
      data: {
        requestId: updated.id,
        destinationUnitId: request.destinationUnit.id,
        currentUnitId: nextParent.id,
        amount: request.amount.toString(),
      },
    }));

    if (notifs.length > 0) {
      await notificationService.createManyNotifications(notifs);
    }
  } catch (notifErr) {
    console.error('[Notification Warning] Không thể tạo thông báo chuyển tiếp:', notifErr.message);
  }

  return {
    ...updated,
    amount: updated.amount.toString(),
  };
};

/**
 * 5. Phê duyệt & Rót tiền Trực tiếp (Approve & Direct Fund)
 * Bắt buộc nhập chính xác 'CONFIRM' hoặc 'XÁC NHẬN' để mở khóa thanh toán.
 * Rót tiền trực tiếp từ currentUnit xuống destinationUnit.
 */
const approveAndFundRequest = async ({ requestId, user, confirmation, note, tenantId }) => {
  const reqId = Number(requestId);
  const resolvedTenantId = Number(tenantId);
  const resolvedUserId = Number(user.id);

  // 1. Kiểm tra xác nhận an toàn chống bấm nhầm (Challenge Confirmation)
  const trimmedConfirm = confirmation ? String(confirmation).trim().toUpperCase() : '';
  if (trimmedConfirm !== 'CONFIRM' && trimmedConfirm !== 'XAC NHAN' && trimmedConfirm !== 'XÁC NHẬN') {
    const error = new Error('Vui lòng nhập chính xác "CONFIRM" hoặc "XÁC NHẬN" để mở khóa nút xác nhận giải ngân số tiền từ quỹ phòng ban.');
    error.statusCode = 400;
    throw error;
  }

  const request = await prisma.allocationRequest.findFirst({
    where: { id: reqId, tenantId: resolvedTenantId },
    include: {
      currentUnit: true,
      destinationUnit: true,
      lockedBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!request) {
    const error = new Error('Không tìm thấy yêu cầu xin cấp ngân sách');
    error.statusCode = 404;
    throw error;
  }

  if (request.status === 'APPROVED') {
    const error = new Error('Yêu cầu này đã được phê duyệt và giải ngân trước đó.');
    error.statusCode = 400;
    throw error;
  }

  if (request.status === 'REJECTED' || request.status === 'CANCELLED') {
    const error = new Error(`Yêu cầu này đã ở trạng thái ${request.status}, không thể giải ngân.`);
    error.statusCode = 400;
    throw error;
  }

  // 2. Kiểm tra quyền tại currentUnit
  const hasPermission = await canActOnUnit(resolvedUserId, request.currentUnitId, resolvedTenantId, user.role);
  if (!hasPermission) {
    const error = new Error('Bạn không có quyền phê duyệt và rót tiền tại phòng ban hiện tại (Yêu cầu vai trò Owner hoặc EDIT).');
    error.statusCode = 403;
    throw error;
  }

  // 3. Kiểm tra lock: nếu đang bị người khác lock (< 5 phút)
  if (request.status === 'ALLOCATING' && request.lockedById && request.lockedById !== resolvedUserId) {
    const elapsed = Date.now() - (request.lockedAt ? new Date(request.lockedAt).getTime() : 0);
    if (elapsed < LOCK_TTL_MS) {
      const lockerName = request.lockedBy?.name || request.lockedBy?.email || 'Người khác';
      const error = new Error(`Yêu cầu đang chờ được xử lý hoặc có thể bị hủy bởi ${lockerName}`);
      error.statusCode = 409;
      throw error;
    }
  }

  // 4. Kiểm tra số dư an toàn của currentUnit
  const sourceSafeBalance = await unitService.calculateSafeBalance(request.currentUnitId);
  if (sourceSafeBalance < request.amount) {
    const error = new Error(`Số dư an toàn hiện tại của phòng ban (${sourceSafeBalance.toLocaleString('vi-VN')} đ) không đủ để giải ngân ${request.amount.toLocaleString('vi-VN')} đ. Vui lòng bấm Duyệt & Chuyển tiếp lên cấp trên.`);
    error.statusCode = 400;
    throw error;
  }

  // 5. Thực thi Transaction nguyên tử
  const result = await prisma.$transaction(async (tx) => {
    // a. Tạo bản ghi Allocation rót tiền trực tiếp từ currentUnit xuống destinationUnit
    const allocation = await tx.allocation.create({
      data: {
        tenantId: resolvedTenantId,
        sourceUnitId: request.currentUnitId,
        targetUnitId: request.destinationUnitId,
        amount: request.amount,
        createdById: resolvedUserId,
        note: note ? String(note).trim() : `Giải ngân theo yêu cầu #${request.id}: ${request.reason}`,
      },
    });

    // b. Cập nhật nhật ký phê duyệt
    const history = Array.isArray(request.forwardingHistory) ? [...request.forwardingHistory] : [];
    const actorName = await getUserDisplayName(user);
    history.push({
      unitId: request.currentUnit.id,
      unitName: request.currentUnit.name,
      action: 'APPROVE_AND_FUND',
      userId: resolvedUserId,
      userName: actorName,
      note: note ? String(note).trim() : 'Đã xác nhận CONFIRM và giải ngân ngân sách trực tiếp',
      timestamp: new Date().toISOString(),
    });

    // c. Cập nhật AllocationRequest thành APPROVED
    const updated = await tx.allocationRequest.update({
      where: { id: reqId },
      data: {
        status: 'APPROVED',
        fundedByUnitId: request.currentUnitId,
        fundedByUserId: resolvedUserId,
        allocationId: allocation.id,
        lockedById: null,
        lockedAt: null,
        forwardingHistory: history,
      },
      include: {
        destinationUnit: { select: { id: true, name: true } },
        currentUnit: { select: { id: true, name: true } },
        fundedByUnit: { select: { id: true, name: true } },
        fundedByUser: { select: { id: true, name: true, email: true } },
      },
    });

    return { updated, allocation };
  });

  // 6. Phát thông báo giải ngân thành công
  try {
    const formattedAmount = Number(request.amount).toLocaleString('vi-VN');
    const recipientIds = new Set();
    recipientIds.add(request.requesterId);

    if (request.destinationUnit.ownerId) {
      recipientIds.add(request.destinationUnit.ownerId);
    }

    const notifs = Array.from(recipientIds).map((uid) => ({
      tenantId: resolvedTenantId,
      userId: uid,
      title: 'Yêu cầu xin cấp ngân sách đã được giải ngân thành công',
      message: `Phòng ban "${request.currentUnit.name}" vừa phê duyệt và giải ngân trực tiếp ${formattedAmount} đ cho "${request.destinationUnit.name}".`,
      type: 'ALLOCATION_APPROVED',
      data: {
        requestId: result.updated.id,
        destinationUnitId: request.destinationUnit.id,
        fundedByUnitId: request.currentUnit.id,
        allocationId: result.allocation.id,
        amount: request.amount.toString(),
      },
    }));

    if (notifs.length > 0) {
      await notificationService.createManyNotifications(notifs);
    }
  } catch (notifErr) {
    console.error('[Notification Warning] Không thể tạo thông báo giải ngân:', notifErr.message);
  }

  return {
    ...result.updated,
    amount: result.updated.amount.toString(),
    allocation: {
      ...result.allocation,
      amount: result.allocation.amount.toString(),
    },
  };
};

/**
 * 6. Từ chối yêu cầu (Reject Request)
 * Minh bạch tuyệt đối: Bắt buộc ghi nhận lý do, phòng ban từ chối, người từ chối và thời điểm từ chối.
 */
const rejectRequest = async ({ requestId, user, reason, tenantId }) => {
  const reqId = Number(requestId);
  const resolvedTenantId = Number(tenantId);
  const resolvedUserId = Number(user.id);

  if (!reason || !String(reason).trim()) {
    const error = new Error('Lý do từ chối (reason) là bắt buộc để đảm bảo tính minh bạch');
    error.statusCode = 400;
    throw error;
  }

  const request = await prisma.allocationRequest.findFirst({
    where: { id: reqId, tenantId: resolvedTenantId },
    include: {
      currentUnit: true,
      destinationUnit: true,
      lockedBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!request) {
    const error = new Error('Không tìm thấy yêu cầu xin cấp ngân sách');
    error.statusCode = 404;
    throw error;
  }

  if (request.status === 'APPROVED' || request.status === 'REJECTED' || request.status === 'CANCELLED') {
    const error = new Error(`Yêu cầu đã kết thúc (${request.status}), không thể từ chối.`);
    error.statusCode = 400;
    throw error;
  }

  // Kiểm tra quyền tại currentUnit
  const hasPermission = await canActOnUnit(resolvedUserId, request.currentUnitId, resolvedTenantId, user.role);
  if (!hasPermission) {
    const error = new Error('Bạn không có quyền từ chối tại phòng ban hiện tại (Yêu cầu vai trò Owner hoặc EDIT).');
    error.statusCode = 403;
    throw error;
  }

  // Kiểm tra lock
  if (request.status === 'ALLOCATING' && request.lockedById && request.lockedById !== resolvedUserId) {
    const elapsed = Date.now() - (request.lockedAt ? new Date(request.lockedAt).getTime() : 0);
    if (elapsed < LOCK_TTL_MS) {
      const lockerName = request.lockedBy?.name || request.lockedBy?.email || 'Người khác';
      const error = new Error(`Yêu cầu đang chờ được xử lý hoặc có thể bị hủy bởi ${lockerName}`);
      error.statusCode = 409;
      throw error;
    }
  }

  const history = Array.isArray(request.forwardingHistory) ? [...request.forwardingHistory] : [];
  const actorName = await getUserDisplayName(user);
  history.push({
    unitId: request.currentUnit.id,
    unitName: request.currentUnit.name,
    action: 'REJECT',
    userId: resolvedUserId,
    userName: actorName,
    note: String(reason).trim(),
    timestamp: new Date().toISOString(),
  });

  const updated = await prisma.allocationRequest.update({
    where: { id: reqId },
    data: {
      status: 'REJECTED',
      rejectedByUnitId: request.currentUnitId,
      rejectedByUserId: resolvedUserId,
      rejectionReason: String(reason).trim(),
      rejectedAt: new Date(),
      lockedById: null,
      lockedAt: null,
      forwardingHistory: history,
    },
    include: {
      destinationUnit: { select: { id: true, name: true } },
      currentUnit: { select: { id: true, name: true } },
      rejectedByUnit: { select: { id: true, name: true } },
      rejectedByUser: { select: { id: true, name: true, email: true } },
    },
  });

  // Phát thông báo từ chối minh bạch cho người tạo và đơn vị đích
  try {
    const recipientIds = new Set();
    recipientIds.add(request.requesterId);
    if (request.destinationUnit.ownerId) recipientIds.add(request.destinationUnit.ownerId);

    const formattedAmount = Number(request.amount).toLocaleString('vi-VN');
    const rejectorName = user.name || user.email;

    const notifs = Array.from(recipientIds).map((uid) => ({
      tenantId: resolvedTenantId,
      userId: uid,
      title: 'Yêu cầu xin cấp ngân sách bị từ chối',
      message: `Yêu cầu xin cấp ${formattedAmount} đ của đơn vị "${request.destinationUnit.name}" đã bị từ chối bởi ${rejectorName} tại phòng ban "${request.currentUnit.name}". Lý do: ${reason}`,
      type: 'ALLOCATION_REJECTED',
      data: {
        requestId: updated.id,
        rejectedByUnitId: request.currentUnit.id,
        rejectedByUnitName: request.currentUnit.name,
        rejectedByUserId: resolvedUserId,
        rejectedByName: rejectorName,
        rejectionReason: reason,
      },
    }));

    if (notifs.length > 0) {
      await notificationService.createManyNotifications(notifs);
    }
  } catch (notifErr) {
    console.error('[Notification Warning] Không thể tạo thông báo từ chối:', notifErr.message);
  }

  return {
    ...updated,
    amount: updated.amount.toString(),
  };
};

/**
 * 7. Hủy yêu cầu bởi chính người tạo (Cancel Request)
 */
const cancelRequest = async ({ requestId, user, tenantId }) => {
  const reqId = Number(requestId);
  const resolvedTenantId = Number(tenantId);
  const resolvedUserId = Number(user.id);

  const request = await prisma.allocationRequest.findFirst({
    where: { id: reqId, tenantId: resolvedTenantId },
  });

  if (!request) {
    const error = new Error('Không tìm thấy yêu cầu xin cấp ngân sách');
    error.statusCode = 404;
    throw error;
  }

  if (request.status !== 'PENDING') {
    const error = new Error(`Không thể hủy yêu cầu đang ở trạng thái ${request.status}.`);
    error.statusCode = 400;
    throw error;
  }

  const isCreator = request.requesterId === resolvedUserId;
  const isRoot = user.role === 'ROOT';
  if (!isCreator && !isRoot) {
    const error = new Error('Chỉ người tạo yêu cầu hoặc ROOT mới có quyền hủy yêu cầu này.');
    error.statusCode = 403;
    throw error;
  }

  const history = Array.isArray(request.forwardingHistory) ? [...request.forwardingHistory] : [];
  const actorName = await getUserDisplayName(user);
  history.push({
    unitId: request.destinationUnitId,
    unitName: 'Đơn vị yêu cầu',
    action: 'CANCEL',
    userId: resolvedUserId,
    userName: actorName,
    note: 'Người tạo chủ động hủy yêu cầu',
    timestamp: new Date().toISOString(),
  });

  const updated = await prisma.allocationRequest.update({
    where: { id: reqId },
    data: {
      status: 'CANCELLED',
      forwardingHistory: history,
      lockedById: null,
      lockedAt: null,
    },
  });

  return {
    ...updated,
    amount: updated.amount.toString(),
  };
};

/**
 * 8. Lấy chi tiết 1 yêu cầu kèm toàn bộ Audit Trail
 */
const getRequestById = async ({ requestId, user, tenantId }) => {
  const reqId = Number(requestId);
  const resolvedTenantId = Number(tenantId);

  const request = await prisma.allocationRequest.findFirst({
    where: { id: reqId, tenantId: resolvedTenantId },
    include: {
      destinationUnit: { select: { id: true, name: true, ownerId: true } },
      currentUnit: { select: { id: true, name: true, ownerId: true } },
      requester: { select: { id: true, name: true, email: true, employeeCode: true } },
      lockedBy: { select: { id: true, name: true, email: true } },
      fundedByUnit: { select: { id: true, name: true } },
      fundedByUser: { select: { id: true, name: true, email: true } },
      rejectedByUnit: { select: { id: true, name: true } },
      rejectedByUser: { select: { id: true, name: true, email: true } },
      allocation: true,
    },
  });

  if (!request) {
    const error = new Error('Không tìm thấy yêu cầu xin cấp ngân sách');
    error.statusCode = 404;
    throw error;
  }

  // Tính thời gian khóa còn lại nếu đang ALLOCATING
  let remainingLockSeconds = 0;
  if (request.status === 'ALLOCATING' && request.lockedAt) {
    const elapsed = Date.now() - new Date(request.lockedAt).getTime();
    if (elapsed < LOCK_TTL_MS) {
      remainingLockSeconds = Math.max(1, Math.ceil((LOCK_TTL_MS - elapsed) / 1000));
    }
  }

  return {
    ...request,
    amount: request.amount.toString(),
    remainingLockSeconds,
    allocation: request.allocation
      ? {
          ...request.allocation,
          amount: request.allocation.amount.toString(),
        }
      : null,
  };
};

/**
 * 9. Lấy danh sách yêu cầu xin cấp ngân sách (theo tầm nhìn)
 */
const getRequests = async ({ user, tenantId, status, unitId, page = 1, limit = 50 }) => {
  const resolvedTenantId = Number(tenantId);
  const resolvedUserId = Number(user.id);
  const resolvedPage = Math.max(1, Number(page) || 1);
  const resolvedLimit = Math.max(1, Math.min(100, Number(limit) || 50));
  const skip = (resolvedPage - 1) * resolvedLimit;

  const where = { tenantId: resolvedTenantId };

  if (status) {
    where.status = status;
  }

  // Phân quyền tầm nhìn:
  const isTop = await unitTreeHelper.isTopRootOwner(resolvedUserId, resolvedTenantId);
  if (!isTop && user.role !== 'ROOT') {
    // Lấy các unit mà user có thẩm quyền hoặc tham gia
    const accessibleUnits = await unitTreeHelper.getAccessibleUnitIdsForUser(user, resolvedTenantId);
    const accessibleArr = Array.from(accessibleUnits);

    where.OR = [
      { requesterId: resolvedUserId },
      { destinationUnitId: { in: accessibleArr } },
      { currentUnitId: { in: accessibleArr } },
      { fundedByUnitId: { in: accessibleArr } },
      { rejectedByUnitId: { in: accessibleArr } },
    ];
  }

  if (unitId) {
    const filterUnitId = Number(unitId);
    where.AND = [
      {
        OR: [
          { destinationUnitId: filterUnitId },
          { currentUnitId: filterUnitId },
        ],
      },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.allocationRequest.count({ where }),
    prisma.allocationRequest.findMany({
      where,
      skip,
      take: resolvedLimit,
      orderBy: { createdAt: 'desc' },
      include: {
        destinationUnit: { select: { id: true, name: true } },
        currentUnit: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, email: true } },
        lockedBy: { select: { id: true, name: true, email: true } },
        fundedByUnit: { select: { id: true, name: true } },
        rejectedByUnit: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    total,
    page: resolvedPage,
    limit: resolvedLimit,
    totalPages: Math.ceil(total / resolvedLimit),
    items: items.map((item) => ({
      ...item,
      amount: item.amount.toString(),
    })),
  };
};

module.exports = {
  LOCK_TTL_MS,
  canActOnUnit,
  createRequest,
  lockRequest,
  unlockRequest,
  forwardRequest,
  approveAndFundRequest,
  rejectRequest,
  cancelRequest,
  getRequestById,
  getRequests,
};
