const unitService = require('./unitService');
const prisma = require('../config/prisma');

/**
 * Helper validate integer ID
 */
const validateId = (id) => {
  const num = Number(id);
  return !isNaN(num) && Number.isInteger(num) && num > 0 ? num : null;
};

/**
 * POST /api/units - Tạo unit mới (chỉ ROOT, rate-limited 2 phút/lần)
 */
const createUnit = async (req, res) => {
  try {
    const { name, parentId, ownerId, allowMemberViewBalance, allowCreateSubUnit } = req.body;
    const tenantId = req.user.tenantId;

    const unit = await unitService.createUnit({
      tenantId,
      name,
      parentId,
      ownerId,
      allowMemberViewBalance,
      allowCreateSubUnit,
      creatorUser: req.user,
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo đơn vị thành công',
      data: unit,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi tạo đơn vị',
    });
  }
};

/**
 * GET /api/units - Lấy cây tổ chức và danh sách đơn vị của tenant
 * - ROOT: Xem toàn bộ cây công ty kèm số dư
 * - Admin nhóm: Xem cây con và số dư các nhóm mình quản lý
 * - Member thường: Số dư bị ẩn trừ khi Admin cho phép
 */
const getUnitTree = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const result = await unitService.getUnitTree(tenantId, req.user);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi lấy danh sách đơn vị',
    });
  }
};

/**
 * GET /api/units/:id - Xem chi tiết 1 đơn vị
 * - Cho phép ROOT, Admin nhóm, Quản lý cấp trên hoặc thành viên của unit
 */
const getUnitById = async (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID đơn vị không hợp lệ',
      });
    }

    const tenantId = req.user.tenantId;
    const unit = await unitService.getUnitById(id, tenantId, req.user);

    return res.status(200).json({
      success: true,
      data: unit,
    });
  } catch (error) {
    return res.status(error.statusCode || 404).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi xem chi tiết đơn vị',
    });
  }
};

/**
 * GET /api/units/:id/balance - Xem số dư tức thời của đơn vị
 * - Chống IDOR: Bắt buộc thuộc tenantId
 * - Phân quyền: Chỉ ROOT, Admin nhóm (Unit Owner), hoặc Member khi nhóm bật allowMemberViewBalance
 */
const getUnitBalance = async (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID đơn vị không hợp lệ',
      });
    }

    const tenantId = Number(req.user.tenantId);

    const unit = await prisma.unit.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: {
        members: {
          where: { id: req.user.id, deletedAt: null },
          select: { id: true },
        },
      },
    });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Đơn vị không tồn tại hoặc không thuộc tổ chức của bạn',
      });
    }

    const isRoot = req.user.role === 'ROOT';
    const isOwner = unit.ownerId === req.user.id;
    const isMember = unit.members.length > 0;

    // Phân quyền xem số dư tức thời
    if (!isRoot && !isOwner && !(isMember && unit.allowMemberViewBalance)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Bạn không có quyền xem số dư tức thời của đơn vị này. Vui lòng liên hệ Admin đơn vị để được cấp quyền.',
      });
    }

    const balance = await unitService.calculateSafeBalance(id, tenantId);

    return res.status(200).json({
      success: true,
      data: {
        unitId: id,
        safeBalance: balance.toString(),
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi khi tính số dư đơn vị',
    });
  }
};

/**
 * PUT /api/units/:id - Cập nhật thông tin unit
 * - Admin của nhóm: Được sửa tên (name) và bật/tắt allowMemberViewBalance
 * - Chỉ ROOT: Mới được quyền đổi ownerId (bổ nhiệm/miễn nhiệm)
 */
const updateUnit = async (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID đơn vị không hợp lệ',
      });
    }

    const tenantId = req.user.tenantId;
    const { name, ownerId, allowMemberViewBalance, allowCreateSubUnit } = req.body;

    const updated = await unitService.updateUnit(
      id,
      tenantId,
      { name, ownerId, allowMemberViewBalance, allowCreateSubUnit },
      req.user
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật đơn vị thành công',
      data: updated,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi cập nhật đơn vị',
    });
  }
};

/**
 * DELETE /api/units/:id - Xóa đơn vị (Soft Delete - chỉ ROOT và nút lá chưa phát sinh dòng tiền)
 */
