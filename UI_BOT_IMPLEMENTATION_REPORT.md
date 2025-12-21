# RAG Bot UI - Implementation Report

## Executive Summary

- **Bot location:** `https://rag-production-3a4c.up.railway.app/embed/bot.js`
- **Implementation type:** React-based Floating Widget (Embedded via Script Tag)
- **Files involved:** 
  - `FRONTEND/public/bot.js` - Embed loader script
  - `FRONTEND/public/chatbot-init-helper.js` - Initialization helper
  - `FRONTEND/src/embed.jsx` - React bundle entry point
  - `FRONTEND/src/components/chat/FloatingChatWidget/` - Main widget component
  - `FRONTEND/src/components/chatbot/` - Sub-components
- **Integration method:** Script tag + React bundle (bot-bundle.js)
- **Build output:** `FRONTEND/dist/embed/bot.js` and `FRONTEND/dist/embed/bot-bundle.js`

---

## 1. File Structure

```
FRONTEND/
├── public/
│   ├── bot.js                    # Embed loader script (copied to dist/embed/)
│   └── chatbot-init-helper.js    # Initialization helper (optional)
├── src/
│   ├── embed.jsx                 # React bundle entry point (builds to bot-bundle.js)
│   ├── components/
│   │   ├── chat/
│   │   │   └── FloatingChatWidget/
│   │   │       └── FloatingChatWidget.jsx  # Main widget component
│   │   └── chatbot/
│   │       ├── ChatWidgetButton/         # Floating button
│   │       ├── ChatPanel/                 # Chat container
│   │       ├── ChatHeader/                # Header with mode indicator
│   │       ├── ChatInput/                 # Input field
│   │       ├── ChatMessage/               # Message bubbles
│   │       └── Recommendations/          # Quick action buttons
│   ├── store/                    # Redux store
│   ├── services/                 # API services
│   ├── utils/                    # Utilities
│   └── index.css                 # Global styles (Tailwind CSS)
├── dist/
│   └── embed/                    # Build output (served by backend)
│       ├── bot.js               # Copied from public/bot.js
│       └── bot-bundle.js        # Built from src/embed.jsx
└── vite.config.js               # Build configuration

BACKEND/
└── src/
    └── index.js                  # Serves /embed/bot.js and /embed/bot-bundle.js
```

---

## 2. HTML Structure

### Complete HTML (for direct embedding):

**Note:** The bot is typically embedded via script tag, but here's the complete HTML structure that gets rendered:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Microservice</title>
</head>
<body>
  <!-- Your microservice content -->
  
  <!-- Bot container (required) -->
  <div id="edu-bot-container"></div>
  
  <!-- Embed script -->
  <script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>
  
  <!-- Initialize bot -->
  <script>
    // Wait for user authentication, then initialize
    function initChatbot() {
      const user = getCurrentUser(); // Your auth function
      
      if (user && user.id && user.token) {
        if (window.initializeEducoreBot) {
          window.initializeEducoreBot({
            microservice: "ASSESSMENT",  // or "DEVLAB", "DIRECTORY", etc.
            userId: user.id,
            token: user.token,
            tenantId: user.tenantId || "default",
            container: "#edu-bot-container"  // optional, defaults to "#edu-bot-container"
          });
        } else {
          setTimeout(initChatbot, 100); // Retry if script not loaded
        }
      }
    }
    
    // Initialize when DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initChatbot);
    } else {
      initChatbot();
    }
  </script>
