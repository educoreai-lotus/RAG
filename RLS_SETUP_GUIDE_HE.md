# 🔒 מדריך הגדרת RLS עבור `vector_embeddings`

## ❓ השאלה

האם זה נכון להגדיר RLS כך?

```sql
-- אפשר RLS
ALTER TABLE public.vector_embeddings ENABLE ROW LEVEL SECURITY;

-- תן גישה רק ל-service role (ה-RAG שלך)
CREATE POLICY "Service role full access"
ON public.vector_embeddings
FOR ALL
TO service_role
USING (true);

-- חסום אחרים
CREATE POLICY "Block anon access"
ON public.vector_embeddings
FOR ALL
TO anon
USING (false);
```

---

## ⚠️ התשובה: **זה תלוי בסוג החיבור שלך!**

### 🔍 מה צריך לבדוק:

ה-backend שלך משתמש ב-**Prisma** עם חיבור ישיר ל-PostgreSQL דרך `DATABASE_URL`.

ב-Supabase יש **2 סוגי חיבורים**:

1. **Direct Connection** (חיבור ישיר)
   - משתמש ב-role: `postgres`
   - **עוקף RLS** - ה-policies לא יחולו!
   - Connection string נראה כך:
     ```
     postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
     ```

2. **Connection Pooler** (חיבור דרך Pooler)
   - יכול להשתמש ב-`service_role`, `anon`, או `postgres`
   - **מכבד RLS** - ה-policies יחולו ✅
   - יש 2 מצבי Pooler:
     - **Transaction mode** (port 5432): `pooler.supabase.com:5432`
     - **Session mode** (port 6543): `pooler.supabase.com:6543`
   - Connection string נראה כך:
     ```
     postgresql://postgres:[PASSWORD]@[PROJECT].pooler.supabase.com:5432/postgres?sslmode=require
     ```
     או עם service_role:
     ```
     postgresql://postgres.[PROJECT_REF].service_role:[PASSWORD]@[PROJECT].pooler.supabase.com:5432/postgres?sslmode=require
     ```

---

## ✅ **המקרה שלך: Connection Pooler ב-port 5432**

אם ה-`DATABASE_URL` שלך נראה כך:
```
postgresql://...@...pooler.supabase.com:5432/postgres?sslmode=require
```

**זה Connection Pooler ב-transaction mode** ✅  
**RLS יעבוד**, אבל צריך לבדוק איזה **role** משתמש החיבור.

---

## ✅ פתרון נכון - 3 אפשרויות:

### **אפשרות 1: Connection Pooler עם service_role** ⭐ מומלץ

אם ה-`DATABASE_URL` שלך נראה כך:
```
postgresql://postgres.[PROJECT_REF].service_role:[PASSWORD]@[PROJECT].pooler.supabase.com:5432/postgres?sslmode=require
```

הקוד שלך **נכון**! אבל צריך להוסיף `WITH CHECK`:

```sql
-- אפשר RLS
ALTER TABLE public.vector_embeddings ENABLE ROW LEVEL SECURITY;

-- תן גישה רק ל-service role (ה-RAG שלך)
CREATE POLICY "Service role full access"
ON public.vector_embeddings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- חסום anon
CREATE POLICY "Block anon access"
ON public.vector_embeddings
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- ⚠️ חשוב: חסום גם authenticated users (אם יש)
CREATE POLICY "Block authenticated users"
ON public.vector_embeddings
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);
```

**ודא שה-`DATABASE_URL` שלך משתמש ב-service_role:**
```env
DATABASE_URL=postgresql://postgres.[PROJECT_REF].service_role:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true&sslmode=require
```

---

### **אפשרות 2: אם אתה משתמש ב-Direct Connection (postgres role)**

ה-policies שלך **לא יעבדו** כי הם מיועדים ל-`service_role` ו-`anon`, אבל החיבור שלך משתמש ב-`postgres`.

**פתרון: הוסף policy גם ל-postgres role:**

