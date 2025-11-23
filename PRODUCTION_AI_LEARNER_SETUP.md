# הגדרת AI LEARNER ב-Production (ענן)

## Environment Variables שצריך להגדיר:

### ב-Backend (Railway/Vercel/Heroku):

```env
# AI LEARNER Microservice Configuration
AI_LEARNER_API_URL=https://your-ai-learner-service.com
AI_LEARNER_ENABLED=true
```

**חשוב:**
- `AI_LEARNER_API_URL` - צריך להיות ה-URL המלא של AI LEARNER microservice ב-production
- `AI_LEARNER_ENABLED` - `true` כדי להפעיל, `false` כדי לבטל (default: true)

## איך להגדיר ב-Railway:

1. **פתח את ה-Railway Dashboard**
2. **בחר את ה-Backend service**
3. **לך ל-Variables tab**
4. **הוסף:**
   - `AI_LEARNER_API_URL` = `https://your-ai-learner-service.com`
   - `AI_LEARNER_ENABLED` = `true`

## איך להגדיר ב-Vercel/Heroku:

1. **פתח את ה-Dashboard**
2. **Settings → Environment Variables**
3. **הוסף את ה-variables**

## בדיקות ב-Production:

### 1. בדוק שה-Environment Variables מוגדרים:
```bash
# ב-Railway - בדוק ב-Logs
# צריך לראות שה-AI_LEARNER_API_URL מוגדר
```

### 2. בדוק שה-Backend יכול לגשת ל-AI LEARNER:
- פתח את ה-Logs ב-Railway
- חפש: "Fetched AI LEARNER recommendations" או "AI LEARNER client error"
- אם יש error → בדוק את ה-URL וה-network connectivity

### 3. בדוק ב-Frontend:
- פתח את ה-Chat Widget
- פתח את ה-Console (F12)
- בדוק ב-Network tab אם יש קריאה ל-`/api/v1/personalized/recommendations/:userId`
- בדוק את ה-response - צריך להכיל recommendations מ-AI LEARNER

## Troubleshooting:

### בעיה: Recommendations לא מופיעים
**פתרונות:**
1. בדוק שה-`AI_LEARNER_API_URL` מוגדר נכון
2. בדוק שה-`AI_LEARNER_ENABLED=true`
3. בדוק את ה-Logs ב-Railway לראות אם יש errors
4. בדוק שה-AI LEARNER service זמין ונגיש

### בעיה: Timeout errors
**פתרונות:**
1. בדוק שה-AI LEARNER service רץ
2. בדוק שה-URL נכון
3. בדוק network connectivity בין ה-services

### בעיה: CORS errors
**פתרונות:**
1. ודא שה-AI LEARNER מאפשר requests מה-Backend
2. בדוק את ה-CORS configuration ב-AI LEARNER

## Fallback Behavior:

אם AI LEARNER לא זמין ב-production:
- ✅ המערכת תעבור אוטומטית ל-fallback recommendations
- ✅ לא תהיה שגיאה - רק warning ב-logs
- ✅ User יראה recommendations רגילות (skill gaps, popular content)

## Logs לבדיקה:

ב-Railway Logs, חפש:
- ✅ `"Fetched AI LEARNER recommendations"` - הצליח
- ⚠️ `"AI LEARNER client error"` - נכשל, fallback
- ⚠️ `"Failed to fetch AI LEARNER recommendations"` - נכשל, fallback

## סיכום:

1. **הגדר Environment Variables** ב-production
2. **ודא שה-AI LEARNER זמין** ונגיש
3. **בדוק את ה-Logs** לראות אם יש errors
4. **בדוק ב-Frontend** אם recommendations מופיעים

אם יש בעיה, שלח את ה-Logs ואני אעזור לפתור!



