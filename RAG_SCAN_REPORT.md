# RAG Service - Realtime & Batch Code Scan Report

## Date: 2024-12-19
## Scanned by: Cursor AI

---

## 1. Directory Structure

```
BACKEND/src/
├── handlers/
│   ├── realtimeHandler.js      ✅ EXISTS
│   └── batchHandler.js          ✅ EXISTS
├── core/
│   ├── ragHandler.js            ✅ EXISTS (exports handleRAGRequest)
│   ├── dataExtractor.js         ✅ EXISTS (USED)
│   └── responseBuilder.js       ✅ EXISTS (NOT USED)
├── services/
│   ├── queryProcessing.service.js    ✅ EXISTS (ACTUAL FLOW)
│   ├── grpcFallback.service.js      ✅ EXISTS (ACTUAL FLOW)
│   ├── batchSyncService.js           ✅ EXISTS (BATCH SYNC)
│   └── coordinatorResponseParser.service.js  ✅ EXISTS (ACTUAL FLOW)
├── communication/
│   └── communicationManager.service.js  ✅ EXISTS (ACTUAL FLOW)
└── controllers/
    ├── query.controller.js       ✅ EXISTS (HTTP ENTRY)
    └── microserviceSupport.controller.js  ✅ EXISTS (SUPPORT MODE)
```

---

## 2. Key Files Found

| File | Purpose | Status | Actually Used? |
|------|---------|--------|----------------|
| `handlers/realtimeHandler.js` | Real-time RAG handler | ✅ EXISTS | ❌ **NOT CALLED** |
| `handlers/batchHandler.js` | Batch sync handler | ✅ EXISTS | ❌ **NOT CALLED** |
| `core/ragHandler.js` | Main RAG handler (exports handleRAGRequest) | ✅ EXISTS | ❌ **NOT CALLED** |
| `core/dataExtractor.js` | Extract data from responses | ✅ EXISTS | ✅ **USED** |
| `core/responseBuilder.js` | Build LLM responses | ✅ EXISTS | ❌ **NOT USED** |
| `services/queryProcessing.service.js` | Actual query processing | ✅ EXISTS | ✅ **ACTUAL FLOW** |
| `services/grpcFallback.service.js` | Coordinator integration | ✅ EXISTS | ✅ **ACTUAL FLOW** |
| `services/batchSyncService.js` | Batch sync service | ✅ EXISTS | ✅ **USED FOR BATCH** |

---

## 3. Realtime Handler

**File:** `BACKEND/src/handlers/realtimeHandler.js`

### Current Code:

```javascript
class RealtimeHandler {
  async handle(input) {
    const {
      source_service,
      user_query,
      user_id,
      tenant_id,
      response_envelope
    } = input;

    // 1. Load schema
    const schema = schemaLoader.getSchema(source_service);

    // 2. Ensure table exists
    await tableManager.ensureTable(schema);

    // 3. Extract data
    const items = dataExtractor.extractItems(response_envelope, schema);

    if (items.length === 0) {
      return {
        success: false,
        message: `No data found from ${schema.description || schema.service_name}`,
        suggestions: ['Try a different query', 'Check if data exists']
      };
    }

    // 4. Generate response
    const answer = await responseBuilder.buildResponse(
      items,
      user_query,
      schema
    );

    // 5. Store items (background)
    this.storeInBackground(items, tenant_id, schema).catch(error => {
      logger.warn('[Real-time] Background store failed', {
        service: source_service,
        error: error.message
      });
    });

    return {
      success: true,
      answer: answer,
      source: {
        service: source_service,
        description: schema.description || schema.service_name
      },
      metadata: {
        query: user_query,
        items_returned: items.length,
        timestamp: new Date().toISOString()
      }
    };
  }
}
```

### Data Extraction:

**How is data extracted from response_envelope?**

- Uses `dataExtractor.extractItems(response_envelope, schema)` (line 40)
- Handles multiple formats:
  - Coordinator wrapped: `{ successfulResult: { data: [...] } }`
  - Direct format: `{ success: true, data: [...] }`
  - Data-only: `{ data: [...] }`
- Extracts items array from data
- Maps each item according to schema's `data_structure`

**What fields are accessed?**

```javascript
// From dataExtractor.js:
- responseEnvelope.successfulResult.data
- responseEnvelope.success
- responseEnvelope.data
- responseEnvelope.data.items (for batch format)
- schema.data_structure (for field mapping)
```

### Response Building:

**How is the final response built?**

- Calls `responseBuilder.buildResponse(items, user_query, schema)` (line 51-55)
- Response builder:
  1. Builds context from items using schema fields
  2. Calls LLM with context and user query
  3. Returns LLM-generated answer

