# דוגמאות הטמעה - 9 מיקרוסרוויסים

דוגמאות קוד להטמעת ה-chatbot בכל אחד מ-9 המיקרוסרוויסים.

---

## SUPPORT MODE (2 מיקרוסרוויסים)

### Assessment

```javascript
window.initializeEducoreBot({
  microservice: "ASSESSMENT",
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId
});
```

### DevLab

```javascript
window.initializeEducoreBot({
  microservice: "DEVLAB",
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId
});
```

---

## CHAT MODE (7 מיקרוסרוויסים)

### Directory

```javascript
window.initializeEducoreBot({
  microservice: "DIRECTORY",
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId
});
```

### Course Builder

```javascript
window.initializeEducoreBot({
  microservice: "COURSE_BUILDER",
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId
});
```

### Content Studio

```javascript
window.initializeEducoreBot({
  microservice: "CONTENT_STUDIO",
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId
});
```

### Skills Engine

```javascript
window.initializeEducoreBot({
  microservice: "SKILLS_ENGINE",
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId
});
```

### Learner AI

```javascript
window.initializeEducoreBot({
  microservice: "LEARNER_AI",
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId
});
```

### Learning Analytics

```javascript
window.initializeEducoreBot({
  microservice: "LEARNING_ANALYTICS",
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId
});
```

### HR & Management Reporting

```javascript
window.initializeEducoreBot({
  microservice: "HR_MANAGEMENT_REPORTING",
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId
});
```

---

## HTML מלא - דוגמה

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Microservice</title>
  <!-- BACKEND רץ ב-Railway - זה ה-URL הנכון! -->
  <script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>
</head>
<body>
  <h1>My Microservice</h1>
  
  <div id="edu-bot-container"></div>
  
  <script>
    function initChatbot() {
      const user = getCurrentUser(); // הפונקציה שלך
      
      if (user && user.id && user.token) {
        if (window.initializeEducoreBot) {
          window.initializeEducoreBot({
            microservice: "DIRECTORY", // החלף בשם המיקרוסרוויס שלך
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

---

## React - דוגמה

```jsx
import { useEffect } from 'react';

function MyMicroservice() {
  const { user, token } = useAuth();
  
  useEffect(() => {
    if (!user || !token) return;
    
    if (!window.EDUCORE_BOT_LOADED) {
      const script = document.createElement('script');
      // BACKEND רץ ב-Railway - זה ה-URL הנכון!
      script.src = 'https://rag-production-3a4c.up.railway.app/embed/bot.js';
      script.async = true;
      document.head.appendChild(script);
      
      script.onload = () => {
        if (window.initializeEducoreBot) {
          window.initializeEducoreBot({
            microservice: "DIRECTORY", // החלף בשם המיקרוסרוויס שלך
            userId: user.id,
            token: token,
            tenantId: user.tenantId || "default"
          });
        }
      };
    } else {
      if (window.initializeEducoreBot) {
        window.initializeEducoreBot({
          microservice: "CONTENT",
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

---

## Vue.js - דוגמה

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
          microservice: "DIRECTORY", // החלף בשם המיקרוסרוויס שלך
          userId: authStore.user.id,
          token: authStore.token,
          tenantId: authStore.user.tenantId || "default"
        });
      } else {
        const script = document.createElement('script');
        // BACKEND רץ ב-Railway - זה ה-URL הנכון!
      script.src = 'https://rag-production-3a4c.up.railway.app/embed/bot.js';
        script.async = true;
        script.onload = () => {
          if (window.initializeEducoreBot) {
            window.initializeEducoreBot({
              microservice: "CONTENT",
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

---

## Angular - דוגמה

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
        microservice: "CONTENT", // החלף בשם המיקרוסרוויס שלך
        userId: user.id,
        token: user.token,
        tenantId: user.tenantId || "default"
      });
    } else {
      const script = document.createElement('script');
      // BACKEND רץ ב-Railway - זה ה-URL הנכון!
      script.src = 'https://rag-production-3a4c.up.railway.app/embed/bot.js';
      script.async = true;
      script.onload = () => {
        if (window['initializeEducoreBot']) {
          window['initializeEducoreBot']({
            microservice: "CONTENT",
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

## סיכום

- **Assessment/DevLab** → SUPPORT MODE (proxy למיקרוסרוויס)
- **כל השאר** → CHAT MODE (RAG API ישירות)

כל מיקרוסרוויס יכול להשתמש באותו script - רק משנים את שם ה-`microservice`!

