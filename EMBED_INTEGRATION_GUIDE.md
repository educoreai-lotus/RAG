# מדריך הטמעת Chatbot - 9 מיקרוסרוויסים

**Version:** 2.0  
**Last Updated:** 2025-01-27  
**Purpose:** מדריך להטמעת ה-RAG chatbot ב-9 מיקרוסרוויסים

---

## ארכיטקטורה - BACKEND ו-FRONTEND

**חשוב להבין את המבנה:**

- **BACKEND** רץ ב-**Railway** (`rag-production-3a4c.up.railway.app`)
  - משרת את ה-API endpoints
  - משרת את קבצי ה-embed (`/embed/bot.js`, `/embed/bot-bundle.js`)
  - הקבצים מוגשים מ-`FRONTEND/dist/embed/` עם CORS headers

- **FRONTEND** רץ ב-**Vercel** (`rag-git-main-educoreai-lotus.vercel.app`)
  - זה ה-frontend של RAG עצמו (לא רלוונטי להטמעה)
  - **לא משתמשים בו להטמעה!**

**להטמעה במיקרוסרוויסים:**
- ✅ **תמיד** משתמשים ב-**BACKEND URL** (Railway)
- ❌ **לא** משתמשים ב-FRONTEND URL (Vercel)

---

## סקירה כללית

ה-chatbot תומך ב-2 מצבי פעולה:

1. **SUPPORT MODE** - Assessment ו-DevLab
   - הודעות מועברות ישירות למיקרוסרוויס
   - תשובות מוחזרות כפי שהן (verbatim)
   - Endpoints: `/api/assessment/support`, `/api/devlab/support`

2. **CHAT MODE** - כל שאר המיקרוסרוויסים
   - הודעות נשלחות ל-RAG API ישירות
   - תשובות מגיעות מ-RAG (OpenAI + Knowledge Base)
   - Endpoint: `/api/v1/query`

---

## מיקרוסרוויסים נתמכים

### SUPPORT MODE (2 מיקרוסרוויסים):
- **ASSESSMENT** - Assessment Microservice
- **DEVLAB** - DevLab Microservice

### CHAT MODE (7 מיקרוסרוויסים):
- **DIRECTORY** - Directory Microservice
- **COURSE_BUILDER** - Course Builder Microservice
- **CONTENT_STUDIO** - Content Studio Microservice
- **SKILLS_ENGINE** - Skills Engine Microservice
- **LEARNER_AI** - Learner AI Microservice
- **LEARNING_ANALYTICS** - Learning Analytics Microservice
- **HR_MANAGEMENT_REPORTING** - HR & Management Reporting Microservice

*ניתן להוסיף כל שם מיקרוסרוויס - כל מה שלא Assessment/DevLab יעבוד ב-CHAT MODE*

---

## Quick Start (3 שלבים)

### שלב 1: הוסף Container Div

הוסף בכל מקום ב-HTML שלך (בדרך כלל לפני `</body>`):

```html
<div id="edu-bot-container"></div>
```

### שלב 2: טען את הסקריפט

הוסף ב-`<head>` או לפני `</body>`:

```html
<!-- BACKEND רץ ב-Railway - זה ה-URL הנכון! -->
<script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>
```

**⚠️ חשוב מאוד:**

- **BACKEND רץ ב-Railway** - זה ה-URL שצריך להשתמש בו
- **FRONTEND רץ ב-Vercel** - אבל הקבצים embed מוגשים מה-BACKEND, לא מה-FRONTEND!
- הקבצים `bot.js` ו-`bot-bundle.js` מוגשים מה-**BACKEND** (Railway), לא מה-FRONTEND (Vercel)
- ה-BACKEND משרת את הקבצים מ-`FRONTEND/dist/embed/` עם CORS headers

**✅ נכון:** `https://rag-production-3a4c.up.railway.app/embed/bot.js` (BACKEND - Railway)  
**❌ שגוי:** `https://rag-git-main-educoreai-lotus.vercel.app/embed/bot.js` (FRONTEND - Vercel)

### שלב 3: אתחל אחרי התחברות משתמש

