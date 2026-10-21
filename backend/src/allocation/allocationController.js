const allocationService = require('./allocationService');

/**
 * POST /api/allocations - Cấp tiền
 */
const createAllocation = async (req, res) => {
  try {
    const { sourceUnitId, targetUnitId, amount, note } = req.body;
    const tenantId = req.user.tenantId;
    const createdById = req.user.id;
    const userRole = req.user.role;

    const allocation = await allocationService.createAllocation({
      tenantId,
      sourceUnitId,
      targetUnitId,
      amount,
      createdById,
      userRole,
      note,
    });

    return res.status(201).json({
      success: true,
      message: 'Cấp tiền thành công',
      data: allocation,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi cấp tiền',
    });
  }
};

/**
 * GET /api/allocations - Lấy lịch sử cấp tiền
 */
const getAllocations = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { unitId, sourceUnitId, targetUnitId, page, limit } = req.query;

    const result = await allocationService.getAllocations({
      tenantId,
      unitId,
      sourceUnitId,
      targetUnitId,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi lấy lịch sử cấp tiền',
    });
  }
};

/**
 * POST /api/allocations/recall - Thu hồi ngân sách từ con về cha
 */
const recallAllocation = async (req, res) => {
  try {
    const { sourceUnitId, targetUnitId, amount, reason } = req.body;
    const tenantId = req.user.tenantId;

    const allocation = await allocationService.recallAllocation({
      tenantId,
      sourceUnitId,
      targetUnitId,
      amount,
      reason,
      requesterUser: req.user,
    });

    return res.status(200).json({
      success: true,
      message: 'Thu hồi ngân sách thành công',
      data: allocation,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi thu hồi ngân sách',
    });
  }
};

module.exports = {
  createAllocation,
  getAllocations,
  recallAllocation,
};
