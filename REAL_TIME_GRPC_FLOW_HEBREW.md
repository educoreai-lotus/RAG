# מסלול REAL TIME GRPC - ניתוח מלא

## 📋 סקירה כללית

מסמך זה מתאר את מסלול **REAL TIME GRPC** המלא, מהשלב הראשוני של קבלת שאילתה דרך Coordinator ועד לחילוץ והצגת הנתונים.

---

## 🔄 המסלול המלא - 10 שלבים

### שלב 1: קבלת Query וסיווג

**קובץ:** `BACKEND/src/services/queryProcessing.service.js`

```javascript
// 1. סיווג השאילתה
const { isEducore, category } = isEducoreQuery(query);

// 2. חיפוש פנימי ב-RAG (Supabase)
const similarVectors = await unifiedVectorSearch(queryEmbedding, actualTenantId, {
  limit: max_results,
  threshold: min_confidence,
});
```

**תהליך:**
- סיווג השאילתה (EDUCORE vs כללי)
- חיפוש וקטורי ב-Supabase
- בדיקת תוצאות פנימיות

---

### שלב 2: החלטה על קריאה ל-Coordinator (Real-time Check)

**קובץ:** `BACKEND/src/communication/communicationManager.service.js`

```javascript
export function shouldCallCoordinator(query, vectorResults = [], internalData = {}) {
  const queryLower = query.toLowerCase();
  
  // ⚠️ CRITICAL: Check for report queries FIRST
  const reportKeywords = ['report', 'conclusions', 'summary', 'findings', 'results', 'monthly', 'performance'];
  const isReportQuery = reportKeywords.some(keyword => queryLower.includes(keyword));
  
  if (isReportQuery) {
    return true; // תמיד קוראים ל-Coordinator עבור reports
  }
  
  // Check for real-time data requirements in query
  const realTimeKeywords = [
    'current', 'now', 'live', 'real-time', 'realtime', 'latest', 'updated',
    'status', 'progress', 'active', 'running', 'pending', 'completed',
    'today', 'now', 'recent', 'just now'
  ];
  
  const requiresRealTime = realTimeKeywords.some(keyword => queryLower.includes(keyword));
  
  if (requiresRealTime) {
    logger.info('Should call Coordinator: Query requires real-time data', {
      query: query.substring(0, 100),
    });
    return true; // Query explicitly requires real-time data
  }
  
  // Check vector similarity scores
  const avgSimilarity = vectorResults.length > 0
    ? vectorResults.reduce((sum, r) => sum + (r.similarity || 0), 0) / vectorResults.length
    : 0;
  
  if (avgSimilarity < VECTOR_SIMILARITY_THRESHOLD) {
    return true; // Low similarity, might need real-time data
  }
  
  return false; // Internal data is sufficient
}
```

**תהליך:**
- בדיקת מילות מפתח (reports, real-time)
- בדיקת similarity scores
- החלטה אם לקרוא ל-Coordinator

---

### שלב 3: קריאה ל-Coordinator דרך gRPC

**קובץ:** `BACKEND/src/services/grpcFallback.service.js`

```javascript
export async function grpcFetchByCategory(category, { query, tenantId, userId, ... }) {
  // Decision layer: Check if Coordinator should be called
  const shouldCall = shouldCallCoordinator(query, vectorResults, internalData);
  
  if (!shouldCall) {
    return []; // Internal data is sufficient
  }
  
  // Call Coordinator via Communication Manager
  const coordinatorResponse = await callCoordinatorRoute({
    tenant_id: tenantId,
    user_id: userId,
    query_text: query,
    metadata: {
      category,
      source: 'rag_fallback',
      vector_results_count: vectorResults.length,
    },
  });
}
```

**תהליך:**
- בדיקת shouldCallCoordinator
- קריאה ל-callCoordinatorRoute

---

### שלב 4: יצירת gRPC Request

**קובץ:** `BACKEND/src/clients/coordinator.client.js`

