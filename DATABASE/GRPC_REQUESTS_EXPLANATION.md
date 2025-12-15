# הסבר: איך נראות בקשות gRPC לכל מיקרוסרוויס

## סקירה כללית

במערכת RAG, יש תקשורת gRPC בין מספר מיקרוסרוויסים:
1. **RAG Service** → שולח בקשות ל-Coordinator
2. **Coordinator** → מקבל בקשות מ-RAG ומנתב למיקרוסרוויסים אחרים
3. **מיקרוסרוויסים אחרים** (Assessment, DevLab, וכו') → מקבלים בקשות דרך Coordinator

---

## 1. בקשה מ-RAG ל-Coordinator

### מבנה הבקשה (RouteRequest)

כאשר RAG שולח בקשה ל-Coordinator, הבקשה נראית כך:

```protobuf
message RouteRequest {
  string tenant_id = 1;                    // מזהה tenant
  string user_id = 2;                      // מזהה משתמש
  string query_text = 3;                   // השאילתה המקורית של המשתמש
  string requester_service = 4;            // "rag-service"
  map<string, string> context = 5;         // הקשר נוסף (metadata)
  string envelope_json = 6;                // Universal Envelope כ-JSON string
}
```

### דוגמה קונקרטית בקוד JavaScript:

```javascript
const request = {
  tenant_id: 'tenant-123',
  user_id: 'user-456',
  query_text: 'מה הציונים שלי?',
  requester_service: 'rag-service',
  context: {
    category: 'assessment',
    source: 'rag_fallback',
    vector_results_count: '0'
  },
  envelope_json: JSON.stringify({
    version: '1.0',
    timestamp: '2025-01-27T10:00:00.000Z',
    request_id: 'rag-1234567890-abc123',
    tenant_id: 'tenant-123',
    user_id: 'user-456',
    source: 'rag-service',
    payload: {
      query_text: 'מה הציונים שלי?',
      metadata: { category: 'assessment' }
    }
  })
};
```

### Metadata (Headers) שנשלחים עם הבקשה:

```javascript
const metadata = {
  'x-signature': 'signature-string-here',      // חתימה דיגיטלית
  'x-service-name': 'rag-service',             // שם השירות
  'x-timestamp': '1706352000000',              // timestamp
  'x-requester-service': 'rag-service'          // שירות המבקש
};
```

### איך Coordinator רואה את הבקשה:

Coordinator מקבל:
- **Service Path**: `/rag.v1.CoordinatorService/Route`
- **Request Body**: אובייקט `RouteRequest` עם כל השדות לעיל
- **Metadata**: Headers עם חתימה ואימות
- **Credentials**: SSL/TLS או insecure (תלוי בסביבה)

---

## 2. בקשה מ-Coordinator למיקרוסרוויסים אחרים

### תהליך הניתוב:

1. Coordinator מקבל את `RouteRequest` מ-RAG (gRPC)
2. Coordinator מנתח את `query_text` ו-`envelope_json`
3. Coordinator יוצר Universal Envelope
4. Coordinator מחפש שירותים פעילים ב-Registry
5. Coordinator מסנן שירותים (מסיר את RAG/requester)
6. Coordinator משתמש ב-AI Routing כדי להחליט לאיזה מיקרוסרוויסים לשלוח
7. Coordinator שולח בקשות **gRPC** למיקרוסרוויסים (Cascading Fallback)

### ✅ פרוטוקול התקשורת - gRPC לכל התקשורת:

**לפי התיעוד הרשמי של Coordinator**:
- Coordinator **שולח gRPC requests** למיקרוסרוויסים, לא HTTP!
- Coordinator משתמש ב-`MicroserviceAPI.Process` RPC
- כל התקשורת היא gRPC: RAG → Coordinator → מיקרוסרוויסים

### מבנה הבקשה gRPC שמיקרוסרוויס מקבל:

**Service**: `microservice.v1.MicroserviceAPI`  
**RPC Method**: `Process`

```protobuf
message ProcessRequest {
  string envelope_json = 1;  // Universal Envelope כ-JSON string
}

message ProcessResponse {
  bool success = 1;
  string error = 2;
  string envelope_json = 3;  // תשובה ב-Envelope format
}
```

**דוגמה לבקשה**:
```javascript
const request = {
  envelope_json: JSON.stringify({
    version: '1.0',
    timestamp: '2025-01-27T10:00:00.000Z',
    request_id: 'rag-1234567890-abc123',
    tenant_id: 'tenant-123',
    user_id: 'user-456',
    source: 'rag',
    payload: {
      query: 'מה הציונים שלי?',
      metadata: { category: 'assessment' },
      context: {
        protocol: 'grpc',
        source: 'rag'
      }
    }
  })
};
```

**התהליך**:
1. Coordinator קורא ל-`Process` RPC על המיקרוסרוויס
2. שולח את ה-Envelope כ-JSON string
3. מקבל תשובה עם `success`, `error`, ו-`envelope_json`
4. מעריך את איכות התשובה
5. אם התשובה טובה - עוצר, אחרת ממשיך למיקרוסרוויס הבא (Cascading Fallback)

---

## 3. מבנה ה-Universal Envelope

ה-Universal Envelope הוא מבנה סטנדרטי שמכיל את כל המידע הנדרש:

```json
{
  "version": "1.0",
  "timestamp": "2025-01-27T10:00:00.000Z",
  "request_id": "rag-1234567890-abc123",
  "tenant_id": "tenant-123",
  "user_id": "user-456",
  "source": "rag-service",
  "payload": {
    "query_text": "מה הציונים שלי?",
    "metadata": {
      "category": "assessment",
      "source": "rag_fallback",
      "vector_results_count": "0"
    }
  }
}
```

### איפה ה-Envelope נמצא:

1. **ב-gRPC request ל-Coordinator**: 
   - השדה `envelope_json` ב-`RouteRequest` מכיל את ה-Envelope כ-JSON string

2. **ב-gRPC request למיקרוסרוויסים**:
   - Coordinator שולח את ה-Envelope כ-JSON string בשדה `envelope_json` של `ProcessRequest`

---

## 4. תשובה מ-Coordinator ל-RAG

### מבנה התשובה (RouteResponse):

```protobuf
message RouteResponse {
  repeated string target_services = 1;     // רשימת מיקרוסרוויסים שנקראו
  map<string, string> normalized_fields = 2; // שדות מנורמלים מהמיקרוסרוויסים
  string envelope_json = 3;                 // JSON string עם ה-envelope payload
  string routing_metadata = 4;             // metadata נוסף (JSON string)
}
```

### דוגמה לתשובה:

```javascript
{
  target_services: ['assessment-service', 'analytics-service'],
  normalized_fields: {
    successful_service: 'assessment-service',
    rank_used: '1',
    quality_score: '0.95',
    total_attempts: '2'
  },
  envelope_json: '{"data": {...}}',
  routing_metadata: '{"routing_time_ms": 150}'
}
```

---

## 5. איך נראית הבקשה לכל מיקרוסרוויס - פירוט מלא

### מבנה הבקשה gRPC שכל מיקרוסרוויס מקבל

כאשר Coordinator קורא למיקרוסרוויס, הוא שולח בקשה דרך gRPC עם המבנה הבא:

#### Proto Definition:

```protobuf
service MicroserviceAPI {
  rpc Process (ProcessRequest) returns (ProcessResponse);
}

message ProcessRequest {
  string envelope_json = 1;  // Universal Envelope כ-JSON string
}

message ProcessResponse {
  bool success = 1;           // האם הבקשה הצליחה
  string error = 2;           // הודעת שגיאה (אם יש)
  string envelope_json = 3;   // תשובה ב-Envelope format (JSON string)
}
```

#### דוגמה קונקרטית - מה המיקרוסרוויס מקבל:

```javascript
// Coordinator שולח:
const grpcRequest = {
  envelope_json: JSON.stringify({
    version: '1.0',
    timestamp: '2025-01-27T10:30:45.123Z',
    request_id: 'coordinator-1234567890-abc123',
    tenant_id: 'tenant-123',
    user_id: 'user-456',
    source: 'coordinator',
    payload: {
      query: 'מה הציונים שלי?',
      metadata: {
        category: 'assessment',
        source: 'rag_fallback',
        vector_results_count: '0'
      },
      context: {
        protocol: 'grpc',
        source: 'rag',
        requester_service: 'rag-service',
        ai_confidence: '0.95',
        ai_rank: '1'
      }
    }
  })
};

// המיקרוסרוויס מקבל את זה דרך gRPC:
// Service: microservice.v1.MicroserviceAPI
// Method: Process
// Request: ProcessRequest { envelope_json: "..." }
```

### מה יש בתוך ה-Envelope?

ה-Universal Envelope מכיל את כל המידע שהמיקרוסרוויס צריך:

```json
{
  "version": "1.0",
  "timestamp": "2025-01-27T10:30:45.123Z",
  "request_id": "coordinator-1234567890-abc123",
  "tenant_id": "tenant-123",
  "user_id": "user-456",
  "source": "coordinator",
  "payload": {
    "query": "מה הציונים שלי?",
    "metadata": {
      "category": "assessment",
      "source": "rag_fallback",
      "vector_results_count": "0"
    },
    "context": {
      "protocol": "grpc",
      "source": "rag",
      "requester_service": "rag-service",
      "ai_confidence": "0.95",
      "ai_rank": "1",
      "routing_strategy": "cascading_fallback"
    }
  }
}
```

**שדות חשובים**:
- `request_id`: מזהה ייחודי לבקשה (למעקב ולוגים)
- `tenant_id`: מזהה tenant (לבידוד נתונים)
- `user_id`: מזהה משתמש (להרשאות)
- `payload.query`: השאילתה המקורית
- `payload.metadata`: metadata נוסף
- `payload.context`: הקשר על התהליך (איזה שירות ביקש, confidence, וכו')

### איך המיקרוסרוויס צריך להגיב?

המיקרוסרוויס צריך להחזיר `ProcessResponse`:

```javascript
// תשובה מוצלחת:
const successResponse = {
  success: true,
  error: '',  // ריק אם הצליח
  envelope_json: JSON.stringify({
    version: '1.0',
    timestamp: new Date().toISOString(),
    request_id: originalEnvelope.request_id,  // אותו request_id
    tenant_id: originalEnvelope.tenant_id,
    user_id: originalEnvelope.user_id,
    source: 'assessment-service',  // שם המיקרוסרוויס
    payload: {
      data: {
        // הנתונים שהמיקרוסרוויס מחזיר
        assessments: [
          {
            id: 'assessment-1',
            title: 'מבחן מתמטיקה',
            score: 85,
            date: '2025-01-20'
          }
        ]
      },
      metadata: {
        processing_time_ms: 150,
        source: 'assessment-service'
      }
    }
  })
};

// תשובה עם שגיאה:
const errorResponse = {
  success: false,
  error: 'Assessment not found',
  envelope_json: JSON.stringify({
    version: '1.0',
    timestamp: new Date().toISOString(),
    request_id: originalEnvelope.request_id,
    tenant_id: originalEnvelope.tenant_id,
    user_id: originalEnvelope.user_id,
    source: 'assessment-service',
    payload: {
      error: 'Assessment not found',
      metadata: {
        error_code: 'NOT_FOUND',
        processing_time_ms: 50
      }
    }
  })
};
```

### דוגמאות ספציפיות לכל מיקרוסרוויס

#### 1. Assessment Service

**בקשה**:
```json
{
  "envelope_json": "{\"version\":\"1.0\",\"timestamp\":\"2025-01-27T10:30:45.123Z\",\"request_id\":\"req-123\",\"tenant_id\":\"tenant-123\",\"user_id\":\"user-456\",\"source\":\"coordinator\",\"payload\":{\"query\":\"מה הציונים שלי?\",\"metadata\":{\"category\":\"assessment\"},\"context\":{\"protocol\":\"grpc\",\"source\":\"rag\"}}}"
}
```

**תשובה**:
```json
{
  "success": true,
  "error": "",
  "envelope_json": "{\"version\":\"1.0\",\"timestamp\":\"2025-01-27T10:30:50.456Z\",\"request_id\":\"req-123\",\"tenant_id\":\"tenant-123\",\"user_id\":\"user-456\",\"source\":\"assessment-service\",\"payload\":{\"data\":{\"assessments\":[{\"id\":\"assess-1\",\"title\":\"מבחן מתמטיקה\",\"score\":85,\"date\":\"2025-01-20\"}]},\"metadata\":{\"processing_time_ms\":150}}}"
}
```

#### 2. DevLab Service

**בקשה**:
```json
{
  "envelope_json": "{\"version\":\"1.0\",\"timestamp\":\"2025-01-27T10:30:45.123Z\",\"request_id\":\"req-124\",\"tenant_id\":\"tenant-123\",\"user_id\":\"user-456\",\"source\":\"coordinator\",\"payload\":{\"query\":\"עזור לי עם שגיאת קומפילציה ב-Python\",\"metadata\":{\"category\":\"devlab\",\"language\":\"python\"},\"context\":{\"protocol\":\"grpc\",\"source\":\"rag\"}}}"
}
```

**תשובה**:
```json
{
  "success": true,
  "error": "",
  "envelope_json": "{\"version\":\"1.0\",\"timestamp\":\"2025-01-27T10:30:50.789Z\",\"request_id\":\"req-124\",\"tenant_id\":\"tenant-123\",\"user_id\":\"user-456\",\"source\":\"devlab-service\",\"payload\":{\"data\":{\"explanation\":\"השגיאה נובעת מ...\",\"suggestions\":[\"בדוק את התחביר\",\"ודא שהפונקציה מוגדרת\"]},\"metadata\":{\"processing_time_ms\":200}}}"
}
```

#### 3. Analytics Service

**בקשה**:
```json
{
  "envelope_json": "{\"version\":\"1.0\",\"timestamp\":\"2025-01-27T10:30:45.123Z\",\"request_id\":\"req-125\",\"tenant_id\":\"tenant-123\",\"user_id\":\"user-456\",\"source\":\"coordinator\",\"payload\":{\"query\":\"הצג לי את ההתקדמות שלי\",\"metadata\":{\"category\":\"analytics\"},\"context\":{\"protocol\":\"grpc\",\"source\":\"rag\"}}}"
}
```

**תשובה**:
```json
{
  "success": true,
  "error": "",
  "envelope_json": "{\"version\":\"1.0\",\"timestamp\":\"2025-01-27T10:30:51.012Z\",\"request_id\":\"req-125\",\"tenant_id\":\"tenant-123\",\"user_id\":\"user-456\",\"source\":\"analytics-service\",\"payload\":{\"data\":{\"progress\":{\"completed_courses\":5,\"in_progress\":2,\"completion_rate\":0.75}},\"metadata\":{\"processing_time_ms\":180}}}"
}
```

### תהליך הקריאה - צעד אחר צעד

#### מצד Coordinator:

```javascript
// 1. Coordinator יוצר Envelope
const envelope = {
  version: '1.0',
  timestamp: new Date().toISOString(),
  request_id: generateRequestId(),
  tenant_id: request.tenant_id,
  user_id: request.user_id,
  source: 'coordinator',
  payload: {
    query: request.query_text,
    metadata: request.metadata || {},
    context: {
      protocol: 'grpc',
      source: 'rag',
      requester_service: 'rag-service',
      ai_confidence: routingResult.confidence,
      ai_rank: '1'
    }
  }
};

// 2. Coordinator קורא למיקרוסרוויס
const grpcRequest = {
  envelope_json: JSON.stringify(envelope)
};

// 3. שולח דרך gRPC
const client = getGrpcClient(serviceName, endpoint);
const response = await new Promise((resolve, reject) => {
  const deadline = new Date(Date.now() + 30000); // 30 שניות timeout
  
  client.Process(grpcRequest, { deadline }, (error, response) => {
    if (error) {
      reject(error);
    } else {
      resolve(response);
    }
  });
});

// 4. מעריך את התשובה
if (response.success) {
  const responseEnvelope = JSON.parse(response.envelope_json);
  const quality = assessQuality(responseEnvelope);
  
  if (quality >= QUALITY_THRESHOLD) {
    return response; // ✅ תשובה טובה - עוצר כאן
  }
  // אחרת ממשיך למיקרוסרוויס הבא
}
```

#### מצד המיקרוסרוויס:

```javascript
// 1. המיקרוסרוויס מקבל את הבקשה
async function handleProcess(call, callback) {
  const request = call.request;
  
  // 2. מפענח את ה-Envelope
  const envelope = JSON.parse(request.envelope_json);
  
  // 3. מחלץ את המידע
  const { tenant_id, user_id, payload } = envelope;
  const query = payload.query;
  const metadata = payload.metadata || {};
  
  // 4. מבצע את הלוגיקה
  try {
    const result = await processQuery(query, {
      tenantId: tenant_id,
      userId: user_id,
      metadata: metadata
    });
    
    // 5. בונה תשובה
    const responseEnvelope = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      request_id: envelope.request_id,  // אותו request_id!
      tenant_id: envelope.tenant_id,
      user_id: envelope.user_id,
      source: 'assessment-service',  // שם המיקרוסרוויס
      payload: {
        data: result,
        metadata: {
          processing_time_ms: Date.now() - startTime
        }
      }
    };
    
    // 6. מחזיר תשובה
    callback(null, {
      success: true,
      error: '',
      envelope_json: JSON.stringify(responseEnvelope)
    });
    
  } catch (error) {
    // 7. מטפל בשגיאות
    callback(null, {
      success: false,
      error: error.message,
      envelope_json: JSON.stringify({
        version: '1.0',
        timestamp: new Date().toISOString(),
        request_id: envelope.request_id,
        tenant_id: envelope.tenant_id,
        user_id: envelope.user_id,
        source: 'assessment-service',
        payload: {
          error: error.message,
          metadata: {
            error_code: error.code || 'UNKNOWN'
          }
        }
      })
    });
  }
}
```

### איך המיקרוסרוויס יודע מה לעשות? (Query Understanding)

המיקרוסרוויס מקבל בקשה דרך `Process` RPC, אבל איך הוא יודע מה לעשות עם זה?

#### 1. **מידע זמין למיקרוסרוויס**

המיקרוסרוויס מקבל את המידע הבא ב-Envelope:

```javascript
{
  payload: {
    query: "מה הציונים שלי?",  // השאילתה הטקסטואלית
    metadata: {
      category: "assessment",   // קטגוריה (אם Coordinator זיהה)
      source: "rag_fallback",
      // ... metadata נוסף
    },
    context: {
      protocol: "grpc",
      source: "rag",
      requester_service: "rag-service",
      ai_confidence: "0.95",     // כמה Coordinator בטוח שזה השירות הנכון
      ai_rank: "1"              // דירוג השירות (1 = הכי רלוונטי)
    }
  }
}
```

#### 2. **אסטרטגיות להבנת הבקשה**

המיקרוסרוויס יכול להשתמש בכמה אסטרטגיות:

##### אסטרטגיה A: ניתוח Query טקסטואלי (NLP)

המיקרוסרוויס מנתח את ה-`query` הטקסטואלי:

```javascript
async function handleProcess(call, callback) {
  const envelope = JSON.parse(call.request.envelope_json);
  const query = envelope.payload.query;
  
  // ניתוח השאילתה
  if (query.includes('ציונים') || query.includes('מבחן') || query.includes('ציון')) {
    // זה בקשה על assessments
    return await handleAssessmentQuery(envelope);
  } else if (query.includes('קוד') || query.includes('שגיאה') || query.includes('תכנות')) {
    // זה בקשה על devlab
    return await handleDevLabQuery(envelope);
  } else {
    // שאילתה כללית - מנסה להבין
    return await handleGeneralQuery(envelope);
  }
}
```

##### אסטרטגיה B: שימוש ב-Metadata Category

המיקרוסרוויס משתמש ב-`metadata.category` כדי לדעת איזה handler לקרוא:

```javascript
async function handleProcess(call, callback) {
  const envelope = JSON.parse(call.request.envelope_json);
  const category = envelope.payload.metadata?.category;
  
  // routing לפי category
  switch (category) {
    case 'assessment':
      return await handleAssessmentQuery(envelope);
    case 'devlab':
      return await handleDevLabQuery(envelope);
    case 'analytics':
      return await handleAnalyticsQuery(envelope);
    default:
      // ניתוח טקסטואלי אם אין category
      return await analyzeAndHandleQuery(envelope);
  }
}
```

##### אסטרטגיה C: Endpoint אחד עם לוגיקה פנימית

המיקרוסרוויס משתמש ב-`Process` endpoint אחד שמכיל את כל הלוגיקה:

```javascript
async function handleProcess(call, callback) {
  const envelope = JSON.parse(call.request.envelope_json);
  const { query, metadata, context } = envelope.payload;
  
  // 1. חילוץ פרמטרים מהשאילתה
  const params = extractParameters(query, metadata);
  
  // 2. זיהוי פעולה (action)
  const action = identifyAction(query, metadata.category);
  // action יכול להיות: 'get_assessments', 'get_progress', 'help_with_code', וכו'
  
  // 3. ביצוע הפעולה
  const result = await executeAction(action, params, {
    tenantId: envelope.tenant_id,
    userId: envelope.user_id
  });
  
  // 4. החזרת תשובה
  return buildResponse(envelope, result);
}
```

#### 3. **דוגמה מלאה - Assessment Service**

```javascript
// Assessment Service - איך הוא מבין מה לעשות
async function handleProcess(call, callback) {
  try {
    const envelope = JSON.parse(call.request.envelope_json);
    const { query, metadata, context } = envelope.payload;
    
    // שלב 1: זיהוי סוג הבקשה
    const requestType = identifyRequestType(query, metadata);
    // יכול להיות: 'get_scores', 'get_assessments', 'get_progress', וכו'
    
    // שלב 2: חילוץ פרמטרים
    const params = {
      tenantId: envelope.tenant_id,
      userId: envelope.user_id,
      // פרמטרים נוספים מהשאילתה
      ...extractQueryParams(query)
    };
    
    // שלב 3: ביצוע פעולה
    let result;
    switch (requestType) {
      case 'get_scores':
        result = await getScores(params);
        break;
      case 'get_assessments':
        result = await getAssessments(params);
        break;
      case 'get_progress':
        result = await getProgress(params);
        break;
      default:
        // ניתוח כללי
        result = await handleGeneralQuery(query, params);
    }
    
    // שלב 4: בניית תשובה
    const responseEnvelope = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      request_id: envelope.request_id,
      tenant_id: envelope.tenant_id,
      user_id: envelope.user_id,
      source: 'assessment-service',
      payload: {
        data: result,
        metadata: {
          request_type: requestType,
          processing_time_ms: Date.now() - startTime
        }
      }
    };
    
    callback(null, {
      success: true,
      error: '',
      envelope_json: JSON.stringify(responseEnvelope)
    });
    
  } catch (error) {
    callback(null, {
      success: false,
      error: error.message,
      envelope_json: JSON.stringify({
        // ... error envelope
      })
    });
  }
}

// פונקציות עזר
function identifyRequestType(query, metadata) {
  const lowerQuery = query.toLowerCase();
  
  // בדיקה לפי מילות מפתח
  if (lowerQuery.includes('ציונים') || lowerQuery.includes('scores')) {
    return 'get_scores';
  }
  if (lowerQuery.includes('מבחנים') || lowerQuery.includes('assessments')) {
    return 'get_assessments';
  }
  if (lowerQuery.includes('התקדמות') || lowerQuery.includes('progress')) {
    return 'get_progress';
  }
  
  // fallback - ניתוח כללי
  return 'general';
}

function extractQueryParams(query) {
  // חילוץ פרמטרים מהשאילתה
  // למשל: "מה הציונים שלי מהחודש האחרון?"
  // → { timeRange: 'last_month' }
  
  const params = {};
  
  if (query.includes('אחרון') || query.includes('recent')) {
    params.timeRange = 'recent';
  }
  if (query.includes('חודש') || query.includes('month')) {
    params.timeRange = 'month';
  }
  
  return params;
}
```

#### 4. **דוגמה - DevLab Service**

```javascript
// DevLab Service - איך הוא מבין מה לעשות
async function handleProcess(call, callback) {
  const envelope = JSON.parse(call.request.envelope_json);
  const { query, metadata } = envelope.payload;
  
  // זיהוי סוג הבקשה
  const requestType = identifyDevLabRequest(query, metadata);
  // יכול להיות: 'explain_error', 'code_review', 'best_practices', 'concept_explanation'
  
  // חילוץ פרמטרים
  const params = {
    tenantId: envelope.tenant_id,
    userId: envelope.user_id,
    language: metadata.language || extractLanguage(query),
    code: metadata.code || null,
    errorMessage: metadata.error_message || extractError(query)
  };
  
  // ביצוע פעולה
  let result;
  switch (requestType) {
    case 'explain_error':
      result = await explainError(params);
      break;
    case 'code_review':
      result = await reviewCode(params);
      break;
    case 'best_practices':
      result = await suggestBestPractices(params);
      break;
    default:
      result = await handleGeneralDevLabQuery(query, params);
  }
  
  // החזרת תשובה...
}

function identifyDevLabRequest(query, metadata) {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('שגיאה') || lowerQuery.includes('error')) {
    return 'explain_error';
  }
  if (lowerQuery.includes('ביקורת') || lowerQuery.includes('review')) {
    return 'code_review';
  }
  if (lowerQuery.includes('best practices') || lowerQuery.includes('מומלץ')) {
    return 'best_practices';
  }
  
  return 'general';
}
```

#### 5. **שימוש ב-AI/LLM להבנת Query**

מיקרוסרוויס יכול להשתמש ב-AI כדי להבין את השאילתה:

```javascript
async function handleProcess(call, callback) {
  const envelope = JSON.parse(call.request.envelope_json);
  const query = envelope.payload.query;
  
  // שימוש ב-AI להבנת השאילתה
  const understanding = await aiService.understandQuery(query, {
    service: 'assessment-service',
    availableActions: ['get_scores', 'get_assessments', 'get_progress']
  });
  
  // understanding = {
  //   action: 'get_scores',
  //   confidence: 0.95,
  //   parameters: { timeRange: 'recent' }
  // }
  
  // ביצוע הפעולה
  const result = await executeAction(understanding.action, understanding.parameters);
  
  // החזרת תשובה...
}
```

#### 6. **סיכום - איך המיקרוסרוויס יודע מה לעשות**

המיקרוסרוויס משתמש בכמה מקורות מידע:

1. **`payload.query`** - השאילתה הטקסטואלית
   - ניתוח NLP/מילות מפתח
   - שימוש ב-AI/LLM להבנה

2. **`payload.metadata.category`** - קטגוריה (אם יש)
   - routing ישיר לפי category
   - עוזר לזהות את סוג הבקשה

3. **`payload.metadata.*`** - metadata נוסף
   - פרמטרים ספציפיים (language, code, error_message, וכו')
   - עוזר להבין את ההקשר

4. **`payload.context`** - הקשר
   - `ai_confidence` - כמה Coordinator בטוח
   - `ai_rank` - דירוג השירות
   - עוזר להבין את איכות הבקשה

5. **לוגיקה פנימית של המיקרוסרוויס**
   - כל מיקרוסרוויס מכיר את ה-capabilities שלו
   - הוא יודע לזהות איזה פעולות הוא יכול לבצע
   - הוא מנסה להתאים את השאילתה לפעולות הזמינות

**הערה חשובה**: המיקרוסרוויס **לא צריך** endpoint ספציפי - הוא משתמש ב-`Process` endpoint אחד, ומחליט פנימית מה לעשות לפי המידע ב-Envelope.

---

## 6. הגדרת Schema/Contract - אופציות שונות

### ⚠️ הערה חשובה

לפני שאנחנו מחליטים על הפתרון, בואו נבין מה קיים בפועל:

**מה קיים כרגע**:
- ✅ Coordinator מחזיר `normalized_fields` - שדות מנורמלים
- ✅ RAG מפרש את `normalized_fields` דינמית (`schemaInterpreter.service.js`)
- ✅ יש registration scripts אבל **לא רואים schema registration**
- ❓ לא ברור אם Coordinator שומר schemas

**השאלה**: איך להגדיר schema בצורה הטובה ביותר?

### אופציה 1: דרך Coordinator (אידיאלי, אבל דורש שינויים)

**רעיון**: Coordinator שומר schemas ב-Service Registry

**יתרונות**:
- ✅ Single Source of Truth
- ✅ Centralized Management
- ✅ Dynamic Discovery
- ✅ Consistency

**חסרונות**:
- ❌ דורש שינויים ב-Coordinator (הוספת schema storage)
- ❌ דורש הוספת RPC חדש (`GetServiceSchema`)
- ❌ דורש שינוי registration process

**מתי להשתמש**: אם יש לך גישה ל-Coordinator ואתה יכול להוסיף את הפיצ'ר הזה

### אופציה 2: ב-RAG (פשוט יותר, אבל duplication)

**רעיון**: RAG שומר schemas בקוד שלו

**יתרונות**:
- ✅ פשוט ליישום - לא דורש שינויים ב-Coordinator
- ✅ RAG שולט על מה הוא מצפה
- ✅ יכול לעדכן בלי לחכות ל-Coordinator

**חסרונות**:
- ❌ Duplication - אם schema משתנה, צריך לעדכן ב-RAG
- ❌ לא dynamic - צריך לעדכן קוד כשנוסף מיקרוסרוויס חדש
- ❌ לא Single Source of Truth

**מתי להשתמש**: אם אין לך גישה ל-Coordinator או אם אתה רוצה פתרון מהיר

### אופציה 3: דרך normalized_fields (הכי פשוט, אבל פחות type-safe)

**רעיון**: להשתמש ב-`normalized_fields` שכבר קיים, ולהגדיר convention

**יתרונות**:
- ✅ כבר קיים - לא דורש שינויים
- ✅ Coordinator כבר מנרמל תשובות
- ✅ פשוט מאוד

**חסרונות**:
- ❌ פחות type-safe
- ❌ אין validation מראש
- ❌ תלוי ב-Coordinator שינמל נכון

**מתי להשתמש**: אם אתה רוצה פתרון מינימלי ללא שינויים

### המלצה: התחל פשוט, שדרג בהמשך

**שלב 1 (עכשיו)**: השתמש ב-`normalized_fields` הקיים + הגדר convention
- תעד מה אתה מצפה ב-`normalized_fields`
- RAG מפרש לפי convention

**שלב 2 (אם צריך)**: הוסף schema validation ב-RAG
- אם אתה רוצה יותר type safety
- אם אתה רוצה validation

**שלב 3 (אידיאלי)**: העבר ל-Coordinator
- אם יש לך גישה ל-Coordinator
- אם אתה רוצה Single Source of Truth

### המצב הנוכחי

כרגע, RAG מקבל תשובות דרך Coordinator, אבל:
- Coordinator מחזיר `normalized_fields` - שדות מנורמלים
- אין הגדרה מראש של schema
- RAG מפרש את התשובות דינמית

### הפתרון: Schema Registry ב-Coordinator

Coordinator צריך לשמור schema definitions לכל מיקרוסרוויס:

#### 1. Schema Definition ב-Coordinator Service Registry

כאשר מיקרוסרוויס נרשם ל-Coordinator, הוא מספק schema:

```javascript
// מיקרוסרוויס נרשם ל-Coordinator עם schema
const registration = {
  serviceName: 'assessment-service',
  endpoint: 'assessment-service:5051',
  capabilities: ['get_assessments', 'get_scores', 'get_progress'],
  responseSchema: {
    requiredFields: ['assessments'],
    optionalFields: ['scores', 'progress', 'recommendations'],
    structure: {
      assessments: {
        type: 'array',
        items: {
          id: { type: 'string', required: true },
          title: { type: 'string', required: true },
          score: { type: 'number', required: true, min: 0, max: 100 },
          date: { type: 'string', required: true, format: 'date-time' }
        }
      },
      scores: {
        type: 'object',
        properties: {
          average: { type: 'number', required: true },
          total: { type: 'number', required: true }
        }
      }
    }
  }
};
```

#### 2. RAG מבקש Schema מ-Coordinator

RAG יכול לבקש מה-Coordinator את ה-schema של שירות מסוים:

```protobuf
// הוספת RPC חדש ל-Coordinator
service CoordinatorService {
  rpc Route(RouteRequest) returns (RouteResponse);
  rpc GetServiceSchema(ServiceSchemaRequest) returns (ServiceSchemaResponse);  // חדש!
}

message ServiceSchemaRequest {
  string service_name = 1;  // שם המיקרוסרוויס
}

message ServiceSchemaResponse {
  string service_name = 1;
  string schema_json = 2;    // JSON Schema definition
  map<string, string> normalized_fields_template = 3;  // דוגמה ל-normalized_fields
}
```

#### 3. Coordinator מחזיר Schema

```javascript
// Coordinator מחזיר schema
const schemaResponse = {
  service_name: 'assessment-service',
  schema_json: JSON.stringify({
    requiredFields: ['assessments'],
    optionalFields: ['scores', 'progress'],
    structure: { /* ... */ }
  }),
  normalized_fields_template: {
    'assessments': '[{"id":"...","title":"...","score":85,"date":"..."}]',
    'scores': '{"average":85,"total":100}'
  }
};
```

#### 4. RAG משתמש ב-Schema ל-Validation

```javascript
// BACKEND/src/clients/coordinator.client.js

/**
 * Get service schema from Coordinator
 */
export async function getServiceSchema(serviceName) {
  const client = getGrpcClient();
  if (!client) return null;
  
  try {
    const request = { service_name: serviceName };
    const response = await grpcCall(
      client,
      'GetServiceSchema',
      request,
      {},
      GRPC_TIMEOUT
    );
    
    return {
      schema: JSON.parse(response.schema_json),
      template: response.normalized_fields_template
    };
  } catch (error) {
    logger.warn('Failed to get service schema', {
      serviceName,
      error: error.message
    });
    return null;
  }
}

/**
 * Validate response against schema
 */
export function validateResponseAgainstSchema(response, schema) {
  if (!schema) return { valid: true, errors: [] };
  
  const errors = [];
  const normalizedFields = response.normalized_fields || {};
  
  // Check required fields
  for (const field of schema.requiredFields || []) {
    if (!normalizedFields[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Validate structure
  // ... validation logic ...
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

#### 5. שימוש ב-Schema ב-RAG

```javascript
// BACKEND/src/services/coordinatorResponseParser.service.js

import { getServiceSchema, validateResponseAgainstSchema } from '../clients/coordinator.client.js';

export async function parseRouteResponse(response) {
  // ... existing parsing code ...
  
  // Get schema for successful service
  if (parsed.successful_service && parsed.successful_service !== 'none') {
    const schema = await getServiceSchema(parsed.successful_service);
    
    if (schema) {
      // Validate against schema
      const validation = validateResponseAgainstSchema(response, schema.schema);
      
      if (!validation.valid) {
        logger.warn('Response validation failed', {
          service: parsed.successful_service,
          errors: validation.errors
        });
      }
      
      // Use schema template to interpret normalized_fields
      parsed.schema = schema.schema;
      parsed.schemaTemplate = schema.template;
    }
  }
  
  return parsed;
}
```

### אופציה מתקדמת: Coordinator מנרמל לפי Schema

אפילו יותר טוב - Coordinator יכול לנרמל תשובות לפי schema:

```javascript
// Coordinator מקבל תשובה ממיקרוסרוויס
// Coordinator משתמש ב-schema כדי לנרמל את התשובה
// Coordinator מחזיר normalized_fields שכבר תואמים ל-schema

// Coordinator code (pseudo):
async function normalizeResponse(microserviceResponse, serviceSchema) {
  const envelope = JSON.parse(microserviceResponse.envelope_json);
  const data = envelope.payload?.data || {};
  
  const normalized = {};
  
  // Use schema to extract and normalize fields
  for (const field of serviceSchema.requiredFields) {
    normalized[field] = extractField(data, field, serviceSchema.structure[field]);
  }
  
  for (const field of serviceSchema.optionalFields) {
    if (data[field]) {
      normalized[field] = extractField(data, field, serviceSchema.structure[field]);
    }
  }
  
  return normalized;
}
```

### יתרונות הפתרון דרך Coordinator

1. **Single Source of Truth** ✅
   - כל ה-schemas במקום אחד (Coordinator)
   - עדכון במקום אחד משפיע על כל המערכת

2. **Dynamic Discovery** ✅
   - RAG יכול לגלות schemas חדשים אוטומטית
   - לא צריך לעדכן קוד RAG כשנוסף מיקרוסרוויס חדש

3. **Centralized Validation** ✅
   - Coordinator יכול לעשות validation לפני שהוא מחזיר ל-RAG
   - RAG מקבל תשובות שכבר תואמות ל-schema

4. **Better Documentation** ✅
   - Schema הוא חלק מה-Service Registry
   - כל מיקרוסרוויס מצהיר על ה-schema שלו בעת הרישום

5. **Consistency** ✅
   - כל המיקרוסרוויסים משתמשים באותו מנגנון
   - אותו פורמט, אותם כללים

### דוגמה: Registration עם Schema

```javascript
// מיקרוסרוויס נרשם ל-Coordinator
const registrationRequest = {
  serviceName: 'assessment-service',
  endpoint: 'assessment-service:5051',
  status: 'active',
  capabilities: ['get_assessments', 'get_scores'],
  responseSchema: {
    version: '1.0',
    requiredFields: ['assessments'],
    optionalFields: ['scores', 'progress'],
    structure: {
      assessments: {
        type: 'array',
        items: {
          id: { type: 'string', required: true },
          title: { type: 'string', required: true },
          score: { type: 'number', required: true },
          date: { type: 'string', required: true }
        }
      }
    },
    transformToRAG: {
      // איך להמיר את הנתונים לפורמט RAG
      sources: 'assessments.map(a => ({ sourceId: a.id, ... }))'
    }
  }
};

// Coordinator שומר את זה ב-Registry
await coordinator.registerService(registrationRequest);
```

### סיכום - למה Coordinator?

**Coordinator הוא המקום הנכון כי**:
1. ✅ הוא כבר שומר Service Registry
2. ✅ הוא כבר יודע מה כל מיקרוסרוויס יכול לעשות
3. ✅ הוא כבר מנרמל תשובות
4. ✅ הוא Single Source of Truth
5. ✅ RAG לא צריך לשמור schemas - הוא מקבל אותם דינמית

**הפתרון**:
1. מיקרוסרוויסים מספקים schema בעת רישום
2. Coordinator שומר schemas ב-Registry
3. RAG מבקש schema מ-Coordinator לפי הצורך
4. Coordinator יכול לנרמל תשובות לפי schema
5. RAG משתמש ב-schema ל-validation ו-interpretation

### הפתרון: הגדרת Schema/Contract

אתה יכול להגדיר schema/contract שמצהיר על המידע שאתה מצפה מכל מיקרוסרוויס.

#### אופציה 1: Schema Definition בקוד RAG

יצירת קובץ שמגדיר את ה-schema לכל מיקרוסרוויס:

```javascript
// BACKEND/src/config/microserviceSchemas.js

/**
 * Schema definitions for expected microservice responses
 * Each microservice should return data matching its schema
 */

export const microserviceSchemas = {
  'assessment-service': {
    requiredFields: ['assessments', 'scores'],
    optionalFields: ['progress', 'recommendations'],
    structure: {
      assessments: {
        type: 'array',
        items: {
          id: { type: 'string', required: true },
          title: { type: 'string', required: true },
          score: { type: 'number', required: true },
          date: { type: 'string', required: true },
          status: { type: 'string', required: false }
        }
      },
      scores: {
        type: 'object',
        properties: {
          average: { type: 'number', required: true },
          total: { type: 'number', required: true },
          breakdown: { type: 'object', required: false }
        }
      }
    }
  },
  
  'devlab-service': {
    requiredFields: ['explanation', 'suggestions'],
    optionalFields: ['code_examples', 'best_practices'],
    structure: {
      explanation: { type: 'string', required: true },
      suggestions: {
        type: 'array',
        items: { type: 'string' }
      },
      code_examples: {
        type: 'array',
        items: {
          code: { type: 'string', required: true },
          language: { type: 'string', required: true },
          description: { type: 'string', required: false }
        }
      }
    }
  },
  
  'analytics-service': {
    requiredFields: ['data', 'insights'],
    optionalFields: ['recommendations', 'charts'],
    structure: {
      data: { type: 'object', required: true },
      insights: {
        type: 'array',
        items: { type: 'string' }
      }
    }
  }
};

/**
 * Validate microservice response against schema
 */
export function validateMicroserviceResponse(serviceName, response) {
  const schema = microserviceSchemas[serviceName];
  if (!schema) {
    // No schema defined - accept any response
    return { valid: true, errors: [] };
  }
  
  const errors = [];
  const envelope = JSON.parse(response.envelope_json || '{}');
  const data = envelope.payload?.data || {};
  
  // Check required fields
  for (const field of schema.requiredFields) {
    if (!data[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Validate structure
  for (const [field, fieldSchema] of Object.entries(schema.structure)) {
    if (data[field]) {
      const fieldErrors = validateField(data[field], fieldSchema);
      errors.push(...fieldErrors);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

function validateField(value, schema) {
  const errors = [];
  
  if (schema.type === 'array' && !Array.isArray(value)) {
    errors.push(`Expected array, got ${typeof value}`);
  }
  
  if (schema.type === 'object' && typeof value !== 'object') {
    errors.push(`Expected object, got ${typeof value}`);
  }
  
  if (schema.items && Array.isArray(value)) {
    value.forEach((item, index) => {
      if (schema.items.properties) {
        const itemErrors = validateObject(item, schema.items);
        errors.push(...itemErrors.map(e => `[${index}].${e}`));
      }
    });
  }
  
  if (schema.properties && typeof value === 'object') {
    const objectErrors = validateObject(value, schema);
    errors.push(...objectErrors);
  }
  
  return errors;
}

function validateObject(obj, schema) {
  const errors = [];
  
  for (const [key, propSchema] of Object.entries(schema.properties || {})) {
    if (propSchema.required && !obj[key]) {
      errors.push(`Missing required property: ${key}`);
    }
    
    if (obj[key] && propSchema.type) {
      const expectedType = propSchema.type;
      const actualType = Array.isArray(obj[key]) ? 'array' : typeof obj[key];
      
      if (expectedType !== actualType) {
        errors.push(`Property ${key}: expected ${expectedType}, got ${actualType}`);
      }
    }
  }
  
  return errors;
}
```

#### אופציה 2: שימוש ב-JSON Schema

יצירת JSON Schema files:

```json
// BACKEND/src/config/schemas/assessment-service.schema.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["assessments", "scores"],
  "properties": {
    "assessments": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "title", "score", "date"],
        "properties": {
          "id": { "type": "string" },
          "title": { "type": "string" },
          "score": { "type": "number", "minimum": 0, "maximum": 100 },
          "date": { "type": "string", "format": "date-time" },
          "status": { "type": "string", "enum": ["completed", "in_progress", "pending"] }
        }
      }
    },
    "scores": {
      "type": "object",
      "required": ["average", "total"],
      "properties": {
        "average": { "type": "number" },
        "total": { "type": "number" },
        "breakdown": { "type": "object" }
      }
    }
  }
}
```

שימוש ב-JSON Schema validator:

```javascript
import Ajv from 'ajv';
import assessmentSchema from './schemas/assessment-service.schema.json';

const ajv = new Ajv();
const validate = ajv.compile(assessmentSchema);

export function validateAssessmentResponse(response) {
  const envelope = JSON.parse(response.envelope_json || '{}');
  const data = envelope.payload?.data || {};
  
  const valid = validate(data);
  
  return {
    valid,
    errors: validate.errors || []
  };
}
```

#### אופציה 3: TypeScript Types (אם משתמשים ב-TypeScript)

```typescript
// BACKEND/src/types/microservice-responses.ts

export interface AssessmentServiceResponse {
  assessments: Assessment[];
  scores: Scores;
  progress?: Progress;
  recommendations?: string[];
}

export interface Assessment {
  id: string;
  title: string;
  score: number;
  date: string;
  status?: 'completed' | 'in_progress' | 'pending';
}

export interface Scores {
  average: number;
  total: number;
  breakdown?: Record<string, number>;
}

export interface DevLabServiceResponse {
  explanation: string;
  suggestions: string[];
  code_examples?: CodeExample[];
  best_practices?: string[];
}

export interface CodeExample {
  code: string;
  language: string;
  description?: string;
}
```

#### שימוש ב-Schema Validation

עדכון `coordinatorResponseParser.service.js`:

```javascript
import { validateMicroserviceResponse } from '../config/microserviceSchemas.js';

export function parseRouteResponse(response) {
  // ... existing parsing code ...
  
  // Validate against schema
  if (parsed.successful_service && parsed.successful_service !== 'none') {
    const validation = validateMicroserviceResponse(
      parsed.successful_service,
      response
    );
    
    if (!validation.valid) {
      logger.warn('Microservice response validation failed', {
        service: parsed.successful_service,
        errors: validation.errors
      });
      
      // Decide what to do:
      // Option 1: Reject the response
      // Option 2: Accept but log warning
      // Option 3: Try to fix/adapt the response
    }
  }
  
  return parsed;
}
```

#### עדכון Schema Interpreter

עדכון `schemaInterpreter.service.js` להשתמש ב-schema:

```javascript
import { microserviceSchemas } from '../config/microserviceSchemas.js';

export function interpretNormalizedFields(normalizedFields, serviceName) {
  const schema = microserviceSchemas[serviceName];
  
  if (!schema) {
    // Fallback to current dynamic interpretation
    return interpretDynamically(normalizedFields);
  }
  
  // Use schema to extract fields
  const structured = {};
  
  for (const field of schema.requiredFields) {
    structured[field] = normalizedFields[field] || null;
  }
  
  for (const field of schema.optionalFields) {
    if (normalizedFields[field]) {
      structured[field] = normalizedFields[field];
    }
  }
  
  return structured;
}
```

### דוגמה: הגדרת Schema ל-Assessment Service

```javascript
// BACKEND/src/config/microserviceSchemas.js

export const microserviceSchemas = {
  'assessment-service': {
    // מה המיקרוסרוויס חייב להחזיר
    requiredFields: ['assessments'],
    
    // מה המיקרוסרוויס יכול להחזיר (אופציונלי)
    optionalFields: ['scores', 'progress', 'recommendations'],
    
    // מבנה הנתונים
    structure: {
      assessments: {
        type: 'array',
        items: {
          id: { type: 'string', required: true },
          title: { type: 'string', required: true },
          score: { type: 'number', required: true, min: 0, max: 100 },
          date: { type: 'string', required: true, format: 'date-time' }
        }
      },
      scores: {
        type: 'object',
        properties: {
          average: { type: 'number', required: true },
          total: { type: 'number', required: true }
        }
      }
    },
    
    // איך להמיר את הנתונים לפורמט של RAG
    transformToRAGFormat: (data) => {
      return {
        sources: data.assessments.map(assessment => ({
          sourceId: assessment.id,
          sourceType: 'assessment',
          title: assessment.title,
          contentSnippet: `Score: ${assessment.score}, Date: ${assessment.date}`,
          sourceUrl: `/assessments/${assessment.id}`,
          relevanceScore: assessment.score / 100,
          metadata: {
            score: assessment.score,
            date: assessment.date
          }
        }))
      };
    }
  }
};
```

### סיכום - איך להיות אחראי על המידע

1. **הגדר Schema** - צור קובץ שמגדיר מה כל מיקרוסרוויס צריך להחזיר
2. **Validate Responses** - בדוק שהתשובות תואמות ל-schema
3. **Transform Data** - המר את הנתונים לפורמט שמתאים ל-RAG
4. **Document** - תיעד את ה-schema כדי שמיקרוסרוויסים ידעו מה להחזיר

**יתרונות**:
- ✅ Type safety
- ✅ Validation
- ✅ Documentation
- ✅ Easier maintenance
- ✅ Better error handling

**המלצה**: התחל עם הגדרת schema פשוטה בקוד, ואז אפשר להעביר ל-JSON Schema או TypeScript types.

---

### נקודות חשובות לקשר עם כל מיקרוסרוויס

1. **Endpoint Resolution**:
   - Coordinator ממיר HTTP endpoints ל-gRPC endpoints
   - Convention: HTTP port + 51 (למשל `5000` → `5051`)
   - או gRPC port מפורש אם מסופק

2. **Client Caching**:
   - Coordinator שומר gRPC clients ב-cache
   - Key: `serviceName:endpoint`
   - מפחית overhead של יצירת connections

3. **Timeout**:
   - 30 שניות לכל קריאה (ברירת מחדל)
   - ניתן להגדרה

4. **Error Handling**:
   - אם `success: false` - Coordinator ממשיך למיקרוסרוויס הבא
   - אם `success: true` אבל איכות נמוכה - ממשיך למיקרוסרוויס הבא
   - אם `success: true` ואיכות גבוהה - עוצר

5. **Request ID Preservation**:
   - המיקרוסרוויס **חייב** להחזיר את אותו `request_id`
   - זה מאפשר מעקב אחרי הבקשה

6. **Envelope Structure**:
   - המיקרוסרוויס צריך לשמור על מבנה ה-Envelope
   - להוסיף את הנתונים שלו ב-`payload.data`
   - לשמור על `version`, `timestamp`, `request_id`, `tenant_id`, `user_id`

---

## 6. סיכום: איך כל מיקרוסרוויס רואה את הבקשה

### RAG Service (כשולח):
- **יוצר**: `RouteRequest` עם כל השדות
- **מוסיף**: Metadata עם חתימה דיגיטלית
- **שולח**: gRPC call ל-Coordinator
- **ממתין**: ל-`RouteResponse`

### Coordinator (כמקבל וכשולח):
- **מקבל**: gRPC request מ-RAG עם `RouteRequest` ✅
- **מנתח**: את `query_text` ויוצר Universal Envelope ✅
- **מחפש**: שירותים פעילים ב-Registry ✅
- **מסנן**: מסיר את RAG/requester מהרשימה ✅
- **מחליט**: משתמש ב-AI Routing כדי להחליט לאיזה מיקרוסרוויסים לשלוח ✅
- **שולח**: gRPC requests למיקרוסרוויסים דרך `MicroserviceAPI.Process` ✅
  - **Cascading Fallback**: מנסה שירותים לפי דירוג, עוצר כשמוצא תשובה טובה
- **מאסוף**: תשובות מכל המיקרוסרוויסים
- **מחזיר**: `RouteResponse` ל-RAG ✅

### מיקרוסרוויסים אחרים (כמקבלים):
- **מקבלים**: gRPC request דרך `MicroserviceAPI.Process` RPC ✅
- **Service**: `microservice.v1.MicroserviceAPI`
- **Request**: `ProcessRequest` עם `envelope_json` (JSON string)
- **Response**: `ProcessResponse` עם `success`, `error`, `envelope_json`
- **מחזירים**: תשובה ב-Envelope format דרך gRPC

---

## 7. דיאגרמת זרימה

```
┌─────────────┐
│ RAG Service │
└──────┬──────┘
       │ gRPC: RouteRequest
       │ Service: rag.v1.CoordinatorService
       │ Method: Route
       │ - tenant_id, user_id, query_text, metadata
       ▼
┌─────────────┐
│ Coordinator │
│ (gRPC Server)│
└──────┬──────┘
       │ gRPC: ProcessRequest
       │ Service: microservice.v1.MicroserviceAPI
       │ Method: Process
       │ - envelope_json (JSON string)
       ▼
┌─────────────────────┐
│ Assessment Service  │
│ DevLab Service      │
│ Analytics Service   │
│ ...                 │
│ (כולם gRPC servers) │
└─────────────────────┘
```

---

## 8. נקודות חשובות

1. **RAG → Coordinator**: תקשורת **gRPC** בלבד ✅
   - Service: `rag.v1.CoordinatorService`
   - Method: `Route`
   - Request: `RouteRequest`

2. **Coordinator → מיקרוסרוויסים אחרים**: תקשורת **gRPC** בלבד ✅
   - Service: `microservice.v1.MicroserviceAPI`
   - Method: `Process`
   - Request: `ProcessRequest` עם `envelope_json`
   - **Cascading Fallback**: מנסה שירותים לפי דירוג AI, עוצר כשמוצא תשובה טובה

3. **Envelope**: נשלח כ-JSON string בכל התקשורת gRPC
   - ב-`RouteRequest`: בשדה `envelope_json` (אופציונלי, Coordinator יוצר אותו)
   - ב-`ProcessRequest`: בשדה `envelope_json` (חובה)

4. **Authentication**: חתימה דיגיטלית ב-metadata של gRPC
   - RAG שולח metadata עם `x-signature`, `x-service-name`, `x-timestamp`

5. **Tenant Isolation**: `tenant_id` נמצא ב-request body וב-Envelope

6. **AI Routing**: Coordinator משתמש ב-AI כדי להחליט לאיזה שירותים לשלוח

7. **Service Filtering**: Coordinator מסיר את RAG/requester מהרשימה כדי למנוע circular routing

---

## 9. תהליך מלא של Coordinator (לפי תיעוד רשמי)

### שלב 1: קבלת הבקשה (Request Reception)

Coordinator מקבל gRPC request ב-`handleRoute()`:
- **Service**: `rag.v1.CoordinatorService`
- **Method**: `Route`
- **Port**: `50051` (ברירת מחדל)

```javascript
async handleRoute(call, callback) {
  const request = call.request;
  // request.tenant_id, request.user_id, request.query_text, request.metadata
}
```

### שלב 2: אימות השאילתה (Query Validation)

Coordinator בודק:
- `query_text` קיים ולא ריק
- אורך מינימלי: 3 תווים
- לא gRPC path (לא `/rag.v1.CoordinatorService/Route`)
- לא HTTP method description

### שלב 3: יצירת Universal Envelope

Coordinator יוצר Envelope סטנדרטי:
```javascript
{
  version: '1.0',
  timestamp: '2025-01-XX...',
  request_id: 'uuid-generated',
  tenant_id: request.tenant_id,
  user_id: request.user_id,
  source: 'rag',
  payload: {
    query: request.query_text,
    metadata: request.metadata || {},
    context: { protocol: 'grpc', source: 'rag' }
  }
}
```

### שלב 4: חיפוש שירותים פעילים (Service Registry Lookup)

Coordinator:
- מביא את כל השירותים הרשומים
- מסנן רק שירותים פעילים (`status === 'active'`)
- בודק שיש לפחות שירות פעיל אחד

### שלב 5: סינון שירותים (Service Filtering)

Coordinator מסיר:
- את השירות המבקש (requester service, בדרך כלל `rag-service`)
- כל שירות עם "rag" בשם
- **מטרה**: למנוע circular routing

### שלב 6: AI Routing (AI-Powered Routing)

Coordinator משתמש ב-AI כדי:
1. לנתח את השאילתה
2. להשוות ליכולות השירותים
3. לדרג שירותים לפי רלוונטיות וביטחון
4. להחזיר רשימה מדורגת של שירותים

**תוצאה**:
```javascript
{
  success: true,
  routing: {
    method: 'ai_llm',
    totalCandidates: 8,
    rankedServices: [
      {
        serviceName: 'exercises-service',
        confidence: 0.95,
        reasoning: 'Best match for coding exercise request',
        endpoint: 'exercises-service:5000'
      },
      // ... עוד שירותים לפי דירוג
    ],
    primaryTarget: { /* השירות הראשון */ }
  }
}
```

### שלב 7: Cascading Fallback Execution

Coordinator מנסה שירותים לפי דירוג:

```javascript
for (const service of rankedServices) {
  // 1. יוצר Envelope
  const envelope = createEnvelope(...);
  
  // 2. קורא למיקרוסרוויס דרך gRPC
  const response = await grpcClient.Process({
    envelope_json: JSON.stringify(envelope)
  });
  
  // 3. מעריך איכות תשובה
  if (response.success && isHighQuality(response)) {
    return response; // ✅ עוצר כאן - מצא תשובה טובה
  }
  // אחרת ממשיך למיקרוסרוויס הבא
}
```

**לוגיקת Cascading**:
- מנסה שירותים לפי דירוג (confidence גבוה קודם)
- עוצר כשמוצא תשובה איכותית
- ממשיך למיקרוסרוויס הבא אם:
  - השירות הנוכחי נכשל
  - איכות התשובה נמוכה מדי
  - השירות דוחה את הבקשה

### שלב 8: קריאה למיקרוסרוויסים (Calling Microservices)

**gRPC Client Setup**:
- Coordinator משתמש ב-`callMicroserviceViaGrpc()`
- Clients נשמרים ב-cache (לכל service endpoint)
- Timeout: 30 שניות לכל קריאה

**Proto Definition**:
```protobuf
service MicroserviceAPI {
  rpc Process (ProcessRequest) returns (ProcessResponse);
}

message ProcessRequest {
  string envelope_json = 1;
}

message ProcessResponse {
  bool success = 1;
  string error = 2;
  string envelope_json = 3;
}
```

**Endpoint Resolution**:
- Coordinator ממיר HTTP endpoints ל-gRPC endpoints
- Convention: HTTP port + 51 (למשל `5000` → `5051`)
- תומך ב-gRPC ports מפורשים אם מסופקים

### שלב 9: בניית תשובה (Response Building)

Coordinator בונה `RouteResponse`:

```javascript
{
  target_services: ['service1', 'service2', ...],  // כל השירותים שנוסו
  normalized_fields: {
    successful_service: 'service1',
    rank_used: '1',  // דירוג השירות שהצליח
    total_attempts: '2',
    primary_target: 'service1',
    primary_confidence: '0.95',
    stopped_reason: 'quality_threshold_met',
    quality_score: '0.92',
    total_time: '150ms',
    processing_time: '200ms'
  },
  envelope_json: '{"request": {...}, "aiRanking": [...], ...}',
  routing_metadata: '{"routing_strategy": "cascading_fallback", ...}'
}
```

---

## 10. קבצים רלוונטיים בקוד

### בקוד RAG:
- **Proto Definition**: `DATABASE/proto/rag/v1/coordinator.proto`
- **gRPC Client**: `BACKEND/src/clients/coordinator.client.js`
- **gRPC Utility**: `BACKEND/src/clients/grpcClient.util.js`
- **Fallback Service**: `BACKEND/src/services/grpcFallback.service.js`
- **Test Script**: `BACKEND/scripts/test-coordinator-from-rag.js`

### בקוד Coordinator (לפי תיעוד):
- **gRPC Server**: `src/grpc/server.js` - הגדרת gRPC server
- **Route Handler**: `src/grpc/services/coordinator.service.js` - `handleRoute()`
- **gRPC Client**: `src/grpc/client.js` - `callMicroserviceViaGrpc()`
- **Communication Service**: `src/services/communicationService.js` - Cascading logic
- **Envelope Service**: `src/services/envelopeService.js` - יצירת Envelope
- **AI Routing**: `src/services/aiRoutingService.js` - AI routing logic
- **Registry Service**: `src/services/registryService.js` - Service registry
- **Proto Files**: 
  - `src/grpc/proto/coordinator.proto` - CoordinatorService
  - `src/grpc/proto/microservice.proto` - MicroserviceAPI

---

## 11. דוגמת קוד מלאה

### RAG שולח בקשה:

```javascript
// BACKEND/src/clients/coordinator.client.js
const request = {
  tenant_id: 'tenant-123',
  user_id: 'user-456',
  query_text: 'מה הציונים שלי?',
  requester_service: 'rag-service',
  context: { category: 'assessment' },
  envelope_json: JSON.stringify({
    version: '1.0',
    timestamp: new Date().toISOString(),
    request_id: generateRequestId(),
    tenant_id: 'tenant-123',
    user_id: 'user-456',
    source: 'rag-service',
    payload: {
      query_text: 'מה הציונים שלי?',
      metadata: { category: 'assessment' }
    }
  })
};

const metadata = new grpc.Metadata();
metadata.add('x-signature', signature);
metadata.add('x-service-name', 'rag-service');
metadata.add('x-timestamp', Date.now().toString());

const response = await grpcCall(
  client,
  'Route',
  request,
  metadata,
  GRPC_TIMEOUT
);
```

### Coordinator מקבל ומנתב:

```javascript
// Coordinator מקבל את ה-gRPC request
// יוצר Universal Envelope
// משתמש ב-AI Routing
// ואז שולח gRPC request למיקרוסרוויס:

// 1. יצירת Envelope
const envelope = {
  version: '1.0',
  timestamp: new Date().toISOString(),
  request_id: generateRequestId(),
  tenant_id: request.tenant_id,
  user_id: request.user_id,
  source: 'rag',
  payload: {
    query: request.query_text,
    metadata: request.metadata || {},
    context: { protocol: 'grpc', source: 'rag' }
  }
};

// 2. AI Routing - מחליט לאיזה שירותים לשלוח
const routingResult = await aiRoutingService.routeRequest(
  routingData,
  routingConfig,
  envelope.request_id
);
// מחזיר: rankedServices = [{ serviceName, confidence, endpoint }, ...]

// 3. Cascading Fallback - שולח gRPC requests
for (const service of rankedServices) {
  const grpcRequest = {
    envelope_json: JSON.stringify(envelope)
  };
  
  const response = await grpcClient.Process(
    grpcRequest,
    { deadline: timeout }
  );
  
  // מעריך איכות תשובה
  if (response.success && isHighQuality(response)) {
    return response; // עוצר כאן
  }
  // אחרת ממשיך למיקרוסרוויס הבא
}
```

---

## סיכום

- **RAG → Coordinator**: gRPC עם `RouteRequest` ו-metadata ✅
  - Service: `rag.v1.CoordinatorService`
  - Method: `Route`
  
- **Coordinator → מיקרוסרוויסים**: gRPC עם `ProcessRequest` ✅
  - Service: `microservice.v1.MicroserviceAPI`
  - Method: `Process`
  - Cascading Fallback: מנסה שירותים לפי דירוג AI
  
- **Envelope**: נשלח כ-JSON string בכל התקשורת gRPC
  - ב-`RouteRequest`: `envelope_json` (אופציונלי)
  - ב-`ProcessRequest`: `envelope_json` (חובה)
  
- **Authentication**: חתימה דיגיטלית ב-gRPC metadata
  - RAG שולח: `x-signature`, `x-service-name`, `x-timestamp`

- **AI Routing**: Coordinator משתמש ב-AI כדי להחליט לאיזה שירותים לשלוח

- **Service Filtering**: Coordinator מסיר את RAG/requester מהרשימה

---

## 📝 מקורות המידע

המידע מבוסס על:
1. **תיעוד רשמי של Coordinator**: תיעוד מלא של איך Coordinator עובד
2. **קוד RAG**: איך RAG שולח בקשות ל-Coordinator (`coordinator.client.js`)
3. **Proto Definitions**: הגדרות ה-proto files (`coordinator.proto`, `microservice.proto`)

**✅ כל התקשורת היא gRPC** - RAG → Coordinator → מיקרוסרוויסים (כולם gRPC)

