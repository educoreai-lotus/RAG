# משתני סביבה להטמעת CHATBOT - Railway ו-Vercel

## סקירה כללית

כדי להטמיע את ה-CHATBOT, צריך להגדיר משתני סביבה ב-**Railway** (Backend) וב-**Vercel** (Frontend).

---

## 🚂 Railway (Backend) - משתנים נדרשים

### משתנים חובה (Required)

#### 1. `SUPPORT_MODE_ENABLED`
**תיאור:** מפעיל את מצב התמיכה (Support Mode) של ה-CHATBOT  
**ערך:** `true`  
**איפה להגדיר:** Railway Dashboard → Service → Variables

```env
SUPPORT_MODE_ENABLED=true
```

**⚠️ חשוב:** ללא משתנה זה, ה-CHATBOT לא יעבוד!  
**שגיאה שתראה אם חסר:** `"Support mode is disabled"`

---

#### 2. `DATABASE_URL`
**תיאור:** כתובת חיבור ל-Supabase/PostgreSQL  
**פורמט:** `postgresql://user:password@host:port/database?sslmode=require`

```env
DATABASE_URL=postgresql://postgres.xxxxx:5432/postgres?sslmode=require
```

---

### משתנים אופציונליים (אבל מומלצים)

#### 3. `SUPPORT_ALLOWED_ORIGINS`
**תיאור:** רשימת כתובות מותרות לשימוש ב-Support Mode (אבטחה)  
**פורמט:** רשימה מופרדת בפסיקים  
**דוגמה:**

```env
SUPPORT_ALLOWED_ORIGINS=https://assessment.educore.com,https://devlab.educore.com,https://your-frontend.vercel.app
```

**למה זה חשוב?**  
- מונע גישה לא מורשית ל-endpoints של Support Mode
- אם לא מוגדר, כל origin מותר (פחות מאובטח)

---

#### 4. `SUPPORT_SHARED_SECRET`
**תיאור:** סוד משותף לאבטחה נוספת (אופציונלי)  
**דוגמה:**

```env
SUPPORT_SHARED_SECRET=your-secret-key-here
```

**למה זה חשוב?**  
- אם מוגדר, כל בקשה חייבת לכלול header: `X-Embed-Secret: your-secret-key-here`
- מונע שימוש לא מורשה ב-CHATBOT

---

#### 5. `FRONTEND_URL` או `FRONTEND_VERCEL_URL`
**תיאור:** כתובת ה-Frontend (ל-CORS)  
**דוגמה:**

```env
FRONTEND_VERCEL_URL=https://rag-git-main-educoreai-lotus.vercel.app
```

או:

```env
FRONTEND_URL=https://your-frontend-domain.com
```

**למה זה חשוב?**  
- מאפשר ל-Frontend לעשות בקשות ל-Backend (CORS)
- ללא זה, תקבל שגיאות CORS בדפדפן

---

#### 6. `ALLOW_ALL_VERCEL`
**תיאור:** מאפשר כל deployment של Vercel (לפיתוח/בדיקות)  
**ערך:** `true` (או לא מוגדר)  
**דוגמה:**

```env
ALLOW_ALL_VERCEL=true
```

**⚠️ שימוש:** רק לפיתוח/בדיקות. ב-Production עדיף להשתמש ב-`SUPPORT_ALLOWED_ORIGINS`.

---

### משתנים נוספים (אופציונליים)

#### 7. `OPENAI_API_KEY`
**תיאור:** מפתח API של OpenAI (אם משתמשים ב-embeddings/LLM)  
**דוגמה:**

```env
OPENAI_API_KEY=sk-...
```

---

#### 8. `PORT`
**תיאור:** Port של השרת  
**הערה:** Railway בדרך כלל מגדיר את זה אוטומטית, לא צריך להגדיר ידנית

```env
PORT=3000
```

---

#### 9. `NODE_ENV`
**תיאור:** סביבת הרצה  
**ערך:** `production` (ב-Railway)

```env
NODE_ENV=production
```

---

## ▲ Vercel (Frontend) - משתנים נדרשים

### משתנה חובה

#### 1. `VITE_API_BASE_URL`
**תיאור:** כתובת ה-Backend ב-Railway  
**פורמט:** URL מלא של Railway service

```env
VITE_API_BASE_URL=https://rag-production-3a4c.up.railway.app
```

**⚠️ חשוב:**  
- זה ה-URL של ה-**Backend** (Railway), לא ה-Frontend!
- ה-CHATBOT script נטען מה-Backend: `https://your-railway-url/embed/bot.js`

---

## 📋 סיכום - רשימת משתנים

### Railway (Backend) - רשימה מלאה

```env
# חובה
SUPPORT_MODE_ENABLED=true
DATABASE_URL=postgresql://...

# מומלץ (אבטחה)
SUPPORT_ALLOWED_ORIGINS=https://assessment.educore.com,https://devlab.educore.com
SUPPORT_SHARED_SECRET=your-secret-key

# CORS
FRONTEND_VERCEL_URL=https://your-frontend.vercel.app
# או
ALLOW_ALL_VERCEL=true  # רק לפיתוח

# אופציונלי
OPENAI_API_KEY=sk-...
NODE_ENV=production
PORT=3000  # Railway מגדיר אוטומטית
```

---

### Vercel (Frontend) - רשימה מלאה

```env
# חובה
VITE_API_BASE_URL=https://rag-production-3a4c.up.railway.app
```

---

## 🔧 איך להגדיר ב-Railway

