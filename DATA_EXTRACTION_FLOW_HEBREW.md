# מסלול חילוץ הנתונים - ניתוח מלא

## 📋 סקירה כללית

מסמך זה מתאר את מסלול חילוץ הנתונים המלא במערכת RAG, מהשלב הראשוני של קבלת שאילתה ועד לחילוץ והצגת הנתונים.

---

## 🔄 המסלול המלא - 12 שלבים

### שלב 1: קבלת Query והחלטה על מסלול

**קובץ:** `BACKEND/src/services/queryProcessing.service.js`

```javascript
// 1. סיווג השאילתה
const { isEducore, category } = isEducoreQuery(query);

// 2. חיפוש פנימי ב-RAG (Supabase)
const similarVectors = await unifiedVectorSearch.search({
  query,
  tenantId: actualTenantId,
  maxResults: max_results,
  minConfidence: min_confidence,
});
```

**תהליך:**
- סיווג השאילתה (EDUCORE vs כללי)
- חיפוש וקטורי ב-Supabase
- בדיקת תוצאות פנימיות

---

### שלב 2: החלטה על קריאה ל-Coordinator

**קובץ:** `BACKEND/src/communication/communicationManager.service.js`

```javascript
export function shouldCallCoordinator(query, vectorResults = [], internalData = {}) {
  // בדיקות:
  // 1. האם זה report query? (תמיד קוראים ל-Coordinator)
  const reportKeywords = ['report', 'conclusions', 'summary', 'findings', 'results', 'monthly', 'performance'];
  const isReportQuery = reportKeywords.some(keyword => queryLower.includes(keyword));
  
  if (isReportQuery) {
    return true; // תמיד קוראים ל-Coordinator עבור reports
  }
  
  // 2. בדיקת similarity scores
  const avgSimilarity = vectorResults.length > 0
    ? vectorResults.reduce((sum, r) => sum + (r.similarity || 0), 0) / vectorResults.length
    : 0;
  
  if (avgSimilarity < VECTOR_SIMILARITY_THRESHOLD) {
    return true; // Low similarity, צריך real-time data
  }
  
  // 3. בדיקת real-time requirements
  const realTimeKeywords = ['current', 'now', 'live', 'real-time', 'latest'];
  const requiresRealTime = realTimeKeywords.some(keyword => queryLower.includes(keyword));
  
  if (requiresRealTime) {
    return true; // Query דורש real-time data
  }
  
  return false; // Internal data מספיק
}
```

**תהליך:**
- בדיקת מילות מפתח (reports, real-time)
- בדיקת similarity scores
- החלטה אם לקרוא ל-Coordinator

---

### שלב 3: קריאה ל-Coordinator (אם נדרש)

**קובץ:** `BACKEND/src/clients/coordinator.client.js`

```javascript
export async function routeRequest({ tenant_id, user_id, query_text, metadata = {} }) {
  // יצירת Universal Envelope
  const envelope = createEnvelope(tenant_id, user_id, query_text, metadata);
  
  // בניית request לפי proto structure
  const request = {
    tenant_id: tenant_id || '',
    user_id: user_id || '',
    query_text: query_text,
    metadata: metadataMap  // הכל בתוך metadata!
  };
  
  // קריאה gRPC ל-Coordinator
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
- קריאה gRPC ל-Coordinator
- קבלת RouteResponse

---

### שלב 4: Coordinator מנתב למיקרו-שירות

**Coordinator (חיצוני):**
1. מקבל את ה-request מה-RAG
2. מנתב (AI routing) למיקרו-שירות המתאים
3. המיקרו-שירות מחזיר נתונים
4. Coordinator מחזיר RouteResponse עם הנתונים

**RouteResponse Structure:**
```protobuf
RouteResponse {
  target_services: ["managementreporting-service"],
  normalized_fields: {
    // כל הנתונים מהמיקרו-שירות כאן!
    "successful_service": "managementreporting-service",
    "rank_used": "1",
    "quality_score": "0.95",
    "data": JSON.stringify({
      request_id: "abc123",
      success: true,
      data: [...],  // ⭐ array של report objects
      metadata: {...}
    })
  },
  envelope_json: "{...}",  // Universal Envelope עם payload
  routing_metadata: "{...}" // מידע על routing
}
```

---

### שלב 5: Parsing ה-Response מה-Coordinator

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

### שלב 6: חילוץ Business Data

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
    } else {
      businessData.data = parsedResponse.envelope.payload;
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
  
  // Extract metadata
  businessData.metadata = {
    source: parsedResponse.envelope?.source || parsedResponse.successful_service,
    timestamp: parsedResponse.envelope?.timestamp || new Date().toISOString(),
    request_id: parsedResponse.envelope?.request_id || businessData.metadata.request_id || null,
    quality_score: parsedResponse.quality_score,
    rank_used: parsedResponse.rank_used,
    successful_service: parsedResponse.successful_service,
  };
  
  return businessData;
}
```

