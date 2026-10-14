const transactionService = require('./transactionService');

/**
 * POST /api/transactions
 * Tạo giao dịch chi tiêu hoặc thu nhập (có thể đính kèm s3Key ảnh hóa đơn)
 */
const createTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { categoryId, amount, type, note, transactionDate, s3Key, scanStatus } = req.body;

    const transaction = await transactionService.createTransaction({
      userId,
      tenantId: req.user.tenantId,
      categoryId,
      amount,
      type,
      note,
      transactionDate,
      s3Key,
      scanStatus,
    });

    return res.status(201).json({
      success: true,
      message: 'Giao dịch đã được lưu thành công',
      data: transaction,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/transactions
 * Lấy danh sách giao dịch có phân trang
 */
const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const tenantId = req.user.tenantId;
    const { month, year, page, limit } = req.query;

    const result = await transactionService.getTransactions({
      userId,
      userRole,
      tenantId,
      month,
      year,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách giao dịch thành công',
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/transactions/:id
 * Chi tiết 1 giao dịch
 */
const getTransactionById = async (req, res) => {
  try {
    const userId = req.user.id;
    const transaction = await transactionService.getTransactionById(userId, req.params.id);

    return res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * DELETE /api/transactions/:id
 * Xóa 1 giao dịch
 */
const deleteTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    await transactionService.deleteTransaction(userId, req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Xóa giao dịch thành công',
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/transactions/statement/monthly
 * Lấy sao kê tổng hợp chi tiêu theo tháng
 */
const getMonthlyStatement = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;

    const statement = await transactionService.getMonthlyStatement({
      userId,
      month,
      year,
    });

    return res.status(200).json({
      success: true,
      message: 'Tạo sao kê chi tiêu tháng thành công',
      data: statement,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  deleteTransaction,
  getMonthlyStatement,
};
