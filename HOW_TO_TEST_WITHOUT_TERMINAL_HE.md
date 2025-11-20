# איך לבדוק את החיפוש הווקטורי בלי טרמינל (Railway)

## 🎯 3 דרכים לבדיקה בלי טרמינל

### 1. דרך הדפדפן (הכי קל!) 🌐
### 2. דרך Postman/Insomnia (מפורט) 📮
### 3. דרך ה-Frontend שלך (אם יש) 🖥️

---

## 🌐 דרך #1: בדיקה דרך הדפדפן (הכי קל!)

### ✅ בדיקה #1: Diagnostic Endpoint

**פשוט פתח את הדפדפן וכתוב את ה-URL:**

```
https://YOUR-RAILWAY-APP.railway.app/api/debug/test-vector-search?query=What%20is%20Eden%20Levi%27s%20role?&tenant_id=default.local&threshold=0.3
```

**החלף `YOUR-RAILWAY-APP` בשם האפליקציה שלך ב-Railway.**

**דוגמאות:**
- אם ה-URL שלך הוא `rag-microservice-production.up.railway.app`
- אז ה-URL יהיה:
```
https://rag-microservice-production.up.railway.app/api/debug/test-vector-search?query=What%20is%20Eden%20Levi%27s%20role?&tenant_id=default.local&threshold=0.3
```

**מה תראה:**
- JSON response עם כל הפרטים על החיפוש
- אם הכל עובד: תראה `"count": 1` או יותר ב-`search_results.with_threshold`

### ✅ בדיקה #2: Embeddings Status

**פתח בדפדפן:**
```
https://YOUR-RAILWAY-APP.railway.app/api/debug/embeddings-status?tenant_id=default.local
```

**מה תראה:**
- סטטוס של pgvector extension
- כמה embeddings יש
- האם HNSW index קיים

### ✅ בדיקה #3: Health Check

**פתח בדפדפן:**
```
https://YOUR-RAILWAY-APP.railway.app/health
```

**מה תראה:**
- `{"status":"ok","service":"rag-microservice"}` - הכל עובד ✅

---

## 📮 דרך #2: דרך Postman/Insomnia (מפורט יותר)

### מה זה?
Postman ו-Insomnia הם כלים חינמיים לבדיקת APIs. אפשר להוריד אותם מהאינטרנט.

### איך להתקין?
1. **Postman**: https://www.postman.com/downloads/
2. **Insomnia**: https://insomnia.rest/download

### איך להשתמש?

#### **בדיקה #1: Diagnostic Endpoint (GET)**

1. פתח Postman/Insomnia
2. בחר **GET** request
3. כתוב את ה-URL:
   ```
   https://YOUR-RAILWAY-APP.railway.app/api/debug/test-vector-search
   ```
4. הוסף **Query Parameters**:
   - `query` = `What is Eden Levi's role?`
   - `tenant_id` = `default.local`
   - `threshold` = `0.3`
5. לחץ **Send**

#### **בדיקה #2: BOT Query (POST)**

1. פתח Postman/Insomnia
2. בחר **POST** request
3. כתוב את ה-URL:
   ```
   https://YOUR-RAILWAY-APP.railway.app/api/v1/query
   ```
4. בחר **Headers** והוסף:
   ```
   Content-Type: application/json
   ```
5. בחר **Body** → **raw** → **JSON**
6. כתוב:
   ```json
   {
     "query": "מה התפקיד של Eden Levi?",
     "tenant_id": "default.local"
   }
   ```
7. לחץ **Send**

---

## 🖥️ דרך #3: דרך ה-Frontend שלך

### אם יש לך Frontend:

**פשוט שאל שאלות דרך ה-BOT UI שלך!**

1. פתח את ה-Frontend שלך
2. שאל שאלה כמו:
   - "מה התפקיד של Eden Levi?"
   - "אילו קורסים יש?"
   - "What is Eden Levi's role?"
3. בדוק את התשובה

**אם מקבלים תשובה עם sources** = הכל עובד ✅  
**אם מקבלים "No EDUCORE context found"** = יש בעיה ❌

---

## 🔍 איך למצוא את ה-URL של Railway?

### דרך #1: Railway Dashboard

1. פתח Railway Dashboard: https://railway.app
2. בחר את הפרויקט שלך
3. בחר את השירות (Service)
4. לחץ על **Settings** → **Domains**
5. תראה את ה-URL שם (כמו `rag-microservice-production.up.railway.app`)

