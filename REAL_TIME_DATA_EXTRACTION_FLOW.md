# מסלול חילוץ מידע REAL TIME עם managementreporting-service

## 📋 סקירה כללית

כאשר ה-RAG מקבל שאילתה שמצריכה מידע מ-managementreporting-service, המסלול הוא:

```
User Query → RAG Internal Search → Coordinator → managementreporting-service → Response Processing → Data Extraction
```

---

## 🔄 המסלול המלא

### שלב 1: קבלת Query והחלטה לקרוא ל-Coordinator

**קובץ:** `BACKEND/src/services/queryProcessing.service.js`

```javascript
// 1. חיפוש פנימי ב-RAG (Supabase)
const similarVectors = await searchSimilarVectors(...);

// 2. בדיקה אם צריך לקרוא ל-Coordinator
const shouldCall = shouldCallCoordinator(query, vectorResults, internalData);
```

**קובץ:** `BACKEND/src/communication/communicationManager.service.js`

```javascript
export function shouldCallCoordinator(query, vectorResults = [], internalData = {}) {
  // בדיקות:
  // - האם זה report query? (תמיד קוראים ל-Coordinator)
  // - האם יש מספיק תוצאות פנימיות?
  // - האם יש צורך במידע real-time?
  
  const reportKeywords = ['report', 'conclusions', 'summary', 'findings', 'results', 'monthly', 'performance'];
  const isReportQuery = reportKeywords.some(keyword => queryLower.includes(keyword));
  
  if (isReportQuery) {
    return true; // תמיד קוראים ל-Coordinator עבור reports
  }
  
  // בדיקות נוספות...
}
```

---

### שלב 2: קריאה ל-Coordinator

**קובץ:** `BACKEND/src/services/grpcFallback.service.js`

```javascript
export async function grpcFetchByCategory(category, { query, tenantId, userId, ... }) {
  // קריאה ל-Coordinator דרך Communication Manager
  const coordinatorResponse = await callCoordinatorRoute({
    tenant_id: tenantId,
    user_id: userId,
    query_text: query,
    metadata: {
      category,
      source: 'rag_fallback',
    },
  });
}
```

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

---

### שלב 3: Coordinator מנתב ל-managementreporting-service

**Coordinator:**
1. מקבל את ה-request מה-RAG
2. מנתב (AI routing) ל-managementreporting-service
3. managementreporting-service מחזיר נתונים
4. Coordinator מחזיר RouteResponse עם הנתונים

**RouteResponse Structure:**
```protobuf
RouteResponse {
  target_services: ["managementreporting-service"],
  normalized_fields: {
    // כל הנתונים מ-managementreporting-service כאן!
    "content": "...",
    "metadata": "...",
    "successful_service": "managementreporting-service",
    "rank_used": "1",
    "quality_score": "0.95",
    // נתונים נוספים מהמיקרו-שירות...
  },
  envelope_json: "{...}",  // Universal Envelope עם payload
  routing_metadata: "{...}" // מידע על routing
}
```

---

### שלב 4: עיבוד ה-Response מה-Coordinator

**קובץ:** `BACKEND/src/communication/communicationManager.service.js`

```javascript
export function processCoordinatorResponse(coordinatorResponse) {
  // 1. Parsing ה-response
  const parsed = parseRouteResponse(coordinatorResponse);
  
  // 2. חילוץ business data
  const businessData = extractBusinessData(parsed);
  
  return {
    target_services: parsed.target_services,  // ["managementreporting-service"]
    normalized_fields: parsed.normalized_fields,  // כל הנתונים!
    business_data: businessData.data,  // הנתונים המחולצים
    sources: businessData.sources,  // מקורות המידע
    successful_service: parsed.successful_service,  // "managementreporting-service"
    // ...
  };
}
```

---

### שלב 5: Parsing ה-Response

**קובץ:** `BACKEND/src/services/coordinatorResponseParser.service.js`

