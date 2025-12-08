# Comprehensive Report: Failing Unit Tests Analysis

**Generated:** 2025-12-07  
**Total Failing Test Files:** 5  
**Total Failing Tests:** ~124 tests  
**Root Cause:** Jest ES Modules Mocking Issues

---

## Executive Summary

All 5 failing test files share the same root cause: **Jest mocks created in factory functions are not being recognized as proper Jest mock functions** when imported in ES modules. The mocks are created with `jest.fn()` but lose their mock properties (`mockReset`, `mockResolvedValue`, etc.) during import.

---

## A) Test File Analysis

### 1. coordinatorResponseParser.service.test.js

**File Path:** `BACKEND/tests/unit/services/coordinatorResponseParser.service.test.js`

**Source File Tested:** `BACKEND/src/services/coordinatorResponseParser.service.js`

**Tests Failed:** ~40 tests

**Error Pattern:**
```
TypeError: jest.mocked(...).mockReset is not a function
TypeError: logger.debug.mockReset is not a function
```

**Dependencies Mocked:**
- `logger.util.js` (logger.debug, logger.warn, logger.error)

**Current Mock Setup:**
```javascript
jest.mock('../../../src/utils/logger.util.js', () => {
  const { jest } = require('@jest/globals');
  return {
    logger: {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  };
});
```

**Why Mocks Don't Work:**
The `jest.fn()` instances created in the factory function are not being properly hoisted or recognized as Jest mocks when imported. When the test tries to call `logger.debug.mockReset()`, it fails because `mockReset` doesn't exist on the imported function.

---

### 2. coordinator.client.test.js

**File Path:** `BACKEND/tests/unit/clients/coordinator.client.test.js`

**Source File Tested:** `BACKEND/src/clients/coordinator.client.js`

**Tests Failed:** ~30 tests

**Error Pattern:**
```
TypeError: createGrpcClient.mockReset is not a function
TypeError: grpcCall.mockReset is not a function
```

**Dependencies Mocked:**
- `grpcClient.util.js` (createGrpcClient, grpcCall)
- `logger.util.js` (logger.info, logger.warn, logger.error, logger.debug)

**Current Mock Setup:**
```javascript
jest.mock('../../../src/clients/grpcClient.util.js', () => {
  const { jest } = require('@jest/globals');
  return {
    createGrpcClient: jest.fn(),
    grpcCall: jest.fn(),
  };
});
```

**Why Mocks Don't Work:**
Same issue as above. The factory function creates `jest.fn()` instances, but they lose their mock properties during ES module import. The test file has defensive checks (`if (createGrpcClient && typeof createGrpcClient.mockReset === 'function')`) but these fail because the functions don't have mock methods.

---

### 3. grpcFallback.service.test.js

**File Path:** `BACKEND/tests/unit/services/grpcFallback.service.test.js`

**Source File Tested:** `BACKEND/src/services/grpcFallback.service.js`

**Tests Failed:** ~20 tests

**Error Pattern:**
```
TypeError: shouldCallCoordinator.mockReturnValue is not a function
TypeError: callCoordinatorRoute.mockResolvedValue is not a function
TypeError: processCoordinatorResponse.mockReturnValue is not a function
```

**Dependencies Mocked:**
- `communicationManager.service.js` (shouldCallCoordinator, callCoordinatorRoute, processCoordinatorResponse)
- `schemaInterpreter.service.js` (interpretNormalizedFields, createStructuredFields)
- `logger.util.js` (logger.info, logger.warn, logger.error, logger.debug)

**Current Mock Setup:**
```javascript
jest.mock('../../../src/communication/communicationManager.service.js', () => {
  const { jest } = require('@jest/globals');
  return {
    shouldCallCoordinator: jest.fn(),
    callCoordinatorRoute: jest.fn(),
    processCoordinatorResponse: jest.fn(),
  };
});
```

**Why Mocks Don't Work:**
Same ES modules mocking issue. The mocks are created but don't retain Jest mock functionality.

---

### 4. communicationManager.service.test.js

**File Path:** `BACKEND/tests/unit/communication/communicationManager.service.test.js`

**Source File Tested:** `BACKEND/src/communication/communicationManager.service.js`

**Tests Failed:** ~24 tests

**Error Pattern:**
```
TypeError: routeRequest.mockResolvedValue is not a function
TypeError: parseRouteResponse.mockReturnValue is not a function
TypeError: logger.info.toHaveBeenCalledWith is not a function
```

**Dependencies Mocked:**
- `coordinator.client.js` (routeRequest)
- `coordinatorResponseParser.service.js` (parseRouteResponse, extractBusinessData, getRoutingSummary)
- `logger.util.js` (logger.info, logger.warn, logger.error, logger.debug)

**Current Mock Setup:**
```javascript
jest.mock('../../../src/clients/coordinator.client.js', () => {
  const { jest } = require('@jest/globals');
  return {
    routeRequest: jest.fn(),
  };
});
```

