# תיקון CORS ב-Railway

## הבעיה

אתה רואה שגיאת CORS:
```
Access to fetch at 'https://rag-production-3a4c.up.railway.app/api/v1/query' 
from origin 'https://rag-git-main-educoreai-lotus.vercel.app' 
has been blocked by CORS policy
```

## הפתרון

### אופציה 1: הוסף FRONTEND_VERCEL_URL (מומלץ)

1. לך ל-**Railway Dashboard** → הפרויקט שלך → **Variables**
2. לחץ על **+ New Variable**
3. הוסף:
   - **Name:** `FRONTEND_VERCEL_URL`
   - **Value:** `https://rag-git-main-educoreai-lotus.vercel.app`
4. לחץ **Save**
5. השרת יתחיל מחדש אוטומטית

### אופציה 2: השתמש ב-ALLOW_ALL_VERCEL (לפיתוח/בדיקות)

אם יש לך כמה Vercel deployments או שאתה רוצה לאפשר את כולם:

1. לך ל-**Railway Dashboard** → הפרויקט שלך → **Variables**
2. לחץ על **+ New Variable**
3. הוסף:
   - **Name:** `ALLOW_ALL_VERCEL`
   - **Value:** `true`
4. לחץ **Save**
5. השרת יתחיל מחדש אוטומטית

**⚠️ שימוש:** רק לפיתוח/בדיקות. ב-Production עדיף להשתמש ב-`FRONTEND_VERCEL_URL` עם URL ספציפי.

## איך לבדוק שהתיקון עבד

1. **בדוק את הלוגים ב-Railway:**
   - לך ל-**Deployments** → **Latest** → **View Logs**
   - חפש את השורה: `CORS allowed origins: ...`
   - ודא שה-URL שלך מופיע ברשימה

2. **בדוק את הדפדפן:**
   - רענן את הדף ב-Vercel
   - בדוק את ה-Console - לא אמורות להיות עוד שגיאות CORS
   - בדוק את ה-Network tab - הבקשות אמורות לעבור

## אם זה עדיין לא עובד

### בדוק את ה-URL המדויק

1. פתח את ה-Console בדפדפן
2. חפש את השגיאה - היא תציג את ה-origin המדויק
3. ודא שה-URL ב-`FRONTEND_VERCEL_URL` **זהה בדיוק** ל-origin בשגיאה

**דוגמה:**
- אם השגיאה אומרת: `from origin 'https://rag-git-main-educoreai-lotus.vercel.app'`
- אז `FRONTEND_VERCEL_URL` צריך להיות: `https://rag-git-main-educoreai-lotus.vercel.app`
- **לא** `https://rag-git-main-educoreai-lotus.vercel.app/` (ללא `/` בסוף!)

### בדוק שהשרת רץ

1. לך ל-**Railway Dashboard** → **Deployments** → **Latest**
2. ודא שהסטטוס הוא **Active** (ירוק)
3. בדוק את הלוגים - אמור להיות: `✅ Server running on 0.0.0.0:8080`

### בדוק את Health Check

פתח בדפדפן:
```
https://rag-production-3a4c.up.railway.app/health
```

אמור להחזיר:
```json
{"status":"ok"}
```

אם זה לא עובד, השרת לא רץ או יש בעיה אחרת.

## משתני סביבה מומלצים ל-Production

```env
FRONTEND_VERCEL_URL=https://rag-git-main-educoreai-lotus.vercel.app
DATABASE_URL=postgresql://...?sslmode=require&pgbouncer=true
RUN_EMBEDDINGS_ON_STARTUP=true
NODE_ENV=production
```

## קישורים שימושיים

- [Railway Dashboard](https://railway.app)
- [Vercel Dashboard](https://vercel.com)
- קובץ התיעוד המלא: `BACKEND/CORS_FIX_INSTRUCTIONS.md`


