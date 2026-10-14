const prisma = require('../config/prisma');

/**
 * Tạo một giao dịch chi tiêu/thu nhập mới
 */
const createTransaction = async ({ userId, tenantId, categoryId, amount, type, note, transactionDate, s3Key, scanStatus = 'CLEAN' }) => {
  if (!amount || Number(amount) <= 0) {
    const error = new Error('Số tiền giao dịch phải lớn hơn 0');
    error.statusCode = 400;
    throw error;
  }

  if (!categoryId) {
    const error = new Error('Danh mục (categoryId) là bắt buộc');
    error.statusCode = 400;
    throw error;
  }

  // Kiểm tra danh mục có tồn tại và hợp lệ với user này không
  const category = await prisma.category.findUnique({
    where: { id: Number(categoryId) },
  });

  if (!category) {
    const error = new Error('Danh mục không tồn tại');
    error.statusCode = 404;
    throw error;
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId: Number(userId),
      tenantId: tenantId ? Number(tenantId) : undefined,
      categoryId: Number(categoryId),
      amount: Number(amount),
      type: type || category.type,
      note: note ? note.trim() : null,
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      s3Key: s3Key || null,
      scanStatus: scanStatus || 'CLEAN',
    },
    include: {
      category: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
        },
      },
    },
  });

  return transaction;
};

/**
 * Lấy danh sách giao dịch của user (hỗ trợ lọc theo tháng/năm)
 */
const getTransactions = async ({ userId, userRole, tenantId, month, year, page = 1, limit = 20 }) => {
  let where = {
    userId: Number(userId),
  };

  if (userRole === 'ADMIN' && tenantId) {
    where = {
      tenantId: Number(tenantId),
    };
  }

  if (month && year) {
    const startOfMonth = new Date(Number(year), Number(month) - 1, 1);
    const endOfMonth = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
    where.transactionDate = {
      gte: startOfMonth,
      lte: endOfMonth,
    };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [total, items] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: {
        transactionDate: 'desc',
      },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
    }),
  ]);

  return {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)),
    items,
  };
};

/**
 * Xem chi tiết 1 giao dịch
 */
const getTransactionById = async (userId, id) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: Number(id) },
    include: { category: true },
  });

  if (!transaction) {
    const error = new Error('Không tìm thấy giao dịch');
    error.statusCode = 404;
    throw error;
  }

  if (transaction.userId !== Number(userId)) {
    const error = new Error('Bạn không có quyền truy cập giao dịch này');
    error.statusCode = 403;
    throw error;
  }

  return transaction;
};

/**
 * Xóa giao dịch
 */
const deleteTransaction = async (userId, id) => {
  const transaction = await getTransactionById(userId, id);
  return await prisma.transaction.delete({
    where: { id: transaction.id },
  });
};

/**
 * Sao kê / Báo cáo tổng hợp chi tiêu theo tháng
 */
const getMonthlyStatement = async ({ userId, month, year }) => {
  const targetYear = year ? Number(year) : new Date().getFullYear();
  const targetMonth = month ? Number(month) : new Date().getMonth() + 1;

  const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
  const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: Number(userId),
      transactionDate: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    include: {
      category: true,
    },
    orderBy: {
      transactionDate: 'desc',
    },
  });

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryMap = {};

  for (const t of transactions) {
    if (t.type === 'INCOME') {
      totalIncome += t.amount;
    } else {
      totalExpense += t.amount;
      const catName = t.category.name;
      if (!categoryMap[catName]) {
        categoryMap[catName] = 0;
      }
      categoryMap[catName] += t.amount;
    }
  }

  const byCategory = Object.keys(categoryMap).map((catName) => {
    const total = categoryMap[catName];
    const percentage = totalExpense > 0 ? ((total / totalExpense) * 100).toFixed(1) + '%' : '0%';
    return {
      category: catName,
      total,
      percentage,
    };
  });

  return {
    month: `${targetMonth}/${targetYear}`,
    summary: {
      totalIncome,
      totalExpense,
      netSavings: totalIncome - totalExpense,
      totalTransactions: transactions.length,
    },
    byCategory,
    history: transactions,
  };
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  deleteTransaction,
  getMonthlyStatement,
};