**Why Mocks Don't Work:**
Same ES modules mocking issue. Additionally, tests expect mocks to work with Jest matchers like `toHaveBeenCalledWith`, but the imported functions are not recognized as mocks.

---

### 5. cache.util.test.js

**File Path:** `BACKEND/tests/unit/utils/cache.util.test.js`

**Source File Tested:** `BACKEND/src/utils/cache.util.js`

**Tests Failed:** ~5 tests

**Error Pattern:**
```
TypeError: redis.get.mockResolvedValue is not a function
TypeError: redis.setex.mockResolvedValue is not a function
TypeError: redis.del.mockResolvedValue is not a function
TypeError: redis.exists.mockResolvedValue is not a function
```

**Dependencies Mocked:**
- `redis.config.js` (redis.get, redis.setex, redis.del, redis.exists)

**Current Mock Setup:**
```javascript
jest.mock('../../../src/config/redis.config.js', () => {
  const { jest } = require('@jest/globals');
  return {
    redis: {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
    },
  };
});
```

**Why Mocks Don't Work:**
Same ES modules mocking issue. The nested object structure (`redis.get`) makes it even more complex, as the mock properties need to be preserved through object property access.

---

## B) Mocking Issues - Root Cause Analysis

### The Core Problem

**Jest ES Modules Mocking Limitation:**

When using `jest.mock()` with factory functions in ES modules:

1. **Factory functions execute** before imports are resolved
2. **`jest.fn()` instances are created** correctly
3. **But during ES module import**, Jest doesn't properly wrap these functions as mocks
4. **Result:** Functions lose their mock properties (`mockReset`, `mockResolvedValue`, `mockReturnValue`, etc.)

### Why `require('@jest/globals')` Doesn't Help

Using `require('@jest/globals')` in factory functions was an attempt to access `jest`, but:

- The `jest.fn()` instances are created correctly
- But Jest's ES module transformer doesn't recognize them as mocks
- The imported functions are plain functions, not Jest mock functions

### What Tests Expect vs What They Get

**Expected:**
```javascript
logger.debug.mockReset();           // ✅ Should work
logger.debug.mockReturnValue(...);  // ✅ Should work
expect(logger.debug).toHaveBeenCalledWith(...); // ✅ Should work
```

**Actual:**
```javascript
logger.debug.mockReset();           // ❌ TypeError: mockReset is not a function
logger.debug.mockReturnValue(...);  // ❌ TypeError: mockReturnValue is not a function
expect(logger.debug).toHaveBeenCalledWith(...); // ❌ Matcher error: not a mock function
```

---

## C) Code Snippets

### Mock Setup Pattern (All Files)

**Current Pattern (Not Working):**
```javascript
// MOCKS MUST BE FIRST - before any imports
jest.mock('../../../src/utils/logger.util.js', () => {
  const { jest } = require('@jest/globals');
  return {
    logger: {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  };
});

import { logger } from '../../../src/utils/logger.util.js';

describe('Test', () => {
  beforeEach(() => {
    logger.debug.mockReset(); // ❌ Fails: mockReset is not a function
  });
});
```

### Error Lines Examples

**coordinatorResponseParser.service.test.js:35**
```javascript
logger.debug.mockReset(); // TypeError: logger.debug.mockReset is not a function
```

**coordinator.client.test.js:51-58**
```javascript
if (createGrpcClient && typeof createGrpcClient.mockReset === 'function') {
  createGrpcClient.mockReset(); // Never executes because condition is false
}
```

**grpcFallback.service.test.js:78**
```javascript
shouldCallCoordinator.mockReturnValue(false); // TypeError: mockReturnValue is not a function
```

**communicationManager.service.test.js:191**
```javascript
routeRequest.mockResolvedValue(mockResponse); // TypeError: mockResolvedValue is not a function
```

**cache.util.test.js:35**
```javascript
redis.get.mockResolvedValue(JSON.stringify({ data: 'test' })); // TypeError: mockResolvedValue is not a function
```

### What Needs to Be Fixed

**Option 1: Use Manual Mocks (Recommended)**

Create `__mocks__` directories:

```
BACKEND/
  src/
    utils/
      __mocks__/
        logger.util.js
    clients/
      __mocks__/
        grpcClient.util.js
        coordinator.client.js
    services/
      __mocks__/
        coordinatorResponseParser.service.js
    communication/
      __mocks__/
        communicationManager.service.js
        schemaInterpreter.service.js
    config/
      __mocks__/
        redis.config.js
```

**Option 2: Use `jest.spyOn()` After Import**

```javascript
import { logger } from '../../../src/utils/logger.util.js';

describe('Test', () => {
  beforeEach(() => {
    jest.spyOn(logger, 'debug').mockReset();
    jest.spyOn(logger, 'warn').mockReset();
  });
});
```

