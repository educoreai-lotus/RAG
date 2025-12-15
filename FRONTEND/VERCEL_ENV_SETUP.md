# Vercel Environment Variables Setup

## Critical: Fix Frontend Calling Itself Instead of Backend

### Problem
The frontend was using `window.location.origin` (Vercel URL) instead of the backend URL (Railway), causing 405 errors.

### Solution
Set `VITE_API_BASE_URL` in Vercel environment variables to point to the Railway backend.

---

## Step-by-Step Setup

### 1. Go to Vercel Dashboard

1. Navigate to: https://vercel.com/dashboard
2. Select your project: `dev-lab-frontend` (or your frontend project name)
3. Go to **Settings** → **Environment Variables**

### 2. Add Environment Variable

**Variable Name:**
```
VITE_API_BASE_URL
```

**Value:**
```
https://devlab-backend-production-59bb.up.railway.app
```

**Important:** 
- ✅ DO include `https://`
- ✅ DO NOT include `/api` at the end
- ✅ Use the Railway backend URL, not Vercel URL

**Environments:**
- ✅ Production
- ✅ Preview
- ✅ Development (optional)

### 3. Save and Redeploy

1. Click **Save**
2. Go to **Deployments** tab
3. Click **Redeploy** on the latest deployment
4. Or push a new commit to trigger redeploy

---

## Verification

After deployment, check browser console:

**Before Fix (WRONG):**
```
🌐 Using window.location.origin: https://dev-lab-frontend.vercel.app
🌐 FRONTEND API REQUEST:
  Base URL: https://dev-lab-frontend.vercel.app  ← WRONG!
  Full URL: https://dev-lab-frontend.vercel.app/api/devlab/support  ← WRONG!
```

**After Fix (CORRECT):**
```
🌐 Using VITE_API_BASE_URL: https://devlab-backend-production-59bb.up.railway.app
🌐 Clean Backend URL: https://devlab-backend-production-59bb.up.railway.app
🌐 FRONTEND API REQUEST:
  Backend Base URL: https://devlab-backend-production-59bb.up.railway.app  ← CORRECT!
  Endpoint: /api/devlab/support
  Full URL: https://devlab-backend-production-59bb.up.railway.app/api/devlab/support  ← CORRECT!
```

---

## Alternative: Using VITE_API_URL

If you prefer to use `VITE_API_URL` instead:

**Variable Name:**
```
VITE_API_URL
```

**Value:**
```
https://devlab-backend-production-59bb.up.railway.app
```

The code supports both `VITE_API_BASE_URL` and `VITE_API_URL`.

---

## Fallback Behavior

If `VITE_API_BASE_URL` is NOT set:

- **Production (Vercel):** Uses default Railway backend URL
- **Development (localhost):** Uses `http://localhost:8080`

**Note:** The fallback ensures requests go to backend even if env var is missing, but it's better to set it explicitly.

---

## Troubleshooting

### Issue: Still seeing frontend URL in logs

**Solution:**
1. Verify environment variable is set in Vercel
2. Redeploy the frontend (env vars are baked at build time)
3. Clear browser cache
4. Check console logs again

### Issue: Double /api in URL

**Symptom:** URL looks like `...app/api/api/devlab/support`

**Solution:**
- Ensure `VITE_API_BASE_URL` does NOT end with `/api`
- The code automatically removes trailing `/api` if present

### Issue: CORS errors

**Solution:**
- Verify backend CORS allows Vercel origin
- Check Railway logs for CORS errors
- Ensure backend has `https://dev-lab-frontend.vercel.app` in allowed origins

---

## Quick Test

After setting the variable and redeploying, run in browser console:

```javascript
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
```

You should see the Railway backend URL, not the Vercel URL.

---

## Summary

✅ **Set:** `VITE_API_BASE_URL=https://devlab-backend-production-59bb.up.railway.app`  
✅ **Redeploy:** Frontend on Vercel  
✅ **Verify:** Console shows backend URL, not frontend URL  
✅ **Result:** 405 errors disappear, chatbot works!

