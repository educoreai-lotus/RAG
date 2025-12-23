# הנחיות לתיקון בעיית הטמעת הבוט ב-DEVLAB

## בעיה זוהתה
DEVLAB לא מצליח לבטמיע את הבוט. הקוד שסופק מראה ניסיון לאתחל את הבוט ב-`Dashboard.jsx`, אך יש כמה בעיות פוטנציאליות.

## ✅ רשימת בדיקה מהירה (Checklist)

לפני שמתחילים, ודא:

- [ ] **ה-HTML של DEVLAB כולל את הסקריפט:** `<script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>`
- [ ] **ה-HTML של DEVLAB כולל את ה-container:** `<div id="edu-bot-container"></div>`
- [ ] **ה-backend של RAG רץ:** `https://rag-production-3a4c.up.railway.app/health` מחזיר `{"status":"ok"}`
- [ ] **הסקריפט נגיש:** `https://rag-production-3a4c.up.railway.app/embed/bot.js` מחזיר קוד JavaScript
- [ ] **ה-token נמצא ב-localStorage:** `localStorage.getItem('auth-token')` מחזיר ערך תקין
- [ ] **ה-user object תקין:** `effectiveUser.id` קיים ולא `'anonymous'`

אם כל אלה מסומנים ✅ → הבעיה כנראה ב-CORS או ב-config של ה-backend.

## בדיקות נדרשות

### 1. בדיקה שהסקריפט נטען ב-HTML
**הבעיה העיקרית:** הסקריפט `bot.js` חייב להיות נטען ב-HTML של DEVLAB לפני שהקומפוננטה מנסה לאתחל את הבוט.

**מה לבדוק:**
- פתח את קובץ ה-HTML הראשי של DEVLAB (כנראה `index.html` או `public/index.html`)
- ודא שיש בו את השורות הבאות:

```html
<!-- לפני </body> או ב-<head> -->
<script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>
<!-- או -->
<script src="https://rag-git-main-educoreai-lotus.vercel.app/embed/bot.js"></script>
```

**⚠️ חשוב:** השתמש ב-URL של ה-**BACKEND**, לא של ה-frontend!

### 2. בדיקה שקיים container div
**מה לבדוק:**
- ודא שיש `<div id="edu-bot-container"></div>` ב-HTML (לפני `</body>`)
- או שהקומפוננטה יוצרת את ה-container באופן דינמי

### 3. בעיית תזמון (Timing)
הקוד הנוכחי ב-`Dashboard.jsx` מנסה לאתחל את הבוט ב-`useEffect`, אבל הסקריפט עלול לא להיות נטען עדיין.

## פתרון מומלץ

### שלב 1: עדכן את קובץ ה-HTML של DEVLAB

הוסף את הסקריפט ל-HTML הראשי:

