# Railway Deployment Setup

## הגדרת Migrations אוטומטית ב-Railway

### אפשרות 1: אוטומטי (מומלץ) ✅

הפרויקט מוגדר כך ש-Railway יריץ migrations אוטומטית לפני הפעלת השרת.

**איך זה עובד:**
- `BACKEND/package.json` → `start` script משתמש ב-`scripts/migrate-and-start.js`
- הסקריפט מריץ `prisma migrate deploy` לפני הפעלת השרת
- זה קורה אוטומטית בכל deployment

**מה צריך לוודא ב-Railway:**
1. ✅ Environment Variable `DATABASE_URL` מוגדר
2. ✅ Build Command: `npm install && npm run db:generate`
3. ✅ Start Command: `npm run start` (כבר מוגדר ב-railway.json)

### אפשרות 2: PostDeploy Hook (אלטרנטיבה)

אם אתה רוצה להריץ migrations בנפרד, תוכל להוסיף Railway PostDeploy Hook:

1. ב-Railway Dashboard → Service → Settings → Add Hook
2. Type: `Post Deploy`
3. Command: 
   ```bash
   npx prisma migrate deploy --schema=./DATABASE/prisma/schema.prisma
   ```

### אפשרות 3: הרצה ידנית

אם אתה רוצה להריץ migrations ידנית:

```bash
# התחבר ל-Railway CLI
railway login

# התחבר לפרויקט
railway link

# הרץ migrations
railway run npm run db:migrate:deploy
```

## הגדרת Environment Variables ב-Railway

ודא שיש לך את המשתנים הבאים ב-Railway:

### חובה:
- `DATABASE_URL` - Connection string ל-Supabase/PostgreSQL

### אופציונלי:
- `REDIS_URL` - אם אתה משתמש ב-Redis (אחרת התוסף יתעלם)
- `OPENAI_API_KEY` - אם אתה משתמש ב-OpenAI
- `NODE_ENV=production` - להגדרת סביבת production

## התהליך המלא

1. **Push לקוד:**
   ```bash
   git push origin main
   ```

2. **Railway יבצע:**
   - Build: `npm install && npm run db:generate`
   - Deploy: `npm run start` → זה יריץ migrations אוטומטית
   - Start: השרת יתחיל

3. **בדיקה:**
   - בדוק את ה-Logs ב-Railway - אתה אמור לראות:
     ```
     [INFO] Running database migrations...
     [INFO] Attempting to deploy existing migrations...
     [INFO] Migrations deployed successfully
     [INFO] Starting server...
     ```

## פתרון בעיות

### אם הטבלאות לא נוצרות:

1. **בדוק את ה-Logs:**
   - חפש שגיאות ב-migration
   - ודא ש-`DATABASE_URL` נכון

2. **הרץ migrations ידנית:**
   ```bash
   railway run npm run db:migrate:deploy
   ```

3. **אם יש בעיות ב-pgvector:**
   - ודא ש-pgvector extension מופעל ב-Supabase
   - הרץ ב-Supabase SQL Editor:
     ```sql
     CREATE EXTENSION IF NOT EXISTS vector;
     ```

### אם השרת לא מתחיל:

1. בדוק שה-Build Command כולל `npm run db:generate`
2. בדוק שה-Start Command הוא `npm run start` (לא `npm start:only`)
3. בדוק את ה-Logs לכל שגיאות

## טיפים

- ✅ השתמש ב-`migrate deploy` ב-production (לא `migrate dev`)
- ✅ ודא ש-migrations נוצרו מקומית לפני push
- ✅ תמיד בדוק את ה-Logs אחרי deployment

---

**לסיכום:** ב-Railway, אם `start` script משתמש ב-`migrate-and-start.js`, ה-migrations ירוצו **אוטומטית** בכל deployment. אין צורך להריץ ידנית!