### שלב 1: פתח את Railway Dashboard
1. לך ל-[railway.app](https://railway.app)
2. בחר את ה-Service שלך (RAG Backend)

### שלב 2: הוסף משתנים
1. לחץ על **Variables** בתפריט
2. לחץ על **+ New Variable**
3. הוסף כל משתנה:

```
Name: SUPPORT_MODE_ENABLED
Value: true
```

4. חזור על זה לכל המשתנים

### שלב 3: Redeploy
- Railway יבצע redeploy אוטומטית אחרי שינוי משתנים
- או לחץ על **Redeploy** ידנית

---

## 🔧 איך להגדיר ב-Vercel

### שלב 1: פתח את Vercel Dashboard
1. לך ל-[vercel.com](https://vercel.com)
2. בחר את ה-Project שלך (RAG Frontend)

### שלב 2: הוסף משתנים
1. לך ל-**Settings** → **Environment Variables**
2. לחץ על **Add New**
3. הוסף:

```
Name: VITE_API_BASE_URL
Value: https://rag-production-3a4c.up.railway.app
Environment: Production (וגם Preview/Development אם צריך)
```

### שלב 3: Redeploy
1. לך ל-**Deployments**
2. לחץ על **...** → **Redeploy**
3. או push שינוי ל-GitHub (Vercel יבצע deploy אוטומטית)

---

## ✅ בדיקה שהכל עובד

### 1. בדוק שה-Backend רץ
```bash
curl https://rag-production-3a4c.up.railway.app/health
```

צריך לקבל:
```json
{
  "status": "ok",
  "service": "rag-microservice"
}
```

---

### 2. בדוק ש-Support Mode מופעל
```bash
curl -X POST https://rag-production-3a4c.up.railway.app/api/assessment/support \
  -H "Content-Type: application/json" \
  -H "Origin: https://your-frontend.vercel.app" \
  -d '{"query": "test"}'
```

**אם `SUPPORT_MODE_ENABLED=true`:**  
✅ תקבל תשובה (או שגיאה אחרת, אבל לא "Support mode is disabled")

**אם `SUPPORT_MODE_ENABLED` לא מוגדר או `false`:**  
❌ תקבל: `{"error": "Forbidden", "message": "Support mode is disabled"}`

---

### 3. בדוק שה-CHATBOT script נטען
פתח את ה-Console בדפדפן ובדוק:

```javascript
// בדוק שה-script נטען
fetch('https://rag-production-3a4c.up.railway.app/embed/bot.js')
  .then(r => r.text())
  .then(console.log)
  .catch(console.error)
```

צריך לקבל קוד JavaScript (לא 404).

---

### 4. בדוק CORS
פתח את ה-Console בדפדפן מה-Frontend:

```javascript
fetch('https://rag-production-3a4c.up.railway.app/health', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

**אם CORS מוגדר נכון:**  
✅ תקבל תשובה (ללא שגיאת CORS)

**אם CORS לא מוגדר:**  
❌ תקבל: `Access to fetch ... has been blocked by CORS policy`

---

## 🐛 פתרון בעיות

### בעיה: "Support mode is disabled"
**פתרון:**
1. בדוק ב-Railway ש-`SUPPORT_MODE_ENABLED=true`
2. ודא שעשית Redeploy אחרי הוספת המשתנה
3. בדוק את ה-logs ב-Railway

---

### בעיה: שגיאת CORS
**פתרון:**
1. הוסף `FRONTEND_VERCEL_URL` ב-Railway עם ה-URL המדויק של Vercel
2. או הוסף `ALLOW_ALL_VERCEL=true` (רק לפיתוח)
3. ודא שה-URL מדויק (עם `https://`, ללא slash בסוף)
4. Redeploy את ה-Backend

---

### בעיה: "Origin not allowed for support mode"
**פתרון:**
1. הוסף את ה-origin ל-`SUPPORT_ALLOWED_ORIGINS` ב-Railway
2. פורמט: `https://domain1.com,https://domain2.com` (מופרד בפסיקים)
3. Redeploy

---

### בעיה: ה-CHATBOT לא נטען
**פתרון:**
1. בדוק ש-`VITE_API_BASE_URL` מוגדר נכון ב-Vercel
2. ודא שה-URL הוא של ה-**Backend** (Railway), לא Frontend
3. בדוק שה-script path נכון: `https://your-railway-url/embed/bot.js`
4. בדוק את ה-Console בדפדפן לשגיאות

---

## 📝 דוגמה מלאה

### Railway Variables:
```
SUPPORT_MODE_ENABLED=true
DATABASE_URL=postgresql://postgres.xxxxx:5432/postgres?sslmode=require
SUPPORT_ALLOWED_ORIGINS=https://assessment.educore.com,https://devlab.educore.com
FRONTEND_VERCEL_URL=https://rag-git-main-educoreai-lotus.vercel.app
OPENAI_API_KEY=sk-...
NODE_ENV=production
```

### Vercel Variables:
```
VITE_API_BASE_URL=https://rag-production-3a4c.up.railway.app
```

---

## 🔗 קישורים שימושיים

- [מדריך הטמעת CHATBOT](./DATABASE/CHATBOT_SCRIPT_INTEGRATION_GUIDE.md)
- [תיקון חיבור Frontend ל-Backend](./FRONTEND/API_CONNECTION_FIX.md)
- [הגדרת Railway](./BACKEND/RAILWAY_DEPLOYMENT_FIX.md)

---

**שאלות?** בדוק את ה-logs ב-Railway או Vercel, או עיין במדריכי Troubleshooting.