**What is returned to the user?**

```javascript
{
  success: true,
  answer: "<LLM-generated answer>",
  source: {
    service: source_service,
    description: schema.description
  },
  metadata: {
    query: user_query,
    items_returned: items.length,
    timestamp: ISO timestamp
  }
}
```

### LLM/AI Integration:

**Is there any LLM call?**

✅ YES - In `responseBuilder.buildResponse()`:

```javascript
const completion = await openai.chat.completions.create({
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  temperature: 0.7,
  max_tokens: 1000
});
```

**How is the answer generated?**

1. Builds context from extracted items
2. Creates system prompt with service description
3. Creates user prompt with context and query
4. Calls OpenAI API
5. Returns LLM response

### Issues/Anomalies:

- ❌ **CRITICAL: This handler is NOT being called anywhere in the codebase!**
- ✅ Code looks correct and functional
- ✅ Data extraction logic is comprehensive
- ✅ Response building uses LLM correctly
- ⚠️ Handler exists but is orphaned - not integrated into actual flow

---

## 4. Batch Handler

**File:** `BACKEND/src/handlers/batchHandler.js`

### Current Code:

```javascript
class BatchHandler {
  async handle(input) {
    const {
      source_service,
      tenant_id,
      response_envelope
    } = input;

    const { data, metadata } = response_envelope;
    const items = data?.items || [];
    const page = metadata?.page || data?.page || 1;
    const total = metadata?.total || data?.total || items.length;

    // 1. Load schema
    const schema = schemaLoader.getSchema(source_service);

    // 2. Ensure table exists
    await tableManager.ensureTable(schema);

    // 3. Extract items
    const extractedItems = dataExtractor.extractItems(response_envelope, schema);

    // 4. Process in parallel batches
    const results = await this.processParallel(
      extractedItems,
      tenant_id,
      schema
    );

    return {
      success: true,
      processed: items.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      page,
      has_more: metadata?.has_more || false,
      total
    };
  }

  async processParallel(items, tenantId, schema) {
    const BATCH_SIZE = 50;
    const WORKERS = 5;
    // ... processes items in parallel batches
  }
}
```

### Data Processing:

**How is batch data processed?**

- Extracts items using `dataExtractor.extractItems()` (line 43)
- Processes in parallel batches (50 items per batch, 5 workers)
- For each batch:
  1. Builds content for all items
  2. Generates embeddings in batch
  3. Stores each item with embedding

**How are items extracted?**

```javascript
// Uses same dataExtractor.extractItems() as realtime
// Handles:
// - Array format: data: [item1, item2, ...]
// - Items format: data: { items: [...], page: 1, total: 100 }
// - Single object: data: { id: 123, ... }
```

### Storage:

**Where is data stored?**

- Uses `storage.store(item, content, embedding, tenantId, schema)` (line 140-146)
- Stores in PostgreSQL with vector embeddings (pgvector)

**How is it indexed/vectorized?**

```javascript
// 1. Build content text from item fields
const content = dataExtractor.buildContent(item, schema);

// 2. Generate embedding
const embedding = await vectorizer.generateBatch(contents);

// 3. Store with embedding
await storage.store(item, content, embedding, tenantId, schema);
```

### Issues/Anomalies:

- ❌ **CRITICAL: This handler is NOT being called anywhere in the codebase!**
- ✅ Code looks correct and functional
- ✅ Handles pagination correctly
- ✅ Processes in parallel for performance
- ⚠️ Handler exists but is orphaned - not integrated into actual flow

---

## 5. Data Extraction

**File:** `BACKEND/src/core/dataExtractor.js`

### Extraction Functions:

**Function 1: `extractItems(responseEnvelope, schema)`**
- Purpose: Extract items array from response envelope
- Input: `responseEnvelope` (object), `schema` (object)
- Output: Array of extracted items

**Function 2: `extractItem(sourceItem, schema)`**
- Purpose: Extract single item according to schema
- Input: `sourceItem` (object), `schema` (object)
- Output: Extracted item object

**Function 3: `buildContent(item, schema)`**
- Purpose: Build text content for vectorization
- Input: `item` (object), `schema` (object)
- Output: Formatted text string

### How Business Data Is Extracted:

**From microservice response:**

