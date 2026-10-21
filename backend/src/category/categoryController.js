const categoryService = require('./categoryService');

/**
 * Helper kiểm tra an toàn Multi-tenant cho danh mục:
 * Bắt buộc người dùng phải thuộc về một tenant xác định.
 * Ngăn chặn tuyệt đối hành vi truyền tenantId của doanh nghiệp khác.
 */
const validateTenantCategoryAccess = (req, res) => {
  const userTenantId = req.user?.tenantId;
  if (!userTenantId) {
    res.status(403).json({
      success: false,
      message: 'Forbidden: Tài khoản chưa được liên kết với bất kỳ doanh nghiệp nào',
    });
    return false;
  }

  // Chặn mọi hành vi truyền tenantId của doanh nghiệp khác qua params, query, body hoặc header
  const targetTenantId = req.params?.tenantId || req.query?.tenantId || req.body?.tenantId || req.headers?.['x-tenant-id'];
  if (targetTenantId !== undefined && targetTenantId !== null && targetTenantId !== '') {
    const parsed = Number(targetTenantId);
    if (!isNaN(parsed) && parsed !== Number(userTenantId)) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Bạn không có quyền truy cập hoặc thao tác trên danh mục của doanh nghiệp khác',
      });
      return false;
    }
  }

  return true;
};

/**
 * GET /api/categories
 * Lấy danh sách danh mục được cá nhân hóa của tenant
 */
const getCategories = async (req, res) => {
  try {
    if (!validateTenantCategoryAccess(req, res)) return;

    const tenantId = req.user.tenantId;
    const categories = await categoryService.getCategories(tenantId);

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách danh mục thành công',
      data: categories,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * POST /api/categories
 * Tạo danh mục mới cho tenant (Cá nhân hóa theo tenant)
 */
const createCategory = async (req, res) => {
  try {
    if (!validateTenantCategoryAccess(req, res)) return;

    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const { name, type, icon } = req.body;

    const category = await categoryService.createCategory({
      tenantId,
      userId,
      name,
      type,
      icon,
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo danh mục mới thành công',
      data: category,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * PUT /api/categories/:id
 * Sửa danh mục (Chống cross-tenant sửa danh mục của công ty khác)
 */
const updateCategory = async (req, res) => {
  try {
    if (!validateTenantCategoryAccess(req, res)) return;

    const tenantId = req.user.tenantId;
    const categoryId = req.params.id;
    const { name, icon } = req.body;

    const updated = await categoryService.updateCategory(categoryId, tenantId, { name, icon });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật danh mục thành công',
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
 * DELETE /api/categories/:id
 * Xóa danh mục (Chống cross-tenant xóa danh mục của công ty khác)
 */
const deleteCategory = async (req, res) => {
  try {
    if (!validateTenantCategoryAccess(req, res)) return;

    const tenantId = req.user.tenantId;
    const categoryId = req.params.id;

    await categoryService.deleteCategory(categoryId, tenantId);

    return res.status(200).json({
      success: true,
      message: 'Xóa danh mục thành công',
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
