# 🚂 הגדרת gRPC ב-Railway

## הבעיה

ב-Railway, gRPC לא נחשף אוטומטית דרך ה-HTTP domain. צריך להגדיר את זה במפורש.

## פתרונות אפשריים

### אופציה 1: Private Networking (מומלץ)

אם שני השירותים (RAG ו-Coordinator) על Railway, אפשר להשתמש ב-private networking:

```javascript
// במקום coordinator-production-e0a0.up.railway.app
// השתמש ב-service name מ-Railway
const COORDINATOR_URL = process.env.COORDINATOR_SERVICE_NAME || 'coordinator';
const COORDINATOR_GRPC_PORT = '50051';
const COORDINATOR_GRPC_URL = `${COORDINATOR_URL}:${COORDINATOR_GRPC_PORT}`;
```

**ב-Railway:**
- Railway מספק private networking בין שירותים
- השתמש ב-service name במקום ה-public domain
- הפורט 50051 יהיה זמין דרך ה-private network

### אופציה 2: Expose gRPC Port ב-Railway

ב-`railway.json` של Coordinator, הוסף:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  },
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

**או ב-Railway Dashboard:**
1. לך ל-Coordinator Service → Settings → Networking
2. הוסף Port: `50051` (TCP)
3. סמן "Public" אם צריך

### אופציה 3: gRPC-Web דרך HTTP

אם Coordinator תומך ב-gRPC-Web, אפשר להשתמש ב-HTTP endpoint:

```javascript
// במקום gRPC ישיר, השתמש ב-gRPC-Web דרך HTTP
const COORDINATOR_GRPC_WEB_URL = 'https://coordinator-production-e0a0.up.railway.app';
```

**דרוש:**
- Coordinator צריך לתמוך ב-gRPC-Web
- צריך להשתמש ב-`@grpc/grpc-js` עם `grpc-web` transport

### אופציה 4: HTTP Endpoint עם חתימות

אם gRPC לא זמין, אפשר להשתמש ב-HTTP endpoint:

```javascript
// Coordinator יש endpoint: POST /api/fill-content-metrics/
const response = await fetch('https://coordinator-production-e0a0.up.railway.app/api/fill-content-metrics/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Service-Name': 'rag-service',
    'X-Signature': signature
  },
  body: JSON.stringify({
    requester_service: 'rag-service',
    payload: {...},
    response: {...}
  })
});
```

---

## הגדרת משתני סביבה

### ב-RAG Service (Railway):

```bash
# אם שני השירותים על Railway - השתמש ב-private networking
COORDINATOR_URL=coordinator  # Service name ב-Railway
COORDINATOR_GRPC_PORT=50051

# או אם צריך public domain
COORDINATOR_URL=coordinator-production-e0a0.up.railway.app
COORDINATOR_GRPC_PORT=50051

# SSL/TLS (אם נדרש)
GRPC_USE_SSL=true
```

### ב-Coordinator Service (Railway):

```bash
GRPC_ENABLED=true
GRPC_PORT=50051
```

---

## בדיקת החיבור

### 1. בדיקה עם grpcurl (מהמחשב המקומי):

```bash
# אם הפורט חשוף public
grpcurl -plaintext coordinator-production-e0a0.up.railway.app:50051 list

# עם SSL
grpcurl coordinator-production-e0a0.up.railway.app:50051 list
```

### 2. בדיקה מ-RAG Service:

```bash
cd BACKEND
node scripts/test-coordinator-signature.js
```

---

## פתרון בעיות

### בעיה: Connection refused

**פתרון:**
1. ודא ש-Coordinator רץ: בדוק ב-Railway Dashboard
2. בדוק ש-`GRPC_ENABLED=true` ב-Coordinator
3. בדוק ש-`GRPC_PORT=50051` ב-Coordinator
4. אם שני השירותים על Railway, השתמש ב-service name

### בעיה: Timeout

**פתרון:**
1. בדוק firewall rules ב-Railway
2. ודא שהפורט חשוף (public או private)
3. נסה עם SSL: `GRPC_USE_SSL=true`

### בעיה: DNS resolution failed

**פתרון:**
1. אם על Railway, השתמש ב-service name במקום domain
2. בדוק ש-`COORDINATOR_URL` נכון

---

## המלצה

**אם שני השירותים על Railway:**
- השתמש ב-private networking עם service name
- זה הכי פשוט ואמין

**אם Coordinator על Railway ו-RAG לא:**
- צריך לחשוף את פורט 50051 ב-Railway
- או להשתמש ב-HTTP endpoint עם חתימות

---

## דוגמה להגדרה מלאה

### ב-RAG Service (.env או Railway Variables):

```bash
# Private networking (אם שני השירותים על Railway)
COORDINATOR_URL=coordinator
COORDINATOR_GRPC_PORT=50051
COORDINATOR_GRPC_URL=coordinator:50051

# או Public domain
COORDINATOR_URL=coordinator-production-e0a0.up.railway.app
COORDINATOR_GRPC_PORT=50051
COORDINATOR_GRPC_URL=coordinator-production-e0a0.up.railway.app:50051

# SSL (אם נדרש)
GRPC_USE_SSL=true

# Private key לחתימות
RAG_PRIVATE_KEY=<base64-encoded-key>
```

### ב-Coordinator Service (.env או Railway Variables):

```bash
GRPC_ENABLED=true
GRPC_PORT=50051
```

---

## בדיקה סופית

לאחר ההגדרה, הרץ:

```bash
cd BACKEND
node scripts/test-coordinator-signature.js
```

אם הכל עובד, תראה:
- ✅ Environment Variables: PASS
- ✅ Signature Generation: PASS  
- ✅ Coordinator Available: PASS
- ✅ gRPC Request: PASS





