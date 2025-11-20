# איך לבדוק את תיקון Tenant ID בענן

## 🎯 המטרה
לוודא שהמערכת משתמשת ב-tenant_id הנכון: `b9db3773-ca63-4da3-9ac3-c69bb858a6a8`

## ✅ בדיקות מהירות

### בדיקה 1: בדוק את ה-Tenant ID ב-Embeddings Status

**בדרך Postman:**
```
GET https://ragmicroservice-production.up.railway.app/api/debug/embeddings-status?tenant_id=default.local
```

**צפוי בתשובה:**
```json
{
  "tenant": {
    "domain": "default.local",
    "id": "b9db3773-ca63-4da3-9ac3-c69bb858a6a8"  // ✅ צריך להיות זה!
  },
  "embeddings": {
    "total_for_tenant": 9  // ✅ צריך להיות 9 embeddings
  }
}
```

**⚠️ אם אתה רואה:**
```json
{
  "tenant": {
    "id": "2fbb2ecb-2b41-43c9-8010-3fe9d3df6bb1"  // ❌ WRONG!
  }
}
```
**זה אומר שהתיקון לא עבד - בדוק את הלוגים.**

---

### בדיקה 2: בדוק Vector Search עם Eden Levi

**בדרך Postman:**
```
GET https://ragmicroservice-production.up.railway.app/api/debug/test-vector-search?query=What%20is%20Eden%20Levi%27s%20role?&tenant_id=default.local&threshold=0.3
```

**צפוי בתשובה:**
```json
{
  "tenant": {
    "id": "b9db3773-ca63-4da3-9ac3-c69bb858a6a8"  // ✅ צריך להיות זה!
  },
  "search_results": {
    "with_threshold": {
      "count": 9  // ✅ צריך למצוא 9 תוצאות
    }
  }
}
```

---

### בדיקה 3: בדוק Query רגיל

**בדרך Postman:**
```
POST https://ragmicroservice-production.up.railway.app/api/v1/query
Content-Type: application/json

{
  "query": "What is Eden Levi's role?",
  "tenant_id": "default.local"
}
```

**צפוי בתשובה:**
```json
{
  "answer": "Eden Levi is a Manager...",  // ✅ תשובה על Eden Levi
  "sources": [
    // ✅ צריך להיות 9 sources
  ],
  "confidence": 0.8  // ✅ confidence גבוה
}
```

---

## 📋 בדיקת הלוגים בענן

### 1. בדוק את Railway Logs

