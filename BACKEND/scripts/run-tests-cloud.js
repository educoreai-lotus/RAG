#!/usr/bin/env node
/**
 * Cloud Test Runner for Knowledge Graph Tests
 * Usage: node scripts/run-tests-cloud.js [test-file]
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BACKEND_DIR = join(__dirname, '..');

// Set environment variables for cloud testing
process.env.NODE_ENV = 'test';
process.env.SKIP_GLOBAL_TEST_SETUP = process.env.SKIP_GLOBAL_TEST_SETUP || 'true';
process.env.SKIP_PRISMA = process.env.SKIP_PRISMA || 'true';

// Get test file from command line argument
const testFile = process.argv[2] || 'knowledgeGraph.service.test.js';

console.log('🧪 Running Knowledge Graph tests in cloud environment...');
console.log(`Test file: ${testFile}`);
console.log(`Working directory: ${BACKEND_DIR}`);

try {
  // Change to BACKEND directory
  process.chdir(BACKEND_DIR);

  // Run the test
  const command = `npm test -- ${testFile}`;
  console.log(`Executing: ${command}`);
  
  execSync(command, {
    stdio: 'inherit',
    cwd: BACKEND_DIR,
    env: process.env
  });

  console.log('✅ Tests completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Tests failed:', error.message);
  process.exit(1);
}