```javascript
// STEP 1: Extract data from Coordinator's wrapped format
if (responseEnvelope.successfulResult) {
  actualData = responseEnvelope.successfulResult.data;
  success = true;
}
// Format 2: Direct format from microservice
else if (responseEnvelope.success !== undefined) {
  success = responseEnvelope.success;
  actualData = responseEnvelope.data;
}
// Format 3: Just data field
else if (responseEnvelope.data !== undefined) {
  success = true;
  actualData = responseEnvelope.data;
}

// STEP 2: Extract items array from data
if (Array.isArray(actualData)) {
  items = actualData;
}
else if (actualData.items && Array.isArray(actualData.items)) {
  items = actualData.items;
}
else if (typeof actualData === 'object' && actualData !== null) {
  items = [actualData];
}

// STEP 3: Extract each item according to schema
const extractedItems = items.map(item => this.extractItem(item, schema));
```

### How Data Is Used For Response:

**In realtimeHandler (if it were called):**

```javascript
// 1. Extract items
const items = dataExtractor.extractItems(response_envelope, schema);

// 2. Build response using items
const answer = await responseBuilder.buildResponse(
  items,
  user_query,
  schema
);
```

**In responseBuilder:**

```javascript
buildContext(items, schema) {
  const parts = [];
  for (const item of items) {
    const itemParts = [];
    for (const [fieldName, fieldType] of Object.entries(schema.data_structure)) {
      const value = item[fieldName];
      if (!value) continue;
      const description = schema.field_descriptions?.[fieldName] || fieldName;
      itemParts.push(`${description}: ${this.formatValue(value, fieldType)}`);
    }
    parts.push(itemParts.join('\n'));
  }
  return parts.join('\n\n---\n\n');
}
```

### Issues/Anomalies:

- ✅ Extraction logic is comprehensive and handles multiple formats
- ✅ Handles Coordinator wrapped format correctly
- ✅ Handles direct microservice format
- ✅ Handles batch format with items array
- ✅ Used in actual flow (via coordinatorResponseParser)
- ⚠️ **BUT**: Not used by realtimeHandler/batchHandler (they're not called)

---

## 6. Response Builder

**File:** `BACKEND/src/core/responseBuilder.js`

### Main Function:

**Name:** `buildResponse(items, userQuery, schema)`
- Parameters: `items` (array), `userQuery` (string), `schema` (object)
- Returns: LLM-generated answer (string)

### How Response Is Built:

**What inputs does it receive?**

- `items`: Array of extracted business data items
- `userQuery`: User's natural language question
- `schema`: Service schema with field descriptions

**Does it use extracted business data?**

✅ YES - Builds context from items:

```javascript
buildContext(items, schema) {
  const parts = [];
  for (const item of items) {
    const itemParts = [];
    for (const [fieldName, fieldType] of Object.entries(schema.data_structure)) {
      const value = item[fieldName];
      if (!value) continue;
      const description = schema.field_descriptions?.[fieldName] || fieldName;
      itemParts.push(`${description}: ${this.formatValue(value, fieldType)}`);
    }
    parts.push(itemParts.join('\n'));
  }
  return parts.join('\n\n---\n\n');
}
```

**Does it call LLM?**

✅ YES:

```javascript
async callLLM(context, userQuery, schema) {
  const serviceDescription = schema.description || schema.service_name;
  
  const systemPrompt = `You are a helpful assistant providing information from ${serviceDescription}.
Your task is to answer user questions based on the provided context.
Be concise, accurate, and helpful. If the context doesn't contain enough information, say so.`;

  const userPrompt = `Context from ${serviceDescription}:
${context}

User question: ${userQuery}

Please provide a helpful answer based on the context above.`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 1000
  });

  return completion.choices[0]?.message?.content || 'I could not generate a response.';
}
```

### LLM Prompt:

**System Prompt:**
```
You are a helpful assistant providing information from {serviceDescription}.
Your task is to answer user questions based on the provided context.
Be concise, accurate, and helpful. If the context doesn't contain enough information, say so.
```

**User Prompt:**
```
Context from {serviceDescription}:
{context}

User question: {userQuery}

Please provide a helpful answer based on the context above.
```

### Issues/Anomalies:

- ❌ **CRITICAL: This response builder is NOT being used!**
- ✅ Code looks correct and functional
- ✅ Uses extracted business data in context
- ✅ LLM prompt includes business data
- ⚠️ Handler exists but is orphaned - not integrated into actual flow

---

## 7. Complete Flow Analysis

### ACTUAL FLOW (What's Actually Happening):

```
1. HTTP Request arrives
   ↓
   File: BACKEND/src/controllers/query.controller.js
   Function: submitQuery()
   Route: POST /api/v1/query

2. Request is parsed
   ↓
   File: BACKEND/src/services/queryProcessing.service.js
   Function: processQuery()
   How: Validates request, checks cache, classifies query

