# משתני סביבה - מה צריך להגדיר?

**Version:** 1.0  
**Last Updated:** 2025-01-27

---

## 📋 תשובה קצרה

**המיקרוסרוויסים לא צריכים להגדיר שום משתני סביבה!**

**רק להריץ את ה-script וזהו!**

---

## 🔍 הסבר מפורט

### מה המיקרוסרוויסים צריכים לעשות?

**רק 3 דברים:**
1. להוסיף `<div id="edu-bot-container"></div>`
2. להוסיף `<script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>`
3. לקרוא ל-`window.initializeEducoreBot({...})`

**אין צורך:**
- ❌ להגדיר משתני סביבה
- ❌ להתקין packages
- ❌ להוריד קבצים
- ❌ לבנות משהו

---

## ⚙️ מה כן צריך להיות מוגדר?

### משתני הסביבה מוגדרים ב-BACKEND של RAG (לא במיקרוסרוויסים!)

#### 1. לכל המיקרוסרוויסים (CHAT MODE):

**אין צורך בהגדרות נוספות!**

- ה-BACKEND של RAG כבר רץ
- הקבצים כבר מוגשים
- הכל עובד אוטומטית

---

#### 2. למיקרוסרוויסים ב-SUPPORT MODE (Assessment/DevLab):

**צריך להגדיר ב-BACKEND של RAG (לא במיקרוסרוויס!):**

```bash
# ב-.env של RAG Backend (Railway)
SUPPORT_MODE_ENABLED=true
SUPPORT_ALLOWED_ORIGINS=https://assessment.educore.com,https://devlab.educore.com
```

**איפה להגדיר:**
- ✅ ב-RAG Backend (Railway) - Environment Variables
- ❌ לא במיקרוסרוויס!

**מי מגדיר:**
- צוות RAG מגדיר את זה
- לא המפתחים של המיקרוסרוויסים!

---

## 📊 טבלת סיכום

| סוג מיקרוסרוויס | משתני סביבה במיקרוסרוויס | משתני סביבה ב-RAG Backend |
|------------------|---------------------------|---------------------------|
| **CHAT MODE** (Directory, Course Builder, וכו') | ❌ אין צורך | ❌ אין צורך |
| **SUPPORT MODE** (Assessment, DevLab) | ❌ אין צורך | ✅ `SUPPORT_MODE_ENABLED=true`<br>✅ `SUPPORT_ALLOWED_ORIGINS=...` |

---

## 🔍 איך זה עובד?

### CHAT MODE (7 מיקרוסרוויסים):

```
מיקרוסרוויס → טוען bot.js → שולח הודעה → RAG API → תשובה
```

**אין צורך בהגדרות:**
- הכל עובד אוטומטית
- אין CORS issues (ה-BACKEND מאפשר הכל)
- אין צורך במשתני סביבה

---

### SUPPORT MODE (Assessment/DevLab):

```
מיקרוסרוויס → טוען bot.js → שולח הודעה → RAG Backend → Assessment/DevLab API → תשובה
```

**צריך להגדיר ב-RAG Backend:**
- `SUPPORT_MODE_ENABLED=true` - מאפשר SUPPORT MODE
- `SUPPORT_ALLOWED_ORIGINS=...` - מאפשר את ה-origin של המיקרוסרוויס

**מי מגדיר:**
- צוות RAG מגדיר את זה ב-Railway
- לא המפתחים של המיקרוסרוויסים!

---

## ⚠️ נקודות חשובות

### 1. המיקרוסרוויסים לא צריכים להגדיר כלום!

**רק להריץ את ה-script:**
```html
<script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>
<script>
  window.initializeEducoreBot({
    microservice: "DIRECTORY",
    userId: user.id,
    token: user.token
  });
</script>
```

**זה הכל!** אין צורך במשתני סביבה.

---

### 2. משתני הסביבה מוגדרים ב-RAG Backend

**ב-RAG Backend (Railway):**
- `SUPPORT_MODE_ENABLED=true` (רק ל-SUPPORT MODE)
- `SUPPORT_ALLOWED_ORIGINS=...` (רק ל-SUPPORT MODE)

**מי מגדיר:**
- צוות RAG
- לא המפתחים של המיקרוסרוויסים!

---

### 3. אם יש שגיאת CORS (SUPPORT MODE)

**זה אומר שצריך:**
- להוסיף את ה-origin ל-`SUPPORT_ALLOWED_ORIGINS` ב-RAG Backend
- לא במיקרוסרוויס!

**איך:**
- צור קשר עם צוות RAG
- תן להם את ה-URL של המיקרוסרוויס שלך
- הם יוסיפו אותו ל-`SUPPORT_ALLOWED_ORIGINS`

---

## 📝 דוגמאות

### CHAT MODE (Directory, Course Builder, וכו'):

**במיקרוסרוויס:**
```html
<!-- אין צורך במשתני סביבה! -->
<script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>
<script>
  window.initializeEducoreBot({
    microservice: "DIRECTORY",
    userId: user.id,
    token: user.token
  });
</script>
```

**ב-RAG Backend:**
- אין צורך בהגדרות נוספות ✅

---

### SUPPORT MODE (Assessment, DevLab):

**במיקרוסרוויס:**
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

**ב-RAG Backend (Railway):**
```bash
# צוות RAG מגדיר את זה
SUPPORT_MODE_ENABLED=true
SUPPORT_ALLOWED_ORIGINS=https://assessment.educore.com,https://devlab.educore.com
```

---

## ❓ שאלות נפוצות

### Q: צריך להגדיר משתני סביבה במיקרוסרוויס?
**A:** לא! רק להריץ את ה-script.

### Q: מי מגדיר את משתני הסביבה?
**A:** צוות RAG מגדיר אותם ב-BACKEND (Railway), לא במיקרוסרוויסים.

### Q: מה אם יש שגיאת CORS?
**A:** צור קשר עם צוות RAG להוספת ה-origin ל-`SUPPORT_ALLOWED_ORIGINS`.

### Q: מה אם המיקרוסרוויס שלי ב-CHAT MODE?
**A:** אין צורך בהגדרות כלל! הכל עובד אוטומטית.

---

## 🎯 סיכום

### המיקרוסרוויסים:
- ❌ לא צריכים להגדיר משתני סביבה
- ✅ רק להריץ את ה-script
- ✅ זה הכל!

### RAG Backend:
- ✅ CHAT MODE: אין צורך בהגדרות
- ✅ SUPPORT MODE: צריך `SUPPORT_MODE_ENABLED=true` ו-`SUPPORT_ALLOWED_ORIGINS`

**המיקרוסרוויסים רק צריכים להריץ את ה-script - זה הכל!** 🎉

---

**Document Maintained By:** RAG Microservice Team

