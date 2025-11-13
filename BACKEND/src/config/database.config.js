/**
 * Database configuration
 * Prisma client setup with lazy loading
 * 
 * Note: Prisma schema is located at ../DATABASE/prisma/schema.prisma
 * Run: npm run db:generate (from BACKEND/) to generate Prisma client
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

// Export prisma as a promise for backward compatibility
const prisma = getPrismaClient();

export { getPrismaClient, prisma };

