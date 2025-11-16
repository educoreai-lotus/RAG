# איך למלא את הטבלאות דרך Supabase SQL Editor

## הבעיה:
אין טרמינל ב-Railway, אז צריך להריץ את ה-seed דרך Supabase SQL Editor.

---

## פתרון מהיר:

### שלב 1: לך ל-Supabase SQL Editor
1. פתח https://supabase.com/dashboard
2. בחר את הפרויקט שלך
3. לחץ על **"SQL Editor"** בתפריט השמאלי

### שלב 2: העתק והדבק את ה-SQL
1. פתח את הקובץ: `DATABASE/prisma/seed.sql`
2. העתק את כל התוכן
3. הדבק ב-Supabase SQL Editor
4. לחץ **"Run"** (או Ctrl+Enter)

### שלב 3: בדוק שהכל עבד
ב-Supabase SQL Editor, הרץ:
```sql
SELECT 
    'microservices' as table_name, COUNT(*) as count FROM microservices
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL
SELECT 'queries', COUNT(*) FROM queries;
```

**תוצאה צפויה:**
```
table_name        | count
------------------+-------
microservices     | 10
user_profiles     | 2
queries           | 1
```

---

## מה ה-SQL Script עושה:

1. ✅ יוצר tenant (אם לא קיים)
2. ✅ יוצר 10 מיקרוסרוויסים
3. ✅ יוצר access control rules
4. ✅ יוצר user profiles
5. ✅ יוצר knowledge graph nodes & edges
6. ✅ יוצר sample query עם sources
7. ✅ מציג סיכום בסוף

---

## הערות חשובות:

- ה-Script משתמש ב-`ON CONFLICT DO NOTHING` - אפשר להריץ כמה פעמים
- ה-Script יוצר tenant עם domain `dev.educore.local`
- אם כבר יש נתונים, הם לא יוחלפו

---

## אם יש שגיאות:

### שגיאה: "relation does not exist"
→ ה-migrations לא הוחלו. הרץ את ה-migrations קודם.

### שגיאה: "duplicate key"
→ הנתונים כבר קיימים. זה בסדר - ה-`ON CONFLICT` ימנע שגיאות.

### שגיאה: "permission denied"
→ ודא שיש לך הרשאות ליצור טבלאות ב-Supabase.

---

## בדיקה מפורטת:

```sql
-- בדוק את כל המיקרוסרוויסים
SELECT name, display_name, is_active 
FROM microservices 
ORDER BY name;

-- בדוק את ה-user profiles
SELECT user_id, role, department 
FROM user_profiles;

-- בדוק את ה-queries
SELECT query_text, answer, confidence_score 
FROM queries;
```

---

## סיכום:

1. לך ל-Supabase SQL Editor
2. העתק את `DATABASE/prisma/seed.sql`
3. הדבק והרץ
4. בדוק את התוצאות

**זה הכל!** 🎯