```html
<!DOCTYPE html>
<html lang="he">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DEVLAB</title>
  
  <!-- הוסף את זה ב-<head> -->
  <script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>
</head>
<body>
  <div id="root"></div>
  
  <!-- הוסף את זה לפני </body> -->
  <div id="edu-bot-container"></div>
  
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

### שלב 2: שפר את לוגיקת האתחול ב-Dashboard.jsx

הקוד הנוכחי טוב, אבל צריך לשפר את מנגנון ה-retry:

```jsx
// Initialize chatbot when user is available
useEffect(() => {
  let retryCount = 0;
  const MAX_RETRIES = 50; // 5 שניות מקסימום (50 * 100ms)
  
  function initChatbot() {
    const token = localStorage.getItem('auth-token') || '';
    
    if (effectiveUser && effectiveUser.id && effectiveUser.id !== 'anonymous' && token) {
      if (window.initializeEducoreBot) {
        console.log('🤖 [DEVLAB] Initializing EDUCORE Bot...');
        window.initializeEducoreBot({
          microservice: 'DEVLAB',
          userId: effectiveUser.id,
          token: token,
          tenantId: effectiveUser.tenantId || 'default'
        });
        console.log('✅ [DEVLAB] EDUCORE Bot initialized successfully');
      } else {
        retryCount++;
        if (retryCount < MAX_RETRIES) {
          console.log(`⏳ [DEVLAB] Bot script not loaded yet, retrying... (${retryCount}/${MAX_RETRIES})`);
          setTimeout(initChatbot, 100);
        } else {
          console.error('❌ [DEVLAB] Failed to load bot script after maximum retries');
        }
      }
    } else {
      console.warn('⚠️ [DEVLAB] Cannot initialize bot: missing user or token');
    }
  }
  
  // Initialize when component mounts and user is available
  if (effectiveUser?.id) {
    // Wait a bit for script to load if it's in the HTML
    setTimeout(initChatbot, 200);
  }
}, [effectiveUser]);
```

### שלב 3: בדיקה בקונסול

לאחר העדכון, פתח את הקונסול בדפדפן ובדוק:

1. **הסקריפט נטען:**
   ```javascript
   console.log(typeof window.initializeEducoreBot); // צריך להחזיר "function"
   ```

2. **האתחול נקרא:**
   - חפש הודעות שמתחילות ב-`🤖 [EDUCORE Bot]` או `[DEVLAB]`

3. **שגיאות אפשריות:**
   - אם יש שגיאת CORS → צריך להוסיף את הדומיין של DEVLAB ל-`SUPPORT_ALLOWED_ORIGINS` ב-backend
   - אם יש שגיאת 404 → בדוק שה-URL של הסקריפט נכון
   - אם יש שגיאת "Support mode disabled" → צריך להפעיל `SUPPORT_MODE_ENABLED=true` ב-backend

## בדיקות נוספות

### בדיקה שהסקריפט נגיש
פתח בדפדפן:
```
https://rag-production-3a4c.up.railway.app/embed/bot.js
```
צריך לראות קוד JavaScript (לא 404).

### בדיקה שהבוט מופיע
לאחר האתחול המוצלח, צריך להופיע כפתור צף בפינה התחתונה של המסך.

## סיכום התיקונים הנדרשים

1. ✅ **הוסף את `<script src=".../embed/bot.js"></script>` ל-HTML של DEVLAB**
2. ✅ **הוסף את `<div id="edu-bot-container"></div>` ל-HTML**
3. ✅ **שפר את מנגנון ה-retry ב-Dashboard.jsx** (אופציונלי אבל מומלץ)
4. ✅ **ודא שה-backend מאפשר את הדומיין של DEVLAB ב-CORS**

## אם עדיין לא עובד

### שלב 1: בדיקות בסיסיות

1. **בדוק שהסקריפט נטען:**
   ```javascript
   // בקונסול של הדפדפן
   console.log(typeof window.initializeEducoreBot); 
   // צריך להחזיר: "function"
   // אם מחזיר "undefined" → הסקריפט לא נטען
   ```

2. **בדוק שה-backend רץ:**
   פתח בדפדפן:
   ```
   https://rag-production-3a4c.up.railway.app/health
   ```
   צריך לראות: `{"status":"ok"}`

3. **בדוק שהסקריפט נגיש:**
   פתח בדפדפן:
   ```
   https://rag-production-3a4c.up.railway.app/embed/bot.js
   ```
   צריך לראות קוד JavaScript (לא 404)

### שלב 2: בדיקות בקונסול

פתח את הקונסול בדפדפן (F12) וחפש:

- **שגיאות CORS:**
  ```
  Access to fetch at 'https://rag-production-3a4c.up.railway.app/...' 
  from origin 'https://devlab.educore.com' has been blocked by CORS policy
  ```
  **פתרון:** צריך להוסיף את הדומיין של DEVLAB ל-`SUPPORT_ALLOWED_ORIGINS` ב-backend

- **שגיאות 404:**
  ```
  Failed to load resource: the server responded with a status of 404
  ```
  **פתרון:** בדוק שה-URL של הסקריפט נכון

- **שגיאת "Support mode disabled":**
  ```
  EDUCORE Bot: Support mode is disabled
  ```
  **פתרון:** צריך להפעיל `SUPPORT_MODE_ENABLED=true` ב-backend

- **שגיאת token:**
  ```
  EDUCORE Bot: "token" parameter is required
  ```
  **פתרון:** ודא שה-token נמצא ב-localStorage תחת המפתח `auth-token`

### שלב 3: תיקון בעיות ב-backend (אם נדרש)

אם יש שגיאת CORS או "Support mode disabled", צריך לעדכן את ה-backend של RAG:

**ב-Railway (או ה-environment שלך), הוסף/עדכן:**

```bash
SUPPORT_MODE_ENABLED=true
SUPPORT_ALLOWED_ORIGINS=https://devlab.educore.com,https://www.devlab.educore.com,http://localhost:3000
```

**⚠️ חשוב:**
- הוסף את כל ה-domains של DEVLAB (production, staging, localhost)
- הפרד בין domains עם פסיקים (`,`) ללא רווחים
- ודא שאין רווחים מיותרים

### שלב 4: בדיקה סופית

לאחר כל התיקונים:

1. **רענן את הדף** (Ctrl+F5 או Cmd+Shift+R)
2. **פתח את הקונסול** ובדוק שהודעות:
   - `🤖 [EDUCORE Bot] Initializing with config:`
   - `✅ [EDUCORE Bot] Config saved:`
   - `✅ [DEVLAB] EDUCORE Bot initialized successfully`
3. **חפש את כפתור הבוט** בפינה התחתונה של המסך

## סיכום: מה צריך לעבוד בסוף?

✅ הסקריפט `bot.js` נטען מה-HTML  
✅ `window.initializeEducoreBot` קיים ופועל  
✅ האתחול נקרא עם הפרמטרים הנכונים  
✅ אין שגיאות CORS בקונסול  
✅ הבוט מופיע ככפתור צף במסך  

אם כל אלה עובדים → הבוט אמור לעבוד! 🎉

---

## תרחישים נפוצים ופתרונות

### תרחיש 1: הסקריפט לא נטען

**תסמינים:**
- בקונסול: `window.initializeEducoreBot is undefined`
- אין הודעות מהבוט בקונסול

**פתרון:**
1. ודא שה-`<script>` tag נמצא ב-HTML **לפני** שהקומפוננטה React נטענת
2. נסה להזיז את ה-`<script>` ל-`<head>` במקום לפני `</body>`
3. בדוק שאין שגיאות 404 ב-Network tab של הדפדפן

### תרחיש 2: שגיאת CORS

**תסמינים:**
```
Access to fetch at 'https://rag-production-3a4c.up.railway.app/...' 
from origin 'https://devlab.educore.com' has been blocked by CORS policy
```

**פתרון:**
צריך לעדכן את ה-backend של RAG (לא ב-DEVLAB!):
```bash
SUPPORT_MODE_ENABLED=true
SUPPORT_ALLOWED_ORIGINS=https://devlab.educore.com,https://www.devlab.educore.com
```

### תרחיש 3: הבוט לא מופיע למרות שהכל נראה תקין

**תסמינים:**
- בקונסול רואים: `✅ [DEVLAB] EDUCORE Bot initialized successfully`
- אבל אין כפתור צף במסך

**פתרון:**
1. בדוק שה-container קיים: `document.getElementById('edu-bot-container')` לא מחזיר `null`
2. בדוק שאין CSS שמסתיר את הבוט (z-index נמוך, display: none, וכו')
3. נסה לפתוח את הקונסול ולבדוק אם יש שגיאות JavaScript

### תרחיש 4: האתחול נקרא אבל יש שגיאה

**תסמינים:**
- בקונסול רואים: `❌ EDUCORE Bot: "userId" parameter is required`
- או: `❌ EDUCORE Bot: "token" parameter is required`

**פתרון:**
1. ודא ש-`effectiveUser.id` קיים ולא `undefined` או `'anonymous'`
2. ודא ש-`localStorage.getItem('auth-token')` מחזיר ערך תקין
3. הוסף console.log לפני האתחול:
   ```jsx
   console.log('User:', effectiveUser);
   console.log('Token:', localStorage.getItem('auth-token'));
   ```

---

## שאלות נפוצות

**Q: האם צריך לעדכן את הקוד ב-Dashboard.jsx?**  
A: לא בהכרח. הקוד הקיים טוב, אבל השיפור המוצע (עם MAX_RETRIES) יעזור במקרים של תזמון.

**Q: מה אם ה-backend לא רץ?**  
A: אז הבוט לא יעבוד. ודא שה-backend של RAG רץ ב-Railway לפני שמנסים לבטמיע את הבוט.

**Q: האם צריך לעדכן משהו ב-App.jsx?**  
A: לא. הקוד ב-App.jsx (שמגדיר `window.APP_USER`) לא נדרש לבוט, אבל גם לא מזיק.

**Q: מה ה-URL הנכון של הסקריפט?**  
A: `https://rag-production-3a4c.up.railway.app/embed/bot.js` (BACKEND - Railway)  
❌ לא: `https://rag-git-main-educoreai-lotus.vercel.app/embed/bot.js` (FRONTEND - Vercel)

---

## סיכום: האם זה יתוקן?

**כן, אם:**

1. ✅ ה-HTML של DEVLAB כולל את הסקריפט וה-container
2. ✅ ה-backend של RAG רץ ונגיש
3. ✅ ה-CORS מוגדר נכון ב-backend (אם יש שגיאת CORS)
4. ✅ ה-token וה-user תקינים

**לא, אם:**

1. ❌ הסקריפט לא נטען ב-HTML
2. ❌ ה-backend לא רץ או לא נגיש
3. ❌ יש שגיאת CORS ולא מתקנים את ה-backend
4. ❌ ה-token או ה-user לא תקינים

**הקובץ הזה מכיל את כל המידע הנדרש לתיקון. אם עוקבים אחרי ההנחיות בדיוק, הבעיה אמורה להיפתר!** ✅