```javascript
export async function routeRequest({ tenant_id, user_id, query_text, metadata = {} }) {
  // Create Universal Envelope
  const envelope = createEnvelope(tenant_id, user_id, query_text, metadata);
  
  // ⭐ CRITICAL: Build metadata map - EVERYTHING goes here to match Coordinator's proto
  // Coordinator expects: RouteRequest { tenant_id, user_id, query_text, metadata }
  const metadataMap = {
    requester_service: 'rag-service',
    source: metadata.source || 'rag',
    timestamp: new Date().toISOString(),
    category: metadata.category,
    vector_results_count: metadata.vector_results_count,
  };
  
  // Convert all incoming metadata to strings and add to metadataMap
  if (metadata && typeof metadata === 'object') {
    Object.entries(metadata).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        let stringValue;
        if (typeof value === 'object' && !(value instanceof Date)) {
          stringValue = JSON.stringify(value);
        } else if (value instanceof Date) {
          stringValue = value.toISOString();
        } else {
          stringValue = String(value);
        }
        metadataMap[key] = stringValue;
      }
    });
  }
  
  // Add envelope_json to metadata
  const envelopeJson = JSON.stringify(envelope);
  metadataMap.envelope_json = envelopeJson;
  
  // ⭐ Build request matching Coordinator's proto structure
  const request = {
    tenant_id: tenant_id || '',
    user_id: user_id || '',
    query_text: query_text,
    metadata: metadataMap  // ⭐ Everything in metadata map!
  };
  
  // Generate signed metadata
  const signedMetadata = createSignedMetadata(request);
  
  // Make gRPC call
  const response = await grpcCall(
    client,
    'Route',
    request,
    signedMetadata,
    GRPC_TIMEOUT
  );
  
  return response; // RouteResponse מה-Coordinator
}
```

**תהליך:**
- יצירת Universal Envelope
- בניית metadata map
- יצירת signed metadata
- קריאה gRPC ל-Coordinator

---

### שלב 5: Coordinator מנתב למיקרו-שירות

**Coordinator (חיצוני):**
1. מקבל את ה-gRPC request מה-RAG
2. מנתב (AI routing) למיקרו-שירות המתאים
3. המיקרו-שירות מחזיר נתונים real-time
4. Coordinator מחזיר RouteResponse עם הנתונים

**RouteResponse Structure:**
```protobuf
RouteResponse {
  target_services: ["managementreporting-service"],
  normalized_fields: {
    "successful_service": "managementreporting-service",
    "rank_used": "1",
    "quality_score": "0.95",
    "data": JSON.stringify({
      request_id: "abc123",
      success: true,
      data: [...],  // ⭐ array של report objects (real-time)
      metadata: {...}
    })
  },
  envelope_json: "{...}",  // Universal Envelope עם payload
  routing_metadata: "{...}" // מידע על routing
}
```

---

### שלב 6: Parsing ה-Response מה-Coordinator

**קובץ:** `BACKEND/src/services/coordinatorResponseParser.service.js`

```javascript
export function parseRouteResponse(response) {
  const parsed = {
    // Raw response fields
    target_services: response.target_services || [],
    normalized_fields: response.normalized_fields || {},
    envelope_json: response.envelope_json || null,
    
    // Parsed fields
    envelope: null,
    routing: null,
    
    // Status information
    status: 'unknown',
    success: false,
    successful_service: null,
    rank_used: 0,
    quality_score: 0,
  };
  
  // Parse normalized_fields
  const normalized = parsed.normalized_fields;
  parsed.successful_service = normalized?.successful_service || 'none';
  parsed.rank_used = parseInt(normalized?.rank_used || '0', 10);
  parsed.quality_score = parseFloat(normalized?.quality_score || '0');
  
  // Parse envelope_json
  if (parsed.envelope_json) {
    parsed.envelope = typeof parsed.envelope_json === 'string'
      ? JSON.parse(parsed.envelope_json)
      : parsed.envelope_json;
  }
  
  return parsed;
}
```

**תהליך:**
- Parsing של normalized_fields
- Parsing של envelope_json
- חילוץ status information

---

### שלב 7: חילוץ Business Data

**קובץ:** `BACKEND/src/services/coordinatorResponseParser.service.js`

