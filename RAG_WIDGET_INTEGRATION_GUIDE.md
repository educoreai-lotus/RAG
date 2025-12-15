# RAG Chat Widget - Complete Integration Guide for EDUCORE Microservices

**Version:** 1.0  
**Last Updated:** Based on codebase analysis  
**Target Audience:** Developers integrating the RAG chat widget into Assessment, DevLab, Course Builder, and other EDUCORE microservices

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture & Communication Flow](#architecture--communication-flow)
3. [Quick Start - Embedding Script](#quick-start---embedding-script)
4. [Initialization Parameters](#initialization-parameters)
5. [Backend Requirements](#backend-requirements)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Complete Integration Examples](#complete-integration-examples)
8. [Customization Options](#customization-options)
9. [Troubleshooting](#troubleshooting)
10. [Verification Checklist](#verification-checklist)

---

## Overview

The RAG Chat Widget is a React-based floating chat interface that can be embedded into any EDUCORE microservice. It supports two modes:

- **General Chat Mode**: Direct RAG queries using vector search and OpenAI
- **Support Mode**: Proxy mode that forwards messages to specific microservices (Assessment, DevLab)

When embedded with a `microservice` parameter, the widget automatically enters **Support Mode** and acts as a transparent proxy to that microservice.

---

## Architecture & Communication Flow

### End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  External Microservice (Assessment/DevLab/Course Builder)      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  HTML Page with Embedded Widget                         │  │
│  │                                                          │  │
│  │  <div id="edu-bot-container"></div>                     │  │
│  │  <script src="https://rag-service.com/embed/bot.js">     │  │
│  │  <script>                                                │  │
│  │    window.initializeEducoreBot({                        │  │
│  │      microservice: "ASSESSMENT",                         │  │
│  │      userId: "user-123",                                │  │
│  │      token: "jwt-token-here"                            │  │
│  │    });                                                   │  │
│  │  </script>                                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ User sends message
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  RAG Frontend Widget (React Component)                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  FloatingChatWidget Component                            │  │
│  │  - Detects Support Mode (ASSESSMENT_SUPPORT/DEVLAB_SUPPORT)│ │
│  │  - Routes message via microserviceProxy.js               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ POST /api/assessment/support
                            │ or POST /api/devlab/support
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  RAG Backend (Express.js)                                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  microserviceSupport.routes.js                          │  │
│  │  - Validates CORS origin                                │  │
│  │  - Checks SUPPORT_MODE_ENABLED                          │  │
│  │  - Validates X-Embed-Secret (optional)                  │  │
│  │  - Routes to microserviceSupport.controller.js          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  microserviceSupport.controller.js                      │  │
│  │  - Validates request                                    │  │
│  │  - Extracts query, session_id, metadata                 │  │
│  │  - Returns mock/proxy response                          │  │
│  │  (TODO: Forward to actual microservice API)             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ Response (verbatim)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  External Microservice (Assessment/DevLab)                      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  User sees response in chat widget                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### General Chat Mode Flow (Non-Support)

```
User Message → FloatingChatWidget → POST /api/v1/query → 
queryProcessing.service.js → Vector Search → OpenAI → Response
```

### Support Mode Flow (Proxy)

```
User Message → FloatingChatWidget → POST /api/assessment/support → 
microserviceSupport.controller.js → (Future: Assessment API) → Response
```

---

## Quick Start - Embedding Script

### The Actual Script Snippet (From Codebase)

**File:** `FRONTEND/public/bot.js`

This is the exact script that must be loaded by external microservices:

```html
<!-- Step 1: Add container div -->
<div id="edu-bot-container"></div>

<!-- Step 2: Load the bot script -->
<script src="https://your-rag-service.com/embed/bot.js"></script>

<!-- Step 3: Initialize after script loads -->
<script>
  // Wait for script to load, then initialize
  if (window.initializeEducoreBot) {
    window.initializeEducoreBot({
      microservice: "ASSESSMENT",  // or "DEVLAB"
      userId: "user-123",          // Authenticated user ID
      token: "jwt-token-here",     // JWT or session token
      container: "#edu-bot-container"  // Optional, defaults to "#edu-bot-container"
    });
  } else {
    // Script not loaded yet, wait for it
    window.addEventListener('load', function() {
      if (window.initializeEducoreBot) {
        window.initializeEducoreBot({
          microservice: "ASSESSMENT",
          userId: "user-123",
          token: "jwt-token-here"
        });
      }
    });
  }
</script>
```

### How the Script Works

1. **`bot.js`** loads and exposes `window.initializeEducoreBot()`
2. **`bot.js`** dynamically loads `bot-bundle.js` (React bundle)
3. **`bot-bundle.js`** contains the React component (`embed.jsx`)
4. **`embed.jsx`** initializes the `FloatingChatWidget` component
5. Widget mounts into the specified container

### Build Output Structure

After building the frontend (`npm run build` in `FRONTEND/`):

```
FRONTEND/dist/
├── embed/
│   ├── bot.js              # Loader script (from public/bot.js)
│   └── bot-bundle.js        # React bundle (from src/embed.jsx)
└── assets/
    ├── index-*.js          # Main app bundle (if needed)
    └── ...
```

**Important:** The RAG microservice must serve these files at:
- `https://your-rag-service.com/embed/bot.js`
- `https://your-rag-service.com/embed/bot-bundle.js`

---

## Initialization Parameters

### Required Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `microservice` | `string` | Microservice identifier. Must be exactly `"ASSESSMENT"` or `"DEVLAB"` (case-insensitive, converted to uppercase). Determines which Support Mode to activate. | `"ASSESSMENT"` |
| `userId` | `string` | Authenticated user's ID. Must be provided after login. Used for recommendations and session tracking. | `"user-123"` |
| `token` | `string` | JWT or session token for authentication. Stored in `localStorage` as `token`. Used in Authorization header for API calls. | `"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."` |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `container` | `string` | `"#edu-bot-container"` | CSS selector for the container element where the widget will mount. |

### Support Mode Behavior

When `microservice` is provided:

- ✅ Widget enters **Support Mode** automatically
- ✅ General Chat Mode is **DISABLED**
- ✅ All messages are forwarded to `/api/assessment/support` or `/api/devlab/support`
- ✅ Responses are returned **verbatim** (no modification by RAG)
- ✅ Widget acts as a **transparent proxy**

### Token Storage

The widget stores authentication data in `localStorage`:

```javascript
localStorage.setItem('token', token);        // JWT token
localStorage.setItem('user_id', userId);     // User ID
localStorage.setItem('tenant_id', tenantId); // Optional, if provided
```

---

## Backend Requirements

### CORS Configuration

The RAG backend must allow requests from your microservice domain.

**File:** `BACKEND/src/index.js`

```javascript
const allowedOrigins = [
  'http://localhost:5173',           // Frontend dev
  'http://localhost:3000',            // Backend dev
  'http://localhost:5174',           // Alternative dev port
  process.env.FRONTEND_URL,           // Custom frontend URL
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  process.env.FRONTEND_VERCEL_URL,   // Vercel deployment URL
].filter(Boolean);
```

**To add your microservice domain:**

1. Set environment variable in RAG backend:
   ```bash
   FRONTEND_URL=https://assessment.educore.com
   # OR add multiple origins:
   SUPPORT_ALLOWED_ORIGINS=https://assessment.educore.com,https://devlab.educore.com
   ```

2. For Support Mode endpoints, also set:
   ```bash
   SUPPORT_ALLOWED_ORIGINS=https://assessment.educore.com,https://devlab.educore.com
   ```

### Support Mode Environment Variables

**Required for Support Mode to work:**

```bash
# Enable Support Mode
SUPPORT_MODE_ENABLED=true

# Allowed origins (comma-separated)
SUPPORT_ALLOWED_ORIGINS=https://assessment.educore.com,https://devlab.educore.com

# Optional: Shared secret for additional security
SUPPORT_SHARED_SECRET=your-secret-key-here
```

**If `SUPPORT_SHARED_SECRET` is set**, the frontend must send it in headers:

```javascript
// In microserviceProxy.js (already implemented)
headers: {
  'X-Embed-Secret': process.env.SUPPORT_SHARED_SECRET
}
```

### API Base URL

The frontend widget uses `VITE_API_BASE_URL` environment variable (set at build time) or defaults to `http://localhost:3000`.

**For production builds:**

```bash
# In FRONTEND/.env or build configuration
VITE_API_BASE_URL=https://rag-service.educore.com
```

---

## API Endpoints Reference

### 1. General Chat Query

**Endpoint:** `POST /api/v1/query`

**Used by:** General Chat Mode (when not in Support Mode)

**Request:**
```json
{
  "query": "How do I create an assessment?",
  "tenant_id": "dev.educore.local",
  "context": {
    "user_id": "user-123",
    "session_id": "session-456"
  },
  "options": {
    "max_results": 5,
    "min_confidence": 0.7,
    "include_metadata": true
  }
}
```

**Response:**
```json
{
  "answer": "To create an assessment, you need to...",
  "sources": [
    {
      "id": "doc-1",
      "title": "Assessment Guide",
      "url": "/docs/assessment"
    }
  ],
  "confidence": 0.95,
  "recommendations": [...]
}
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

### 2. Assessment Support (Proxy)

**Endpoint:** `POST /api/assessment/support`

**Used by:** Support Mode when `microservice: "ASSESSMENT"`

**Request:**
```json
{
  "query": "I can't submit my assessment",
  "timestamp": "2024-01-15T10:30:00Z",
  "session_id": "session-456",
  "support_mode": "Assessment",
  "metadata": {
    "user_id": "user-123",
    "tenant_id": "dev.educore.local",
    "source": "assessment"
  }
}
```

**Response:**
```json
{
  "response": "Assessment Support: I received your question...",
  "timestamp": "2024-01-15T10:30:01Z",
  "session_id": "session-456"
}
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
X-Source: assessment
X-Embed-Secret: <secret>  # Optional, if SUPPORT_SHARED_SECRET is set
Origin: https://assessment.educore.com
```

**Security:**
- Requires `SUPPORT_MODE_ENABLED=true`
- Origin must be in `SUPPORT_ALLOWED_ORIGINS` (if set)
- `X-Embed-Secret` must match `SUPPORT_SHARED_SECRET` (if set)

### 3. DevLab Support (Proxy)

**Endpoint:** `POST /api/devlab/support`

**Used by:** Support Mode when `microservice: "DEVLAB"`

**Request:** Same as Assessment Support, but with `"source": "devlab"`

**Response:** Same format as Assessment Support

**Headers:**
```
X-Source: devlab
```

### 4. Recommendations

**Endpoint:** `GET /api/v1/personalized/recommendations/:userId`

**Used by:** Widget to show personalized recommendations

**Query Parameters:**
- `tenant_id` (optional): Tenant identifier
- `mode` (optional): `"general"`, `"assessment"`, or `"devlab"`
- `limit` (optional): Maximum recommendations (default: 5)

**Example:**
```
GET /api/v1/personalized/recommendations/user-123?tenant_id=dev.educore.local&mode=assessment&limit=5
```

**Response:**
```json
{
  "recommendations": [
    {
      "id": "rec-1",
      "type": "button",
      "label": "Create New Assessment",
      "description": "Start creating a new assessment",
      "reason": "Based on your recent activity",
      "priority": 1,
      "metadata": {}
    }
  ],
  "userId": "user-123",
  "tenantId": "dev.educore.local",
  "mode": "assessment",
  "count": 5,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Complete Integration Examples

### Example 1: Assessment Microservice (Vanilla HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Assessment Dashboard</title>
</head>
<body>
  <h1>Assessment Dashboard</h1>
  
  <!-- Your assessment content here -->
  <div id="assessment-content">
    <!-- Assessment UI -->
  </div>
  
  <!-- Step 1: Bot Container -->
  <div id="edu-bot-container"></div>
  
  <!-- Step 2: Load Bot Script -->
  <script src="https://rag-service.educore.com/embed/bot.js"></script>
  
  <!-- Step 3: Initialize Bot (only after user login) -->
  <script>
    // Example: Initialize after user authentication
    function initializeBot() {
      const currentUser = getCurrentUser(); // Your auth function
      
      if (currentUser && currentUser.id && currentUser.token) {
        if (window.initializeEducoreBot) {
          window.initializeEducoreBot({
            microservice: "ASSESSMENT",
            userId: currentUser.id,
            token: currentUser.token,
            container: "#edu-bot-container"
          });
        } else {
          // Script not loaded yet, wait for it
          setTimeout(initializeBot, 100);
        }
      }
    }
    
    // Initialize when page loads (if user already logged in)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeBot);
    } else {
      initializeBot();
    }
    
    // Re-initialize after login (if using SPA)
    window.addEventListener('user-logged-in', initializeBot);
  </script>
</body>
</html>
```

### Example 2: DevLab Microservice (React)

```jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from './hooks/useAuth';

function DevLabDashboard() {
  const { user, token } = useAuth();
  const [botInitialized, setBotInitialized] = useState(false);

  useEffect(() => {
    // Only initialize if user is logged in
    if (!user || !token || botInitialized) return;

    // Load bot script
    const script = document.createElement('script');
    script.src = 'https://rag-service.educore.com/embed/bot.js';
    script.async = true;
    script.onload = () => {
      // Initialize bot after script loads
      if (window.initializeEducoreBot) {
        window.initializeEducoreBot({
          microservice: "DEVLAB",
          userId: user.id,
          token: token,
          container: "#edu-bot-container"
        });
        setBotInitialized(true);
      }
    };
    script.onerror = () => {
      console.error('Failed to load RAG bot script');
    };
    document.head.appendChild(script);

    // Cleanup
    return () => {
      if (window.destroyEducoreBot) {
        window.destroyEducoreBot();
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [user, token, botInitialized]);

  return (
    <div>
      <h1>DevLab Dashboard</h1>
      
      {/* Your DevLab content */}
      <div id="devlab-content">
        {/* DevLab UI */}
      </div>
      
      {/* Bot Container */}
      <div id="edu-bot-container"></div>
    </div>
  );
}

export default DevLabDashboard;
```

### Example 3: Course Builder Microservice (Vue.js)

```vue
<template>
  <div>
    <h1>Course Builder</h1>
    
    <!-- Course Builder content -->
    <div id="course-builder-content">
      <!-- Course Builder UI -->
    </div>
    
    <!-- Bot Container -->
    <div id="edu-bot-container"></div>
  </div>
</template>

<script>
import { onMounted, onUnmounted, ref } from 'vue';
import { useAuthStore } from './stores/auth';

export default {
  name: 'CourseBuilderDashboard',
  setup() {
    const authStore = useAuthStore();
    const botScriptLoaded = ref(false);

    const initializeBot = () => {
      if (!authStore.user || !authStore.token) return;
      
      if (window.initializeEducoreBot) {
        window.initializeEducoreBot({
          microservice: "ASSESSMENT", // Or appropriate microservice
          userId: authStore.user.id,
          token: authStore.token,
          container: "#edu-bot-container"
        });
      } else if (!botScriptLoaded.value) {
        // Load script
        const script = document.createElement('script');
        script.src = 'https://rag-service.educore.com/embed/bot.js';
        script.async = true;
        script.onload = () => {
          botScriptLoaded.value = true;
          initializeBot();
        };
        document.head.appendChild(script);
      }
    };

    onMounted(() => {
      // Wait a bit for auth to initialize
      setTimeout(initializeBot, 500);
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

---

## Customization Options

### Styling the Widget

The widget uses Material-UI (MUI) theming. To customize appearance, you can:

1. **Override CSS classes** (if widget exposes them):
   ```css
   #edu-bot-container .MuiPaper-root {
     border-radius: 16px !important;
   }
   ```

2. **Container positioning:**
   ```html
   <div id="edu-bot-container" style="position: fixed; bottom: 20px; right: 20px; z-index: 9999;"></div>
   ```

### Passing Context/Metadata

The widget automatically includes metadata in API requests:

```javascript
// Automatically included in requests:
{
  metadata: {
    user_id: userId,           // From initialization
    tenant_id: localStorage.getItem('tenant_id') || 'default',
    source: 'assessment'        // Derived from microservice parameter
  }
}
```

**To pass additional context:**

Modify `microserviceProxy.js` or extend the initialization:

```javascript
// Future: Could extend to accept additional metadata
window.initializeEducoreBot({
  microservice: "ASSESSMENT",
  userId: "user-123",
  token: "token-here",
  metadata: {
    assessment_id: "assessment-456",
    course_id: "course-789"
  }
});
```

### Overriding Default Behavior

**Disable recommendations:**
- Widget automatically fetches recommendations
- To disable, modify `FloatingChatWidget.jsx` or set `recommendations: []` in Redux state

**Change API base URL:**
- Set `VITE_API_BASE_URL` at build time
- Or modify `api.js` and `ragApi.js` to use a different base URL

---

## Troubleshooting

### Common Errors

#### 1. "Container not found in DOM"

**Error:**
```
EDUCORE Bot: Container "#edu-bot-container" not found in DOM
```

**Solution:**
- Ensure the container div exists before calling `initializeEducoreBot()`
- Wait for DOM to load: `document.addEventListener('DOMContentLoaded', ...)`
- Check that the selector matches exactly (case-sensitive)

#### 2. "Failed to load bot bundle"

**Error:**
```
EDUCORE Bot: Failed to load bot bundle from https://rag-service.com/embed/bot-bundle.js
```

**Solution:**
- Verify the RAG service is serving files at `/embed/bot-bundle.js`
- Check network tab for 404 errors
- Ensure build output includes `dist/embed/bot-bundle.js`
- Check CORS headers on the RAG service

#### 3. CORS Errors

**Error:**
```
Access to fetch at 'https://rag-service.com/api/assessment/support' from origin 'https://assessment.educore.com' has been blocked by CORS policy
```

**Solution:**
1. Add your microservice domain to RAG backend environment:
   ```bash
   SUPPORT_ALLOWED_ORIGINS=https://assessment.educore.com,https://devlab.educore.com
   FRONTEND_URL=https://assessment.educore.com
   ```
2. Restart RAG backend
3. Check backend logs for: `CORS allowed origins: ...`
4. Verify origin matches exactly (including protocol: `https://`)

#### 4. "Support mode is disabled"

**Error:**
```json
{
  "error": "Forbidden",
  "message": "Support mode is disabled"
}
```

**Solution:**
- Set `SUPPORT_MODE_ENABLED=true` in RAG backend environment
- Restart RAG backend

#### 5. "Origin not allowed for support mode"

**Error:**
```json
{
  "error": "Forbidden",
  "message": "Origin not allowed for support mode"
}
```

**Solution:**
- Add your origin to `SUPPORT_ALLOWED_ORIGINS`:
  ```bash
  SUPPORT_ALLOWED_ORIGINS=https://assessment.educore.com
  ```
- Restart RAG backend
- Check that the origin in the request matches exactly

#### 6. "Invalid support shared secret"

**Error:**
```json
{
  "error": "Forbidden",
  "message": "Invalid support shared secret"
}
```

**Solution:**
- If `SUPPORT_SHARED_SECRET` is set, ensure the frontend sends it:
  - Currently, `microserviceProxy.js` does NOT send this header automatically
  - You may need to modify `microserviceProxy.js` to include:
    ```javascript
    headers: {
      'X-Embed-Secret': process.env.SUPPORT_SHARED_SECRET
    }
    ```
- Or remove `SUPPORT_SHARED_SECRET` from backend if not needed

#### 7. Widget doesn't appear

**Symptoms:**
- No errors in console
- Container exists but is empty

**Solution:**
1. Check browser console for JavaScript errors
2. Verify script loaded: `console.log(window.initializeEducoreBot)`
3. Verify initialization was called
4. Check network tab for failed requests
5. Verify user is logged in (userId and token provided)

#### 8. Widget shows "Failed to load chatbot"

**Error:**
Widget displays: "Failed to load chatbot. Please refresh the page."

**Solution:**
- Check network tab for failed `bot-bundle.js` request
- Verify RAG service is running
- Check CORS configuration
- Verify build output exists

### Missing Environment Variables

**Frontend (Build Time):**
```bash
VITE_API_BASE_URL=https://rag-service.educore.com
```

**Backend (Runtime):**
```bash
# CORS
FRONTEND_URL=https://assessment.educore.com
SUPPORT_ALLOWED_ORIGINS=https://assessment.educore.com,https://devlab.educore.com

# Support Mode
SUPPORT_MODE_ENABLED=true
SUPPORT_SHARED_SECRET=optional-secret-key

# Database & Services
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
```

### Validating RAG Endpoint Works

**Test General Chat:**
```bash
curl -X POST https://rag-service.educore.com/api/v1/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "test query",
    "tenant_id": "dev.educore.local",
    "context": {
      "user_id": "test-user"
    }
  }'
```

**Test Assessment Support:**
```bash
curl -X POST https://rag-service.educore.com/api/assessment/support \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Source: assessment" \
  -H "Origin: https://assessment.educore.com" \
  -d '{
    "query": "test question",
    "metadata": {
      "user_id": "test-user",
      "tenant_id": "dev.educore.local",
      "source": "assessment"
    }
  }'
```

**Check Health:**
```bash
curl https://rag-service.educore.com/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "service": "rag-microservice"
}
```

---

## Verification Checklist

Use this checklist to verify correct integration:

### Pre-Integration

- [ ] RAG microservice is deployed and accessible
- [ ] RAG backend environment variables are set:
  - [ ] `SUPPORT_MODE_ENABLED=true`
  - [ ] `SUPPORT_ALLOWED_ORIGINS` includes your microservice domain
  - [ ] `FRONTEND_URL` or CORS origins configured
- [ ] RAG frontend is built and serving `/embed/bot.js` and `/embed/bot-bundle.js`
- [ ] Health endpoint responds: `GET /health`

### Integration Steps

- [ ] Added container div: `<div id="edu-bot-container"></div>`
- [ ] Loaded bot script: `<script src="https://rag-service.com/embed/bot.js"></script>`
- [ ] Initialized with required parameters:
  - [ ] `microservice`: `"ASSESSMENT"` or `"DEVLAB"`
  - [ ] `userId`: Authenticated user ID
  - [ ] `token`: JWT or session token
- [ ] Initialization only happens after user login
- [ ] Widget does NOT appear on public pages (login, register)

### Functionality Tests

- [ ] Widget appears in container after initialization
- [ ] Widget opens/closes when clicking button
- [ ] User can type and send messages
- [ ] Messages are sent to correct endpoint:
  - [ ] Support Mode: `/api/assessment/support` or `/api/devlab/support`
  - [ ] General Mode: `/api/v1/query` (if not in Support Mode)
- [ ] Responses appear in chat
- [ ] No CORS errors in console
- [ ] No 403/404 errors in network tab
- [ ] Recommendations appear (if available)

### Security Checks

- [ ] Widget only initializes for authenticated users
- [ ] Token is stored securely (localStorage - acceptable for JWT)
- [ ] CORS is properly configured
- [ ] Support Mode secret is set (if using `SUPPORT_SHARED_SECRET`)
- [ ] Origin validation works (test with wrong origin)

### Production Readiness

- [ ] All environment variables set in production
- [ ] HTTPS enabled for all services
- [ ] CORS origins are specific (not `*`)
- [ ] Error handling is graceful
- [ ] Widget works across browsers (Chrome, Firefox, Safari, Edge)
- [ ] Widget is responsive (mobile/tablet/desktop)
- [ ] Performance is acceptable (widget loads quickly)

---

## Additional Resources

### Code References

- **Frontend Widget:** `FRONTEND/src/components/chat/FloatingChatWidget/FloatingChatWidget.jsx`
- **Embed Script:** `FRONTEND/public/bot.js`
- **Embed Entry:** `FRONTEND/src/embed.jsx`
- **Proxy Service:** `FRONTEND/src/services/microserviceProxy.js`
- **API Client:** `FRONTEND/src/services/api.js`
- **Backend Routes:** `BACKEND/src/routes/microserviceSupport.routes.js`
- **Backend Controller:** `BACKEND/src/controllers/microserviceSupport.controller.js`
- **CORS Config:** `BACKEND/src/index.js`

### Documentation Files

- `FRONTEND/EMBEDDING_GUIDE.md` - Original embedding guide
- `BACKEND/CORS_FIX_INSTRUCTIONS.md` - CORS setup instructions
- `BACKEND/README.md` - Backend API documentation

### Support

For issues or questions:
1. Check backend logs for CORS/origin errors
2. Verify environment variables are set correctly
3. Test endpoints with curl/Postman
4. Check browser console and network tab
5. Contact RAG microservice team

---

## Summary

The RAG Chat Widget integration requires:

1. **HTML:** Add container div and load `bot.js` script
2. **JavaScript:** Call `window.initializeEducoreBot()` with `microservice`, `userId`, and `token`
3. **Backend:** Configure CORS and Support Mode environment variables
4. **Security:** Ensure proper origin validation and authentication

The widget automatically enters Support Mode when `microservice` is provided, forwarding all messages to the appropriate microservice endpoint and returning responses verbatim.

---

**End of Integration Guide**













