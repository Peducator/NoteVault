const prisma = require('../config/prisma');

// Các danh mục mẫu mặc định (dùng chung cho mọi user nếu hệ thống mới tinh)
const DEFAULT_CATEGORIES = [
  { name: 'Ăn uống', type: 'EXPENSE', icon: 'food' },
  { name: 'Đi lại', type: 'EXPENSE', icon: 'transport' },
  { name: 'Mua sắm', type: 'EXPENSE', icon: 'shopping' },
  { name: 'Hóa đơn & Tiện ích', type: 'EXPENSE', icon: 'bill' },
  { name: 'Lương', type: 'INCOME', icon: 'salary' },
  { name: 'Thưởng & Thu nhập khác', type: 'INCOME', icon: 'bonus' },
];

/**
 * Lấy danh sách danh mục (gồm danh mục hệ thống userId=null + danh mục do chính user tạo)
 */
const getCategories = async (userId) => {
  return await prisma.category.findMany({
    where: {
      OR: [
        { userId: null },
        { userId: Number(userId) },
      ],
    },
    orderBy: {
      id: 'asc',
    },
  });
};

/**
 * Tạo danh mục mới của người dùng
 */
const createCategory = async ({ userId, name, type = 'EXPENSE', icon = 'default' }) => {
  if (!name || name.trim() === '') {
    const error = new Error('Tên danh mục không được để trống');
    error.statusCode = 400;
    throw error;
  }

  const validTypes = ['EXPENSE', 'INCOME'];
  if (!validTypes.includes(type)) {
    const error = new Error('Loại danh mục phải là EXPENSE hoặc INCOME');
    error.statusCode = 400;
    throw error;
  }

  return await prisma.category.create({
    data: {
      userId: Number(userId),
      name: name.trim(),
      type,
      icon,
    },
  });
};

/**
 * Xóa danh mục của người dùng (chỉ được xóa danh mục của chính mình, không được xóa danh mục hệ thống)
 */
const deleteCategory = async (userId, categoryId) => {
  const category = await prisma.category.findUnique({
    where: { id: Number(categoryId) },
  });

  if (!category) {
    const error = new Error('Không tìm thấy danh mục');
    error.statusCode = 404;
    throw error;
  }

  if (category.userId !== Number(userId)) {
    const error = new Error('Không có quyền xóa danh mục hệ thống hoặc của người dùng khác');
    error.statusCode = 403;
    throw error;
  }

  return await prisma.category.delete({
    where: { id: Number(categoryId) },
  });
};

/**
 * Khởi tạo danh mục mặc định nếu chưa có
 */
const seedDefaultCategories = async () => {
  const count = await prisma.category.count({
    where: { userId: null },
  });

  if (count === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      await prisma.category.create({
        data: {
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          userId: null,
        },
      });
    }
  }
};

module.exports = {
  getCategories,
  createCategory,
  deleteCategory,
  seedDefaultCategories,
};
