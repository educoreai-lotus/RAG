# 🔄 זרימת BATCH TRIGGER - הסבר מפורט

## 📋 תוכן עניינים
1. [דרכי הפעלה](#דרכי-הפעלה)
2. [זרימה מלאה](#זרימה-מלאה)
3. [קבצים מעורבים](#קבצים-מעורבים)
4. [פירוט שלבים](#פירוט-שלבים)

---

## 🚀 דרכי הפעלה

### 1. **הפעלה אוטומטית (Scheduled)**
- **קובץ:** `BACKEND/src/jobs/scheduledSync.js`
- **מתי:** לפי לוח זמנים (Cron Schedule)
- **ברירת מחדל:** כל יום בשעה 2:00 בלילה (`0 2 * * *`)
- **הגדרה:** `BATCH_SYNC_SCHEDULE` env var
- **הפעלה:** `startScheduledSync()` נקרא ב-`BACKEND/src/index.js` בעת הפעלת השרת

### 2. **הפעלה ידנית (Manual Trigger)**
- **Endpoint:** `POST /admin/batch-sync/trigger`
- **קובץ:** `BACKEND/src/routes/admin.routes.js`
- **מתי:** לפי בקשה מהמנהל
- **פונקציה:** `runBatchSync()`

### 3. **הפעלה בעת הפעלה (On Startup)**
- **תנאי:** `BATCH_SYNC_ON_STARTUP=true`
- **מתי:** 5 שניות אחרי הפעלת השרת
- **קובץ:** `BACKEND/src/jobs/scheduledSync.js` (שורה 140-149)

---

## 🔄 זרימה מלאה

```
┌─────────────────────────────────────────────────────────────────┐
│                    BATCH TRIGGER FLOW                           │
└─────────────────────────────────────────────────────────────────┘

1. TRIGGER (הפעלה)
   │
   ├─► Scheduled (Cron) ──► scheduledSync.js ──► runBatchSync()
   │
   ├─► Manual (API) ───────► admin.routes.js ────► runBatchSync()
   │
   └─► On Startup ─────────► scheduledSync.js ────► runBatchSync()
   
2. runBatchSync()
   │
   └─► syncAllServices() ──► batchSyncService.js
       │
       ├─► getServicesToSync() ──► רשימת שירותים
       │
       └─► syncService(serviceName) ──► לכל שירות
           │
           ├─► Pagination Loop (עמודים)
           │   │
           │   ├─► batchSync() ──► coordinator.client.js
           │   │   │
           │   │   └─► Coordinator (gRPC) ──► Microservice
           │   │
           │   ├─► processCoordinatorResponse()
           │   │
           │   └─► Extract data from envelope_json
           │
           └─► updateDataStore(serviceName, allData)
               │
               ├─► buildResponseEnvelope()
               │
               └─► batchHandler.handle()
                   │
                   ├─► schemaLoader.getSchema()
                   ├─► dataExtractor.extractItems()
                   ├─► processParallel()
                   │   │
                   │   ├─► processChunk()
                   │   │   │
                   │   │   ├─► vectorizer.generateBatch()
                   │   │   │
                   │   │   └─► storage.store() ──► vector_embeddings
                   │   │       │
                   │   │       └─► kgBuilder.buildFromContent() (optional)
                   │   │
                   │   └─► Parallel processing (5 workers, 50 items/chunk)
                   │
                   └─► Return results
```

---

## 📁 קבצים מעורבים

### 1. **scheduledSync.js** - Scheduler
**מיקום:** `BACKEND/src/jobs/scheduledSync.js`

**תפקיד:**
- ניהול לוח הזמנים (Cron)
- הפעלת batch sync אוטומטית
- מניעת הפעלות כפולות (`isRunning` flag)

**פונקציות עיקריות:**
```javascript
runBatchSync(options)        // הפעלת sync
startScheduledSync()         // התחלת scheduler
stopScheduledSync()          // עצירת scheduler
getSchedulerStatus()         // סטטוס scheduler
```

**הגדרות סביבה:**
- `BATCH_SYNC_ENABLED` - הפעלה/כיבוי (default: true)
- `BATCH_SYNC_SCHEDULE` - לוח זמנים (default: `0 2 * * *`)
- `BATCH_SYNC_ON_STARTUP` - הפעלה בעת הפעלה (default: false)
- `BATCH_SYNC_TIMEZONE` - אזור זמן (default: UTC)

---

### 2. **admin.routes.js** - Manual Trigger
**מיקום:** `BACKEND/src/routes/admin.routes.js`

**Endpoints:**
```javascript
POST /admin/batch-sync/trigger  // הפעלה ידנית
GET  /admin/batch-sync/services  // רשימת שירותים
```

**זרימה:**
```
POST /admin/batch-sync/trigger
  └─► runBatchSync()
      └─► syncAllServices()
```

---

### 3. **batchSyncService.js** - Core Service
**מיקום:** `BACKEND/src/services/batchSyncService.js`

**פונקציות עיקריות:**

#### `getServicesToSync()`
**תפקיד:** קבלת רשימת שירותים לסנכרון

**עדיפויות:**
1. `BATCH_SYNC_SERVICES` env var (עקיפה ידנית)
2. Coordinator's list (מקור האמת)
3. Fallback list (אם Coordinator נכשל)

#### `syncService(serviceName, options)`
**תפקיד:** סנכרון שירות בודד עם pagination

**זרימה:**
```javascript
1. בדיקת BATCH_SYNC_ENABLED
2. Pagination Loop:
   ├─► batchSync() ──► Coordinator (gRPC)
   ├─► processCoordinatorResponse()
   ├─► Extract data from envelope_json
   └─► Accumulate allData
3. updateDataStore(serviceName, allData)
```

**פרמטרים:**
- `serviceName` - שם השירות
- `options.syncType` - סוג sync ('batch', 'daily', 'incremental')
- `options.since` - תאריך ISO לסנכרון אינקרמנטלי

#### `syncAllServices(options)`
**תפקיד:** סנכרון כל השירותים

**זרימה:**
```javascript
1. getServicesToSync() ──► רשימת שירותים
2. For each service:
   └─► syncService(serviceName, options)
3. Aggregate results
```

#### `updateDataStore(serviceName, data)` ⭐ NEW
**תפקיד:** שמירת נתונים ב-vector DB

**זרימה:**
```javascript
1. buildResponseEnvelope(data)
2. batchHandler.handle({
     source_service: serviceName,
     tenant_id: tenantId,
     response_envelope: responseEnvelope
   })
```

#### `buildResponseEnvelope(responseData)` ⭐ NEW
**תפקיד:** בניית response envelope בפורמט הנדרש

**תמיכה בפורמטים:**
- Format 1: `{ data: { items: [...] } }`
- Format 2: `{ data: [...] }` (array)
- Format 3: `{ successfulResult: { data: [...] } }`
- Format 4: `[...]` (raw array)

---

### 4. **coordinator.client.js** - gRPC Client
**מיקום:** `BACKEND/src/clients/coordinator.client.js`

**פונקציה:** `batchSync(params)`

**פרמטרים:**
```javascript
{
  target_service: 'service-name',  // ⭐ CRITICAL
  sync_type: 'batch',                // ⭐ CRITICAL
  page: 1,
  limit: 1000,
  since: '2024-01-01T00:00:00Z'     // optional
}
```

**תפקיד:**
- קריאה ל-Coordinator דרך gRPC
- קבלת נתונים מה-Microservice
- החזרת response עם `envelope_json`

---

### 5. **batchHandler.js** - Data Processing
**מיקום:** `BACKEND/src/handlers/batchHandler.js`

**פונקציה:** `handle(input)`

**Input:**
```javascript
{
  source_service: 'service-name',
  tenant_id: 'tenant-id',
  response_envelope: {
    data: { items: [...] },
    metadata: { page, total, has_more }
  }
}
```

**זרימה:**
```javascript
1. schemaLoader.getSchema(source_service)
2. dataExtractor.extractItems(response_envelope, schema)
3. processParallel(extractedItems, tenantId, schema)
   │
   ├─► Split into chunks (50 items/chunk)
   │
   └─► Process chunks in parallel (5 workers)
       │
       └─► processChunk(items, tenantId, schema)
           │
           ├─► dataExtractor.buildContent() ──► contents[]
           ├─► vectorizer.generateBatch() ───► embeddings[]
           │
           └─► For each item:
               ├─► storage.store() ──► vector_embeddings
               └─► kgBuilder.buildFromContent() (optional, background)
```

---

### 6. **storage.js** - Vector Storage
**מיקום:** `BACKEND/src/core/storage.js`

**פונקציה:** `store(item, content, embedding, tenantId, schema)`

**תפקיד:**
- שמירה ב-`vector_embeddings` table
- יצירת/עדכון embeddings
- יצירת/עדכון microservice record

---

### 7. **kgBuilder.service.js** ⭐ NEW - Knowledge Graph
**מיקום:** `BACKEND/src/services/kgBuilder.service.js`

**פונקציה:** `buildFromContent(contentId, contentText, metadata, tenantId)`

**תפקיד:**
- יצירת nodes ב-`knowledge_graph_nodes`
- יצירת edges ב-`knowledge_graph_edges`
- מציאת תוכן קשור (semantic similarity)

**זרימה:**
```javascript
1. createContentNode() ──► knowledge_graph_nodes
2. findRelatedContent() ──► Semantic search
3. createRelationshipEdges() ──► knowledge_graph_edges
```

---

## 🔍 פירוט שלבים

### שלב 1: TRIGGER (הפעלה)

#### א. Scheduled Trigger
```javascript
// BACKEND/src/index.js (שורה 688)
startScheduledSync();

// BACKEND/src/jobs/scheduledSync.js
export function startScheduledSync() {
  scheduledTask = cron.schedule(BATCH_SYNC_SCHEDULE, async () => {
    await runBatchSync();
  });
}
```

#### ב. Manual Trigger
```javascript
// POST /admin/batch-sync/trigger
router.post('/batch-sync/trigger', async (req, res) => {
  const result = await runBatchSync();
  res.json({ success: true, result });
});
```

---

### שלב 2: runBatchSync()

```javascript
// BACKEND/src/jobs/scheduledSync.js
export async function runBatchSync(options = {}) {
  // בדיקת isRunning flag
  if (isRunning) return { success: false, reason: 'already_running' };
  
  // בדיקת BATCH_SYNC_ENABLED
  if (!BATCH_SYNC_ENABLED) return { success: false, reason: 'disabled' };
  
  isRunning = true;
  
  // קריאה ל-syncAllServices
  const result = await syncAllServices({
    syncType: 'daily',
    ...options
  });
  
  isRunning = false;
  return result;
}
```

---

### שלב 3: syncAllServices()

```javascript
// BACKEND/src/services/batchSyncService.js
export async function syncAllServices(options = {}) {
  // 1. קבלת רשימת שירותים
  const services = await getServicesToSync();
  
  // 2. סנכרון כל שירות (בלתי תלוי)
  for (const serviceName of services) {
    try {
      const result = await syncService(serviceName, options);
      results.push(result);
    } catch (error) {
      // שגיאה בשירות אחד לא עוצרת את השאר
      results.push({ success: false, error: error.message });
    }
  }
  
  // 3. סיכום תוצאות
  return {
    success: failedServices === 0,
    services: results,
    totalItems,
    totalErrors
  };
}
```

---

### שלב 4: syncService() - Pagination

```javascript
// BACKEND/src/services/batchSyncService.js
export async function syncService(serviceName, options = {}) {
  let page = 1;
  let hasMore = true;
  const allData = [];
  
  // Pagination Loop
  while (hasMore) {
    // 1. קריאה ל-Coordinator
    const response = await batchSync({
      target_service: serviceName,
      sync_type: 'batch',
      page,
      limit: BATCH_SYNC_LIMIT
    });
    
    // 2. עיבוד תגובה
    const processed = processCoordinatorResponse(response);
    
    // 3. חילוץ נתונים
    const envelope = JSON.parse(response.envelope_json);
    const pageData = envelope.payload?.data || [];
    
    // 4. איסוף נתונים
    allData.push(...pageData);
    
    // 5. בדיקת עמודים נוספים
    const hasMoreFlag = response.normalized_fields?.has_more;
    if (hasMoreFlag === 'true' || hasMoreFlag === true) {
      page++;
    } else if (pageData.length < BATCH_SYNC_LIMIT) {
      hasMore = false;
    } else {
      page++;
    }
  }
  
  // 6. שמירת כל הנתונים
  if (allData.length > 0) {
    await updateDataStore(serviceName, allData);
  }
}
```

---

### שלב 5: updateDataStore() ⭐ NEW

```javascript
// BACKEND/src/services/batchSyncService.js
async function updateDataStore(serviceName, data) {
  // 1. בניית response envelope
  const responseEnvelope = buildResponseEnvelope(data);
  
  // 2. קריאה ל-batchHandler
  const batchHandler = await import('../handlers/batchHandler.js');
  const tenantId = process.env.DEFAULT_TENANT_ID || 'default-tenant';
  
  await batchHandler.default.handle({
    source_service: serviceName,
    tenant_id: tenantId,
    response_envelope: responseEnvelope
  });
}
```

---

### שלב 6: batchHandler.handle()

```javascript
// BACKEND/src/handlers/batchHandler.js
async handle(input) {
  const { source_service, tenant_id, response_envelope } = input;
  
  // 1. טעינת schema
  const schema = schemaLoader.getSchema(source_service);
  
  // 2. חילוץ items
  const extractedItems = dataExtractor.extractItems(response_envelope, schema);
  
  // 3. עיבוד מקבילי
  const results = await this.processParallel(extractedItems, tenant_id, schema);
  
  return {
    success: true,
    processed: extractedItems.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length
  };
}
```

---

### שלב 7: processParallel()

```javascript
// BACKEND/src/handlers/batchHandler.js
async processParallel(items, tenantId, schema) {
  const BATCH_SIZE = 50;
  const WORKERS = 5;
  
  // 1. חלוקה ל-chunks
  const chunks = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    chunks.push(items.slice(i, i + BATCH_SIZE));
  }
  
  // 2. עיבוד מקבילי (5 workers)
  for (let i = 0; i < chunks.length; i += WORKERS) {
    const batch = chunks.slice(i, i + WORKERS);
    const promises = batch.map(chunk => 
      this.processChunk(chunk, tenantId, schema)
    );
    const batchResults = await Promise.all(promises);
    results.push(...batchResults.flat());
  }
  
  return results;
}
```

---

### שלב 8: processChunk()

```javascript
// BACKEND/src/handlers/batchHandler.js
async processChunk(items, tenantId, schema) {
  // 1. בניית תוכן
  const contents = items.map(item => 
    dataExtractor.buildContent(item, schema)
  );
  
  // 2. יצירת embeddings (batch)
  const embeddings = await vectorizer.generateBatch(contents);
  
  // 3. שמירה לכל item
  for (let i = 0; i < items.length; i++) {
    // שמירה ב-vector_embeddings
    await storage.store(
      items[i],
      contents[i],
      embeddings[i],
      tenantId,
      schema
    );
    
    // ⭐ NEW: בניית Knowledge Graph (background, optional)
    kgBuilder.buildFromContent(
      contentId,
      contents[i],
      { source_service: schema.service_name, batch_processed: true },
      tenantId
    ).catch(kgError => {
      // לא נכשל אם KG נכשל
      logger.debug('[Batch] KG build failed (non-critical)');
    });
  }
}
```

---

## ⚙️ הגדרות סביבה

```bash
# הפעלה/כיבוי
BATCH_SYNC_ENABLED=true

# לוח זמנים (Cron)
BATCH_SYNC_SCHEDULE=0 2 * * *          # כל יום בשעה 2:00
BATCH_SYNC_TIMEZONE=UTC

# הגדרות pagination
BATCH_SYNC_LIMIT=1000                  # פריטים לעמוד

# רשימת שירותים (עקיפה ידנית)
BATCH_SYNC_SERVICES=service1,service2,service3

# הפעלה בעת הפעלה
BATCH_SYNC_ON_STARTUP=false

# Tenant ID (לשמירה)
DEFAULT_TENANT_ID=default-tenant
```

---

## 📊 דיאגרמת זרימה מפורטת

```
┌──────────────────────────────────────────────────────────────┐
│                    BATCH SYNC FLOW                           │
└──────────────────────────────────────────────────────────────┘

[TRIGGER]
    │
    ├─► Scheduled (Cron) ──┐
    ├─► Manual (API) ──────┤
    └─► On Startup ────────┘
        │
        ▼
[runBatchSync()]
    │
    ├─► Check: isRunning? ──► Skip if yes
    ├─► Check: BATCH_SYNC_ENABLED? ──► Skip if no
    │
    ▼
[syncAllServices()]
    │
    ├─► getServicesToSync()
    │   ├─► BATCH_SYNC_SERVICES env var?
    │   ├─► Coordinator.listServices()?
    │   └─► Fallback list
    │
    └─► For each service:
        │
        ▼
    [syncService(serviceName)]
        │
        ├─► Pagination Loop:
        │   │
        │   ├─► batchSync() ──► Coordinator (gRPC)
        │   │   │
        │   │   └─► Microservice returns data
        │   │
        │   ├─► processCoordinatorResponse()
        │   ├─► Extract envelope_json
        │   └─► Accumulate allData
        │
        └─► updateDataStore(serviceName, allData)
            │
            ├─► buildResponseEnvelope(data)
            │
            └─► batchHandler.handle()
                │
                ├─► schemaLoader.getSchema()
                ├─► dataExtractor.extractItems()
                │
                └─► processParallel()
                    │
                    ├─► Split into chunks (50 items)
                    │
                    └─► Process chunks (5 workers in parallel)
                        │
                        └─► processChunk()
                            │
                            ├─► buildContent() ──► contents[]
                            ├─► generateBatch() ──► embeddings[]
                            │
                            └─► For each item:
                                ├─► storage.store() ──► vector_embeddings ✅
                                └─► kgBuilder.buildFromContent() ──► KG (optional) ⭐
```

---

## ✅ נקודות חשובות

1. **Pagination:** Batch sync תומך ב-pagination אוטומטי
2. **Error Handling:** שגיאה בשירות אחד לא עוצרת את השאר
3. **Parallel Processing:** עיבוד מקבילי (5 workers, 50 items/chunk)
4. **Knowledge Graph:** בניית KG היא אופציונלית ולא חוסמת
5. **Tenant ID:** משתמש ב-`DEFAULT_TENANT_ID` או `'default-tenant'`
6. **Scheduling:** תמיכה ב-Cron scheduling עם node-cron
7. **Manual Trigger:** אפשרות להפעלה ידנית דרך API

---

## 🔧 Debugging

### בדיקת סטטוס:
```bash
GET /health/batch-sync
```

### הפעלה ידנית:
```bash
POST /admin/batch-sync/trigger
```

### רשימת שירותים:
```bash
GET /admin/batch-sync/services
```

---

**נוצר:** $(date)
**עודכן:** לאחר הוספת batch sync storage ו-KG building

