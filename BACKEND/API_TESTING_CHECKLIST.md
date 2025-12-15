# API Testing Checklist

Comprehensive testing checklist for all API endpoints to prevent 405 errors.

## Prerequisites

- Backend running on Railway or localhost:8080
- Frontend running on Vercel or localhost:5173
- API token for authentication
- Test user ID and tenant ID

## Testing Tools

- **Browser DevTools** - Network tab for checking requests
- **Postman** - For manual API testing
- **curl** - For command-line testing
- **Browser Console** - For frontend testing

---

## Test Categories

### 1. CORS Preflight (OPTIONS) Tests

Test that all endpoints properly handle OPTIONS requests:

```bash
# Test root endpoint
curl -X OPTIONS https://devlab-backend-production-59bb.up.railway.app/ \
  -H "Origin: https://rag-git-main-educoreai-lotus.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Test query endpoint
curl -X OPTIONS https://devlab-backend-production-59bb.up.railway.app/api/v1/query \
  -H "Origin: https://rag-git-main-educoreai-lotus.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Test support endpoints
curl -X OPTIONS https://devlab-backend-production-59bb.up.railway.app/api/devlab/support \
  -H "Origin: https://rag-git-main-educoreai-lotus.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

**Expected Results:**
- Status: 204 No Content
- Headers include: `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`

---

### 2. Method Validation Tests

Test that endpoints reject unsupported methods:

```bash
# Test GET on POST-only endpoint (should return 405)
curl -X GET https://devlab-backend-production-59bb.up.railway.app/api/v1/query \
  -H "Authorization: Bearer <token>" \
  -v

# Test POST on GET-only endpoint (should return 405)
curl -X POST https://devlab-backend-production-59bb.up.railway.app/api/v1/personalized/recommendations/user-123 \
  -H "Authorization: Bearer <token>" \
  -v

# Test PUT on endpoint that doesn't support it (should return 405)
curl -X PUT https://devlab-backend-production-59bb.up.railway.app/api/devlab/support \
  -H "Authorization: Bearer <token>" \
  -v
```

**Expected Results:**
- Status: 405 Method Not Allowed
- Response includes: `allowedMethods` array
- Error message explains which methods are allowed

---

### 3. Endpoint-Specific Tests

#### Root Endpoint

```bash
# GET /
curl https://devlab-backend-production-59bb.up.railway.app/

# OPTIONS /
curl -X OPTIONS https://devlab-backend-production-59bb.up.railway.app/ \
  -H "Origin: https://rag-git-main-educoreai-lotus.vercel.app"
```

**Expected:** 200 OK with API info

---

#### Health Check

```bash
# GET /health
curl https://devlab-backend-production-59bb.up.railway.app/health

# OPTIONS /health
curl -X OPTIONS https://devlab-backend-production-59bb.up.railway.app/health \
  -H "Origin: https://rag-git-main-educoreai-lotus.vercel.app"
```

**Expected:** 200 OK with health status

---

#### Authentication

```bash
# GET /auth/me
curl https://devlab-backend-production-59bb.up.railway.app/auth/me \
  -H "Authorization: Bearer <token>" \
  -H "X-User-Id: <userId>"

# OPTIONS /auth/me
curl -X OPTIONS https://devlab-backend-production-59bb.up.railway.app/auth/me \
  -H "Origin: https://rag-git-main-educoreai-lotus.vercel.app"
```

**Expected:** 200 OK with user info or 401 Unauthorized

---

#### Query Processing

```bash
# POST /api/v1/query
curl -X POST https://devlab-backend-production-59bb.up.railway.app/api/v1/query \
  -H "Authorization: Bearer <token>" \
  -H "X-User-Id: <userId>" \
  -H "X-Tenant-Id: <tenantId>" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is JavaScript?"}'

# OPTIONS /api/v1/query
curl -X OPTIONS https://devlab-backend-production-59bb.up.railway.app/api/v1/query \
  -H "Origin: https://rag-git-main-educoreai-lotus.vercel.app"
```

**Expected:** 200 OK with query response

---

#### Recommendations

```bash
# GET /api/v1/personalized/recommendations/:userId
curl "https://devlab-backend-production-59bb.up.railway.app/api/v1/personalized/recommendations/user-123?tenant_id=dev.educore.local" \
  -H "Authorization: Bearer <token>" \
  -H "X-User-Id: <userId>"

