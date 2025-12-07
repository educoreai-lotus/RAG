# הוספת תוכן למאגר הידע דרך API

## סקירה כללית

נוצר endpoint חדש שמאפשר להוסיף תוכן למאגר הידע דרך HTTP request, ללא צורך בגישה לטרמינל.

## Endpoints

### 1. הוספת תוכן כללי
**POST** `/api/debug/add-content`

**Body:**
```json
{
  "contentId": "unique-content-id",
  "contentType": "guide",
  "contentText": "התוכן להוספה...",
  "chunkIndex": 0,
  "metadata": {
    "title": "כותרת התוכן",
    "category": "category-name",
    "tags": ["tag1", "tag2"]
  },
  "tenant_id": "default.local"
}
```

### 2. הוספת תוכן JavaScript Prerequisites (נוח)
**POST** `/api/debug/add-js-prerequisites`

**Body:**
```json
{
  "tenant_id": "default.local"
}
```

Endpoint זה מוסיף אוטומטית 3 chunks של תוכן על prerequisites ל-JavaScript.

## דוגמאות שימוש

### דרך curl

```bash
# הוספת JavaScript prerequisites
curl -X POST https://ragmicroservice-production.up.railway.app/api/debug/add-js-prerequisites \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "default.local"
  }'
```

### דרך JavaScript/Node.js

```javascript
const response = await fetch('https://ragmicroservice-production.up.railway.app/api/debug/add-js-prerequisites', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    tenant_id: 'default.local'
  })
});

const result = await response.json();
console.log(result);
```

### דרך Postman/Insomnia

1. בחר **POST** method
2. URL: `https://ragmicroservice-production.up.railway.app/api/debug/add-js-prerequisites`
3. Headers: `Content-Type: application/json`
4. Body (JSON):
```json
{
  "tenant_id": "default.local"
}
```

## תגובה

**הצלחה:**
```json
{
  "success": true,
  "message": "Added 3 content chunks",
  "results": [
    {
      "contentId": "js-prerequisites-guide",
      "contentType": "guide",
      "chunkIndex": 0
    },
    {
      "contentId": "js-prerequisites-guide",
      "contentType": "guide",
      "chunkIndex": 1
    },
    {
      "contentId": "js-prerequisites-detailed",
      "contentType": "document",
      "chunkIndex": 0
    }
  ]
}
```

**שגיאה:**
```json
{
  "error": "Error message",
  "message": "Detailed error description"
}
```

## הערות חשובות

1. **OpenAI API Key**: ה-endpoint משתמש ב-`OPENAI_API_KEY` מהסביבה (environment variable) ב-Railway.
2. **Embeddings**: התוכן עובר embedding אוטומטית באמצעות OpenAI `text-embedding-ada-002`.
3. **Tenant ID**: אם לא מצוין `tenant_id`, משתמש ב-`default.local` כברירת מחדל.
4. **Duplicate Content**: אם תוכן עם אותו `contentId` ו-`chunkIndex` כבר קיים, הוא יעודכן במקום להוסיף כפילות.

## בדיקת התוכן שנוסף

לאחר הוספת התוכן, תוכל לבדוק אותו דרך:

```bash
# בדיקת embeddings status
curl "https://ragmicroservice-production.up.railway.app/api/debug/embeddings-status?tenant_id=default.local"

# בדיקת חיפוש
curl "https://ragmicroservice-production.up.railway.app/api/debug/test-vector-search?query=javascript%20prerequisites&tenant_id=default.local"
```

או דרך query רגיל:

```bash
curl -X POST https://ragmicroservice-production.up.railway.app/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the prerequisites for JavaScript?",
    "tenant_id": "default.local"
  }'
```

## פתרון בעיות

### שגיאת OpenAI API
אם אתה מקבל שגיאה הקשורה ל-OpenAI API:
- ודא ש-`OPENAI_API_KEY` מוגדר ב-Railway environment variables
- בדוק שהמפתח תקף ולא פג תוקף

### שגיאת Database
אם אתה מקבל שגיאת database:
- ודא שה-database connection string תקין
- בדוק שה-migrations רצו בהצלחה

### תוכן לא מופיע בחיפוש
- המתן כמה שניות לעיבוד embeddings
- בדוק שה-`tenant_id` זהה בשאילתה ובהכנסת התוכן
- נסה threshold נמוך יותר בחיפוש (0.2 במקום 0.3)


