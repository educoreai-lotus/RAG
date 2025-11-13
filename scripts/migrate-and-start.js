/**
 * Migration and Start Script
 * Runs Prisma migrations before starting the server
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Simple console logger (in case winston fails to load)
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
      log.error('DATABASE_URL environment variable is not set!');
      throw new Error('DATABASE_URL is required');
    }
    
    const schemaPath = join(projectRoot, 'prisma', 'schema.prisma');
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
      log.info('Migrations deployed successfully');
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
      log.info('Database schema pushed successfully');
    }
  } catch (error) {
    log.error('Migration failed:', error.message);
    log.error('Stack:', error.stack);
    // Don't exit - let the server start anyway (migrations might already be applied)
    log.warn('Continuing with server start despite migration error');
  }
}

async function startServer() {
  try {
    log.info('Starting server...');
    // Import and start the server
    await import('../src/index.js');
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

