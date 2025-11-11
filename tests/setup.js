import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { startMockServer, stopMockServer } from './mocks/server.js';
import { cleanupDatabase, seedTestData, disconnectTestDatabase } from './helpers/db-helper.js';
import { clearCache, disconnectCache } from './helpers/cache-helper.js';

function loadTestEnvironment() {
  const possibleEnvFiles = [
    process.env.TEST_ENV_FILE,
    path.resolve(process.cwd(), '.env.test'),
    path.resolve(process.cwd(), 'env.test.example'),
  ].filter(Boolean);

  for (const envFile of possibleEnvFiles) {
    if (fs.existsSync(envFile)) {
      dotenv.config({ path: envFile });
      break;
    }
  }
}

async function safeExecute(callback, description) {
  try {
    await callback();
  } catch (error) {
    console.warn(`Test setup warning: ${description}`, error.message);
  }
}

loadTestEnvironment();

const skipGlobalSetupEnv = process.env.SKIP_GLOBAL_TEST_SETUP;
const skipGlobalSetup = skipGlobalSetupEnv === undefined || skipGlobalSetupEnv !== 'false';

if (!skipGlobalSetup) {
beforeAll(async () => {
    await safeExecute(() => startMockServer(), 'Failed to start mock server');

    await safeExecute(async () => {
      await cleanupDatabase();
      await seedTestData();
    }, 'Failed to seed test database');

    await safeExecute(() => clearCache(), 'Failed to clear test cache');
});

afterAll(async () => {
    await safeExecute(() => cleanupDatabase(), 'Failed to cleanup database after tests');
    await safeExecute(() => clearCache(), 'Failed to clear cache after tests');
    await safeExecute(() => stopMockServer(), 'Failed to stop mock server');
    await safeExecute(() => disconnectCache(), 'Failed to disconnect cache');
    await safeExecute(() => disconnectTestDatabase(), 'Failed to disconnect database');
});

  beforeEach(async () => {
    await safeExecute(() => cleanupDatabase(), 'Failed to cleanup database before test');
    await safeExecute(() => seedTestData(), 'Failed to seed database before test');
    await safeExecute(() => clearCache(), 'Failed to clear cache before test');
});

  afterEach(async () => {
    await safeExecute(() => clearCache(), 'Failed to clear cache after test');
});
}
