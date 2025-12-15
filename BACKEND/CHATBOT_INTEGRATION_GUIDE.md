# Chatbot Integration Guide for Microservices

**Version:** 1.0  
**Last Updated:** 2025-01-27

---

## 🎯 Overview

This guide explains how to integrate the EDUCORE chatbot into **any microservice** with **zero backend changes**. The chatbot supports **two modes**:

1. **SUPPORT Mode** - For DevLab and Assessment (forwards to microservice API)
2. **CHAT Mode** - For all other microservices (RAG-powered general chat)

---

## 📋 Quick Start

### Step 1: Add Script Tag

Add this to your microservice HTML (before `</body>`):

```html
<!-- Chatbot container -->
<div id="edu-bot-container"></div>

<!-- Load chatbot script -->
<script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>
```

**That's it!** No need to download files or install packages.

---

## 🔧 Step 2: Initialize Bot

After the user logs in, call `window.initializeEducoreBot()`:

### For SUPPORT Mode (DevLab, Assessment)

```javascript
// DevLab example
window.initializeEducoreBot({
  microservice: 'DEVLAB',  // Must be exactly 'DEVLAB' or 'ASSESSMENT'
  userId: user.id,
  token: userToken,
  tenantId: user.tenantId || 'devlab'
});

// Assessment example
window.initializeEducoreBot({
  microservice: 'ASSESSMENT',  // Must be exactly 'ASSESSMENT' or 'DEVLAB'
  userId: user.id,
  token: userToken,
  tenantId: user.tenantId || 'assessment'
});
```

### For CHAT Mode (All Other Microservices)

```javascript
// Course Builder example
window.initializeEducoreBot({
  microservice: 'COURSE_BUILDER',  // Any name (case-insensitive)
  userId: user.id,
  token: userToken,
  tenantId: user.tenantId || 'course-builder'
});

// Student Portal example
window.initializeEducoreBot({
  microservice: 'STUDENT_PORTAL',  // Any name
  userId: user.id,
  token: userToken,
  tenantId: user.tenantId || 'student-portal'
});

// Any other microservice
window.initializeEducoreBot({
  microservice: 'YOUR_MICROSERVICE_NAME',  // Any name
  userId: user.id,
  token: userToken,
  tenantId: user.tenantId || 'default'
});
```

---

## 🎨 Step 3: React Integration (Optional)

If you're using React, create a component:

```jsx
import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export function ChatbotWidget() {
  const { user, token } = useAuth();
  
  useEffect(() => {
    if (!user || !token) return;
    
    // Load bot.js if not already loaded
    if (!window.EDUCORE_BOT_LOADED) {
      const script = document.createElement('script');
      script.src = 'https://rag-production-3a4c.up.railway.app/embed/bot.js';
      script.async = true;
      document.head.appendChild(script);
      
      script.onload = () => {
        if (window.initializeEducoreBot) {
          window.initializeEducoreBot({
            microservice: 'YOUR_MICROSERVICE_NAME',  // SUPPORT or CHAT mode
            userId: user.id,
            token: token,
            tenantId: user.tenantId || 'default'
          });
        }
      };
    } else {
      // Bot already loaded, just initialize
      if (window.initializeEducoreBot) {
        window.initializeEducoreBot({
          microservice: 'YOUR_MICROSERVICE_NAME',
          userId: user.id,
          token: token,
          tenantId: user.tenantId || 'default'
        });
      }
    }
  }, [user, token]);
  
  return <div id="edu-bot-container"></div>;
}
```

---

## 🔍 How It Works

### Mode Detection

The chatbot automatically determines the mode based on the `microservice` parameter:

- **SUPPORT Mode**: `microservice === 'DEVLAB'` or `microservice === 'ASSESSMENT'`
  - Endpoint: `/api/devlab/support` or `/api/assessment/support`
  - Messages are forwarded to the microservice's own API
  
- **CHAT Mode**: Any other `microservice` value
  - Endpoint: `/api/v1/query`
  - Messages are processed by RAG (Retrieval-Augmented Generation)

### Backend URL Detection

The chatbot automatically detects the backend URL from the `bot.js` script source:

```javascript
// bot.js automatically sets:
window.EDUCORE_BACKEND_URL = "https://rag-production-3a4c.up.railway.app"
```

**No need to configure `VITE_API_BASE_URL`!**

---

## 🌐 CORS Configuration

### Automatic CORS Support

The backend **automatically allows** all Vercel preview URLs (`*.vercel.app`), so **no backend changes needed** for new microservices!

### Manual CORS Configuration (Optional)

If your microservice is **not** deployed on Vercel, add your origin to `BACKEND/src/index.js`:

```javascript
const allowedOrigins = [
  // ... existing origins
  'https://your-microservice.com',  // Add your domain
];
```

Or set the `ALLOWED_ORIGINS` environment variable in Railway:

```
ALLOWED_ORIGINS=https://your-microservice.com,https://preview.your-microservice.com
```

---

## 📝 Configuration Options

### Required Parameters

- `microservice` (string) - Microservice identifier
  - SUPPORT mode: `'DEVLAB'` or `'ASSESSMENT'`
  - CHAT mode: Any other name (e.g., `'COURSE_BUILDER'`, `'STUDENT_PORTAL'`)
  
- `userId` (string) - Authenticated user ID
  
- `token` (string) - JWT or session token

### Optional Parameters

