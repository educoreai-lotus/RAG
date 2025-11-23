# 📘 **EDUCORE – מדריך הטמעת Chatbot RAG במיקרוסרוויסים**

**גרסה:** 1.0

**תאריך:** 2025

**מיועד עבור:** צוותי Frontend של Assessment / DevLab / Course Builder / וכל שאר המיקרוסרוויסים

**מטרה:** הסבר אחיד וברור כיצד להטמיע את ה-Chatbot במיקרוסרוויסים של EDUCORE

---

# 🔷 1. מה זה ה-Chatbot?

ה-Chatbot הוא רכיב React מוכן שמוטמע בכל מיקרוסרוויס באמצעות `<script>` חיצוני.

**⚠️ חשוב:** כאשר משתמשים ב-embed mode (`bot.js`), הבוט עובד **רק ב-Support Mode** ומעביר כל הודעה למיקרוסרוויס היעד. אין אפשרות להשתמש ב-General Chat Mode דרך ה-embed.

### **Mode 1 — General Chat**

שימוש ב-RAG (vector search + OpenAI) לשאלות כלליות.

**⚠️ הערה:** מצב זה זמין רק כאשר הבוט מוטמע ישירות באפליקציית RAG עצמה, **לא דרך embed mode**.

### **Mode 2 — Support Mode**

כאשר מיקרוסרוויס שולח:

```
microservice: "ASSESSMENT"  או  "DEVLAB"
```

הבוט נכנס אוטומטית למצב "תמיכת משתמשים" (Support Mode) ומעביר כל הודעה למקרוסרביס היעד.

**⚠️ חשוב:** `microservice` הוא **חובה**! הבוט לא יתחיל בלעדיו.

---

# 🔷 2. כתובת ה-RAG לטעינת הבוט

ה-Chatbot נטען מה-domain:

```
https://ragmicroservice-production.up.railway.app
```

ומוגש משם כקבצים סטטיים.

הקבצים שנטענים:

* `/embed/bot.js`

* `/embed/bot-bundle.js`

---

# 🔷 3. מה המיקרוסרוויס צריך לטעון?

כל מיקרוסרוויס צריך להוסיף **3 חלקים בלבד**:

---

# 🟦 **3.1 – הוספת Container**

בכל עמוד שבו רוצים שה-Chatbot יופיע:

```html
<div id="edu-bot-container"></div>
```

---

# 🟦 **3.2 – טעינת bot.js**

יש להוסיף בעמוד (HTML / React / Vue):

```html
<script src="https://ragmicroservice-production.up.railway.app/embed/bot.js"></script>
```

---

# 🟦 **3.3 – ביצוע Initialize לאחר שהמשתמש מחובר**

**⚠️ חשוב:** הבוט חייב לקבל את כל הפרמטרים הבאים (כולם חובה):

* `microservice` - **חובה!** חייב להיות `"ASSESSMENT"` או `"DEVLAB"` (לא אופציונלי)
* `userId` - **חובה!** ID של המשתמש המחובר
* `token` - **חובה!** JWT token של המשתמש

דוגמה:

```html
<script>
  function startEducoreBot() {
    if (!window.initializeEducoreBot) {
      return setTimeout(startEducoreBot, 150);
    }
    
    // ⚠️ חשוב: microservice הוא חובה!
    window.initializeEducoreBot({
      microservice: "ASSESSMENT",   // או "DEVLAB" - חובה!
      userId: currentUser.id,       // חובה!
      token: currentUser.token,     // חובה!
      container: "#edu-bot-container"
    });
  }

  document.addEventListener("DOMContentLoaded", startEducoreBot);
</script>
```

**⚠️ אם `microservice` חסר או לא תקין, הבוט לא יתחיל ויוצג שגיאה בקונסול.**

---

# 🔷 4. הטמעה ב-React (דוגמה מלאה)

```jsx
useEffect(() => {
  if (!user || !token) return;

  const script = document.createElement("script");
  script.src = "https://ragmicroservice-production.up.railway.app/embed/bot.js";
  script.async = true;
  script.onload = () => {
    if (window.initializeEducoreBot) {
      // ⚠️ חשוב: microservice הוא חובה!
      window.initializeEducoreBot({
        microservice: "DEVLAB",  // חובה! "ASSESSMENT" או "DEVLAB"
        userId: user.id,          // חובה!
        token,                    // חובה!
        container: "#edu-bot-container"
      });
    }
  };
  document.body.appendChild(script);
  return () => {
    if (window.destroyEducoreBot) {
      window.destroyEducoreBot();
    }
  };
}, [user, token]);
```

---

# 🔷 5. הטמעה ב-Vue (דוגמה מלאה)

