# RAG Support Mode - Current Implementation Report

## Executive Summary

- **Support mode implemented:** ✅ **YES - PARTIALLY IMPLEMENTED**
- **Missing components:** 
  - Assessment support returns mock response (not forwarding to Coordinator)
  - No LLM-based answer generation in support mode (only Coordinator forwarding)
  - Limited error handling for Coordinator failures
- **Working components:**
  - Support mode routes exist (`/api/assessment/support`, `/api/devlab/support`)
  - Mode detection in query controller
  - Coordinator integration (gRPC client)
  - DevLab support forwards to Coordinator
  - Authentication/authorization middleware
  - CORS handling

---

## 1. Entry Points

### Chat/Query Endpoints

**Found:**

- **POST /api/v1/query** - `BACKEND/src/routes/query.routes.js`
  - Handles both CHAT mode and can route to SUPPORT mode based on headers/metadata
  - Controller: `BACKEND/src/controllers/query.controller.js`
  - Service: `BACKEND/src/services/queryProcessing.service.js`

- **POST /api/assessment/support** - `BACKEND/src/routes/microserviceSupport.routes.js`
  - Dedicated SUPPORT mode endpoint for Assessment
  - Controller: `BACKEND/src/controllers/microserviceSupport.controller.js` → `assessmentSupport()`

- **POST /api/devlab/support** - `BACKEND/src/routes/microserviceSupport.routes.js`
  - Dedicated SUPPORT mode endpoint for DevLab
  - Controller: `BACKEND/src/controllers/microserviceSupport.controller.js` → `devlabSupport()`

**Handler flow:**

```
POST /api/v1/query
  ↓ routes/query.routes.js
  ↓ controllers/query.controller.js (submitQuery)
    ↓ [Mode detection: checks headers/metadata]
    ↓ IF support mode detected → microserviceSupport.controller.js
    ↓ ELSE → services/queryProcessing.service.js (processQuery)
      ↓ [Vector search, LLM generation, Coordinator calls]

POST /api/assessment/support
  ↓ routes/microserviceSupport.routes.js
  ↓ middleware: supportAuthMiddleware (auth check)
  ↓ controllers/microserviceSupport.controller.js (assessmentSupport)
    ↓ [Currently returns mock response - TODO: Forward to Coordinator]

POST /api/devlab/support
  ↓ routes/microserviceSupport.routes.js
  ↓ middleware: supportAuthMiddleware (auth check)
  ↓ controllers/microserviceSupport.controller.js (devlabSupport)
    ↓ communication/communicationManager.service.js (callCoordinatorRoute)
      ↓ clients/coordinator.client.js (routeRequest via gRPC)
        ↓ Coordinator routes to DevLab microservice
```

---

## 2. Mode Detection

**Current implementation:**

### In Query Controller (`query.controller.js`):

```javascript
// Lines 89-142: Mode detection logic
const headerSource = (req.headers['x-source'] || req.headers['x-microservice-source'] || '').toString().toLowerCase();
const metaSource = (req.body?.metadata?.source || '').toString().toLowerCase();
const supportModeFlag = (req.body?.support_mode || '').toString().toLowerCase();

// Hardened gating: support mode must be explicitly enabled and authorized
const supportEnabled = (process.env.SUPPORT_MODE_ENABLED || '').toLowerCase() === 'true';
const sharedSecret = process.env.SUPPORT_SHARED_SECRET || '';
const providedSecret = (req.headers['x-embed-secret'] || '').toString();
const originStr = origin ? origin.toString() : '';
const allowedOrigins = (process.env.SUPPORT_ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const originAllowed = allowedOrigins.length === 0 || (originStr && allowedOrigins.includes(originStr));
const secretOk = !sharedSecret || providedSecret === sharedSecret;

const supportAuthorized = supportEnabled && originAllowed && secretOk;

if (supportAuthorized) {
  if (headerSource === 'assessment' || metaSource === 'assessment' || supportModeFlag === 'assessment') {
    return assessmentSupport(req, res, next);
  }
  if (headerSource === 'devlab' || metaSource === 'devlab' || supportModeFlag === 'devlab') {
    return devlabSupport(req, res, next);
  }
}
```

