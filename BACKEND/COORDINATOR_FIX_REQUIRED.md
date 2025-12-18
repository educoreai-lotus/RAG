# 🔴 Coordinator Fix Required - Critical Issue

## Problem Summary

Coordinator is **misinterpreting gRPC requests** and routing them back to RAG instead of to target microservices.

## What's Happening

1. **RAG sends gRPC request correctly:**
   ```json
   {
     "tenant_id": "test-tenant",
     "user_id": "test-user",
     "query_text": "show me my recent payments"
   }
   ```

2. **Coordinator receives it but uses wrong data:**
   - Uses path `/rag.v1.CoordinatorService/Route` as query text
   - Ignores the actual `query_text` field
   - Routes based on path instead of content

3. **Coordinator routes incorrectly:**
   - Routes to RAG (the requester!)
   - Should route to payment-related services

## Evidence from Logs

```
"path": "/rag.v1.CoordinatorService/Route"
"query": "POST request to /rag.v1.CoordinatorService/Route"  ← WRONG!
"primaryTarget": "rag-service"  ← WRONG!
"targetUrl": "https://rag-production-3a4c.up.railway.app/rag.v1.CoordinatorService/Route"  ← WRONG!
```

## What Needs to Be Fixed

### 1. Request Parsing (Critical)
Coordinator must extract `query_text` from the **request body**, not from the path:

```javascript
// WRONG (current):
const query = req.path; // "/rag.v1.CoordinatorService/Route"

// CORRECT:
const query = req.body.query_text; // "show me my recent payments"
```

### 2. Routing Logic (Critical)
Coordinator must **exclude the requester** from routing targets:

```javascript
// Exclude requester service
const filteredServices = targetServices.filter(
  service => service !== requesterServiceName
);

// RAG should never be a target
if (filteredServices.includes('rag-service')) {
  filteredServices = filteredServices.filter(s => s !== 'rag-service');
}
```

### 3. gRPC to HTTP Conversion (If applicable)
If Coordinator converts gRPC to HTTP internally, it must:
- Extract request body correctly
- Map gRPC fields properly
- Not use service path as query

## Impact

- ❌ Requests are being routed incorrectly
- ❌ RAG receives its own requests back (infinite loop potential)
- ❌ Target microservices never receive requests
- ❌ System doesn't work as designed

## Priority

**CRITICAL** - This breaks the entire routing system.

## Testing After Fix

1. Send query: "show me my recent payments"
2. Check Coordinator logs:
   - Should see: `"query": "show me my recent payments"` ✅
   - Should route to: payment-related services ✅
   - Should NOT route to: `rag-service` ❌

## Status

- ✅ RAG is working correctly
- ❌ Coordinator needs fix
- ⏳ Waiting for Coordinator fix

---

**This is a Coordinator-side issue that needs to be fixed in the Coordinator codebase.**