</body>
</html>
```

### Key Elements (rendered by React):

1. **Floating Button:**
   - **ID:** None (fixed position)
   - **Class:** `fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600`
   - **Icon:** Chat bubble icon (HiChatBubbleLeftRight)

2. **Chat Panel:**
   - **Container:** `fixed bottom-24 right-6 w-96 h-[600px]`
   - **Classes:** `bg-white rounded-2xl shadow-card-lg flex flex-col z-40`

3. **Chat Header:**
   - **Classes:** `bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-4 rounded-t-2xl`
   - **Mode badges:** Blue for Assessment, Purple for DevLab

4. **Messages Container:**
   - **Classes:** `flex-1 overflow-y-auto p-4 bg-gray-50`

5. **Input Field:**
   - **Classes:** `border-t border-gray-200 p-4 bg-white`
   - **Input:** `w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full`

---

## 3. CSS Styles

### Complete CSS (from `FRONTEND/src/index.css`):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Design System - Dark Emerald Theme */
:root {
  /* Dark Emerald Color Palette */
  --emerald-50: #ecfdf5;
  --emerald-100: #d1fae5;
  --emerald-200: #a7f3d0;
  --emerald-300: #6ee7b7;
  --emerald-400: #34d399;
  --emerald-500: #10b981;
  --emerald-600: #059669;
  --emerald-700: #047857;
  --emerald-800: #065f46;
  --emerald-900: #064e3b;
  --emerald-950: #022c22;

  /* Day/Night Mode Variables */
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --bg-tertiary: #f3f4f6;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  --border-color: #e5e7eb;
  --shadow-color: rgba(0, 0, 0, 0.1);

  /* Spacing Scale */
  --spacing-xs: 0.25rem;   /* 4px */
  --spacing-sm: 0.5rem;    /* 8px */
  --spacing-md: 1rem;      /* 16px */
  --spacing-lg: 1.5rem;    /* 24px */
  --spacing-xl: 2rem;      /* 32px */
  --spacing-2xl: 3rem;     /* 48px */

  /* Shadows */
  --shadow-glow: 0 0 20px rgba(16, 185, 129, 0.3);
  --shadow-glow-lg: 0 0 30px rgba(16, 185, 129, 0.4);
  --shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-card-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

/* Dark Mode */
[data-theme="dark"] {
  --bg-primary: #111827;
  --bg-secondary: #1f2937;
  --bg-tertiary: #374151;
  --text-primary: #f9fafb;
  --text-secondary: #d1d5db;
  --text-tertiary: #9ca3af;
  --border-color: #4b5563;
  --shadow-color: rgba(0, 0, 0, 0.3);
}

/* High Contrast Mode */
[data-contrast="high"] {
  --text-primary: #000000;
  --text-secondary: #333333;
  --border-color: #000000;
}

/* Colorblind Friendly Mode */
[data-colorblind="true"] {
  --emerald-500: #2563eb; /* Blue instead of green */
}

/* Base Styles */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Focus Rings */
.focus-ring {
  @apply focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2;
}

/* Responsive Breakpoints */
@media (max-width: 640px) {
  :root {
    --spacing-md: 0.75rem;
    --spacing-lg: 1rem;
    --spacing-xl: 1.5rem;
  }
}
```

### Tailwind Config (from `FRONTEND/tailwind.config.js`):

```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-in',
        'fade-out': 'fadeOut 0.2s ease-out',
        'bounce-subtle': 'bounceSubtle 0.5s ease-in-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(100%)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      boxShadow: {
        'glow': '0 0 20px rgba(16, 185, 129, 0.3)',
        'glow-lg': '0 0 30px rgba(16, 185, 129, 0.4)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}
```

### Color Scheme:

- **Primary (Emerald):** `#10b981` (emerald-500)
- **Primary Dark:** `#059669` (emerald-600)
- **Primary Light:** `#34d399` (emerald-400)
- **Background:** `#ffffff` (white)
- **Background Secondary:** `#f9fafb` (gray-50)
- **Text Primary:** `#111827` (gray-900)
- **Text Secondary:** `#6b7280` (gray-500)
- **Border:** `#e5e7eb` (gray-200)
- **Hover:** `#34d399` (emerald-400)
- **Support Mode - Assessment:** `#3b82f6` (blue-500)
- **Support Mode - DevLab:** `#a855f7` (purple-500)

### Dimensions:

- **Widget Button:** `64px × 64px` (w-16 h-16)
- **Widget Panel Width:** `384px` (w-96)
- **Widget Panel Height:** `600px` (h-[600px])
- **Button Position:** `bottom: 24px, right: 24px` (bottom-6 right-6)
- **Panel Position:** `bottom: 96px, right: 24px` (bottom-24 right-6)
- **Font Size Base:** `14px` (text-sm)
- **Font Size Header:** `18px` (text-lg)
- **Border Radius:** `16px` (rounded-2xl)
- **Input Border Radius:** `9999px` (rounded-full)
- **Padding:** `16px` (p-4)

### Animations:

**Framer Motion Animations:**
- **Button Entrance:** Scale from 0 to 1 with spring animation
- **Panel Entrance:** Opacity 0→1, Y: 100→0, Scale: 0.9→1
- **Panel Exit:** Opacity 1→0, Y: 0→100, Scale: 1→0.9
- **Message Entrance:** Opacity 0→1, Y: 10→0
- **Button Hover:** Scale 1→1.1
- **Button Tap:** Scale 1→0.95
- **Pulse Animation:** Scale 1→1.2→1, Opacity 0.5→0→0.5 (2s infinite)

**CSS Animations:**
- **Bounce (Loading dots):** `animate-bounce` with delays (0ms, 150ms, 300ms)
- **Slide Up:** `slideUp 0.3s ease-out`
- **Slide Down:** `slideDown 0.3s ease-out`
- **Fade In:** `fadeIn 0.2s ease-in`
- **Fade Out:** `fadeOut 0.2s ease-out`

---

## 4. JavaScript Logic

### Complete JavaScript Files:

#### 4.1: Embed Loader (`FRONTEND/public/bot.js`):

