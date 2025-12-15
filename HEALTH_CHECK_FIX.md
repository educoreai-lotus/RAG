# תיקון Health Check - Coordinator ו-Private Key

## הבעיה

ה-health check מחזיר `"degraded"` בגלל:
1. **Coordinator: "down"** - שירות Coordinator לא זמין
2. **Private key: "missing"** - `RAG_PRIVATE_KEY` לא מוגדר

## פתרון 1: הגדרת RAG_PRIVATE_KEY

### שלב 1: צור Private Key (אם אין לך)

אם אין לך private key, צור אחד:

```bash
cd BACKEND
node scripts/generate-keys.js
```

זה ייצור:
- `BACKEND/keys/rag-service-private-key.pem` - מפתח פרטי
- `BACKEND/keys/rag-service-public-key.pem` - מפתח ציבורי

### שלב 2: המר ל-Base64

ה-Private Key צריך להיות ב-Base64 ב-Railway:

**Windows PowerShell:**
```powershell
$key = Get-Content BACKEND/keys/rag-service-private-key.pem -Raw
$bytes = [System.Text.Encoding]::UTF8.GetBytes($key)
$base64 = [System.Convert]::ToBase64String($bytes)
$base64
```

**Linux/Mac:**
```bash
cat BACKEND/keys/rag-service-private-key.pem | base64
```

### שלב 3: הוסף ל-Railway

1. לך ל-**Railway Dashboard** → הפרויקט שלך → **Variables**
2. לחץ על **+ New Variable**
3. הוסף:
   - **Name:** `RAG_PRIVATE_KEY`
   - **Value:** ה-Base64 string מהשלב הקודם
4. לחץ **Save**

## פתרון 2: הגדרת Coordinator (אופציונלי)

Coordinator הוא שירות חיצוני שמנתב בקשות למיקרו-שירותים אחרים. אם אין לך Coordinator, אתה יכול:

### אופציה A: השבית את Coordinator

1. לך ל-**Railway Dashboard** → הפרויקט שלך → **Variables**
2. הוסף:
   - **Name:** `COORDINATOR_ENABLED`
   - **Value:** `false`
3. לחץ **Save**

**הערה:** זה יגרום ל-health check להציג `coordinator: "disabled"` במקום `"down"`, אבל ה-status עדיין יהיה `"degraded"` בגלל ה-private key.

### אופציה B: הגדר Coordinator (אם יש לך)

אם יש לך Coordinator service, הוסף:

1. **COORDINATOR_GRPC_URL** - ה-URL המלא (לדוגמה: `coordinator.example.com:50051`)
   - או
2. **COORDINATOR_URL** + **COORDINATOR_GRPC_PORT** - ה-URL וה-port בנפרד

**דוגמה:**
```
COORDINATOR_GRPC_URL=coordinator.example.com:50051
```

או:
```
COORDINATOR_URL=coordinator.example.com
COORDINATOR_GRPC_PORT=50051
```

## סדר פעולות מומלץ

### אם אין לך Coordinator (רוב המקרים):

1. ✅ צור Private Key: `node BACKEND/scripts/generate-keys.js`
2. ✅ המר ל-Base64 (ראה למעלה)
3. ✅ הוסף `RAG_PRIVATE_KEY` ב-Railway
4. ✅ הוסף `COORDINATOR_ENABLED=false` ב-Railway (אופציונלי)
5. ✅ Redeploy

### אם יש לך Coordinator:

1. ✅ צור Private Key: `node BACKEND/scripts/generate-keys.js`
2. ✅ המר ל-Base64
3. ✅ הוסף `RAG_PRIVATE_KEY` ב-Railway
4. ✅ הוסף `COORDINATOR_GRPC_URL` ב-Railway
5. ✅ ודא שה-Coordinator רץ וזמין
6. ✅ Redeploy

## איך לבדוק שהתיקון עבד

1. **בדוק את Health Check:**
   ```
   https://rag-production-3a4c.up.railway.app/health
   ```

2. **אמור להחזיר:**
   ```json
   {
     "status": "ok",
     "service": "rag-microservice",
     "dependencies": {
       "coordinator": "ok" או "disabled",
       "private_key": "configured"
     }
   }
   ```

## משתני סביבה מומלצים

```env
# חובה ל-health check תקין
RAG_PRIVATE_KEY=<base64-encoded-private-key>

# אם אין Coordinator
COORDINATOR_ENABLED=false

# אם יש Coordinator
COORDINATOR_GRPC_URL=coordinator.example.com:50051
# או
COORDINATOR_URL=coordinator.example.com
COORDINATOR_GRPC_PORT=50051
```

## הערות חשובות

1. **Private Key הוא חובה** - בלי זה ה-health check תמיד יהיה `"degraded"`
2. **Coordinator הוא אופציונלי** - אם אין לך Coordinator, השבית אותו עם `COORDINATOR_ENABLED=false`
3. **Private Key צריך להיות Base64** - לא העתק את הקובץ ישירות, המר ל-Base64 קודם
4. **אל תעלה Private Key ל-Git** - השתמש רק ב-Railway Variables

## קישורים שימושיים

- [Railway Dashboard](https://railway.app)
- קובץ התיעוד: `BACKEND/COORDINATOR_INTEGRATION_GUIDE.md`
- קובץ התיעוד: `PRODUCTION_REGISTRATION_GUIDE.md`


