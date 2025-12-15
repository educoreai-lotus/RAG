# Chatbot Script Integration Guide

**Version:** 1.0  
**Last Updated:** 2025-01-27  
**Purpose:** Simple, copy-paste guide for integrating the RAG chatbot widget into any microservice

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (3 Steps)](#quick-start-3-steps)
3. [The Embed Script](#the-embed-script)
4. [How to Add to Any Microservice](#how-to-add-to-any-microservice)
5. [Configuration Options](#configuration-options)
6. [Examples](#examples)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

**Before integrating the chatbot, ensure the RAG backend is properly configured:**

1. **RAG Backend is Running:**
   - Verify the backend is accessible at your production URL
   - Test: `curl https://rag-production-3a4c.up.railway.app/health`

2. **Embed Files are Available:**
   - Verify embed files are served: `curl https://rag-production-3a4c.up.railway.app/embed/bot.js`
   - Should return JavaScript code (not 404)

3. **Support Mode is Enabled (for RAG team):**
   - `SUPPORT_MODE_ENABLED=true` in RAG backend environment
   - `SUPPORT_ALLOWED_ORIGINS` includes your microservice domain(s)

4. **CORS is Configured (for RAG team):**
   - Your microservice origin should be in the allowed origins list
   - Example: `SUPPORT_ALLOWED_ORIGINS=https://assessment.educore.com,https://devlab.educore.com`

**Note:** If you encounter CORS or "Support mode disabled" errors, contact the RAG team to configure the backend. See [Troubleshooting](#troubleshooting) for details.

---

## Quick Start (3 Steps)

### Step 1: Add Container Div

Add this anywhere in your HTML (typically before `</body>`):

```html
<div id="edu-bot-container"></div>
```

### Step 2: Load the Script

Add this in your `<head>` or before `</body>`:

```html
<script src="https://your-rag-backend.com/embed/bot.js"></script>
```

**⚠️ Important:** Use the **BACKEND domain**, not the frontend domain!

- ✅ **Correct:** `https://rag-backend.educore.com/embed/bot.js` (or your backend URL)
- ✅ **Production (Railway):** `https://rag-production-3a4c.up.railway.app/embed/bot.js`
- ✅ **Production (Vercel):** `https://rag-git-main-educoreai-lotus.vercel.app/embed/bot.js`
- ❌ **Wrong:** `https://rag-frontend.educore.com/embed/bot.js`

The backend serves the embed files from `/embed` route. The script will automatically load `bot-bundle.js` from the same backend domain.

**Production URLs:**
- **Railway:** `https://rag-production-3a4c.up.railway.app/embed/bot.js`
- **Vercel:** `https://rag-git-main-educoreai-lotus.vercel.app/embed/bot.js`

### Step 3: Initialize After User Login

```html
<script>
  // Only initialize after user is logged in
  function initChatbot() {
    const user = getCurrentUser(); // Your auth function
    
    if (user && user.id && user.token) {
      if (window.initializeEducoreBot) {
        window.initializeEducoreBot({
          microservice: "ASSESSMENT",  // or "DEVLAB"
          userId: user.id,
          token: user.token,
          tenantId: user.tenantId || "default"
        });
      } else {
        // Script not loaded yet, retry
        setTimeout(initChatbot, 100);
      }
    }
  }
  
  // Initialize when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
  } else {
    initChatbot();
  }
</script>
```

**That's it!** The chatbot widget will appear in your page.

---

## The Embed Script

### Complete Script Code

**File Location:** `FRONTEND/public/bot.js`

**Important:** This script is served by the **BACKEND**, not the frontend!

The backend serves embed files from `/embed` route:
- `https://your-backend.com/embed/bot.js` ✅
- `https://your-backend.com/embed/bot-bundle.js` ✅ (loaded automatically)

This is the script that gets loaded from your RAG backend. Here's what it does:

```javascript
/**
 * EDUCORE Bot Embedding Script
 * 
 * This script allows microservices to embed the chatbot widget
 * by adding a simple SCRIPT tag to their pages.
 */

(function() {
  'use strict';

  // Prevent multiple initializations
  if (window.EDUCORE_BOT_LOADED) {
    console.warn('EDUCORE Bot: Already loaded. Skipping re-initialization.');
    return;
  }

  window.EDUCORE_BOT_LOADED = true;

  // Bot configuration storage
  let botConfig = null;
  let botInstance = null;

  /**
   * Initialize the EDUCORE Bot widget
   * @param {Object} config - Configuration object
   * @param {string} config.microservice - Microservice identifier ("ASSESSMENT" or "DEVLAB")
   * @param {string} config.userId - Authenticated user ID
   * @param {string} config.token - JWT or session token
   * @param {string} config.container - CSS selector for mount point (default: "#edu-bot-container")
   */
  window.initializeEducoreBot = function(config) {
    // Validation and initialization logic...
  };

  // ... rest of the script
})();
```

### What Each Part Does

#### 1. **IIFE (Immediately Invoked Function Expression)**
```javascript
(function() {
  'use strict';
  // ... code
})();
```
- **Purpose:** Wraps code to avoid global namespace pollution
- **Why:** Prevents conflicts with other scripts on the page

#### 2. **Prevent Multiple Loads**
```javascript
if (window.EDUCORE_BOT_LOADED) {
  return;
}
window.EDUCORE_BOT_LOADED = true;
```
- **Purpose:** Ensures script only runs once, even if loaded multiple times
- **Why:** Prevents duplicate widgets and errors

#### 3. **Global Function Exposure**
```javascript
window.initializeEducoreBot = function(config) { ... }
```
- **Purpose:** Makes initialization function available globally
- **Why:** Allows your microservice to call it after script loads

#### 4. **Dynamic Bundle Loading**
```javascript
function loadBotBundle(instance) {
  const baseUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf('/'));
  const bundleUrl = `${baseUrl}/bot-bundle.js`; // Same backend domain!
  const script = document.createElement('script');
  script.src = bundleUrl;
  // ... loads React bundle
}
```
- **Purpose:** Dynamically loads the React widget bundle
- **Why:** Keeps initial script small, loads full widget on demand
- **Important:** Loads from the **same backend domain** as `bot.js`

#### 5. **Container Mounting**
```javascript
const mountElement = document.querySelector(container);
mountElement.innerHTML = '<div id="bot-root"></div>';
```
- **Purpose:** Creates mount point for React component
- **Why:** React needs a DOM element to render into

#### 6. **Token Storage**
```javascript
localStorage.setItem('token', token);
localStorage.setItem('user_id', userId);
```
- **Purpose:** Stores authentication data for API calls
- **Why:** Widget needs token for authenticated requests

---

## How to Add to Any Microservice

### Where to Place the Script

#### Option 1: In HTML `<head>` (Recommended)

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Microservice</title>
  
  <!-- Load bot script early - Use BACKEND domain! -->
  <!-- Production (Railway): https://rag-production-3a4c.up.railway.app/embed/bot.js -->
  <!-- Production (Vercel): https://rag-git-main-educoreai-lotus.vercel.app/embed/bot.js -->
  <script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>
</head>
<body>
  <!-- Your content -->
  
  <!-- Container for bot -->
  <div id="edu-bot-container"></div>
  
  <!-- Initialize after page loads -->
  <script>
    // Initialization code here
  </script>
</body>
</html>
```

#### Option 2: Before `</body>` (Also Works)

```html
<body>
  <!-- Your content -->
  
  <!-- Container -->
  <div id="edu-bot-container"></div>
  
  <!-- Load and initialize -->
  <script src="https://rag-service.com/embed/bot.js"></script>
  <script>
    // Initialization code
  </script>
</body>
```

#### Option 3: Dynamic Loading (SPA/Frameworks)

For React, Vue, Angular, etc., load the script dynamically:

```javascript
// React example
useEffect(() => {
  const script = document.createElement('script');
  script.src = 'https://rag-production-3a4c.up.railway.app/embed/bot.js'; // Production (Railway)
  // Alternative: https://rag-git-main-educoreai-lotus.vercel.app/embed/bot.js (Vercel)
  script.async = true;
  document.head.appendChild(script);
  
  return () => {
    // Cleanup if needed
  };
}, []);
```

### One-Time Setup vs Per-Page Setup

#### One-Time Setup (Recommended)

**Add to your main layout/template file:**

```html
<!-- In your main layout (e.g., layout.html, App.jsx, _app.js) -->
<div id="edu-bot-container"></div>
<script src="https://rag-service.com/embed/bot.js"></script>
```

**Then initialize on each page that needs it:**

```javascript
// In each page component/route
useEffect(() => {
  if (user && user.token) {
    window.initializeEducoreBot({
      microservice: "ASSESSMENT",
      userId: user.id,
      token: user.token
    });
  }
}, [user]);
```

#### Per-Page Setup

**Add to specific pages only:**

```html
<!-- assessment-page.html -->
<div id="edu-bot-container"></div>
<script src="https://rag-service.com/embed/bot.js"></script>
<script>
  // Initialize for this page
</script>
```

### Step-by-Step Integration Instructions

#### For Plain HTML Pages

1. **Open your HTML file** (e.g., `dashboard.html`)

2. **Add container div** before `</body>`:
   ```html
   <div id="edu-bot-container"></div>
   ```

3. **Add script tag** in `<head>` or before `</body>`:
   ```html
   <script src="https://rag-service.com/embed/bot.js"></script>
   ```

4. **Add initialization code** (after script tag):
   ```html
   <script>
     function initBot() {
       const user = getCurrentUser(); // Your function
       if (user && window.initializeEducoreBot) {
         window.initializeEducoreBot({
           microservice: "ASSESSMENT",
           userId: user.id,
           token: user.token
         });
       }
     }
     if (document.readyState === 'loading') {
       document.addEventListener('DOMContentLoaded', initBot);
     } else {
       initBot();
     }
   </script>
   ```

5. **Test:** Open page, verify widget appears

#### For React Applications

1. **Add container to your main layout** (`App.jsx` or `Layout.jsx`):
   ```jsx
   function App() {
     return (
       <div>
         <Routes />
         <div id="edu-bot-container"></div>
       </div>
     );
   }
   ```

2. **Create a hook** (`useChatbot.js`):
   ```jsx
   import { useEffect } from 'react';
   import { useAuth } from './useAuth';
   
   export function useChatbot(microservice = "ASSESSMENT") {
     const { user, token } = useAuth();
     
     useEffect(() => {
       if (!user || !token) return;
       
       // Load script if not already loaded
       if (!window.EDUCORE_BOT_LOADED) {
         const script = document.createElement('script');
         script.src = 'https://rag-service.com/embed/bot.js';
         script.async = true;
         document.head.appendChild(script);
         
         script.onload = () => {
           if (window.initializeEducoreBot) {
             window.initializeEducoreBot({
               microservice,
               userId: user.id,
               token,
               tenantId: user.tenantId
             });
           }
         };
       } else {
         // Script already loaded, just initialize
         if (window.initializeEducoreBot) {
           window.initializeEducoreBot({
             microservice,
             userId: user.id,
             token,
             tenantId: user.tenantId
           });
         }
       }
     }, [user, token, microservice]);
   }
   ```

3. **Use hook in your component**:
   ```jsx
   import { useChatbot } from './hooks/useChatbot';
   
   function AssessmentPage() {
     useChatbot("ASSESSMENT");
     return <div>Assessment Content</div>;
   }
   ```

#### For Vue.js Applications

1. **Add container to root component** (`App.vue`):
   ```vue
   <template>
     <div id="app">
       <router-view />
       <div id="edu-bot-container"></div>
     </div>
   </template>
   ```

2. **Create composable** (`useChatbot.js`):
   ```javascript
   import { onMounted, watch } from 'vue';
   import { useAuthStore } from './stores/auth';
   
   export function useChatbot(microservice = "ASSESSMENT") {
     const authStore = useAuthStore();
     
     const initBot = () => {
       if (!authStore.user || !authStore.token) return;
       
       if (window.initializeEducoreBot) {
         window.initializeEducoreBot({
           microservice,
           userId: authStore.user.id,
           token: authStore.token,
           tenantId: authStore.user.tenantId
         });
       } else {
         // Load script first
         const script = document.createElement('script');
         script.src = 'https://rag-service.com/embed/bot.js';
         script.async = true;
         script.onload = initBot;
         document.head.appendChild(script);
       }
     };
     
     onMounted(() => {
       watch(() => authStore.user, initBot, { immediate: true });
     });
   }
   ```

3. **Use in component**:
   ```vue
   <script setup>
   import { useChatbot } from './composables/useChatbot';
   useChatbot("ASSESSMENT");
   </script>
   ```

#### For Angular Applications

1. **Add container to root component** (`app.component.html`):
   ```html
   <router-outlet></router-outlet>
   <div id="edu-bot-container"></div>
   ```

2. **Create service** (`chatbot.service.ts`):
   ```typescript
   import { Injectable } from '@angular/core';
   import { AuthService } from './auth.service';
   
   @Injectable({ providedIn: 'root' })
   export class ChatbotService {
     constructor(private auth: AuthService) {}
     
     init(microservice: string = "ASSESSMENT") {
       const user = this.auth.getCurrentUser();
       if (!user || !user.token) return;
       
       if (window['initializeEducoreBot']) {
         window['initializeEducoreBot']({
           microservice,
           userId: user.id,
           token: user.token,
           tenantId: user.tenantId
         });
       } else {
         this.loadScript().then(() => this.init(microservice));
       }
     }
     
     private loadScript(): Promise<void> {
       return new Promise((resolve, reject) => {
         const script = document.createElement('script');
         script.src = 'https://rag-service.com/embed/bot.js';
         script.async = true;
         script.onload = () => resolve();
         script.onerror = () => reject();
         document.head.appendChild(script);
       });
     }
   }
   ```

3. **Use in component**:
   ```typescript
   import { Component, OnInit } from '@angular/core';
   import { ChatbotService } from './chatbot.service';
   
   @Component({ selector: 'app-assessment' })
   export class AssessmentComponent implements OnInit {
     constructor(private chatbot: ChatbotService) {}
     
     ngOnInit() {
       this.chatbot.init("ASSESSMENT");
     }
   }
   ```

---

## ⚠️ Important: Use BACKEND Domain!

### למה BACKEND ולא FRONTEND?

**זה נשמע מוזר, אבל יש סיבה טובה:**

הקבצים מוגשים מה-**BACKEND** (לא מה-frontend של RAG) כדי לאפשר למיקרוסרוויסים **אחרים** (Assessment, DevLab, וכו') להטמיע את ה-widget.

#### איך זה עובד:

```
┌─────────────────────────────────────────────────────────┐
│  Assessment Microservice (assessment.educore.com)      │
│  ┌───────────────────────────────────────────────────┐  │
│  │  HTML Page                                        │  │
│  │  <script src="https://rag-backend.com/embed/     │  │
│  │                  bot.js"></script>                │  │
│  │  ↑ טוען מה-BACKEND של RAG (cross-origin)         │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        │
                        │ HTTP Request (CORS)
                        ▼
┌─────────────────────────────────────────────────────────┐
│  RAG Backend (rag-backend.educore.com)                 │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Express Static Server                            │  │
│  │  app.use('/embed', express.static(...))          │  │
│  │  ↑ משרת קבצים מ-FRONTEND/dist/embed/             │  │
│  │  ↑ עם CORS headers: Access-Control-Allow-Origin: *│  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        │
                        │ Reads files
                        ▼
┌─────────────────────────────────────────────────────────┐
│  FRONTEND/dist/embed/ (on server filesystem)           │
│  ├── bot.js                                            │
│  └── bot-bundle.js                                     │
└─────────────────────────────────────────────────────────┘
```

#### למה לא FRONTEND domain?

1. **מיקרוסרוויסים אחרים לא יכולים לגשת ל-frontend של RAG** - הם צריכים endpoint ציבורי
2. **ה-backend כבר מגדיר CORS** - מאפשר cross-origin requests
3. **זה endpoint אחד** - לא צריך לשרת frontend נפרד רק בשביל embed files
4. **ה-backend כבר רץ** - לא צריך להריץ שרת נוסף

#### מה קורה בפועל:

1. **Assessment/DevLab microservice** טוען את ה-script מה-backend של RAG
2. **ה-backend משרת את הקבצים** מ-`FRONTEND/dist/embed/` עם CORS headers
3. **הדפדפן מאפשר את זה** כי ה-backend מגדיר `Access-Control-Allow-Origin: *`
4. **ה-widget רץ בדפדפן** ומתחבר חזרה ל-backend של RAG ל-API calls

### URLs:

- ✅ **Correct:** `https://rag-backend.educore.com/embed/bot.js` (or your backend URL)
- ✅ **Production (Railway):** `https://rag-production-3a4c.up.railway.app/embed/bot.js`
- ✅ **Production (Vercel):** `https://rag-git-main-educoreai-lotus.vercel.app/embed/bot.js`
- ❌ **Wrong:** `https://rag-frontend.educore.com/embed/bot.js` (לא קיים)

The backend serves:
- `/embed/bot.js` - Widget loader script
- `/embed/bot-bundle.js` - React bundle (loaded automatically)

Both files are served from the same backend domain with CORS enabled. The `bot.js` script automatically loads `bot-bundle.js` from the same base URL.

**Production URLs:**
- **Railway:** [https://rag-production-3a4c.up.railway.app](https://rag-production-3a4c.up.railway.app/)
- **Vercel:** [https://rag-git-main-educoreai-lotus.vercel.app](https://rag-git-main-educoreai-lotus.vercel.app/)

## Configuration Options

### Required Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `microservice` | `string` | Must be `"ASSESSMENT"` or `"DEVLAB"` (case-insensitive) | `"ASSESSMENT"` |
| `userId` | `string` | Authenticated user's ID (required after login) | `"user-123"` |
| `token` | `string` | JWT or session token for authentication | `"eyJhbGciOiJIUzI1NiIs..."` |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `tenantId` | `string` | `"default"` | Multi-tenant identifier |
| `container` | `string` | `"#edu-bot-container"` | CSS selector for mount point |

### Complete Configuration Object

```javascript
window.initializeEducoreBot({
  // Required
  microservice: "ASSESSMENT",  // or "DEVLAB"
  userId: "user-123",
  token: "jwt-token-here",
  
  // Optional
  tenantId: "tenant-123",      // Default: "default"
  container: "#edu-bot-container"  // Default: "#edu-bot-container"
});
```

### Customization for Each Microservice

#### Assessment Microservice

```javascript
window.initializeEducoreBot({
  microservice: "ASSESSMENT",  // Activates Assessment Support Mode
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId
});
```

**Behavior:**
- Widget enters **Assessment Support Mode**
- Messages forwarded to `/api/assessment/support`
- Responses returned verbatim (no RAG processing)

#### DevLab Microservice

```javascript
window.initializeEducoreBot({
  microservice: "DEVLAB",  // Activates DevLab Support Mode
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId
});
```

**Behavior:**
- Widget enters **DevLab Support Mode**
- Messages forwarded to `/api/devlab/support`
- Responses returned verbatim (no RAG processing)

#### General Chat (No Microservice)

If you want general RAG chat (not support mode), don't provide `microservice`:

```javascript
// This won't work - microservice is required
// But you can use the widget directly in RAG service
```

**Note:** Support Mode is required for embedded widgets. General chat is only available in the RAG service itself.

### User Authentication/Context Passing

#### Automatic Context

The widget automatically includes:

```javascript
// Stored in localStorage
localStorage.setItem('token', token);
localStorage.setItem('user_id', userId);
localStorage.setItem('tenant_id', tenantId || 'default');
```

#### API Request Headers

All API requests automatically include:

```javascript
{
  'Authorization': `Bearer ${token}`,
  'X-User-Id': userId,
  'X-Tenant-Id': tenantId
}
```

#### Session Management

The widget maintains its own session:

```javascript
// Session ID stored in sessionStorage
sessionStorage.setItem('chatbot_session_id', sessionId);
```

#### Passing Additional Context

Currently, the widget uses:
- `userId` from initialization
- `token` from initialization
- `tenantId` from initialization

**Future:** Additional metadata can be passed via:
```javascript
// Future enhancement
window.initializeEducoreBot({
  microservice: "ASSESSMENT",
  userId: user.id,
  token: user.token,
  metadata: {
    assessment_id: "assess-123",
    course_id: "course-456"
  }
});
```

---

## Examples

### Example 1: Plain HTML Page

**Complete working example:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Assessment Dashboard</title>
  
  <!-- Load bot script - Use BACKEND domain! -->
  <!-- Production (Railway): https://rag-production-3a4c.up.railway.app/embed/bot.js -->
  <!-- Production (Vercel): https://rag-git-main-educoreai-lotus.vercel.app/embed/bot.js -->
  <script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>
</head>
<body>
  <h1>Assessment Dashboard</h1>
  
  <!-- Your assessment content -->
  <div id="assessment-content">
    <p>Assessment content here...</p>
  </div>
  
  <!-- Bot container -->
  <div id="edu-bot-container"></div>
  
  <!-- Initialize bot -->
  <script>
    // Mock auth function - replace with your actual auth
    function getCurrentUser() {
      return {
        id: "user-123",
        token: "jwt-token-here",
        tenantId: "tenant-123"
      };
    }
    
    function initChatbot() {
      const user = getCurrentUser();
      
      if (user && user.id && user.token) {
        if (window.initializeEducoreBot) {
          window.initializeEducoreBot({
            microservice: "ASSESSMENT",
            userId: user.id,
            token: user.token,
            tenantId: user.tenantId || "default"
          });
        } else {
          // Script not loaded yet, retry
          setTimeout(initChatbot, 100);
        }
      }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initChatbot);
    } else {
      initChatbot();
    }
  </script>
</body>
</html>
```

### Example 2: React Component

**Complete React example:**

```jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from './hooks/useAuth';

function AssessmentDashboard() {
  const { user, token } = useAuth();
  const [botInitialized, setBotInitialized] = useState(false);

  useEffect(() => {
    // Only initialize if user is logged in
    if (!user || !token || botInitialized) return;

    // Check if script is already loaded
    if (window.EDUCORE_BOT_LOADED) {
      // Script already loaded, just initialize
      if (window.initializeEducoreBot) {
        window.initializeEducoreBot({
          microservice: "ASSESSMENT",
          userId: user.id,
          token: token,
          tenantId: user.tenantId || "default"
        });
        setBotInitialized(true);
      }
    } else {
      // Load script first - Use BACKEND domain!
      // Production (Railway): https://rag-production-3a4c.up.railway.app/embed/bot.js
      // Production (Vercel): https://rag-git-main-educoreai-lotus.vercel.app/embed/bot.js
      const script = document.createElement('script');
      script.src = 'https://rag-production-3a4c.up.railway.app/embed/bot.js';
      script.async = true;
      script.onload = () => {
        if (window.initializeEducoreBot) {
          window.initializeEducoreBot({
            microservice: "ASSESSMENT",
            userId: user.id,
            token: token,
            tenantId: user.tenantId || "default"
          });
          setBotInitialized(true);
        }
      };
      script.onerror = () => {
        console.error('Failed to load chatbot script');
      };
      document.head.appendChild(script);
    }

    // Cleanup on unmount
    return () => {
      if (window.destroyEducoreBot) {
        window.destroyEducoreBot();
      }
    };
  }, [user, token, botInitialized]);

  return (
    <div>
      <h1>Assessment Dashboard</h1>
      <div id="assessment-content">
        {/* Your assessment UI */}
      </div>
      
      {/* Bot container */}
      <div id="edu-bot-container"></div>
    </div>
  );
}

export default AssessmentDashboard;
```

### Example 3: Vue.js Component

**Complete Vue example:**

```vue
<template>
  <div>
    <h1>DevLab Dashboard</h1>
    <div id="devlab-content">
      <!-- Your DevLab UI -->
    </div>
    
    <!-- Bot container -->
    <div id="edu-bot-container"></div>
  </div>
</template>

<script>
import { onMounted, onUnmounted, watch } from 'vue';
import { useAuthStore } from './stores/auth';

export default {
  name: 'DevLabDashboard',
  setup() {
    const authStore = useAuthStore();
    let scriptLoaded = false;

    const initializeBot = () => {
      if (!authStore.user || !authStore.token) return;

      if (window.initializeEducoreBot) {
        window.initializeEducoreBot({
          microservice: "DEVLAB",
          userId: authStore.user.id,
          token: authStore.token,
          tenantId: authStore.user.tenantId || "default"
        });
      } else if (!scriptLoaded) {
        // Load script - Use BACKEND domain!
        // Production (Railway): https://rag-production-3a4c.up.railway.app/embed/bot.js
        // Production (Vercel): https://rag-git-main-educoreai-lotus.vercel.app/embed/bot.js
        const script = document.createElement('script');
        script.src = 'https://rag-production-3a4c.up.railway.app/embed/bot.js';
        script.async = true;
        script.onload = () => {
          scriptLoaded = true;
          initializeBot();
        };
        document.head.appendChild(script);
      }
    };

    onMounted(() => {
      // Watch for user login
      watch(() => authStore.user, initializeBot, { immediate: true });
    });

    onUnmounted(() => {
      if (window.destroyEducoreBot) {
        window.destroyEducoreBot();
      }
    });

    return {};
  }
};
</script>
```

### Example 4: Angular Component

**Complete Angular example:**

```typescript
// chatbot.service.ts
import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private scriptLoaded = false;

  constructor(private auth: AuthService) {}

  init(microservice: string = "ASSESSMENT") {
    const user = this.auth.getCurrentUser();
    if (!user || !user.token) return;

    if (window['initializeEducoreBot']) {
      window['initializeEducoreBot']({
        microservice,
        userId: user.id,
        token: user.token,
        tenantId: user.tenantId || "default"
      });
    } else if (!this.scriptLoaded) {
      this.loadScript().then(() => this.init(microservice));
    }
  }

  private loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://rag-production-3a4c.up.railway.app/embed/bot.js'; // Production (Railway)
      // Alternative: https://rag-git-main-educoreai-lotus.vercel.app/embed/bot.js (Vercel)
      script.async = true;
      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load chatbot script'));
      document.head.appendChild(script);
    });
  }

  destroy() {
    if (window['destroyEducoreBot']) {
      window['destroyEducoreBot']();
    }
  }
}
```

```typescript
// assessment.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ChatbotService } from './chatbot.service';

@Component({
  selector: 'app-assessment',
  template: `
    <h1>Assessment Dashboard</h1>
    <div id="assessment-content">
      <!-- Your assessment UI -->
    </div>
    <div id="edu-bot-container"></div>
  `
})
export class AssessmentComponent implements OnInit, OnDestroy {
  constructor(private chatbot: ChatbotService) {}

  ngOnInit() {
    this.chatbot.init("ASSESSMENT");
  }

  ngOnDestroy() {
    this.chatbot.destroy();
  }
}
```

### Example 5: Conditional Loading (Only for Logged-In Users)

```javascript
// Only show chatbot for authenticated users
function initChatbotIfAuthenticated() {
  // Check if user is logged in (your auth check)
  const isAuthenticated = checkUserAuth(); // Your function
  
  if (!isAuthenticated) {
    console.log('User not authenticated, skipping chatbot');
    return;
  }
  
  const user = getCurrentUser();
  if (window.initializeEducoreBot) {
    window.initializeEducoreBot({
      microservice: "ASSESSMENT",
      userId: user.id,
      token: user.token
    });
  }
}

// Call after login
window.addEventListener('user-logged-in', initChatbotIfAuthenticated);

// Or check on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChatbotIfAuthenticated);
} else {
  initChatbotIfAuthenticated();
}
```

---

## Troubleshooting

### Common Issues

#### 1. "Container not found in DOM"

**Error:**
```
EDUCORE Bot: Container "#edu-bot-container" not found in DOM
```

**Causes:**
- Container div doesn't exist
- Script runs before DOM is ready
- Wrong CSS selector

**Solutions:**
```html
<!-- ✅ Correct: Container exists -->
<div id="edu-bot-container"></div>

<!-- ❌ Wrong: Missing container -->
<!-- No container div -->

<!-- ✅ Correct: Wait for DOM -->
<script>
  document.addEventListener('DOMContentLoaded', function() {
    if (window.initializeEducoreBot) {
      window.initializeEducoreBot({...});
    }
  });
</script>
```

#### 2. "Failed to load bot bundle"

**Error:**
```
EDUCORE Bot: Failed to load bot bundle from https://rag-production-3a4c.up.railway.app/embed/bot-bundle.js
```

**Causes:**
- Using frontend domain instead of backend domain ❌
- RAG backend not serving bundle
- Wrong URL
- CORS issue
- Network error

**Solutions:**
1. **⚠️ Make sure you're using BACKEND domain, not frontend!**
   - ✅ Correct: `https://rag-production-3a4c.up.railway.app/embed/bot.js` (Production)
   - ✅ Correct: `https://rag-backend.educore.com/embed/bot.js` (Custom domain)
   - ❌ Wrong: `https://rag-frontend.educore.com/embed/bot.js`

2. **Verify RAG backend is running:**
   ```bash
   curl https://rag-production-3a4c.up.railway.app/health
   ```

3. **Check bundle URL (must be backend domain):**
   ```bash
   curl https://rag-production-3a4c.up.railway.app/embed/bot-bundle.js
   # Should return JavaScript code, not 404
   ```

3. **Check CORS in browser console:**
   - Open Network tab
   - Look for `bot-bundle.js` request
   - Check for CORS errors

4. **Verify build output:**
   - RAG service must have `dist/embed/bot-bundle.js`
   - Check RAG service deployment

#### 3. CORS Errors

**Error:**
```
Access to fetch at 'https://rag-production-3a4c.up.railway.app/api/assessment/support' 
from origin 'https://assessment.educore.com' has been blocked by CORS policy
```

**Causes:**
- RAG backend not configured to allow your origin
- Missing CORS headers

**Solutions:**
1. **Add your origin to RAG backend environment:**
   ```bash
   # In RAG backend .env
   SUPPORT_ALLOWED_ORIGINS=https://assessment.educore.com,https://devlab.educore.com
   FRONTEND_URL=https://assessment.educore.com
   ```

2. **Restart RAG backend**

3. **Verify origin matches exactly:**
   - Include protocol: `https://` (not `http://`)
   - Include domain: `assessment.educore.com`
   - No trailing slash

4. **Test with curl:**
   ```bash
   curl -X POST https://rag-production-3a4c.up.railway.app/api/assessment/support \
     -H "Origin: https://assessment.educore.com" \
     -H "Content-Type: application/json" \
     -d '{"query": "test"}'
   ```

#### 4. Widget Doesn't Appear

**Symptoms:**
- No errors in console
- Container exists but is empty
- Script loaded successfully

**Solutions:**
1. **Check initialization was called:**
   ```javascript
   console.log('Initializing bot...');
   window.initializeEducoreBot({...});
   console.log('Initialization called');
   ```

2. **Verify user is logged in:**
   ```javascript
   const user = getCurrentUser();
   console.log('User:', user);
   if (!user || !user.token) {
     console.error('User not authenticated');
   }
   ```

3. **Check browser console:**
   - Look for JavaScript errors
   - Check Network tab for failed requests

4. **Verify script loaded:**
   ```javascript
   console.log('Bot loaded:', window.EDUCORE_BOT_LOADED);
   console.log('Init function:', typeof window.initializeEducoreBot);
   ```

#### 5. "Support mode is disabled"

**Error:**
```json
{
  "error": "Forbidden",
  "message": "Support mode is disabled"
}
```

**Solution:**
```bash
# In RAG backend .env
SUPPORT_MODE_ENABLED=true

# Restart RAG backend
```

#### 6. "Invalid microservice"

**Error:**
```
EDUCORE Bot: Invalid microservice "CONTENT". Must be one of: ASSESSMENT, DEVLAB
```

**Solution:**
```javascript
// ✅ Correct
microservice: "ASSESSMENT"  // or "DEVLAB"

// ❌ Wrong
microservice: "CONTENT"
microservice: "assessment"  // Will be converted to uppercase, but must be ASSESSMENT or DEVLAB
```

#### 7. Widget Shows "Failed to load chatbot"

**Error:**
Widget displays red error message: "Failed to load chatbot. Please refresh the page."

**Causes:**
- `bot-bundle.js` failed to load
- React bundle error
- Network timeout

**Solutions:**
1. **Check Network tab:**
   - Look for `bot-bundle.js` request
   - Check status code (should be 200)
   - Check response time

2. **Verify RAG service:**
   ```bash
   curl https://rag-service.com/embed/bot-bundle.js | head -20
   # Should return JavaScript code
   ```

3. **Check browser console:**
   - Look for JavaScript errors
   - Check for React errors

4. **Try refreshing page:**
   - Sometimes network issues cause temporary failures

### Browser Console Errors

#### Common Console Messages

**Info messages (OK):**
```
EDUCORE Bot: Embedding script loaded. Call window.initializeEducoreBot(config) to start.
```
✅ This is normal - script loaded successfully

**Warning messages:**
```
EDUCORE Bot: Already loaded. Skipping re-initialization.
```
⚠️ Script loaded multiple times - usually harmless

**Error messages:**
```
EDUCORE Bot: "microservice" parameter is required
```
❌ Missing required parameter - fix initialization

```
EDUCORE Bot: Container "#edu-bot-container" not found in DOM
```
❌ Container missing - add div to HTML

### How to Verify It's Working

#### Step 1: Check Script Loaded

Open browser console:
```javascript
console.log(window.EDUCORE_BOT_LOADED);  // Should be: true
console.log(typeof window.initializeEducoreBot);  // Should be: "function"
```

#### Step 2: Check Container Exists

```javascript
console.log(document.querySelector('#edu-bot-container'));  // Should return element
```

#### Step 3: Check Initialization

After calling `initializeEducoreBot()`:
```javascript
// Should see in console:
// "EDUCORE Bot: Initializing..."
// No errors
```

#### Step 4: Check Widget Rendered

```javascript
// Container should have content
const container = document.querySelector('#edu-bot-container');
console.log(container.innerHTML);  // Should have React root div
```

#### Step 5: Test Chat

1. Click chatbot button (should open panel)
2. Type a message
3. Send message
4. Check Network tab for API request:
   - Should see POST to `/api/assessment/support` or `/api/devlab/support`
   - Status should be 200
   - Response should contain message

#### Step 6: Check localStorage

```javascript
console.log(localStorage.getItem('token'));  // Should have token
console.log(localStorage.getItem('user_id'));  // Should have user ID
```

### Debug Checklist

- [ ] Container div exists: `<div id="edu-bot-container"></div>`
- [ ] Script tag loads: `<script src="https://rag-service.com/embed/bot.js"></script>`
- [ ] Script loaded: `window.EDUCORE_BOT_LOADED === true`
- [ ] Init function exists: `typeof window.initializeEducoreBot === "function"`
- [ ] User authenticated: `user && user.id && user.token`
- [ ] Initialization called: `window.initializeEducoreBot({...})` executed
- [ ] No console errors
- [ ] Network requests succeed (check Network tab)
- [ ] Widget appears in container
- [ ] Chat works (can send/receive messages)

### Getting Help

If you're still stuck:

1. **Check RAG service logs:**
   - Look for CORS errors
   - Check for authentication errors
   - Verify endpoints are accessible

2. **Test RAG endpoints directly (use BACKEND domain):**
   ```bash
   # Health check
   curl https://rag-production-3a4c.up.railway.app/health
   
   # Test support endpoint
   curl -X POST https://rag-production-3a4c.up.railway.app/api/assessment/support \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"query": "test"}'
   ```

3. **Check browser compatibility:**
   - Test in Chrome, Firefox, Safari
   - Check for browser-specific errors

4. **Contact support:**
   - Provide error messages
   - Share browser console logs
   - Include Network tab screenshots

---

## Summary

### Quick Integration (3 Steps)

1. **Add container:** `<div id="edu-bot-container"></div>`
2. **Load script (use BACKEND domain!):** 
   ```html
   <!-- Railway -->
   <script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>
   <!-- OR Vercel -->
   <script src="https://rag-git-main-educoreai-lotus.vercel.app/embed/bot.js"></script>
   ```
3. **Initialize:** `window.initializeEducoreBot({ microservice: "ASSESSMENT", userId: "...", token: "..." })`

**⚠️ Important:** Always use the **BACKEND domain**, not the frontend domain!

**Production URLs:**
- **Railway:** `https://rag-production-3a4c.up.railway.app/embed/bot.js`
- **Vercel:** `https://rag-git-main-educoreai-lotus.vercel.app/embed/bot.js`

### Key Points

- ✅ Script loads automatically when included
- ✅ Initialize only after user login
- ✅ Required: `microservice`, `userId`, `token`
- ✅ Optional: `tenantId`, `container`
- ✅ Widget enters Support Mode automatically
- ✅ Works with any framework (React, Vue, Angular, plain HTML)

### Configuration

```javascript
window.initializeEducoreBot({
  microservice: "ASSESSMENT",  // or "DEVLAB"
  userId: "user-123",
  token: "jwt-token",
  tenantId: "tenant-123",      // Optional
  container: "#edu-bot-container"  // Optional
});
```

---

**Document Maintained By:** RAG Microservice Team  
**Questions?** Check troubleshooting section or contact support.

