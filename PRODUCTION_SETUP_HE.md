# הגדרת Production - AI LEARNER Recommendations

## 🚀 מה צריך לעשות ב-Production:

### 1. **הגדרת Environment Variables**

ב-Railway/Vercel/Heroku, הוסף את ה-Variables הבאים:

```env
AI_LEARNER_API_URL=https://your-ai-learner-service.com
AI_LEARNER_ENABLED=true
```

**או אם יש לך כבר:**
```env
LEARNER_AI_SERVICE_URL=https://your-ai-learner-service.com
```

(הקוד תומך בשניהם)

### 2. **איפה להגדיר:**

#### Railway:
1. פתח Railway Dashboard
2. בחר את ה-Backend service
3. לך ל-**Variables** tab
4. לחץ **+ New Variable**
5. הוסף:
   - Key: `AI_LEARNER_API_URL`
   - Value: `https://your-ai-learner-service.com`
   - Key: `AI_LEARNER_ENABLED`
   - Value: `true`

#### Vercel:
1. פתח Vercel Dashboard
2. בחר את ה-Project
3. Settings → **Environment Variables**
4. הוסף את ה-variables

#### Heroku:
1. פתח Heroku Dashboard
2. Settings → **Config Vars**
3. הוסף את ה-variables

### 3. **התקנת Dependencies:**

ודא ש-`axios` מותקן ב-Backend:
```bash
cd BACKEND
npm install
```

זה יתקין את `axios` שהוספנו.

### 4. **Redeploy:**

אחרי הוספת ה-Variables:
- Railway: יעשה auto-redeploy
- Vercel: צריך לעשות manual redeploy
- Heroku: `git push heroku main`

## 🔍 בדיקות ב-Production:

### בדיקה 1: Logs
פתח את ה-Logs ב-Railway/Vercel וחפש:
- ✅ `"Fetched AI LEARNER recommendations"` - הצליח!
- ⚠️ `"AI LEARNER client error"` - יש בעיה, בדוק את ה-URL
- ⚠️ `"Failed to fetch AI LEARNER recommendations"` - נכשל, fallback

### בדיקה 2: Frontend
1. פתח את ה-Chat Widget
2. פתח DevTools (F12)
3. לך ל-Network tab
4. חפש קריאה ל: `/api/v1/personalized/recommendations/:userId`
5. בדוק את ה-response - צריך להכיל recommendations

### בדיקה 3: Console
פתח Console ובדוק:
- אם יש errors
- אם יש "Using fallback recommendations" (זה אומר ש-AI LEARNER לא עובד)

## ⚠️ Troubleshooting:

### Recommendations לא מופיעים:
1. ✅ בדוק שה-`AI_LEARNER_API_URL` מוגדר נכון
2. ✅ בדוק שה-`AI_LEARNER_ENABLED=true`
3. ✅ בדוק את ה-Logs לראות errors
4. ✅ בדוק שה-AI LEARNER service זמין

### Timeout Errors:
- בדוק שה-AI LEARNER service רץ
- בדוק שה-URL נכון
- בדוק network connectivity

### CORS Errors:
- ודא שה-AI LEARNER מאפשר requests מה-Backend
- בדוק CORS configuration ב-AI LEARNER

## 📝 Fallback Behavior:

אם AI LEARNER לא זמין:
- ✅ המערכת תעבור אוטומטית ל-fallback
- ✅ לא תהיה שגיאה - רק warning ב-logs
- ✅ User יראה recommendations רגילות

## 🎯 סיכום:

1. **הוסף Environment Variables** ב-production
2. **התקן dependencies** (`npm install` ב-Backend)
3. **Redeploy** את ה-Backend
4. **בדוק את ה-Logs** לראות אם זה עובד
5. **בדוק ב-Frontend** אם recommendations מופיעים

אם יש בעיה, שלח את ה-Logs ואני אעזור!



