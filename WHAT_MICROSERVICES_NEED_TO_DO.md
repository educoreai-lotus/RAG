# What Microservices Need to Do - Detailed Explanation

**Version:** 1.0  
**Last Updated:** 2025-01-27

---

## 📋 Quick Summary

**Microservices do NOT need to:**
- ❌ Download files
- ❌ Install packages
- ❌ Add dependencies
- ❌ Build anything

**Microservices only need to:**
- ✅ Add 2 lines of code to their HTML
- ✅ Add an initialization function (3-5 lines of code)

---

## 🔍 What Exactly Needs to Be Done?

### 1. No New Files to Add

**Everything is loaded from the internet!**

The files (`bot.js`, `bot-bundle.js`) are automatically loaded from the RAG BACKEND:
- `https://rag-production-3a4c.up.railway.app/embed/bot.js`
- `https://rag-production-3a4c.up.railway.app/embed/bot-bundle.js` (loaded automatically)

**No need to download or install anything!**

---

## 📝 Which Files Need to Be Updated?

### Depends on the type of microservice:

#### 1. Plain HTML (Static HTML)

**Files to update:**
- `index.html` or any HTML file where you want the chatbot

**What to add:**

```html
<!-- Before </body> -->
<div id="edu-bot-container"></div>

<!-- In <head> or before </body> -->
<script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>

<!-- Before </body> -->
<script>
  function initChatbot() {
    const user = getCurrentUser(); // Your authentication function
    
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
```

**Total:** 3 lines of HTML + ~15 lines of JavaScript

---

#### 2. React

**Files to update:**
- `App.jsx` or `Layout.jsx` or any component where you want the chatbot
- Or a new component: `ChatbotWidget.jsx`

**Example - New Component:**

**New file:** `src/components/ChatbotWidget.jsx`

```jsx
import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export function ChatbotWidget() {
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
  
  return <div id="edu-bot-container"></div>;
}
```

**File to update:** `App.jsx` or `Layout.jsx`

```jsx
import { ChatbotWidget } from './components/ChatbotWidget';

function App() {
  return (
    <div>
      {/* Your content */}
      <ChatbotWidget />
    </div>
  );
}
```

**Total:** 
- One new file (optional) or update existing component
- Add `<div id="edu-bot-container"></div>` in JSX

---

#### 3. Vue.js

**Files to update:**
- `App.vue` or any component where you want the chatbot

**Example:**

**File to update:** `App.vue`

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

**Total:** Update `App.vue` or another component

---

#### 4. Angular

**Files to update:**
- `app.component.html` - Add the container
- `app.component.ts` - Add initialization logic

**Example:**

**File to update:** `app.component.html`

```html
<!-- Your content -->
<div id="edu-bot-container"></div>
```

**File to update:** `app.component.ts`

```typescript
import { Component, OnInit } from '@angular/core';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
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

**Total:** Update 2 files

---

## 📊 Summary - What Needs to Be Done

### No new files to download or install!

### Only update existing files:

| Microservice Type | Files to Update | What to Add |
|------------------|----------------|-------------|
| **HTML** | `index.html` | 3 lines HTML + ~15 lines JS |
| **React** | `App.jsx` or new component | useEffect hook + div |
| **Vue.js** | `App.vue` | onMounted hook + div |
| **Angular** | `app.component.html` + `app.component.ts` | div + ngOnInit |

---

## 🎯 Important Points

### 1. Everything is loaded from the internet
- No need to download files
- No need to install packages
- Everything is automatically loaded from RAG BACKEND

### 2. Only 2 things to add:
- `<div id="edu-bot-container"></div>` - Container
- `<script src="..."></script>` + initialization - The script

### 3. Microservice name:
- Assessment → `"ASSESSMENT"`
- DevLab → `"DEVLAB"`
- Directory → `"DIRECTORY"`
- Course Builder → `"COURSE_BUILDER"`
- Content Studio → `"CONTENT_STUDIO"`
- Skills Engine → `"SKILLS_ENGINE"`
- Learner AI → `"LEARNER_AI"`
- Learning Analytics → `"LEARNING_ANALYTICS"`
- HR & Management Reporting → `"HR_MANAGEMENT_REPORTING"`

### 4. Initialize only after login:
- Make sure the user is logged in before initialization
- Need `userId` and `token`

---

## 📝 Minimal Example

**The minimum required:**

```html
<!-- 1. Container -->
<div id="edu-bot-container"></div>

<!-- 2. Script -->
<script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>

<!-- 3. Initialization -->
<script>
  // After user is logged in
  if (user && user.token) {
    window.initializeEducoreBot({
      microservice: "DIRECTORY",
      userId: user.id,
      token: user.token
    });
  }
</script>
```

**That's it!** 🎉

---

## ❓ Frequently Asked Questions

### Q: Do I need to download files?
**A:** No! Everything is loaded from the internet.

### Q: Do I need to install packages?
**A:** No! No dependencies.

### Q: How many files need to be updated?
**A:** Only 1-2 files (depending on the platform).

### Q: How long does it take?
**A:** ~5 minutes.

### Q: Do I need to build anything?
**A:** No! Just add code.

---

**Document Maintained By:** RAG Microservice Team
