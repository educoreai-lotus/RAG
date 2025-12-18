# CORS Configuration Guide - SUPPORT MODE vs CHAT MODE

## 📋 Overview

המערכת תומכת בשני מצבים עיקריים עם הגדרות CORS שונות:

1. **SUPPORT MODE** - `/api/devlab/support`, `/api/assessment/support`
2. **CHAT MODE** - `/api/v1/query`

## 🔍 ההבדלים

### SUPPORT MODE
- ✅ יש middleware מפורש (`supportAuthMiddleware`) שמטפל ב-CORS
- ✅ מאפשר Vercel origins אוטומטית (`*.vercel.app`)
- ✅ תומך ב-`SUPPORT_ALLOWED_ORIGINS` משתנה סביבה
- ✅ מאפשר localhost אוטומטית

### CHAT MODE (לפני התיקון)
- ❌ הסתמך רק על CORS הכללי ב-`index.js`
- ❌ לא היה OPTIONS handler מפורש
- ❌ לא היה CORS headers ב-POST response

### CHAT MODE (אחרי התיקון)
- ✅ יש OPTIONS handler מפורש ב-`query.routes.js`
- ✅ יש CORS headers ב-POST response ב-`query.controller.js`
- ✅ מאפשר Vercel origins אוטומטית (זהה ל-SUPPORT MODE)
- ✅ תומך ב-`ALLOWED_ORIGINS` משתנה סביבה
- ✅ מאפשר localhost אוטומטית

## 🔧 Configuration

### משתנה סביבה: `ALLOWED_ORIGINS`

**למה זה חשוב?**
- אם המיקרוסרוויס שלך **לא** ב-Vercel, צריך להוסיף את ה-domain שלו ל-`ALLOWED_ORIGINS`
- אם המיקרוסרוויס שלך **כן** ב-Vercel (`*.vercel.app`), זה עובד אוטומטית!

**דוגמה ל-Railway:**
```
ALLOWED_ORIGINS=https://learning-analytics-frontend.railway.app,https://course-builder-frontend.railway.app
```

**דוגמה ל-custom domains:**
```
ALLOWED_ORIGINS=https://chatbot.example.com,https://app.example.com
```

### משתנה סביבה: `SUPPORT_ALLOWED_ORIGINS`

**למה זה חשוב?**
- רק עבור SUPPORT MODE (`/api/devlab/support`, `/api/assessment/support`)
- אם לא מוגדר, מאפשר כל origin (backward compatibility)
- אם מוגדר, רק origins ברשימה מורשים

**דוגמה:**
```
SUPPORT_ALLOWED_ORIGINS=https://dev-lab-frontend.vercel.app,https://assessment-frontend.vercel.app
```

## ✅ מה עובד אוטומטית (ללא הגדרה)

### Vercel Deployments
כל domain שמתחיל ב-`https://` ומסתיים ב-`.vercel.app` עובד אוטומטית:
- ✅ `https://learning-analytics-frontend.vercel.app`
- ✅ `https://course-builder-git-main.vercel.app`
- ✅ `https://any-preview-url.vercel.app`

### Localhost (Development)
כל origin שמכיל `localhost` או `127.0.0.1` עובד אוטומטית:
- ✅ `http://localhost:3000`
- ✅ `http://localhost:5173`
- ✅ `http://127.0.0.1:8080`

## 📝 Checklist למיקרוסרוויס חדש

### אם המיקרוסרוויס ב-Vercel:
- ✅ **אין צורך** להגדיר `ALLOWED_ORIGINS`
- ✅ הכל עובד אוטומטית!

### אם המיקרוסרוויס לא ב-Vercel (Railway, custom domain, וכו'):
- ✅ **צריך** להגדיר `ALLOWED_ORIGINS` ב-Railway של RAG backend
- ✅ להוסיף את ה-frontend URL של המיקרוסרוויס

### אם המיקרוסרוויס משתמש ב-SUPPORT MODE:
- ✅ **אופציונלי** להגדיר `SUPPORT_ALLOWED_ORIGINS` (אם רוצים הגבלה מפורשת)
- ✅ אם לא מוגדר, מאפשר כל origin

## 🔍 Debugging

### בדיקת CORS ב-Console:
```javascript
// בדוק את ה-origin שנשלח
console.log('Origin:', window.location.origin);

// בדוק את ה-response headers
fetch('https://rag-backend.com/api/v1/query', {
  method: 'OPTIONS',
  headers: {
    'Origin': window.location.origin
  }
}).then(r => {
  console.log('CORS Headers:', {
    'Access-Control-Allow-Origin': r.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': r.headers.get('Access-Control-Allow-Methods'),
    'Access-Control-Allow-Credentials': r.headers.get('Access-Control-Allow-Credentials')
  });
});
```

### בדיקת Logs ב-Railway:
חפש הודעות כמו:
- `[CORS] Allowed Vercel deployment: ...`
- `[CORS] Allowed from env: ...`
- `[CORS] BLOCKED origin: ...`

## 📚 סיכום

| Feature | SUPPORT MODE | CHAT MODE |
|---------|-------------|-----------|
| Vercel auto-allow | ✅ | ✅ |
| Localhost auto-allow | ✅ | ✅ |
| `ALLOWED_ORIGINS` support | ❌ (לא רלוונטי) | ✅ |
| `SUPPORT_ALLOWED_ORIGINS` support | ✅ | ❌ (לא רלוונטי) |
| OPTIONS handler | ✅ | ✅ (אחרי תיקון) |
| CORS headers in POST | ✅ | ✅ (אחרי תיקון) |

**המסקנה:** אחרי התיקון, CHAT MODE ו-SUPPORT MODE עובדים באותה צורה מבחינת CORS!



