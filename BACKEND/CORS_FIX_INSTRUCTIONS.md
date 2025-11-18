# CORS Fix Instructions - Step by Step

## Current Status

✅ **The code is already fixed!** The backend now supports multiple CORS origins.

The issue is that the `FRONTEND_VERCEL_URL` environment variable is not set in Railway, so your Vercel URL is not in the allowed origins list.

---

## What Was Changed in the Code

### File: `BACKEND/src/index.js`

**Before:**
```javascript
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200,
};
```

**After:**
```javascript
// Support multiple origins (localhost for dev, Vercel for production)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  process.env.FRONTEND_VERCEL_URL,
].filter(Boolean); // Remove null/undefined values

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Log for debugging
      logger.warn('CORS blocked origin:', origin);
      logger.info('Allowed origins:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
```

### Key Changes:

1. ✅ **Multiple Origins Support** - Now supports an array of allowed origins
2. ✅ **Dynamic Origin Checking** - Uses a function to check if origin is allowed
3. ✅ **Environment Variable Support** - Reads `FRONTEND_VERCEL_URL` from environment
4. ✅ **Development Origins** - Keeps localhost URLs (5173, 3000, 5174) for development
5. ✅ **Logging** - Logs blocked origins and allowed origins list for debugging
6. ✅ **Credentials** - Maintains `credentials: true` for cookie/auth support
7. ✅ **Flexible** - Easy to add more origins in the future

---

## What You Need to Do

### Step 1: Set Environment Variable in Railway

1. Go to **Railway Dashboard**
2. Select your **Backend Service** (the one running on Railway)
3. Click on **Variables** tab
4. Click **+ New Variable**
5. Add:
   - **Name:** `FRONTEND_VERCEL_URL`
   - **Value:** `https://rag-microservice-psi.vercel.app`
6. Click **Add** or **Save**

### Step 2: Redeploy

Railway should automatically redeploy when you add a variable. If not:
1. Go to **Deployments** tab
2. Click **Redeploy** or wait for auto-deploy

### Step 3: Verify

After redeploy, check the logs:

**Expected log output:**
```
info: CORS allowed origins: http://localhost:5173, http://localhost:3000, http://localhost:5174, https://rag-microservice-psi.vercel.app
```

If you see your Vercel URL in the list → **CORS is fixed!** ✅

---

## Environment Variables Reference

### Required for Production:
```env
FRONTEND_VERCEL_URL=https://rag-microservice-psi.vercel.app
```

### Optional (for local development):
```env
FRONTEND_URL=http://localhost:5173
```

### Current Default Origins (always allowed):
- `http://localhost:5173` - Vite dev server
- `http://localhost:3000` - React dev server  
- `http://localhost:5174` - Vite alt port

---

## Testing

### Test from Browser:
1. Open your Vercel frontend: `https://rag-microservice-psi.vercel.app`
2. Open DevTools (F12) → Network tab
3. Try to make an API call
4. Should **NOT** see CORS error anymore

### Test from Railway Logs:
Look for:
- ✅ `CORS allowed origins: ... https://rag-microservice-psi.vercel.app` (success)
- ❌ `CORS blocked origin: https://rag-microservice-psi.vercel.app` (still not configured)

---

## Troubleshooting

### Problem: Still seeing CORS error after setting variable

**Check:**
1. ✅ Is `FRONTEND_VERCEL_URL` set correctly in Railway?
2. ✅ Does the value match exactly? (including `https://`)
3. ✅ Did you redeploy after adding the variable?
4. ✅ Check logs - is the Vercel URL in the allowed origins list?

### Problem: URL in logs doesn't match

**Solution:**
Make sure the URL in `FRONTEND_VERCEL_URL` matches **exactly** the origin in the error:
- Error says: `from origin 'https://rag-microservice-psi.vercel.app'`
- Variable should be: `FRONTEND_VERCEL_URL=https://rag-microservice-psi.vercel.app`

### Problem: Want to add more origins

**Solution:**
Add more environment variables or hardcode in `allowedOrigins` array:
```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
  process.env.FRONTEND_VERCEL_URL,
  'https://another-domain.com', // Add more here
].filter(Boolean);
```

---

## Summary

**The code is ready!** You just need to:

1. ✅ Set `FRONTEND_VERCEL_URL=https://rag-microservice-psi.vercel.app` in Railway
2. ✅ Redeploy
3. ✅ Verify in logs

That's it! 🎉



