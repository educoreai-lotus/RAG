# Simple Microservice Integration Guide

## TL;DR: Just Load bot.js - That's It!

If you load `bot.js`, everything works automatically. No environment variables needed!

---

## Minimal Setup (3 Steps)

### Step 1: Add Script Tag

Add this to your HTML `<head>` or before closing `</body>`:

```html
<script src="https://devlab-backend-production-59bb.up.railway.app/embed/bot.js"></script>
```

### Step 2: Add Container

Add this where you want the chatbot:

```html
<div id="edu-bot-container"></div>
```

### Step 3: Initialize After User Login

```javascript
// After user is authenticated
if (window.initializeEducoreBot) {
  window.initializeEducoreBot({
    microservice: 'DEVLAB',  // or 'ASSESSMENT', 'COURSE_BUILDER', etc.
    userId: user.id,
    token: user.token,
    tenantId: user.tenantId || 'dev.educore.local'
  });
}
```

**That's it!** ✅

---

## How It Works Automatically

1. **bot.js loads** → Detects backend URL from script src
2. **Sets `window.EDUCORE_BACKEND_URL`** → API services use this automatically
3. **No VITE_API_BASE_URL needed** → Works out of the box!

---

## Backend URL Detection

When you load:
```html
<script src="https://rag-backend.com/embed/bot.js"></script>
```

bot.js automatically:
- Extracts: `https://rag-backend.com`
- Sets: `window.EDUCORE_BACKEND_URL = 'https://rag-backend.com'`
- API calls use this automatically

**No configuration needed!**

---

## When You DO Need VITE_API_BASE_URL

Only in these cases:

1. **Different backend URL** - If bot.js is on one server but API is on another
2. **Not using bot.js** - If you're only using API calls without the chatbot widget
3. **Override auto-detection** - If you want to force a specific URL

---

## Priority Order

The system checks in this order:

1. ✅ `VITE_API_BASE_URL` env var (if set)
2. ✅ `window.EDUCORE_BACKEND_URL` (set by bot.js automatically)
3. ✅ Default Railway URL (fallback)

**Most microservices only need step 1-3 above - no env vars!**

---

## Example: DevLab Dashboard

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Load bot.js -->
  <script src="https://devlab-backend-production-59bb.up.railway.app/embed/bot.js"></script>
</head>
<body>
  <h1>DevLab Dashboard</h1>
  
  <!-- Your dashboard content -->
  
  <!-- Chatbot container -->
  <div id="edu-bot-container"></div>
  
  <script>
    // After user login
    function initChatbot() {
      const user = getCurrentUser(); // Your auth function
      
      if (user && window.initializeEducoreBot) {
        window.initializeEducoreBot({
          microservice: 'DEVLAB',
          userId: user.id,
          token: user.token,
          tenantId: user.tenantId
        });
      }
    }
    
    // Wait for page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initChatbot);
    } else {
      setTimeout(initChatbot, 100);
    }
  </script>
</body>
</html>
```

**No VITE_API_BASE_URL needed!** The bot.js script handles everything automatically.

---

## Verification

After loading bot.js, check browser console:

```
🤖 EDUCORE Bot: Backend URL detected: https://devlab-backend-production-59bb.up.railway.app
🤖 EDUCORE Bot: Microservices can use window.EDUCORE_BACKEND_URL for API calls
```

And API calls will show:
```
🌐 Using window.EDUCORE_BACKEND_URL (from bot.js): https://devlab-backend-production-59bb.up.railway.app
```

---

## Summary

✅ **Load bot.js** → Backend URL detected automatically  
✅ **No env vars needed** → Works out of the box  
✅ **Simple integration** → Just 3 steps  
✅ **Optional override** → Set VITE_API_BASE_URL only if needed

**Most microservices don't need to configure anything!**

