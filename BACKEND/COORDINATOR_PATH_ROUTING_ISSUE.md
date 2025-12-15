# Coordinator Path Routing Issue - Root Cause Analysis

## 🔴 The Problem

From Coordinator logs, I can see:

```
"path": "/rag.v1.CoordinatorService/Route"
"query": "POST request to /rag.v1.CoordinatorService/Route"
"userQuery": "POST request to /rag.v1.CoordinatorService/Route"
"primaryTarget": "rag-service"
"targetUrl": "https://rag-production-3a4c.up.railway.app/rag.v1.CoordinatorService/Route"
"reasoning": "The request is directed to the CoordinatorService, which is part of the RAG service's architecture."
```

## ❌ What's Wrong

1. **Coordinator is treating the gRPC path as query text:**
   - RAG sends gRPC request with path: `/rag.v1.CoordinatorService/Route`
   - Coordinator receives this and treats it as: `"POST request to /rag.v1.CoordinatorService/Route"`
   - Coordinator then routes this "query" to RAG (wrong!)

2. **Coordinator is routing back to RAG:**
   - `"primaryTarget": "rag-service"`
   - `"targetUrl": "https://rag-production-3a4c.up.railway.app/rag.v1.CoordinatorService/Route"`
   - This is incorrect - RAG is the requester, not a target!

3. **The AI routing is confused:**
   - Coordinator's AI sees the path and thinks it's a query about RAG service
   - It routes to RAG because it thinks the user wants to interact with RAG

## ✅ How It Should Work

### Correct Flow:
```
RAG → gRPC Call → Coordinator (receives RouteRequest) → Routes to OTHER services
```

1. **RAG sends gRPC request:**
   - Method: `Route`
   - Service: `rag.v1.CoordinatorService`
   - Request body contains: `tenant_id`, `user_id`, `query_text`, etc.

2. **Coordinator receives the request:**
   - Should extract `query_text` from the request body
   - Should NOT use the gRPC path as query text
   - Should analyze the actual `query_text` field

3. **Coordinator routes:**
   - Should route based on `query_text` content
   - Should route to OTHER microservices (assessment, devlab, etc.)
   - Should NOT route back to RAG

## 🔍 Root Cause

The issue is in Coordinator's request handling:

1. **Coordinator is using the HTTP path instead of the gRPC request body:**
   - When Coordinator receives the gRPC request, it's being converted to HTTP
   - The path `/rag.v1.CoordinatorService/Route` is being used as the query
   - The actual `query_text` from the request body is being ignored

2. **Coordinator's AI routing is analyzing the wrong thing:**
   - It's analyzing: "POST request to /rag.v1.CoordinatorService/Route"
   - Instead of analyzing the actual user query

## 💡 Solutions

### Solution 1: Fix Coordinator Request Parsing

Coordinator needs to:
1. Extract `query_text` from the gRPC request body (not from the path)
2. Use the actual query text for routing
3. Ignore the gRPC service path

**In Coordinator code:**
```javascript
// WRONG (current):
const query = req.path; // "/rag.v1.CoordinatorService/Route"

// CORRECT (should be):
const query = req.body.query_text; // Actual user query
```

### Solution 2: Exclude RAG from Routing Targets

Coordinator should never route to the requester service:

```javascript
// In routing logic:
const targetServices = await determineTargetServices(query);

// Exclude requester
const filteredServices = targetServices.filter(
  service => service !== requesterServiceName
);

// RAG should never be a target
if (filteredServices.includes('rag-service')) {
  filteredServices = filteredServices.filter(s => s !== 'rag-service');
}
```

### Solution 3: Fix gRPC to HTTP Conversion

If Coordinator is converting gRPC to HTTP internally, it needs to:
1. Extract the request body correctly
2. Map gRPC fields to HTTP request properly
3. Not use the gRPC service path as query text

## 🧪 How to Verify Fix

1. **Send query from RAG:**
   ```json
   {
     "tenant_id": "test-tenant",
     "user_id": "test-user",
     "query_text": "show me my recent payments"
   }
   ```

2. **Check Coordinator logs:**
   - Should see: `"query": "show me my recent payments"` ✅
   - Should NOT see: `"query": "POST request to /rag.v1.CoordinatorService/Route"` ❌
   - Should route to: `payment-service` or similar ✅
   - Should NOT route to: `rag-service` ❌

## 📋 What Needs to Be Fixed in Coordinator

1. **Request Parsing:**
   - Extract `query_text` from request body
   - Don't use gRPC path as query

2. **Routing Logic:**
   - Exclude requester service from targets
   - Route based on actual query content

3. **gRPC Handling:**
   - Properly parse gRPC request body
   - Map fields correctly

## 🎯 Expected Behavior

When RAG sends:
```json
{
  "tenant_id": "test-tenant",
  "user_id": "test-user",
  "query_text": "show me my recent payments"
}
```

Coordinator should:
1. ✅ Extract `query_text: "show me my recent payments"`
2. ✅ Analyze this query (not the path)
3. ✅ Route to payment-related services
4. ❌ NOT route to RAG

## 💡 Key Insight

**The problem is in Coordinator's request parsing, not in RAG!**

- RAG is sending the request correctly ✅
- Coordinator is misinterpreting the request ❌
- Coordinator needs to extract `query_text` from the body, not from the path

---

## 🔧 Immediate Action Required

**This needs to be fixed in Coordinator code:**
1. Fix request parsing to use `query_text` from body
2. Exclude RAG from routing targets
3. Test with actual queries

**RAG side is working correctly** - the issue is entirely in Coordinator's request handling and routing logic.