```html
<script>
  function initChatbot() {
    const user = getCurrentUser(); // הפונקציה שלך לאימות
    
    if (user && user.id && user.token) {
      if (window.initializeEducoreBot) {
        window.initializeEducoreBot({
          microservice: "ASSESSMENT",  // או "DEVLAB", "DIRECTORY", "COURSE_BUILDER", וכו'
          userId: user.id,
          token: user.token,
          tenantId: user.tenantId || "default"
        });
      } else {
        // הסקריפט עדיין לא נטען, נסה שוב
        setTimeout(initChatbot, 100);
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

## דוגמאות לכל מיקרוסרוויס

### 1. Assessment (SUPPORT MODE)

```javascript
window.initializeEducoreBot({
  microservice: "ASSESSMENT",
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId
});
```

**התנהגות:**
- הודעות מועברות ל-`/api/assessment/support`
- תשובות מוחזרות כפי שהן מהמיקרוסרוויס
- אין עיבוד RAG

### 2. DevLab (SUPPORT MODE)

```javascript
window.initializeEducoreBot({
  microservice: "DEVLAB",
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId
});
```

**התנהגות:**
- הודעות מועברות ל-`/api/devlab/support`
- תשובות מוחזרות כפי שהן מהמיקרוסרוויס
- אין עיבוד RAG

### 3. Directory (CHAT MODE - RAG)

```javascript
window.initializeEducoreBot({
  microservice: "DIRECTORY",
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId
});
```

**התנהגות:**
- הודעות נשלחות ל-`/api/v1/query` (RAG API)
- תשובות מגיעות מ-RAG (OpenAI + Knowledge Base)
- תשובות מבוססות על ה-embeddings במסד הנתונים

### 4. Course Builder (CHAT MODE - RAG)

```javascript
window.initializeEducoreBot({
  microservice: "COURSE_BUILDER",
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId
});
```

### 5. Content Studio (CHAT MODE - RAG)

```javascript
window.initializeEducoreBot({
  microservice: "CONTENT_STUDIO",
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId
});
```

### 6. Skills Engine (CHAT MODE - RAG)

```javascript
window.initializeEducoreBot({
  microservice: "SKILLS_ENGINE",
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId
});
```

### 7. Learner AI (CHAT MODE - RAG)

```javascript
window.initializeEducoreBot({
  microservice: "LEARNER_AI",
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId
});
```

### 8. Learning Analytics (CHAT MODE - RAG)

```javascript
window.initializeEducoreBot({
  microservice: "LEARNING_ANALYTICS",
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId
});
```

### 9. HR & Management Reporting (CHAT MODE - RAG)

```javascript
window.initializeEducoreBot({
  microservice: "HR_MANAGEMENT_REPORTING",
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId
});
```

---

## דוגמה מלאה - HTML

```html
<!DOCTYPE html>
<html lang="he">
<head>
  <meta charset="UTF-8">
  <title>My Microservice</title>
  
  <!-- טען את הסקריפט -->
  <script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>
