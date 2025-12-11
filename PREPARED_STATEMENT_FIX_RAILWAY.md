# תיקון: שגיאת Prepared Statement ב-Railway

## הבעיה

אתה רואה שגיאות כמו:
```
ERROR: prepared statement "s1" already exists
ERROR: prepared statement "s0" already exists
```

זה קורה כשמשתמשים ב-Prisma עם Supabase connection pooler. Prisma משתמש ב-prepared statements כברירת מחדל, אבל Supabase pooler (PgBouncer) לא מתמודד איתם טוב כי חיבורים משותפים.

## הפתרון - עדכון ב-Railway

### שלב 1: פתח את Railway Dashboard

1. לך ל-https://railway.app
2. התחבר לחשבון שלך
3. בחר את הפרויקט שלך

### שלב 2: מצא את משתנה הסביבה DATABASE_URL

1. בפרויקט, לחץ על השירות (Service) שלך
2. לחץ על הכרטיסייה **Variables** (משתנים)
3. מצא את המשתנה `DATABASE_URL`

### שלב 3: עדכן את ה-URL

**לפני העדכון (דוגמה):**
```
postgresql://postgres.xxx:password@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require
```

**אחרי העדכון:**
```
postgresql://postgres.xxx:password@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
```

**חשוב:**
- אם יש כבר `?` ב-URL, הוסף `&pgbouncer=true`
- אם אין `?` ב-URL, הוסף `?pgbouncer=true`

### שלב 4: שמור והפעל מחדש

1. לחץ על **Save** או **Update**
2. Railway יבצע Redeploy אוטומטי
3. או לחץ על **Deploy** → **Redeploy** ידנית

### שלב 5: בדוק את הלוגים

לאחר ה-Redeploy, בדוק את הלוגים:
- ✅ לא אמור להיות עוד שגיאות "prepared statement already exists"
- ✅ שאילתות למסד הנתונים אמורות לעבוד
- ✅ Tenant lookups אמורים לעבוד

## למה זה עובד?

- `pgbouncer=true` אומר ל-Prisma לא להשתמש ב-prepared statements
- Prisma ישתמש בשאילתות רגילות במקום prepared statements
- זה עובד נכון עם connection poolers כמו PgBouncer
- אין השפעה על ביצועים - השאילתות עדיין רצות ביעילות

## איך לבדוק את ה-URL הנוכחי

ב-Railway Dashboard:
1. Variables → `DATABASE_URL`
2. לחץ על העין (👁️) כדי לראות את הערך
3. בדוק אם יש `pgbouncer=true` בסוף

## אם זה לא עובד

1. **ודא שה-URL נכון:**
   - צריך להיות `pooler.supabase.com` (לא `db.supabase.co`)
   - צריך להיות port `6543` (לא `5432`)
   - צריך להיות `?sslmode=require` או `&sslmode=require`
   - צריך להיות `&pgbouncer=true` בסוף

2. **נסה Direct Connection:**
   - לך ל-Supabase Dashboard → Settings → Database
   - העתק את ה-Direct connection string (port 5432)
   - עדכן את `DATABASE_URL` ב-Railway
   - הוסף `?sslmode=require&pgbouncer=true` בסוף

3. **בדוק את הלוגים:**
   - Railway → Service → Deployments → Latest → View Logs
   - חפש שגיאות הקשורות ל-prepared statements

## קישורים שימושיים

- [Railway Dashboard](https://railway.app)
- [Supabase Dashboard](https://app.supabase.com)
- קובץ התיעוד המלא: `PREPARED_STATEMENT_FIX.md`

