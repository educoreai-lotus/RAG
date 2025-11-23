# מדריך תקשורת gRPC עם מיקרו-שירותים

## סקירה כללית

המערכת מתקשרת עם כל המיקרו-שירותים ב-EDUCORE דרך **gRPC** (gRPC Remote Procedure Calls). זה פרוטוקול תקשורת מהיר ויעיל בין שירותים.

## ארכיטקטורת התקשורת

```
┌─────────────────┐
│  RAG Microservice│
│   (Backend)      │
└────────┬─────────┘
         │
         │ gRPC Calls
         │
    ┌────┴────┬──────────┬──────────┬──────────┐
    │         │          │          │          │
    ▼         ▼          ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│AI      │ │Assessment│ │DevLab  │ │Skills  │ │Content │
│LEARNER │ │Service  │ │Service │ │Engine  │ │Service │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘
```

## מבנה הקבצים

### 1. Proto Files (הגדרת הממשקים)
כל מיקרו-שירות מוגדר ב-`.proto` file:
- `DATABASE/proto/rag/v1/personalized.proto` - AI LEARNER
- `DATABASE/proto/rag/v1/assessment.proto` - Assessment Service
- `DATABASE/proto/rag/v1/devlab.proto` - DevLab Service
- `DATABASE/proto/rag/v1/content.proto` - Content Service
- `DATABASE/proto/rag/v1/analytics.proto` - Analytics Service
- ועוד...

### 2. gRPC Client Utility
`BACKEND/src/clients/grpcClient.util.js` - כלי עזר ליצירת gRPC clients:
- `loadProto()` - טוען proto files
- `createGrpcClient()` - יוצר gRPC client
- `grpcCall()` - מבצע קריאה ל-gRPC עם Promise wrapper

### 3. Service Clients
כל מיקרו-שירות צריך client משלו:
- `BACKEND/src/clients/aiLearner.client.js` - AI LEARNER client (מומש)
- `BACKEND/src/clients/assessment.client.js` - Assessment client (TODO)
- `BACKEND/src/clients/devlab.client.js` - DevLab client (TODO)
- וכו'...

## איך זה עובד - דוגמה: AI LEARNER

### שלב 1: הגדרת ה-Client

```javascript
// BACKEND/src/clients/aiLearner.client.js

import { createGrpcClient, grpcCall } from './grpcClient.util.js';

// 1. הגדרת כתובת gRPC
const AI_LEARNER_GRPC_URL = 'ai-learner.educore.local:50051';

// 2. נתיב ל-proto file
const AI_LEARNER_PROTO_PATH = '../DATABASE/proto/rag/v1/personalized.proto';

// 3. שם ה-service ב-proto
const AI_LEARNER_SERVICE_NAME = 'rag.v1.PersonalizedService';

// 4. יצירת client (נשמר ב-cache)
let grpcClient = null;

function getGrpcClient() {
  if (!grpcClient) {
    grpcClient = createGrpcClient(
      AI_LEARNER_GRPC_URL,
      AI_LEARNER_PROTO_PATH,
      AI_LEARNER_SERVICE_NAME
    );
  }
  return grpcClient;
}
```

### שלב 2: ביצוע קריאה

```javascript
export async function fetchLearningRecommendations(userId, tenantId) {
  const client = getGrpcClient();
  
  // הכנת request לפי ה-proto
  const request = {
    tenant_id: tenantId,
    user_id: userId,
    query_id: ''
  };
  
  // קריאה ל-gRPC
  const response = await grpcCall(
    client,
    'GetRecommendations',  // שם ה-RPC method
    request,
    {},                    // metadata (אופציונלי)
    5000                   // timeout (5 שניות)
  );
  
  // עיבוד התשובה
  return response.recommendations;
}
```

### שלב 3: שימוש ב-Service

```javascript
// BACKEND/src/services/recommendations.service.js

import { fetchLearningRecommendations } from '../clients/aiLearner.client.js';

export async function generatePersonalizedRecommendations(userId, tenantId, mode) {
  // קריאה ל-AI LEARNER דרך gRPC
  const aiLearnerRecs = await fetchLearningRecommendations(userId, tenantId);
  
  if (aiLearnerRecs.length > 0) {
    return aiLearnerRecs; // משתמש ב-AI LEARNER recommendations
  }
  
  // Fallback ל-recommendations אחרים
  return generateGeneralRecommendations();
}
```

## Proto File - מבנה

```protobuf
// DATABASE/proto/rag/v1/personalized.proto

syntax = "proto3";
package rag.v1;

// הגדרת ה-Service
service PersonalizedService {
  // RPC Method
  rpc GetRecommendations(RecommendationsRequest) returns (RecommendationsResponse);
  rpc UpdateUserProfile(UserProfileRequest) returns (UserProfileResponse);
}

// הגדרת ה-Request
message RecommendationsRequest {
  string tenant_id = 1;
  string user_id = 2;
  string query_id = 3;
}

// הגדרת ה-Response
message RecommendationsResponse {
  repeated Recommendation recommendations = 1;
}

message Recommendation {
  string recommendation_type = 1;
  string recommendation_id = 2;
  string title = 3;
  string description = 4;
  string reason = 5;
  int32 priority = 6;
}
```

## איך להוסיף מיקרו-שירות חדש

### שלב 1: יצירת Client

צור קובץ חדש: `BACKEND/src/clients/[service-name].client.js`

