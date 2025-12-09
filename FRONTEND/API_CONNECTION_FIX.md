# תיקון חיבור Frontend ל-Backend

## הבעיה

השגיאות:
```
Failed to load resource: the server responded with a status of 404
ERR_CONNECTION_REFUSED
RAG API error
```

**סיבה:** ה-frontend מנסה להתחבר ל-`http://localhost:3000` אבל השרת רץ על port `8080` (או על Railway).

## פתרון

### אופציה 1: פיתוח מקומי (Localhost)

אם אתה מריץ את השרת מקומית על port 8080:

1. **צור קובץ `.env.local` ב-FRONTEND:**
```bash
cd FRONTEND
```

2. **צור את הקובץ:**
```env
VITE_API_BASE_URL=http://localhost:8080
```

3. **הפעל מחדש את ה-frontend dev server:**
```bash
npm run dev
```

**חשוב:** Vite קורא את משתני הסביבה רק בעת ה-build/start, אז צריך להפעיל מחדש!

### אופציה 2: Railway (Production)

אם השרת רץ על Railway:

1. **קבל את ה-URL של השרת מ-Railway:**
   - לך ל-Railway Dashboard
   - בחר את ה-Service
   - העתק את ה-URL (לדוגמה: `https://rag-service-production.up.railway.app`)

2. **צור קובץ `.env.production` ב-FRONTEND:**
```env
VITE_API_BASE_URL=https://rag-service-production.up.railway.app
```

3. **בנה את ה-frontend:**
```bash
cd FRONTEND
npm run build
```

### אופציה 3: שינוי Default ב-Code

אם אתה רוצה לשנות את ה-default ב-code:

**ערוך `FRONTEND/src/services/api.js`:**
```javascript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080', // שונה מ-3000 ל-8080
  headers: {
    'Content-Type': 'application/json',
  },
});
```

**ערוך `FRONTEND/src/store/api/ragApi.js`:**
```javascript
const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'; // שונה מ-3000 ל-8080
```

## בדיקה

אחרי התיקון:

1. **הפעל מחדש את ה-frontend dev server**
2. **פתח את ה-Console בדפדפן** (F12)
3. **בדוק שהבקשות הולכות לכתובת הנכונה:**
   - צריך לראות: `http://localhost:8080/api/v1/query` (לא 3000)

## CORS

אם אתה עדיין מקבל שגיאות CORS:

**ב-Railway, הוסף את ה-frontend URL ל-CORS:**
1. Railway Dashboard → Service → Variables
2. הוסף: `FRONTEND_URL=https://your-frontend-url.com`
3. או: `FRONTEND_VERCEL_URL=https://your-vercel-app.vercel.app`

**ב-localhost:**
- CORS כבר מוגדר ל-`http://localhost:3000` ו-`http://localhost:5173`
- אם ה-frontend רץ על port אחר, הוסף אותו ל-`allowedOrigins` ב-`BACKEND/src/index.js`

## סיכום

**לפיתוח מקומי:**
```env
# FRONTEND/.env.local
VITE_API_BASE_URL=http://localhost:8080
```

**ל-Production (Vercel):**
1. Vercel Dashboard → Settings → Environment Variables
2. הוסף: `VITE_API_BASE_URL=https://ragmicroservice-production.up.railway.app`
3. ראה: `FRONTEND/PRODUCTION_SETUP.md` למדריך מפורט

**חשוב:** 
- אחרי שינוי `.env` מקומי, הפעל מחדש את ה-dev server
- ב-Vercel, ה-environment variables נטענים בעת build - צריך rebuild