```javascript
export function parseRouteResponse(response) {
  const parsed = {
    target_services: response.target_services || [],  // ["managementreporting-service"]
    normalized_fields: response.normalized_fields || {},  // כל הנתונים!
    envelope_json: response.envelope_json || null,
    
    // Parsed fields
    successful_service: normalized.successful_service || 'none',  // "managementreporting-service"
    rank_used: parseInt(normalized.rank_used || '0', 10),  // 1
    quality_score: parseFloat(normalized.quality_score || '0'),  // 0.95
    
    // Parse envelope_json
    envelope: JSON.parse(parsed.envelope_json),  // Universal Envelope
  };
  
  return parsed;
}
```

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

  // 1. חילוץ מ-envelope payload
  if (parsedResponse.envelope?.payload) {
    businessData.data = parsedResponse.envelope.payload;
  }

  // 2. חילוץ מ-normalized_fields (כל הנתונים מ-managementreporting-service!)
  const normalized = parsedResponse.normalized_fields;
  const businessFields = {};
  
  // מסנן system fields, שומר רק business data
  const systemFields = [
    'successful_service', 'rank_used', 'total_attempts', 'stopped_reason',
    'quality_score', 'primary_target', 'primary_confidence', 'processing_time',
  ];

  Object.entries(normalized).forEach(([key, value]) => {
    if (!systemFields.includes(key)) {
      // מנסה לפרסר JSON values
      let parsedValue = value;
      if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        try {
          parsedValue = JSON.parse(value);
        } catch (_e) {
          // נשאר string אם parsing נכשל
        }
      }
      businessFields[key] = parsedValue;  // ⭐ הנתונים מ-managementreporting-service!
    }
  });

  businessData.data = businessData.data || businessFields;

  // ⭐ NEW STRUCTURE: חילוץ מ-data array (מבנה חדש של managementreporting-service)
  // המבנה החדש: { request_id, success, data: [...], metadata: {...} }
  let extractedData = businessData.data;
  
  // בדיקה אם data הוא במבנה החדש (יש field 'data' שהוא array)
  if (extractedData && typeof extractedData === 'object' && Array.isArray(extractedData.data)) {
    // מבנה חדש: { request_id, success, data: [...], metadata: {...} }
    businessData.data = extractedData.data; // חילוץ ה-data array
    businessData.sources = extractedData.data; // שימוש ב-data array כ-sources
    
    // מיזוג metadata מה-response
    if (extractedData.metadata) {
      businessData.metadata = {
        ...businessData.metadata,
        ...extractedData.metadata,
        request_id: extractedData.request_id || businessData.metadata.request_id,
      };
    }
  } else if (parsedResponse.envelope?.payload?.data && Array.isArray(parsedResponse.envelope.payload.data)) {
    // גם בדיקה ב-envelope payload ל-data array
    businessData.data = parsedResponse.envelope.payload.data;
    businessData.sources = parsedResponse.envelope.payload.data;
    
    // חילוץ metadata מ-envelope payload
    if (parsedResponse.envelope.payload.metadata) {
      businessData.metadata = {
        ...businessData.metadata,
        ...parsedResponse.envelope.payload.metadata,
      };
    }
  } else if (parsedResponse.envelope?.payload?.content) {
    // Fallback למבנה הישן: content field
    businessData.sources = Array.isArray(parsedResponse.envelope.payload.content)
      ? parsedResponse.envelope.payload.content
      : [parsedResponse.envelope.payload.content];
  }

  // 4. חילוץ metadata
  businessData.metadata = {
    ...businessData.metadata,
    source: parsedResponse.envelope?.source || parsedResponse.successful_service,  // "managementreporting-service"
    timestamp: parsedResponse.envelope?.timestamp || new Date().toISOString(),
    request_id: parsedResponse.envelope?.request_id || businessData.metadata.request_id || null,
    quality_score: parsedResponse.quality_score,
    rank_used: parsedResponse.rank_used,
    successful_service: parsedResponse.successful_service,  // "managementreporting-service"
  };

  return businessData;
}
```

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

  // עובר על כל ה-normalized_fields
  Object.entries(normalizedFields).forEach(([key, value]) => {
    // מנסה לפרסר JSON
    let parsedValue = value;
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      try {
        parsedValue = JSON.parse(value);
      } catch (_e) {
        parsedValue = value;
      }
    }

    // ⭐ NEW: טיפול מיוחד ב-'data' field (מבנה חדש של managementreporting-service)
    // קטגוריזציה לפי key patterns
    if (key === 'data' && Array.isArray(parsedValue)) {
      // מבנה חדש: data הוא array של report objects
      structured.content.push(...parsedValue);  // ⭐ כל ה-reports מ-managementreporting-service
    } else if (key.includes('content') || key.includes('text') || (key.includes('data') && !Array.isArray(parsedValue))) {
      // מבנה ישן או data שאינו array
      if (Array.isArray(parsedValue)) {
        structured.content.push(...parsedValue);
      } else {
        structured.content.push(parsedValue);  // ⭐ תוכן מ-managementreporting-service
      }
    } else if (key.includes('metadata') || key.includes('meta')) {
      structured.metadata[key] = parsedValue;  // ⭐ metadata מ-managementreporting-service
    } else {
      structured.fields[key] = parsedValue;  // ⭐ fields נוספים
    }
  });

  return structured;
}
```

