# איך לתקן את שגיאת OPENAI_API_KEY

## הבעיה

הסקריפט רץ אבל מקבל שגיאה:
```
OPENAI_API_KEY environment variable is missing or empty
```

---

## פתרון: הוסף OPENAI_API_KEY ל-Railway

### שיטה 1: דרך Railway Dashboard (מומלץ)

1. **לך ל-Railway Dashboard:**
   - https://railway.app
   - בחר את הפרויקט RAG

2. **לך ל-Variables:**
   - לחץ על **Variables** (בתפריט השמאלי)
   - או לחץ על הפרויקט > **Variables**

3. **הוסף את ה-API Key:**
   - לחץ על **+ New Variable**
   - **Name:** `OPENAI_API_KEY`
   - **Value:** ה-API key שלך מ-OpenAI (מתחיל ב-`sk-...`)
   - לחץ על **Add**

4. **הרץ שוב את הסקריפט:**
   ```bash
   cd BACKEND
   railway run npm run create:embeddings
   ```

---

### שיטה 2: דרך Railway CLI

```bash
# הוסף את ה-API key
railway variables set OPENAI_API_KEY=sk-your-api-key-here

# הרץ שוב את הסקריפט
cd BACKEND
railway run npm run create:embeddings
```

---

### שיטה 3: העבר ישירות (לבדיקה)

אם אתה רוצה לבדוק בלי לשמור ב-Railway:

```bash
cd BACKEND
railway run --env OPENAI_API_KEY=sk-your-api-key-here npm run create:embeddings
```

---

## איפה למצוא את OpenAI API Key?

1. **לך ל-OpenAI Platform:**
   - https://platform.openai.com/api-keys

2. **התחבר לחשבון שלך**

3. **צור API Key חדש:**
   - לחץ על **+ Create new secret key**
   - העתק את ה-key (תראה אותו רק פעם אחת!)

4. **העתק והדבק ב-Railway Variables**

---

## איך לבדוק שה-API Key נוסף?

```bash
cd BACKEND
railway variables
```

אמור לראות:
```
OPENAI_API_KEY = sk-...
```

---

## אחרי הוספת ה-API Key

הרץ שוב:
```bash
cd BACKEND
railway run npm run create:embeddings
```

עכשיו זה אמור לעבוד! 🎉

---

## אם עדיין יש שגיאות

### שגיאה: "Database connection failed"
**פתרון:** ודא ש-`DATABASE_URL` מוגדר ב-Railway Variables

### שגיאה: "pgvector extension not found"
**פתרון:** הרץ ב-Supabase SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

**הכי קל: דרך Railway Dashboard > Variables!**