```sql
-- אפשר RLS
ALTER TABLE public.vector_embeddings ENABLE ROW LEVEL SECURITY;

-- תן גישה ל-service role
CREATE POLICY "Service role full access"
ON public.vector_embeddings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- תן גישה גם ל-postgres role (אם אתה משתמש ב-direct connection)
CREATE POLICY "Postgres role full access"
ON public.vector_embeddings
FOR ALL
TO postgres
USING (true)
WITH CHECK (true);

-- חסום anon
CREATE POLICY "Block anon access"
ON public.vector_embeddings
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- חסום authenticated users
CREATE POLICY "Block authenticated users"
ON public.vector_embeddings
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);
```

---

### **אפשרות 3: Connection Pooler עם postgres role** (המקרה הנפוץ)

אם ה-`DATABASE_URL` שלך נראה כך:
```
postgresql://postgres:[PASSWORD]@[PROJECT].pooler.supabase.com:5432/postgres?sslmode=require
```

**זה Connection Pooler, אבל עם `postgres` role** (לא `service_role`).

**פתרון: הוסף policy גם ל-postgres role:**

```sql
-- אפשר RLS
ALTER TABLE public.vector_embeddings ENABLE ROW LEVEL SECURITY;

-- תן גישה ל-service role (אם תשנה בעתיד)
CREATE POLICY "Service role full access"
ON public.vector_embeddings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- תן גישה גם ל-postgres role (החיבור הנוכחי שלך)
CREATE POLICY "Postgres role full access"
ON public.vector_embeddings
FOR ALL
TO postgres
USING (true)
WITH CHECK (true);

-- חסום anon
CREATE POLICY "Block anon access"
ON public.vector_embeddings
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- חסום authenticated users
CREATE POLICY "Block authenticated users"
ON public.vector_embeddings
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);
```

**⚠️ הערה:** זה עובד, אבל **פחות מאובטח** מאשר `service_role`.  
**המלצה:** שנה את ה-`DATABASE_URL` להשתמש ב-`service_role` (ראה אפשרות 1).

---

## 🔍 איך לבדוק איזה סוג חיבור יש לך?

### בדיקה 1: בדוק את ה-`DATABASE_URL`

```bash
# ב-Railway או ב-.env שלך
echo $DATABASE_URL
```

**אם יש `pooler.supabase.com`** → אתה משתמש ב-Connection Pooler ✅  
**אם יש `:5432`** → Transaction mode (RLS עובד) ✅  
**אם יש `:6543`** → Session mode (RLS עובד) ✅  
**אם יש `supabase.co:5432` (בלי pooler)** → Direct Connection (RLS לא עובד) ⚠️

**⚠️ חשוב:** גם ב-Connection Pooler, צריך לבדוק איזה **role** משתמש:
- `postgres.[PROJECT].service_role` → service_role ✅
- `postgres` → postgres role (צריך policy נפרד)

### בדיקה 2: בדוק איזה role משתמש החיבור

הרץ את זה ב-Supabase SQL Editor:

```sql
-- בדוק איזה role משתמש החיבור הנוכחי
SELECT current_user, session_user;

-- בדוק את כל ה-policies הקיימות
SELECT 
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'vector_embeddings';
```

---

## 🎯 המלצה: פתרון מאובטח יותר

אם אתה רוצה **אבטחה מקסימלית**, השתמש ב-Connection Pooler עם `service_role`:

### 1. שנה את ה-`DATABASE_URL` ב-Railway:

```
postgresql://postgres.[PROJECT_REF].service_role:[SERVICE_ROLE_PASSWORD]@[HOST]:6543/postgres?pgbouncer=true&sslmode=require
```

**איפה למצוא את ה-service_role password:**
- Supabase Dashboard → Settings → API
- Copy את ה-"service_role" key (זה ה-password)

**📝 דוגמה: איך לשנות את ה-DATABASE_URL:**

**לפני (עם postgres role):**
```
postgresql://postgres:[PASSWORD]@[PROJECT].pooler.supabase.com:5432/postgres?sslmode=require
```

**אחרי (עם service_role):**
```
postgresql://postgres.[PROJECT_REF].service_role:[SERVICE_ROLE_KEY]@[PROJECT].pooler.supabase.com:5432/postgres?sslmode=require
```

