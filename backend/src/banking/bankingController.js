const bankingService = require('./bankingService');

/**
 * Kiểm tra bảo mật quyền riêng tư tài chính cá nhân:
 * Bắt buộc request chỉ được thao tác trên chính tài khoản của mình.
 * Kể cả ROOT hay ADMIN cũng tuyệt đối không có quyền đọc hay thao tác trên tài khoản người khác.
 */
const validatePersonalBankingAccess = (req, res) => {
  const currentUserId = req.user?.id;
  if (!currentUserId) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized: Yêu cầu đăng nhập',
    });
    return false;
  }

  // Chặn mọi hành vi truyền userId của người khác qua query, body hoặc params
  const targetUserId = req.params?.userId || req.query?.userId || req.body?.userId;
  if (targetUserId !== undefined && targetUserId !== null && targetUserId !== '') {
    const parsed = Number(targetUserId);
    if (!isNaN(parsed) && parsed !== Number(currentUserId)) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Thông tin tài khoản ngân hàng là quyền riêng tư cá nhân tuyệt đối. Kể cả ROOT hay Admin cũng không có quyền xem hoặc thao tác thông tin của người dùng khác.',
      });
      return false;
    }
  }

  return true;
};

/**
 * POST /api/banking
 * Thêm mới tài khoản ngân hàng (Chỉ thêm cho chính mình)
 */
const createAccount = async (req, res) => {
  try {
    if (!validatePersonalBankingAccess(req, res)) return;

    const userId = req.user.id;
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
 * Lấy danh sách tài khoản ngân hàng (Chỉ xem của chính mình, chặn query userId người khác)
 */
const getAccounts = async (req, res) => {
  try {
    if (!validatePersonalBankingAccess(req, res)) return;

    const userId = req.user.id;
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
 * Lấy chi tiết tài khoản ngân hàng (Chỉ chính chủ, ROOT/Admin khác không được đọc)
 */
const getAccountById = async (req, res) => {
  try {
    if (!validatePersonalBankingAccess(req, res)) return;

    const userId = req.user.id;
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
 * Cập nhật tài khoản ngân hàng (Chỉ chính chủ)
 */
const updateAccount = async (req, res) => {
  try {
    if (!validatePersonalBankingAccess(req, res)) return;

    const userId = req.user.id;
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
 * Xóa tài khoản ngân hàng (Chỉ chính chủ)
 */
const deleteAccount = async (req, res) => {
  try {
    if (!validatePersonalBankingAccess(req, res)) return;

    const userId = req.user.id;
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
