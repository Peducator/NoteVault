const prisma = require('./config/prisma');

async function cleanDatabase() {
  try {
    await prisma.transaction.deleteMany();
    await prisma.allocation.deleteMany();
    await prisma.bankingInformation.deleteMany();
    await prisma.user.updateMany({ data: { unitId: null } });
    await prisma.unit.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();
  } catch (err) {
    console.warn('[cleanDatabase] Warning during test cleanup:', err.message);
  }
}

module.exports = { cleanDatabase };