---

### שלב 8: המרה ל-Format של RAG

**קובץ:** `BACKEND/src/services/grpcFallback.service.js`

```javascript
// Process Coordinator response
const processed = processCoordinatorResponse(coordinatorResponse);

// Interpret normalized fields
const interpretedFields = interpretNormalizedFields(processed.normalized_fields);

// Create structured fields
const structured = createStructuredFields(processed, interpretedFields);

// ⭐ NEW: גם בדיקה ב-business_data.data למבנה החדש
// מבנה חדש: { request_id, success, data: [...], metadata: {...} }
let dataArray = [];
if (processed.business_data?.data && Array.isArray(processed.business_data.data)) {
  // מבנה חדש - data הוא כבר array
  dataArray = processed.business_data.data;
} else if (processed.business_data?.data && typeof processed.business_data.data === 'object' && processed.business_data.data.data) {
  // מבנה מקונן
  dataArray = Array.isArray(processed.business_data.data.data) 
    ? processed.business_data.data.data 
    : [processed.business_data.data.data];
}

// המרה ל-format של RAG
// שימוש ב-structured.sources אם זמין, אחרת המרת dataArray
const sourcesToConvert = structured.sources.length > 0 ? structured.sources : dataArray.map((item, index) => {
  // המרת data array items ל-source format
  if (typeof item === 'object' && item !== null) {
    const isReportFormat = item.report_name && item.generated_at;
    const conclusionsText = item.conclusions 
      ? (typeof item.conclusions === 'string' ? item.conclusions : JSON.stringify(item.conclusions))
      : '';
    const contentText = conclusionsText || item.content || item.text || item.description || JSON.stringify(item);
    
    return {
      sourceId: item.id || item.report_id || `coordinator-${index}`,
      sourceType: isReportFormat ? 'management_reporting' : (item.type || category),
      sourceMicroservice: processed.target_services?.[0] || 'coordinator',
      title: item.report_name || item.title || item.name || `Source ${index + 1}`,
      contentSnippet: contentText.substring(0, 500),  // ⭐ התוכן מ-managementreporting-service!
      sourceUrl: item.url || item.sourceUrl || '',
      relevanceScore: item.relevanceScore || item.score || 0.75,
      metadata: {
        ...(item.metadata || {}),
        report_name: item.report_name,
        generated_at: item.generated_at,
        report_type: item.report_type,
        source: 'coordinator',
        target_services: processed.target_services || [],  // ["managementreporting-service"]
      },
    };
  }
  return null;
}).filter(Boolean);

const contentItems = sourcesToConvert.map((source) => ({
  contentId: source.sourceId,
  contentType: source.sourceType || category,
  contentText: source.contentSnippet || '',  // ⭐ התוכן מ-managementreporting-service!
  metadata: {
    ...source.metadata,
    title: source.title,
    url: source.sourceUrl,
    relevanceScore: source.relevanceScore,
    source: 'coordinator',
    target_services: processed.target_services || [],  // ["managementreporting-service"]
  },
}));

return contentItems;  // ⭐ מוחזר ל-queryProcessing.service.js
```

---

### שלב 9: מיזוג עם תוצאות פנימיות

**קובץ:** `BACKEND/src/services/queryProcessing.service.js`

```javascript
// Convert Coordinator results into sources format
coordinatorSources = grpcContext.map((item, idx) => ({
  sourceId: item.contentId || `coordinator-${idx}`,
  sourceType: item.contentType || category || 'coordinator',
  sourceMicroservice: item.metadata?.target_services?.[0] || 'coordinator',  // "managementreporting-service"
  title: item.metadata?.title || item.contentType || 'Coordinator Source',
  contentSnippet: String(item.contentText || '').substring(0, 200),  // ⭐ התוכן!
  sourceUrl: item.metadata?.url || '',
  relevanceScore: item.metadata?.relevanceScore || 0.75,
  metadata: { ...(item.metadata || {}), via: 'coordinator' },
}));

// Merge internal and Coordinator results
const merged = mergeResults(sources, {
  sources: coordinatorSources,  // ⭐ הנתונים מ-managementreporting-service!
  metadata: {
    target_services: coordinatorSources[0]?.metadata?.target_services || [],  // ["managementreporting-service"]
  },
});

// Update sources and context
sources = merged.sources || sources;
retrievedContext = merged.context || retrievedContext;
```

---

## 📊 דוגמה: נתונים מ-managementreporting-service

