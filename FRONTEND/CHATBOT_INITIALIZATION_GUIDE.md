# Chatbot Initialization Guide for Microservices

## Problem: Chatbot Widget Not Appearing

If the chatbot script loads but the widget doesn't appear, `window.initializeEducoreBot()` is likely not being called.

## Quick Diagnosis

Run this in browser console:

```javascript
console.log('=== CHATBOT DEBUG ===');
console.log('1. Bot script loaded?', typeof window.initializeEducoreBot);
console.log('2. Bot function is:', window.initializeEducoreBot);
console.log('3. All bot-related window props:', 
  Object.keys(window).filter(k => k.toLowerCase().includes('bot') || k.toLowerCase().includes('educore'))
);
console.log('4. Bot DOM elements:', 
  document.querySelectorAll('[id*="bot"], [class*="bot"], [id*="chat"], [class*="chat"]')
);

// Check container
console.log('5. Container exists?', !!document.querySelector('#edu-bot-container'));
```

## Required Setup

### 1. Load Bot Script

Add this to your HTML `<head>` or before closing `</body>`:

```html
<!-- Load bot.js from RAG backend -->
<script src="https://devlab-backend-production-59bb.up.railway.app/embed/bot.js"></script>
```

### 2. Add Container Element

Add this where you want the chatbot to appear:

```html
<div id="edu-bot-container"></div>
```

### 3. Initialize After User Authentication

Call `window.initializeEducoreBot()` after the user is authenticated:

```javascript
// Example: In your Dashboard component or after login
useEffect(() => {
  const initChatbot = () => {
    // Get user info from your auth system
    const user = getCurrentUser(); // Your auth function
    
    if (!user || !user.id || !user.token) {
      console.warn('⚠️ User not authenticated. Chatbot will not initialize.');
      return;
    }

    // Wait for bot.js to load
    if (typeof window.initializeEducoreBot === 'function') {
      console.log('🤖 Initializing chatbot...');
      
      window.initializeEducoreBot({
        microservice: 'DEVLAB',  // or 'ASSESSMENT' for support mode
        userId: user.id,
        token: user.token,
        tenantId: user.tenantId || 'dev.educore.local',
        container: '#edu-bot-container'  // Optional, defaults to this
      });
      
      console.log('✅ Chatbot initialized!');
    } else {
      // Bot script not loaded yet, retry
      console.log('⏳ Waiting for bot script to load...');
      setTimeout(initChatbot, 500);
    }
  };

  // Wait for DOM and bot script
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
  } else {
    // Use a small delay to ensure bot.js has loaded
    setTimeout(initChatbot, 100);
  }
}, []);
```

## Using the Helper Script (Recommended)

### 1. Load Helper Script

```html
<script src="https://devlab-backend-production-59bb.up.railway.app/embed/chatbot-init-helper.js"></script>
```

### 2. Initialize with Helper

```javascript
window.initEducoreChatbot({
  microservice: 'DEVLAB',
  userId: user.id,
  token: user.token,
  tenantId: 'dev.educore.local'
});
```

The helper automatically:
- Waits for bot.js to load
- Retries if bot.js isn't ready
- Provides detailed logging
- Validates configuration

## Required Parameters

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `microservice` | ✅ Yes | Microservice identifier | `'DEVLAB'` or `'ASSESSMENT'` |
| `userId` | ✅ Yes | Authenticated user ID | `'user-123'` |
| `token` | ✅ Yes | JWT or session token | `'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'` |
| `tenantId` | ❌ No | Tenant ID (default: 'default') | `'dev.educore.local'` |
| `container` | ❌ No | Container selector (default: '#edu-bot-container') | `'#my-bot-container'` |

## Microservice Modes

### Support Mode (Assessment, DevLab)

```javascript
window.initializeEducoreBot({
  microservice: 'DEVLAB',  // or 'ASSESSMENT'
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId
});
```

- Messages forwarded to microservice API (`/api/devlab/support` or `/api/assessment/support`)
- General chat disabled
- Focused on microservice-specific help

### Chat Mode (All Others)

```javascript
window.initializeEducoreBot({
  microservice: 'COURSE_BUILDER',  // or any other name
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId
});
```

- Messages sent to RAG API (`/api/v1/query`)
- Uses knowledge base and OpenAI
- General chat enabled

## Common Issues

### Issue 1: Bot Script Not Loaded

**Symptom:** `window.initializeEducoreBot is undefined`

**Solution:**
- Ensure bot.js script tag is present
- Check Network tab - is bot.js loading? (Status 200)
- Wait for script to load before calling initialize

### Issue 2: Container Not Found

**Symptom:** `Container "#edu-bot-container" not found in DOM`

**Solution:**
- Add `<div id="edu-bot-container"></div>` to your HTML
- Or specify custom container: `container: '#my-container'`
- Ensure container exists before initialization

### Issue 3: Widget Not Visible

**Symptom:** No errors but widget doesn't appear

**Check:**
- Is widget rendered but hidden? (Check DOM inspector)
- CSS conflicts? (z-index, display, visibility)
- Check browser console for React errors
- Verify bot-bundle.js loaded successfully

### Issue 4: Wrong URL

**Symptom:** Script fails to load (404 or CORS error)

**Solution:**
- Verify backend URL is correct
- Check CORS configuration
- Ensure `/embed/bot.js` endpoint is accessible

## Debugging Checklist

- [ ] Bot script (`bot.js`) loads successfully (Network tab → Status 200)
- [ ] `window.initializeEducoreBot` exists (Console → `typeof window.initializeEducoreBot`)
- [ ] Container element exists in DOM (`document.querySelector('#edu-bot-container')`)
- [ ] User is authenticated (has userId and token)
- [ ] `initializeEducoreBot()` is called with correct parameters
- [ ] No JavaScript errors in console
- [ ] Bot bundle (`bot-bundle.js`) loads successfully
- [ ] Widget elements appear in DOM (check with inspector)

## Example: React Component

```jsx
import { useEffect } from 'react';

function Dashboard() {
  useEffect(() => {
    const initChatbot = async () => {
      // Get user from your auth context/store
      const user = useAuth(); // Your auth hook
      
      if (!user?.id || !user?.token) {
        console.warn('User not authenticated');
        return;
      }

      // Wait for bot.js to load
      let retries = 0;
      const maxRetries = 10;
      
      const checkAndInit = () => {
        if (typeof window.initializeEducoreBot === 'function') {
          console.log('🤖 Initializing chatbot...');
          
          window.initializeEducoreBot({
            microservice: 'DEVLAB',
            userId: user.id,
            token: user.token,
            tenantId: user.tenantId || 'dev.educore.local',
          });
          
          console.log('✅ Chatbot initialized!');
        } else if (retries < maxRetries) {
          retries++;
          setTimeout(checkAndInit, 500);
        } else {
          console.error('❌ Bot script not loaded after', maxRetries, 'retries');
        }
      };

      checkAndInit();
    };

    initChatbot();
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      {/* Your dashboard content */}
      
      {/* Chatbot container */}
      <div id="edu-bot-container"></div>
    </div>
  );
}
```

## Next Steps

1. Add bot.js script tag to your HTML
2. Add container element
3. Call `window.initializeEducoreBot()` after user authentication
4. Check browser console for initialization logs
5. Verify widget appears in bottom-right corner

If still not working, share:
- Browser console logs
- Network tab screenshot (showing bot.js loading)
- Your initialization code
- DOM inspector showing container element

