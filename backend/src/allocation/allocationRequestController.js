const allocationRequestService = require('./allocationRequestService');

/**
 * POST /api/allocations/requests - Tạo yêu cầu xin cấp thêm ngân sách
 */
const createRequest = async (req, res) => {
  try {
    const { destinationUnitId, amount, reason } = req.body;
    const tenantId = req.user.tenantId;

    const request = await allocationRequestService.createRequest({
      destinationUnitId,
      amount,
      reason,
      requesterUser: req.user,
      tenantId,
    });

    return res.status(201).json({
      success: true,
      message: 'Gửi yêu cầu xin cấp ngân sách thành công',
      data: request,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi tạo yêu cầu xin cấp ngân sách',
    });
  }
};

/**
 * GET /api/allocations/requests - Lấy danh sách yêu cầu
 */
const getRequests = async (req, res) => {
  try {
    const { status, unitId, page, limit } = req.query;
    const tenantId = req.user.tenantId;

    const result = await allocationRequestService.getRequests({
      user: req.user,
      tenantId,
      status,
      unitId,
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
      message: error.message || 'Lỗi hệ thống khi lấy danh sách yêu cầu',
    });
  }
};

/**
 * GET /api/allocations/requests/:id - Lấy chi tiết yêu cầu kèm Audit Trail
 */
const getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const request = await allocationRequestService.getRequestById({
      requestId: id,
      user: req.user,
      tenantId,
    });

    return res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi lấy thông tin yêu cầu',
    });
  }
};

/**
 * POST /api/allocations/requests/:id/lock - Khóa tiến trình thanh toán (5 phút TTL)
 */
const lockRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const result = await allocationRequestService.lockRequest({
      requestId: id,
      user: req.user,
      tenantId,
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi khóa yêu cầu',
      data: error.data || null,
    });
  }
};

/**
 * POST /api/allocations/requests/:id/unlock - Hủy khóa
 */
const unlockRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const result = await allocationRequestService.unlockRequest({
      requestId: id,
      user: req.user,
      tenantId,
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi mở khóa yêu cầu',
    });
  }
};

/**
 * POST /api/allocations/requests/:id/forward - Duyệt & Chuyển tiếp lên cấp trên
 */
const forwardRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const tenantId = req.user.tenantId;

    const updated = await allocationRequestService.forwardRequest({
      requestId: id,
      user: req.user,
      note,
      tenantId,
    });

    return res.status(200).json({
      success: true,
      message: 'Đã phê duyệt và chuyển tiếp yêu cầu lên cấp trên thành công',
      data: updated,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi chuyển tiếp yêu cầu',
    });
  }
};

/**
 * POST /api/allocations/requests/:id/approve - Xác nhận CONFIRM & Rót tiền trực tiếp
 */
const approveAndFundRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmation, note } = req.body;
    const tenantId = req.user.tenantId;

    const result = await allocationRequestService.approveAndFundRequest({
      requestId: id,
      user: req.user,
      confirmation,
      note,
      tenantId,
    });

    return res.status(200).json({
      success: true,
      message: 'Đã phê duyệt và giải ngân ngân sách thành công',
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi giải ngân',
    });
  }
};

/**
 * POST /api/allocations/requests/:id/reject - Từ chối yêu cầu kèm lý do
 */
const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const tenantId = req.user.tenantId;

    const updated = await allocationRequestService.rejectRequest({
      requestId: id,
      user: req.user,
      reason,
      tenantId,
    });

    return res.status(200).json({
      success: true,
      message: 'Đã từ chối yêu cầu xin cấp ngân sách',
      data: updated,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi từ chối yêu cầu',
    });
  }
};

/**
 * POST /api/allocations/requests/:id/cancel - Người tạo hủy yêu cầu
 */
const cancelRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const updated = await allocationRequestService.cancelRequest({
      requestId: id,
      user: req.user,
      tenantId,
    });

    return res.status(200).json({
      success: true,
      message: 'Đã hủy yêu cầu thành công',
      data: updated,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi hủy yêu cầu',
    });
  }
};

module.exports = {
  createRequest,
  getRequests,
  getRequestById,
  lockRequest,
  unlockRequest,
  forwardRequest,
  approveAndFundRequest,
  rejectRequest,
  cancelRequest,
};