```javascript
import { createGrpcClient, grpcCall } from './grpcClient.util.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// הגדרת כתובת gRPC
const SERVICE_GRPC_URL = process.env.SERVICE_GRPC_URL || 'service.educore.local:50051';
const SERVICE_PROTO_PATH = process.env.SERVICE_PROTO_PATH || 
  join(__dirname, '../../DATABASE/proto/rag/v1/[service].proto');
const SERVICE_NAME = process.env.SERVICE_NAME || 'rag.v1.[ServiceName]';

// Cache client
let grpcClient = null;

function getGrpcClient() {
  if (!grpcClient) {
    grpcClient = createGrpcClient(
      SERVICE_GRPC_URL,
      SERVICE_PROTO_PATH,
      SERVICE_NAME
    );
  }
  return grpcClient;
}

// פונקציה ל-call
export async function callServiceMethod(params) {
  const client = getGrpcClient();
  if (!client) return null;
  
  const request = {
    // ... לפי ה-proto
  };
  
  try {
    const response = await grpcCall(
      client,
      'MethodName',  // שם ה-RPC method
      request,
      {},
      5000
    );
    return response;
  } catch (error) {
    logger.warn('gRPC call failed', { error: error.message });
    return null;
  }
}
```

### שלב 2: עדכון Environment Variables

הוסף ל-`env.example`:
```env
SERVICE_GRPC_URL=service.educore.local:50051
SERVICE_PROTO_PATH=../DATABASE/proto/rag/v1/service.proto
SERVICE_NAME=rag.v1.ServiceName
```

### שלב 3: שימוש ב-Service

```javascript
import { callServiceMethod } from '../clients/service.client.js';

// בקוד שלך
const result = await callServiceMethod({ ... });
```

## gRPC Fallback Service

`BACKEND/src/services/grpcFallback.service.js` - משמש ל-fallback כאשר RAG לא מוצא תוצאות:

```javascript
export async function grpcFetchByCategory(category, { query, tenantId }) {
  // TODO: Wire actual gRPC clients here
  // כרגע זה placeholder - צריך לממש clients לכל המיקרו-שירותים
}
```

**זה המקום להוסיף קריאות ל-מיקרו-שירותים אחרים:**
- Skills Engine
- Content Service
- Assessment Service
- DevLab Service
- Analytics Service

## Environment Variables

```env
# gRPC General
GRPC_ENABLED=true

# AI LEARNER
AI_LEARNER_GRPC_URL=ai-learner.educore.local:50051
AI_LEARNER_ENABLED=true
AI_LEARNER_PROTO_PATH=../DATABASE/proto/rag/v1/personalized.proto
AI_LEARNER_SERVICE_NAME=rag.v1.PersonalizedService

# Assessment (TODO)
ASSESSMENT_GRPC_URL=assessment.educore.local:50051
ASSESSMENT_PROTO_PATH=../DATABASE/proto/rag/v1/assessment.proto
ASSESSMENT_SERVICE_NAME=rag.v1.AssessmentService

# DevLab (TODO)
DEVLAB_GRPC_URL=devlab.educore.local:50051
DEVLAB_PROTO_PATH=../DATABASE/proto/rag/v1/devlab.proto
DEVLAB_SERVICE_NAME=rag.v1.DevLabService
```

## יתרונות gRPC

1. **מהירות** - בינארי, מהיר יותר מ-HTTP/JSON
2. **Type Safety** - Proto files מגדירים את הטיפוסים
3. **Streaming** - תמיכה ב-streaming (לא מומש כרגע)
4. **Code Generation** - יכול ליצור clients אוטומטית
5. **Multi-language** - עובד עם כל השפות

## Flow מלא - דוגמה

```
1. User שולח query
   ↓
2. Query Processing Service מנסה RAG
   ↓
3. אם אין תוצאות → gRPC Fallback
   ↓
4. grpcFetchByCategory קורא למיקרו-שירותים
   ↓
5. כל client מבצע gRPC call
   ↓
6. התשובות נאספות ומשולבות
   ↓
7. מחזירים context ל-RAG
```

## מיקרו-שירותים שצריך לממש

כרגע רק **AI LEARNER** מומש במלואו. צריך לממש:

- [ ] **Assessment Service** - `assessment.client.js`
- [ ] **DevLab Service** - `devlab.client.js`
- [ ] **Skills Engine** - `skills.client.js`
- [ ] **Content Service** - `content.client.js`
- [ ] **Analytics Service** - `analytics.client.js`

כל אחד צריך:
1. Client file ב-`BACKEND/src/clients/`
2. Proto file ב-`DATABASE/proto/rag/v1/`
3. Environment variables
4. שימוש ב-`grpcFallback.service.js`

## דוגמת קוד מלאה

```javascript
// 1. יצירת client
const client = createGrpcClient(
  'service.educore.local:50051',
  '../DATABASE/proto/rag/v1/service.proto',
  'rag.v1.ServiceName'
);

// 2. קריאה
const response = await grpcCall(
  client,
  'GetData',
  { tenant_id: 'tenant1', user_id: 'user1' },
  {},  // metadata
  5000  // timeout
);

// 3. עיבוד תשובה
console.log(response.data);
```

## טיפים

1. **Cache Clients** - שמור clients ב-cache (לא ליצור מחדש כל פעם)
2. **Error Handling** - תמיד תטפל בשגיאות (fallback)
3. **Timeout** - הגדר timeout סביר (5 שניות בדרך כלל)
4. **Logging** - לוג כל קריאה ל-debugging
5. **Proto Updates** - כשמעדכנים proto, צריך לעדכן גם את הקוד

## סיכום

התקשורת עם מיקרו-שירותים מתבצעת דרך:
1. **Proto Files** - מגדירים את הממשק
2. **gRPC Clients** - יוצרים connection
3. **gRPC Calls** - מבצעים קריאות
4. **Service Integration** - משתמשים ב-services

כרגע רק AI LEARNER מומש - צריך לממש את השאר באותו אופן.