```javascript
export function extractBusinessData(parsedResponse) {
  const businessData = {
    data: null,
    sources: [],
    metadata: {},
  };
  
  // ⭐ PRIORITY 1: Coordinator wrapped format
  // { successfulResult: { data: [...] }, ... }
  if (parsedResponse.envelope?.successfulResult?.data) {
    const data = parsedResponse.envelope.successfulResult.data;
    
    if (Array.isArray(data)) {
      businessData.data = data;
      businessData.sources = data;
    } else if (typeof data === 'object' && data !== null) {
      businessData.data = [data];
      businessData.sources = [data];
    }
    
    return businessData; // Return early - found the data!
  }
  
  // ⭐ PRIORITY 2: envelope.payload (legacy format)
  if (parsedResponse.envelope?.payload) {
    if (parsedResponse.envelope.payload.data && Array.isArray(parsedResponse.envelope.payload.data)) {
      businessData.data = parsedResponse.envelope.payload.data;
      businessData.sources = parsedResponse.envelope.payload.data;
    }
  }
  
  // ⭐ PRIORITY 3: normalized_fields (business fields)
  const normalized = parsedResponse.normalized_fields;
  const businessFields = {};
  
  // Filter out system fields, keep only business data
  const systemFields = [
    'successful_service', 'rank_used', 'total_attempts', 'stopped_reason',
    'quality_score', 'primary_target', 'primary_confidence', 'processing_time',
  ];
  
  Object.entries(normalized).forEach(([key, value]) => {
    if (!systemFields.includes(key)) {
      // Try to parse JSON values
      let parsedValue = value;
      if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        try {
          parsedValue = JSON.parse(value);
        } catch (_e) {
          parsedValue = value;
        }
      }
      businessFields[key] = parsedValue;
    }
  });
  
  // ⭐ NEW STRUCTURE: Check for new format
  // Expected structure: { request_id, success, data: [...], metadata: {...} }
  if (businessFields.data && typeof businessFields.data === 'object' && Array.isArray(businessFields.data.data)) {
    businessData.data = businessFields.data.data;
    businessData.sources = businessFields.data.data;
    
    if (businessFields.data.metadata) {
      businessData.metadata = {
        ...businessData.metadata,
        ...businessFields.data.metadata,
        request_id: businessFields.data.request_id || businessData.metadata.request_id,
      };
    }
  }
  
  return businessData;
}
```

**תהליך:**
- חילוץ מ-envelope.successfulResult.data (Priority 1)
- חילוץ מ-envelope.payload (Priority 2)
- חילוץ מ-normalized_fields (Priority 3)
- טיפול במבנה החדש: `{ request_id, success, data: [...], metadata: {...} }`

---

### שלב 8: פרשנות Normalized Fields

**קובץ:** `BACKEND/src/communication/schemaInterpreter.service.js`

```javascript
export function interpretNormalizedFields(normalizedFields = {}) {
  const structured = {
    content: [],
    metadata: {},
    fields: {},
  };
  
  // Process each normalized field
  Object.entries(normalizedFields).forEach(([key, value]) => {
    // Try to parse JSON values
    let parsedValue = value;
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      try {
        parsedValue = JSON.parse(value);
      } catch (_e) {
        parsedValue = value;
      }
    }
    
    // ⭐ NEW: Handle 'data' field specifically
    if (key === 'data') {
      if (Array.isArray(parsedValue)) {
        structured.content.push(...parsedValue);
      } else if (typeof parsedValue === 'object' && parsedValue !== null && Array.isArray(parsedValue.data)) {
        // New format: { request_id, success, data: [...], metadata: {...} }
        structured.content.push(...parsedValue.data);
        
        if (parsedValue.metadata) {
          structured.metadata = { ...structured.metadata, ...parsedValue.metadata };
        }
      }
    } else if (key.includes('content') || key.includes('text')) {
      if (Array.isArray(parsedValue)) {
        structured.content.push(...parsedValue);
      } else {
        structured.content.push(parsedValue);
      }
    } else if (key.includes('metadata') || key.includes('meta')) {
      structured.metadata[key] = parsedValue;
    } else {
      structured.fields[key] = parsedValue;
    }
  });
  
  return structured;
}
```

**תהליך:**
- Parsing של JSON strings
- קטגוריזציה לפי key patterns
- טיפול מיוחד ב-'data' field (מבנה חדש)

