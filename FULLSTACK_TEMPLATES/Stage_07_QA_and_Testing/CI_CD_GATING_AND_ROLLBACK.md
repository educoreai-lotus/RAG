# Stage 07 - CI/CD Gating & Rollback Criteria

**Date:** 2025-01-27  
**Project:** EDUCORE - Contextual Assistant (RAG / Knowledge Graph) Microservice

---

## CI/CD Pipeline Overview

### Pipeline Stages

1. **Lint & Format** - Code quality checks
2. **Unit Tests** - Fast feedback (parallel)
3. **Integration Tests** - Service interactions
4. **E2E Tests** - Full workflow tests
5. **Coverage Report** - Code coverage validation
6. **Security Scan** - Vulnerability scanning
7. **Build** - Application build
8. **Deploy (Staging)** - Deploy to staging
9. **Smoke Tests (Staging)** - Post-deployment validation
10. **Deploy (Production)** - Deploy to production
11. **Smoke Tests (Production)** - Production validation

---

## Pull Request Gates

### Required for Merge

✅ **All checks must pass:**

1. **Linting**
   - ESLint passes with no errors
   - Prettier formatting applied
   - No console.log statements (use logger)

2. **Unit Tests**
   - All unit tests pass
   - Coverage ≥80%
   - No flaky tests

3. **Integration Tests**
   - All integration tests pass
   - API contract tests pass
   - Database tests pass

4. **Code Coverage**
   - Overall coverage ≥80%
   - Critical paths ≥85%
   - Coverage report uploaded

5. **Build**
   - Application builds successfully
   - No build errors
   - No dependency conflicts

6. **Security Scan**
   - No critical vulnerabilities
   - No high vulnerabilities (warnings allowed)
   - Dependency audit passes

### Optional (Warnings)

⚠️ **These may fail but should be addressed:**

1. **E2E Tests**
   - Run on main branch only
   - Warnings if E2E tests fail

2. **Performance Tests**
   - Run nightly
   - Warnings if performance degrades

---

## Deployment Gates

### Pre-Deployment (Staging)

✅ **Required:**

1. **Database Migrations**
   - Migrations are backward compatible
   - Migration scripts tested
   - Rollback scripts available

2. **Health Checks**
   - All health endpoints respond
   - Database connectivity
   - Redis connectivity
   - Kafka connectivity

3. **Smoke Tests**
   - All smoke tests pass
   - Critical paths validated

4. **Configuration**
   - Environment variables set
   - Secrets configured
   - Feature flags set

### Post-Deployment (Staging)

✅ **Required:**

1. **Smoke Tests**
   - All smoke tests pass
   - Health checks pass
   - Basic functionality works

2. **Monitoring**
   - Error rate < 1%
   - Response time < 3s (P95)
   - No critical alerts

### Pre-Deployment (Production)

✅ **Required:**

1. **Staging Validation**
   - Staging tests pass for 24 hours
   - No critical bugs in staging
   - Performance metrics acceptable

2. **Database Migrations**
   - Migrations tested in staging
   - Rollback plan ready
   - Backup verified

3. **Configuration Review**
   - Production config reviewed
   - Secrets rotated (if needed)
   - Feature flags reviewed

### Post-Deployment (Production)

✅ **Required:**

1. **Smoke Tests**
   - All smoke tests pass
   - Health checks pass
   - Basic functionality works

2. **Monitoring (5 minutes)**
   - Error rate < 1%
   - Response time < 3s (P95)
   - No critical alerts
   - Database connections healthy

---

## Rollback Criteria

### Automatic Rollback Triggers

**Trigger Conditions (any of the following):**

1. **Health Check Failure**
   - Health endpoint returns non-200
   - Duration: > 2 minutes
   - **Action:** Automatic rollback

2. **Error Rate Spike**
   - Error rate > 5% for > 2 minutes
   - **Action:** Automatic rollback

3. **Response Time Degradation**
   - P95 latency > 5s for > 2 minutes
   - **Action:** Automatic rollback

4. **Database Migration Failure**
   - Migration script fails
   - Data integrity check fails
   - **Action:** Automatic rollback

5. **Critical Service Failure**
   - Database unavailable
   - Redis unavailable
   - OpenAI API unavailable (if critical)
   - **Action:** Automatic rollback

### Manual Rollback Triggers

**Conditions requiring manual intervention:**

