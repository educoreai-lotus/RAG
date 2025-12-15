# מה אמור להופיע ב-LOGS אחרי הטמעה?

**Version:** 1.0  
**Last Updated:** 2025-01-27

---

## 📋 סיכום מהיר

**אחרי הטמעה, אמורים לראות ב-LOGS:**

1. **כשהמיקרוסרוויס טוען את הקבצים** - אין log מיוחד (רק HTTP GET requests)
2. **המשתמש שולח הודעה** - יש logs מפורטים:
   - SUPPORT MODE: `"Assessment support request"` או `"DevLab support request"`
   - CHAT MODE: `"Routing to normal chatbot flow"`

---

## 🔍 מה אמור להופיע ב-LOGS?

### 1. כשהמיקרוסרוויס טוען את הקבצים (Embed Files)

**כשהמיקרוסרוויס פותח את הדף וטוען את `bot.js`:**

**ב-LOGS של RAG Backend:**
- אין log מיוחד (רק HTTP GET request)
- אם יש access log middleware, תראה:
  ```
  GET /embed/bot.js 200
  GET /embed/bot-bundle.js 200
  ```

**איך לבדוק שהקבצים נטענים:**
- בדוק ב-Network tab בדפדפן של המיקרוסרוויס
- אמור לראות:
  - `bot.js` - Status 200
  - `bot-bundle.js` - Status 200

---

### 2. כשהמשתמש שולח הודעה

**SUPPORT MODE (Assessment/DevLab):**

**ב-LOGS של RAG Backend:**
```
[INFO] Assessment support request {
  query: "How do I create an assessment?",
  session_id: "session_1234567890",
  user_id: "user-123",
  source: "assessment"
}
```

או:

```
[INFO] DevLab support request {
  query: "How do I debug my code?",
  session_id: "session_1234567890",
  user_id: "user-123",
  source: "devlab"
}
```

**CHAT MODE (כל השאר):**

**ב-LOGS של RAG Backend:**
```
[INFO] Routing to normal chatbot flow (no support-mode signal found) {
  query: "What is RAG?",
  tenant_id: "default",
  user_id: "user-123"
}
```

ואז:
```
[INFO] Processing RAG query {
  query: "What is RAG?",
  tenant_id: "default",
  max_results: 5,
  min_confidence: 0.7
}
```

---

## 🔍 איך לבדוק שההטמעה עובדת?

### שלב 1: בדוק שהקבצים נטענים

**בדפדפן של המיקרוסרוויס:**
1. פתח את ה-Console (F12)
2. פתח את ה-Network tab
3. רענן את הדף
4. בדוק:
   - `bot.js` - Status 200 ✅
   - `bot-bundle.js` - Status 200 ✅

**ב-LOGS של RAG Backend:**
- אין log מיוחד (רק HTTP GET requests)
- אם יש access log, תראה:
  ```
  GET /embed/bot.js 200
  GET /embed/bot-bundle.js 200
  ```

---

### שלב 2: בדוק שהמשתמש התחבר

**בדפדפן של המיקרוסרוויס:**
1. פתח את ה-Console (F12)
2. בדוק:
   ```javascript
   console.log(localStorage.getItem('token')); // אמור להחזיר token
   console.log(localStorage.getItem('user_id')); // אמור להחזיר user ID
   ```

---

### שלב 3: בדוק שהמשתמש שולח הודעה

**בדפדפן של המיקרוסרוויס:**
1. פתח את ה-Chatbot
2. שלח הודעה
3. בדוק ב-Network tab:
   - SUPPORT MODE: `POST /api/assessment/support` או `/api/devlab/support` - Status 200
   - CHAT MODE: `POST /api/v1/query` - Status 200

**ב-LOGS של RAG Backend:**

**SUPPORT MODE:**
```
[INFO] Assessment support request {
  query: "How do I create an assessment?",
  session_id: "session_1234567890",
  user_id: "user-123",
  source: "assessment"
}
```

