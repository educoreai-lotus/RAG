# Frontend URL Debugging Guide

## Problem: Request Not Reaching Server

If you see 405 errors but **NO logs** in Railway for the request, the request is being blocked **BEFORE** it reaches Express.

## What We Added

### Frontend Logging
Every API request now logs:
```
🌐 FRONTEND API REQUEST:
  Base URL: https://devlab-backend-production-59bb.up.railway.app
  Endpoint: /api/devlab/support
  Full URL: https://devlab-backend-production-59bb.up.railway.app/api/devlab/support
  Method: POST
```

### Backend Logging
Every request logs Railway proxy headers:
```
🌍 RAILWAY REQUEST INFO:
  Original URL: /api/devlab/support
  Path: /devlab/support
  Method: POST
  X-Forwarded-For: ...
```

## How to Debug

### Step 1: Check Browser Console

Open browser DevTools → Console tab and look for:
```
🌐 Using VITE_API_BASE_URL: https://...
🌐 FRONTEND API REQUEST:
  Base URL: ...
  Endpoint: /api/devlab/support
  Full URL: ...
```

**Check:**
- Is the Base URL correct? (should be Railway URL without `/api`)
- Is the Full URL correct? (should end with `/api/devlab/support`)
- Is there a double `/api/api`? (WRONG!)

### Step 2: Check Browser Network Tab

1. Open DevTools → Network tab
2. Clear all requests
3. Try to use DevLab support
4. Find the failed request (should show 405)
5. Click on it and check:
   - **Request URL** - What's the exact URL?
   - **Request Method** - POST or OPTIONS?
   - **Status Code** - 405?
   - **Response Headers** - What does server return?

**Screenshot this and share!**

### Step 3: Test from Browser Console

Run this in browser console:

```javascript
// Check API URL configuration
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('window.location.origin:', window.location.origin);

// Test direct fetch
fetch('https://devlab-backend-production-59bb.up.railway.app/api/devlab/support', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'test', support_mode: 'DevLab' })
})
.then(r => {
  console.log('Response status:', r.status);
  return r.json();
})
.then(d => console.log('Success:', d))
.catch(e => console.error('Error:', e));
```

### Step 4: Check Railway Logs

After making a request, check Railway logs for:

**If you see:**
```
🌍 RAILWAY REQUEST INFO:
  Path: /devlab/support
  Method: POST
```
→ Request reached server! Check why it returns 405.

**If you DON'T see this:**
→ Request never reached server. Check:
1. Frontend URL construction
2. Railway proxy configuration
3. DNS/routing issues

## Common Issues

### Issue 1: Double /api

**Symptom:** URL looks like `...app/api/api/devlab/support`

**Cause:** `VITE_API_BASE_URL` includes `/api` AND endpoint starts with `/api`

**Fix:** 
- Set `VITE_API_BASE_URL` to `https://devlab-backend-production-59bb.up.railway.app` (NO `/api`)
- OR change endpoint to `/devlab/support` (NO `/api`)

### Issue 2: Wrong Base URL

**Symptom:** URL points to Vercel instead of Railway

**Cause:** `VITE_API_BASE_URL` not set, using `window.location.origin`

**Fix:** Set `VITE_API_BASE_URL` in Vercel environment variables

### Issue 3: Missing /api

**Symptom:** URL is `...app/devlab/support` (missing `/api`)

**Cause:** Base URL doesn't include `/api` and endpoint doesn't start with `/api`

**Fix:** Ensure endpoint starts with `/api`: `/api/devlab/support`

## Expected URL Construction

**Correct:**
```
Base URL: https://devlab-backend-production-59bb.up.railway.app
Endpoint: /api/devlab/support
Full URL: https://devlab-backend-production-59bb.up.railway.app/api/devlab/support ✅
```

**Wrong (double /api):**
```
Base URL: https://devlab-backend-production-59bb.up.railway.app/api
Endpoint: /api/devlab/support
Full URL: https://devlab-backend-production-59bb.up.railway.app/api/api/devlab/support ❌
```

**Wrong (missing /api):**
```
Base URL: https://devlab-backend-production-59bb.up.railway.app
Endpoint: /devlab/support
Full URL: https://devlab-backend-production-59bb.up.railway.app/devlab/support ❌
```

## Environment Variables

### In Vercel (Frontend)

Set:
```
VITE_API_BASE_URL=https://devlab-backend-production-59bb.up.railway.app
```

**NOT:**
```
VITE_API_BASE_URL=https://devlab-backend-production-59bb.up.railway.app/api ❌
```

## What to Share

If still having issues, share:

1. **Browser Console Output** - Copy the `🌐 FRONTEND API REQUEST` logs
2. **Network Tab Screenshot** - Show the failed request details
3. **Railway Logs** - Show if you see `🌍 RAILWAY REQUEST INFO`
4. **Vercel Environment Variables** - What is `VITE_API_BASE_URL` set to?

This will definitively show where the problem is!