### דרך #2: Deployments

1. פתח Railway Dashboard
2. בחר את הפרויקט
3. לחץ על **Deployments**
4. תראה את ה-URL שם

### דרך #3: Logs

1. פתח Railway Dashboard
2. בחר את הפרויקט
3. לחץ על **Logs**
4. חפש שורות כמו:
   ```
   Server running on port 3000
   Query endpoint: http://localhost:3000/api/v1/query
   ```
   (אבל זה localhost, אז לא יעזור)

**הכי טוב**: לך ל-Settings → Domains ותראה את ה-URL האמיתי!

---

## 📋 דוגמאות מלאות

### דוגמה #1: בדיקה דרך דפדפן

**אם ה-URL שלך הוא:** `rag-microservice-production.up.railway.app`

**פתח בדפדפן:**
```
https://rag-microservice-production.up.railway.app/api/debug/test-vector-search?query=What%20is%20Eden%20Levi%27s%20role?&tenant_id=default.local&threshold=0.3
```

**או בעברית (עם URL encoding):**
```
https://rag-microservice-production.up.railway.app/api/debug/test-vector-search?query=%D7%9E%D7%94%20%D7%94%D7%AA%D7%A4%D7%A7%D7%99%D7%93%20%D7%A9%D7%9C%20Eden%20Levi?&tenant_id=default.local&threshold=0.3
```

### דוגמה #2: בדיקת Health

```
https://rag-microservice-production.up.railway.app/health
```

**תראה:**
```json
{
  "status": "ok",
  "service": "rag-microservice"
}
```

### דוגמה #3: בדיקת Embeddings Status

```
https://rag-microservice-production.up.railway.app/api/debug/embeddings-status?tenant_id=default.local
```

**תראה:**
```json
{
  "status": "ok",
  "pgvector": {
    "extension_enabled": true
  },
  "indexes": {
    "hnsw_index_exists": true
  },
  "embeddings": {
    "total_for_tenant": 9
  }
}
```

---

## 🛠️ פתרון בעיות

### בעיה: "This site can't be reached" או "Connection refused"

**פתרון:**
1. בדוק שה-URL נכון ב-Railway Dashboard
2. בדוק שה-service רץ (לא crashed)
3. בדוק את ה-Logs ב-Railway לראות אם יש שגיאות

### בעיה: "404 Not Found"

**פתרון:**
1. וודא שה-URL נכון (כולל `/api/debug/...`)
2. בדוק שה-service רץ
3. נסה את `/health` endpoint קודם

### בעיה: "500 Internal Server Error"

**פתרון:**
1. בדוק את ה-Logs ב-Railway
2. בדוק שה-DATABASE_URL נכון
3. בדוק שה-OPENAI_API_KEY נכון

### בעיה: "CORS error" בדפדפן

**פתרון:**
- זה נורמלי אם אתה מנסה לגשת מ-domain אחר
- השתמש ב-Postman/Insomnia במקום
- או הוסף את ה-domain ל-CORS_ALLOWED_ORIGINS

---

## ✅ Checklist לבדיקה

לפני בדיקה:
- [ ] יש לך את ה-URL של Railway
- [ ] ה-service רץ (לא crashed)
- [ ] יש embeddings ב-Supabase (9+ רשומות)

בדיקה:
- [ ] פתח `/health` בדפדפן - צריך לראות `{"status":"ok"}`
- [ ] פתח `/api/debug/embeddings-status` - צריך לראות embeddings
- [ ] פתח `/api/debug/test-vector-search` - צריך לראות תוצאות

אחרי בדיקה:
- [ ] מקבלים תוצאות (count > 0)
- [ ] התשובה רלוונטית
- [ ] אין שגיאות

---

## 🎯 המלצה

**הכי קל**: פתח את הדפדפן וכתוב את ה-URL ישירות!

**הכי מפורט**: השתמש ב-Postman/Insomnia לבדיקות POST requests

**הכי אמיתי**: שאל שאלות דרך ה-Frontend שלך

---

## 📝 סיכום

✅ **דרך הדפדפן** - הכי קל, פשוט כתוב את ה-URL  
✅ **דרך Postman** - מפורט יותר, טוב לבדיקות POST  
✅ **דרך Frontend** - הבדיקה האמיתית, דרך ה-UI שלך  

**אין צורך בטרמינל! הכל דרך הדפדפן או Postman! 🚀**