---

### שלב 9: המרה ל-Format של RAG

**קובץ:** `BACKEND/src/services/grpcFallback.service.js`

```javascript
// Process Coordinator response
const processed = processCoordinatorResponse(coordinatorResponse);
const interpretedFields = interpretNormalizedFields(processed.normalized_fields);
const structured = createStructuredFields(processed, interpretedFields);

// Extract data array
let dataArray = [];
if (processed.sources && Array.isArray(processed.sources) && processed.sources.length > 0) {
  dataArray = processed.sources;
} else if (processed.business_data && Array.isArray(processed.business_data)) {
  dataArray = processed.business_data;
} else if (processed.business_data?.data && Array.isArray(processed.business_data.data)) {
  dataArray = processed.business_data.data;
}

// Convert to RAG format
const contentItems = dataArray.map((item, index) => {
  // ⭐ GENERIC: Extract text from any object structure
  const contentText = extractTextFromObject(item);
  
  return {
    contentId: item.id || item.report_id || `coordinator-${index}`,
    contentType: item.type || 'management_reporting',
    contentText: contentText.substring(0, 1500),
    metadata: {
      ...(item.metadata || {}),
      source: 'coordinator',
      target_services: processed.target_services || [],
    },
  };
});

return contentItems;
```

**תהליך:**
- חילוץ data array
- המרה ל-format של RAG
- חילוץ טקסט גנרי מכל מבנה אובייקט

---

### שלב 10: מיזוג עם תוצאות פנימיות

**קובץ:** `BACKEND/src/services/queryProcessing.service.js`

```javascript
// Convert Coordinator results into sources format
coordinatorSources = grpcContext.map((item, idx) => ({
  sourceId: item.contentId || `coordinator-${idx}`,
  sourceType: item.contentType || category || 'coordinator',
  sourceMicroservice: item.metadata?.target_services?.[0] || 'coordinator',
  title: item.metadata?.title || item.contentType || 'Coordinator Source',
  contentSnippet: String(item.contentText || '').substring(0, 200),
  sourceUrl: item.metadata?.url || '',
  relevanceScore: item.metadata?.relevanceScore || 0.75,
  metadata: { ...(item.metadata || {}), via: 'coordinator' },
}));

// Merge internal and Coordinator results
const merged = mergeResults(sources, {
  sources: coordinatorSources,
  metadata: {
    target_services: coordinatorSources[0]?.metadata?.target_services || [],
  },
});

// Update sources and context
sources = merged.sources || sources;
retrievedContext = merged.context || retrievedContext;
```

**תהליך:**
- המרת תוצאות Coordinator ל-sources format
- מיזוג עם תוצאות פנימיות
- עדכון sources ו-context

---

## 📊 דיאגרמת זרימה - REAL TIME GRPC

```
User Query
    ↓
[Query Processing Service]
    ↓
[Query Classification] → EDUCORE? → Yes
    ↓                              ↓
[Vector Search]                    No → [OpenAI Direct]
    ↓
[Should Call Coordinator?]
    ↓
    Yes → [gRPC Fallback Service]
    ↓
[Communication Manager]
    ↓
[Coordinator Client] → [gRPC Call]
    ↓
[Coordinator] → [AI Routing]
    ↓
[Microservice] → [Real-time Data]
    ↓
[RouteResponse]
    ↓
[Parse Route Response]
    ↓
[Extract Business Data]
    ↓
[Interpret Normalized Fields]
    ↓
[Convert to RAG Format]
    ↓
[Merge with Internal Results]
    ↓
[Response Builder]
    ↓
[Final Answer]
```

---

## 🔑 נקודות מפתח - REAL TIME GRPC

### 1. **Real-time Detection**
המערכת מזהה צורך ב-real-time data דרך:
- מילות מפתח: `'current', 'now', 'live', 'real-time', 'realtime', 'latest', 'updated'`
- Report queries: תמיד קוראים ל-Coordinator
- Low similarity: אם similarity נמוך, קוראים ל-Coordinator