**איפה למצוא את ה-PROJECT_REF:**
- זה החלק ב-URL שלך לפני `.pooler.supabase.com`
- לדוגמה: אם ה-URL שלך הוא `abc123xyz.pooler.supabase.com` → ה-PROJECT_REF הוא `abc123xyz`

**שלבים:**
1. פתח Supabase Dashboard → Settings → API
2. Copy את ה-"service_role" key (המפתח הארוך)
3. קח את ה-PROJECT_REF מה-URL הנוכחי שלך
4. בנה את ה-URL החדש לפי הפורמט למעלה
5. עדכן ב-Railway → Variables → DATABASE_URL

### 2. הפעל את ה-policies:

```sql
-- אפשר RLS
ALTER TABLE public.vector_embeddings ENABLE ROW LEVEL SECURITY;

-- תן גישה רק ל-service role
CREATE POLICY "Service role full access"
ON public.vector_embeddings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- חסום את כל השאר
CREATE POLICY "Block all other roles"
ON public.vector_embeddings
FOR ALL
TO PUBLIC
USING (false)
WITH CHECK (false);
```

**הערה:** `TO PUBLIC` חוסם את כל ה-roles חוץ מ-`service_role` (כי ה-policy של service_role יותר ספציפית).

---

## ⚠️ נקודות חשובות:

1. **RLS עובד רק דרך Supabase API או Connection Pooler** - לא דרך direct connection עם `postgres` role
2. **ה-backend שלך צריך להשתמש ב-service_role** - לא ב-anon key
3. **ה-frontend יכול להשתמש ב-anon key** - אבל הוא לא צריך גישה ל-`vector_embeddings` (זה רק ב-backend)
4. **תמיד בדוק** - הרץ את ה-queries של הבדיקה למעלה כדי לוודא שה-policies עובדים

---

## 🧪 בדיקות:

### בדיקה 1: וודא ש-RLS מופעל

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'vector_embeddings';
-- צריך להחזיר: rowsecurity = true
```

### בדיקה 2: בדוק את ה-policies

```sql
SELECT policyname, roles, cmd 
FROM pg_policies 
WHERE tablename = 'vector_embeddings';
```

### בדיקה 3: נסה גישה דרך anon (צריך להיכשל)

```sql
-- שנה role ל-anon
SET ROLE anon;

-- נסה לקרוא
SELECT * FROM vector_embeddings LIMIT 1;
-- צריך להיכשל עם: "new row violates row-level security policy"

-- חזור ל-role המקורי
RESET ROLE;
```

---

## 📝 סיכום:

| סוג חיבור | האם ה-policies יעבדו? | מה לעשות |
|-----------|---------------------|----------|
| **Connection Pooler + service_role** | ✅ כן | השתמש בקוד שלך + הוסף `WITH CHECK (true)` |
| **Connection Pooler + postgres** (המקרה שלך) | ✅ כן | הוסף policy גם ל-`postgres` role (אפשרות 3) |
| **Direct Connection + postgres** | ❌ לא | הוסף policy גם ל-`postgres` role |
| **Connection Pooler + anon** | ⚠️ לא מומלץ | שנה ל-`service_role` |

---

**המלצה סופית:**  
אם אתה משתמש ב-Supabase, **השתמש ב-Connection Pooler עם service_role** - זה הפתרון הכי מאובטח ויעיל.

---

## 🎯 **למקרה שלך במיוחד:**

אם ה-`DATABASE_URL` שלך הוא:
```
...pooler.supabase.com:5432/postgres?sslmode=require
```

**זה Connection Pooler** ✅ - RLS יעבוד!

**עכשיו בדוק איזה role משתמש:**
1. פתח את Supabase SQL Editor
2. הרץ: `SELECT current_user, session_user;`
3. אם זה `postgres` → השתמש ב-**אפשרות 3** (הוסף policy ל-postgres)
4. אם זה `service_role` → השתמש ב-**אפשרות 1** (הקוד שלך נכון)

**או פשוט הוסף את שתי ה-policies** (service_role + postgres) - זה יעבוד בשני המקרים!

