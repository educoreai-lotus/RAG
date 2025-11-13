# Railway Build Fix - Instructions

## הבעיה
Railway רץ את ה-Build Command מה-root של הפרויקט, אבל ה-service מוגדר כ-BACKEND. זה גורם לבעיות עם paths.

## הפתרון

### אופציה 1: השתמש ב-railway.json (מומלץ) ✅

ה-`BACKEND/railway.json` כבר מוגדר נכון:
- **Build Command:** `npm install && npm run db:generate` (רץ מה-root)
- **Start Command:** `cd BACKEND && npm run start` (רץ את השרת מ-BACKEND)

### אופציה 2: עדכן ידנית ב-Railway Dashboard

ב-Railway Dashboard → Settings → Build:

1. **Root Directory:** השאר ריק (root של הפרויקט)

2. **Custom Build Command:** 
   ```
   npm install && npm run db:generate
   ```
   (זה רץ מה-root ויש `db:generate` ב-root `package.json`)

3. **Start Command:**
   ```
   cd BACKEND && npm run start
   ```
   (זה רץ את השרת מ-BACKEND)

### אופציה 3: Root Directory = BACKEND

אם אתה רוצה שה-Root Directory יהיה `BACKEND`:

1. **Root Directory:** `BACKEND`

2. **Custom Build Command:**
   ```
   npm install && npm run db:generate
   ```
   אבל אז צריך לשנות את `BACKEND/package.json`:
   ```json
   "db:generate": "prisma generate --schema=./DATABASE/prisma/schema.prisma"
   ```
   (לשנות מ-`../DATABASE` ל-`./DATABASE`)

3. **Start Command:**
   ```
   npm run start
   ```

## מומלץ: אופציה 2 (Root Directory = root, Build מה-root)

זה הכי פשוט כי:
- ✅ `db:generate` כבר קיים ב-root `package.json`
- ✅ Paths נכונים: `./DATABASE/prisma/schema.prisma`
- ✅ רק צריך לשנות את Start Command ל-`cd BACKEND && npm run start`

## צעדים לביצוע ב-Railway Dashboard

1. **לך ל-Settings → Build**
2. **Root Directory:** השאר ריק (root)
3. **Custom Build Command:** `npm install && npm run db:generate`
4. **Start Command:** `cd BACKEND && npm run start`
5. **Save** ו-Redeploy

## מה זה יעשה

1. **Build:**
   - `npm install` - מתקין dependencies מה-root (כולל Prisma)
   - `npm run db:generate` - מריץ `db:generate` מה-root (משתמש ב-`./DATABASE/prisma/schema.prisma`)

2. **Deploy:**
   - `cd BACKEND` - עובר לתיקיית BACKEND
   - `npm run start` - מריץ `start-with-migrations.js` שמריץ migrations ואז את השרת

## אימות

אחרי ה-deployment, בדוק את ה-Logs:

```
[INFO] Running database migrations...
[INFO] Using schema: /app/DATABASE/prisma/schema.prisma
[INFO] Attempting to deploy existing migrations...
[INFO] Migrations deployed successfully
[INFO] Starting server...
```

---

**סיכום:** שנה ב-Railway Dashboard את **Start Command** ל-`cd BACKEND && npm run start` והשאר את ה-Build Command כמו שהוא (`npm install && npm run db:generate`).

