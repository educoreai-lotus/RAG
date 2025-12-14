# מדריך הטמעת Chatbot - למפתחי המיקרוסרוויסים

**Version:** 2.0  
**Last Updated:** 2025-01-27

## 📖 מה זה?

מדריך קצר להטמעת ה-RAG Chatbot במיקרוסרוויס שלך.  
**זמן הטמעה:** ~5 דקות  
**רמת קושי:** קל

ה-chatbot יופיע ככפתור בפינה הימנית התחתונה של הדף, ויאפשר למשתמשים לשאול שאלות ולקבל תשובות.

---

## 🚀 Quick Start (3 שלבים)

### שלב 1: הוסף Container

הוסף ב-HTML שלך (לפני `</body>`):

```html
<div id="edu-bot-container"></div>
```

### שלב 2: טען את הסקריפט

הוסף ב-`<head>` או לפני `</body>`:

```html
<script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>
```

**⚠️ חשוב:** זה ה-BACKEND URL (Railway) - זה ה-URL הנכון!

### שלב 3: אתחל אחרי התחברות

```html
<script>
  function initChatbot() {
    const user = getCurrentUser(); // הפונקציה שלך לאימות
    
    if (user && user.id && user.token) {
      if (window.initializeEducoreBot) {
        window.initializeEducoreBot({
          microservice: "YOUR_MICROSERVICE_NAME", // ראה רשימה למטה
          userId: user.id,
          token: user.token,
          tenantId: user.tenantId || "default"
        });
      } else {
        setTimeout(initChatbot, 100); // נסה שוב אם הסקריפט עדיין לא נטען
      }
    }
  }
  
  // אתחל כשהדף מוכן
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
  } else {
    initChatbot();
  }
</script>
```

**זה הכל!** ה-widget יופיע בדף שלך.

---

## 📋 שמות המיקרוסרוויסים

### SUPPORT MODE (2 מיקרוסרוויסים):
- **ASSESSMENT** - Assessment
- **DEVLAB** - DevLab

### CHAT MODE (7 מיקרוסרוויסים):
- **DIRECTORY** - Directory
- **COURSE_BUILDER** - Course Builder
- **CONTENT_STUDIO** - Content Studio
- **SKILLS_ENGINE** - Skills Engine
- **LEARNER_AI** - Learner AI
- **LEARNING_ANALYTICS** - Learning Analytics
- **HR_MANAGEMENT_REPORTING** - HR & Management Reporting

---

## 💻 דוגמאות קוד

### HTML פשוט

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
          microservice: "DIRECTORY", // החלף בשם המיקרוסרוויס שלך
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
        microservice: "DIRECTORY", // החלף בשם המיקרוסרוויס שלך
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

## ⚙️ הפרמטרים

### חובה:
- `microservice` (string) - שם המיקרוסרוויס (ראה רשימה למעלה)
- `userId` (string) - ID המשתמש המחובר
- `token` (string) - JWT או session token

### אופציונלי:
- `tenantId` (string) - מזהה tenant (ברירת מחדל: `"default"`)
- `container` (string) - CSS selector ל-container (ברירת מחדל: `"#edu-bot-container"`)

---

## 🔍 איך זה עובד?

### SUPPORT MODE (Assessment/DevLab):
- הודעות מועברות ישירות למיקרוסרוויס
- תשובות מוחזרות כפי שהן מהמיקרוסרוויס
- Endpoints: `/api/assessment/support`, `/api/devlab/support`

### CHAT MODE (כל השאר):
- הודעות נשלחות ל-RAG API
- תשובות מגיעות מ-RAG (OpenAI + Knowledge Base)
- Endpoint: `/api/v1/query`

---

## ⚠️ נקודות חשובות

1. **URL נכון:**
   - ✅ `https://rag-production-3a4c.up.railway.app/embed/bot.js` (BACKEND - Railway)
   - ❌ לא משתמשים ב-Vercel URL!

2. **אתחול:**
   - אתחל רק אחרי שהמשתמש התחבר
   - ודא שיש `userId` ו-`token` לפני האתחול

3. **Container:**
   - ה-container חייב להיות קיים לפני האתחול
   - ברירת מחדל: `#edu-bot-container`

---

## 🐛 Troubleshooting

### Widget לא מופיע:
- בדוק שה-container קיים: `<div id="edu-bot-container"></div>`
- בדוק שה-script נטען (Network tab בדפדפן)
- בדוק את ה-Console לשגיאות
- ודא שאתה משתמש ב-Railway URL

### שגיאת CORS:
- רק רלוונטי ל-Assessment/DevLab (SUPPORT MODE)
- צור קשר עם צוות RAG להוספת ה-origin שלך

### "Failed to load bot bundle":
- ודא שאתה משתמש ב-Railway URL, לא Vercel
- בדוק שה-BACKEND רץ: `curl https://rag-production-3a4c.up.railway.app/health`

---

## 📞 תמיכה

אם יש בעיות:
1. בדוק את ה-Console בדפדפן (F12)
2. בדוק את ה-Network tab (F12 → Network)
3. צור קשר עם צוות RAG

---

## 📚 מסמכים נוספים

למדריך מפורט יותר, ראה:
- `EMBED_INTEGRATION_GUIDE.md` - מדריך מלא ומפורט
- `INTEGRATION_EXAMPLES.md` - דוגמאות נוספות

---

**Document Maintained By:** RAG Microservice Team

