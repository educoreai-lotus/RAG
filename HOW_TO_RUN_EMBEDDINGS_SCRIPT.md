# איך להריץ את סקריפט ה-Embeddings

## שיטה 1: דרך Railway CLI (מקומי)

### שלב 1: התקן Railway CLI

```bash
npm install -g @railway/cli
```

### שלב 2: התחבר ל-Railway

```bash
railway login
```

זה יפתח דפדפן להתחברות.

### שלב 3: קשר את הפרויקט

```bash
railway link
```

בחר את הפרויקט RAG שלך.

### שלב 4: הרץ את הסקריפט

```bash
railway run npm run create:embeddings
```

---

## שיטה 2: דרך Railway Dashboard (מומלץ - הכי קל!)

### שלב 1: פתח Railway Dashboard

1. לך ל: https://railway.app
2. התחבר לחשבון שלך
3. בחר את הפרויקט RAG

### שלב 2: פתח Shell

1. לחץ על **Deployments** (בתפריט השמאלי)
2. בחר את ה-deployment האחרון
3. לחץ על **View Logs**
4. לחץ על **Shell** (או **Terminal**) - כפתור בצד ימין

### שלב 3: הרץ את הסקריפט

```bash
cd /app
npm run create:embeddings
```

---

## מה הסקריפט עושה?

1. ✅ יוצר embeddings אמיתיים עם OpenAI API
2. ✅ בודק שהממדים נכונים (1536)
3. ✅ מכניס את כל המידע ל-Supabase
4. ✅ כולל את "Eden Levi" וכל שאר המידע

---

## מה תראה אחרי הרצה מוצלחת?

```
🚀 Starting embedding creation and insertion...

✅ Tenant: default.local (uuid)

📊 Existing records: 3

✅ Microservice for guide: content
✅ Microservice for assessment: assessment
...

[8/9] Processing: user:manager-001 (user_profile)
   ✅ Inserted: user:manager-001 (user_profile)
   📦 Microservice: uuid

============================================================
✅ Success: 9
❌ Errors: 0
============================================================

✅ "Eden Levi" verified:
   Name: Eden Levi
   Role: manager
   Embedding dimensions: 1536

📊 Total records now: 12
```

---

## דרישות

- ✅ `OPENAI_API_KEY` מוגדר ב-Railway Variables
- ✅ `DATABASE_URL` מוגדר ב-Railway Variables
- ✅ חיבור ל-Supabase עובד

---

## אם יש שגיאות

### שגיאה: "OpenAI API key not found"
**פתרון:** הוסף `OPENAI_API_KEY` ב-Railway Dashboard > Variables

### שגיאה: "Database connection failed"
**פתרון:** בדוק ש-`DATABASE_URL` מוגדר נכון

### שגיאה: "pgvector extension not found"
**פתרון:** הרץ ב-Supabase SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

**השיטה הכי קלה: דרך Railway Dashboard Shell!**