1. פתח את [Railway Dashboard](https://railway.app)
2. בחר את ה-service של RAG Microservice
3. לחץ על "Logs"
4. חפש את המסרים הבאים:

**✅ מסרים טובים:**
```
✅ Using tenant_id: b9db3773-ca63-4da3-9ac3-c69bb858a6a8
🔧 Resolving default.local to correct tenant_id
🔍 TENANT DEBUG - Entry Point: { FINAL: 'b9db3773-ca63-4da3-9ac3-c69bb858a6a8' }
Tenant resolved: { tenant_id: 'b9db3773-ca63-4da3-9ac3-c69bb858a6a8' }
```

**❌ מסרים רעים:**
```
⚠️ WARNING: Wrong tenant_id detected, auto-correcting!
❌ CRITICAL: Wrong tenant ID detected after resolution!
WRONG TENANT DETECTED! Cannot use 2fbb2ecb-2b41-43c9-8010-3fe9d3df6bb1
```

---

### 2. בדוק את הלוגים ב-Postman Console

1. פתח Postman
2. לחץ על **View > Show Postman Console** (או `Ctrl+Alt+C`)
3. שלח בקשה
4. בדוק את ה-Response Headers והלוגים

---

## 🔍 בדיקה מפורטת - צעד אחר צעד

### שלב 1: בדוק את ה-Database בענן

אם יש לך גישה ל-Supabase:

```sql
-- בדוק את ה-tenants
SELECT id, domain, name 
FROM tenants 
WHERE domain = 'default.local';

-- התוצאה צריכה להיות:
-- id: b9db3773-ca63-4da3-9ac3-c69bb858a6a8
-- domain: default.local
```

**אם ה-ID שגוי:**
```sql
-- תיקון ידני (אם צריך):
UPDATE tenants 
SET id = 'b9db3773-ca63-4da3-9ac3-c69bb858a6a8' 
WHERE domain = 'default.local' 
AND id = '2fbb2ecb-2b41-43c9-8010-3fe9d3df6bb1';

-- בדוק את ה-embeddings
SELECT COUNT(*) 
FROM vector_embeddings 
WHERE tenant_id = 'b9db3773-ca63-4da3-9ac3-c69bb858a6a8';

-- צריך להיות 9 embeddings
```

---

### שלב 2: בדוק את ה-Endpoints

**Endpoint 1: Embeddings Status**
```
GET https://ragmicroservice-production.up.railway.app/api/debug/embeddings-status?tenant_id=default.local
```

**צפוי:**
- `tenant.id` = `b9db3773-ca63-4da3-9ac3-c69bb858a6a8`
- `embeddings.total_for_tenant` = `9`

---

**Endpoint 2: Test Vector Search**
```
GET https://ragmicroservice-production.up.railway.app/api/debug/test-vector-search?query=What%20is%20Eden%20Levi%27s%20role?&tenant_id=default.local&threshold=0.3
```

**צפוי:**
- `tenant.id` = `b9db3773-ca63-4da3-9ac3-c69bb858a6a8`
- `search_results.with_threshold.count` = `9`
- `search_results.with_threshold.results` מכיל תוצאות על Eden Levi

---

**Endpoint 3: Query רגיל**
```
POST https://ragmicroservice-production.up.railway.app/api/v1/query
Content-Type: application/json

{
  "query": "What is Eden Levi's role?",
  "tenant_id": "default.local"
}
```

**צפוי:**
- `answer` מכיל תשובה על Eden Levi
- `sources` מכיל 9 sources
- `confidence` > 0.7

---

### שלב 3: בדוק את הלוגים

**בדוק בלוגים של Railway:**

1. **Entry Point Logs:**
   ```
   🔍 TENANT DEBUG - Entry Point: {
     from_query: 'default.local',
     from_body: null,
     FINAL: 'b9db3773-ca63-4da3-9ac3-c69bb858a6a8'
   }
   ```

2. **Tenant Resolution Logs:**
   ```
   ✅ Using tenant_id: b9db3773-ca63-4da3-9ac3-c69bb858a6a8
   🔧 Resolving default.local to correct tenant_id
   Tenant resolved: { tenant_id: 'b9db3773-ca63-4da3-9ac3-c69bb858a6a8' }
   ```

3. **Vector Search Logs:**
   ```
   Vector search returned: {
     tenant_id: 'b9db3773-ca63-4da3-9ac3-c69bb858a6a8',
     vectors_found: 9
   }
   ```

---

## 🚨 פתרון בעיות

### בעיה 1: עדיין רואה את ה-Wrong Tenant ID

**פתרון:**
1. בדוק שהקוד עבר deployment - בדוק ב-Railway שה-build הצליח
2. בדוק את הלוגים - האם יש מסרים על "Wrong tenant_id detected"?
3. בדוק את ה-database - האם ה-tenant ב-database עדיין שגוי?

**אם הלוגים מראים auto-correction:**
```
⚠️ WARNING: Wrong tenant_id detected, auto-correcting!
```
זה בסדר - הקוד מתקן את זה אוטומטית.

---

### בעיה 2: לא מוצא embeddings

**פתרון:**
1. בדוק את ה-tenant_id ב-embeddings status
2. בדוק ב-Supabase:
   ```sql
   SELECT COUNT(*) 
   FROM vector_embeddings 
   WHERE tenant_id = 'b9db3773-ca63-4da3-9ac3-c69bb858a6a8';
   ```
3. אם זה 0, צריך לרוץ embeddings script עם ה-tenant_id הנכון

---

### בעיה 3: עדיין רואה "Failed to connect to RAG service"

**פתרון:**
1. הקוד עכשיו מחזיר מסרים ספציפיים יותר
2. בדוק מה ה-error message המדויק:
   - **Tenant error:** "There was an issue accessing your workspace data..."
   - **Permission error:** "I found information about that, but you don't have permission..."
   - **Connection error:** "I encountered an error connecting to the service..."
3. אם עדיין רואה את המסר הישן, זה אומר שה-frontend לא עודכן

---

## ✅ Checklist סופי

לפני שתשחרר את זה ל-production, ודא:

- [ ] ה-deployment ב-Railway הצליח
- [ ] הלוגים מראים tenant_id נכון: `b9db3773-ca63-4da3-9ac3-c69bb858a6a8`
- [ ] Embeddings status מחזיר tenant_id נכון
- [ ] Vector search מוצא 9 תוצאות
- [ ] Query רגיל מחזיר תשובה על Eden Levi
- [ ] אין מסרים על "Wrong tenant_id" בלוגים (או שיש auto-correction)
- [ ] ה-error messages ספציפיים ומדויקים

---

## 📞 אם משהו לא עובד

1. **בדוק את הלוגים:**
   - Railway Logs
   - Postman Console
   
2. **בדוק את ה-Database:**
   - Supabase Console
   - בדוק את ה-tenants table
   - בדוק את ה-vector_embeddings table

3. **בדוק את ה-Deployment:**
   - האם ה-build הצליח?
   - האם ה-service רץ?
   - האם יש environment variables נכונים?

---

## 🔗 קישורים שימושיים

- **Railway Dashboard:** https://railway.app
- **Postman Collection:** ייתכן שיש collection עם כל ה-endpoints
- **Supabase Dashboard:** בדוק את ה-database ישירות

---

## 🎯 סיכום

התיקון עובד כך:
1. **Entry Point:** כל request שעובר דרך ה-API מתקן את ה-tenant_id
2. **Auto-Correction:** אם מישהו שולח את ה-wrong tenant_id, הוא מתקן אוטומטית
3. **Domain Mapping:** `default.local` תמיד מפותה ל-tenant_id הנכון
4. **Double-Check:** הקוד בודק פעמיים שהכל נכון
5. **Logging:** כל צעד מתועד בלוגים

אם הכל עובד נכון, אתה אמור לראות:
- ✅ tenant_id נכון בכל הלוגים
- ✅ 9 תוצאות ב-vector search
- ✅ תשובות על Eden Levi
- ✅ מסרי שגיאה ספציפיים ומדויקים