```js
onMounted(() => {
  const script = document.createElement("script");
  script.src = "https://ragmicroservice-production.up.railway.app/embed/bot.js";
  script.async = true;
  script.onload = () => {
    // ⚠️ חשוב: microservice הוא חובה!
    window.initializeEducoreBot({
      microservice: "ASSESSMENT",  // חובה! "ASSESSMENT" או "DEVLAB"
      userId: authStore.user.id,   // חובה!
      token: authStore.token,       // חובה!
      container: "#edu-bot-container"
    });
  };
  document.body.appendChild(script);
});

onUnmounted(() => {
  if (window.destroyEducoreBot) {
    window.destroyEducoreBot();
  }
});
```

---

# 🔷 6. דרישות Backend (ללא זה הבוט לא יעבוד)

ב-RAG Backend חובה להגדיר:

```env
SUPPORT_MODE_ENABLED=true
SUPPORT_ALLOWED_ORIGINS=https://assessment.educore.com,https://devlab.educore.com
```

בשלב פיתוח ניתן להתחיל עם:

```
SUPPORT_ALLOWED_ORIGINS=*
```

---

# 🔷 7. איזה Mode הבוט משתמש?

**⚠️ חשוב:** כאשר משתמשים ב-embed mode (`bot.js`), הבוט **תמיד** עובד ב-Support Mode בלבד.

### אם הועבר microservice:

```json
"ASSESSMENT"
```

או

```json
"DEVLAB"
```

→ הבוט נכנס ל-Support Mode ומדבר ישירות עם:

```
/api/assessment/support
/api/devlab/support
```

### ⚠️ אם **לא** הועבר microservice:

→ **הבוט לא יתחיל כלל!** יוצג שגיאה בקונסול:

```
EDUCORE Bot: "microservice" parameter is required
```

**אין מצב General Chat Mode ב-embed mode.**

---

# 🔷 8. בדיקות לאחר התקנה

✔ bot.js נטען ללא שגיאה

✔ בקרום → Network רואים bot-bundle.js

✔ ב-Console:

```
window.initializeEducoreBot
```

מחזיר פונקציה

✔ הווידג'ט מופיע במסך

✔ שולח הודעות לנתיב הנכון (`/api/assessment/support` או `/api/devlab/support`)

✔ אין שגיאות CORS

✔ אין שגיאות בקונסול על `microservice` חסר

---

# 🔷 9. בעיות נפוצות

### ❌ 404 ב־bot-bundle.js

→ ה-frontend של RAG לא נבנה

→ צריך להריץ `npm run build`

→ לוודא שהשרת מגיש את התיקייה `/dist/embed`

### ❌ ג'אווהסקריפט: `initializeEducoreBot is undefined`

→ bot.js עדיין לא נטען

→ צריך לעטוף ב־setTimeout / `window.addEventListener('load')`

### ❌ הווידג'ט לא מופיע

→ container חסר

→ המשתמש לא מחובר ולכן אין userId/token

→ **`microservice` חסר או לא תקין** - בדוק את הקונסול לשגיאות

### ❌ שגיאה: `"microservice" parameter is required`

→ **`microservice` הוא חובה!** יש לספק `"ASSESSMENT"` או `"DEVLAB"`

→ הבוט לא יתחיל ללא פרמטר זה

### ❌ שגיאה: `Invalid microservice "XXX"`

→ `microservice` חייב להיות בדיוק `"ASSESSMENT"` או `"DEVLAB"` (לא case-sensitive, אבל חייב להיות אחד מהשניים)

---

# 🔷 10. סיכום קצר לצוות

1. מוסיפים `<div id="edu-bot-container"></div>`

2. טוענים את הסקריפט:

   ```
   <script src="https://ragmicroservice-production.up.railway.app/embed/bot.js"></script>
   ```

3. **חובה!** קוראים ל־`initializeEducoreBot` אחרי Login עם:
   - `microservice`: `"ASSESSMENT"` או `"DEVLAB"` (**חובה!**)
   - `userId`: ID המשתמש (**חובה!**)
   - `token`: JWT token (**חובה!**)

4. עוברים את בדיקות ההטמעה

5. מוכנים — הבוט עובד ב-Support Mode

---

**⚠️ נקודות חשובות לזכור:**

- `microservice` הוא **חובה** - הבוט לא יתחיל בלעדיו
- ב-embed mode, הבוט עובד **רק ב-Support Mode** - אין General Chat Mode
- כל הפרמטרים (`microservice`, `userId`, `token`) הם **חובה**

---

אם תרצי — אכין לך **גרסת PDF מוכנה להורדה**, או גרסה בפורמט **Notion**, או אפילו **קובץ README.md** לשים בגיטהאב.

