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
    let needsFix = false;
    let fixedUrl = dbUrl;
    
    // Check if pgbouncer=true is already in the URL
    if (!dbUrl.includes('pgbouncer=true')) {
      console.warn('⚠️  [Database] Detected Supabase pooler URL without pgbouncer=true');
      console.warn('⚠️  [Database] This can cause "prepared statement already exists" errors');
      console.warn('💡 [Database] Fix: Add ?pgbouncer=true (or &pgbouncer=true) to DATABASE_URL');
      console.warn('💡 [Database] See: PREPARED_STATEMENT_FIX.md for details');
      needsFix = true;
    }
    
    // Also check for connection_limit (recommended for pgbouncer)
    if (!dbUrl.includes('connection_limit=')) {
      console.warn('⚠️  [Database] DATABASE_URL is missing connection_limit parameter');
      console.warn('💡 [Database] Recommended: Add &connection_limit=1 for pgbouncer');
      needsFix = true;
    }
    
    if (needsFix) {
      // Try to fix it automatically by modifying the URL
      try {
        const separator = fixedUrl.includes('?') ? '&' : '?';
        if (!fixedUrl.includes('pgbouncer=true')) {
          fixedUrl = `${fixedUrl}${separator}pgbouncer=true`;
        }
        if (!fixedUrl.includes('connection_limit=')) {
          const nextSeparator = fixedUrl.includes('?') ? '&' : '?';
          fixedUrl = `${fixedUrl}${nextSeparator}connection_limit=1`;
        }
        process.env.DATABASE_URL = fixedUrl;
        console.info('✅ [Database] Automatically fixed DATABASE_URL with pgbouncer=true and connection_limit=1');
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