1. **Performance Degradation**
   - P95 latency > 3s (target)
   - Throughput < 150 QPS (target: 200 QPS)
   - **Action:** Manual rollback decision

2. **Security Issue**
   - Security scan detects critical vulnerability
   - Data breach detected
   - **Action:** Immediate manual rollback

3. **Data Loss/Corruption**
   - Data integrity issues detected
   - Backup/restore required
   - **Action:** Immediate manual rollback

4. **Feature Regression**
   - Critical feature broken
   - User experience degraded
   - **Action:** Manual rollback decision

---

## Rollback Procedure

### Automatic Rollback

**Triggered by:** Monitoring system

**Process:**
1. Monitoring system detects trigger condition
2. Alert sent to on-call engineer
3. Automatic rollback initiated (if configured)
4. Previous version deployed
5. Health checks verified
6. Team notified

**Duration:** < 5 minutes

---

### Manual Rollback

**Triggered by:** On-call engineer or team lead

**Process:**
1. Identify issue
2. Verify rollback is appropriate
3. Execute rollback script
4. Verify previous version deployed
5. Run smoke tests
6. Monitor metrics
7. Document incident

**Duration:** < 10 minutes

---

## Rollback Script

**File:** `scripts/rollback.sh`

```bash
#!/bin/bash

# Rollback to previous deployment
PREVIOUS_VERSION=$(get_previous_version)
DEPLOY_VERSION=$PREVIOUS_VERSION

# Rollback database (if needed)
if [ "$ROLLBACK_DB" == "true" ]; then
  npx prisma migrate resolve --rolled-back $MIGRATION_NAME
fi

# Rollback application
kubectl rollout undo deployment/rag-microservice

# Verify rollback
./scripts/verify-rollback.sh
```

---

## Monitoring & Alerts

### Key Metrics

**Monitored:**
- Error rate (target: < 1%)
- Response time P50, P95, P99 (target: < 3s P95)
- Throughput (target: 200 QPS)
- Database connections
- Cache hit rate
- Vector search latency

### Alert Thresholds

**Critical Alerts (Auto-rollback):**
- Error rate > 5% for > 2 minutes
- P95 latency > 5s for > 2 minutes
- Health check failure > 2 minutes

**Warning Alerts (Manual review):**
- Error rate > 1% for > 5 minutes
- P95 latency > 3s for > 5 minutes
- Cache hit rate < 80%

---

## Deployment Strategy

### Blue-Green Deployment

**Approach:** Blue-Green deployment for zero downtime

**Process:**
1. Deploy new version (green)
2. Run smoke tests on green
3. Switch traffic from blue to green
4. Monitor green for 5 minutes
5. If issues, switch back to blue (rollback)
6. If healthy, keep green, remove blue

---

## Incident Response

### Rollback Incident Response

**Process:**
1. **Detection:** Monitoring alerts or manual detection
2. **Assessment:** Determine severity and impact
3. **Decision:** Automatic or manual rollback
4. **Execution:** Execute rollback
5. **Verification:** Verify rollback success
6. **Documentation:** Document incident
7. **Post-Mortem:** Analyze root cause

---

## CI/CD Configuration

### GitHub Actions Workflow

**File:** `.github/workflows/ci-cd.yml`

```yaml
name: CI/CD Pipeline

on:
  pull_request:
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check

  test:
    runs-on: ubuntu-latest
    services:
      postgres: ...
      redis: ...
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm audit --audit-level=high
      - uses: github/super-linter@v4

  deploy-staging:
    needs: [lint, test, security]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: ./scripts/deploy-staging.sh
      - run: npm run test:smoke -- --env=staging

  deploy-production:
    needs: [deploy-staging]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: ./scripts/deploy-production.sh
      - run: npm run test:smoke -- --env=production
```

---

## Summary

### CI/CD Gates

✅ **PR Gates:**
- Lint, unit tests, integration tests, coverage, build, security

✅ **Deployment Gates:**
- Migrations, health checks, smoke tests, monitoring

✅ **Rollback Criteria:**
- Automatic: Health failure, error spike, latency spike
- Manual: Performance, security, data issues

---

## Next Steps

1. ✅ CI/CD gating criteria documented
2. ✅ Rollback criteria documented
3. ⏭️ Update PROJECT_EVOLUTION_LOG.md and ROADMAP.md
4. ⏭️ Create STAGE_07_APPROVAL.md

---

**Status:** ✅ CI/CD Gating & Rollback Complete






