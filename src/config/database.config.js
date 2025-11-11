/**
 * Database configuration
 * Prisma client setup
 */

let prismaInstance = null;

async function createPrismaClient() {
  if (process.env.SKIP_PRISMA === 'true') {
    return {
      accessControlRule: {
        findMany: async () => [],
      },
      auditLog: {
        create: async () => {},
      },
      $transaction: async () => {},
    };
  }

  const { PrismaClient } = await import('@prisma/client');
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

async function getPrismaClient() {
  if (!prismaInstance) {
    prismaInstance = await createPrismaClient();
  }

  return prismaInstance;
}

export { getPrismaClient };
