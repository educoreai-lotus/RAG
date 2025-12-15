# מדריך תקשורת gRPC - בעברית

**מדריך מקיף להבנת תקשורת gRPC במערכת Coordinator**

---

## 📋 תוכן עניינים

1. [סקירה כללית](#סקירה-כללית)
2. [איך התקשורת מתבצעת](#איך-התקשורת-מתבצעת)
3. [משתני סביבה נדרשים](#משתני-סביבה-נדרשים)
4. [ארכיטקטורת התקשורת](#ארכיטקטורת-התקשורת)
5. [דוגמאות שימוש](#דוגמאות-שימוש)
6. [פתרון בעיות](#פתרון-בעיות)

---

## 🌐 סקירה כללית

ה-Coordinator תומך בשני פרוטוקולי תקשורת:
- **HTTP REST** - לפורט 3000 (ברירת מחדל)
- **gRPC** - לפורט 50051 (ברירת מחדל)

gRPC משמש בעיקר לתקשורת עם RAG (Retrieval-Augmented Generation) ולשיחות בין מיקרו-שירותים.

---

## 🔌 איך התקשורת מתבצעת

### 1. שרת gRPC (Coordinator מקבל בקשות)

השרת מאזין על פורט 50051 (ברירת מחדל) ומקבל בקשות מ-RAG:

```
RAG → gRPC Server (port 50051) → Coordinator Service Handler
```

**Service:** `rag.v1.CoordinatorService`  
**Method:** `Route`

**Proto Definition:**

```protobuf
service CoordinatorService {
  rpc Route (RouteRequest) returns (RouteResponse);
}

message RouteRequest {
  string tenant_id = 1;
  string user_id = 2;
  string query_text = 3;
  map<string, string> metadata = 4;
}

message RouteResponse {
  repeated string target_services = 1;
  map<string, string> normalized_fields = 2;
  string envelope_json = 3;
  string routing_metadata = 4;
}
```

### 2. לקוח gRPC (Coordinator מתקשר עם מיקרו-שירותים)

הלקוח מתקשר עם מיקרו-שירותים אחרים דרך gRPC:

```
Coordinator → gRPC Client → Microservice (gRPC endpoint)
```

**Service:** `microservice.v1.MicroserviceAPI`  
**Method:** `Process`

**Proto Definition:**

```protobuf
service MicroserviceAPI {
  rpc Process (ProcessRequest) returns (ProcessResponse);
}

message ProcessRequest {
  string envelope_json = 1;  // Universal Envelope as JSON string
}

message ProcessResponse {
  string envelope_json = 1;  // Response as JSON string
  bool success = 2;
  string error = 3;
}
```

### 3. תהליך התקשורת המלא

```
┌─────────┐         ┌──────────────┐         ┌─────────────┐
│   RAG   │  gRPC   │  Coordinator │  gRPC   │ Microservice│
│         │────────▶│   (Server)   │────────▶│   (Client)  │
└─────────┘         └──────────────┘         └─────────────┘
                     
                     1. RAG שולח Route request
                     2. Coordinator מנתב באמצעות AI
                     3. Coordinator קורא למיקרו-שירות
                     4. תגובה חוזרת דרך אותו מסלול
```

---

## ⚙️ משתני סביבה נדרשים

### משתנים חובה (אופציונליים - יש ברירות מחדל)

| משתנה | ברירת מחדל | תיאור |
|--------|------------|--------|
| `GRPC_ENABLED` | `true` | האם להפעיל את שרת gRPC |
| `GRPC_PORT` | `50051` | פורט שרת gRPC |

### הגדרת משתני סביבה

#### ב-`.env`:

```bash
# gRPC Configuration
GRPC_ENABLED=true
GRPC_PORT=50051
```

#### ב-Railway/Production:

```bash
GRPC_ENABLED=true
GRPC_PORT=50051
```

#### ב-Docker:

```yaml
environment:
  - GRPC_ENABLED=true
  - GRPC_PORT=50051
```

### הערות חשובות:

1. **`GRPC_ENABLED`**:
   - אם מוגדר ל-`false`, שרת gRPC לא יופעל
   - ברירת מחדל: `true` (מופעל)
   - אם המשתנה לא מוגדר, השרת יופעל

2. **`GRPC_PORT`**:
   - פורט שרת gRPC
   - ברירת מחדל: `50051`
   - חייב להיות מספר תקין
   - אם מוגדר לערך לא תקין, ישתמש ב-50051

---

## 🏗️ ארכיטקטורת התקשורת

### קבצי Proto

1. **`coordinator.proto`** - הגדרת שירות Coordinator
   - מיקום: `src/grpc/proto/coordinator.proto`
   - Package: `rag.v1`
   - Service: `CoordinatorService`
   - Method: `Route`

2. **`microservice.proto`** - הגדרת API של מיקרו-שירותים
   - מיקום: `src/grpc/proto/microservice.proto`
   - Package: `microservice.v1`
   - Service: `MicroserviceAPI`
   - Method: `Process`

### קבצי קוד

1. **שרת gRPC** (`src/grpc/server.js`):
   - יוצר ומפעיל את שרת gRPC
   - מאזין על פורט 50051 (או `GRPC_PORT`)
   - מטפל בבקשות Route מ-RAG

2. **לקוח gRPC** (`src/grpc/client.js`):
   - יוצר לקוחות gRPC למיקרו-שירותים
   - מנהל cache של לקוחות
   - מטפל בקריאות Process למיקרו-שירותים

3. **Handler** (`src/grpc/services/coordinator.service.js`):
   - מטפל בבקשות Route מ-RAG
   - משתמש ב-AI Routing כדי למצוא שירותים
   - קורא למיקרו-שירותים דרך gRPC

### המרת פורטים

כאשר Coordinator מתקשר עם מיקרו-שירות:
- אם ה-endpoint הוא `service:5000` (HTTP)
- הלקוח ימיר אוטומטית ל-`service:5051` (gRPC)
- הנוסחה: `grpcPort = httpPort + 51`

**דוגמה:**
- HTTP: `payment-service:5000` → gRPC: `payment-service:5051`
- HTTP: `user-service:4000` → gRPC: `user-service:4051`

---

## 💻 דוגמאות שימוש

### 1. בדיקת שרת gRPC

```bash
# בדיקה שהשרת רץ
grpcurl -plaintext localhost:50051 list

# קריאה ל-Route method
grpcurl -plaintext \
  -d '{
    "tenant_id": "tenant-123",
    "user_id": "user-456",
    "query_text": "process payment for order 789"
  }' \
  localhost:50051 rag.v1.CoordinatorService/Route
```

### 2. שימוש ב-Node.js Client

```javascript
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// טעינת proto
const packageDefinition = protoLoader.loadSync(
  './coordinator.proto',
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  }
);

const proto = grpc.loadPackageDefinition(packageDefinition).rag.v1;

// יצירת לקוח
const client = new proto.CoordinatorService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

// קריאה ל-Route
const request = {
  tenant_id: 'tenant-123',
  user_id: 'user-456',
  query_text: 'process payment for order 789',
  metadata: {
    source: 'rag',
    priority: 'high'
  }
};

client.Route(request, (error, response) => {
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Target services:', response.target_services);
  console.log('Envelope:', response.envelope_json);
});
```

### 3. שימוש ב-Python Client

```python
import grpc
from grpc_proto import coordinator_pb2, coordinator_pb2_grpc

# יצירת channel
channel = grpc.insecure_channel('localhost:50051')

# יצירת stub
stub = coordinator_pb2_grpc.CoordinatorServiceStub(channel)

# יצירת request
request = coordinator_pb2.RouteRequest(
    tenant_id='tenant-123',
    user_id='user-456',
    query_text='process payment for order 789',
    metadata={'source': 'rag', 'priority': 'high'}
)

# קריאה ל-Route
response = stub.Route(request)

print('Target services:', response.target_services)
print('Envelope:', response.envelope_json)
```

---

## 🔧 פתרון בעיות

### בעיה: שרת gRPC לא מתחיל

**תסמינים:**
- לא רואים הודעה "gRPC server started successfully"
- שגיאות binding בפורט

**פתרונות:**

1. בדוק ש-`GRPC_ENABLED=true` (או לא מוגדר)
2. בדוק ש-`GRPC_PORT` הוא מספר תקין
3. בדוק שהפורט לא תפוס: `netstat -an | grep 50051`
4. בדוק את הלוגים לשגיאות

### בעיה: לא מצליח להתחבר ל-gRPC

**תסמינים:**
- Connection refused
- Timeout errors

**פתרונות:**

1. ודא שהשרת רץ: בדוק לוגים
2. בדוק firewall rules
3. ודא שאתה משתמש בפורט הנכון
4. בדוק network connectivity

### בעיה: שגיאות Proto

**תסמינים:**
- "Failed to load CoordinatorService"
- "proto definition not found"

**פתרונות:**

1. ודא ש-`coordinator.proto` קיים ב-`src/grpc/proto/`
2. בדוק שהמבנה של proto תקין
3. ודא שה-package name נכון: `rag.v1`

### בעיה: מיקרו-שירות לא מגיב

**תסמינים:**
- gRPC call timeout
- Connection errors

**פתרונות:**

1. בדוק שה-endpoint נכון
2. ודא שהמיקרו-שירות תומך ב-gRPC
3. בדוק שהפורט gRPC של המיקרו-שירות פתוח
4. בדוק network connectivity

---

## 📊 דיאגרמת זרימה

```
┌─────────────────────────────────────────────────────────┐
│                    RAG System                           │
│  (שולח Route request דרך gRPC)                          │
└────────────────────┬────────────────────────────────────┘
                     │ gRPC (port 50051)
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Coordinator gRPC Server                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │  CoordinatorService.Route Handler                │  │
│  │  1. יוצר Universal Envelope                    │  │
│  │  2. מחפש שירותים פעילים                        │  │
│  │  3. מנתב באמצעות AI Routing                    │  │
│  │  4. קורא למיקרו-שירותים                        │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │ gRPC (port 5051, 4051, etc.)
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Microservice (gRPC Server)                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │  MicroserviceAPI.Process Handler                │  │
│  │  - מקבל Universal Envelope                      │  │
│  │  - מעבד את הבקשה                                │  │
│  │  - מחזיר תגובה                                   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist להגדרת gRPC

- [ ] הגדרת `GRPC_ENABLED=true` (או השארת ברירת מחדל)
- [ ] הגדרת `GRPC_PORT=50051` (או פורט אחר)
- [ ] בדיקה שהשרת מתחיל בהצלחה
- [ ] בדיקת חיבור עם `grpcurl` או client אחר
- [ ] בדיקה שהמיקרו-שירותים תומכים ב-gRPC
- [ ] בדיקת network connectivity
- [ ] בדיקת firewall rules

---

## 📚 משאבים נוספים

- **API Documentation**: `API_DOCUMENTATION.md`
- **Microservice Registration**: `MICROSERVICE_REGISTRATION_GUIDE.md`
- **Dual Protocol Support**: `docs/features/03-dual-protocol-support.md`
- **Communication Services**: `docs/features/10-communication-services.md`

---

**שאלות?** בדוק את הלוגים או פנה לצוות הליבה.






