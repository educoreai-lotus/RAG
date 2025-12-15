# הגדרת SUPPORT_ALLOWED_ORIGINS ב-Railway

**Version:** 1.0  
**Last Updated:** 2025-01-27

---

## 📋 תשובה קצרה

**כן, צריך את ה-domains (URLs המלאים) של המיקרוסרוויסים ב-Railway!**

**רק ל-SUPPORT MODE (Assessment/DevLab), לא ל-CHAT MODE.**

---

## 🔍 מה בדיוק צריך להגדיר?

### ב-Railway (RAG Backend Environment Variables):

```bash
SUPPORT_MODE_ENABLED=true
SUPPORT_ALLOWED_ORIGINS=https://assessment-production-2cad.up.railway.app,https://devlab-backend-production-59bb.up.railway.app
```

**⚠️ חשוב מאוד:**

1. **צריך את ה-FRONTEND URL, לא ה-BACKEND URL!**
   - ✅ Frontend URL: ה-URL של הדף שממנו נשלחת הבקשה
   - ❌ Backend URL: לא זה!

2. **איך לדעת מה ה-Frontend URL?**
   - זה ה-URL שהמשתמש רואה בדפדפן
   - בדוק ב-Console: `console.log(window.location.origin)`
   - או ב-Network tab: בדוק את ה-`Origin` header

3. **פורמט:**
   - ✅ צריך את ה-URL המלא (עם `https://`)
   - ✅ צריך את ה-domain המדויק של המיקרוסרוויס
   - ✅ מופרדים בפסיקים (`,`) אם יש כמה
   - ❌ ללא `/` בסוף

---

## 📝 דוגמאות

### דוגמה 1: מיקרוסרוויס אחד

```bash
SUPPORT_ALLOWED_ORIGINS=https://assessment-production-2cad.up.railway.app
```

### דוגמה 2: כמה מיקרוסרוויסים

```bash
SUPPORT_ALLOWED_ORIGINS=https://assessment-production-2cad.up.railway.app,https://devlab-backend-production-59bb.up.railway.app
```

### דוגמה 3: עם ports (development)

```bash
SUPPORT_ALLOWED_ORIGINS=https://assessment-production-2cad.up.railway.app,https://devlab-backend-production-59bb.up.railway.app,http://localhost:3000,http://localhost:3001
```

**⚠️ הערה:** אם יש לך custom domains (כמו `assessment.educore.com`), השתמש בהם במקום ה-Railway URLs.

---

## ⚠️ נקודות חשובות

### 1. צריך את ה-URL המלא

**✅ נכון:**
```
https://assessment-production-2cad.up.railway.app
https://devlab-backend-production-59bb.up.railway.app
```

**❌ שגוי:**
```
assessment-production-2cad.up.railway.app          # חסר https://
https://assessment-production-2cad.up.railway.app/  # יש / בסוף (לא צריך)
assessment-production-2cad                        # רק שם
https://devlab-backend-production-59bb.up.railway.app/api  # יש path (לא צריך)
```

---

### 2. צריך להתאים בדיוק

**הקוד בודק:**
```javascript
const origin = (req.headers.origin || '').toString();
if (allowedOrigins.length > 0 && origin && !allowedOrigins.includes(origin)) {
  return res.status(403).json({ error: 'Forbidden', message: 'Origin not allowed for support mode' });
}
```

**זה אומר:**
- ה-origin מה-header צריך להתאים בדיוק לרשימה
- כולל `https://` או `http://`
- ללא `/` בסוף

---

### 3. רק ל-SUPPORT MODE

**צריך להגדיר רק ל:**
- ✅ Assessment
- ✅ DevLab

**לא צריך להגדיר ל:**
- ❌ Directory
- ❌ Course Builder
- ❌ Content Studio
- ❌ וכל השאר (CHAT MODE)

---

## 🔍 איך לבדוק מה ה-Origin?

### בדפדפן:

1. פתח את ה-Console (F12)
2. פתח את ה-Network tab
3. שלח הודעה מה-chatbot
4. בדוק את ה-Request Headers:
   ```
   Origin: https://assessment-production-2cad.up.railway.app
   ```

### או בקוד:

```javascript
// בדפדפן Console
console.log(window.location.origin);
// Output: https://assessment-production-2cad.up.railway.app
```

---

## 📊 טבלת סיכום