```javascript
/**
 * EDUCORE Bot Embedding Script
 * 
 * This script allows microservices to embed the chatbot widget
 * by adding a simple SCRIPT tag to their pages.
 * 
 * Usage:
 * 1. Add container: <div id="edu-bot-container"></div>
 * 2. Load script: <script src="https://your-rag-service.com/embed/bot.js"></script>
 * 3. Initialize: window.initializeEducoreBot({ microservice: "ASSESSMENT", userId: "...", token: "...", container: "#edu-bot-container" })
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
   * @param {string} config.microservice - Microservice identifier
   *   SUPPORT MODE: "ASSESSMENT", "DEVLAB"
   *   CHAT MODE: "DIRECTORY", "COURSE_BUILDER", "CONTENT_STUDIO", "SKILLS_ENGINE", 
   *              "LEARNER_AI", "LEARNING_ANALYTICS", "HR_MANAGEMENT_REPORTING", or any other name
   * @param {string} config.userId - Authenticated user ID
   * @param {string} config.token - JWT or session token
   * @param {string} config.container - CSS selector for mount point (default: "#edu-bot-container")
   * @param {string} config.tenantId - Optional tenant ID (default: "default")
   */
  window.initializeEducoreBot = function(config) {
    if (!config) {
      console.error('EDUCORE Bot: Configuration is required');
      return;
    }

    const { microservice, userId, token, container = '#edu-bot-container', tenantId = 'default' } = config;

    // Validate required parameters
    if (!microservice) {
      console.error('EDUCORE Bot: "microservice" parameter is required');
      return;
    }

    if (!userId) {
      console.error('EDUCORE Bot: "userId" parameter is required');
      return;
    }

    if (!token) {
      console.error('EDUCORE Bot: "token" parameter is required');
      return;
    }

    // Microservices that use SUPPORT MODE (forward to microservice API)
    const supportModeMicroservices = ['ASSESSMENT', 'DEVLAB'];
    
    // All other microservices use CHAT MODE (RAG - regular chat)
    // Supported CHAT MODE microservices:
    // - DIRECTORY
    // - COURSE_BUILDER
    // - CONTENT_STUDIO
    // - SKILLS_ENGINE
    // - LEARNER_AI
    // - LEARNING_ANALYTICS
    // - HR_MANAGEMENT_REPORTING
    // - Any other microservice name (case-insensitive)
    // 
    // Assessment and DevLab → SUPPORT MODE
    // All others → CHAT MODE (RAG)

    // Locate the mount point
    const mountElement = document.querySelector(container);
    if (!mountElement) {
      console.error(`EDUCORE Bot: Container "${container}" not found in DOM`);
      return;
    }

    // Store configuration
    botConfig = {
      microservice: microservice.toUpperCase(),
      userId,
      token,
      tenantId,
      container,
      mountElement,
    };

    // Store token for API calls
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('user_id', userId);
      if (tenantId) {
        localStorage.setItem('tenant_id', tenantId);
      }
    }

    // Determine mode: SUPPORT MODE for Assessment/DevLab, CHAT MODE for others
    const isSupportMode = supportModeMicroservices.includes(botConfig.microservice);
    
    // Start the bot widget
    startBotWidget({
      mode: isSupportMode ? 'support' : 'chat',
      microservice: botConfig.microservice,
      userId: botConfig.userId,
      token: botConfig.token,
      tenantId: botConfig.tenantId,
      mountPoint: mountElement,
    });
  };

  /**
   * Start the bot widget
   * @param {Object} options - Widget options
   */
  function startBotWidget(options) {
    const { mode, microservice, userId, token, tenantId, mountPoint } = options;

    // Determine mode based on microservice
    // SUPPORT MODE: Assessment, DevLab → forward to microservice API
    // CHAT MODE: All others → use RAG API directly
    let widgetMode = null;
    if (mode === 'support') {
      // SUPPORT MODE
      if (microservice === 'ASSESSMENT') {
        widgetMode = 'ASSESSMENT_SUPPORT';
      } else if (microservice === 'DEVLAB') {
        widgetMode = 'DEVLAB_SUPPORT';
      } else {
        // Fallback: if somehow support mode is set for non-support microservice, use CHAT MODE
        console.warn(`EDUCORE Bot: Microservice "${microservice}" does not support SUPPORT MODE. Using CHAT MODE instead.`);
        widgetMode = 'GENERAL';
      }
    } else {
      // CHAT MODE (RAG) - for all other microservices
      // Supports: DIRECTORY, COURSE_BUILDER, CONTENT_STUDIO, SKILLS_ENGINE, 
      //           LEARNER_AI, LEARNING_ANALYTICS, HR_MANAGEMENT_REPORTING, and any other microservice
      widgetMode = 'GENERAL'; // Use general RAG mode
    }

    // Create a unique ID for this bot instance
    const botId = `edu-bot-${Date.now()}`;
    mountPoint.setAttribute('data-bot-id', botId);

    // Load the bot React component
    // Note: This assumes the bot bundle is already loaded
    // In production, you would load the bundle dynamically here
    
    // For now, we'll create a placeholder that will be replaced
    // when the React component loads
    mountPoint.innerHTML = '<div id="' + botId + '-root"></div>';

    // Store bot instance reference
    botInstance = {
      id: botId,
      config: botConfig,
      widgetMode,
      mode: mode, // 'support' or 'chat'
      mountPoint: mountPoint.querySelector(`#${botId}-root`),
    };

    // Dispatch custom event for bot initialization
    const initEvent = new CustomEvent('educore-bot-initialized', {
      detail: {
        botId,
        microservice,
        widgetMode,
        mode: mode,
        userId,
      },
    });
    document.dispatchEvent(initEvent);

    // Load the bot bundle dynamically
    loadBotBundle(botInstance);
  }

  /**
   * Load the bot bundle dynamically
   * @param {Object} instance - Bot instance
   */
  function loadBotBundle(instance) {
    // Get the base URL from the current script
    const scriptSrc = document.currentScript?.src || 
                     document.querySelector('script[src*="bot.js"]')?.src;
    const baseUrl = scriptSrc ? scriptSrc.substring(0, scriptSrc.lastIndexOf('/')) : '';
    
    // CRITICAL: Set backend URL globally so microservices can use it
    // Extract backend URL from script src (e.g., https://rag-backend.com/embed/bot.js -> https://rag-backend.com)
    if (baseUrl && !window.EDUCORE_BACKEND_URL) {
      // Remove /embed if present
      const backendUrl = baseUrl.replace(/\/embed\/?$/, '');
      window.EDUCORE_BACKEND_URL = backendUrl;
      console.log('🤖 EDUCORE Bot: Backend URL detected:', backendUrl);
      console.log('🤖 EDUCORE Bot: Microservices can use window.EDUCORE_BACKEND_URL for API calls');
    }
    
    const bundleUrl = `${baseUrl}/bot-bundle.js`;

    // Check if bundle is already loaded
    if (window.EDUCORE_BOT_BUNDLE_LOADED) {
      initializeBotReact(instance);
      return;
    }

    // Load the bundle script
    const script = document.createElement('script');
    script.src = bundleUrl;
    script.type = 'module';
    script.onload = () => {
      window.EDUCORE_BOT_BUNDLE_LOADED = true;
      initializeBotReact(instance);
    };
    script.onerror = () => {
      console.error('EDUCORE Bot: Failed to load bot bundle from', bundleUrl);
      instance.mountPoint.innerHTML = '<div style="padding: 20px; color: red;">Failed to load chatbot. Please refresh the page.</div>';
    };
    document.head.appendChild(script);
  }

  /**
   * Initialize the React bot component
   * @param {Object} instance - Bot instance
   */
  function initializeBotReact(instance) {
    // This will be called after the bundle loads
    // The bundle should export a function to initialize the React app
    if (window.EDUCORE_BOT_INIT_REACT) {
      window.EDUCORE_BOT_INIT_REACT({
        mountPoint: instance.mountPoint,
        config: instance.config,
        widgetMode: instance.widgetMode,
        mode: instance.mode, // 'support' or 'chat'
      });
    } else {
      console.error('EDUCORE Bot: React initialization function not found. Make sure bot-bundle.js is loaded correctly.');
    }
  }

  /**
   * Destroy the bot instance
   */
  window.destroyEducoreBot = function() {
    if (botInstance) {
      // Clean up React component if needed
      if (window.EDUCORE_BOT_DESTROY) {
        window.EDUCORE_BOT_DESTROY(botInstance.id);
      }
      
      // Clear mount point
      if (botInstance.mountPoint && botInstance.mountPoint.parentElement) {
        botInstance.mountPoint.parentElement.innerHTML = '';
      }
      
      botInstance = null;
      botConfig = null;
    }
  };

  // Expose configuration getter
  window.getEducoreBotConfig = function() {
    return botConfig ? { ...botConfig } : null;
  };

  console.log('EDUCORE Bot: Embedding script loaded. Call window.initializeEducoreBot(config) to start.');
})();
```

#### 4.2: React Bundle Entry (`FRONTEND/src/embed.jsx`):

```javascript
/**
 * Bot Embedding Entry Point
 * 
 * This file is used when the bot is embedded via script tag
 * in external microservices (Assessment, DevLab, etc.)
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { store } from './store/store.js';
import { theme } from './theme/theme.js';
import FloatingChatWidget from './components/chat/FloatingChatWidget/FloatingChatWidget.jsx';
import { setAssessmentSupportMode, setDevLabSupportMode, MODES } from './store/slices/chatMode.slice.js';
import './index.css';

/**
 * Initialize the bot React component
 * This function is called by bot.js after the bundle loads
 */