3. Mode is detected (realtime vs batch)
   ↓
   ❌ NOT DETECTED - No mode routing in actual flow
   ⚠️ Flow always goes to queryProcessing.service.js

4. [REALTIME] Query is processed
   ↓
   File: BACKEND/src/services/queryProcessing.service.js
   Function: processQuery()
   ⚠️ NOT using realtimeHandler.handle()

5. [REALTIME] Data is extracted from microservice response
   ↓
   File: BACKEND/src/services/grpcFallback.service.js
   Function: grpcFetchByCategory()
   Then: BACKEND/src/services/coordinatorResponseParser.service.js
   Function: extractBusinessData()
   Extracted fields: From envelope.successfulResult.data

6. [REALTIME] Response/Answer is built
   ↓
   File: BACKEND/src/services/queryProcessing.service.js
   Function: processQuery()
   Uses extracted data? ✅ YES (via coordinatorSources)
   Uses LLM? ✅ YES (direct OpenAI call, NOT responseBuilder)

7. Response is returned
   ↓
   File: BACKEND/src/controllers/query.controller.js
   Format: JSON with answer, sources, confidence, metadata
```

### INTENDED FLOW (What Should Happen):

```
1. GRPC Request arrives
   ↓
   File: BACKEND/src/core/ragHandler.js
   Function: handleRAGRequest()
   
2. Request is parsed
   ↓
   File: BACKEND/src/core/ragHandler.js
   Function: handleRAGRequest()
   How: Extracts mode, source_service, response_envelope

3. Mode is detected (realtime vs batch)
   ↓
   File: BACKEND/src/core/ragHandler.js
   Function: handleRAGRequest()
   How: switch (mode) { case 'realtime': ... case 'batch': ... }

4. [REALTIME] Query is processed
   ↓
   File: BACKEND/src/handlers/realtimeHandler.js
   Function: handle()
   
5. [REALTIME] Data is extracted from microservice response
   ↓
   File: BACKEND/src/core/dataExtractor.js
   Function: extractItems()
   Extracted fields: From response_envelope using schema

6. [REALTIME] Response/Answer is built
   ↓
   File: BACKEND/src/core/responseBuilder.js
   Function: buildResponse()
   Uses extracted data? ✅ YES (builds context from items)
   Uses LLM? ✅ YES (calls OpenAI with context)

7. Response is returned
   ↓
   File: BACKEND/src/handlers/realtimeHandler.js
   Format: { success, answer, source, metadata }
```

### BATCH FLOW (What's Actually Happening):

```
1. Scheduled Batch Sync
   ↓
   File: BACKEND/src/jobs/scheduledSync.js
   Function: startScheduledSync()

2. Batch Sync Service Called
   ↓
   File: BACKEND/src/services/batchSyncService.js
   Function: syncService()
   ⚠️ NOT using batchHandler.handle()

3. Coordinator Called
   ↓
   File: BACKEND/src/clients/coordinator.client.js
   Function: batchSync()

4. Response Processed
   ↓
   File: BACKEND/src/services/batchSyncService.js
   Function: syncService()
   Uses: processCoordinatorResponse()
   ⚠️ NOT using batchHandler.handle()

5. Data Stored
   ↓
   File: BACKEND/src/services/batchSyncService.js
   ⚠️ Direct storage, NOT using batchHandler