**Option 3: Use `jest.createMockFromModule()`**

```javascript
jest.mock('../../../src/utils/logger.util.js');
import loggerModule from '../../../src/utils/logger.util.js';
const logger = jest.createMockFromModule('../../../src/utils/logger.util.js');
```

---

## D) Summary Table

| Test File | Tests Source | Dependencies Mocked | Error | Fix Difficulty |
|-----------|--------------|---------------------|-------|----------------|
| coordinatorResponseParser.service.test.js | `coordinatorResponseParser.service.js` | logger.util.js | `mockReset is not a function` | **Medium** |
| coordinator.client.test.js | `coordinator.client.js` | grpcClient.util.js, logger.util.js | `mockReset is not a function` | **Medium** |
| grpcFallback.service.test.js | `grpcFallback.service.js` | communicationManager.service.js, schemaInterpreter.service.js, logger.util.js | `mockReturnValue is not a function` | **Medium** |
| communicationManager.service.test.js | `communicationManager.service.js` | coordinator.client.js, coordinatorResponseParser.service.js, logger.util.js | `mockResolvedValue is not a function` | **Medium** |
| cache.util.test.js | `cache.util.js` | redis.config.js | `mockResolvedValue is not a function` | **Easy** |

**Difficulty Assessment:**
- **Easy:** Simple mock structure, few dependencies
- **Medium:** Multiple dependencies, complex mock setup
- **Hard:** Would require major refactoring

---

## E) Recommendations

### Option 1: Manual Mocks (Best Long-term Solution) ⭐

**Pros:**
- Works reliably with ES modules
- Clean separation of concerns
- Easy to maintain
- Follows Jest best practices

**Cons:**
- Requires creating `__mocks__` directories
- Initial setup time: ~2-3 hours

**Implementation:**
1. Create `__mocks__` directories for each mocked module
2. Create mock implementations using `jest.fn()`
3. Update test files to use `jest.mock()` without factory functions
4. Jest will automatically use manual mocks

**Estimated Time:** 2-3 hours

---

### Option 2: Use `jest.spyOn()` After Import (Quick Fix)

**Pros:**
- Minimal code changes
- Works with ES modules
- Quick to implement

**Cons:**
- Requires importing actual modules (not ideal for unit tests)
- More verbose test setup
- May have side effects from real module execution

**Implementation:**
```javascript
import { logger } from '../../../src/utils/logger.util.js';

beforeEach(() => {
  jest.spyOn(logger, 'debug').mockReset();
  jest.spyOn(logger, 'warn').mockReset();
});
```

**Estimated Time:** 1-2 hours

---

### Option 3: Continue-on-Error (Not Recommended)

**Pros:**
- No code changes needed
- CI/CD continues

**Cons:**
- Tests don't actually run
- False sense of security
- Technical debt accumulates

**Implementation:**
Add to GitHub Actions workflow:
```yaml
- name: Run tests
  run: npm run test:unit
  continue-on-error: true
```

**Estimated Time:** 5 minutes

---

### Option 4: Refactor All Tests (Overkill)

**Pros:**
- Complete solution
- Best practices

**Cons:**
- Days of work
- High risk of introducing bugs
- Not necessary for this issue

**Estimated Time:** 3-5 days

---

## Final Recommendation

**Use Option 1: Manual Mocks**

1. **Create manual mocks** for all dependencies
2. **Update test files** to remove factory functions
3. **Test incrementally** - fix one file at a time
4. **Verify** each fix before moving to the next

**Priority Order:**
1. `cache.util.test.js` (easiest, fewest dependencies)
2. `coordinatorResponseParser.service.test.js` (simple logger mock)
3. `coordinator.client.test.js` (two dependencies)
4. `communicationManager.service.test.js` (multiple dependencies)
5. `grpcFallback.service.test.js` (most complex, depends on others)

**Expected Outcome:**
- All 124 tests passing
- Reliable test suite
- Maintainable mocking strategy
- ~2-3 hours total work

---

## Next Steps

1. **Create manual mock for `logger.util.js`** (used by all tests)
2. **Create manual mock for `redis.config.js`**
3. **Fix `cache.util.test.js`** first (simplest)
4. **Continue with other test files** in priority order
5. **Run full test suite** to verify all fixes

---

## Appendix: Manual Mock Example

**File:** `BACKEND/src/utils/__mocks__/logger.util.js`

```javascript
import { jest } from '@jest/globals';

export const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};
```

**Usage in Test:**
```javascript
jest.mock('../../../src/utils/logger.util.js'); // No factory function needed!

import { logger } from '../../../src/utils/logger.util.js';

describe('Test', () => {
  beforeEach(() => {
    logger.debug.mockReset(); // ✅ Works!
  });
});
```

---

**Report Generated:** 2025-12-07  
**Status:** Ready for Implementation