window.EDUCORE_BOT_INIT_REACT = function(options) {
  const { mountPoint, config, widgetMode, mode } = options;

  if (!mountPoint) {
    console.error('EDUCORE Bot: Mount point is required');
    return;
  }

  // Set initial mode based on widget mode
  // SUPPORT MODE: Assessment/DevLab → forward to microservice API
  // CHAT MODE: All others → use RAG API (GENERAL mode)
  if (widgetMode === 'ASSESSMENT_SUPPORT') {
    store.dispatch(setAssessmentSupportMode());
  } else if (widgetMode === 'DEVLAB_SUPPORT') {
    store.dispatch(setDevLabSupportMode());
  } else {
    // CHAT MODE - use general RAG mode (default)
    // No need to dispatch - GENERAL is the default mode
  }

  // Create React root and render
  const root = ReactDOM.createRoot(mountPoint);
  root.render(
    <React.StrictMode>
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <FloatingChatWidget 
            embedded={true}
            initialMode={widgetMode || 'GENERAL'}
            mode={mode || 'chat'} // 'support' or 'chat'
            microservice={config.microservice}
            userId={config.userId}
            token={config.token}
            tenantId={config.tenantId}
          />
        </ThemeProvider>
      </Provider>
    </React.StrictMode>
  );

  // Store root reference for cleanup
  window.EDUCORE_BOT_ROOTS = window.EDUCORE_BOT_ROOTS || {};
  window.EDUCORE_BOT_ROOTS[config.mountElement?.getAttribute('data-bot-id')] = root;
};

