# Test Database Connection

## בדיקה מהירה:

### 1. בדוק DATABASE_URL ב-Railway
- ודא שיש `?sslmode=require` בסוף
- ודא שהפורמט נכון

### 2. נסה חיבור ידני
```bash
railway run cd BACKEND && npx prisma db pull --schema=../DATABASE/prisma/schema.prisma
```

### 3. אם זה לא עובד, נסה direct connection
שנה את DATABASE_URL מ-port 6543 ל-5432:
```
postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:5432/postgres?sslmode=require
```

## פתרון מהיר:

אם DATABASE_URL חסר `?sslmode=require`:
1. לך ל-Railway → Environment Variables
2. ערוך DATABASE_URL
3. הוסף `?sslmode=require` בסוף (אם חסר)
4. שמור
5. Redeploy

