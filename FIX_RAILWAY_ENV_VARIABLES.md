# איך לתקן את בעיית Environment Variables ב-Railway Run

## הבעיה

ה-`OPENAI_API_KEY` מוגדר ב-Railway, אבל `railway run` לא מעביר אותו אוטומטית כשמריצים מקומית.

---

## פתרון 1: הרץ ישירות על Railway (מומלץ)

### דרך Railway Dashboard Shell:

1. **לך ל-Railway Dashboard:**
   - https://railway.app
   - בחר את הפרויקט RAG

2. **פתח Shell:**
   - לחץ על **Deployments** > **View Logs**
   - לחץ על **Shell** (או **Terminal**)

3. **הרץ את הסקריפט:**
   ```bash
   cd /app/BACKEND
   npm run create:embeddings
   ```

**למה זה עובד?** כי זה רץ ישירות על Railway, שם כל ה-variables זמינים אוטומטית!

---

## פתרון 2: ודא שה-Project מקושר נכון

`railway run` אמור לקחת את ה-variables אוטומטית, אבל לפעמים צריך לוודא שהכל מקושר:

```bash
cd BACKEND

# בדוק את הסטטוס
railway status

# אם צריך, קשר מחדש
railway link

# הרץ את הסקריפט (אמור לקחת variables אוטומטית)
railway run npm run create:embeddings
```

אם זה עדיין לא עובד, נסה:

```bash
# ציין את ה-service במפורש
railway run --service RAG_microservice npm run create:embeddings
```

---

## פתרון 3: בדוק שה-Variables מוגדרים נכון

```bash
# בדוק את כל ה-variables
railway variables

# בדוק variable ספציפי
railway variables get OPENAI_API_KEY
```

אם זה לא עובד, אולי ה-variable לא מוגדר נכון:

```bash
# הגדר מחדש
railway variables set OPENAI_API_KEY=sk-your-key-here
```

---

## פתרון 4: השתמש ב-.env מקומי (לפיתוח)

צור קובץ `.env` ב-`BACKEND/`:

```bash
cd BACKEND
echo "OPENAI_API_KEY=sk-your-key-here" > .env
```

ואז הרץ:
```bash
npm run create:embeddings
```

**⚠️ הערה:** אל תעשה commit של `.env` ל-git!

---

## המלצה

**הכי קל:** הרץ דרך Railway Dashboard Shell - שם כל ה-variables זמינים אוטומטית!

---

## איך לבדוק שה-Variables עובדים?

### דרך 1: בדוק ב-Railway Dashboard
1. לך ל-Variables
2. ודא ש-`OPENAI_API_KEY` קיים ועם ערך

### דרך 2: בדוק דרך CLI
```bash
railway variables get OPENAI_API_KEY
```

אמור להציג את ה-key (חלקי).

---

## אם עדיין לא עובד

### בדוק שה-Variable מוגדר ב-Service הנכון

ב-Railway, variables יכולים להיות מוגדרים ב:
- **Project level** - זמינים לכל ה-services
- **Service level** - זמינים רק ל-service ספציפי

ודא שה-`OPENAI_API_KEY` מוגדר ב-service `RAG_microservice` או ב-project level.

---

**הכי בטוח: הרץ דרך Railway Dashboard Shell!**