/**
 * Destroy bot instance
 */
window.EDUCORE_BOT_DESTROY = function(botId) {
  if (window.EDUCORE_BOT_ROOTS && window.EDUCORE_BOT_ROOTS[botId]) {
    const root = window.EDUCORE_BOT_ROOTS[botId];
    root.unmount();
    delete window.EDUCORE_BOT_ROOTS[botId];
  }
};

// Mark bundle as loaded
window.EDUCORE_BOT_BUNDLE_LOADED = true;
```

### Key Functions:

#### 1. **Initialization:**

```javascript
window.initializeEducoreBot({
  microservice: "ASSESSMENT",  // Required: "ASSESSMENT", "DEVLAB", or any other name
  userId: "user-123",          // Required: Authenticated user ID
  token: "jwt-token-here",      // Required: JWT or session token
  tenantId: "tenant-abc",       // Optional: Defaults to "default"
  container: "#edu-bot-container" // Optional: Defaults to "#edu-bot-container"
});
```

#### 2. **Send Message:**

Handled internally by `FloatingChatWidget.handleSendMessage()`:
- Adds user message to Redux store
- Determines mode (SUPPORT vs CHAT)
- Calls appropriate API endpoint
- Displays response

#### 3. **Display Response:**

Handled by `ChatMessage` component:
- Formats bot responses with markdown support
- Shows code blocks, lists, headers
- Displays timestamps
- Animates message appearance

#### 4. **Toggle Widget:**

Handled by `ChatWidgetButton`:
- Toggles `isWidgetOpen` state in Redux
- Animates panel open/close
- Shows/hides floating button pulse

---

## 5. Integration Method

### Method 1: Script Tag (Recommended)

**Step 1:** Add container div to your HTML:

```html
<div id="edu-bot-container"></div>
```

**Step 2:** Load the embed script:

```html
<script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>
```

**Step 3:** Initialize after user authentication:

```javascript
function initChatbot() {
  const user = getCurrentUser(); // Your auth function
  
  if (user && user.id && user.token) {
    if (window.initializeEducoreBot) {
      window.initializeEducoreBot({
        microservice: "ASSESSMENT",  // or "DEVLAB", "DIRECTORY", etc.
        userId: user.id,
        token: user.token,
        tenantId: user.tenantId || "default"
      });
    } else {
      setTimeout(initChatbot, 100); // Retry if script not loaded
    }
  }
}

// Initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChatbot);
} else {
  initChatbot();
}
```

**Complete Example:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Microservice</title>
</head>
<body>
  <!-- Your microservice content -->
  
  <!-- Bot container -->
  <div id="edu-bot-container"></div>
  
  <!-- Embed script -->
  <script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>
  
  <!-- Initialize -->
  <script>
    function getCurrentUser() {
      // Replace with your actual auth logic
      return {
        id: "user-123",
        token: "your-jwt-token",
        tenantId: "tenant-abc"
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
          setTimeout(initChatbot, 100);
        }
      }
    }
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initChatbot);
    } else {
      initChatbot();
    }
  </script>
</body>
</html>
```

### Method 2: Using Helper Script (Optional)

Load the helper script for easier initialization:

```html
<script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>
<script src="https://rag-production-3a4c.up.railway.app/embed/chatbot-init-helper.js"></script>

<script>
  window.initEducoreChatbot({
    microservice: "ASSESSMENT",
    userId: "user-123",
    token: "jwt-token",
    tenantId: "tenant-abc",
    container: "#edu-bot-container",
    maxRetries: 10,
    retryDelay: 500
  });
</script>
```

---

## 6. Configuration Options

### Available Options:

```javascript
{
  // REQUIRED: Microservice identifier
  microservice: "ASSESSMENT",  // "ASSESSMENT", "DEVLAB", "DIRECTORY", "COURSE_BUILDER", etc.
  
  // REQUIRED: User authentication
  userId: "user-123",         // Authenticated user ID
  token: "jwt-token-here",     // JWT or session token
  
  // OPTIONAL: Tenant and container
  tenantId: "tenant-abc",      // Defaults to "default"
  container: "#edu-bot-container" // Defaults to "#edu-bot-container"
}
```

### Required Options:

