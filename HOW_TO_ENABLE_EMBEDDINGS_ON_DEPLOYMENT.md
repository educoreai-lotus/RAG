# איך להפעיל Embeddings אוטומטית ב-Deployment

## ✅ פתרון מושלם: הרץ אוטומטית ב-Deployment!

עדכנתי את `start-with-migrations.js` כך שיריץ את embeddings script אוטומטית אחרי migrations!

---

## 🎯 איך להפעיל

### שלב 1: הוסף Environment Variable ב-Railway

1. **לך ל-Railway Dashboard:**
   - https://railway.app
   - בחר את הפרויקט RAG
   - לחץ על **Variables**

2. **הוסף Variable חדש:**
   - **Name:** `RUN_EMBEDDINGS_ON_STARTUP`
   - **Value:** `true`
   - לחץ על **Add**

### שלב 2: ודא שיש OPENAI_API_KEY

ודא ש-`OPENAI_API_KEY` מוגדר ב-Railway Variables (אמור להיות כבר).

### שלב 3: Deploy מחדש

הקוד כבר מעודכן! פשוט:
- Push את השינויים ל-git
- Railway י-deploy אוטומטית
- אחרי migrations, הסקריפט יריץ embeddings אוטומטית!

---

## 🔍 מה קורה ב-Deployment?

1. ✅ **Migrations** רץ (כרגיל)
2. ✅ **Embeddings Script** רץ (אם `RUN_EMBEDDINGS_ON_STARTUP=true`)
3. ✅ **Server** מתחיל

---

## 📋 מה הסקריפט עושה?

- ✅ יוצר embeddings אמיתיים עם OpenAI API
- ✅ מכניס את כל המידע ל-Supabase
- ✅ כולל את "Eden Levi" וכל שאר המידע
- ✅ מוודא שהכל תקין

---

## ⚙️ Configuration

### Environment Variables:

- `RUN_EMBEDDINGS_ON_STARTUP=true` - מפעיל embeddings ב-startup
- `OPENAI_API_KEY` - OpenAI API key (חובה)
- `DATABASE_URL` - Database connection (חובה)

### אופציונלי:

אם `RUN_EMBEDDINGS_ON_STARTUP` לא מוגדר או `false`, הסקריפט לא ירוץ.

---

## 🎯 למה זה טוב?

1. ✅ **אוטומטי** - לא צריך להריץ ידנית
2. ✅ **בטוח** - רץ רק אם מפעילים את זה
3. ✅ **מהיר** - רץ ב-deployment, לא צריך לחכות
4. ✅ **אמין** - רץ ישירות על Railway עם כל ה-variables

---

## 🔄 איך להריץ שוב?

אם אתה רוצה להריץ embeddings שוב (למשל אחרי שינוי):

1. **דרך 1: Deploy מחדש**
   - פשוט push שינוי קטן ל-git
   - Railway י-deploy ויריץ embeddings

2. **דרך 2: דרך Railway CLI** (אם יש לך גישה)
   ```bash
   cd BACKEND
   railway run npm run create:embeddings
   ```

3. **דרך 3: דרך Supabase SQL** (אם צריך רק להוסיף מידע)
   - השתמש ב-`SUPABASE_INSERT_ALL_SEED_DATA.sql`

---

## ⚠️ הערות חשובות

1. **זה ירוץ בכל deployment** אם `RUN_EMBEDDINGS_ON_STARTUP=true`
2. **זה עלול לקחת זמן** - embeddings creation לוקח כמה דקות
3. **זה משתמש ב-OpenAI API** - יש עלות (קטנה)

אם אתה לא רוצה שזה ירוץ בכל deployment, פשוט אל תגדיר `RUN_EMBEDDINGS_ON_STARTUP` או הגדר אותו ל-`false`.

---

## ✅ Checklist

- [ ] עדכנתי את הקוד (כבר נעשה!)
- [ ] הוספתי `RUN_EMBEDDINGS_ON_STARTUP=true` ב-Railway Variables
- [ ] ודאתי ש-`OPENAI_API_KEY` מוגדר
- [ ] Push את השינויים ל-git
- [ ] Railway deploy אוטומטית
- [ ] בדקתי את ה-logs - אמור לראות "Creating embeddings..."

---

## 🎉 סיכום

**פשוט הוסף `RUN_EMBEDDINGS_ON_STARTUP=true` ב-Railway Variables והכל יעבוד אוטומטית!**

זה הפתרון הכי פשוט וטוב - לא צריך Shell, לא צריך להריץ ידנית, הכל אוטומטי! 🚀