- `tenantId` (string) - Tenant ID (default: `'default'`)
- `container` (string) - CSS selector for mount point (default: `'#edu-bot-container'`)

---

## 🧪 Testing

### 1. Verify Bot Loads

Open browser console and check:

```javascript
// Should see:
// "EDUCORE Bot: Embedding script loaded. Call window.initializeEducoreBot(config) to start."

// Should be available:
window.initializeEducoreBot  // Should be a function
window.EDUCORE_BACKEND_URL   // Should be set to backend URL
```

### 2. Test Initialization

```javascript
// In browser console:
window.initializeEducoreBot({
  microservice: 'YOUR_MICROSERVICE_NAME',
  userId: 'test-user-123',
  token: 'test-token',
  tenantId: 'test-tenant'
});

// Should see widget appear
```

### 3. Test Messages

- Send a message in the widget
- Check browser Network tab for API calls
- Verify correct endpoint is called:
  - SUPPORT mode → `/api/{microservice}/support`
  - CHAT mode → `/api/v1/query`

---

## 🐛 Troubleshooting

### Bot Widget Not Appearing

1. **Check container exists:**
   ```javascript
   document.querySelector('#edu-bot-container')  // Should not be null
   ```

2. **Check bot.js loaded:**
   ```javascript
   window.EDUCORE_BOT_LOADED  // Should be true
   ```

3. **Check initialization called:**
   ```javascript
   // Make sure you called window.initializeEducoreBot() after login
   ```

### CORS Errors

1. **Check origin is allowed:**
   - Vercel previews (`*.vercel.app`) are automatically allowed
   - Other domains need to be added to `ALLOWED_ORIGINS`

2. **Check OPTIONS request:**
   ```bash
   curl -X OPTIONS https://rag-production-3a4c.up.railway.app/api/v1/query \
     -H "Origin: https://your-microservice.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -v
   ```

### 405 Method Not Allowed

- Make sure you're using `POST` method (not `GET`)
- Check endpoint path is correct:
  - SUPPORT mode: `/api/devlab/support` or `/api/assessment/support`
  - CHAT mode: `/api/v1/query`

### 500 Internal Server Error

- Check Railway logs for detailed error messages
- Verify `userId`, `token`, and `tenantId` are provided
- Check backend is running and accessible

---

## 📚 Examples

### Plain HTML

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Microservice</title>
</head>
<body>
  <h1>Welcome to My Microservice</h1>
  
  <!-- Your content -->
  
  <!-- Chatbot container -->
  <div id="edu-bot-container"></div>
  
  <!-- Load chatbot script -->
  <script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>
  
  <!-- Initialize after login -->
  <script>
    function initChatbot() {
      const user = getCurrentUser(); // Your auth function
      
      if (user && user.token) {
        if (window.initializeEducoreBot) {
          window.initializeEducoreBot({
            microservice: 'YOUR_MICROSERVICE_NAME',
            userId: user.id,
            token: user.token,
            tenantId: user.tenantId || 'default'
          });
        } else {
          setTimeout(initChatbot, 100); // Retry if bot.js not loaded yet
        }
      }
    }
    
    // Initialize after page loads
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initChatbot);
    } else {
      initChatbot();
    }
  </script>
</body>
</html>
```

### Vue.js

```vue
<template>
  <div id="app">
    <!-- Your content -->
    <div id="edu-bot-container"></div>
  </div>
</template>

<script>
import { onMounted } from 'vue';
import { useAuthStore } from './stores/auth';

export default {
  setup() {
    const authStore = useAuthStore();
    
    onMounted(() => {
      if (!authStore.user || !authStore.token) return;
      
      if (window.initializeEducoreBot) {
        window.initializeEducoreBot({
          microservice: 'YOUR_MICROSERVICE_NAME',
          userId: authStore.user.id,
          token: authStore.token,
          tenantId: authStore.user.tenantId || 'default'
        });
      } else {
        const script = document.createElement('script');
        script.src = 'https://rag-production-3a4c.up.railway.app/embed/bot.js';
        script.async = true;
        script.onload = () => {
          if (window.initializeEducoreBot) {
            window.initializeEducoreBot({
              microservice: 'YOUR_MICROSERVICE_NAME',
              userId: authStore.user.id,
              token: authStore.token,
              tenantId: authStore.user.tenantId || 'default'
            });
          }
        };
        document.head.appendChild(script);
      }
    });
  }
};
</script>
```

---

## ✅ Checklist

Before deploying, verify:

- [ ] Bot script loads (`bot.js` accessible)
- [ ] Container exists (`#edu-bot-container` in DOM)
- [ ] Initialization called after login
- [ ] Correct `microservice` parameter (SUPPORT or CHAT mode)
- [ ] `userId`, `token`, and `tenantId` provided
- [ ] Widget appears on page
- [ ] Messages send successfully
- [ ] No CORS errors in console
- [ ] No 405/500 errors in Network tab

---

## 🎯 Summary

**To integrate the chatbot:**

1. ✅ Add `<div id="edu-bot-container"></div>`
2. ✅ Add `<script src="...bot.js"></script>`
3. ✅ Call `window.initializeEducoreBot({ microservice: '...', ... })`
4. ✅ **That's it!** No backend changes needed.

**The chatbot automatically:**
- Detects backend URL
- Chooses correct endpoint (SUPPORT vs CHAT)
- Handles CORS
- Adds auth headers
- Displays widget

---

**Document Maintained By:** RAG Microservice Team

