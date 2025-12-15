# Frontend Documentation - RAG Chat Widget

**Version:** 2.0  
**Last Updated:** Based on current implementation  
**Status:** ✅ Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [User Awareness & Identity Propagation](#user-awareness--identity-propagation)
4. [Data Flow](#data-flow)
5. [API Communication](#api-communication)
6. [Embedding Instructions](#embedding-instructions)
7. [User Context Loading](#user-context-loading)
8. [Redux Structure](#redux-structure)
9. [Networking Layer](#networking-layer)
10. [Component Structure](#component-structure)
11. [Developer Setup](#developer-setup)
12. [File Responsibility Map](#file-responsibility-map)
13. [Best Practices](#best-practices)

---

## Overview

The RAG Chat Widget is a React-based floating chat interface that can be embedded into any EDUCORE microservice. It provides:

- **General Chat Mode**: Direct RAG queries using vector search and OpenAI
- **Support Mode**: Proxy mode that forwards messages to specific microservices (Assessment, DevLab)
- **User Awareness**: Automatic user identity propagation to all backend requests
- **Multi-tenant Support**: Full tenant isolation via headers
- **Personalized Recommendations**: Context-aware recommendations based on user and mode

### Key Features

- ✅ User context loading from multiple sources (priority-based)
- ✅ Automatic header propagation (Authorization, X-User-Id, X-Tenant-Id)
- ✅ Multi-mode operation (General, Assessment Support, DevLab Support)
- ✅ Anonymous mode fallback
- ✅ Backward compatibility with props-based initialization
- ✅ Redux-based state management
- ✅ RTK Query for API communication

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  External Microservice (Assessment/DevLab/Course Builder)   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  HTML Page with Embedded Widget                     │   │
│  │  <div id="edu-bot-container"></div>                 │   │
│  │  <script src="https://rag-service.com/embed/bot.js">  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ User sends message
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  RAG Frontend Widget (React Component)                      │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  FloatingChatWidget Component                        │   │
│  │  - User Context Loading (useAuth hook)               │   │
│  │  - Mode Detection (General/Support)                 │   │
│  │  - Message Routing                                   │   │
│  │  - Redux State Management                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  API Layer                                           │   │
│  │  - api.js (Axios with interceptors)                 │   │
│  │  - ragApi.js (RTK Query)                            │   │
│  │  - microserviceProxy.js (Support Mode proxy)        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ POST with headers
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  RAG Backend (Express.js)                                    │
│  - Receives: Authorization, X-User-Id, X-Tenant-Id headers  │
│  - Routes to appropriate handler                            │
│  - Returns response                                          │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
App.jsx
  └── FloatingChatWidget (from chat/)
      ├── ChatWidgetButton (from chatbot/)
      └── ChatPanel (from chatbot/)
          ├── ChatHeader (from chatbot/)
          ├── ChatMessage (from chatbot/)
          ├── Recommendations (from chatbot/)
          └── ChatInput (from chatbot/)
```

### Directory Structure

```
FRONTEND/
├── src/
│   ├── components/
│   │   ├── chat/                    # High-level feature components
│   │   │   ├── FloatingChatWidget/  # Main orchestrator component
│   │   │   └── ChatInterface/       # Placeholder (unused)
│   │   └── chatbot/                 # Low-level UI building blocks
│   │       ├── ChatPanel/           # Main chat container
│   │       ├── ChatHeader/          # Header with mode indicator
│   │       ├── ChatMessage/         # Individual message component
│   │       ├── ChatInput/           # Message input field
│   │       ├── ChatWidgetButton/    # Floating button
│   │       └── Recommendations/     # Dynamic recommendations
│   ├── store/                       # Redux store and slices
│   │   ├── slices/
│   │   │   ├── auth.slice.js        # User context state
│   │   │   ├── chat.slice.js        # Chat messages state
│   │   │   ├── chatMode.slice.js    # Mode state (General/Support)
│   │   │   ├── ui.slice.js          # UI state (open/close)
│   │   │   └── user.slice.js       # User profile (unused)
│   │   └── api/
│   │       └── ragApi.js            # RTK Query API
│   ├── services/                    # API services
│   │   ├── api.js                   # Axios instance with interceptors
│   │   ├── microserviceProxy.js     # Support Mode proxy
│   │   └── supabase.js              # Supabase client (unused)
│   ├── hooks/                       # Custom React hooks
│   │   ├── useAuth.js               # User context management
│   │   ├── useChat.js                # Chat operations (unused)
│   │   └── useRealtime.js            # Realtime updates (unused)
│   ├── utils/                       # Utility functions
│   │   ├── userContextLoader.js     # User context loading logic
│   │   ├── answerFormatter.js       # Message formatting
│   │   ├── modeDetector.js          # Mode detection
│   │   ├── recommendations.js       # Recommendation logic
│   │   └── constants.js             # Constants (unused)
│   ├── theme/                       # Material-UI theme
│   │   ├── theme.js                 # Main theme export
│   │   ├── lightTheme.js            # Light theme
│   │   └── darkTheme.js             # Dark theme (unused)
│   ├── App.jsx                      # Main application component
│   ├── main.jsx                     # Entry point
│   └── embed.jsx                    # Embed entry point
├── public/
│   └── bot.js                       # Embed loader script
└── dist/                            # Build output
    └── embed/
        ├── bot.js                   # Loader script
        └── bot-bundle.js            # React bundle
```

---

## User Awareness & Identity Propagation

### Overview

The widget implements a comprehensive user awareness system that:

1. Loads user context from multiple sources (priority-based)
2. Stores context in Redux state
3. Automatically propagates identity to ALL backend requests via headers
4. Maintains backward compatibility and anonymous mode

### User Context Structure

```javascript
{
  userId: string,        // Required - User identifier
  token: string,         // Required - Authentication token
  tenantId: string,      // Required - Multi-tenant identifier
  name?: string,         // Optional - User display name
  email?: string         // Optional - User email
}
```

### Required Headers on All Backend Calls

All requests automatically include:

- `Authorization: Bearer {token}`
- `X-User-Id: {userId}`
- `X-Tenant-Id: {tenantId}`

These headers are added automatically by:
- **Axios interceptor** (`api.js`) - For all requests via `api` instance
- **RTK Query prepareHeaders** (`ragApi.js`) - For all RTK Query requests

### Implementation Details

#### 1. User Context Loading Priority

The widget loads user context from sources in this priority order:

1. **`window.RAG_USER`** (host-injected) - Highest priority
2. **Widget props** (`userId`, `token`, `tenantId`) - Second priority
3. **LocalStorage** (`user_id`, `token`, `tenant_id`) - Third priority
4. **`/auth/me` endpoint** (optional fallback) - Lowest priority

**Implementation:** `src/utils/userContextLoader.js`

#### 2. Redux State Management

User context is stored in Redux `auth.slice`:

```javascript
{
  userId: string | null,
  token: string | null,
  tenantId: string | null,
  profile: { name?: string, email?: string } | null,
  isAuthenticated: boolean,
  isLoading: boolean,
  source: 'window' | 'props' | 'localStorage' | 'endpoint' | null
}
```

**Actions:**
- `setUserContext({ userId, token, tenantId, name?, email?, source })` - Set complete context
- `updateUserProfile({ name?, email? })` - Update optional profile fields
- `clearUserContext()` - Clear context (anonymous mode)
- `setLoading(boolean)` - Set loading state

**Implementation:** `src/store/slices/auth.slice.js`

#### 3. useAuth Hook

The `useAuth` hook provides:

```javascript
const {
  // Context data
  userId,
  token,
  tenantId,
  profile,
  isAuthenticated,
  isLoading,
  source,
  
  // Actions
  loadUserContext,      // Manually trigger context loading
  updateUserProfile,    // Update optional profile fields
  clearUserContext,     // Clear context (logout equivalent)
  refreshUserContext    // Reload context from sources
} = useAuth({ props: { userId, token, tenantId } });
```

**Implementation:** `src/hooks/useAuth.js`

#### 4. Automatic Header Propagation

**Axios Interceptor** (`src/services/api.js`):

```javascript
api.interceptors.request.use((config) => {
  const state = store.getState();
  const { token, userId, tenantId } = state.auth;
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (userId) {
    config.headers['X-User-Id'] = userId;
  }
  if (tenantId) {
    config.headers['X-Tenant-Id'] = tenantId;
  }
  
  return config;
});
```

**RTK Query prepareHeaders** (`src/store/api/ragApi.js`):

```javascript
prepareHeaders: (headers, { getState }) => {
  const state = getState();
  const { token, userId, tenantId } = state.auth;
  
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }
  if (userId) {
    headers.set('X-User-Id', userId);
  }
  if (tenantId) {
    headers.set('X-Tenant-Id', tenantId);
  }
  
  return headers;
}
```

### Anonymous Mode

If no user context is found:

- Redux state remains `null` for `userId`, `token`, `tenantId`
- Widget uses fallback values: `'anonymous'` / `'default'`
- Headers are only added if values exist (or can send anonymous/default)
- Widget remains fully functional

### Backward Compatibility

- ✅ Existing props (`userId`, `token`) still work (priority #2)
- ✅ Legacy actions preserved in `auth.slice`
- ✅ No breaking changes to component APIs
- ✅ Anonymous mode still functional

---

## Data Flow

### General Chat Mode Flow

```
User Message
  ↓
FloatingChatWidget
  ↓
useSubmitQueryMutation (RTK Query)
  ↓
ragApi.js → prepareHeaders adds identity headers
  ↓
POST /api/v1/query
  ↓
RAG Backend
  ↓
Vector Search → OpenAI
  ↓
Response
  ↓
FloatingChatWidget displays message
```

### Support Mode Flow

```
User Message
  ↓
FloatingChatWidget (detects Support Mode)
  ↓
microserviceProxy.js
  ↓
api.js → interceptor adds identity headers
  ↓
POST /api/assessment/support or /api/devlab/support
  ↓
RAG Backend (proxy)
  ↓
Response (verbatim)
  ↓
FloatingChatWidget displays message
```

### User Context Loading Flow

```
Widget Mount
  ↓
useAuth hook called
  ↓
loadUserContext() from userContextLoader.js
  ↓
Priority check:
  1. window.RAG_USER?
  2. Props (userId, token)?
  3. LocalStorage?
  4. /auth/me endpoint?
  ↓
Context found → setUserContext() → Redux state updated
  ↓
Widget uses Redux values (with fallback to props/anonymous)
```

---

## API Communication

### Base Configuration

**Environment Variable:**
```bash
VITE_API_BASE_URL=https://rag-service.educore.com
```

**Default:** `http://localhost:3000` (development)

### Endpoints

#### 1. General Chat Query

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

**Headers (automatically added):**
```
Authorization: Bearer <token>
X-User-Id: <userId>
X-Tenant-Id: <tenantId>
Content-Type: application/json
```

**Response:**
```json
{
  "answer": "To create an assessment, you need to...",
  "sources": [...],
  "confidence": 0.95,
  "recommendations": [...]
}
```

**Implementation:** RTK Query `submitQuery` mutation

#### 2. Assessment Support (Proxy)

**Endpoint:** `POST /api/assessment/support`

**Used by:** Support Mode when `microservice: "ASSESSMENT"`

**Request:**
```json
{
  "query": "I can't submit my assessment",
  "timestamp": "2024-01-15T10:30:00Z",
  "session_id": "session-456",
  "support_mode": "Assessment"
}
```

**Headers (automatically added):**
```
Authorization: Bearer <token>
X-User-Id: <userId>
X-Tenant-Id: <tenantId>
Content-Type: application/json
```

**Response:**
```json
{
  "response": "Assessment Support: I received your question...",
  "timestamp": "2024-01-15T10:30:01Z",
  "session_id": "session-456"
}
```

**Implementation:** `microserviceProxy.js` → `forwardToAssessmentMicroservice()`

#### 3. DevLab Support (Proxy)

**Endpoint:** `POST /api/devlab/support`

**Used by:** Support Mode when `microservice: "DEVLAB"`

**Request/Response:** Same format as Assessment Support

**Implementation:** `microserviceProxy.js` → `forwardToDevLabMicroservice()`

#### 4. Recommendations

**Endpoint:** `GET /api/v1/personalized/recommendations/:userId`

**Query Parameters:**
- `tenant_id` (optional): Tenant identifier
- `mode` (optional): `"general"`, `"assessment"`, or `"devlab"`
- `limit` (optional): Maximum recommendations (default: 5)

**Example:**
```
GET /api/v1/personalized/recommendations/user-123?tenant_id=dev.educore.local&mode=assessment&limit=5
```

**Headers (automatically added):**
```
Authorization: Bearer <token>
X-User-Id: <userId>
X-Tenant-Id: <tenantId>
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

**Implementation:** RTK Query `getRecommendations` query

---

## Embedding Instructions

### Quick Start

#### Step 1: Add Container Element

```html
<div id="edu-bot-container"></div>
```

You can use any ID or CSS selector. The default is `#edu-bot-container`.

#### Step 2: Load the Bot Script

```html
<script src="https://your-rag-service.com/embed/bot.js"></script>
```

**Important:** Replace `https://your-rag-service.com` with your actual RAG microservice URL.

#### Step 3: Initialize the Bot

```html
<script>
  // Wait for script to load, then initialize
  if (window.initializeEducoreBot) {
    window.initializeEducoreBot({
      microservice: "ASSESSMENT",  // or "DEVLAB"
      userId: "user-123",          // Authenticated user ID
      token: "jwt-token-here",     // JWT or session token
      tenantId: "tenant-123",      // Optional: Tenant ID
      container: "#edu-bot-container"  // Optional, defaults to "#edu-bot-container"
    });
  } else {
    // Script not loaded yet, wait for it
    window.addEventListener('load', function() {
      if (window.initializeEducoreBot) {
        window.initializeEducoreBot({
          microservice: "ASSESSMENT",
          userId: "user-123",
          token: "jwt-token-here",
          tenantId: "tenant-123"
        });
      }
    });
  }
</script>
```

### Initialization Parameters

#### Required Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `microservice` | `string` | Microservice identifier. Must be exactly `"ASSESSMENT"` or `"DEVLAB"` (case-insensitive, converted to uppercase). Determines which Support Mode to activate. | `"ASSESSMENT"` |
| `userId` | `string` | Authenticated user's ID. Must be provided after login. Used for recommendations and session tracking. | `"user-123"` |
| `token` | `string` | JWT or session token for authentication. Stored in Redux state. Used in Authorization header for API calls. | `"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."` |

#### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `tenantId` | `string` | `"default"` | Multi-tenant identifier. Used in `X-Tenant-Id` header. |
| `container` | `string` | `"#edu-bot-container"` | CSS selector for the container element where the widget will mount. |

### Support Mode Behavior

When `microservice` is provided:

- ✅ Widget enters **Support Mode** automatically
- ✅ General Chat Mode is **DISABLED**
- ✅ All messages are forwarded to `/api/assessment/support` or `/api/devlab/support`
- ✅ Responses are returned **verbatim** (no modification by RAG)
- ✅ Widget acts as a **transparent proxy**

### Complete Integration Examples

#### Example 1: Vanilla HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Assessment Dashboard</title>
</head>
<body>
  <h1>Assessment Dashboard</h1>
  
  <!-- Bot Container -->
  <div id="edu-bot-container"></div>
  
  <!-- Load Bot Script -->
  <script src="https://rag-service.educore.com/embed/bot.js"></script>
  
  <!-- Initialize Bot (only after user login) -->
  <script>
    function initializeBot() {
      const currentUser = getCurrentUser(); // Your auth function
      
      if (currentUser && currentUser.id && currentUser.token) {
        if (window.initializeEducoreBot) {
          window.initializeEducoreBot({
            microservice: "ASSESSMENT",
            userId: currentUser.id,
            token: currentUser.token,
            tenantId: currentUser.tenantId || "default",
            container: "#edu-bot-container"
          });
        } else {
          setTimeout(initializeBot, 100);
        }
      }
    }
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeBot);
    } else {
      initializeBot();
    }
  </script>
</body>
</html>
```

#### Example 2: React

```jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from './hooks/useAuth';

function AssessmentDashboard() {
  const { user, token } = useAuth();
  const [botInitialized, setBotInitialized] = useState(false);

  useEffect(() => {
    if (!user || !token || botInitialized) return;

    const script = document.createElement('script');
    script.src = 'https://rag-service.educore.com/embed/bot.js';
    script.async = true;
    script.onload = () => {
      if (window.initializeEducoreBot) {
        window.initializeEducoreBot({
          microservice: "ASSESSMENT",
          userId: user.id,
          token: token,
          tenantId: user.tenantId || "default",
          container: "#edu-bot-container"
        });
        setBotInitialized(true);
      }
    };
    document.head.appendChild(script);

    return () => {
      if (window.destroyEducoreBot) {
        window.destroyEducoreBot();
      }
    };
  }, [user, token, botInitialized]);

  return (
    <div>
      <h1>Assessment Dashboard</h1>
      <div id="edu-bot-container"></div>
    </div>
  );
}
```

### Build Output Structure

After building the frontend (`npm run build` in `FRONTEND/`):

```
FRONTEND/dist/
├── embed/
│   ├── bot.js              # Loader script (from public/bot.js)
│   └── bot-bundle.js        # React bundle (from src/embed.jsx)
└── assets/
    └── ...
```

**Important:** The RAG microservice must serve these files at:
- `https://your-rag-service.com/embed/bot.js`
- `https://your-rag-service.com/embed/bot-bundle.js`

---

## User Context Loading

### Priority Order

The widget loads user context from sources in this priority order:

1. **`window.RAG_USER`** (host-injected) - Highest priority
   ```javascript
   window.RAG_USER = {
     userId: "user-123",
     token: "jwt-token-here",
     tenantId: "tenant-123",
     name: "John Doe",      // Optional
     email: "john@example.com"  // Optional
   };
   ```

2. **Widget props** (`userId`, `token`, `tenantId`) - Second priority
   ```javascript
   <FloatingChatWidget
     userId="user-123"
     token="jwt-token-here"
     tenantId="tenant-123"
   />
   ```

3. **LocalStorage** - Third priority
   ```javascript
   localStorage.setItem('user_id', 'user-123');
   localStorage.setItem('token', 'jwt-token-here');
   localStorage.setItem('tenant_id', 'tenant-123');
   ```

4. **`/auth/me` endpoint** (optional fallback) - Lowest priority
   ```javascript
   GET /auth/me
   // Returns: { userId, token, tenantId, name?, email? }
   ```

### Implementation

**File:** `src/utils/userContextLoader.js`

**Function:** `loadUserContext(options)`

**Parameters:**
- `props` - Widget props (userId, token, tenantId)
- `windowObject` - Window object (for testing, default: window)
- `storage` - Storage object (for testing, default: localStorage)
- `apiBaseUrl` - API base URL for /auth/me endpoint
- `fetchFn` - Fetch function (for testing)

**Returns:**
```javascript
{
  context: {
    userId: string,
    token: string,
    tenantId: string,
    name?: string,
    email?: string
  } | null,
  source: 'window' | 'props' | 'localStorage' | 'endpoint' | null
}
```

### Usage in Components

```javascript
import { useAuth } from '../hooks/useAuth';

function MyComponent() {
  const { userId, token, tenantId, isLoading, source } = useAuth({
    props: { userId: props.userId, token: props.token },
    autoLoad: true
  });
  
  // Context is automatically loaded on mount
  // Access values: userId, token, tenantId
  // Check source: source (where context came from)
}
```

### Anonymous Mode

If no context is found:

- Returns `{ context: null, source: null }`
- Widget continues operating with fallback values:
  - `userId`: `'anonymous'`
  - `tenantId`: `'default'`
- Headers are only added if values exist

---

## Redux Structure

### Store Configuration

**File:** `src/store/store.js`

```javascript
{
  auth: authSlice,           // User context state
  chat: chatSlice,           // Chat messages state
  chatMode: chatModeSlice,   // Mode state (General/Support)
  ui: uiSlice,               // UI state (open/close)
  user: userSlice,           // User profile (unused)
  ragApi: ragApi.reducer     // RTK Query cache
}
```

### Slices

#### 1. auth.slice.js

**State:**
```javascript
{
  userId: string | null,
  token: string | null,
  tenantId: string | null,
  profile: { name?: string, email?: string } | null,
  isAuthenticated: boolean,
  isLoading: boolean,
  source: 'window' | 'props' | 'localStorage' | 'endpoint' | null,
  user: any | null  // Legacy field
}
```

**Actions:**
- `setUserContext({ userId, token, tenantId, name?, email?, source })`
- `updateUserProfile({ name?, email? })`
- `clearUserContext()`
- `setLoading(boolean)`
- `setUser(user)` - Legacy
- `setToken(token)` - Legacy
- `logout()` - Legacy

#### 2. chat.slice.js

**State:**
```javascript
{
  messages: Array<{
    id: string,
    text: string,
    isBot: boolean,
    timestamp: string
  }>,
  isLoading: boolean
}
```

**Actions:**
- `addMessage(message)`
- `setLoading(boolean)`
- `clearMessages()`

#### 3. chatMode.slice.js

**State:**
```javascript
{
  currentMode: 'GENERAL' | 'ASSESSMENT_SUPPORT' | 'DEVLAB_SUPPORT'
}
```

**Actions:**
- `setGeneralMode()`
- `setAssessmentSupportMode()`
- `setDevLabSupportMode()`

**Constants:**
```javascript
MODES = {
  GENERAL: 'GENERAL',
  ASSESSMENT_SUPPORT: 'ASSESSMENT_SUPPORT',
  DEVLAB_SUPPORT: 'DEVLAB_SUPPORT'
}
```

#### 4. ui.slice.js

**State:**
```javascript
{
  isWidgetOpen: boolean
}
```

**Actions:**
- `toggleWidget()`
- `setWidgetOpen(boolean)`

#### 5. ragApi (RTK Query)

**Endpoints:**
- `submitQuery` mutation - POST /api/v1/query
- `getRecommendations` query - GET /api/v1/personalized/recommendations/:userId

**Tags:**
- `['Query']` - Invalidated on query submission
- `['Recommendation']` - Used for recommendations cache

---

## Networking Layer

### API Service (Axios)

**File:** `src/services/api.js`

**Features:**
- Base URL from `VITE_API_BASE_URL` environment variable
- Request interceptor adds identity headers from Redux store
- Response interceptor for error handling

**Usage:**
```javascript
import api from './services/api.js';

// All requests automatically include headers
const response = await api.post('/api/endpoint', data);
```

### RTK Query API

**File:** `src/store/api/ragApi.js`

**Features:**
- Base URL from `VITE_API_BASE_URL` environment variable
- `prepareHeaders` adds identity headers from Redux store
- Automatic caching and invalidation
- TypeScript-ready (if using TypeScript)

**Usage:**
```javascript
import { useSubmitQueryMutation, useGetRecommendationsQuery } from './store/api/ragApi.js';

// In component
const [submitQuery, { isLoading }] = useSubmitQueryMutation();
const { data: recommendations } = useGetRecommendationsQuery({ userId, tenant_id, mode, limit });
```

### Microservice Proxy

**File:** `src/services/microserviceProxy.js`

**Features:**
- Transparent proxy for Support Mode
- Forwards messages to Assessment/DevLab endpoints
- Returns responses verbatim
- Session ID management

**Functions:**
- `forwardToAssessmentMicroservice(userMessage)` - Forward to Assessment
- `forwardToDevLabMicroservice(userMessage)` - Forward to DevLab
- `proxyToMicroservice(userMessage, mode)` - Route based on mode

**Usage:**
```javascript
import { proxyToMicroservice } from './services/microserviceProxy.js';
import { MODES } from './store/slices/chatMode.slice.js';

const response = await proxyToMicroservice(userMessage, MODES.ASSESSMENT_SUPPORT);
```

---

## Component Structure

### High-Level Components (`chat/`)

#### FloatingChatWidget

**File:** `src/components/chat/FloatingChatWidget/FloatingChatWidget.jsx`

**Purpose:** Main orchestrator component that manages the entire chat functionality

**Responsibilities:**
- User context loading (via `useAuth` hook)
- Redux state management (messages, loading, chat modes)
- API calls to RAG backend
- Multi-mode behavior (General/Assessment/DevLab Support)
- Message routing (General mode → RAG API, Support modes → Microservice proxy)
- Recommendations management (API-based + fallback)
- Uses components from `chatbot/` directory to build the UI

**Props:**
- `embedded` (boolean) - Whether widget is embedded
- `initialMode` (string) - Initial mode ('ASSESSMENT_SUPPORT' or 'DEVLAB_SUPPORT')
- `userId` (string) - User ID (backward compatibility)
- `token` (string) - Auth token (backward compatibility)
- `tenantId` (string) - Tenant ID (backward compatibility)

### Low-Level Components (`chatbot/`)

#### ChatPanel

**Purpose:** Main chat container that combines header, messages, recommendations, and input

**Features:**
- Fixed position floating panel (bottom-right)
- Animation with Framer Motion
- Responsive design

#### ChatHeader

**Purpose:** Header with mode indicator

**Features:**
- Shows greeting/status
- Mode badges (Assessment/DevLab Support)
- Close button
- Status indicators

#### ChatMessage

**Purpose:** Individual message component

**Features:**
- User vs Bot message styling
- Rich formatting (headers, lists, code blocks)
- Timestamps
- Avatar icons

#### ChatInput

**Purpose:** Message input field

**Features:**
- Text input with search icon
- Send button
- Mode-specific placeholders
- Enter key submission

#### ChatWidgetButton

**Purpose:** Floating button

**Features:**
- Bottom-right floating button
- Toggle widget open/close
- Pulse animation
- Unread badge support

#### Recommendations

**Purpose:** Dynamic recommendations

**Features:**
- Quick action buttons
- Recommendation cards
- Mode-aware display

---

## Developer Setup

### Prerequisites

- Node.js 18+ and npm
- Access to RAG backend service

### Installation

```bash
cd FRONTEND

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and set VITE_API_BASE_URL
```

### Environment Variables

Create `.env` file:

```env
VITE_API_BASE_URL=http://localhost:3000
```

**For Production:**
```env
VITE_API_BASE_URL=https://rag-service.educore.com
```

### Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run end-to-end tests
npm run test:e2e

# Lint code
npm run lint

# Format code
npm run format
```

### Development Workflow

1. Start backend: `cd BACKEND && npm start`
2. Start frontend: `cd FRONTEND && npm run dev`
3. Open browser: `http://localhost:5173`
4. Widget should connect to backend automatically

### Testing

**Unit Tests:**
```bash
npm run test:unit
```

**Integration Tests:**
```bash
npm run test:integration
```

**E2E Tests:**
```bash
npm run test:e2e
```

### Building for Production

```bash
# Build
npm run build

# Output in dist/
# - dist/embed/bot.js (loader script)
# - dist/embed/bot-bundle.js (React bundle)
# - dist/assets/... (chunks)
```

### Deployment

1. Build frontend: `npm run build`
2. Serve `dist/embed/` files from RAG microservice at `/embed/` path
3. Ensure backend CORS allows frontend domain
4. Set `VITE_API_BASE_URL` in build configuration

---

## File Responsibility Map

### Core Files

| File | Responsibility |
|------|----------------|
| `src/App.jsx` | Main application component, theme provider |
| `src/main.jsx` | Entry point for standalone app |
| `src/embed.jsx` | Entry point for embedded widget |
| `public/bot.js` | Embed loader script (exposes `window.initializeEducoreBot`) |

### Components

| File | Responsibility |
|------|----------------|
| `src/components/chat/FloatingChatWidget/FloatingChatWidget.jsx` | Main orchestrator, state management, API calls |
| `src/components/chatbot/ChatPanel/ChatPanel.jsx` | Main chat container |
| `src/components/chatbot/ChatHeader/ChatHeader.jsx` | Header with mode indicator |
| `src/components/chatbot/ChatMessage/ChatMessage.jsx` | Individual message display |
| `src/components/chatbot/ChatInput/ChatInput.jsx` | Message input field |
| `src/components/chatbot/ChatWidgetButton/ChatWidgetButton.jsx` | Floating toggle button |
| `src/components/chatbot/Recommendations/Recommendations.jsx` | Dynamic recommendations display |

### State Management

| File | Responsibility |
|------|----------------|
| `src/store/store.js` | Redux store configuration |
| `src/store/slices/auth.slice.js` | User context state |
| `src/store/slices/chat.slice.js` | Chat messages state |
| `src/store/slices/chatMode.slice.js` | Mode state (General/Support) |
| `src/store/slices/ui.slice.js` | UI state (open/close) |
| `src/store/api/ragApi.js` | RTK Query API configuration |

### Services

| File | Responsibility |
|------|----------------|
| `src/services/api.js` | Axios instance with interceptors (adds headers) |
| `src/services/microserviceProxy.js` | Support Mode proxy (Assessment/DevLab) |
| `src/services/supabase.js` | Supabase client (unused) |

### Hooks

| File | Responsibility |
|------|----------------|
| `src/hooks/useAuth.js` | User context management |
| `src/hooks/useChat.js` | Chat operations (unused) |
| `src/hooks/useRealtime.js` | Realtime updates (unused) |

### Utilities

| File | Responsibility |
|------|----------------|
| `src/utils/userContextLoader.js` | User context loading logic (priority-based) |
| `src/utils/answerFormatter.js` | Message formatting (markdown, code blocks) |
| `src/utils/modeDetector.js` | Mode detection from user messages |
| `src/utils/recommendations.js` | Recommendation logic (fallback) |
| `src/utils/constants.js` | Constants (unused) |

### Theme

| File | Responsibility |
|------|----------------|
| `src/theme/theme.js` | Main theme export |
| `src/theme/lightTheme.js` | Light theme configuration |
| `src/theme/darkTheme.js` | Dark theme configuration (unused) |

---

## Best Practices

### User Context

1. **Always use Redux selectors** instead of direct localStorage access
   ```javascript
   // ✅ Good
   const userId = useSelector((state) => state.auth.userId);
   
   // ❌ Bad
   const userId = localStorage.getItem('user_id');
   ```

2. **Use useAuth hook** for context management
   ```javascript
   // ✅ Good
   const { userId, token, tenantId } = useAuth({ props });
   
   // ❌ Bad
   const userId = localStorage.getItem('user_id');
   ```

3. **Handle anonymous mode gracefully**
   ```javascript
   const userId = authUserId || userId || 'anonymous';
   const tenantId = authTenantId || tenantId || 'default';
   ```

### API Calls

1. **Use RTK Query** for RAG API calls
   ```javascript
   // ✅ Good
   const [submitQuery] = useSubmitQueryMutation();
   
   // ❌ Bad
   const response = await fetch('/api/v1/query', ...);
   ```

2. **Use api.js** for microservice proxy calls
   ```javascript
   // ✅ Good
   import api from './services/api.js';
   const response = await api.post('/api/assessment/support', data);
   
   // ❌ Bad
   const response = await fetch('/api/assessment/support', ...);
   ```

3. **Headers are automatic** - Don't manually add identity headers

### Component Structure

1. **Keep components focused** - One responsibility per component
2. **Use Redux for shared state** - Don't prop-drill deeply
3. **Use hooks for reusable logic** - Custom hooks for common patterns

### Error Handling

1. **Handle loading states** - Show loading indicators
2. **Handle errors gracefully** - Display user-friendly error messages
3. **Log errors for debugging** - Use console.error for development

### Performance

1. **Lazy load components** - Use React.lazy() for code splitting
2. **Memoize expensive computations** - Use useMemo() and useCallback()
3. **Optimize re-renders** - Use React.memo() for pure components

### Security

1. **Never expose tokens in logs** - Don't console.log tokens
2. **Validate user context** - Check for required fields
3. **Handle token expiration** - Clear context on 401 errors

---

## Troubleshooting

### Widget doesn't appear

- Check browser console for errors
- Verify container element exists in DOM
- Ensure script loaded successfully
- Verify `userId` and `token` are provided

### CORS Errors

- Add microservice domain to backend `SUPPORT_ALLOWED_ORIGINS`
- Check backend CORS configuration
- Verify origin matches exactly (including protocol: `https://`)

### Headers not sent

- Verify user context is loaded (check Redux DevTools)
- Check `auth.slice` state has `userId`, `token`, `tenantId`
- Verify interceptors are working (check Network tab)

### Support Mode not working

- Verify `microservice` parameter is exactly `"ASSESSMENT"` or `"DEVLAB"`
- Check backend `SUPPORT_MODE_ENABLED=true`
- Verify backend endpoint exists: `/api/assessment/support` or `/api/devlab/support`

### User context not loading

- Check priority order: window → props → localStorage → endpoint
- Verify `window.RAG_USER` structure (if using window injection)
- Check localStorage keys: `user_id`, `token`, `tenant_id`
- Verify `/auth/me` endpoint returns correct format (if using endpoint)

---

## Additional Resources

### Code References

- **Frontend Widget:** `FRONTEND/src/components/chat/FloatingChatWidget/FloatingChatWidget.jsx`
- **Embed Script:** `FRONTEND/public/bot.js`
- **Embed Entry:** `FRONTEND/src/embed.jsx`
- **User Context Loader:** `FRONTEND/src/utils/userContextLoader.js`
- **API Service:** `FRONTEND/src/services/api.js`
- **Proxy Service:** `FRONTEND/src/services/microserviceProxy.js`
- **RTK Query API:** `FRONTEND/src/store/api/ragApi.js`

### Related Documentation

- `ARCHITECTURE.md` - System architecture overview
- `RAG_WIDGET_INTEGRATION_GUIDE.md` - Detailed integration guide
- `WHAT_CAN_YOU_ASK.md` - User-facing query guide

---

**End of Documentation**