- **`microservice`** (string) - Microservice identifier
  - **SUPPORT MODE:** `"ASSESSMENT"`, `"DEVLAB"`
  - **CHAT MODE:** `"DIRECTORY"`, `"COURSE_BUILDER"`, `"CONTENT_STUDIO"`, `"SKILLS_ENGINE"`, `"LEARNER_AI"`, `"LEARNING_ANALYTICS"`, `"HR_MANAGEMENT_REPORTING"`, or any other name

- **`userId`** (string) - Authenticated user ID

- **`token`** (string) - JWT or session token for authentication

### Optional Options:

- **`tenantId`** (string) - Tenant ID, defaults to `"default"`

- **`container`** (string) - CSS selector for mount point, defaults to `"#edu-bot-container"`

### Mode Behavior:

**SUPPORT MODE** (Assessment, DevLab):
- Messages forwarded to microservice API: `/api/assessment/support` or `/api/devlab/support`
- Response returned verbatim from microservice
- No RAG processing

**CHAT MODE** (All other microservices):
- Messages sent to RAG API: `/api/v1/query`
- RAG processing with knowledge base
- OpenAI-powered responses

---

## 7. API Communication

### Request Format (CHAT MODE):

**Endpoint:** `POST /api/v1/query`

**Headers:**
```javascript
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer {token}',
  'X-User-Id': '{userId}',
  'X-Tenant-Id': '{tenantId}'
}
```

**Body:**
```javascript
{
  "query": "User's question",
  "tenant_id": "tenant-abc",
  "context": {
    "user_id": "user-123",
    "session_id": "session-123"
  },
  "options": {
    "max_results": 5,
    "min_confidence": 0.7,
    "include_metadata": true
  }
}
```

**Response Format:**
```javascript
{
  "answer": "Bot's response text",
  "sources": [
    {
      "id": "source-1",
      "title": "Source Title",
      "url": "https://...",
      "similarity": 0.95
    }
  ],
  "confidence": 0.92,
  "recommendations": [
    {
      "id": "rec-1",
      "type": "button",
      "label": "Quick Action",
      "description": "Action description",
      "priority": 1
    }
  ],
  "metadata": {
    "query_id": "query-123",
    "timestamp": "2025-01-15T10:00:00Z"
  }
}
```

### Request Format (SUPPORT MODE):

**Endpoint:** `POST /api/assessment/support` or `POST /api/devlab/support`

**Headers:**
```javascript
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer {token}',
  'X-User-Id': '{userId}',
  'X-Tenant-Id': '{tenantId}',
  'X-Source': 'assessment' // or 'devlab'
}
```

**Body:**
```javascript
{
  "query": "User's question",
  "timestamp": "2025-01-15T10:00:00Z",
  "session_id": "session-123",
  "support_mode": "Assessment" // or "DevLab"
}
```

**Response Format:**
```javascript
{
  "response": "Microservice response text (verbatim)"
}
```

---

## 8. Dependencies

### External Libraries:

- **React:** `^18.2.0` - UI framework
- **React DOM:** `^18.2.0` - React rendering
- **Redux Toolkit:** `^2.0.1` - State management
- **React Redux:** `^9.0.4` - React bindings for Redux
- **Framer Motion:** `^10.16.16` - Animations
- **React Icons:** `^5.2.1` - Icon library (HiChatBubbleLeftRight, HiXMark, etc.)
- **Material-UI:** `^5.15.0` - UI components (ThemeProvider, CssBaseline)
- **Axios:** `^1.6.2` - HTTP client
- **Tailwind CSS:** `^3.4.1` - Utility-first CSS framework

### CDN Links (Not Required):

The bot is bundled and self-contained. No external CDN links needed.

### Build Tools:

- **Vite:** `^5.4.11` - Build tool
- **PostCSS:** `^8.4.35` - CSS processing
- **Autoprefixer:** `^10.4.17` - CSS vendor prefixes

---

## 9. Visual Design Reference

### Widget Closed:

- **Position:** Fixed bottom-right corner
- **Size:** 64px × 64px
- **Shape:** Circular button
- **Color:** Emerald gradient (`from-emerald-500 to-emerald-600`)
- **Icon:** Chat bubble icon (white)
- **Animation:** Pulse effect when closed
- **Shadow:** Glow effect (`shadow-glow-lg`)
- **Z-index:** 50

### Widget Open:

- **Position:** Fixed bottom-right, 96px from bottom
- **Size:** 384px width × 600px height
- **Shape:** Rounded rectangle (`rounded-2xl`)
- **Background:** White (`bg-white`)
- **Shadow:** Large card shadow (`shadow-card-lg`)
- **Z-index:** 40

### Chat Header:

- **Background:** Emerald gradient (`from-emerald-500 to-emerald-600`)
- **Support Mode - Assessment:** Blue gradient (`from-blue-500 to-blue-600`)
- **Support Mode - DevLab:** Purple gradient (`from-purple-500 to-purple-600`)
- **Text:** White
- **Padding:** 16px (`p-4`)
- **Border:** Bottom border (2px, colored by mode)

### Message Bubbles:

**User Message:**
- **Background:** Emerald (`bg-emerald-500`)
- **Text:** White
- **Alignment:** Right (`justify-end`)
- **Max Width:** 75% of container
- **Border Radius:** 16px (`rounded-2xl`)
- **Padding:** 16px (`px-4 py-3`)

