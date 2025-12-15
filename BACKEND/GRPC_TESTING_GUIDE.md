# 🔌 מדריך בדיקת תקשורת gRPC עם Coordinator

## הבעיה

Railway לא חושף gRPC ports דרך ה-HTTP domain. צריך למצוא את הדרך הנכונה להתחבר.

## פתרונות לבדיקת gRPC

### פתרון 1: Private Networking (אם שני השירותים על Railway) ⭐ מומלץ

אם גם RAG וגם Coordinator על Railway, השתמש ב-service name:

```bash
# במקום domain, השתמש ב-service name
COORDINATOR_URL=coordinator  # Service name ב-Railway
COORDINATOR_GRPC_PORT=50051
GRPC_USE_SSL=false  # Private network לא צריך SSL
```

**למה זה עובד:**
- Railway מספק private networking בין שירותים
- Service names זמינים דרך הרשת הפרטית
- פורט 50051 יהיה זמין דרך הרשת הפרטית

**איך לבדוק:**
```bash
cd BACKEND
COORDINATOR_URL=coordinator COORDINATOR_GRPC_PORT=50051 GRPC_USE_SSL=false node scripts/test-grpc-only.js
```

### פתרון 2: Expose gRPC Port ב-Railway

ב-Railway Dashboard:
1. לך ל-Coordinator Service → Settings → Networking
2. לחץ על "New Port"
3. הוסף Port: `50051` (TCP)
4. סמן "Public" אם צריך

או ב-`railway.json` של Coordinator:
```json
{
  "networking": {
    "ports": [
      {
        "port": 50051,
        "protocol": "tcp",
        "public": true
      }
    ]
  }
}
```

### פתרון 3: בדיקה עם grpcurl (מהמחשב המקומי)

אם הפורט חשוף public:

```bash
# רשימת שירותים
grpcurl coordinator-production-e0a0.up.railway.app:50051 list

# שליחת בקשה
grpcurl \
  -d '{
    "tenant_id": "test",
    "user_id": "test",
    "query_text": "test",
    "requester_service": "rag-service"
  }' \
  coordinator-production-e0a0.up.railway.app:50051 rag.v1.CoordinatorService/Route
```

### פתרון 4: בדיקה מתוך RAG Service (אם על Railway)

אם RAG Service גם על Railway, השתמש ב-private networking:

```javascript
// הקוד כבר תומך בזה
const COORDINATOR_URL = process.env.COORDINATOR_URL || 'coordinator';
const COORDINATOR_GRPC_PORT = process.env.COORDINATOR_GRPC_PORT || '50051';
```

---

## בדיקות זמינות

### בדיקה 1: בדיקה ממוקדת gRPC

```bash
cd BACKEND
node scripts/test-grpc-only.js
```

**מה זה בודק:**
- ✅ יצירת gRPC client
- ✅ חיבור ל-Coordinator
- ✅ יצירת חתימה דיגיטלית
- ✅ שליחת בקשה עם חתימה ב-metadata
- ✅ קבלת תגובה

### בדיקה 2: בדיקה מלאה עם חתימות

```bash
cd BACKEND
node scripts/test-coordinator-signature.js
```

**מה זה בודק:**
- ✅ כל מה שבדיקה 1 בודקת
- ✅ אימות חתימות
- ✅ בדיקת משתני סביבה

### בדיקה 3: בדיקה פשוטה

```bash
cd BACKEND
node scripts/test-coordinator-simple.js
```

**מה זה בודק:**
- ✅ זמינות Coordinator
- ✅ שליחת בקשה אחת
- ✅ הצגת תוצאות

---

## הגדרת משתני סביבה

### אם שני השירותים על Railway:

```bash
# ב-Railway Variables של RAG Service
COORDINATOR_URL=coordinator  # Service name
COORDINATOR_GRPC_PORT=50051
GRPC_USE_SSL=false
RAG_PRIVATE_KEY=<base64-key>
COORDINATOR_PROTO_PATH=../DATABASE/proto/rag/v1/coordinator.proto
```

### אם רק Coordinator על Railway:

```bash
# צריך לחשוף את פורט 50051 ב-Railway
COORDINATOR_URL=coordinator-production-e0a0.up.railway.app
COORDINATOR_GRPC_PORT=50051
GRPC_USE_SSL=true  # אם נדרש
RAG_PRIVATE_KEY=<base64-key>
```

---

## איך לבדוק מה הפורט הנכון

### 1. בדוק ב-Railway Dashboard:

1. לך ל-Coordinator Service
2. Settings → Networking
3. בדוק מה הפורטים הפעילים
4. בדוק אם יש פורט 50051

### 2. בדוק את ה-Logs של Coordinator:

ב-Railway Dashboard → Coordinator Service → Logs, חפש:
```
gRPC server started successfully on port 50051
```

### 3. בדוק עם grpcurl:

```bash
# נסה פורטים שונים
grpcurl coordinator-production-e0a0.up.railway.app:50051 list
grpcurl coordinator-production-e0a0.up.railway.app:443 list
```

---

## דוגמת קוד לבדיקה

```javascript
import { routeRequest } from './src/clients/coordinator.client.js';

// הבדיקה הפשוטה ביותר
const response = await routeRequest({
  tenant_id: 'test-tenant',
  user_id: 'test-user',
  query_text: 'show me my payments'
});

console.log('Response:', response);
```

---

## פתרון בעיות

### בעיה: "Failed to connect before the deadline"

**פתרונות:**
1. אם על Railway, השתמש ב-service name:
   ```bash
   COORDINATOR_URL=coordinator
   ```
2. בדוק ש-Coordinator רץ
3. בדוק את הפורט (50051)
4. נסה עם/בלי SSL

### בעיה: "Connection refused"

**פתרונות:**
1. בדוק ש-`GRPC_ENABLED=true` ב-Coordinator
2. בדוק ש-`GRPC_PORT=50051` ב-Coordinator
3. בדוק firewall rules
4. אם על Railway, בדוק private networking

### בעיה: "Signature verification failed"

**פתרונות:**
1. בדוק שהמפתח הפרטי נכון
2. בדוק שהמפתח הציבורי רשום ב-Coordinator
3. בדוק שהחתימה נוצרת נכון

---

## המלצה

**אם שני השירותים על Railway:**
- השתמש ב-private networking עם service name
- זה הכי פשוט ואמין

**אם רק Coordinator על Railway:**
- צריך לחשוף את פורט 50051 ב-Railway
- או להשתמש ב-HTTP endpoint עם חתימות

---

## קבצים שימושיים

- `BACKEND/scripts/test-grpc-only.js` - בדיקה ממוקדת gRPC
- `BACKEND/scripts/test-coordinator-signature.js` - בדיקה מלאה
- `BACKEND/src/clients/coordinator.client.js` - לקוח Coordinator
- `BACKEND/src/utils/signature.js` - יצירת חתימות


