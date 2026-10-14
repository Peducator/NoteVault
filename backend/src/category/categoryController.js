const categoryService = require('./categoryService');

/**
 * GET /api/categories
 * Lấy danh sách danh mục có sẵn cho user
 */
const getCategories = async (req, res) => {
  try {
    const userId = req.user.id;
    const categories = await categoryService.getCategories(userId);

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
 * Tạo danh mục tùy chỉnh của user
 */
const createCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, type, icon } = req.body;

    const category = await categoryService.createCategory({
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
 * DELETE /api/categories/:id
 * Xóa danh mục do user tạo
 */
const deleteCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const categoryId = req.params.id;

    await categoryService.deleteCategory(userId, categoryId);

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
  deleteCategory,
};