### In Support Routes (`microserviceSupport.routes.js`):

```javascript
// Lines 36-135: Authentication middleware
function supportAuthMiddleware(req, res, next) {
  const supportEnabledEnv = (process.env.SUPPORT_MODE_ENABLED || '').toLowerCase();
  const supportEnabled = supportEnabledEnv !== 'false'; // Default to true if not explicitly disabled
  
  // Origin validation
  // Secret validation (if SUPPORT_SHARED_SECRET is set)
}
```

### In Support Controllers (`microserviceSupport.controller.js`):

```javascript
// Lines 58-82: Assessment support mode activation
const headerSource = (req.headers['x-source'] || req.headers['x-microservice-source'] || '').toString().toLowerCase();
const metaSource = (metadata.source || '').toString().toLowerCase();
const flagSource = (support_mode || '').toString().toLowerCase();

const isAssessmentSource = 
  ['assessment'].includes(headerSource) || 
  ['assessment'].includes(metaSource) || 
  ['assessment'].includes(flagSource) ||
  support_mode === 'Assessment';
```

**Findings:**

- ✅ Support mode detection exists
- ✅ Checks `X-Source` header
- ✅ Checks `X-Microservice-Source` header
- ✅ Checks `metadata.source` in request body
- ✅ Checks `support_mode` field in request body
- ✅ Environment variable gating (`SUPPORT_MODE_ENABLED`)
- ✅ Origin whitelist (`SUPPORT_ALLOWED_ORIGINS`)
- ✅ Optional shared secret (`SUPPORT_SHARED_SECRET`)
- ✅ Handles embedded requests (via origin/secret validation)

**Missing:**

- ❌ No automatic mode detection based on query content
- ❌ No fallback if Coordinator fails

---

## 3. Context Fetching

**Current implementation:**

### Coordinator Client (`coordinator.client.js`):

```javascript
// Lines 386-624: routeRequest function
export async function routeRequest({ tenant_id, user_id, query_text, metadata = {} }) {
  // Creates Universal Envelope
  // Generates gRPC metadata with signature
  // Calls Coordinator via gRPC
  // Returns RouteResponse
}
```

### Communication Manager (`communicationManager.service.js`):

```javascript
// Lines 195-237: callCoordinatorRoute function
export async function callCoordinatorRoute({ tenant_id, user_id, query_text, metadata = {} }) {
  const response = await routeRequest({
    tenant_id,
    user_id,
    query_text,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
      source: 'rag',
    },
  });
  return response;
}

// Lines 247-305: processCoordinatorResponse function
export function processCoordinatorResponse(coordinatorResponse) {
  // Parses Coordinator response
  // Extracts business data
  // Returns normalized response
}
```

### DevLab Support Controller (`microserviceSupport.controller.js`):

```javascript
// Lines 220-230: Forwarding to Coordinator
const coordinatorResponse = await callCoordinatorRoute({
  tenant_id: tenantId,
  user_id: userId,
  query_text: query,
  metadata: {
    ...metadata,
    support_mode: 'DevLab',
    source: 'devlab_support',
    session_id,
  },
});

// Lines 242-304: Processing response
const processed = processCoordinatorResponse(coordinatorResponse);
// Extracts answer from business_data or envelope
```

**Findings:**

- ✅ Context fetching exists
- ✅ Calls Coordinator via gRPC
- ✅ Coordinator client fully implemented
- ✅ Response parsing implemented
- ✅ DevLab support forwards to Coordinator
- ❌ Assessment support does NOT forward to Coordinator (returns mock response)

**Coordinator integration:**

- **Coordinator client exists:** ✅ YES
- **Client location:** `BACKEND/src/clients/coordinator.client.js`
- **Methods available:**
  - `routeRequest({ tenant_id, user_id, query_text, metadata })` - Route query to microservices
  - `batchSync({ target_service, sync_type, page, limit, since })` - Batch data sync
  - `isCoordinatorAvailable()` - Health check
  - `getMetrics()` - Monitoring metrics
  - `listServices()` - Get available microservices
