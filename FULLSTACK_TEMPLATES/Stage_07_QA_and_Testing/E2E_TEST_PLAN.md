# Stage 07 - End-to-End (E2E) Test Plan

**Date:** 2025-01-27  
**Project:** EDUCORE - Contextual Assistant (RAG / Knowledge Graph) Microservice  
**Framework:** Playwright or Cypress

---

## E2E Test Overview

End-to-end tests verify complete user workflows from frontend to backend, ensuring all components work together correctly.

---

## Test Scenarios

### 1. Core Query Flow (E2E-001)

**Scenario:** User submits query and receives answer

**Steps:**
1. User opens floating chat widget
2. User types query: "What is JavaScript?"
3. User submits query
4. System shows typing indicator
5. System shows loading spinner
6. System retrieves relevant sources
7. System generates answer
8. System formats answer into paragraphs
9. User sees formatted answer with sources
10. User can expand/collapse sources

**Assertions:**
- ✅ Answer is formatted into paragraphs (not monolithic block)
- ✅ Sources are displayed
- ✅ Answer is accurate and relevant
- ✅ Response time < 3s
- ✅ Loading states work correctly

**File:** `tests/e2e/core-query-flow.spec.js`

---

### 2. Personalized Query Flow (E2E-002)

**Scenario:** Learner receives personalized query response

**Steps:**
1. User (learner role) opens widget
2. User types query: "What should I learn next?"
3. System retrieves user profile (skill gaps, progress)
4. System generates personalized answer
5. System generates recommendations
6. User sees personalized answer
7. User sees recommendations (courses, exercises)
8. User clicks recommendation
9. User navigates to recommended content

**Assertions:**
- ✅ Answer considers user's skill gaps
- ✅ Answer considers learning progress
- ✅ Recommendations are relevant
- ✅ Recommendations match user's profile
- ✅ Navigation works correctly

**File:** `tests/e2e/personalized-query-flow.spec.js`

---

### 3. Access Control Flow (E2E-003)

**Scenario:** User with restricted access receives filtered content

**Steps:**
1. User (learner role) opens widget
2. User types query about restricted content
3. System checks permissions (RBAC/ABAC)
4. System filters sources by permissions
5. System applies field-level masking
6. User sees filtered answer
7. User sees access denied message for restricted sources

**Assertions:**
- ✅ Restricted content is filtered
- ✅ Field-level masking is applied
- ✅ Access denied messages are clear
- ✅ Audit log entry created

**File:** `tests/e2e/access-control-flow.spec.js`

---

### 4. Assessment Support Flow (E2E-004)

**Scenario:** Learner requests hint during assessment

**Steps:**
1. User is in assessment interface
2. User requests hint for question
3. System generates contextual hint
4. User sees hint (no direct answer)
5. User sees related concepts
6. User sees related content links

**Assertions:**
- ✅ Hint is contextual
- ✅ No direct answer revealed
- ✅ Related concepts are relevant
- ✅ Content links work

**File:** `tests/e2e/assessment-support-flow.spec.js`

---

### 5. DevLab Support Flow (E2E-005)

**Scenario:** Learner requests technical support in DevLab

**Steps:**
1. User is in DevLab exercise
2. User encounters error
3. User requests technical support
4. System analyzes code and error
5. System generates explanation
6. System provides code examples
7. System suggests best practices
8. User sees technical support response

**Assertions:**
- ✅ Error explanation is clear
- ✅ Code examples are relevant
- ✅ Best practices are suggested
- ✅ Related resources are provided

**File:** `tests/e2e/devlab-support-flow.spec.js`

---

### 6. Multi-Tenant Isolation (E2E-006)

**Scenario:** Tenant A cannot access Tenant B data

**Steps:**
1. Tenant A user opens widget
2. Tenant A user queries
3. System returns Tenant A data only
4. Tenant B user opens widget
5. Tenant B user queries
6. System returns Tenant B data only
7. Verify no cross-tenant data leakage