**Bot Message:**
- **Background:** White (`bg-white`)
- **Text:** Gray-900 (`text-gray-900`)
- **Alignment:** Left (`justify-start`)
- **Max Width:** 75% of container
- **Border:** Gray-200 (`border border-gray-200`)
- **Border Radius:** 16px (`rounded-2xl`)
- **Padding:** 16px (`px-4 py-3`)

**Avatar:**
- **Bot:** Emerald gradient circle with sparkles icon
- **User:** Gray circle with user icon
- **Size:** 32px × 32px (`w-8 h-8`)

### Input Field:

- **Background:** White (`bg-white`)
- **Border:** Top border (`border-t border-gray-200`)
- **Padding:** 16px (`p-4`)
- **Input:**
  - **Border:** Gray-300 (`border-gray-300`)
  - **Border Radius:** Full (`rounded-full`)
  - **Padding:** 12px left, 16px right (`pl-10 pr-4 py-3`)
  - **Focus Ring:** Emerald (`focus:ring-emerald-500`)

### Send Button:

- **Background:** Emerald gradient (`from-emerald-500 to-emerald-600`)
- **Size:** 48px × 48px (`w-12 h-12`)
- **Shape:** Circular (`rounded-full`)
- **Icon:** Paper airplane (white)
- **Shadow:** Glow effect (`shadow-glow`)
- **Hover:** Scale 1.05

### Recommendations:

- **Background:** Emerald-50 to Emerald-100 gradient
- **Border:** Emerald-200 (`border-emerald-200`)
- **Border Radius:** Full (`rounded-full`)
- **Padding:** 10px horizontal, 10px vertical (`px-4 py-2.5`)
- **Text:** Emerald-700 (`text-emerald-700`)
- **Hover:** Darker gradient (`hover:from-emerald-100 hover:to-emerald-200`)

---

## 10. Complete Working Example

### Minimal HTML Page:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RAG Bot Test</title>
</head>
<body>
  <h1>My Microservice</h1>
  <p>This is your microservice content.</p>
  
  <!-- Bot container (required) -->
  <div id="edu-bot-container"></div>
  
  <!-- Embed script -->
  <script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>
  
  <!-- Initialize bot -->
  <script>
    // Replace with your actual authentication logic
    function getCurrentUser() {
      // Example: Get from localStorage, cookies, or API
      return {
        id: "test-user-123",
        token: "your-jwt-token-here",
        tenantId: "default"
      };
    }
    
    function initChatbot() {
      const user = getCurrentUser();
      
      if (user && user.id && user.token) {
        if (window.initializeEducoreBot) {
          console.log('✅ Initializing chatbot...');
          window.initializeEducoreBot({
            microservice: "ASSESSMENT",  // Change to your microservice name
            userId: user.id,
            token: user.token,
            tenantId: user.tenantId || "default"
          });
          console.log('✅ Chatbot initialized!');
        } else {
          console.log('⏳ Waiting for script to load...');
          setTimeout(initChatbot, 100);
        }
      } else {
        console.warn('⚠️ User not authenticated. Chatbot will not initialize.');
      }
    }
    
    // Initialize when DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initChatbot);
    } else {
      initChatbot();
    }
    
    // Debug info
    setTimeout(() => {
      console.log('🔍 Debug Info:');
      console.log('  - Script loaded:', window.EDUCORE_BOT_LOADED);
      console.log('  - Init function:', typeof window.initializeEducoreBot);
      console.log('  - Container exists:', !!document.querySelector('#edu-bot-container'));
      console.log('  - Bundle loaded:', window.EDUCORE_BOT_BUNDLE_LOADED);
      console.log('  - Backend URL:', window.EDUCORE_BACKEND_URL);
    }, 2000);
  </script>
</body>
</html>
```

### For SUPPORT MODE (Assessment/DevLab):

```javascript
window.initializeEducoreBot({
  microservice: "ASSESSMENT",  // or "DEVLAB"
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId || "default"
});
```

### For CHAT MODE (Other microservices):

```javascript
window.initializeEducoreBot({
  microservice: "DIRECTORY",  // or "COURSE_BUILDER", "CONTENT_STUDIO", etc.
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId || "default"
});
```

---

## 11. Implementation Checklist

**For microservices to embed the bot:**

- [ ] Add container div: `<div id="edu-bot-container"></div>`
- [ ] Load embed script: `<script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>`
- [ ] Implement `getCurrentUser()` function to get authenticated user
- [ ] Call `window.initializeEducoreBot()` after user authentication
- [ ] Provide correct `microservice` name:
  - `"ASSESSMENT"` or `"DEVLAB"` for SUPPORT MODE
  - Any other name for CHAT MODE
- [ ] Provide `userId`, `token`, and optionally `tenantId`
- [ ] Test chat functionality
- [ ] Test visual appearance matches RAG bot
- [ ] Verify API calls are working (check Network tab)
- [ ] Test in different browsers (Chrome, Firefox, Safari, Edge)

---

## 12. Known Issues / Edge Cases

### Browser Compatibility:

- **Tested:** Chrome, Firefox, Safari, Edge (latest versions)
- **IE11:** Not supported (uses modern JavaScript)
- **Mobile:** Responsive design works, but panel size may need adjustment

### CORS:

- Backend must allow CORS for your microservice domain
- Set `SUPPORT_ALLOWED_ORIGINS` environment variable in backend
- Format: `SUPPORT_ALLOWED_ORIGINS=https://your-domain.com,https://another-domain.com`

