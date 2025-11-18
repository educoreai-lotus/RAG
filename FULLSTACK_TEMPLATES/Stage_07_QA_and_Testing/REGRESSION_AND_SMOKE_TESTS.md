# Stage 07 - Regression & Smoke Tests

**Date:** 2025-01-27  
**Project:** EDUCORE - Contextual Assistant (RAG / Knowledge Graph) Microservice

---

## Regression Test Suite

### Purpose

Regression tests ensure existing functionality continues to work after code changes. All critical user stories and API endpoints are covered.

---

## Regression Test Coverage

### Critical User Stories (20 stories)

#### Epic 1: Core RAG (US-001, US-002)
- ✅ Basic query processing
- ✅ Vector retrieval
- ✅ Source citations
- ✅ Confidence scoring

#### Epic 2: Assessment & DevLab (US-003, US-004)
- ✅ Assessment hints
- ✅ DevLab technical support
- ✅ Code review
- ✅ Error explanations

#### Epic 3: Analytics & Reporting (US-005, US-006)
- ✅ Analytics explanations
- ✅ HR report explanations
- ✅ Navigation links
- ✅ Recommendations

#### Epic 4: Content Studio (US-007)
- ✅ Content retrieval
- ✅ Media links
- ✅ Multiple content types

#### Epic 5: Personalized Assistance (US-013, US-014)
- ✅ Personalized queries
- ✅ Content recommendations
- ✅ Skill gap consideration
- ✅ Learning progress integration

#### Epic 6: Access Control (US-015 to US-020)
- ✅ RBAC enforcement
- ✅ ABAC enforcement
- ✅ Fine-grained permissions
- ✅ Field-level masking
- ✅ Permission-aware responses
- ✅ Audit logging

---

## Regression Test Structure

### Test Suites

**File:** `tests/regression/`

```
tests/regression/
├── core-rag/
│   ├── query-processing.test.js
│   ├── vector-retrieval.test.js
│   └── source-citations.test.js
├── assessment-devlab/
│   ├── assessment-hints.test.js
│   └── devlab-support.test.js
├── analytics-reporting/
│   ├── analytics-explanations.test.js
│   └── hr-reports.test.js
├── personalized-assistance/
│   ├── personalized-queries.test.js
│   └── recommendations.test.js
└── access-control/
    ├── rbac.test.js
    ├── abac.test.js
    ├── fine-grained-permissions.test.js
    └── field-masking.test.js
```

---

## Smoke Test Suite

### Purpose

Smoke tests provide quick validation of critical paths after deployment. They run fast (< 5 minutes) and cover essential functionality.

---

## Smoke Test Scenarios

### 1. Health Check (SMOKE-001)

**Test:** Verify all health endpoints respond

**Steps:**
1. GET `/health` → 200 OK
2. GET `/health/readiness` → 200 OK
3. GET `/health/liveness` → 200 OK

**Timeout:** 5s

---

### 2. Database Connectivity (SMOKE-002)

**Test:** Verify database connection

**Steps:**
1. Connect to PostgreSQL
2. Run simple query: `SELECT 1`
3. Verify connection pool

**Timeout:** 10s

---

### 3. Redis Connectivity (SMOKE-003)

**Test:** Verify Redis connection

**Steps:**
1. Connect to Redis
2. SET test key
3. GET test key
4. DELETE test key

**Timeout:** 5s

---

### 4. Basic Query Flow (SMOKE-004)

**Test:** Verify basic query works

**Steps:**
1. Submit query: "test query"
2. Receive response
3. Verify response structure
4. Verify response time < 3s

**Timeout:** 10s

---

### 5. Authentication (SMOKE-005)

**Test:** Verify authentication works

**Steps:**
1. Request with valid mTLS cert
2. Request with invalid cert
3. Verify authentication logic

**Timeout:** 5s

---

### 6. Multi-Tenant Isolation (SMOKE-006)

**Test:** Verify tenant isolation

**Steps:**
1. Query as Tenant A
2. Verify Tenant A data only
3. Query as Tenant B
4. Verify Tenant B data only

**Timeout:** 10s

---

## Smoke Test Execution

### Pre-Deployment

```bash
# Run smoke tests before deployment
npm run test:smoke:pre-deploy
```

### Post-Deployment

```bash
# Run smoke tests after deployment
npm run test:smoke:post-deploy
```

### CI/CD Integration

```yaml
# .github/workflows/smoke-tests.yml
- name: Run Smoke Tests
  run: npm run test:smoke
  env:
    API_URL: ${{ secrets.STAGING_API_URL }}
```

---

## Test Execution Strategy

### Regression Tests

**Frequency:** On every PR and merge

**Execution:**
```bash
# Run regression tests
npm run test:regression

# Run specific regression suite
npm run test:regression -- core-rag
```

### Smoke Tests

**Frequency:** 
- Pre-deployment (staging)
- Post-deployment (production)
- Nightly (scheduled)

**Execution:**
```bash
# Run smoke tests
npm run test:smoke

# Run smoke tests against production
npm run test:smoke -- --env=production
```

---

## Test Maintenance

### Regression Test Maintenance

**Weekly:**
- Review test results
- Fix flaky tests
- Update tests for new features

**Monthly:**
- Review test coverage
- Add tests for new user stories
- Remove obsolete tests

### Smoke Test Maintenance

**After Each Deployment:**
- Verify smoke tests pass
- Update smoke tests if critical paths change

---

## Next Steps

1. ✅ Regression test plan created
2. ✅ Smoke test plan created
3. ⏭️ Create CI/CD gating criteria document
4. ⏭️ Update PROJECT_EVOLUTION_LOG.md and ROADMAP.md

---

**Status:** ✅ Regression & Smoke Tests Complete






