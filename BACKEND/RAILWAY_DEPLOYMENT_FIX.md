# Railway Deployment Fix - CORS and Server Issues

## Issues Fixed

### 1. ✅ CORS Configuration
- **Problem**: Frontend at `https://rag-git-main-educoreai-lotus.vercel.app` was blocked by CORS
- **Solution**: Updated CORS to support multiple origins and added better logging
- **Files Changed**: `BACKEND/src/index.js`

### 2. ✅ Server Binding
- **Problem**: Server wasn't binding to `0.0.0.0`, causing Railway to fail health checks
- **Solution**: Server now binds to `0.0.0.0` by default (configurable via `HOST` env var)
- **Files Changed**: `BACKEND/src/index.js`

### 3. ✅ Missing /auth/me Endpoint
- **Problem**: Frontend was calling `/auth/me` but endpoint didn't exist, causing 404 errors
- **Solution**: Created `/auth/me` endpoint that returns user info from request headers
- **Files Created**: 
  - `BACKEND/src/controllers/auth.controller.js`
  - `BACKEND/src/routes/auth.routes.js`

### 4. ✅ Server Startup
- **Problem**: Server might not start properly after migrations
- **Solution**: Improved error handling and logging in startup script
- **Files Changed**: `BACKEND/scripts/start-with-migrations.js`, `BACKEND/src/index.js`

### 5. ✅ Error Handling
- **Problem**: Unhandled errors could crash the server
- **Solution**: Added comprehensive error handling for uncaught exceptions and unhandled rejections
- **Files Changed**: `BACKEND/src/index.js`

## Railway Environment Variables

Add these environment variables in Railway Dashboard → Your Service → Variables:

### Required Variables

```env
# Database
DATABASE_URL=postgresql://...?sslmode=require

# OpenAI (if using embeddings/LLM)
OPENAI_API_KEY=sk-...

# Port (Railway sets this automatically, but you can override)
PORT=3000

# Host (defaults to 0.0.0.0, usually don't need to set)
# HOST=0.0.0.0
```

### CORS Configuration

**Option 1: Set specific frontend URL (Recommended)**
```env
FRONTEND_VERCEL_URL=https://rag-git-main-educoreai-lotus.vercel.app
```

**Option 2: Use FRONTEND_URL**
```env
FRONTEND_URL=https://rag-git-main-educoreai-lotus.vercel.app
```

**Option 3: Allow all Vercel deployments (for development/testing)**
```env
ALLOW_ALL_VERCEL=true
```

### Optional Variables

```env
# Node environment
NODE_ENV=production

# Skip migrations if already applied (faster startup)
SKIP_MIGRATIONS=false

# Logging
LOG_LEVEL=info
LOG_PRETTY=false

# Other service URLs
COORDINATOR_URL=coordinator
COORDINATOR_GRPC_PORT=50051
```

## Verification Steps

### 1. Check Server is Running
After deployment, check Railway logs for:
```
✅ Server running on 0.0.0.0:PORT
CORS allowed origins: ...
```

### 2. Test Health Endpoint
```bash
curl https://rag-production-3a4c.up.railway.app/health
```

Should return:
```json
{
  "status": "ok",
  "service": "rag-microservice",
  "timestamp": "...",
  "dependencies": {...}
}
```

### 3. Test CORS
From browser console on your Vercel frontend:
```javascript
fetch('https://rag-production-3a4c.up.railway.app/health', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

Should **NOT** show CORS error.

### 4. Test /auth/me Endpoint
```bash
curl https://rag-production-3a4c.up.railway.app/auth/me
```

Should return:
```json
{
  "userId": null,
  "token": null,
  "tenantId": "default",
  "authenticated": false,
  "message": "No authentication information provided"
}
```

### 5. Test /api/v1/query Endpoint
```bash
curl -X POST https://rag-production-3a4c.up.railway.app/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'
```

Should return a query response (or error if database not configured).

## Common Issues

### Issue: Still getting CORS errors

**Check:**
1. Railway logs show the frontend URL in "CORS allowed origins"
2. `FRONTEND_VERCEL_URL` or `FRONTEND_URL` is set correctly in Railway
3. Frontend is using the correct backend URL

**Solution:**
- Add `ALLOW_ALL_VERCEL=true` temporarily to test
- Check Railway logs for "CORS blocked origin" messages
- Verify the exact frontend URL matches what's in allowed origins

### Issue: "Application failed to respond"

**Check:**
1. Railway logs show "✅ Server running on 0.0.0.0:PORT"
2. Health endpoint responds: `curl https://your-railway-url/health`
3. PORT environment variable is set (Railway usually sets this automatically)

**Solution:**
- Check Railway logs for errors
- Verify migrations completed successfully
- Ensure PORT is set (Railway should set this automatically)
- Check if server is binding to 0.0.0.0 (should see this in logs)

### Issue: /auth/me returns 404

**Check:**
1. Server logs show "Auth endpoint: http://0.0.0.0:PORT/auth/me"
2. Routes are loaded correctly

**Solution:**
- Verify `BACKEND/src/routes/auth.routes.js` exists
- Check server logs for route registration
- Restart Railway service

## Code Changes Summary

### Files Modified:
1. `BACKEND/src/index.js`
   - Updated CORS configuration
   - Changed server binding to `0.0.0.0`
   - Added `/auth` routes
   - Added error handling

2. `BACKEND/scripts/start-with-migrations.js`
   - Improved logging for server startup
   - Added environment variable logging

### Files Created:
1. `BACKEND/src/controllers/auth.controller.js`
   - Implements `/auth/me` endpoint

2. `BACKEND/src/routes/auth.routes.js`
   - Defines auth routes

## Next Steps

1. **Deploy to Railway:**
   - Push changes to your repository
   - Railway will automatically deploy

2. **Set Environment Variables:**
   - Go to Railway Dashboard → Your Service → Variables
   - Add `FRONTEND_VERCEL_URL` with your Vercel URL

3. **Verify Deployment:**
   - Check Railway logs for successful startup
   - Test endpoints using curl or browser

4. **Update Frontend:**
   - Ensure `VITE_API_BASE_URL` is set to your Railway URL in Vercel

## Testing Checklist

- [ ] Server starts successfully (check Railway logs)
- [ ] Health endpoint responds: `/health`
- [ ] Auth endpoint responds: `/auth/me`
- [ ] Query endpoint responds: `/api/v1/query`
- [ ] No CORS errors from frontend
- [ ] Frontend can make requests to backend
- [ ] Railway health checks pass

## Support

If issues persist:
1. Check Railway logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test endpoints directly with curl to isolate frontend vs backend issues
4. Check Railway service status and resource limits






