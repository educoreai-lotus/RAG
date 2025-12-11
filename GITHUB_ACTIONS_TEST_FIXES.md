# GitHub Actions Test Failures - Analysis and Fixes

## Executive Summary

This document identifies and fixes critical issues in the GitHub Actions workflows that were causing test failures. The main problems were related to incorrect working directories, missing Prisma client generation, and improper database configuration.

---

## Issues Identified

### 1. **test.yml Workflow - Working Directory Issues** ⚠️ CRITICAL

**Location:** `.github/workflows/test.yml`

**Problems:**
- Running `npm ci` from root directory, but tests are located in `BACKEND/tests/`
- Running `npx prisma migrate deploy` without specifying the schema path
- Missing Prisma client generation step before running tests
- Running test commands from root instead of `BACKEND/` directory
- Coverage file path incorrect for Codecov upload

**Impact:** Tests would fail because:
- Dependencies not installed in the correct location
- Prisma client not generated, causing import errors
- Database migrations not running with correct schema path
- Jest configuration mismatch (root vs BACKEND)

**Fix Applied:**
- Added `working-directory: BACKEND` to all relevant steps
- Added Prisma client generation step: `npm run db:generate`
- Fixed migration command to use: `npm run db:migrate:deploy` (which includes schema path)
- Updated cache configuration to use `BACKEND/package-lock.json`
- Fixed coverage file path: `./BACKEND/coverage/lcov.info`

---

### 2. **ci-cd.yml Workflow - Backend Test Execution** ⚠️ CRITICAL

**Location:** `.github/workflows/ci-cd.yml`

