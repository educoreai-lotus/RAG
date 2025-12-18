# 405 Error Debugging Guide

## Current Status

✅ **Debug logging added** - Comprehensive logging middleware deployed  
⏳ **Waiting for Railway deployment** - Check if new code is deployed  
❌ **405 errors still occurring** - Need to identify root cause

---

## Critical Debugging Steps

### 1. Verify Deployment

**Check Railway Deployment:**
1. Go to Railway Dashboard → Your Service → Deployments
2. Check latest deployment commit hash
3. Compare with local: `git log -1 --format="%H"`
4. If mismatch, manually trigger redeploy

**Check if new code is running:**
- Look for `🔍 CRITICAL DEBUG` logs in Railway logs
- If you see these logs, new code is deployed
- If not, Railway hasn't deployed yet

---

### 2. Check Railway Logs

After deployment, look for these log patterns:

**Expected logs for EVERY request:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 [REQUEST] POST /api/devlab/support
🔍 [PATH] /devlab/support
🔍 [ORIGIN] https://rag-git-main-educoreai-lotus.vercel.app
🔍 [METHOD] POST
🔍 [STATUS] 405
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**If you see 405 errors, check:**
- What method is being used? (should be POST)
- What path is being requested? (should be `/devlab/support` or `/api/v1/query`)
- What origin is making the request?
- Are CORS headers being set?

---

### 3. Test Endpoints Manually

**Test OPTIONS (CORS preflight):**
```bash
curl -X OPTIONS \
  https://devlab-backend-production-59bb.up.railway.app/api/devlab/support \
  -H "Origin: https://rag-git-main-educoreai-lotus.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

**Expected:** 204 No Content with CORS headers

**Test POST:**
```bash
curl -X POST \
  https://devlab-backend-production-59bb.up.railway.app/api/devlab/support \
  -H "Content-Type: application/json" \
  -H "Origin: https://rag-git-main-educoreai-lotus.vercel.app" \
  -d '{"query":"test","support_mode":"DevLab"}' \
  -v
```

**Expected:** 200 OK or 400/403 with error message (NOT 405)

**Test Query Endpoint:**
```bash
curl -X POST \
  https://devlab-backend-production-59bb.up.railway.app/api/v1/query \
  -H "Content-Type: application/json" \
  -H "Origin: https://rag-git-main-educoreai-lotus.vercel.app" \
  -H "Authorization: Bearer <token>" \
  -H "X-User-Id: <userId>" \
  -H "X-Tenant-Id: <tenantId>" \
  -d '{"query":"test"}' \
  -v
```

**Expected:** 200 OK with query response (NOT 405)

---

### 4. Identify "Chat Query" Endpoint

The frontend error says "chat query" → 405. This is likely:

**Endpoint:** `/api/v1/query`  
**Method:** POST  
**Used by:** `useSubmitQueryMutation` hook  
**Location:** `FRONTEND/src/store/api/ragApi.js`

**Check frontend code:**
```javascript
// In FRONTEND/src/store/api/ragApi.js
submitQuery: builder.mutation({
  query: (body) => ({
    url: '/api/v1/query',  // ← This endpoint
    method: 'POST',         // ← This method
    body,
  }),
})
```

**Verify:**
- Is the frontend using the correct URL?
- Is it using POST method?
- Are headers being sent correctly?

---

### 5. Check Route Registration Order

**Current order in `index.js`:**
```javascript
// 1. CORS middleware
app.use(cors(corsOptions));

// 2. Global OPTIONS handler
app.use(globalOptionsHandler);

// 3. Critical debug logger
app.use(criticalDebugLogger);

// 4. Routes (order matters!)
app.use('/api/v1', queryRoutes);           // ← /api/v1/query
app.use('/api/v1', recommendationsRoutes);
app.use('/api/v1', knowledgeGraphRoutes);
app.use('/api/debug', diagnosticsRoutes);
app.use('/api/debug', contentRoutes);
app.use('/api', microserviceSupportRoutes); // ← /api/devlab/support
app.use('/auth', authRoutes);

