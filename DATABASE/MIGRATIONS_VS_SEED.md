# Migrations vs Seed Data - הסבר

## ההבדל:

### Migrations (מסכימות):
- **מטרה**: שינויים ב-**schema** (מבנה הטבלאות)
- **דוגמאות**: יצירת טבלאות, הוספת עמודות, יצירת indexes
- **מתי**: כשמשנים את המבנה של ה-database
- **איך**: דרך `prisma migrate` או SQL migrations

### Seed Data (נתוני בדיקה):
- **מטרה**: הוספת **נתונים** (records) לטבלאות
- **דוגמאות**: מיקרוסרוויסים, user profiles, sample queries
- **מתי**: כשצריך נתוני בדיקה/פיתוח
- **איך**: דרך `seed.js` או SQL script

---

## למה בדרך כלל לא שמים Seed ב-Migrations?

### 1. **Migrations = Schema Changes**
Migrations מיועדות לשינויים ב-**מבנה**, לא לנתונים.

### 2. **Idempotent (אפשר להריץ כמה פעמים)**
Migrations אמורות להיות **idempotent** - אפשר להריץ אותן כמה פעמים בלי בעיות.
Seed data יכול ליצור duplicates אם מריצים כמה פעמים.

### 3. **Production vs Development**
- **Production**: לא רוצים seed data (יש נתונים אמיתיים)
- **Development**: רוצים seed data לבדיקות

### 4. **שינויים תכופים**
Seed data משתנה יותר מ-schema. לא רוצים migration חדשה כל פעם שמשנים seed.

---

## אבל... אפשר להוסיף Seed ל-Migration!

אם רוצים שהנתונים יווצרו **אוטומטית** עם ה-migration, אפשר להוסיף seed data ל-migration!

### יתרונות:
✅ **אוטומטי** - הנתונים נוצרים עם ה-migration
✅ **נוח** - לא צריך להריץ seed בנפרד
✅ **עקבי** - כל מי שרץ migrations מקבל את אותם נתונים

### חסרונות:
⚠️ **Production** - צריך להיזהר שלא לדרוס נתונים קיימים
⚠️ **Idempotent** - צריך להשתמש ב-`ON CONFLICT DO NOTHING`

---

## המלצה:

### אפשרות 1: Seed ב-Migration (מומלץ לנתונים בסיסיים!)
להוסיף seed data ל-migration עבור:
- ✅ **מיקרוסרוויסים** - נתונים בסיסיים שצריכים להיות תמיד
- ✅ **Access Control Rules** - כללי ברירת מחדל
- ❌ **User Profiles** - נתוני בדיקה, לא ב-production
- ❌ **Sample Queries** - נתוני בדיקה בלבד

### אפשרות 2: Seed נפרד (מומלץ לנתוני בדיקה)
לשמור seed נפרד עבור:
- User profiles
- Sample queries
- Knowledge graph nodes
- Vector embeddings (mock data)

---

## מה לעשות?

**אני ממליץ להוסיף את המיקרוסרוויסים ל-migration!**

זה הגיוני כי:
1. מיקרוסרוויסים הם **נתונים בסיסיים** - צריכים להיות תמיד
2. הם לא משתנים הרבה
3. זה נוח - נוצרים אוטומטית עם ה-migration

רוצה שאני אוסיף את המיקרוסרוויסים ל-migration? 🎯