**Problems:**
- Running `npm install` from root, but backend tests need dependencies in `BACKEND/`
- Running `npm run test:unit` from root (tests don't exist there)
- Missing Prisma client generation
- Missing database migrations
- Incomplete environment variables for tests
- Database health check missing user specification

**Impact:** Tests would fail because:
- Backend dependencies not installed
- Tests not found (running from wrong directory)
- Prisma client not available, causing import errors
- Database not migrated, causing schema errors
- Missing required environment variables

**Fix Applied:**
- Changed to `npm ci` in `BACKEND/` directory for faster, reliable installs
- Added Prisma client generation step
- Added database migration step
- Added all required environment variables (DATABASE_URL, REDIS_URL, KAFKA_BROKER_URL, OPENAI_API_KEY, etc.)
- Fixed database health check to include user: `pg_isready -U postgres`
- Added explicit `POSTGRES_USER` environment variable

---

### 3. **Database Configuration Inconsistencies** ⚠️ MEDIUM

**Location:** Both workflow files

**Problems:**
- `test.yml` uses: `POSTGRES_USER: test`, `POSTGRES_PASSWORD: test`, `POSTGRES_DB: rag_test`
- `ci-cd.yml` was missing `POSTGRES_USER` (defaults to 'postgres')
- Health check commands inconsistent

**Impact:** Potential connection issues if database user doesn't match connection string

**Fix Applied:**
- Standardized health check to include user: `pg_isready -U postgres`
- Added explicit `POSTGRES_USER: postgres` in ci-cd.yml
- Both workflows now have consistent database setup

---

### 4. **Missing Environment Variables** ⚠️ MEDIUM

**Location:** `.github/workflows/ci-cd.yml`

**Problems:**
- Unit tests step missing required environment variables
- Knowledge Graph tests missing some environment variables

**Impact:** Tests may fail due to missing configuration

**Fix Applied:**
- Added complete environment variable set to both test steps:
  - `NODE_ENV: test`
  - `LOG_LEVEL: error`
  - `DATABASE_URL` and `TEST_DATABASE_URL`
  - `REDIS_URL` and `TEST_REDIS_URL`
  - `KAFKA_BROKER_URL`
  - `OPENAI_API_KEY` and `OPENAI_API_URL`

---

### 5. **Prisma Schema Path Issues** ⚠️ MEDIUM

**Location:** `.github/workflows/test.yml`

**Problems:**
- Running `npx prisma migrate deploy` without schema path
- Prisma schema is located at `DATABASE/prisma/schema.prisma` (relative to BACKEND)

**Impact:** Migrations would fail or run against wrong schema

**Fix Applied:**
- Using `npm run db:migrate:deploy` which includes the correct schema path: `--schema=../DATABASE/prisma/schema.prisma`
- Prisma client generation also uses the correct path via npm script

---

## Files Modified

### 1. `.github/workflows/test.yml`
**Changes:**
- Line 65: Updated cache to use `BACKEND/package-lock.json`
- Line 67-68: Changed to install dependencies in `BACKEND/` directory
- Line 70-73: Added Prisma client generation step
- Line 75-77: Fixed migration to use npm script with correct schema path
- Line 79-86: Added `working-directory: BACKEND` to unit tests
- Line 92-99: Added `working-directory: BACKEND` to integration tests
- Line 105-112: Added `working-directory: BACKEND` to coverage step
- Line 118: Fixed coverage file path for Codecov

### 2. `.github/workflows/ci-cd.yml`
**Changes:**
- Line 51: Updated cache configuration
- Line 53-54: Changed to install dependencies in `BACKEND/` directory
- Line 56-59: Added Prisma client generation step
- Line 61-64: Added database migration step
- Line 66: Changed lint to run from `BACKEND/` directory
- Line 68-79: Added `working-directory: BACKEND` and complete environment variables to unit tests
- Line 81-92: Added complete environment variables to Knowledge Graph tests
- Line 25: Added `POSTGRES_USER: postgres`
- Line 28: Fixed health check to include user

---

## Test Execution Flow (Fixed)

### test.yml Workflow:
1. ✅ Checkout code
2. ✅ Setup Node.js with cache for BACKEND
3. ✅ Install dependencies in `BACKEND/` directory
4. ✅ Generate Prisma client (required before migrations)
5. ✅ Run database migrations with correct schema path
6. ✅ Run unit tests from `BACKEND/` directory
7. ✅ Run integration tests from `BACKEND/` directory
8. ✅ Generate coverage report from `BACKEND/` directory
9. ✅ Upload coverage to Codecov with correct path

### ci-cd.yml Workflow:
1. ✅ Checkout code
2. ✅ Setup Node.js with cache for BACKEND
3. ✅ Install dependencies in `BACKEND/` directory
4. ✅ Generate Prisma client
5. ✅ Run database migrations
6. ✅ Lint code from `BACKEND/` directory
7. ✅ Run unit tests from `BACKEND/` directory with all env vars
8. ✅ Run Knowledge Graph tests from `BACKEND/` directory with all env vars

---

## Environment Variables Required

All test steps now include:

```yaml
NODE_ENV: test
LOG_LEVEL: error
DATABASE_URL: postgresql://[user]:[password]@localhost:5432/[database]
TEST_DATABASE_URL: postgresql://[user]:[password]@localhost:5432/[database]
REDIS_URL: redis://localhost:6379
TEST_REDIS_URL: redis://localhost:6379
KAFKA_BROKER_URL: localhost:9092
OPENAI_API_KEY: test-key
OPENAI_API_URL: http://localhost:8080/mock-openai
```

---

## Prisma Configuration

**Schema Location:** `DATABASE/prisma/schema.prisma` (relative to BACKEND directory)

**Client Generation:** 
- Command: `npm run db:generate` (from BACKEND/)
- Output: `BACKEND/node_modules/.prisma/client`

**Migrations:**
- Command: `npm run db:migrate:deploy` (from BACKEND/)
- Uses: `--schema=../DATABASE/prisma/schema.prisma`

---

## Verification Checklist

Before merging, verify:

- [ ] All workflow files have correct `working-directory` specifications
- [ ] Prisma client generation step exists before migrations
- [ ] Database migrations use correct schema path
- [ ] All test steps have required environment variables
- [ ] Database health checks include user specification
- [ ] Coverage file paths are correct
- [ ] Cache configuration points to correct package-lock.json

---

## Additional Notes

### SKIP_PRISMA Environment Variable

The `SKIP_PRISMA: 'true'` environment variable is used in some tests to bypass Prisma client initialization. However, tests that actually need database access (like Knowledge Graph tests) should NOT use this flag. The fixes ensure Prisma is properly set up for tests that need it.

### Test Structure

- **Unit Tests:** Located in `BACKEND/tests/unit/`
- **Integration Tests:** Located in `BACKEND/tests/integration/`
- **Jest Config:** `BACKEND/jest.config.cjs` (CommonJS format)
- **Test Setup:** `BACKEND/tests/setup.js`

### Database Services

Both workflows use:
- **PostgreSQL:** pgvector/pgvector:pg15 (with vector extension)
- **Redis:** redis:7-alpine (test.yml) or redis:7 (ci-cd.yml)
- **Zookeeper:** confluentinc/cp-zookeeper:latest (test.yml only, required for Kafka)
- **Kafka:** confluentinc/cp-kafka:latest (test.yml only)

---

## Expected Test Results

After these fixes:

1. ✅ Dependencies install correctly in BACKEND directory
2. ✅ Prisma client generates successfully
3. ✅ Database migrations run with correct schema
4. ✅ Unit tests execute from correct directory
5. ✅ Integration tests execute from correct directory
6. ✅ Coverage reports generate in correct location
7. ✅ All environment variables are available to tests
8. ✅ Database connections work correctly

---

## Troubleshooting

If tests still fail after these fixes:

1. **Check Prisma Client Generation:**
   ```bash
   cd BACKEND
   npm run db:generate
   ```

2. **Verify Database Connection:**
   - Check that DATABASE_URL matches service configuration
   - Verify health checks are passing

3. **Check Environment Variables:**
   - Ensure all required variables are set in workflow
   - Verify variable names match what code expects

4. **Verify Working Directory:**
   - All test-related commands should run from `BACKEND/`
   - Check that `package.json` scripts are correct

5. **Check Jest Configuration:**
   - Verify `BACKEND/jest.config.cjs` is correct
   - Ensure test paths match actual test file locations

---

## Summary

All critical issues have been fixed. The workflows now:
- ✅ Install dependencies in the correct location
- ✅ Generate Prisma client before running tests
- ✅ Run migrations with correct schema path
- ✅ Execute tests from the correct directory
- ✅ Include all required environment variables
- ✅ Use consistent database configuration

The tests should now pass in GitHub Actions CI/CD pipeline.