// 5. Error handlers
app.use(methodNotAllowedHandler);  // ← Catches 405 errors
app.use(notFoundHandler);          // ← Catches 404 errors
app.use(errorHandler);              // ← Catches all other errors
```

**Important:** Routes are registered in this order. More specific routes (`/api/v1`, `/api/debug`) come before less specific (`/api`).

---

### 6. Verify Route Definitions

**`/api/devlab/support` route:**
- File: `BACKEND/src/routes/microserviceSupport.routes.js`
- Mounted at: `/api` in `index.js`
- Route path: `/devlab/support`
- Full path: `/api/devlab/support`
- Methods: POST, OPTIONS ✅

**`/api/v1/query` route:**
- File: `BACKEND/src/routes/query.routes.js`
- Mounted at: `/api/v1` in `index.js`
- Route path: `/query`
- Full path: `/api/v1/query`
- Methods: POST, OPTIONS ✅

---

### 7. Check CORS Configuration

**Current CORS config allows:**
- Origins: Vercel previews, localhost, specific domains
- Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
- Headers: Content-Type, Authorization, X-User-Id, X-Tenant-Id, X-Source, etc.

**If CORS is blocking:**
- Check Railway logs for CORS errors
- Verify origin is in allowed list
- Check if preflight (OPTIONS) is succeeding

---

### 8. Common Causes of 405 Errors

1. **Route not registered** - Check if route file is imported and mounted
2. **Wrong HTTP method** - Frontend using GET instead of POST
3. **Route path mismatch** - Frontend requesting wrong path
4. **Middleware blocking** - Middleware returning 405 before route handler
5. **Express route matching** - Route pattern doesn't match request path
6. **CORS preflight failing** - OPTIONS request failing, causing POST to fail

---

### 9. Debugging Checklist

- [ ] Railway deployment shows latest commit hash
- [ ] Railway logs show `🔍 CRITICAL DEBUG` messages
- [ ] OPTIONS request returns 204 (not 405)
- [ ] POST request shows in logs with correct method/path
- [ ] Route handlers are being called (check for route-specific logs)
- [ ] 405 handler is logging the error (check for "405 Method Not Allowed" logs)
- [ ] Frontend is using correct URL and method
- [ ] CORS headers are present in responses

---

### 10. Next Steps After Deployment

1. **Check Railway logs immediately** - Look for debug output
2. **Reproduce the error** - Make a request from frontend
3. **Find the log entry** - Look for the request that returns 405
4. **Check the details** - Method, path, origin, headers
5. **Compare with route definitions** - Does the request match any route?
6. **Check middleware chain** - Is request being blocked before routes?

---

## Expected Log Output

When a request comes in, you should see:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 [REQUEST] POST /api/devlab/support
🔍 [PATH] /devlab/support
🔍 [ORIGIN] https://rag-git-main-educoreai-lotus.vercel.app
🔍 [USER-AGENT] Mozilla/5.0...
🔍 [CONTENT-TYPE] application/json
🔍 [AUTHORIZATION] PRESENT
🔍 [X-USER-ID] user-123
🔍 [X-TENANT-ID] tenant-456
🔍 [X-SOURCE] MISSING
🔍 [QUERY] {}
🔍 [BODY] {"query":"test","support_mode":"DevLab"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then either:
- ✅ Route handler logs (success)
- ❌ 405 handler logs (method not allowed)
- ❌ 404 handler logs (route not found)

---

## If 405 Persists

1. **Share Railway logs** - Copy the debug output
2. **Share curl test results** - Show what manual tests return
3. **Check route registration** - Verify routes are mounted correctly
4. **Check Express version** - Ensure compatibility
5. **Check for route conflicts** - Multiple routes matching same path

---

## Quick Fixes to Try

### Fix 1: Ensure OPTIONS is handled first
```javascript
// In route file, OPTIONS must come BEFORE POST
router.options('/devlab/support', ...);
router.post('/devlab/support', ...);
```

### Fix 2: Add explicit method check
```javascript
router.all('/devlab/support', (req, res, next) => {
  if (req.method !== 'POST' && req.method !== 'OPTIONS') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  next();
});
```

### Fix 3: Check route mounting
```javascript
// In index.js - ensure route is mounted correctly
app.use('/api', microserviceSupportRoutes); // Not '/api/devlab'
```

---

## Contact Points

- **Railway Logs:** Railway Dashboard → Service → Logs
- **Git Commit:** Check latest commit hash matches deployment
- **Route Files:** `BACKEND/src/routes/*.js`
- **Middleware:** `BACKEND/src/middleware/*.js`
- **Main Server:** `BACKEND/src/index.js`