**תהליך:**
- חילוץ מ-envelope.successfulResult.data (Priority 1)
- חילוץ מ-envelope.payload (Priority 2)
- חילוץ מ-normalized_fields (Priority 3)
- טיפול במבנה החדש: `{ request_id, success, data: [...], metadata: {...} }`

---

### שלב 7: פרשנות Normalized Fields

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
        // Direct array format
        structured.content.push(...parsedValue);
      } else if (typeof parsedValue === 'object' && parsedValue !== null && Array.isArray(parsedValue.data)) {
        // New format: { request_id, success, data: [...], metadata: {...} }
        structured.content.push(...parsedValue.data);
        
        // Extract metadata
        if (parsedValue.metadata) {
          structured.metadata = { ...structured.metadata, ...parsedValue.metadata };
        }
      }
    } else if (key.includes('content') || key.includes('text')) {
      // Old format: content or text fields
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

### שלב 8: המרה ל-Format של RAG

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

### שלב 9: מיזוג עם תוצאות פנימיות

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

### שלב 10: חילוץ נתונים מ-Real-time/Batch Handlers

**קובץ:** `BACKEND/src/core/dataExtractor.js`

```javascript
class DataExtractor {
  extractItems(responseEnvelope, schema) {
    // STEP 1: Extract data from Coordinator's wrapped format
    let actualData = null;
    
    // Format 1: Coordinator wrapped format
    // { successfulResult: { data: [...] }, ... }
    if (responseEnvelope.successfulResult) {
      actualData = responseEnvelope.successfulResult.data;
    }
    // Format 2: Direct format from microservice
    // { success: true, data: [...] }
    else if (responseEnvelope.success !== undefined) {
      actualData = responseEnvelope.data;
    }
    // Format 3: Just data field
    // { data: [...] }
    else if (responseEnvelope.data !== undefined) {
      actualData = responseEnvelope.data;
    }
    
    // STEP 2: Extract items array from data
    let items = [];
    
    if (Array.isArray(actualData)) {
      items = actualData;
    } else if (actualData.items && Array.isArray(actualData.items)) {
      items = actualData.items;
    } else if (typeof actualData === 'object' && actualData !== null) {
      items = [actualData];
    }
    
    // STEP 3: Extract each item according to schema
    const extractedItems = items.map(item => this.extractItem(item, schema));
    
    return extractedItems;
  }
  
  extractItem(sourceItem, schema) {
    const extracted = {};
    for (const [fieldName, fieldType] of Object.entries(schema.data_structure)) {
      extracted[fieldName] = this.extractField(sourceItem, fieldName, fieldType);
    }
    return extracted;
  }
  
  buildContent(item, schema) {
    const parts = [];
    for (const [fieldName, fieldType] of Object.entries(schema.data_structure)) {
      const value = item[fieldName];
      if (!value) continue;
      const formatted = this.formatForContent(fieldName, value, fieldType, schema);
      if (formatted) {
        parts.push(formatted);
      }
    }
    return parts.join('\n\n');
  }
}
```

**תהליך:**
- חילוץ מ-3 פורמטים שונים
- חילוץ items array
- חילוץ לפי schema
- בניית content text

---

### שלב 11: Real-time Handler

**קובץ:** `BACKEND/src/handlers/realtimeHandler.js`

```javascript
async handle(input) {
  const { source_service, user_query, response_envelope } = input;
  
  // 1. Load schema
  const schema = schemaLoader.getSchema(source_service);
  
  // 2. Ensure table exists
  await tableManager.ensureTable(schema);
  
  // 3. Extract data
  const items = dataExtractor.extractItems(response_envelope, schema);
  
  // 4. Generate response
  const answer = await responseBuilder.buildResponse(items, user_query, schema);
  
  // 5. Store items (background)
  this.storeInBackground(items, tenant_id, schema);
  
  return {
    success: true,
    answer: answer,
    source: { service: source_service },
  };
}
```

**תהליך:**
- טעינת schema
- חילוץ נתונים
- יצירת תשובה
- אחסון ברקע

---

### שלב 12: Batch Handler

**קובץ:** `BACKEND/src/handlers/batchHandler.js`

```javascript
async handle(input) {
  const { source_service, response_envelope } = input;
  
  // 1. Load schema
  const schema = schemaLoader.getSchema(source_service);
  
  // 2. Ensure table exists
  await tableManager.ensureTable(schema);
  
  // 3. Extract items
  const extractedItems = dataExtractor.extractItems(response_envelope, schema);
  
  // 4. Process in parallel batches
  const results = await this.processParallel(extractedItems, tenant_id, schema);
  
  return {
    success: true,
    processed: items.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
  };
}
```

**תהליך:**
- טעינת schema
- חילוץ items
- עיבוד מקבילי
- אחסון batch

---

## 📊 דיאגרמת זרימה

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
    Yes → [Coordinator Client] → [gRPC Call]
    ↓                                    ↓
    No                                  [Coordinator]
    ↓                                    ↓
[Internal Results]              [Route to Microservice]
    ↓                                    ↓
[Merge Results]                 [Microservice Response]
    ↓                                    ↓
[Response Builder]              [RouteResponse]
    ↓                                    ↓
[Final Answer]                  [Parse Response]
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

## 🔑 נקודות מפתח

### 1. **מבנה חדש: data array**
הנתונים מהמיקרו-שירותים מגיעים במבנה חדש:
```javascript
{
  request_id: "abc123",
  success: true,
  data: [  // ⭐ array של report objects
    {
      report_name: "Monthly Learning Performance Report",
      generated_at: "2025-01-15T10:30:00.000Z",
      conclusions: {...}
    }
  ],
  metadata: {
    service: "managementreporting-service",
    processed_at: "2025-01-15T12:00:00.000Z",
    count: 3
  }
}
```

### 2. **Normalized Fields = JSON string**
המבנה החדש מגיע ב-`normalized_fields` כ-JSON string:
```javascript
normalized_fields: {
  data: JSON.stringify({
    request_id: "abc123",
    success: true,
    data: [...],  // ⭐ array של reports
    metadata: {...}
  })
}
```

### 3. **Envelope Payload = גם המבנה החדש**
הנתונים גם ב-`envelope_json.payload`:
```javascript
envelope.payload = {
  data: [...],  // ⭐ array של reports (מבנה חדש)
  metadata: {...}  // metadata נוסף
}
```

### 4. **חילוץ מ-data array**
הנתונים מחולצים מ-`data` array:
- `extractedData.data` - array של report objects
- כל report object מכיל: `report_name`, `generated_at`, `conclusions`, וכו'
- `metadata` נפרד ומכיל: `service`, `processed_at`, `count`

### 5. **המרה ל-RAG Format**
הנתונים מומרים ל-format של RAG:
```javascript
{
  contentId: "coordinator-report-0",
  contentType: "management_reporting",
  contentText: "...",  // ⭐ התוכן מ-conclusions
  metadata: {
    target_services: ["managementreporting-service"],  // ⭐ איזה מיקרו-שירות
    report_name: "Monthly Learning Performance Report",
    generated_at: "2025-01-15T10:30:00.000Z",
    // כל ה-metadata הנוסף
  }
}
```

---

## 📝 סיכום המסלול

1. **User Query** → RAG מקבל שאילתה
2. **Query Classification** → סיווג השאילתה (EDUCORE vs כללי)
3. **Internal Search** → חיפוש פנימי ב-Supabase
4. **Decision** → `shouldCallCoordinator()` מחליט אם לקרוא ל-Coordinator
5. **Coordinator Call** → `routeRequest()` קורא ל-Coordinator דרך gRPC
6. **Coordinator Routing** → Coordinator מנתב למיקרו-שירות
7. **Response** → Coordinator מחזיר `RouteResponse` עם הנתונים
8. **Parsing** → `parseRouteResponse()` מפרסר את ה-response
9. **Extraction** → `extractBusinessData()` מחלץ את הנתונים
10. **Interpretation** → `interpretNormalizedFields()` מפרש את ה-normalized_fields
11. **Conversion** → המרה ל-format של RAG
12. **Merge** → מיזוג עם תוצאות פנימיות
13. **LLM Processing** → הנתונים נשלחים ל-LLM ליצירת תשובה

---

## 🎯 איפה הנתונים נמצאים?

### ב-Response מה-Coordinator:
- `response.normalized_fields.data` - JSON string של המבנה החדש: `{ request_id, success, data: [...], metadata: {...} }`
- `response.envelope_json.payload.data` - array של report objects (מבנה חדש)
- `response.envelope_json.payload.metadata` - metadata נפרד: `{ service, processed_at, count }`
- `response.target_services` - ["managementreporting-service"]

### אחרי Processing:
- `processed.business_data.data` - array של report objects: `[{ report_name, generated_at, conclusions, ... }]`
- `processed.business_data.metadata` - metadata: `{ service, processed_at, count, request_id }`
- `processed.sources` - מקורות המידע (array של reports)
- `structured.content` - התוכן המפורש (array של report objects)
- `contentItems[].contentText` - התוכן הסופי (מ-conclusions או מ-report)

### ב-RAG Sources:
- `sources[].contentSnippet` - התוכן מהמיקרו-שירות (מ-conclusions)
- `sources[].sourceMicroservice` - "managementreporting-service"
- `sources[].metadata.target_services` - ["managementreporting-service"]
- `sources[].metadata.report_name` - שם הדוח
- `sources[].metadata.generated_at` - תאריך יצירה
- `sources[].metadata.service` - "managementreporting-service"
- `sources[].metadata.count` - מספר הדוחות

---

## 🔍 קבצים מרכזיים

### חילוץ נתונים:
- `BACKEND/src/core/dataExtractor.js` - חילוץ בסיסי לפי schema
- `BACKEND/src/services/coordinatorResponseParser.service.js` - Parsing וחילוץ מ-Coordinator
- `BACKEND/src/communication/schemaInterpreter.service.js` - פרשנות normalized fields

### עיבוד Query:
- `BACKEND/src/services/queryProcessing.service.js` - עיבוד שאילתות ראשי
- `BACKEND/src/services/grpcFallback.service.js` - gRPC fallback ו-conversion
- `BACKEND/src/communication/communicationManager.service.js` - החלטות על קריאה ל-Coordinator

### Handlers:
- `BACKEND/src/handlers/realtimeHandler.js` - Real-time data processing
- `BACKEND/src/handlers/batchHandler.js` - Batch data processing

---

**הנתונים מהמיקרו-שירותים נמצאים ב-`normalized_fields.data` (JSON string) ו-`envelope.payload.data` (array) ומחולצים דרך `extractBusinessData()` ו-`interpretNormalizedFields()`!**

**המבנה החדש: `{ request_id, success, data: [...], metadata: {...} }`**



