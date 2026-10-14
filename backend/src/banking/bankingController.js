const bankingService = require('./bankingService');

/**
 * POST /api/banking
 * Thêm mới tài khoản ngân hàng
 */
const createAccount = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const account = await bankingService.createBankingAccount(userId, req.body);

    return res.status(201).json({
      success: true,
      message: 'Thêm tài khoản ngân hàng thành công',
      data: account,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/banking
 * Lấy danh sách tài khoản ngân hàng của user
 */
const getAccounts = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const accounts = await bankingService.getBankingAccountsByUser(userId);

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách tài khoản ngân hàng thành công',
      data: accounts,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/banking/:id
 * Lấy chi tiết tài khoản ngân hàng
 */
const getAccountById = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const account = await bankingService.getBankingAccountById(userId, req.params.id);

    return res.status(200).json({
      success: true,
      data: account,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * PUT /api/banking/:id
 * Cập nhật tài khoản ngân hàng
 */
const updateAccount = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const updated = await bankingService.updateBankingAccount(userId, req.params.id, req.body);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật tài khoản ngân hàng thành công',
      data: updated,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * DELETE /api/banking/:id
 * Xóa tài khoản ngân hàng
 */
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    await bankingService.deleteBankingAccount(userId, req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Xóa tài khoản ngân hàng thành công',
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createAccount,
  getAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
};
