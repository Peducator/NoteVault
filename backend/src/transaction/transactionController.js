const transactionService = require('./transactionService');

/**
 * POST /api/transactions
 * Tạo đề nghị chi tiêu mới (chỉ phát sinh ở nhóm lá)
 */
const createTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;
    const { unitId, categoryId, amount, note, transactionDate, s3Key, scanStatus } = req.body;

    const transaction = await transactionService.createTransaction({
      userId,
      tenantId,
      unitId,
      categoryId,
      amount,
      note,
      transactionDate,
      s3Key,
      scanStatus,
    });

    return res.status(201).json({
      success: true,
      message: 'Đề nghị chi tiêu đã được tạo thành công, đang chờ quản lý duyệt',
      data: transaction,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi tạo chi tiêu',
    });
  }
};

/**
 * GET /api/transactions
 * Lấy danh sách giao dịch chi tiêu theo thẩm quyền
 */
const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const tenantId = req.user.tenantId;
    const { unitId, status, page, limit } = req.query;

    const result = await transactionService.getTransactions({
      userId,
      userRole,
      tenantId,
      unitId,
      status,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách chi tiêu thành công',
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi lấy danh sách chi tiêu',
    });
  }
};

/**
 * GET /api/transactions/:id
 * Chi tiết 1 giao dịch chi tiêu
 */
const getTransactionById = async (req, res) => {
  try {
    const transaction = await transactionService.getTransactionById(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    return res.status(error.statusCode || 404).json({
      success: false,
      message: error.message || 'Không tìm thấy giao dịch',
    });
  }
};

/**
 * POST /api/transactions/:id/approve
 * Quản lý trực tiếp duyệt chi tiêu
 */
const approveTransaction = async (req, res) => {
  try {
    const transactionId = req.params.id;
    const approverUser = req.user;

    const result = await transactionService.approveTransaction(transactionId, approverUser);

    return res.status(200).json({
      success: true,
      message: 'Duyệt chi tiêu thành công',
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi duyệt chi tiêu',
    });
  }
};

/**
 * POST /api/transactions/:id/reject
 * Quản lý trực tiếp từ chối chi tiêu (kèm lý do)
 */
const rejectTransaction = async (req, res) => {
  try {
    const transactionId = req.params.id;
    const approverUser = req.user;
    const rejectionReason = req.body.rejectionReason || req.body.reason;

    const result = await transactionService.rejectTransaction(transactionId, approverUser, rejectionReason);

    return res.status(200).json({
      success: true,
      message: 'Đã từ chối chi tiêu thành công',
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi từ chối chi tiêu',
    });
  }
};

/**
 * POST /api/transactions/:id/pay
 * Hoàn ứng chi tiêu (PAID) - kế toán / Cha xác nhận đã hoàn ứng
 */
const payTransaction = async (req, res) => {
  try {
    const transactionId = req.params.id;
    const user = req.user;

    const result = await transactionService.payTransaction(transactionId, user);

    return res.status(200).json({
      success: true,
      message: 'Xác nhận hoàn ứng chi tiêu thành công',
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi hoàn ứng chi tiêu',
    });
  }
};

/**
 * DELETE /api/transactions/:id
 * Bị vô hiệu hóa theo quy tắc kiểm toán bất biến
 */
const deleteTransaction = async (req, res) => {
  return res.status(405).json({
    success: false,
    message: 'Không được phép xóa giao dịch chi tiêu để đảm bảo tính toàn vẹn và lịch sử kiểm toán tài chính.',
  });
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  approveTransaction,
  rejectTransaction,
  payTransaction,
  deleteTransaction,
};
