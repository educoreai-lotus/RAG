# איך לבדוק את החיפוש הווקטורי - מדריך מפורט

## 🎯 שתי דרכי בדיקה

### 1. בדיקה דרך Diagnostic Endpoint (curl)
### 2. בדיקה דרך BOT (POST request)

---

## 📋 בדיקה #1: דרך Diagnostic Endpoint (curl)

### מה זה?
זה endpoint מיוחד לבדיקה שמראה לך בדיוק מה קורה בחיפוש הווקטורי.

### איך להריץ?

#### **אם אתה על Windows (PowerShell):**

```powershell
# דוגמה 1: שאלה על Eden Levi
curl "http://localhost:3000/api/debug/test-vector-search?query=What%20is%20Eden%20Levi%27s%20role?&tenant_id=default.local&threshold=0.3"

# דוגמה 2: שאלה על קורסים
curl "http://localhost:3000/api/debug/test-vector-search?query=What%20courses%20are%20available?&tenant_id=default.local&threshold=0.3"

# דוגמה 3: שאלה בעברית (צריך URL encoding)
curl "http://localhost:3000/api/debug/test-vector-search?query=%D7%9E%D7%94%20%D7%94%D7%AA%D7%A4%D7%A7%D7%99%D7%93%20%D7%A9%D7%9C%20Eden%20Levi?&tenant_id=default.local&threshold=0.3"
```

#### **אם אתה על Mac/Linux:**

```bash
# דוגמה 1: שאלה על Eden Levi
curl "http://localhost:3000/api/debug/test-vector-search?query=What%20is%20Eden%20Levi%27s%20role?&tenant_id=default.local&threshold=0.3"

# דוגמה 2: שאלה על קורסים
curl "http://localhost:3000/api/debug/test-vector-search?query=What%20courses%20are%20available?&tenant_id=default.local&threshold=0.3"
```

#### **או דרך Postman/Insomnia:**

1. פתח Postman או Insomnia
2. בחר **GET** request
3. כתוב את ה-URL:
   ```
   http://localhost:3000/api/debug/test-vector-search
   ```
4. הוסף Query Parameters:
   - `query` = `What is Eden Levi's role?`
   - `tenant_id` = `default.local`
   - `threshold` = `0.3`

### מה תראה בתגובה?

```json
{
  "status": "ok",
  "timestamp": "2025-01-XX...",
  "test_query": "What is Eden Levi's role?",
  "tenant": {
    "domain": "default.local",
    "id": "uuid-here"
  },
  "embedding": {
    "dimensions": 1536,
    "preview": [0.1, 0.2, 0.3, 0.4, 0.5]
  },
  "search_results": {
    "with_threshold": {
      "threshold": 0.3,
      "count": 1,
      "results": [
        {
          "contentId": "user:manager-001",
          "contentType": "user_profile",
          "similarity": 0.85,
          "contentTextPreview": "User Profile: Eden Levi (manager). Department: Engineering..."
        }
      ]
    },
    "without_threshold": {
      "count": 5,
      "top_10": [
        {
          "contentId": "user:manager-001",
          "contentType": "user_profile",
          "similarity": 0.85,
          "contentTextPreview": "..."
        },
        // ... עוד תוצאות
      ]
    }
  }
}
```

### איך לפרש את התוצאות?

✅ **אם אתה רואה `count > 0` ב-`with_threshold`**:
- החיפוש עובד! ✅
- יש תוצאות עם similarity מעל ה-threshold

✅ **אם אתה רואה `count = 0` ב-`with_threshold` אבל יש תוצאות ב-`without_threshold`**:
- החיפוש עובד, אבל ה-threshold גבוה מדי
- נסה threshold נמוך יותר (0.2 או 0.1)

❌ **אם אתה רואה שגיאה**:
- בדוק שה-server רץ (`http://localhost:3000/health`)
- בדוק שה-DATABASE_URL נכון
- בדוק את הלוגים לפרטים

---

## 📋 בדיקה #2: דרך BOT (POST request)

### מה זה?
זה הבדיקה האמיתית - שואלים את ה-BOT שאלה ומקבלים תשובה.

### איך להריץ?

#### **דרך Postman/Insomnia:**

1. פתח Postman או Insomnia
2. בחר **POST** request
3. כתוב את ה-URL:
   ```
   http://localhost:3000/api/v1/query
   ```
4. בחר **Headers** והוסף:
   ```
   Content-Type: application/json
   ```
5. בחר **Body** → **raw** → **JSON**
6. כתוב את ה-JSON:
   ```json
   {
     "query": "מה התפקיד של Eden Levi?",
     "tenant_id": "default.local"
   }
   ```
7. לחץ **Send**

#### **דרך curl (PowerShell):**

```powershell
# שאלה בעברית
curl -X POST http://localhost:3000/api/v1/query `
  -H "Content-Type: application/json" `
  -d '{\"query\": \"מה התפקיד של Eden Levi?\", \"tenant_id\": \"default.local\"}'

# שאלה באנגלית
curl -X POST http://localhost:3000/api/v1/query `
  -H "Content-Type: application/json" `
  -d '{\"query\": \"What is Eden Levi'\''s role?\", \"tenant_id\": \"default.local\"}'
```

#### **דרך curl (Mac/Linux):**

```bash
# שאלה בעברית
curl -X POST http://localhost:3000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"query": "מה התפקיד של Eden Levi?", "tenant_id": "default.local"}'

# שאלה באנגלית
curl -X POST http://localhost:3000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is Eden Levi'\''s role?", "tenant_id": "default.local"}'
```