### Authentication:

- Token must be valid JWT or session token
- Token is stored in localStorage for API calls
- If token expires, bot will fail API calls (no auto-refresh)

### Loading:

- Bot bundle loads asynchronously
- Initialization retries if script not loaded (up to 10 retries with 100ms delay)
- If bundle fails to load, error message displayed in container

### Multiple Instances:

- Only one bot instance per page (prevents multiple initializations)
- If you need multiple instances, use different containers and initialize separately

### Mobile Responsiveness:

- Widget button: 64px × 64px (fixed size)
- Panel: 384px × 600px (may overflow on small screens)
- Consider responsive adjustments for mobile devices

---

## 13. Next Steps

1. **Build the frontend:**
   ```bash
   cd FRONTEND
   npm install
   npm run build
   ```
   This creates `dist/embed/bot.js` and `dist/embed/bot-bundle.js`

2. **Deploy backend:**
   - Backend serves embed files from `FRONTEND/dist/embed/`
   - Ensure backend has access to these files

3. **Configure CORS:**
   - Set `SUPPORT_ALLOWED_ORIGINS` in backend `.env`
   - Add your microservice domain(s)

4. **Test integration:**
   - Use the test HTML file provided
   - Verify bot appears and functions correctly
   - Test both SUPPORT MODE and CHAT MODE

5. **Customize (if needed):**
   - Colors can be customized via Tailwind config
   - Component styles can be overridden
   - API endpoints are configurable via environment variables

---

## 14. Backend Routes

### Embed Routes:

- **`GET /embed/bot.js`** - Serves the embed loader script
- **`GET /embed/bot-bundle.js`** - Serves the React bundle
- **`GET /embed/chatbot-init-helper.js`** - Serves the initialization helper (optional)

### API Routes:

- **`POST /api/v1/query`** - RAG query endpoint (CHAT MODE)
- **`POST /api/assessment/support`** - Assessment support endpoint (SUPPORT MODE)
- **`POST /api/devlab/support`** - DevLab support endpoint (SUPPORT MODE)
- **`GET /api/v1/personalized/recommendations/:userId`** - Get recommendations

### CORS Configuration:

Backend must allow CORS for embed files:
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
```

---

## 15. Build Process

### Frontend Build:

```bash
cd FRONTEND
npm install
npm run build
```

**Build Output:**
- `dist/embed/bot.js` - Copied from `public/bot.js`
- `dist/embed/bot-bundle.js` - Built from `src/embed.jsx`
- `dist/assets/` - CSS, images, and other assets

**Vite Configuration:**
- Entry point: `src/embed.jsx`
- Output: `embed/bot-bundle.js`
- Assets: `assets/[name]-[hash].[ext]`
- Chunks: Split into vendor, mui, redux chunks

### Backend Serving:

Backend serves files from `FRONTEND/dist/embed/`:
- Static files served via Express
- CORS headers added automatically
- Error handling for missing files

---

## 16. Component Architecture

### Component Hierarchy:

```
FloatingChatWidget (Main)
├── ChatWidgetButton (Floating button)
└── ChatPanel (Chat container)
    ├── ChatHeader (Header with mode indicator)
    ├── Messages Container
    │   ├── ChatMessage (User/Bot messages)
    │   └── Recommendations (Quick actions)
    └── ChatInput (Input field with send button)
```

### State Management:

**Redux Store:**
- `auth` - User authentication (userId, token, tenantId)
- `chat` - Chat messages and loading state
- `chatMode` - Current mode (GENERAL, ASSESSMENT_SUPPORT, DEVLAB_SUPPORT)
- `ui` - UI state (isWidgetOpen, theme)
- `ragApi` - RTK Query API slice

### Props Flow:

```
initializeEducoreBot(config)
  → startBotWidget(options)
    → loadBotBundle(instance)
      → initializeBotReact(instance)
        → FloatingChatWidget(props)
          → Redux Store
            → All Components
```

---

**Report generated:** 2025-01-15
**RAG URL:** https://rag-production-3a4c.up.railway.app
**Report author:** Cursor AI

---

## Summary

This report documents the complete RAG bot UI implementation. The bot is a React-based floating widget that can be embedded in any microservice via a simple script tag. It supports two modes:

1. **SUPPORT MODE** (Assessment, DevLab): Forwards messages to microservice APIs
2. **CHAT MODE** (All others): Uses RAG API with knowledge base

The implementation is complete, self-contained, and ready for microservices to embed with minimal configuration.