- **Used for context:** ✅ YES (DevLab), ❌ NO (Assessment - mock only)

---

## 4. LLM Integration

**Current implementation:**

### OpenAI Configuration (`config/openai.config.js`):

```javascript
import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: apiUrl,
});
```

### Query Processing Service (`queryProcessing.service.js`):

```javascript
// Lines 323-332: General OpenAI (non-EDUCORE queries)
const completion = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [
    { role: 'system', content: 'You are a friendly assistant...' },
    ...conversationHistory,
    { role: 'user', content: query },
  ],
  temperature: 0.7,
  max_tokens: 500,
});

// Lines 1498-1513: RAG with context (EDUCORE queries)
const completion = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userPrompt },
  ],
  temperature: 0.7,
  max_tokens: 500,
});
```

**Findings:**

- **LLM provider:** OpenAI
- **Model:** `gpt-3.5-turbo`
- **Used in:** 
  - Query processing service (CHAT mode)
  - General knowledge queries
  - RAG answer generation
- **Prompt building:** 
  - System prompt with RAG rules
  - User prompt with context from knowledge base
  - Conversation history support
- **NOT used in:** Support mode (only Coordinator forwarding, no LLM generation)

**Environment variables:**

- `OPENAI_API_KEY`: Required (checked in config)
- `OPENAI_API_URL`: Optional (defaults to `https://api.openai.com/v1`)

**Missing in Support Mode:**

- ❌ No LLM-based answer generation in support mode
- ❌ Support mode only forwards to Coordinator and returns raw response
- ❌ No prompt building for support mode queries

---

## 5. Request/Response Format

**Current request format:**

### CHAT Mode (`/api/v1/query`):

```json
{
  "query": "What is the role of Eden?",
  "tenant_id": "dev.educore.local",
  "conversation_id": "conv-1234567890-abc123",
  "context": {
    "user_id": "user-123",
    "session_id": "session-456",
    "role": "admin"
  },
  "options": {
    "max_results": 5,
    "min_confidence": 0.7,
    "include_metadata": true
  }
}
```

### SUPPORT Mode (`/api/assessment/support` or `/api/devlab/support`):

```json
{
  "query": "What are my recent test scores?",
  "timestamp": "2024-01-15T10:00:00Z",
  "session_id": "session-456",
  "support_mode": "Assessment",
  "metadata": {
    "user_id": "user-123",
    "tenant_id": "dev.educore.local",
    "source": "assessment"
  }
}
```

**Headers for SUPPORT Mode:**

- `X-Source: assessment` or `X-Source: devlab`
- `X-Microservice-Source: assessment` or `X-Microservice-Source: devlab`
- `X-User-Id: user-123`
- `X-Tenant-Id: dev.educore.local`
- `X-Embed-Secret: <secret>` (if `SUPPORT_SHARED_SECRET` is set)

**Current response format:**

### CHAT Mode Response:

```json
{
  "answer": "Eden's role is...",
  "abstained": false,
  "confidence": 0.85,
  "sources": [
    {
      "sourceId": "user-profile-123",
      "sourceType": "user_profile",
      "title": "Eden's Profile",
      "contentSnippet": "...",
      "relevanceScore": 0.9
    }
  ],
  "recommendations": [],
  "conversation_id": "conv-1234567890-abc123",
  "metadata": {
    "processing_time_ms": 1234,
    "sources_retrieved": 1,
    "cached": false,
    "model_version": "gpt-3.5-turbo",
    "personalized": true,
    "conversation_enabled": true
  }
}
```

### SUPPORT Mode Response (DevLab):

```json
{
  "response": "DevLab processed your request...",
  "timestamp": "2024-01-15T10:00:00Z",
  "session_id": "session-456",
  "metadata": {
    "target_services": ["devlab-service"],
    "successful_service": "devlab-service",
    "quality_score": 0.9,
    "rank_used": 1
  }
}
```

