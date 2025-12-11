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

  // Check for Supabase pooler and ensure pgbouncer=true is set
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && (dbUrl.includes('pooler.supabase.com') || dbUrl.includes('pooler.supabase.co'))) {
    // Check if pgbouncer=true is already in the URL
    if (!dbUrl.includes('pgbouncer=true')) {
      console.warn('⚠️  [Database] Detected Supabase pooler URL without pgbouncer=true');
      console.warn('⚠️  [Database] This can cause "prepared statement already exists" errors');
      console.warn('💡 [Database] Fix: Add ?pgbouncer=true (or &pgbouncer=true) to DATABASE_URL');
      console.warn('💡 [Database] See: PREPARED_STATEMENT_FIX.md for details');
      
      // Try to fix it automatically by modifying the URL
      try {
        const separator = dbUrl.includes('?') ? '&' : '?';
        const fixedUrl = `${dbUrl}${separator}pgbouncer=true`;
        process.env.DATABASE_URL = fixedUrl;
        console.info('✅ [Database] Automatically added pgbouncer=true to DATABASE_URL');
      } catch (error) {
        console.error('❌ [Database] Failed to auto-fix DATABASE_URL:', error.message);
      }
    }
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