#### **דרך JavaScript (Node.js):**

```javascript
const response = await fetch('http://localhost:3000/api/v1/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: 'מה התפקיד של Eden Levi?',
    tenant_id: 'default.local',
  }),
});

const data = await response.json();
console.log(data);
```

### מה תראה בתגובה?

#### ✅ **תגובה מוצלחת (יש תוצאות):**

```json
{
  "answer": "Eden Levi is an Engineering Manager in the Engineering department. His role focuses on delivery, mentoring, and planning.",
  "abstained": false,
  "confidence": 0.85,
  "sources": [
    {
      "sourceId": "user:manager-001",
      "sourceType": "user_profile",
      "title": "user_profile:user:manager-001",
      "contentSnippet": "User Profile: Eden Levi (manager). Department: Engineering. Region: IL. Title: Engineering Manager. Focus: delivery, mentoring, planning.",
      "sourceUrl": "/user_profile/user:manager-001",
      "relevanceScore": 0.85,
      "metadata": {
        "fullName": "Eden Levi",
        "role": "manager",
        "department": "Engineering"
      }
    }
  ],
  "recommendations": [],
  "metadata": {
    "processing_time_ms": 1234,
    "sources_retrieved": 1,
    "cached": false,
    "model_version": "gpt-3.5-turbo",
    "personalized": false
  }
}
```

#### ❌ **תגובה ללא תוצאות:**

```json
{
  "answer": "I couldn't find EDUCORE knowledge related to: \"מה התפקיד של Eden Levi?\". Please add or import relevant documents to improve future answers.",
  "abstained": true,
  "reason": "no_edudata_context",
  "confidence": 0,
  "sources": [],
  "metadata": {
    "processing_time_ms": 567,
    "sources_retrieved": 0,
    "cached": false,
    "model_version": "db-required",
    "personalized": false
  }
}
```

### איך לפרש את התוצאות?

✅ **אם אתה רואה `abstained: false` ו-`sources.length > 0`**:
- הכל עובד מצוין! ✅
- החיפוש מצא תוצאות
- ה-BOT החזיר תשובה עם מקורות

⚠️ **אם אתה רואה `abstained: true` ו-`sources.length = 0`**:
- החיפוש לא מצא תוצאות
- יכול להיות:
  - אין embeddings ב-tenant_id הזה
  - ה-threshold גבוה מדי
  - השאלה לא תואמת לתוכן הקיים

---

## 🔍 דוגמאות לשאלות לבדיקה

### ✅ שאלות שיעבדו (יש מידע ב-Supabase):

```json
// 1. שאלה על Eden Levi
{
  "query": "מה התפקיד של Eden Levi?",
  "tenant_id": "default.local"
}

// 2. שאלה על קורסים
{
  "query": "אילו קורסים יש?",
  "tenant_id": "default.local"
}

// 3. שאלה על מבחנים
{
  "query": "מה יש במבחן JavaScript?",
  "tenant_id": "default.local"
}

// 4. שאלה על התחלה
{
  "query": "איך להתחיל?",
  "tenant_id": "default.local"
}

// 5. שאלה באנגלית
{
  "query": "What is Eden Levi's role?",
  "tenant_id": "default.local"
}
```

### ❌ שאלות שלא יעבדו (אין מידע):

```json
// אין מידע על skills
{
  "query": "אילו כישורים יש?",
  "tenant_id": "default.local"
}

// אין מידע על trainers
{
  "query": "מי המדריכים?",
  "tenant_id": "default.local"
}
```

---

## 🛠️ פתרון בעיות

### בעיה: "Connection refused" או "Cannot connect"

**פתרון**:
1. וודא שה-server רץ:
   ```bash
   curl http://localhost:3000/health
   ```
2. אם לא רץ, הפעל:
   ```bash
   cd BACKEND
   npm start
   ```

### בעיה: "No results found"

**פתרון**:
1. בדוק embeddings status:
   ```bash
   curl "http://localhost:3000/api/debug/embeddings-status?tenant_id=default.local"
   ```
2. אם אין embeddings, הרץ:
   ```bash
   cd BACKEND
   npm run create:embeddings
   ```

### בעיה: "Vector search error"

**פתרון**:
1. בדוק את הלוגים לפרטים
2. וודא ש-pgvector extension מופעל ב-Supabase
3. וודא ש-HNSW index קיים
4. בדוק שה-DATABASE_URL נכון

---

## 📊 סיכום

### בדיקה #1 (Diagnostic Endpoint):
- ✅ מראה בדיוק מה קורה בחיפוש
- ✅ מראה similarity scores
- ✅ מראה תוצאות עם ובלי threshold
- ✅ טוב לדיבוג

### בדיקה #2 (BOT):
- ✅ הבדיקה האמיתית
- ✅ מראה תשובה סופית
- ✅ מראה sources ומקורות
- ✅ טוב לבדיקת UX

**המלצה**: התחל עם בדיקה #1 כדי לוודא שהחיפוש עובד, ואז עבור לבדיקה #2 לבדיקת UX מלאה.

---

## ✅ Checklist

לפני בדיקה, וודא:
- [ ] Server רץ (`http://localhost:3000/health`)
- [ ] יש embeddings ב-Supabase (9+ רשומות)
- [ ] pgvector extension מופעל
- [ ] HNSW index קיים
- [ ] DATABASE_URL נכון

אחרי בדיקה, בדוק:
- [ ] מקבלים תוצאות (sources.length > 0)
- [ ] התשובה רלוונטית
- [ ] אין שגיאות בלוגים

**הכל מוכן! 🚀**