# OPTIONS /api/v1/personalized/recommendations/:userId
curl -X OPTIONS "https://devlab-backend-production-59bb.up.railway.app/api/v1/personalized/recommendations/user-123" \
  -H "Origin: https://rag-git-main-educoreai-lotus.vercel.app"
```

**Expected:** 200 OK with recommendations

---

#### DevLab Support

```bash
# POST /api/devlab/support
curl -X POST https://devlab-backend-production-59bb.up.railway.app/api/devlab/support \
  -H "Authorization: Bearer <token>" \
  -H "X-User-Id: <userId>" \
  -H "X-Tenant-Id: <tenantId>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I execute code?",
    "support_mode": "DevLab"
  }'

# OPTIONS /api/devlab/support
curl -X OPTIONS https://devlab-backend-production-59bb.up.railway.app/api/devlab/support \
  -H "Origin: https://rag-git-main-educoreai-lotus.vercel.app"
```

**Expected:** 200 OK with support response

---

### 4. Frontend Integration Tests

Test from browser console:

```javascript
// Test OPTIONS preflight
fetch('https://devlab-backend-production-59bb.up.railway.app/api/devlab/support', {
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://rag-git-main-educoreai-lotus.vercel.app'
  }
}).then(r => console.log('OPTIONS:', r.status));

// Test POST request
fetch('https://devlab-backend-production-59bb.up.railway.app/api/devlab/support', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>',
    'X-User-Id': '<userId>',
    'X-Tenant-Id': '<tenantId>'
  },
  body: JSON.stringify({
    query: 'test',
    support_mode: 'DevLab'
  })
}).then(r => r.json()).then(console.log);
```

---

### 5. Error Scenario Tests

#### Test Invalid Methods

```bash
# Should return 405
curl -X DELETE https://devlab-backend-production-59bb.up.railway.app/api/v1/query \
  -H "Authorization: Bearer <token>"

curl -X PATCH https://devlab-backend-production-59bb.up.railway.app/api/devlab/support \
  -H "Authorization: Bearer <token>"
```

**Expected:** 405 Method Not Allowed with clear error message

#### Test Invalid Routes

```bash
# Should return 404
curl https://devlab-backend-production-59bb.up.railway.app/api/invalid/route
```

**Expected:** 404 Not Found

---

## Automated Testing Script

Create a test script to run all tests:

```bash
#!/bin/bash

BASE_URL="https://devlab-backend-production-59bb.up.railway.app"
ORIGIN="https://rag-git-main-educoreai-lotus.vercel.app"

echo "Testing CORS Preflight..."
curl -X OPTIONS "$BASE_URL/api/devlab/support" \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -w "\nStatus: %{http_code}\n" \
  -s -o /dev/null

echo "Testing POST request..."
curl -X POST "$BASE_URL/api/devlab/support" \
  -H "Content-Type: application/json" \
  -H "Origin: $ORIGIN" \
  -d '{"query":"test","support_mode":"DevLab"}' \
  -w "\nStatus: %{http_code}\n" \
  -s

echo "Testing invalid method (should return 405)..."
curl -X GET "$BASE_URL/api/devlab/support" \
  -H "Origin: $ORIGIN" \
  -w "\nStatus: %{http_code}\n" \
  -s
```

---

## Checklist Summary

- [ ] All endpoints respond to OPTIONS requests with 204
- [ ] All endpoints return proper CORS headers
- [ ] Invalid methods return 405 with clear error message
- [ ] Invalid routes return 404
- [ ] All POST endpoints accept JSON bodies
- [ ] All GET endpoints accept query parameters
- [ ] Authentication headers are properly validated
- [ ] Frontend can make requests without CORS errors
- [ ] No 405 errors in production logs
- [ ] All endpoints logged correctly

---

## Monitoring

After deployment, monitor:

1. **Railway Logs** - Check for 405 errors
2. **Browser Console** - Check for CORS errors
3. **Network Tab** - Verify request/response headers
4. **Error Tracking** - Monitor error rates

---

## Troubleshooting

### If 405 errors persist:

1. Check route registration order in `index.js`
2. Verify middleware chain order
3. Check CORS configuration
4. Review request logs for method/path mismatches
5. Verify frontend is using correct HTTP methods

### Common Issues:

- **Route not found**: Check route path matches exactly
- **Method not allowed**: Verify route supports the method
- **CORS error**: Check origin is in allowed list
- **Preflight fails**: Verify OPTIONS handler exists

