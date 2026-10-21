const prisma = require('../config/prisma');

/**
 * Lấy danh sách danh mục thuộc tenant (cá nhân hóa theo tenant)
 */
const getCategories = async (tenantId) => {
  const resolvedTenantId = tenantId ? Number(tenantId) : null;

  return await prisma.category.findMany({
    where: {
      OR: [
        { tenantId: resolvedTenantId },
        { tenantId: null }, // Danh mục mẫu hệ thống dùng chung
      ],
    },
    orderBy: {
      id: 'asc',
    },
  });
};

/**
 * Tạo danh mục mới cho tenant
 */
const createCategory = async ({ tenantId, userId, name, type = 'EXPENSE', icon = 'default' }) => {
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

  const resolvedTenantId = tenantId ? Number(tenantId) : null;
  if (!resolvedTenantId) {
    const error = new Error('Yêu cầu định danh tenantId để cá nhân hóa danh mục');
    error.statusCode = 400;
    throw error;
  }

  // Chống trùng lặp tên danh mục trong cùng một tenant
  const existing = await prisma.category.findFirst({
    where: {
      tenantId: resolvedTenantId,
      name: { equals: name.trim(), mode: 'insensitive' },
    },
  });

  if (existing) {
    const error = new Error(`Danh mục "${name.trim()}" đã tồn tại trong doanh nghiệp của bạn`);
    error.statusCode = 409;
    throw error;
  }

  return await prisma.category.create({
    data: {
      tenantId: resolvedTenantId,
      userId: userId ? Number(userId) : null,
      name: name.trim(),
      type,
      icon: icon || 'default',
    },
  });
};

/**
 * Cập nhật danh mục của tenant (Chống cross-tenant)
 */
const updateCategory = async (categoryId, tenantId, { name, icon }) => {
  const categoryIdNum = Number(categoryId);
  const resolvedTenantId = Number(tenantId);

  // Tìm danh mục theo ID trước để xác định quyền sở hữu
  const existing = await prisma.category.findUnique({
    where: { id: categoryIdNum },
  });

  if (!existing) {
    const error = new Error('Danh mục không tồn tại');
    error.statusCode = 404;
    throw error;
  }

  if (existing.tenantId === null) {
    const error = new Error('Không được phép chỉnh sửa danh mục mặc định của hệ thống');
    error.statusCode = 403;
    throw error;
  }

  // Chống cross-tenant sửa danh mục của công ty khác
  if (Number(existing.tenantId) !== resolvedTenantId) {
    const error = new Error('Forbidden: Bạn không có quyền chỉnh sửa danh mục của doanh nghiệp khác');
    error.statusCode = 403;
    throw error;
  }

  const updateData = {};
  if (name && name.trim()) {
    // Kiểm tra trùng tên trong cùng tenant
    const duplicate = await prisma.category.findFirst({
      where: {
        tenantId: resolvedTenantId,
        name: { equals: name.trim(), mode: 'insensitive' },
        NOT: { id: categoryIdNum },
      },
    });

    if (duplicate) {
      const error = new Error(`Tên danh mục "${name.trim()}" đã tồn tại trong doanh nghiệp của bạn`);
      error.statusCode = 409;
      throw error;
    }

    updateData.name = name.trim();
  }

  if (icon !== undefined) {
    updateData.icon = icon;
  }

  return await prisma.category.update({
    where: { id: categoryIdNum },
    data: updateData,
  });
};

/**
 * Xóa danh mục của tenant (Chống cross-tenant và kiểm tra ràng buộc giao dịch)
 */
const deleteCategory = async (categoryId, tenantId) => {
  const categoryIdNum = Number(categoryId);
  const resolvedTenantId = Number(tenantId);

  const existing = await prisma.category.findUnique({
    where: { id: categoryIdNum },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  });

  if (!existing) {
    const error = new Error('Danh mục không tồn tại');
    error.statusCode = 404;
    throw error;
  }

  if (existing.tenantId === null) {
    const error = new Error('Không được phép xóa danh mục mặc định của hệ thống');
    error.statusCode = 403;
    throw error;
  }

  // Chống cross-tenant xóa danh mục của công ty khác
  if (Number(existing.tenantId) !== resolvedTenantId) {
    const error = new Error('Forbidden: Bạn không có quyền xóa danh mục của doanh nghiệp khác');
    error.statusCode = 403;
    throw error;
  }

  if (existing._count.transactions > 0) {
    const error = new Error('Không thể xóa danh mục đã được dùng trong các giao dịch chi tiêu');
    error.statusCode = 400;
    throw error;
  }

  return await prisma.category.delete({
    where: { id: categoryIdNum },
  });
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
