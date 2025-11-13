# הגדרת CORS

## הבעיה

שגיאת CORS מתרחשת כאשר ה-frontend (Vercel) מנסה לגשת ל-backend (Railway), אבל ה-backend לא מאפשר את ה-origin של Vercel.

## הפתרון

ה-backend תומך כעת ב-multiple origins. צריך רק להגדיר את ה-URL של Vercel.

---

## הגדרה ב-Railway

### שלב 1: הוסף משתנה סביבה

1. **Railway Dashboard** → **Service שלך** (Backend)
2. **Variables** tab
3. לחץ **+ New Variable**
4. הוסף:
   ```
   Name: FRONTEND_VERCEL_URL
   Value: https://rag-microservice-psi.vercel.app
   ```
   (החלף ב-URL האמיתי של ה-frontend שלך ב-Vercel)

### שלב 2: בדוק את ה-Logs

לאחר ה-redeploy, בדוק את ה-logs:
```
CORS allowed origins: http://localhost:5173, https://rag-microservice-psi.vercel.app
```

---

## משתני סביבה

### משתנים אופציונליים:

1. **`FRONTEND_URL`** - Frontend URL (localhost או אחר)
   ```env
   FRONTEND_URL=http://localhost:5173
   ```

2. **`FRONTEND_VERCEL_URL`** - Vercel production URL (חובה ל-production)
   ```env
   FRONTEND_VERCEL_URL=https://rag-microservice-psi.vercel.app
   ```

3. **`VERCEL_URL`** - Vercel URL (אוטומטי ב-Vercel, לא נדרש ב-Railway)

---

## Origins שמותרים כברירת מחדל

ה-backend מאפשר כברירת מחדל:
- `http://localhost:5173` - Vite dev server
- `http://localhost:3000` - React dev server
- `http://localhost:5174` - Vite alt port

---

## דוגמאות

### Development (Local)
```env
FRONTEND_URL=http://localhost:5173
```

### Production (Vercel)
```env
FRONTEND_VERCEL_URL=https://rag-microservice-psi.vercel.app
```

### Both (Development + Production)
```env
FRONTEND_URL=http://localhost:5173
FRONTEND_VERCEL_URL=https://rag-microservice-psi.vercel.app
```

---

## בדיקה

### בדוק ב-Browser Console:
1. פתח את ה-frontend ב-Vercel
2. פתח DevTools (F12)
3. בדוק את ה-Network tab
4. אם יש שגיאת CORS → בדוק את ה-logs ב-Railway

### בדוק ב-Railway Logs:
חפש:
```
CORS blocked origin: https://rag-microservice-psi.vercel.app
Allowed origins: http://localhost:5173
```

אם רואה את זה → הוסף `FRONTEND_VERCEL_URL` ב-Railway.

---

## פתרון בעיות

### בעיה: עדיין רואה שגיאת CORS
**פתרון:**
1. ודא ש-`FRONTEND_VERCEL_URL` מוגדר נכון ב-Railway
2. ודא שה-URL זהה בדיוק (כולל `https://`)
3. Redeploy את ה-backend
4. בדוק את ה-logs - אמור לראות את ה-origin ברשימה

### בעיה: לא יודע מה ה-URL של Vercel
**פתרון:**
1. Vercel Dashboard → Project
2. **Settings** → **Domains**
3. העתק את ה-URL (למשל: `rag-microservice-psi.vercel.app`)
4. הוסף `https://` לפני: `https://rag-microservice-psi.vercel.app`

### בעיה: רוצה לאפשר כל ה-origins (לא מומלץ ל-production)
**פתרון:**
שנה את `BACKEND/src/index.js`:
```javascript
origin: true, // Allow all origins (NOT recommended for production)
```

---

## אבטחה

⚠️ **חשוב:**
- אל תאפשר כל ה-origins ב-production
- השתמש ב-`FRONTEND_VERCEL_URL` רק ל-production
- בדוק את ה-logs כדי לראות אילו origins נחסמו

---

## סיכום

**להפעיל CORS ל-Vercel:**
1. Railway Dashboard → Service → Variables
2. הוסף: `FRONTEND_VERCEL_URL=https://your-vercel-app.vercel.app`
3. Redeploy

**הכל!** 🎉

