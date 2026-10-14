const prisma = require('../config/prisma');

// Tìm user theo email bằng Prisma Client
const findUserByEmail = async (email) => {
  return await prisma.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: 'insensitive',
      },
    },
    include: {
      tenant: true,
    },
  });
};

// Tìm user theo id bằng Prisma Client
const findUserById = async (id) => {
  return await prisma.user.findUnique({
    where: {
      id: Number(id),
    },
    include: {
      tenant: true,
    },
  });
};

// Tạo user mới kèm tenantId, name, role, employeeCode, department (nếu có)
const createUser = async ({ email, password, tenantId, name, role, employeeCode, department }) => {
  const genCode = employeeCode || `NV-${Math.floor(100000 + Math.random() * 900000)}`;
  return await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password,
      name: name || null,
      role: role || 'USER',
      tenantId: tenantId ? Number(tenantId) : null,
      employeeCode: genCode,
      department: department || null,
    },
    select: {
      id: true,
      uuid: true,
      email: true,
      name: true,
      employeeCode: true,
      department: true,
      role: true,
      tenantId: true,
      tenant: true,
      createdAt: true,
      deletedAt: true,
    },
  });
};

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
};
