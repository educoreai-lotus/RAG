# 🧪 מדריך בדיקת תקשורת עם Coordinator

## תוכן עניינים

1. [בדיקה מהירה](#בדיקה-מהירה)
2. [בדיקה מפורטת עם חתימות](#בדיקה-מפורטת-עם-חתימות)
3. [בדיקה ידנית עם grpcurl](#בדיקה-ידנית-עם-grpcurl)
4. [בדיקה מתוך הקוד](#בדיקה-מתוך-הקוד)
5. [בדיקת HTTP Endpoint](#בדיקת-http-endpoint)
6. [פתרון בעיות](#פתרון-בעיות)

---

## 🚀 בדיקה מהירה

### שלב 1: בדיקת יצירת חתימות

```bash
cd BACKEND
node scripts/test-coordinator-signature.js
```

**מה זה בודק:**
- ✅ משתני סביבה מוגדרים נכון
- ✅ יצירת חתימות דיגיטליות
- ✅ חיבור ל-Coordinator
- ✅ שליחת בקשה gRPC עם חתימה

**תוצאה צפויה:**
```
✅ RAG_PRIVATE_KEY: Configured
✅ Simple signature generated: MEQC...
✅ Payload signature generated: MEQC...
✅ Coordinator is available and reachable
✅ Received response from Coordinator
```

---

## 🔐 בדיקה מפורטת עם חתימות

### שלב 1: הגדרת משתני סביבה

```bash
# ב-PowerShell
$env:RAG_PRIVATE_KEY="<base64-encoded-private-key>"
$env:COORDINATOR_URL="coordinator-production-e0a0.up.railway.app"
$env:COORDINATOR_GRPC_PORT="50051"
$env:GRPC_USE_SSL="true"  # אם נדרש
```

או ב-`.env`:
```bash
RAG_PRIVATE_KEY=<base64-encoded-private-key>
COORDINATOR_URL=coordinator-production-e0a0.up.railway.app
COORDINATOR_GRPC_PORT=50051
GRPC_USE_SSL=true
```

### שלב 2: הרצת הבדיקה

```bash
cd BACKEND
node scripts/test-coordinator-signature.js
```

### שלב 3: בדיקת התוצאות

הסקריפט יבדוק:
1. **משתני סביבה** - האם הכל מוגדר נכון
2. **יצירת חתימות** - האם החתימות נוצרות נכון
3. **חיבור ל-Coordinator** - האם אפשר להתחבר
4. **שליחת בקשה** - האם הבקשה נשלחת עם חתימה
5. **קבלת תגובה** - האם מקבלים תגובה מ-Coordinator

---

## 🔧 בדיקה ידנית עם grpcurl

### התקנת grpcurl

**Windows (PowerShell):**
```powershell
# דרך Chocolatey
choco install grpcurl

# או הורדה מ-GitHub
# https://github.com/fullstorydev/grpcurl/releases
```

**macOS:**
```bash
brew install grpcurl
```

**Linux:**
```bash
# Download from GitHub releases
wget https://github.com/fullstorydev/grpcurl/releases/download/v1.8.9/grpcurl_1.8.9_linux_x86_64.tar.gz
tar -xzf grpcurl_1.8.9_linux_x86_64.tar.gz
sudo mv grpcurl /usr/local/bin/
```

### בדיקה 1: רשימת שירותים

```bash
# בדיקה שהשרת זמין
grpcurl -plaintext localhost:50051 list

# או עם SSL
grpcurl coordinator-production-e0a0.up.railway.app:50051 list

# או עם Railway (אם יש private networking)
grpcurl -plaintext coordinator:50051 list
```

**תוצאה צפויה:**
```
rag.v1.CoordinatorService
```

### בדיקה 2: תיאור השירות

```bash
# תיאור מלא של השירות
grpcurl -plaintext localhost:50051 describe rag.v1.CoordinatorService

# תיאור של method ספציפי
grpcurl -plaintext localhost:50051 describe rag.v1.CoordinatorService.Route
```

### בדיקה 3: שליחת בקשה (ללא חתימה)

```bash
grpcurl -plaintext \
  -d '{
    "tenant_id": "test-tenant",
    "user_id": "test-user",
    "query_text": "show me my payments",
    "requester_service": "rag-service",
    "context": {},
    "envelope_json": "{\"version\":\"1.0\",\"timestamp\":\"2025-01-01T00:00:00Z\"}"
  }' \
  localhost:50051 rag.v1.CoordinatorService/Route
```

**הערה:** זה יעבוד רק אם Coordinator לא דורש חתימות, או אם החתימה לא נדרשת לבדיקה.

### בדיקה 4: עם metadata (חתימה)

```bash
# יצירת חתימה (צריך script נפרד)
# ואז:
grpcurl -plaintext \
  -H "x-signature: <your-signature>" \
  -H "x-service-name: rag-service" \
  -H "x-timestamp: <timestamp>" \
  -d '{...}' \
  localhost:50051 rag.v1.CoordinatorService/Route
```

---

## 💻 בדיקה מתוך הקוד

### דוגמה 1: בדיקה בסיסית

```javascript
// test-basic.js
import { routeRequest, isCoordinatorAvailable } from './src/clients/coordinator.client.js';

async function test() {
  // בדיקה שהשרת זמין
  const available = await isCoordinatorAvailable();
  console.log('Coordinator available:', available);
  
  if (!available) {
    console.error('Coordinator is not available!');
    return;
  }
  
  // שליחת בקשה
  const response = await routeRequest({
    tenant_id: 'test-tenant',
    user_id: 'test-user',
    query_text: 'show me my payments',
    metadata: {
      source: 'test',
      timestamp: new Date().toISOString()
    }
  });
  
  console.log('Response:', response);
}

test().catch(console.error);
```

**הרצה:**
```bash
cd BACKEND
node test-basic.js
```

### דוגמה 2: בדיקה עם חתימות מפורטת

```javascript
// test-with-signatures.js
import { routeRequest } from './src/clients/coordinator.client.js';
import { generateSignature } from './src/utils/signature.js';
import { logger } from './src/utils/logger.util.js';

async function testWithSignatures() {
  const privateKey = Buffer.from(process.env.RAG_PRIVATE_KEY, 'base64').toString('utf-8');
  
  // יצירת חתימה ידנית
  const testPayload = {
    tenant_id: 'test-tenant',
    user_id: 'test-user',
    query_text: 'test query'
  };
  
  const signature = generateSignature('rag-service', privateKey, testPayload);
  console.log('Generated signature:', signature);
  
  // שליחת בקשה (החתימה נוצרת אוטומטית ב-routeRequest)
  const response = await routeRequest({
    tenant_id: 'test-tenant',
    user_id: 'test-user',
    query_text: 'show me my payments',
    metadata: {
      test: true,
      signature_preview: signature.substring(0, 20) + '...'
    }
  });
  
  if (response) {
    console.log('✅ Success!');
    console.log('Target services:', response.target_services);
    console.log('Normalized fields:', response.normalized_fields);
  } else {
    console.error('❌ No response received');
  }
}

testWithSignatures().catch(console.error);
```

---

## 🌐 בדיקת HTTP Endpoint

אם gRPC לא זמין, אפשר לבדוק דרך HTTP:

### בדיקה 1: Health Check

```bash
# PowerShell
Invoke-WebRequest -Uri "https://coordinator-production-e0a0.up.railway.app/health" | Select-Object -ExpandProperty Content

# או curl (אם מותקן)
curl https://coordinator-production-e0a0.up.railway.app/health
```

### בדיקה 2: Unified Proxy Endpoint

```javascript
// test-http-endpoint.js
import axios from 'axios';
import { generateSignature } from './src/utils/signature.js';

async function testHttpEndpoint() {
  const privateKey = Buffer.from(process.env.RAG_PRIVATE_KEY, 'base64').toString('utf-8');
  const serviceName = 'rag-service';
  
  const requestData = {
    requester_service: serviceName,
    payload: {
      tenant_id: 'test-tenant',
      user_id: 'test-user',
      query_text: 'show me my payments'
    },
    response: {
      format: 'json'
    }
  };
  
  // יצירת חתימה
  const signature = generateSignature(serviceName, privateKey, requestData);
  
  // שליחת בקשה
  try {
    const response = await axios.post(
      'https://coordinator-production-e0a0.up.railway.app/api/fill-content-metrics/',
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': serviceName,
          'X-Signature': signature
        }
      }
    );
    
    console.log('✅ Success!');
    console.log('Response:', response.data);
    
    // בדיקת חתימת תגובה (אם יש)
    if (response.headers['x-service-signature']) {
      console.log('Response signature:', response.headers['x-service-signature']);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testHttpEndpoint();
```

---

## 🔍 בדיקה שלב אחר שלב

### שלב 1: בדיקת משתני סביבה

```bash
# PowerShell
$env:RAG_PRIVATE_KEY
$env:COORDINATOR_URL
$env:COORDINATOR_GRPC_PORT

# או
cd BACKEND
node -e "console.log('RAG_PRIVATE_KEY:', process.env.RAG_PRIVATE_KEY ? 'Set' : 'Not set')"
```

### שלב 2: בדיקת יצירת חתימות

```bash
cd BACKEND
node -e "
import('./src/utils/signature.js').then(({ generateSignature }) => {
  const key = Buffer.from(process.env.RAG_PRIVATE_KEY, 'base64').toString('utf-8');
  const sig = generateSignature('rag-service', key);
  console.log('Signature:', sig.substring(0, 50) + '...');
});
"
```

### שלב 3: בדיקת חיבור

```bash
cd BACKEND
node -e "
import('./src/clients/coordinator.client.js').then(({ isCoordinatorAvailable }) => {
  isCoordinatorAvailable().then(available => {
    console.log('Available:', available);
  });
});
"
```

### שלב 4: בדיקת בקשה מלאה

```bash
cd BACKEND
node scripts/test-coordinator-signature.js
```

---

## 🐛 פתרון בעיות

### בעיה: "RAG_PRIVATE_KEY not configured"

**פתרון:**
```bash
# הגדר את המשתנה
$env:RAG_PRIVATE_KEY="<base64-key>"

# או צור קובץ .env
RAG_PRIVATE_KEY=<base64-key>
```

### בעיה: "Coordinator is not available"

**פתרונות:**
1. בדוק ש-Coordinator רץ ב-Railway
2. בדוק את הפורט (50051)
3. נסה עם service name במקום domain:
   ```bash
   COORDINATOR_URL=coordinator  # במקום domain
   ```
4. בדוק אם צריך SSL:
   ```bash
   GRPC_USE_SSL=true
   ```

### בעיה: "Connection refused"

**פתרונות:**
1. בדוק firewall rules
2. בדוק ש-`GRPC_ENABLED=true` ב-Coordinator
3. בדוק ש-`GRPC_PORT=50051` ב-Coordinator
4. אם על Railway, בדוק private networking

### בעיה: "Signature verification failed"

**פתרונות:**
1. ודא שהמפתח הפרטי נכון
2. ודא שהמפתח הציבורי רשום ב-Coordinator
3. בדוק שהחתימה נוצרת נכון:
   ```bash
   node scripts/test-coordinator-signature.js
   ```

### בעיה: "Timeout"

**פתרונות:**
1. הגדל את ה-timeout:
   ```bash
   GRPC_TIMEOUT=60  # שניות
   ```
2. בדוק network connectivity
3. בדוק ש-Coordinator לא עמוס

---

## ✅ Checklist בדיקה מלאה

- [ ] משתני סביבה מוגדרים (`RAG_PRIVATE_KEY`, `COORDINATOR_URL`, etc.)
- [ ] יצירת חתימות עובדת
- [ ] חיבור ל-Coordinator עובד
- [ ] שליחת בקשה gRPC עובדת
- [ ] קבלת תגובה מ-Coordinator
- [ ] אימות חתימת תגובה (אם יש `COORDINATOR_PUBLIC_KEY`)

---

## 📊 דוגמת פלט מוצלח

```
🔐 Coordinator gRPC Signature Test Suite
Testing digital signature generation and gRPC communication

============================================================
Test 1: Environment Variables Check
============================================================
✅ RAG_PRIVATE_KEY: Configured
✅ Private key format is valid

============================================================
Test 2: Signature Generation
============================================================
✅ Simple signature generated: MEQC...
✅ Payload signature generated: MEQC...
✅ Signatures are different (as expected)

============================================================
Test 3: Coordinator Availability Check
============================================================
✅ Coordinator is available and reachable

============================================================
Test 4: gRPC Request with Signature
============================================================
✅ Received response from Coordinator (123ms)
  Target Services: ['payment-service']
  Successful Service: payment-service
  Rank Used: 1
  Quality Score: 0.95

============================================================
Test Summary
============================================================
✅ All tests passed!
```

---

## 📚 קבצים שימושיים

- `BACKEND/scripts/test-coordinator-signature.js` - סקריפט בדיקה מלא
- `BACKEND/scripts/test-grpc-connection.js` - בדיקת חיבור gRPC
- `BACKEND/src/clients/coordinator.client.js` - לקוח Coordinator
- `BACKEND/src/utils/signature.js` - יצירת חתימות

---

**שאלות?** בדוק את הלוגים או פנה לצוות הליבה.


