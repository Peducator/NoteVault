const notificationService = require('./notificationService');

/**
 * GET /api/notifications
 * Lấy danh sách thông báo:
 * - Mặc định: Xem thông báo của chính mình
 * - ?userId=X: Chỉ được xem nếu là Quản lý trực tiếp hoặc cấp trên của X (người nào quản lý ai thì mới được thấy thông báo)
 * - ?managed=true: Quản lý xem toàn bộ thông báo của các nhân sự trong cây nhánh mình quản lý
 */
const getNotifications = async (req, res) => {
  try {
    const { userId, managed, isRead, page, limit } = req.query;

    const result = await notificationService.getNotifications({
      requesterUser: req.user,
      targetUserId: userId,
      includeManaged: managed,
      isRead,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách thông báo thành công',
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi lấy thông báo',
    });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Đánh dấu 1 thông báo đã đọc (chính chủ hoặc người quản lý)
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await notificationService.markAsRead({
      id,
      requesterUser: req.user,
    });

    return res.status(200).json({
      success: true,
      message: 'Đã đánh dấu thông báo là đã đọc',
      data: updated,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật trạng thái thông báo',
    });
  }
};

/**
 * PATCH /api/notifications/read-all
 * Đánh dấu toàn bộ thông báo của người dùng là đã đọc
 */
const markAllAsRead = async (req, res) => {
  try {
    const result = await notificationService.markAllAsRead({
      requesterUser: req.user,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: { updatedCount: result.updatedCount },
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi khi đánh dấu đã đọc tất cả',
    });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