### 2. **gRPC Communication**
התקשורת עם Coordinator היא דרך gRPC:
- **Protocol:** gRPC (לא HTTP)
- **Method:** `Route` RPC
- **Timeout:** 30 שניות (ברירת מחדל)
- **Signature:** Signed metadata עם RAG_PRIVATE_KEY

### 3. **Universal Envelope**
כל request עטוף ב-Universal Envelope:
```javascript
{
  version: '1.0',
  timestamp: new Date().toISOString(),
  request_id: generateRequestId(),
  tenant_id: tenant_id || '',
  user_id: user_id || '',
  source: 'rag-service',
  payload: {
    query_text: query_text,
    metadata: metadata || {}
  }
}
```

### 4. **Metadata Map**
כל המידע הנוסף הולך ב-metadata map:
```javascript
const metadataMap = {
  requester_service: 'rag-service',
  source: 'rag_fallback',
  category: 'management_reporting',
  vector_results_count: vectorResults.length,
  envelope_json: JSON.stringify(envelope),
  // כל metadata נוסף...
};
```

### 5. **Response Processing**
התגובהCoordinator עוברת דרך:
1. `parseRouteResponse()` - Parsing בסיסי
2. `extractBusinessData()` - חילוץ נתונים
3. `interpretNormalizedFields()` - פרשנות fields
4. `createStructuredFields()` - המרה ל-format של RAG

---

## 📝 סיכום המסלול - REAL TIME GRPC

1. **User Query** → RAG מקבל שאילתה
2. **Query Classification** → סיווג השאילתה (EDUCORE vs כללי)
3. **Internal Search** → חיפוש פנימי ב-Supabase
4. **Real-time Detection** → `shouldCallCoordinator()` מזהה צורך ב-real-time
5. **gRPC Call** → `routeRequest()` קורא ל-Coordinator דרך gRPC
6. **Coordinator Routing** → Coordinator מנתב למיקרו-שירות (AI routing)
7. **Microservice Response** → המיקרו-שירות מחזיר נתונים real-time
8. **Response Parsing** → `parseRouteResponse()` מפרסר את ה-response
9. **Data Extraction** → `extractBusinessData()` מחלץ את הנתונים
10. **Field Interpretation** → `interpretNormalizedFields()` מפרש את ה-normalized_fields
11. **Format Conversion** → המרה ל-format של RAG
12. **Result Merging** → מיזוג עם תוצאות פנימיות
13. **LLM Processing** → הנתונים נשלחים ל-LLM ליצירת תשובה

---

## 🎯 הבדלים בין Real-time gRPC ל-Batch Sync

| Aspect | Real-time gRPC | Batch Sync |
|--------|----------------|------------|
| **Trigger** | User query | Scheduled job |
| **Routing** | AI routing (Coordinator decides) | Direct routing (target_service specified) |
| **Timeout** | 30 seconds | 5 minutes |
| **Metadata** | `source: 'rag_fallback'` | `source: 'rag-batch-sync'` |
| **Query Text** | Original user query | `sync_{target_service}_{sync_type}_page_{page}` |
| **Purpose** | Answer user query with fresh data | Sync data for future queries |

---

## 🔍 קבצים מרכזיים - REAL TIME GRPC

### gRPC Communication:
- `BACKEND/src/clients/coordinator.client.js` - gRPC client ו-routeRequest()
- `BACKEND/src/clients/grpcClient.util.js` - gRPC utilities
- `BACKEND/src/utils/signature.js` - Signature generation

### Decision & Processing:
- `BACKEND/src/communication/communicationManager.service.js` - shouldCallCoordinator() ו-callCoordinatorRoute()
- `BACKEND/src/services/grpcFallback.service.js` - grpcFetchByCategory() ו-conversion
- `BACKEND/src/services/coordinatorResponseParser.service.js` - Parsing וחילוץ

### Query Processing:
- `BACKEND/src/services/queryProcessing.service.js` - עיבוד שאילתות ראשי
- `BACKEND/src/communication/schemaInterpreter.service.js` - פרשנות normalized fields

---

**המסלול המלא של REAL TIME GRPC: User Query → Vector Search → shouldCallCoordinator → gRPC Call → Coordinator → Microservice → Response Parsing → Data Extraction → Format Conversion → Result Merging → Final Answer**