| מיקרוסרוויס | צריך להגדיר ב-Railway? | מה להגדיר |
|-------------|------------------------|-----------|
| **Assessment** | ✅ כן | `SUPPORT_ALLOWED_ORIGINS=https://assessment-production-2cad.up.railway.app` |
| **DevLab** | ✅ כן | `SUPPORT_ALLOWED_ORIGINS=https://devlab-backend-production-59bb.up.railway.app` |
| **Directory** | ❌ לא | אין צורך |
| **Course Builder** | ❌ לא | אין צורך |
| **Content Studio** | ❌ לא | אין צורך |
| **Skills Engine** | ❌ לא | אין צורך |
| **Learner AI** | ❌ לא | אין צורך |
| **Learning Analytics** | ❌ לא | אין צורך |
| **HR & Management Reporting** | ❌ לא | אין צורך |

---

## 🎯 איך להגדיר ב-Railway?

### שלב 1: פתח את Railway Dashboard

1. לך ל-Railway Dashboard
2. בחר את ה-RAG Backend service
3. לך ל-Environment Variables

### שלב 2: הוסף משתני סביבה

**הוסף:**
```
SUPPORT_MODE_ENABLED=true
SUPPORT_ALLOWED_ORIGINS=https://assessment-production-2cad.up.railway.app,https://devlab-backend-production-59bb.up.railway.app
```

**אם יש עוד מיקרוסרוויסים ב-SUPPORT MODE:**
```
SUPPORT_ALLOWED_ORIGINS=https://assessment-production-2cad.up.railway.app,https://devlab-backend-production-59bb.up.railway.app,https://other-microservice.com
```

**⚠️ חשוב:** ודא שאלה ה-FRONTEND URLs (ה-URL שהמשתמש רואה בדפדפן), לא ה-BACKEND URLs!

### שלב 3: Redeploy

- Railway ירדפלוי אוטומטית אחרי שינוי משתני סביבה
- או לחץ על "Redeploy" ידנית

---

## 🔍 איך לבדוק שזה עובד?

### בדיקה 1: בדוק את ה-Origin

**בדפדפן של המיקרוסרוויס:**
1. פתח Console (F12)
2. שלח הודעה מה-chatbot
3. פתח Network tab
4. בדוק את ה-Request Headers:
   ```
   Origin: https://assessment-production-2cad.up.railway.app
   ```

### בדיקה 2: בדוק את ה-Logs

**ב-Railway Logs:**
- אם יש שגיאה: `"Origin not allowed for support mode"`
- זה אומר שה-origin לא ברשימה

### בדיקה 3: בדוק את ה-Response

**אם הכל עובד:**
- Status 200
- תשובה מהמיקרוסרוויס

**אם יש בעיה:**
- Status 403
- Error: `"Origin not allowed for support mode"`

---

## 🐛 Troubleshooting

### שגיאה: "Origin not allowed for support mode"

**סיבות אפשריות:**
1. ה-origin לא ברשימה ב-`SUPPORT_ALLOWED_ORIGINS`
2. ה-origin לא תואם בדיוק (למשל: `http://` במקום `https://`)
3. יש `/` בסוף ה-URL

**פתרון:**
1. בדוק מה ה-origin בפועל (Network tab)
2. ודא שהוא ברשימה ב-`SUPPORT_ALLOWED_ORIGINS`
3. ודא שהוא תואם בדיוק (כולל `https://`, ללא `/` בסוף)

---

## 📝 דוגמה מלאה

### ב-Railway (RAG Backend):

```bash
# Environment Variables
SUPPORT_MODE_ENABLED=true
SUPPORT_ALLOWED_ORIGINS=https://assessment-production-2cad.up.railway.app,https://devlab-backend-production-59bb.up.railway.app
```

### במיקרוסרוויס (Assessment):

```html
<!-- אין צורך במשתני סביבה! -->
<script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>
<script>
  window.initializeEducoreBot({
    microservice: "ASSESSMENT",
    userId: user.id,
    token: user.token
  });
</script>
```

---

## 🎯 סיכום

### מה צריך להגדיר ב-Railway:

**ל-SUPPORT MODE (Assessment/DevLab):**
- ✅ `SUPPORT_MODE_ENABLED=true`
- ✅ `SUPPORT_ALLOWED_ORIGINS=https://assessment-production-2cad.up.railway.app,https://devlab-backend-production-59bb.up.railway.app`

**ל-CHAT MODE (כל השאר):**
- ❌ אין צורך בהגדרות

### פורמט:
- ✅ `https://domain.com` (עם https://)
- ❌ `domain.com` (בלי https://)
- ❌ `https://domain.com/` (עם / בסוף)

---

**Document Maintained By:** RAG Microservice Team

