# הגדרת Frontend ל-Production

## הגדרת API URL ל-Production

ב-production, ה-frontend צריך לדעת מה ה-URL של ה-backend (Railway).

### שלב 1: קבל את ה-URL של השרת ב-Railway

1. לך ל-**Railway Dashboard**
2. בחר את ה-**Backend Service**
3. העתק את ה-URL (לדוגמה: `https://ragmicroservice-production.up.railway.app`)

### שלב 2: הגדר ב-Vercel (או איפה שה-frontend רץ)

#### אופציה A: דרך Vercel Dashboard

1. לך ל-**Vercel Dashboard** → **Project** → **Settings** → **Environment Variables**
2. הוסף משתנה סביבה:
   - **Name:** `VITE_API_BASE_URL`
   - **Value:** `https://ragmicroservice-production.up.railway.app` (ה-URL מ-Railway)
   - **Environment:** Production (ו-Staging אם יש)
3. **Save**

#### אופציה B: דרך Vercel CLI

```bash
vercel env add VITE_API_BASE_URL production
# Enter: https://ragmicroservice-production.up.railway.app
```

#### אופציה C: דרך GitHub Secrets (אם יש CI/CD)

1. GitHub → Repository → **Settings** → **Secrets and variables** → **Actions**
2. הוסף secret:
   - **Name:** `VITE_API_BASE_URL`
   - **Value:** `https://ragmicroservice-production.up.railway.app`

### שלב 3: Rebuild את ה-Frontend

אחרי הוספת משתנה הסביבה:

```bash
# ב-Vercel - זה קורה אוטומטית אחרי push
# או דרך Vercel Dashboard → Deployments → Redeploy
```

## הגדרת CORS ב-Backend

ודא שה-backend מאפשר את ה-frontend URL:

### ב-Railway (Backend Service):

1. **Railway Dashboard** → **Backend Service** → **Variables**
2. הוסף/עדכן:
   - **Name:** `FRONTEND_VERCEL_URL`
   - **Value:** `https://your-vercel-app.vercel.app` (ה-URL של ה-frontend ב-Vercel)
3. **Save** (Railway י-redploy אוטומטית)

## בדיקה

### 1. בדוק שה-Environment Variable מוגדר

ב-Vercel:
- Settings → Environment Variables → ודא ש-`VITE_API_BASE_URL` קיים

### 2. בדוק את ה-Build

אחרי rebuild, בדוק ב-Console של הדפדפן:
- הבקשות צריכות ללכת ל-`https://ragmicroservice-production.up.railway.app/api/v1/query`
- לא ל-`localhost:8080` או `localhost:3000`

### 3. בדוק CORS

אם יש שגיאת CORS:
- ודא ש-`FRONTEND_VERCEL_URL` מוגדר ב-Railway
- ודא שה-URL תואם בדיוק (כולל `https://`)

## סיכום - משתני סביבה נדרשים

### ב-Vercel (Frontend):
```env
VITE_API_BASE_URL=https://ragmicroservice-production.up.railway.app
```

### ב-Railway (Backend):
```env
FRONTEND_VERCEL_URL=https://your-vercel-app.vercel.app
```

## פתרון בעיות

### "Failed to load resource: 404"
- **סיבה:** `VITE_API_BASE_URL` לא מוגדר או שגוי
- **פתרון:** ודא שה-URL נכון ב-Vercel Environment Variables

### "ERR_CONNECTION_REFUSED"
- **סיבה:** ה-URL לא נכון או השרת לא רץ
- **פתרון:** בדוק שה-URL ב-`VITE_API_BASE_URL` תואם ל-URL ב-Railway

### "CORS error"
- **סיבה:** `FRONTEND_VERCEL_URL` לא מוגדר ב-Railway
- **פתרון:** הוסף את ה-frontend URL ל-Railway Variables

