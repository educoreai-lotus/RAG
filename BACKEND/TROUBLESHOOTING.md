# Troubleshooting Guide

## Common 404 Errors

### 1. "Failed to load resource: the server responded with a status of 404"

**Possible Causes:**

#### A. Backend Server Not Running
- **Symptom:** All API requests return 404
- **Solution:** 
  ```bash
  cd BACKEND
  npm install
  npm run dev
  ```
- **Verify:** Check `http://localhost:3000/health` in browser

#### B. Missing API Endpoint
- **Symptom:** Specific endpoint returns 404
- **Check:** Look at browser Network tab to see which URL is failing
- **Common missing endpoints:**
  - `/api/v1/query` - Should exist ✅
  - `/api/assessment/support` - Should exist ✅
  - `/api/devlab/support` - Should exist ✅
  - `/api/v1/personalized/recommendations/:userId` - Should exist ✅

#### C. Wrong Base URL
- **Symptom:** Frontend can't connect to backend
- **Check:** 
  - Frontend `.env` has `VITE_API_BASE_URL=http://localhost:3000`
  - Backend is running on port 3000
  - No firewall blocking the connection

#### D. CORS Issues
- **Symptom:** 404 or CORS error in console
- **Solution:** 
  - Check `FRONTEND_URL` in backend `.env`
  - Default: `http://localhost:5173`
  - Make sure it matches your frontend URL

### 2. Check Backend Logs

When backend starts, you should see:
```
Server running on port 3000
Health check: http://localhost:3000/health
Query endpoint: http://localhost:3000/api/v1/query
Assessment support: http://localhost:3000/api/assessment/support
DevLab support: http://localhost:3000/api/devlab/support
Recommendations: http://localhost:3000/api/v1/personalized/recommendations/:userId
```

If you see 404 warnings, they will show:
```
404 Not Found { method: 'GET', path: '/some/path', url: '/some/path' }
```

### 3. Test Endpoints Manually

#### Health Check
```bash
curl http://localhost:3000/health
```

#### Query Endpoint
```bash
curl -X POST http://localhost:3000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "tenant_id": "default", "context": {"user_id": "test"}}'
```

#### Assessment Support
```bash
curl -X POST http://localhost:3000/api/assessment/support \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "support_mode": "Assessment", "metadata": {"user_id": "test"}}'
```

### 4. Frontend Console Debugging

1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "Failed" or "404"
4. Check which request is failing
5. Look at:
   - Request URL
   - Request Method
   - Response status
   - Response body

### 5. Common Issues

#### Issue: Backend not starting
- **Check:** Node.js version (needs 20+)
- **Check:** Dependencies installed (`npm install`)
- **Check:** Port 3000 not in use
- **Check:** Environment variables set

#### Issue: OpenAI API errors
- **Check:** `OPENAI_API_KEY` set in backend `.env`
- **Check:** API key is valid
- **Check:** Internet connection

#### Issue: Redis connection errors
- **Note:** Redis is **OPTIONAL** - service works perfectly without it
- **What it does:** Redis is used for caching query responses (saves time and money)
- **Solution Options:**
  1. **Ignore it** (recommended) - Service works without Redis, just slower responses
  2. **Disable Redis:** Set `REDIS_ENABLED=false` in `.env` to stop connection attempts
  3. **Install Redis:** If you want caching, install Redis server
- **No action needed** - service will work without Redis
- **See:** `REDIS_EXPLANATION.md` for full details

### 6. Quick Fix Checklist

- [ ] Backend running on port 3000?
- [ ] Frontend `.env` has `VITE_API_BASE_URL=http://localhost:3000`?
- [ ] Backend `.env` has `FRONTEND_URL=http://localhost:5173`?
- [ ] All dependencies installed (`npm install` in both frontend and backend)?
- [ ] No firewall blocking localhost:3000?
- [ ] Check browser console for exact error message?
- [ ] Check backend logs for 404 warnings?

### 7. Still Having Issues?

1. Check backend logs for detailed error messages
2. Check browser Network tab for failed requests
3. Verify all endpoints are registered in `BACKEND/src/index.js`
4. Test endpoints manually with curl
5. Check CORS settings match frontend URL

