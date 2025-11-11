let PrismaClient;

module.exports = {
  async getPrismaClient() {
    if (!PrismaClient) {
      const module = await import('@prisma/client');
      PrismaClient = module.PrismaClient ?? module.default?.PrismaClient;
    }
    return PrismaClient;
  },
};