const deleteUnit = async (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID đơn vị không hợp lệ',
      });
    }

    const tenantId = req.user.tenantId;
    const result = await unitService.deleteUnit(id, tenantId, req.user);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi xóa đơn vị',
    });
  }
};

/**
 * POST /api/units/:id/members - Thêm nhân viên vào unit (Admin Invitation / Direct Add)
 * - Cho phép thêm nhân viên tự do hoặc chuyển từ nhóm khác (có ghi audit log)
 */
const addMember = async (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID đơn vị không hợp lệ',
      });
    }

    const { userId, role } = req.body;
    const validUserId = validateId(userId);
    if (!validUserId) {
      return res.status(400).json({
        success: false,
        message: 'userId là bắt buộc và phải là số nguyên dương hợp lệ',
      });
    }

    const tenantId = req.user.tenantId;
    const member = await unitService.addMember(id, validUserId, tenantId, req.user, role);

    return res.status(200).json({
      success: true,
      message: 'Gán thành viên vào đơn vị thành công',
      data: member,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi gán thành viên',
    });
  }
};

/**
 * DELETE /api/units/:id/members/:userId - Gỡ nhân viên khỏi unit
 * - ROOT hoặc Admin của nhóm có quyền gỡ (chặn gỡ Owner)
 */
const removeMember = async (req, res) => {
  try {
    const id = validateId(req.params.id);
    const userId = validateId(req.params.userId);

    if (!id || !userId) {
      return res.status(400).json({
        success: false,
        message: 'ID đơn vị hoặc ID nhân viên không hợp lệ',
      });
    }

    const tenantId = req.user.tenantId;
    const member = await unitService.removeMember(id, userId, tenantId, req.user);

    return res.status(200).json({
      success: true,
      message: 'Gỡ thành viên khỏi đơn vị thành công',
      data: member,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi gỡ thành viên',
    });
  }
};

/**
 * GET /api/units/:id/members - Lấy danh sách thành viên của đơn vị
 */
const getUnitMembers = async (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID đơn vị không hợp lệ',
      });
    }

    const tenantId = req.user.tenantId;
    const result = await unitService.getUnitMembers(id, tenantId, req.user);

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách thành viên đơn vị thành công',
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi lấy danh sách thành viên',
    });
  }
};

/**
 * POST /api/units/:id/reorganize/preview - Xem trước phân tích tác động tái cấu trúc đơn vị
 */
const previewReorganize = async (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID đơn vị không hợp lệ',
      });
    }

    const { newParentId } = req.body;
    const resolvedNewParentId = newParentId ? validateId(newParentId) : null;
    if (newParentId && !resolvedNewParentId) {
      return res.status(400).json({
        success: false,
        message: 'newParentId không hợp lệ',
      });
    }

    const tenantId = req.user.tenantId;
    const previewData = await unitService.previewReorganizeUnit(id, resolvedNewParentId, req.user, tenantId);

    return res.status(200).json({
      success: true,
      message: 'Xem trước phân tích tái cấu trúc thành công',
      data: previewData,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi phân tích tái cấu trúc đơn vị',
    });
  }
};

/**
 * POST /api/units/:id/reorganize/confirm - Xác nhận thực thi tái cấu trúc đơn vị
 */
const confirmReorganize = async (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID đơn vị không hợp lệ',
      });
    }

    const { newParentId, strategy } = req.body;
    const resolvedNewParentId = newParentId ? validateId(newParentId) : null;
    if (newParentId && !resolvedNewParentId) {
      return res.status(400).json({
        success: false,
        message: 'newParentId không hợp lệ',
      });
    }

    if (!strategy) {
      return res.status(400).json({
        success: false,
        message: "strategy là bắt buộc ('SHARED_CHILDREN' hoặc 'FULL_ISOLATION')",
      });
    }

    const tenantId = req.user.tenantId;
    const result = await unitService.confirmReorganizeUnit(id, resolvedNewParentId, strategy, req.user, tenantId);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi thực thi tái cấu trúc đơn vị',
    });
  }
};

module.exports = {
  createUnit,
  getUnitTree,
  getUnitById,
  getUnitBalance,
  updateUnit,
  deleteUnit,
  addMember,
  removeMember,
  getUnitMembers,
  previewReorganize,
  confirmReorganize,
};