### SUPPORT Mode Response (Assessment - Mock):

```json
{
  "response": "Assessment Support: I received your question \"...\". This is a proxy response. In production, this will be forwarded to the Assessment microservice.",
  "timestamp": "2024-01-15T10:00:00Z",
  "session_id": "session-456"
}
```

**Findings:**

- ✅ Accepts `source_service` via headers/metadata
- ✅ Accepts `mode` via `support_mode` field
- ✅ Accepts `metadata` object
- ✅ Returns mode in response metadata (DevLab only)
- ❌ Assessment support returns mock response (not real data)

---

## 6. Complete Flow Diagram

**Current flow:**

### CHAT Mode Flow:

```
User question
  ↓
POST /api/v1/query
  ↓
query.controller.js (submitQuery)
  ↓
[Mode detection: no support mode signal]
  ↓
queryProcessing.service.js (processQuery)
  ↓
[Query classification: EDUCORE vs general]
  ↓
IF general:
  → OpenAI GPT-3.5-turbo (direct answer)
  → Return response

IF EDUCORE:
  → Generate embedding (OpenAI text-embedding-ada-002)
  → Vector search in Supabase (pgvector)
  → [RBAC filtering]
  → [Knowledge Graph enhancement]
  → [Check if Coordinator needed]
  → IF Coordinator needed:
      → coordinator.client.js (routeRequest via gRPC)
      → Coordinator routes to microservices
      → Merge Coordinator results with vector results
  → Build context from sources
  → OpenAI GPT-3.5-turbo (RAG answer generation)
  → Return response with sources
```

### SUPPORT Mode Flow (DevLab):

```
User question (from DevLab frontend)
  ↓
POST /api/devlab/support
  ↓
microserviceSupport.routes.js
  ↓
supportAuthMiddleware (auth check)
  ↓
microserviceSupport.controller.js (devlabSupport)
  ↓
[Validate request]
  ↓
[Check source activation: X-Source, metadata.source, support_mode]
  ↓
communicationManager.service.js (callCoordinatorRoute)
  ↓
coordinator.client.js (routeRequest)
  ↓
[Create Universal Envelope]
  ↓
[Generate gRPC signature]
  ↓
[Call Coordinator via gRPC]
  ↓
Coordinator routes to DevLab microservice
  ↓
DevLab microservice processes query
  ↓
Coordinator returns response
  ↓
coordinatorResponseParser.service.js (processCoordinatorResponse)
  ↓
[Extract business_data or envelope payload]
  ↓
[Return answer to user]
```

### SUPPORT Mode Flow (Assessment):

```
User question (from Assessment frontend)
  ↓
POST /api/assessment/support
  ↓
microserviceSupport.routes.js
  ↓
supportAuthMiddleware (auth check)
  ↓
microserviceSupport.controller.js (assessmentSupport)
  ↓
[Validate request]
  ↓
[Check source activation]
  ↓
[Return mock response] ❌ NOT IMPLEMENTED
```

---

## 7. What's Working

1. ✅ **Support mode routes exist** (`/api/assessment/support`, `/api/devlab/support`)
2. ✅ **Mode detection in query controller** (headers, metadata, flags)
3. ✅ **Authentication/authorization middleware** (origin whitelist, shared secret)
4. ✅ **CORS handling** (Vercel origins, localhost, whitelist)
5. ✅ **Coordinator client** (gRPC client fully implemented)
6. ✅ **DevLab support forwarding** (forwards to Coordinator, processes response)
7. ✅ **Response parsing** (extracts business data from Coordinator response)
8. ✅ **Error handling** (try-catch blocks, logging)
9. ✅ **Request validation** (Joi schema validation)
10. ✅ **Environment variable configuration** (SUPPORT_MODE_ENABLED, SUPPORT_ALLOWED_ORIGINS, SUPPORT_SHARED_SECRET)

---

## 8. What's Missing

