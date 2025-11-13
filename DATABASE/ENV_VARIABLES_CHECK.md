# Environment Variables Check for Railway + Supabase

## משתני סביבה נדרשים:

### 1. DATABASE_URL (חובה) ✅
**פורמט נכון ל-Supabase:**
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
```

**או direct connection:**
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require
```

**חשוב:**
- ✅ חייב לכלול `?sslmode=require` בסוף
- ✅ Port 6543 = connection pooling (מומלץ)
- ✅ Port 5432 = direct connection
- ❌ **אם חסר `sslmode=require` - החיבור יכשל!**

### 2. NODE_ENV (אופציונלי)
```
NODE_ENV=production
```

### 3. OPENAI_API_KEY (אופציונלי אבל מומלץ)
```
OPENAI_API_KEY=sk-...
```

### 4. REDIS_URL (אופציונלי)
```
REDIS_URL=redis://...
```

### 5. FRONTEND_VERCEL_URL (אופציונלי)
```
FRONTEND_VERCEL_URL=https://...
```

## בדיקת DATABASE_URL:

### איך לבדוק אם DATABASE_URL תקין:

1. **ב-Railway:**
   - לך ל-Environment Variables
   - בדוק את DATABASE_URL
   - ודא שיש `?sslmode=require` בסוף

2. **פורמט נכון:**
   ```
   postgresql://postgres.xxxxx:password@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require
   ```

3. **פורמט שגוי (חסר sslmode):**
   ```
   postgresql://postgres.xxxxx:password@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres
   ```
   ❌ זה יגרום ל-timeout או connection errors!

## איך לתקן:

### אופציה 1: ב-Railway Dashboard
1. לך ל-Environment Variables
2. ערוך את DATABASE_URL
3. ודא שיש `?sslmode=require` בסוף
4. שמור

### אופציה 2: מ-Supabase
1. לך ל-Supabase Dashboard → Settings → Database
2. Copy "Connection string" → "URI"
3. ודא שיש `?sslmode=require` בסוף
4. העתק ל-Railway

## בדיקת חיבור:

אם DATABASE_URL תקין, נסה:

```bash
railway run cd BACKEND && npx prisma db pull --schema=../DATABASE/prisma/schema.prisma
```

אם זה עובד - החיבור תקין.
אם זה נכשל - יש בעיה ב-DATABASE_URL.

## שגיאות נפוצות:

### "ETIMEDOUT"
- **סיבה:** DATABASE_URL לא תקין או חסר sslmode
- **פתרון:** הוסף `?sslmode=require` ל-DATABASE_URL

### "ECONNREFUSED"
- **סיבה:** כתובת או port שגויים
- **פתרון:** בדוק את DATABASE_URL מ-Supabase

### "password authentication failed"
- **סיבה:** סיסמה שגויה
- **פתרון:** קבל DATABASE_URL חדש מ-Supabase

### "extension vector does not exist"
- **סיבה:** pgvector לא מופעל
- **פתרון:** הרץ ב-Supabase SQL Editor: `CREATE EXTENSION IF NOT EXISTS vector;`

