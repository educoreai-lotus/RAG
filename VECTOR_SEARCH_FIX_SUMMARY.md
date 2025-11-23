# Vector Search Fix Summary

## Problem
The test endpoint (`/api/debug/test-vector-search`) successfully found results with similarity score 0.857, but the production query endpoint (`/api/v1/query`) found no results and returned "No EDUCORE context found".

## Root Causes Identified

### 1. **Threshold Mismatch**
- **Test endpoint**: Used threshold `0.3` (from query parameter)
- **Production endpoint**: Used default threshold `0.5` (from `min_confidence` option)
- **Impact**: Production endpoint was too strict, filtering out valid results

### 2. **Overly Strict RBAC Filtering**
- **Issue**: Complex RBAC logic required BOTH a specific user name AND a specific query pattern (like "role", "who is", etc.)
- **Problem**: Queries like "What is Eden Levi's role?" should match, but the logic was too restrictive
- **Impact**: Valid user_profile results were being filtered out even when the query was about a specific user

### 3. **Inconsistent Fallback Thresholds**
- **Issue**: Fallback logic used threshold `0.2`, then tried `0.1` only for specific user queries
- **Problem**: Inconsistent behavior and unnecessary complexity

## Fixes Applied

### 1. Lowered Default Threshold
**File**: `BACKEND/src/services/queryProcessing.service.js`
- Changed default `min_confidence` from `0.5` to `0.25`
- This matches the test endpoint behavior better (test uses 0.3)
- **Line**: ~46

```javascript
// Before:
min_confidence = 0.5

// After:
min_confidence = 0.25  // Lowered to match test endpoint behavior
```

### 2. Simplified RBAC Filtering Logic
**File**: `BACKEND/src/services/queryProcessing.service.js`
- **Before**: Required both specific user name AND specific query pattern
- **After**: Only requires specific user name in query
- **Rationale**: If a query mentions a specific user (e.g., "Eden Levi"), it's clearly about that user, so allow user_profile results
- **Lines**: ~275-321

**Key Changes**:
- Removed complex `isSpecificUserQuery` logic that required both user name AND query pattern
- Simplified to: `allowUserProfiles = isAdmin || hasSpecificUserName`
- This is more permissive but still maintains privacy (no general "show all users" queries)

### 3. Unified Fallback Threshold
**File**: `BACKEND/src/services/queryProcessing.service.js`
- Changed fallback threshold from `0.2` to `0.1`
- Removed the "very low threshold (0.1)" fallback logic (now it's the main fallback)
- **Lines**: ~404-407

```javascript
// Before:
threshold: 0.2  // Then tried 0.1 only for specific user queries

// After:
threshold: 0.1  // Unified fallback threshold
```

### 4. Enhanced Logging
**File**: `BACKEND/src/services/queryProcessing.service.js`
- Added more detailed logging to RBAC filtering:
  - `tenant_domain` - to verify tenant resolution
  - `query_for_embedding_preview` - to see what query was used for embedding
  - `threshold_used` - to see what threshold was applied
  - `has_user_query_pattern` - to debug query pattern matching
- **Lines**: ~328-345

### 5. Added Documentation
**File**: `BACKEND/src/controllers/diagnostics.controller.js`
- Added comments explaining that test endpoint does NOT apply RBAC filtering
- This helps developers understand why test endpoint might show different results
- **Lines**: ~164-170

## Key Differences Between Endpoints

### Test Endpoint (`/api/debug/test-vector-search`)
- **Purpose**: Debugging and diagnostics
- **RBAC Filtering**: ❌ None (shows all results)
- **Default Threshold**: `0.3` (from query parameter)
- **Use Case**: Testing vector search functionality

### Production Endpoint (`/api/v1/query`)
- **Purpose**: Production query processing
- **RBAC Filtering**: ✅ Yes (filters user_profile based on user role and query content)
- **Default Threshold**: `0.25` (now matches test endpoint better)
- **Use Case**: Real user queries with security/privacy controls

## Expected Behavior After Fix

1. **Same Query, Similar Results**: Both endpoints should now return similar results for the same query (when RBAC allows)
2. **Better Recall**: Lower threshold (0.25) means more results will be found
3. **Simpler RBAC**: Queries mentioning specific users (e.g., "Eden Levi") will allow user_profile results
4. **Better Debugging**: Enhanced logging helps diagnose issues

## Testing Recommendations

1. **Test with same query on both endpoints**:
   ```bash
   # Test endpoint
   GET /api/debug/test-vector-search?query=What is Eden Levi's role?&tenant_id=default.local&threshold=0.3
   
   # Production endpoint
   POST /api/v1/query
   {
     "query": "What is Eden Levi's role?",
     "tenant_id": "default.local"
   }
   ```

2. **Check logs for**:
   - `threshold_used` - should be 0.25 (or lower if fallback triggered)
   - `has_specific_user_name` - should be `true` for "Eden Levi" queries
   - `allow_user_profiles` - should be `true` if query contains user name
   - `filtered_vectors` - should match `total_vectors` if RBAC allows

3. **Verify RBAC still works**:
   - Non-admin users should NOT see user_profile results for general queries (e.g., "show me all users")
   - Non-admin users SHOULD see user_profile results for specific user queries (e.g., "What is Eden Levi's role?")

## Files Modified

1. `BACKEND/src/services/queryProcessing.service.js`
   - Lowered default threshold from 0.5 to 0.25
   - Simplified RBAC filtering logic
   - Unified fallback threshold to 0.1
   - Enhanced logging

2. `BACKEND/src/controllers/diagnostics.controller.js`
   - Added documentation about RBAC filtering behavior

## Notes

- The test endpoint intentionally does NOT apply RBAC filtering for debugging purposes
- The production endpoint applies RBAC to maintain privacy and security
- Both endpoints now use similar thresholds, making results more comparable
- RBAC logic is simpler but still maintains privacy (no general user browsing)



