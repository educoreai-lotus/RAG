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
    
    const schemaPath = join(projectRoot, 'DATABASE', 'prisma', 'schema.prisma');
    log.info(`Using schema: ${schemaPath}`);
    
    // First, try to deploy existing migrations
    try {
      log.info('Attempting to deploy existing migrations...');
      execSync(`npx prisma migrate deploy --schema=${schemaPath}`, {
        stdio: 'inherit',
        env: { ...process.env },
        cwd: projectRoot,
        shell: true,
      });
      log.info('✅ Migrations deployed successfully');
      return;
    } catch (deployError) {
      // If no migrations exist, try db push (for initial setup)
      log.warn('No migrations found or deploy failed, trying db push...');
      log.warn(`Deploy error: ${deployError.message}`);
      
      execSync(`npx prisma db push --schema=${schemaPath} --accept-data-loss --skip-generate`, {
        stdio: 'inherit',
        env: { ...process.env },
        cwd: projectRoot,
        shell: true,
      });
      log.info('✅ Database schema pushed successfully');
    }
  } catch (error) {
    log.error('Migration failed:', error.message);
    log.error('Stack:', error.stack);
    // Don't exit - let the server start anyway (migrations might already be applied)
    log.warn('⚠️  Continuing with server start despite migration error');
  }
}

async function startServer() {
  try {
    log.info('Starting server...');
    const serverPath = join(backendRoot, 'src', 'index.js');
    await import(serverPath);
  } catch (error) {
    log.error('Server start failed:', error.message);
    log.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run migrations first, then start server
runMigrations()
  .then(() => startServer())
  .catch((error) => {
    log.error('Startup failed:', error);
    log.error('Stack:', error.stack);
    process.exit(1);
  });

