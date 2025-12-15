/**
 * Start Server with Migrations
 * Runs Prisma migrations before starting the server
 * Used by Railway deployment
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendRoot = join(__dirname, '..');
const projectRoot = join(backendRoot, '..');

// Simple console logger
const log = {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
};

async function runMigrations() {
  try {
    log.info('Running database migrations...');
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      log.warn('DATABASE_URL environment variable is not set!');
      log.warn('Migrations will be skipped. Make sure DATABASE_URL is configured.');
      return;
    }
    
    // Validate DATABASE_URL format
    const dbUrl = process.env.DATABASE_URL;
    
    // Check if it's a Supabase URL
    if (dbUrl.includes('supabase.com') || dbUrl.includes('supabase.co')) {
      log.info('✅ Detected Supabase database URL');
      
      // Check for sslmode
      if (!dbUrl.includes('sslmode=require') && !dbUrl.includes('sslmode=prefer')) {
        log.error('❌ DATABASE_URL is missing sslmode parameter!');
        log.error('💡 Supabase REQUIRES: ?sslmode=require at the end of DATABASE_URL');
        log.error('💡 Current URL (first 80 chars):', dbUrl.substring(0, 80) + '...');
        log.error('💡 Fix: Add ?sslmode=require to DATABASE_URL in Railway');
        log.error('💡 This is causing the connection failure!');
        // Continue anyway - might work in some cases
      }
      
      // Check connection type
      if (dbUrl.includes(':6543')) {
        log.info('Using Supabase connection pooler (port 6543)');
        
        // Check for pgbouncer=true (required to disable prepared statements)
        let needsFix = false;
        let fixedUrl = dbUrl;
        
        if (!dbUrl.includes('pgbouncer=true')) {
          log.error('❌ DATABASE_URL is missing pgbouncer=true parameter!');
          log.error('💡 This will cause "prepared statement already exists" errors');
          log.error('💡 Fix: Add &pgbouncer=true (or ?pgbouncer=true) to DATABASE_URL');
          log.error('💡 Example: ...?sslmode=require&pgbouncer=true');
          log.error('💡 See: PREPARED_STATEMENT_FIX.md for details');
          needsFix = true;
        }
        
        // Also check for connection_limit (recommended for pgbouncer)
        if (!dbUrl.includes('connection_limit=')) {
          log.warn('⚠️  DATABASE_URL is missing connection_limit parameter');
          log.warn('💡 Recommended: Add &connection_limit=1 for pgbouncer');
          needsFix = true;
        }
        
        if (needsFix) {
          // Try to fix automatically
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
            log.info('✅ Automatically fixed DATABASE_URL with pgbouncer=true and connection_limit=1');
          } catch (error) {
            log.error('❌ Failed to auto-fix DATABASE_URL:', error.message);
          }
        } else {
          log.info('✅ pgbouncer=true detected - prepared statements disabled');
        }
        
        log.warn('⚠️  Transaction Mode Pooler can cause migration timeouts!');
        log.warn('💡 RECOMMENDED: Use Session Mode Pooler for migrations');
        log.warn('💡 In Supabase Dashboard → Settings → Database → Connection string → Session mode');
        log.warn('💡 Or run migrations manually in Supabase SQL Editor (most reliable)');
        log.warn('💡 See: DATABASE/FINAL_MIGRATION_FIX.md for details');
      } else if (dbUrl.includes(':5432')) {
        log.info('Using Supabase direct connection (port 5432)');
        log.info('✅ Direct connection is better for migrations');
      } else if (dbUrl.includes('db.') && dbUrl.includes('.supabase.co')) {
        log.warn('⚠️  Detected Supabase direct connection URL');
        log.warn('💡 This may require IP allowlist or may not be accessible from Railway');
        log.warn('💡 Try using pooler URL instead: ...pooler.supabase.com:6543/...');
      }
    } else {
      // Not Supabase - just check sslmode
      if (!dbUrl.includes('sslmode=')) {
        log.warn('⚠️  DATABASE_URL may be missing sslmode parameter');
        log.warn('💡 Consider adding ?sslmode=require for secure connections');
      }
    }
    
    // Skip migrations if SKIP_MIGRATIONS is set (for faster deployment)
    if (process.env.SKIP_MIGRATIONS === 'true') {
      log.warn('⚠️  SKIP_MIGRATIONS=true - Skipping database migrations');
      log.warn('⚠️  Make sure to run migrations manually or use db push');
      return;
    }
    
    const schemaPath = join(projectRoot, 'DATABASE', 'prisma', 'schema.prisma');
    const migrationsPath = join(projectRoot, 'DATABASE', 'prisma', 'migrations');
    log.info(`Using schema: ${schemaPath}`);
    
    // Check if migrations directory exists and has migrations
    const fs = await import('fs');
    let hasMigrations = false;
    try {
      if (fs.existsSync(migrationsPath)) {
        const files = fs.readdirSync(migrationsPath);
        hasMigrations = files.some(file => 
          file !== '.gitkeep' && 
          fs.statSync(join(migrationsPath, file)).isDirectory()
        );
      }
    } catch (err) {
      log.warn('Could not check migrations directory:', err.message);
    }
    
    if (hasMigrations) {
      log.info('Found migrations, attempting to deploy...');
      // If migrations exist, try to deploy them
      try {
        log.info('Found migrations, attempting to deploy...');
        log.info(`Schema path: ${schemaPath}`);
        log.info(`Migrations path: ${migrationsPath}`);
        
        // First, generate Prisma client to ensure it's up to date
        // Generate in BACKEND directory so it's in the right location
        log.info('Generating Prisma client...');
        execSync(`npx prisma generate --schema=${schemaPath}`, {
          stdio: 'inherit',
          env: { ...process.env },
          cwd: backendRoot, // Generate in BACKEND directory
          shell: true,
          timeout: 60000, // 1 minute timeout
        });
        
        // Note: pgvector extension should be enabled in Supabase SQL Editor
        // Trying to enable it via Prisma causes "prepared statement already exists" error
        // with Supabase connection pooling
        log.info('Note: pgvector extension should be enabled in Supabase SQL Editor');
        log.info('💡 If not enabled, run: CREATE EXTENSION IF NOT EXISTS vector;');
        
        // Use migrate deploy - more reliable for vector types
        log.info('Checking for pending migrations...');
        log.info(`DATABASE_URL: ${process.env.DATABASE_URL ? 'Set (hidden)' : 'NOT SET'}`);
        log.info('Using migrate deploy (more reliable for pgvector)');
        log.info('💡 Note: If you see "No pending migrations", your database is already up to date (this is normal)');
        
        // Set PRISMA_CLI_QUERY_ENGINE_TYPE to avoid prepared statement issues
        const env = {
          ...process.env,
          PRISMA_CLI_QUERY_ENGINE_TYPE: 'library', // Use library engine instead of binary
        };
        
        try {
          // Run migrate deploy and capture output
          // Note: Prisma migrate deploy returns success even when no migrations are pending
          log.info('⏳ Running migrate deploy (this may take a while)...');
          execSync(`npx prisma migrate deploy --schema=${schemaPath}`, {
            stdio: 'inherit',
            env: env,
            cwd: projectRoot,
            shell: true,
            timeout: 300000, // 5 minute timeout for migrations (reduced from 10)
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer for output
          });
          
          // If we get here, migrations either applied successfully or were already up to date
          log.info('✅ Migration check completed');
          log.info('💡 If you saw "No pending migrations", that means your database is already up to date');
          return;
        } catch (migrateError) {
          if (migrateError.code === 'ETIMEDOUT' || migrateError.signal === 'SIGTERM') {
            log.error('❌ Migration deploy timed out after 5 minutes');
            log.error('💡 This is likely due to Supabase connection pooler timeout');
            log.error('💡 RECOMMENDED: Use Session Mode Pooler or run migrations manually');
            log.warn('⚠️  Continuing with server start despite migration timeout');
            log.warn('💡 You can run migrations manually later in Supabase SQL Editor');
            return; // Continue anyway - don't block server startup
          }
          
          log.error('Migration deploy failed:', migrateError.message);
          log.error('Exit code:', migrateError.status || migrateError.code);
          
          // Check if it's a prepared statement error
          // Check both message and stderr (if available)
          const errorMessage = (
            migrateError.message || 
            migrateError.stderr?.toString() || 
            migrateError.stdout?.toString() ||
            ''
          ).toLowerCase();
          
          if (errorMessage.includes('prepared statement') || 
              errorMessage.includes('already exists') ||
              errorMessage.includes('prepared statement "s') ||
              errorMessage.includes('schema engine error')) {
            log.error('❌ Prepared statement error detected!');
            log.error('💡 This is a known issue with Supabase Transaction Mode Pooler');
            log.error('💡 SOLUTIONS:');
            log.error('   1. Use Session Mode Pooler URL (recommended for migrations)');
            log.error('      In Supabase Dashboard → Settings → Database → Connection string → Session mode');
            log.error('   2. Run migrations manually in Supabase SQL Editor');
            log.error('   3. Set SKIP_MIGRATIONS=true and run migrations separately');
            log.warn('⚠️  Continuing with server start - migrations may need to be run manually');
            log.warn('💡 The database schema might already be up to date');
            return; // Don't try fallback - it will have the same issue
          }
          
          // Check if it's a connection issue
          if (errorMessage.includes('ECONNREFUSED') ||
              errorMessage.includes('timeout') ||
              errorMessage.includes('connection')) {
            log.error('❌ Database connection failed!');
            log.error('💡 Check DATABASE_URL in Railway environment variables');
            log.error('💡 Make sure Supabase service is linked and DATABASE_URL is set');
          }
          
          // Try fallback: db push (but may not work with vector type)
          log.warn('⚠️  Attempting fallback: db push');
          try {
            execSync(`npx prisma db push --schema=${schemaPath} --accept-data-loss --skip-generate`, {
              stdio: 'inherit',
              env: { ...process.env },
              cwd: projectRoot,
              shell: true,
              timeout: 300000, // 5 minute timeout
            });
            log.info('✅ Database schema pushed successfully (fallback)');
            return;
          } catch (pushError) {
            const pushErrorMessage = pushError.message || pushError.stderr?.toString() || '';
            
            // Check if it's also a prepared statement error
            if (pushErrorMessage.includes('prepared statement') || pushErrorMessage.includes('already exists')) {
              log.error('❌ Fallback db push also failed with prepared statement error');
              log.error('💡 This confirms the issue is with Transaction Mode Pooler');
              log.error('💡 RECOMMENDED: Use Session Mode Pooler or run migrations manually');
              log.warn('⚠️  Continuing with server start - database schema may need manual setup');
              return; // Don't throw - let server start
            }
            
            log.error('Fallback db push also failed:', pushError.message);
            log.warn('⚠️  Continuing with server start despite migration errors');
            log.warn('💡 Database schema may need manual setup');
            return; // Don't throw - let server start anyway
          }
        }
      } catch (deployError) {
        log.error('Failed to deploy migrations:', deployError.message);
        log.error('Error details:', deployError);
        
        log.warn('⚠️  Continuing without migrations. Database might not be fully synced.');
        log.warn('💡 To run migrations manually: railway run cd BACKEND && npm run db:migrate:deploy');
        log.warn('💡 Or use db push: railway run cd BACKEND && npx prisma db push --schema=../DATABASE/prisma/schema.prisma');
        return;
      }
    } else {
      log.info('No migrations found.');
      
      // In production, we should have migrations
      if (process.env.NODE_ENV === 'production') {
        log.warn('⚠️  No migrations found in production!');
        log.warn('💡 This might indicate a deployment issue.');
      } else {
        // In development, try db push as fallback
        log.info('Attempting db push (development mode)...');
        try {
          execSync(`npx prisma db push --schema=${schemaPath} --accept-data-loss`, {
            stdio: 'inherit',
            env: { ...process.env },
            cwd: projectRoot,
            shell: true,
            timeout: 120000,
          });
          log.info('✅ Database schema pushed successfully');
          return;
        } catch (pushError) {
          log.warn('db push failed:', pushError.message);
          log.warn('💡 To create schema: railway run npx prisma db push --schema=./DATABASE/prisma/schema.prisma');
        }
      }
    }
  } catch (error) {
    log.error('Migration failed:', error.message);
    log.error('Stack:', error.stack);
    // Don't exit - let the server start anyway (migrations might already be applied)
    log.warn('⚠️  Continuing with server start despite migration error');
    log.warn('⚠️  Database might not be fully synced. Check logs above for details.');
  }
}

async function runEmbeddingsIfNeeded() {
  // Only run embeddings if explicitly enabled and if OPENAI_API_KEY is set
  if (process.env.RUN_EMBEDDINGS_ON_STARTUP !== 'true') {
    log.info('Skipping embeddings creation (RUN_EMBEDDINGS_ON_STARTUP not set to "true")');
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    log.warn('⚠️  RUN_EMBEDDINGS_ON_STARTUP=true but OPENAI_API_KEY not set');
    log.warn('⚠️  Skipping embeddings creation');
    return;
  }

  try {
    log.info('Creating embeddings and inserting seed data...');
    log.info('💡 This may take a few minutes...');
    
    const embeddingsScript = join(backendRoot, 'scripts', 'create-embeddings-and-insert.js');
    
    // Check if script exists
    const fs = await import('fs');
    if (!fs.existsSync(embeddingsScript)) {
      log.warn('⚠️  Embeddings script not found:', embeddingsScript);
      return;
    }

    // Run the embeddings script
    execSync(`node ${embeddingsScript}`, {
      stdio: 'inherit',
      env: { ...process.env },
      cwd: backendRoot,
      shell: true,
      timeout: 600000, // 10 minute timeout
    });
    
    log.info('✅ Embeddings created successfully');
  } catch (error) {
    log.error('Failed to create embeddings:', error.message);
    log.warn('⚠️  Continuing with server start despite embeddings error');
    log.warn('💡 You can run embeddings manually later');
    // Don't exit - let the server start anyway
  }
}

async function startServer() {
  try {
    log.info('Starting server...');
    log.info(`PORT: ${process.env.PORT || 'not set (will use default 3000)'}`);
    log.info(`HOST: ${process.env.HOST || 'not set (will use default 0.0.0.0)'}`);
    log.info(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    
    const serverPath = join(backendRoot, 'src', 'index.js');
    
    // Import the server - this will start the Express app
    log.info('📦 Loading server module from:', serverPath);
    await import(serverPath);
    
    log.info('✅ Server module loaded successfully');
    log.info('💡 Server should be starting now. Check logs for "✅ Server running" message.');
    // Note: The server.listen() is called inside index.js, so we don't need to do anything else here
  } catch (error) {
    log.error('❌ Server start failed:', error.message);
    log.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run migrations first, then embeddings (if enabled), then start server
runMigrations()
  .then(() => {
    log.info('✅ Migrations completed successfully');
    return runEmbeddingsIfNeeded();
  })
  .then(() => {
    log.info('✅ Embeddings check completed');
    return startServer();
  })
  .catch((error) => {
    log.error('❌ Startup failed:', error);
    log.error('Error message:', error.message);
    log.error('Stack:', error.stack);
    process.exit(1);
  });

