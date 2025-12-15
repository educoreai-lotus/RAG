# Chatbot Integration Guide - For Microservice Developers

**Version:** 2.0  
**Last Updated:** 2025-01-27

## 📖 What is this?

A quick guide for integrating the RAG Chatbot into your microservice.  
**Integration time:** ~5 minutes  
**Difficulty level:** Easy

The chatbot will appear as a button in the bottom-right corner of the page, allowing users to ask questions and receive answers.

**Important:** You don't need to configure any environment variables! Just run the script.

---

## 🚀 Quick Start (3 Steps)

### Step 1: Add Container

Add to your HTML (before `</body>`):

```html
<div id="edu-bot-container"></div>
```

### Step 2: Load the Script

Add in `<head>` or before `</body>`:

```html
<script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>
```

**⚠️ Important:** This is the BACKEND URL (Railway) - this is the correct URL!

### Step 3: Initialize After Login

```html
<script>
  function initChatbot() {
    const user = getCurrentUser(); // Your authentication function
    
    if (user && user.id && user.token) {
      if (window.initializeEducoreBot) {
        window.initializeEducoreBot({
          microservice: "YOUR_MICROSERVICE_NAME", // See list below
          userId: user.id,
          token: user.token,
          tenantId: user.tenantId || "default"
        });
      } else {
        setTimeout(initChatbot, 100); // Retry if script hasn't loaded yet
      }
    }
  }
  
  // Initialize when page is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
  } else {
    initChatbot();
  }
</script>
```

**That's it!** The widget will appear on your page.

---

## 📋 Microservice Names

### SUPPORT MODE (2 microservices):
- **ASSESSMENT** - Assessment
- **DEVLAB** - DevLab

### CHAT MODE (7 microservices):
- **DIRECTORY** - Directory
- **COURSE_BUILDER** - Course Builder
- **CONTENT_STUDIO** - Content Studio
- **SKILLS_ENGINE** - Skills Engine
- **LEARNER_AI** - Learner AI
- **LEARNING_ANALYTICS** - Learning Analytics
- **HR_MANAGEMENT_REPORTING** - HR & Management Reporting

---

## 💻 Code Examples

### Plain HTML

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Microservice</title>
  <script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>