**Assertions:**
- ✅ Tenant isolation is enforced
- ✅ No cross-tenant data access
- ✅ Queries return correct tenant data
- ✅ Vector embeddings are isolated

**File:** `tests/e2e/multi-tenant-isolation.spec.js`

---

### 7. Error Handling Flow (E2E-007)

**Scenario:** System handles errors gracefully

**Steps:**
1. User submits query
2. System encounters error (e.g., OpenAI API failure)
3. System shows error toast
4. User clicks retry
5. System retries query
6. System succeeds on retry

**Assertions:**
- ✅ Error is displayed clearly
- ✅ Retry button works
- ✅ Retry logic functions correctly
- ✅ User experience is not degraded

**File:** `tests/e2e/error-handling-flow.spec.js`

---

### 8. Real-time Updates Flow (E2E-008)

**Scenario:** Real-time message updates via Supabase

**Steps:**
1. User A opens widget
2. User A submits query
3. User B opens widget (same tenant)
4. System publishes message via Supabase
5. User B receives real-time update
6. User B sees new message

**Assertions:**
- ✅ Real-time updates work
- ✅ Supabase subscription works
- ✅ Redux store updates
- ✅ UI updates correctly

**File:** `tests/e2e/realtime-updates-flow.spec.js`

---

### 9. Theme Toggle Flow (E2E-009)

**Scenario:** User toggles between light and dark themes

**Steps:**
1. User opens widget (light theme)
2. User clicks theme toggle
3. Widget switches to dark theme
4. User closes and reopens widget
5. Widget remembers theme preference

**Assertions:**
- ✅ Theme toggle works
- ✅ Theme persists (localStorage)
- ✅ Colors are correct
- ✅ Accessibility maintained

**File:** `tests/e2e/theme-toggle-flow.spec.js`

---

### 10. Mobile Responsiveness Flow (E2E-010)

**Scenario:** Widget works correctly on mobile devices

**Steps:**
1. User opens widget on mobile (< 768px)
2. Widget expands to full screen
3. User interacts with widget
4. User closes widget
5. Widget minimizes to button

**Assertions:**
- ✅ Mobile layout works
- ✅ Touch interactions work
- ✅ Full screen behavior correct
- ✅ Responsive design maintained

**File:** `tests/e2e/mobile-responsiveness-flow.spec.js`

---

## Test Execution

### Playwright Configuration

**File:** `playwright.config.js`

```javascript
module.exports = {
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
};
```

### Test Execution

```bash
# Run all E2E tests
npx playwright test

# Run specific test
npx playwright test core-query-flow

# Run in UI mode
npx playwright test --ui

# Run in headed mode
npx playwright test --headed
```

---

## Test Data Setup

### E2E Test Data

**File:** `tests/e2e/fixtures/e2e-data.json`

**Data:**
- Test tenants
- Test users (all roles)
- Test queries
- Test vector embeddings
- Test knowledge graph
- Test access control rules

**Setup:**
```javascript
beforeAll(async () => {
  // Seed E2E test data
  await seedE2ETestData();
});
```

---

## Performance Validation

### E2E Performance Checks

Each E2E test validates:
- ✅ Response time < 3s (target)
- ✅ Page load < 2s
- ✅ No memory leaks
- ✅ Smooth animations

---

## Accessibility Testing

### E2E Accessibility Checks

**Tools:** axe-core, Playwright accessibility

**Checks:**
- ✅ Keyboard navigation
- ✅ Screen reader compatibility
- ✅ Color contrast (WCAG 2.1 AA)
- ✅ Focus management
- ✅ ARIA labels

---

## Test Coverage

### E2E Test Coverage

- **User Flows:** 10 main scenarios
- **Error Scenarios:** 3 error flows
- **Accessibility:** 5 accessibility checks
- **Performance:** Performance validation in all tests

**Coverage Target:** ≥70%

---

## Next Steps

1. ✅ E2E test plan created
2. ⏭️ Create regression test plan
3. ⏭️ Create smoke test plan
4. ⏭️ Create CI/CD configuration

---

**Status:** ✅ E2E Test Plan Complete