### Request מה-RAG ל-Coordinator:
```javascript
{
  tenant_id: "tenant-123",
  user_id: "user-456",
  query_text: "Give me the four conclusions of the Monthly Learning Performance Report",
  metadata: {
    category: "management_reporting",
    source: "rag_fallback",
  }
}
```

### Response מה-Coordinator (מבנה חדש):
```javascript
{
  target_services: ["managementreporting-service"],
  normalized_fields: {
    successful_service: "managementreporting-service",
    rank_used: "1",
    quality_score: "0.95",
    // ⭐ מבנה חדש: data הוא JSON string של האובייקט המלא
    data: JSON.stringify({
      request_id: "abc123",
      success: true,
      data: [
        {
          report_name: "Monthly Learning Performance Report",
          generated_at: "2025-01-15T10:30:00.000Z",
          conclusions: {
            conclusion_1: "Conclusion 1: ...",
            conclusion_2: "Conclusion 2: ...",
            conclusion_3: "Conclusion 3: ...",
            conclusion_4: "Conclusion 4: ..."
          },
          report_type: "monthly_performance"
        },
        // ... reports נוספים
      ],
      metadata: {
        service: "managementreporting-service",
        processed_at: "2025-01-15T12:00:00.000Z",
        count: 3
      }
    })
  },
  envelope_json: JSON.stringify({
    version: "1.0",
    timestamp: "2025-01-13T10:00:00Z",
    source: "managementreporting-service",
    payload: {
      // ⭐ גם ב-envelope payload - המבנה החדש
      data: [
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
  })
}
```

### הנתונים המחולצים ב-RAG:
```javascript
{
  sources: [
    {
      sourceId: "coordinator-report-0",
      sourceType: "management_reporting",
      sourceMicroservice: "managementreporting-service",  // ⭐
      title: "Monthly Learning Performance Report",
      contentSnippet: "Conclusion 1: ... Conclusion 2: ... Conclusion 3: ... Conclusion 4: ...",  // ⭐ התוכן!
      metadata: {
        target_services: ["managementreporting-service"],  // ⭐
        via: "coordinator",
        report_name: "Monthly Learning Performance Report",
        generated_at: "2025-01-15T10:30:00.000Z",
        report_type: "monthly_performance",
        service: "managementreporting-service",
        processed_at: "2025-01-15T12:00:00.000Z",
        count: 3
      }
    }
  ],
  business_data: {
    data: [  // ⭐ array של reports
      {
        report_name: "Monthly Learning Performance Report",
        generated_at: "2025-01-15T10:30:00.000Z",
        conclusions: {...}
      }
    ],
    metadata: {
      service: "managementreporting-service",
      processed_at: "2025-01-15T12:00:00.000Z",
      count: 3,
      request_id: "abc123"
    }
  }
}
```

---

## 🔑 נקודות מפתח

### 1. **מבנה חדש: data array**
הנתונים מ-managementreporting-service מגיעים במבנה חדש:
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
2. **Internal Search** → חיפוש פנימי ב-Supabase
3. **Decision** → `shouldCallCoordinator()` מחליט אם לקרוא ל-Coordinator
4. **Coordinator Call** → `routeRequest()` קורא ל-Coordinator דרך gRPC
5. **Coordinator Routing** → Coordinator מנתב ל-managementreporting-service
6. **Response** → Coordinator מחזיר `RouteResponse` עם הנתונים
7. **Parsing** → `parseRouteResponse()` מפרסר את ה-response
8. **Extraction** → `extractBusinessData()` מחלץ את הנתונים
9. **Interpretation** → `interpretNormalizedFields()` מפרש את ה-normalized_fields
10. **Conversion** → המרה ל-format של RAG
11. **Merge** → מיזוג עם תוצאות פנימיות
12. **LLM Processing** → הנתונים נשלחים ל-LLM ליצירת תשובה

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
- `sources[].contentSnippet` - התוכן מ-managementreporting-service (מ-conclusions)
- `sources[].sourceMicroservice` - "managementreporting-service"
- `sources[].metadata.target_services` - ["managementreporting-service"]
- `sources[].metadata.report_name` - שם הדוח
- `sources[].metadata.generated_at` - תאריך יצירה
- `sources[].metadata.service` - "managementreporting-service"
- `sources[].metadata.count` - מספר הדוחות

---

**הנתונים מ-managementreporting-service נמצאים ב-`normalized_fields.data` (JSON string) ו-`envelope.payload.data` (array) ומחולצים דרך `extractBusinessData()` ו-`interpretNormalizedFields()`!**

**המבנה החדש: `{ request_id, success, data: [...], metadata: {...} }`**