</head>
<body>
  <h1>My Microservice</h1>
  
  <div id="edu-bot-container"></div>
  
  <script>
    function initChatbot() {
      const user = getCurrentUser(); // Your function
      
      if (user && user.id && user.token) {
        if (window.initializeEducoreBot) {
          window.initializeEducoreBot({
            microservice: "DIRECTORY", // Replace with your microservice name
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

### React

```jsx
import { useEffect } from 'react';
import { useAuth } from './hooks/useAuth';

function MyMicroservice() {
  const { user, token } = useAuth();
  
  useEffect(() => {
    if (!user || !token) return;
    
    if (!window.EDUCORE_BOT_LOADED) {
      const script = document.createElement('script');
      script.src = 'https://rag-production-3a4c.up.railway.app/embed/bot.js';
      script.async = true;
      document.head.appendChild(script);
      
      script.onload = () => {
        if (window.initializeEducoreBot) {
          window.initializeEducoreBot({
            microservice: "DIRECTORY", // Replace with your microservice name
            userId: user.id,
            token: token,
            tenantId: user.tenantId || "default"
          });
        }
      };
    } else {
      if (window.initializeEducoreBot) {
        window.initializeEducoreBot({
          microservice: "DIRECTORY",
          userId: user.id,
          token: token,
          tenantId: user.tenantId || "default"
        });
      }
    }
  }, [user, token]);
  
  return (
    <div>
      <h1>My Microservice</h1>
      <div id="edu-bot-container"></div>
    </div>
  );
}
```

### Vue.js

```vue
<template>
  <div>
    <h1>My Microservice</h1>
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
          microservice: "DIRECTORY", // Replace with your microservice name
          userId: authStore.user.id,
          token: authStore.token,
          tenantId: authStore.user.tenantId || "default"
        });
      } else {
        const script = document.createElement('script');
        script.src = 'https://rag-production-3a4c.up.railway.app/embed/bot.js';
        script.async = true;
        script.onload = () => {
          if (window.initializeEducoreBot) {
            window.initializeEducoreBot({
              microservice: "DIRECTORY",
              userId: authStore.user.id,
              token: authStore.token,
              tenantId: authStore.user.tenantId || "default"
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

### Angular

```typescript
import { Component, OnInit } from '@angular/core';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-my-microservice',
  template: `
    <h1>My Microservice</h1>
    <div id="edu-bot-container"></div>
  `
})
export class MyMicroserviceComponent implements OnInit {
  constructor(private auth: AuthService) {}
  
  ngOnInit() {
    const user = this.auth.getCurrentUser();
    if (!user || !user.token) return;
    
    if (window['initializeEducoreBot']) {
      window['initializeEducoreBot']({
        microservice: "DIRECTORY", // Replace with your microservice name
        userId: user.id,
        token: user.token,
        tenantId: user.tenantId || "default"
      });
    } else {
      const script = document.createElement('script');
      script.src = 'https://rag-production-3a4c.up.railway.app/embed/bot.js';
      script.async = true;
      script.onload = () => {
        if (window['initializeEducoreBot']) {
          window['initializeEducoreBot']({
            microservice: "DIRECTORY",
            userId: user.id,
            token: user.token,
            tenantId: user.tenantId || "default"
          });
        }
      };
      document.head.appendChild(script);
    }
  }
}
```

---

## ⚙️ Parameters

### Required:
- `microservice` (string) - Microservice name (see list above)
- `userId` (string) - Authenticated user ID
- `token` (string) - JWT or session token

### Optional:
- `tenantId` (string) - Tenant identifier (default: `"default"`)
- `container` (string) - CSS selector for container (default: `"#edu-bot-container"`)

---

## 🔍 How It Works?

### SUPPORT MODE (Assessment/DevLab):
- Messages are forwarded directly to the microservice
- Responses are returned verbatim from the microservice
- Endpoints: `/api/assessment/support`, `/api/devlab/support`

### CHAT MODE (All Others):
- Messages are sent to RAG API
- Responses come from RAG (OpenAI + Knowledge Base)
- Endpoint: `/api/v1/query`

---

## ⚠️ Important Points

1. **No Environment Variables Needed:**
   - ✅ **You don't need to configure any environment variables in your microservice!**
   - ✅ Just run the script - that's it!
   - ⚙️ Environment variables are configured in RAG Backend (by RAG team), not in microservices

2. **Correct URL:**
   - ✅ `https://rag-production-3a4c.up.railway.app/embed/bot.js` (BACKEND - Railway)
   - ❌ Don't use Vercel URL!

3. **Initialization:**
   - Initialize only after user is logged in
   - Make sure you have `userId` and `token` before initialization

4. **Container:**
   - Container must exist before initialization
   - Default: `#edu-bot-container`

---

## ⚙️ Environment Variables

### Do I need to configure environment variables?

**No! You don't need to configure any environment variables in your microservice.**

**Just run the script - that's it!**

### What about SUPPORT MODE (Assessment/DevLab)?

**Environment variables are configured in RAG Backend (by RAG team), not in your microservice:**

- `SUPPORT_MODE_ENABLED=true` - Enables SUPPORT MODE
- `SUPPORT_ALLOWED_ORIGINS=...` - Allows your microservice origin

**Who configures this:**
- RAG team configures this in RAG Backend (Railway)
- Not microservice developers!

**If you get CORS errors:**
- Contact RAG team
- They will add your origin to `SUPPORT_ALLOWED_ORIGINS`

---

## 🐛 Troubleshooting

### Widget doesn't appear:
- Check that container exists: `<div id="edu-bot-container"></div>`
- Check that script is loaded (Network tab in browser)
- Check Console for errors
- Make sure you're using Railway URL

### CORS error:
- Only relevant for Assessment/DevLab (SUPPORT MODE)
- Contact RAG team to add your origin to `SUPPORT_ALLOWED_ORIGINS` in RAG Backend
- **You don't need to configure anything in your microservice!**

### "Failed to load bot bundle":
- Make sure you're using Railway URL, not Vercel
- Check that BACKEND is running: `curl https://rag-production-3a4c.up.railway.app/health`

---

## 📞 Support

If you have issues:
1. Check Console in browser (F12)
2. Check Network tab (F12 → Network)
3. Contact RAG team

---

## 📚 Additional Documents

For more detailed guide, see:
- `EMBED_INTEGRATION_GUIDE.md` - Full detailed guide
- `INTEGRATION_EXAMPLES.md` - Additional examples

---

**Document Maintained By:** RAG Microservice Team