</head>
<body>
  <h1>My Microservice Dashboard</h1>
  
  <!-- תוכן המיקרוסרוויס שלך -->
  <div id="content">
    <!-- ... -->
  </div>
  
  <!-- Container ל-bot -->
  <div id="edu-bot-container"></div>
  
  <!-- אתחל את ה-bot -->
  <script>
    function getCurrentUser() {
      // הפונקציה שלך לאימות
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
            microservice: "DIRECTORY", // או כל מיקרוסרוויס אחר
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

## דוגמה - React

```jsx
import { useEffect } from 'react';
import { useAuth } from './hooks/useAuth';

function MyMicroservicePage() {
  const { user, token } = useAuth();
  
  useEffect(() => {
    if (!user || !token) return;
    
    // טען את הסקריפט אם עדיין לא נטען
    if (!window.EDUCORE_BOT_LOADED) {
      const script = document.createElement('script');
      // BACKEND רץ ב-Railway - זה ה-URL הנכון!
      script.src = 'https://rag-production-3a4c.up.railway.app/embed/bot.js';
      script.async = true;
      document.head.appendChild(script);
      
      script.onload = () => {
        if (window.initializeEducoreBot) {
          window.initializeEducoreBot({
            microservice: "DIRECTORY", // או כל מיקרוסרוויס אחר
            userId: user.id,
            token: token,
            tenantId: user.tenantId || "default"
          });
        }
      };
    } else {
      // הסקריפט כבר נטען, רק אתחל
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

## הפרמטרים

### חובה:
- `microservice` (string) - שם המיקרוסרוויס (כל שם, case-insensitive)
- `userId` (string) - ID המשתמש המחובר
- `token` (string) - JWT או session token

### אופציונלי:
- `tenantId` (string) - מזהה tenant (ברירת מחדל: `"default"`)
- `container` (string) - CSS selector ל-container (ברירת מחדל: `"#edu-bot-container"`)

---

## איך זה עובד?

### SUPPORT MODE (Assessment/DevLab):

```
User → Widget → /api/assessment/support → Assessment Microservice → Response
```

- הודעות מועברות ישירות למיקרוסרוויס
- תשובות מוחזרות כפי שהן (verbatim)
- אין עיבוד RAG

### CHAT MODE (כל השאר):

```
User → Widget → /api/v1/query → RAG Backend → OpenAI + Knowledge Base → Response
```

- הודעות נשלחות ל-RAG API
- RAG מחפש במסד הנתונים (vector embeddings)
- תשובות מבוססות על ה-knowledge base
- תשובות מ-OpenAI עם context מה-embeddings

---

## Prerequisites

### לפני ההטמעה, ודא:

1. **RAG Backend רץ ב-Railway:**
   ```bash
   curl https://rag-production-3a4c.up.railway.app/health
   ```
   - ה-BACKEND רץ ב-Railway (לא Vercel)
   - זה ה-URL שצריך להשתמש בו

2. **Embed files זמינים מה-BACKEND:**
   ```bash
   curl https://rag-production-3a4c.up.railway.app/embed/bot.js
   ```
   - הקבצים מוגשים מה-BACKEND (Railway), לא מה-FRONTEND (Vercel)
   - ה-BACKEND משרת את הקבצים מ-`FRONTEND/dist/embed/` עם CORS headers

3. **למיקרוסרוויסים ב-SUPPORT MODE:**
   - `SUPPORT_MODE_ENABLED=true` ב-backend
   - `SUPPORT_ALLOWED_ORIGINS` כולל את הדומיין שלך

4. **למיקרוסרוויסים ב-CHAT MODE:**
   - אין צורך בהגדרות נוספות
   - רק צריך שה-backend רץ

---

## Troubleshooting

### ⚠️ "Failed to load bot bundle" או שגיאת 404:
- **ודא שאתה משתמש ב-BACKEND URL (Railway), לא FRONTEND (Vercel)!**
- ✅ **נכון:** `https://rag-production-3a4c.up.railway.app/embed/bot.js`
- ❌ **שגוי:** `https://rag-git-main-educoreai-lotus.vercel.app/embed/bot.js`
- הקבצים מוגשים מה-BACKEND (Railway), לא מה-FRONTEND (Vercel)

### שגיאת CORS:
- הוסף את ה-origin ל-`SUPPORT_ALLOWED_ORIGINS` (רק ל-SUPPORT MODE)
- או ודא שה-backend מאפשר CORS
- ה-BACKEND (Railway) מגדיר CORS headers אוטומטית

### "Support mode is disabled":
- הגדר `SUPPORT_MODE_ENABLED=true` ב-backend (Railway)
- רק רלוונטי ל-Assessment/DevLab

### Widget לא מופיע:
- בדוק שה-container קיים: `<div id="edu-bot-container"></div>`
- בדוק שה-script נטען מה-BACKEND (Railway) - Network tab
- בדוק את ה-Console לשגיאות
- ודא שאתה משתמש ב-Railway URL, לא Vercel

### תשובות לא מגיעות (CHAT MODE):
- ודא שה-BACKEND רץ ב-Railway
- בדוק שה-embeddings קיימים במסד הנתונים
- בדוק את ה-Console לשגיאות

---

## סיכום

### ארכיטקטורה:
- **BACKEND** רץ ב-**Railway** → זה ה-URL שצריך להשתמש בו
- **FRONTEND** רץ ב-**Vercel** → לא משתמשים בו להטמעה
- הקבצים embed מוגשים מה-**BACKEND** (Railway), לא מה-FRONTEND

### SUPPORT MODE (Assessment/DevLab):
- הודעות → מיקרוסרוויס ישירות
- תשובות → מהמיקרוסרוויס (verbatim)

### CHAT MODE (כל השאר):
- הודעות → RAG API
- תשובות → מ-RAG (OpenAI + Knowledge Base)

**כל מיקרוסרוויס יכול להשתמש ב-widget!**

**URL להטמעה:**
- ✅ `https://rag-production-3a4c.up.railway.app/embed/bot.js` (BACKEND - Railway)
- ❌ `https://rag-git-main-educoreai-lotus.vercel.app/embed/bot.js` (FRONTEND - Vercel - לא משתמשים!)

---

**Document Maintained By:** RAG Microservice Team  
**Questions?** Check troubleshooting section or contact support.