1. ❌ **Assessment support forwarding** - Currently returns mock response, does NOT forward to Coordinator
2. ❌ **LLM-based answer generation in support mode** - Support mode only forwards to Coordinator, no LLM enhancement
3. ❌ **Fallback handling** - If Coordinator fails, no fallback to vector search or LLM
4. ❌ **Context building from Coordinator response** - No RAG-style context building from Coordinator data
5. ❌ **Support mode prompt building** - No specialized prompts for support mode queries
6. ❌ **Conversation history in support mode** - No multi-turn conversation support
7. ❌ **Source attribution** - Limited source information in support mode responses
8. ❌ **Error messages** - Generic error messages, not user-friendly

---

## 9. Code Examples

### Example 1: Current DevLab Support Handler

```javascript
// File: BACKEND/src/controllers/microserviceSupport.controller.js
export async function devlabSupport(req, res, next) {
  try {
    // Validate request
    const validation = validate(req.body, supportRequestSchema);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation error',
        message: validation.error,
      });
    }

    const { query, session_id, metadata = {}, support_mode } = validation.value;

    // Check source activation
    const headerSource = (req.headers['x-source'] || req.headers['x-microservice-source'] || '').toString().toLowerCase();
    const metaSource = (metadata.source || '').toString().toLowerCase();
    const flagSource = (support_mode || '').toString().toLowerCase();
    
    const isDevlabSource = 
      ['devlab'].includes(headerSource) || 
      ['devlab'].includes(metaSource) || 
      ['devlab'].includes(flagSource) ||
      support_mode === 'DevLab';
    
    if (!isDevlabSource) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Support mode not activated...' 
      });
    }

    const userId = metadata.user_id || req.headers['x-user-id'];
    const tenantId = metadata.tenant_id || req.headers['x-tenant-id'];

    // Forward to Coordinator
    const coordinatorResponse = await callCoordinatorRoute({
      tenant_id: tenantId,
      user_id: userId,
      query_text: query,
      metadata: {
        ...metadata,
        support_mode: 'DevLab',
        source: 'devlab_support',
        session_id,
      },
    });

    if (!coordinatorResponse) {
      return res.status(502).json({
        error: 'Bad Gateway',
        message: 'No response from Coordinator/DevLab service',
      });
    }

    const processed = processCoordinatorResponse(coordinatorResponse);
    if (!processed) {
      return res.status(502).json({
        error: 'Bad Gateway',
        message: 'Failed to process response from DevLab service',
      });
    }

    // Extract answer
    let answer = null;
    const businessData = processed.business_data || processed.business_data?.data;
    if (businessData) {
      if (typeof businessData === 'string') {
        answer = businessData;
      } else if (typeof businessData === 'object') {
        answer = businessData.answer || businessData.message || businessData.text;
      }
    }

    if (!answer) {
      answer = 'DevLab processed your request but did not return a direct answer...';
    }

    const responsePayload = {
      response: answer,
      timestamp: new Date().toISOString(),
      session_id,
      metadata: {
        target_services: processed.target_services || [],
        successful_service: processed.successful_service,
        quality_score: processed.quality_score,
        rank_used: processed.rank_used,
      },
    };

    res.json(responsePayload);
  } catch (error) {
    logger.error('DevLab support error', {
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
}
```

### Example 2: Current Assessment Support Handler (Mock)

```javascript
// File: BACKEND/src/controllers/microserviceSupport.controller.js
export async function assessmentSupport(req, res, next) {
  try {
    // Validate request
    const validation = validate(req.body, supportRequestSchema);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation error',
        message: validation.error,
      });
    }

    const { query, session_id, metadata = {}, support_mode } = validation.value;

    // Check source activation (same logic as DevLab)

    // ❌ TODO: Forward to actual Assessment microservice
    // For now, return a mock response
    const response = {
      response: `Assessment Support: I received your question "${query}". This is a proxy response. In production, this will be forwarded to the Assessment microservice.`,
      timestamp: new Date().toISOString(),
      session_id,
    };

    res.json(response);
  } catch (error) {
    logger.error('Assessment support error', {
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
}
```

### Example 3: Coordinator Client Call