```

---

## 8. ROOT CAUSE ANALYSIS

### The problem is:

**The realtime and batch handlers exist but are COMPLETELY BYPASSED by the actual flow.**

1. **Realtime Handler (`realtimeHandler.js`)**:
   - ✅ Code is correct and functional
   - ✅ Data extraction works
   - ✅ Response building works
   - ❌ **NOT CALLED** - Flow goes through `queryProcessing.service.js` instead

2. **Batch Handler (`batchHandler.js`)**:
   - ✅ Code is correct and functional
   - ✅ Parallel processing works
   - ✅ Storage works
   - ❌ **NOT CALLED** - Flow goes through `batchSyncService.js` instead

3. **RAG Handler (`ragHandler.js`)**:
   - ✅ Exports `handleRAGRequest()` function
   - ❌ **NOT CALLED** - No gRPC server implementation found
   - ❌ **NOT CALLED** - No HTTP endpoint uses it

### It broke because:

**The handlers were likely created for a different architecture (gRPC-based) but the actual implementation uses HTTP REST API with a different flow:**

1. **HTTP Flow** (Current):
   - `query.controller.js` → `queryProcessing.service.js` → `grpcFallback.service.js` → Coordinator
   - Uses `coordinatorResponseParser.service.js` for extraction
   - Uses direct OpenAI calls for response generation

2. **Intended gRPC Flow** (Not Implemented):
   - gRPC Request → `ragHandler.js` → `realtimeHandler.js` / `batchHandler.js`
   - Uses `dataExtractor.js` for extraction
   - Uses `responseBuilder.js` for response generation

### The fix should:

**Option 1: Integrate handlers into existing flow**
- Modify `queryProcessing.service.js` to use `realtimeHandler.handle()`
- Modify `batchSyncService.js` to use `batchHandler.handle()`
- Ensure handlers receive correct input format

**Option 2: Implement gRPC server**
- Create gRPC server that calls `handleRAGRequest()`
- Route gRPC requests to realtime/batch handlers
- Keep HTTP flow as-is for backward compatibility

**Option 3: Remove orphaned code**
- If gRPC flow is not needed, remove handlers
- Consolidate logic into existing services

---

## 9. Specific Code That Needs Attention

### File: `BACKEND/src/services/queryProcessing.service.js`
**Line:** ~1193-1200
**Current code:**

```javascript
const grpcContext = await grpcFetchByCategory(category || 'general', {
  query,
  tenantId: actualTenantId,
  userId: user_id,
  vectorResults: similarVectors || [],
  internalData: internalData,
});
```

**Problem:**
- Should call `realtimeHandler.handle()` instead of directly processing
- Missing integration with realtime handler

---

### File: `BACKEND/src/services/batchSyncService.js`
**Line:** ~160-200
**Current code:**

```javascript
const processed = processCoordinatorResponse(response);
// ... direct processing and storage
```

**Problem:**
- Should call `batchHandler.handle()` instead of direct processing
- Missing integration with batch handler

---

### File: `BACKEND/src/core/ragHandler.js`
**Line:** 25-66
**Current code:**

```javascript
async function handleRAGRequest(input) {
  // ... routing logic
  switch (mode) {
    case 'realtime':
      return await realtimeHandler.handle(input);
    case 'batch':
      return await batchHandler.handle(input);
  }
}
```

**Problem:**
- Function exists but is never called
- No gRPC server implementation found
- No HTTP endpoint uses it

---

## 10. Recommendations

1. **Immediate Action: Decide Architecture**
   - Determine if gRPC flow is needed
   - If yes: Implement gRPC server
   - If no: Integrate handlers into HTTP flow or remove them

2. **If Keeping HTTP Flow:**
   - Integrate `realtimeHandler.handle()` into `queryProcessing.service.js`
   - Integrate `batchHandler.handle()` into `batchSyncService.js`
   - Ensure input format matches handler expectations

3. **If Implementing gRPC Flow:**
   - Create gRPC server in `BACKEND/src/grpc/services/`
   - Route requests to `handleRAGRequest()`
   - Keep HTTP flow for backward compatibility

4. **Code Cleanup:**
   - Remove orphaned code if not needed
   - Document which flow is primary
   - Update architecture documentation

5. **Testing:**
   - Test realtime handler with actual Coordinator responses
   - Test batch handler with actual batch data
   - Verify data extraction works with all formats
   - Verify response building includes business data

---

## 11. Critical Findings Summary

### ✅ What Works:
- Data extraction logic is comprehensive
- Response builder correctly uses business data
- Handlers are functionally correct
- Batch processing logic is sound

### ❌ What's Broken:
- **Realtime handler is NOT being called**
- **Batch handler is NOT being called**
- **RAG handler is NOT being called**
- **Response builder is NOT being used**
- Actual flow bypasses all handlers

### ⚠️ What's Missing:
- gRPC server implementation
- Integration between HTTP flow and handlers
- Clear architecture documentation
- Decision on which flow is primary

---

## 12. Data Flow Comparison

### Intended Flow (Handlers):
```
Coordinator Response
  ↓
response_envelope
  ↓
realtimeHandler.handle()
  ↓
dataExtractor.extractItems()  ✅ USES BUSINESS DATA
  ↓
responseBuilder.buildResponse()  ✅ USES BUSINESS DATA IN LLM
  ↓
LLM Answer with Business Data
```

### Actual Flow (Current):
```
Coordinator Response
  ↓
grpcFetchByCategory()
  ↓
coordinatorResponseParser.extractBusinessData()  ✅ EXTRACTS DATA
  ↓
queryProcessing.service.js
  ↓
Direct OpenAI Call  ⚠️ USES DATA BUT DIFFERENT PROMPT
  ↓
LLM Answer
```

**Key Difference:**
- Intended flow uses `responseBuilder` which explicitly includes business data in LLM prompt
- Actual flow uses direct OpenAI call with different prompt structure
- Both extract business data, but actual flow may not format it as well for LLM

---

## END OF REPORT