**CHAT MODE:**
```
[INFO] Routing to normal chatbot flow (no support-mode signal found) {
  query: "What is RAG?",
  tenant_id: "default",
  user_id: "user-123"
}
```

---

## 🐛 מה אם לא רואים LOGS?

### בעיה: לא רואים logs כשטוענים את הקבצים

**זה נורמלי!**
- טעינת הקבצים (`bot.js`, `bot-bundle.js`) לא יוצרת logs מיוחדים
- רק HTTP GET requests (אם יש access log middleware)

**איך לבדוק:**
- בדוק ב-Network tab בדפדפן
- אמור לראות Status 200

---

### בעיה: לא רואים logs כששולחים הודעה

**אפשרויות:**
1. **ה-widget לא נטען** - בדוק ב-Network tab
2. **המשתמש לא התחבר** - בדוק ב-Console
3. **יש שגיאה** - בדוק ב-Console וב-Network tab

**איך לבדוק:**
1. פתח את ה-Console (F12)
2. בדוק שגיאות (errors)
3. פתח את ה-Network tab
4. בדוק אם יש requests ל-`/api/assessment/support` או `/api/v1/query`

---

### בעיה: רואים שגיאה ב-logs

**שגיאות נפוצות:**

**1. "Support mode is disabled":**
```
[WARN] Support-mode signal ignored (not enabled/authorized) {
  supportEnabled: false,
  origin: "https://your-microservice.com"
}
```

**פתרון:**
- הגדר `SUPPORT_MODE_ENABLED=true` ב-backend
- הוסף את ה-origin ל-`SUPPORT_ALLOWED_ORIGINS`

**2. "Origin not allowed":**
```
[WARN] Support-mode signal ignored (not enabled/authorized) {
  origin: "https://your-microservice.com",
  originAllowed: false
}
```

**פתרון:**
- הוסף את ה-origin ל-`SUPPORT_ALLOWED_ORIGINS`

**3. "Failed to load bot bundle":**
```
[ERROR] Error serving embed file: {
  path: "/embed/bot-bundle.js",
  error: "ENOENT: no such file or directory"
}
```

**פתרון:**
- ודא שה-frontend נבנה: `cd FRONTEND && npm run build`
- ודא שהקבצים קיימים ב-`FRONTEND/dist/embed/`

---

## 📊 סיכום - מה אמור להופיע ב-LOGS

| שלב | מה קורה | מה אמור להופיע ב-LOGS |
|-----|---------|----------------------|
| **טעינת קבצים** | המיקרוסרוויס טוען `bot.js` | אין log מיוחד (רק HTTP GET) |
| **טעינת bundle** | המיקרוסרוויס טוען `bot-bundle.js` | אין log מיוחד (רק HTTP GET) |
| **שליחת הודעה (SUPPORT)** | משתמש שולח הודעה ב-Assessment/DevLab | `[INFO] Assessment support request` או `[INFO] DevLab support request` |
| **שליחת הודעה (CHAT)** | משתמש שולח הודעה במיקרוסרוויס אחר | `[INFO] Routing to normal chatbot flow` |

---

## 🔍 איך לבדוק שהכל עובד?

### Checklist:

- [ ] הקבצים נטענים (Network tab - Status 200)
- [ ] המשתמש התחבר (Console - localStorage)
- [ ] ה-widget מופיע (בדף)
- [ ] שליחת הודעה עובדת (Network tab - Status 200)
- [ ] רואים logs ב-backend (כששולחים הודעה)

---

## 💡 טיפים

1. **לבדיקת טעינת קבצים:**
   - השתמש ב-Network tab בדפדפן
   - לא צריך לבדוק ב-logs

2. **לבדיקת שליחת הודעות:**
   - בדוק ב-logs של RAG Backend
   - אמור לראות logs מפורטים

3. **לבדיקת שגיאות:**
   - בדוק ב-Console בדפדפן
   - בדוק ב-logs של RAG Backend

---

**Document Maintained By:** RAG Microservice Team