```javascript
// File: BACKEND/src/clients/coordinator.client.js
export async function routeRequest({ tenant_id, user_id, query_text, metadata = {} }) {
  // Create Universal Envelope
  const envelope = createEnvelope(tenant_id, user_id, query_text, metadata);
  
  // Build metadata map
  const metadataMap = {
    requester_service: 'rag-service',
    source: metadata.source || 'rag',
    timestamp: new Date().toISOString(),
    envelope_json: JSON.stringify(envelope),
    ...metadata,
  };
  
  // Build request
  const request = {
    tenant_id: tenant_id || '',
    user_id: user_id || '',
    query_text: query_text,
    metadata: metadataMap,
  };
  
  // Generate signature
  const signedMetadata = createSignedMetadata(request);
  
  // Make gRPC call
  const response = await grpcCall(
    client,
    'Route',
    request,
    signedMetadata,
    GRPC_TIMEOUT
  );
  
  return response;
}
```

---

## 10. Recommendations

### Priority 1 - Critical Missing:

- [ ] **Implement Assessment support forwarding** - Replace mock response with Coordinator forwarding (same as DevLab)
- [ ] **Add LLM-based answer generation in support mode** - Use OpenAI to enhance Coordinator responses with context
- [ ] **Add fallback handling** - If Coordinator fails, fall back to vector search or LLM
- [ ] **Improve error messages** - User-friendly error messages for Coordinator failures

### Priority 2 - Important:

- [ ] **Add context building from Coordinator response** - Build RAG-style context from Coordinator data
- [ ] **Add support mode prompt building** - Specialized prompts for support mode queries
- [ ] **Add conversation history in support mode** - Multi-turn conversation support
- [ ] **Add source attribution** - Better source information in support mode responses

### Priority 3 - Nice to have:

- [ ] **Add automatic mode detection** - Detect support mode based on query content
- [ ] **Add caching** - Cache Coordinator responses for similar queries
- [ ] **Add metrics** - Track support mode usage, success rates, response times
- [ ] **Add retry logic** - Retry Coordinator calls on transient failures

---

## 11. Next Steps

1. **Implement Assessment support forwarding**
   - Copy DevLab support logic to Assessment support
   - Replace mock response with Coordinator forwarding
   - Test with Assessment microservice

2. **Add LLM enhancement to support mode**
   - Build context from Coordinator response
   - Generate prompt with Coordinator data
   - Call OpenAI to generate enhanced answer
   - Return enhanced response

3. **Add fallback handling**
   - If Coordinator fails, try vector search
   - If vector search fails, use LLM with general knowledge
   - Return appropriate error messages

4. **Test end-to-end flow**
   - Test DevLab support with real queries
   - Test Assessment support with real queries
   - Test error scenarios (Coordinator down, invalid requests)
   - Test authentication/authorization

5. **Document support mode usage**
   - Update API documentation
   - Add examples for frontend integration
   - Document environment variables

---

## Appendix: File Structure

```
BACKEND/src/
├── routes/
│   ├── query.routes.js - CHAT mode route (/api/v1/query)
│   └── microserviceSupport.routes.js - SUPPORT mode routes (/api/assessment/support, /api/devlab/support)
├── controllers/
│   ├── query.controller.js - CHAT mode controller (with support mode detection)
│   └── microserviceSupport.controller.js - SUPPORT mode controllers (assessmentSupport, devlabSupport)
├── services/
│   ├── queryProcessing.service.js - CHAT mode query processing (RAG, LLM, vector search)
│   └── coordinatorResponseParser.service.js - Parse Coordinator responses
├── communication/
│   ├── communicationManager.service.js - Coordinator decision layer and communication
│   └── routingEngine.service.js - Merge results from multiple sources
├── clients/
│   └── coordinator.client.js - gRPC client for Coordinator microservice
├── config/
│   └── openai.config.js - OpenAI API configuration
└── utils/
    └── validation.util.js - Request validation schemas
```

---

**Report generated:** 2024-01-15  
**Report author:** Cursor AI  
**Codebase version:** Current (as of scan date)

