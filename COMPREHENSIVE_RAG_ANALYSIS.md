# Comprehensive RAG Microservice Architecture Analysis

## Executive Summary

This document provides a detailed, source-level analysis of how the RAG microservice implements:
1. **HNSW Vector Search** using pgvector
2. **Knowledge Graph** storage and querying
3. **Routing Logic** between RAG ↔ Coordinator
4. **Integration** of HNSW + KG in the RAG pipeline

**Key Finding**: The Knowledge Graph schema is defined and ready, but **is NOT actively integrated into the main RAG query pipeline**. Only a helper function exists for user skill progress tracking. The vector search (HNSW) and Coordinator routing are fully implemented.

---

## 1. High-Level Architecture Overview

The RAG microservice follows a multi-stage pipeline:

```
User Query → Query Classification → Embedding Generation → HNSW Vector Search 
→ RBAC Filtering → Coordinator Decision → Result Merging → LLM Answer Generation
```

The system uses:
- **PostgreSQL + pgvector** for vector storage with HNSW indexing
- **Knowledge Graph** tables (nodes/edges) for structured relationships (schema exists but minimal usage)
- **Coordinator microservice** for real-time data routing to other microservices
- **OpenAI** for embeddings and LLM-based answer generation

---

## 2. HNSW Vector Search Implementation

### 2.1 Database Schema

**File**: `DATABASE/prisma/schema.prisma`

The vector embeddings are stored in the `VectorEmbedding` model:

```prisma
model VectorEmbedding {
  id             String                      @id @default(uuid())
  tenantId       String                      @map("tenant_id")
  microserviceId String?                     @map("microservice_id")
  contentId      String                      @map("content_id")
  contentType    String                      @map("content_type")
  embedding      Unsupported("vector(1536)") // pgvector type - 1536 dimensions
  contentText    String                      @map("content_text") @db.Text
  chunkIndex     Int                         @default(0) @map("chunk_index")
  metadata       Json?                       @default("{}")
  createdAt      DateTime                    @default(now()) @map("created_at")
  updatedAt      DateTime                    @updatedAt @map("updated_at")

  @@index([tenantId])
  @@index([contentId])
  @@index([tenantId, contentId])
  @@map("vector_embeddings")
}
```

**Key Points**:
- Vector column is `vector(1536)` - uses OpenAI's `text-embedding-ada-002` model
- Supports multi-tenant isolation via `tenantId`
- Tracks which microservice provided the content via `microserviceId`
- Stores chunked content with `chunkIndex`

### 2.2 HNSW Index Creation

**File**: `DATABASE/prisma/migrations/20250101000002_add_hnsw_index/migration.sql`

The HNSW index is created with specific parameters:

```sql
CREATE INDEX idx_vector_embeddings_embedding_hnsw 
ON vector_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**HNSW Parameters Explained**:
- **`m = 16`**: Number of bi-directional links per node in the graph. Higher = more accurate but slower.
- **`ef_construction = 64`**: Size of the candidate set during index construction. Higher = better quality but slower builds.
- **`vector_cosine_ops`**: Operator class for cosine similarity (using `<=>` operator)

**Note**: The index uses **cosine similarity**, not Euclidean distance. Cosine similarity measures the angle between vectors, making it ideal for semantic similarity.

### 2.3 Vector Search Implementation

**File**: `BACKEND/src/services/unifiedVectorSearch.service.js`

The core vector search function performs cosine similarity search:

```javascript
export async function unifiedVectorSearch(queryEmbedding, tenantId, options = {}) {
  const { limit = 20, threshold = 0.25, contentType, contentId, microserviceId } = options;
  
  // Convert embedding array to PostgreSQL vector format
  const embeddingStr = `[${queryEmbedding.join(',')}]`;
  const vectorLiteral = `'${escapedEmbeddingStr}'::vector`;
  
  // Build SQL query with cosine similarity
  const query = `
    SELECT 
      id, tenant_id, microservice_id, content_id, content_type,
      content_text, chunk_index, metadata, created_at,
      1 - (embedding <=> ${vectorLiteral}) as similarity
    FROM vector_embeddings
    WHERE tenant_id = $1
      AND (1 - (embedding <=> ${vectorLiteral})) >= $2
    ORDER BY embedding <=> ${vectorLiteral}
    LIMIT $3
  `;
  
  const results = await prisma.$queryRawUnsafe(query, ...params);
  return results.map((row) => ({
    similarity: parseFloat(row.similarity),
    contentText: row.content_text,
    // ... other fields
  }));
}
```

**Key Implementation Details**:
1. **Cosine Similarity Operator**: `embedding <=> vectorLiteral` computes cosine distance
   - Distance = 0 means identical vectors
   - Distance = 2 means opposite vectors
   - Similarity = `1 - distance` (converted to similarity score 0-1)
   
2. **Filtering**: Results filtered by `similarity >= threshold` (default 0.25)

3. **Ordering**: Results ordered by cosine distance (ascending = most similar first)

4. **Tenant Isolation**: All queries filtered by `tenant_id` for multi-tenancy

### 2.4 Embedding Generation

**File**: `BACKEND/src/services/queryProcessing.service.js` (lines 356-360)

When a user query arrives, it's converted to an embedding:

```javascript
const embeddingResponse = await openai.embeddings.create({
  model: 'text-embedding-ada-002',
  input: queryForEmbedding, // Query text (may be translated)
});
const queryEmbedding = embeddingResponse.data[0].embedding; // 1536-dimensional array
```

**Process**:
1. Query is optionally translated from Hebrew to English (lines 312-352)
2. OpenAI generates 1536-dimensional embedding vector
3. This vector is passed to `unifiedVectorSearch()` for similarity search

### 2.5 Integration into Query Pipeline

**File**: `BACKEND/src/services/queryProcessing.service.js` (lines 393-397)

The vector search is called after query classification:

```javascript
similarVectors = await unifiedVectorSearch(queryEmbedding, actualTenantId, {
  limit: max_results,
  threshold: min_confidence,
});
```

Results are then:
1. Filtered by RBAC permissions (lines 431-700)
2. Converted to source format (lines 702-711)
3. Used to build context for LLM (lines 714-716)

---

## 3. Knowledge Graph Implementation

### 3.1 Database Schema

**File**: `DATABASE/prisma/schema.prisma`

The Knowledge Graph consists of two models:

#### Knowledge Graph Nodes

```prisma
model KnowledgeGraphNode {
  id         String   @id @default(uuid())
  tenantId   String   @map("tenant_id")
  nodeId     String   @unique @map("node_id")  // e.g., "user:123", "skill:javascript"
  nodeType   String   @map("node_type")        // e.g., "user", "skill", "content"
  properties Json?    @default("{}")           // Flexible properties
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  sourceEdges KnowledgeGraphEdge[] @relation("SourceNode")
  targetEdges KnowledgeGraphEdge[] @relation("TargetNode")

  @@index([tenantId])
  @@index([nodeId])
  @@index([nodeType])
  @@map("knowledge_graph_nodes")
}
```

#### Knowledge Graph Edges

```prisma
model KnowledgeGraphEdge {
  id           String   @id @default(uuid())
  tenantId     String   @map("tenant_id")
  sourceNodeId String   @map("source_node_id")
  targetNodeId String   @map("target_node_id")
  edgeType     String   @map("edge_type")      // e.g., "learning", "supports", "related"
  weight       Decimal? @db.Decimal(3, 2)      // 0.0 to 1.0
  properties   Json?    @default("{}")         // e.g., {"progress": 0.75}
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  sourceNode KnowledgeGraphNode @relation("SourceNode", fields: [sourceNodeId], references: [nodeId])
  targetNode KnowledgeGraphNode @relation("TargetNode", fields: [targetNodeId], references: [nodeId])

  @@index([tenantId])
  @@index([sourceNodeId, targetNodeId])
  @@index([edgeType])
  @@map("knowledge_graph_edges")
}
```

**Key Design Points**:
- Nodes use string IDs like `"user:123"` or `"skill:javascript"` for flexibility
- Edges support typed relationships (`edgeType`) with optional weights
- Properties stored as JSONB for extensibility
- Full tenant isolation

### 3.2 Knowledge Graph Service

**File**: `BACKEND/src/services/knowledgeGraph.service.js`

**Current Implementation Status**: **MINIMAL** - Only one function exists:

```javascript
export async function getUserSkillProgress(tenantId, userId, skillIdOrNodeId) {
  const sourceNodeId = `user:${userId}`;
  const targetNodeId = skillIdOrNodeId.startsWith('skill:')
    ? skillIdOrNodeId
    : `skill:${skillIdOrNodeId}`;

  const edge = await prisma.knowledgeGraphEdge.findFirst({
    where: {
      tenantId,
      sourceNodeId,
      targetNodeId,
      edgeType: 'learning',
    },
  });

  return { progress, weight, edge };
}
```

**What's Missing**:
- ❌ No KG-based query expansion (finding related nodes)
- ❌ No path traversal (e.g., find skills related to a content node)
- ❌ No KG-enhanced vector search (boosting results based on relationships)
- ❌ No edge-based filtering of vector results

### 3.3 Knowledge Graph Routes

**File**: `BACKEND/src/routes/knowledgeGraph.routes.js`

A REST API endpoint exists for skill progress:

```javascript
router.get('/skill-progress/:userId/:skillId', getSkillProgress);
```

This is a standalone endpoint, **not integrated into the main RAG pipeline**.

### 3.4 Current KG Usage in RAG Pipeline

**File**: `BACKEND/src/services/queryProcessing.service.js`

**Finding**: The Knowledge Graph is **NOT used** in the main query processing flow. The code references `kgRelations` as a placeholder (line 968):

```javascript
const internalData = {
  vectorResults: similarVectors || [],
  sources: sources,
  cachedData: [],
  kgRelations: [], // ⚠️ EMPTY - KG not integrated
  metadata: { category, hasUserProfile: !!userProfile },
};
```

---

## 4. Routing Logic: RAG ↔ Coordinator

### 4.1 Architecture Overview

The Coordinator is a separate microservice that routes requests to other microservices (Assessment, DevLab, Content, Analytics). The RAG service calls the Coordinator **only when internal vector search is insufficient**.

```
RAG Service → Coordinator Client → Coordinator Service → [Assessment | DevLab | Content | Analytics]
                ↓
         Response Parser → Merge with Vector Results → Final Answer
```

### 4.2 Decision Logic: When to Call Coordinator

**File**: `BACKEND/src/communication/communicationManager.service.js`

**Function**: `shouldCallCoordinator(query, vectorResults, internalData)`

The decision logic checks multiple conditions:

```javascript
export function shouldCallCoordinator(query, vectorResults = [], internalData = {}) {
  // 1. No vector results AND no other internal data
  if (vectorResults.length === 0) {
    const hasInternalData = 
      internalData.cachedData?.length > 0 ||
      internalData.kgRelations?.length > 0;
    if (!hasInternalData) {
      return true; // Need Coordinator
    }
  }

  // 2. Low similarity scores
  if (vectorResults.length > 0) {
    const avgSimilarity = vectorResults.reduce(...) / vectorResults.length;
    if (avgSimilarity >= 0.7 && vectorResults.length >= 1) {
      return false; // Internal data sufficient
    }
    if (avgSimilarity < 0.7) {
      return true; // Low similarity, need Coordinator
    }
  }

  // 3. Real-time data requirements
  const realTimeKeywords = ['current', 'now', 'live', 'real-time', 'latest', ...];
  if (realTimeKeywords.some(kw => query.toLowerCase().includes(kw))) {
    return true; // Query requires real-time data
  }

  // 4. Microservice-specific keywords
  const microserviceKeywords = {
    'assessment': ['test', 'exam', 'quiz', 'assessment'],
    'devlab': ['code', 'programming', 'debug', 'error'],
    'analytics': ['report', 'analytics', 'metrics'],
    'content': ['course', 'lesson', 'module'],
  };
  // ... checks if query matches microservice patterns

  return false; // Default: internal data sufficient
}
```

**Decision Thresholds**:
- **Vector Similarity Threshold**: `0.7` (70% similarity) - if average similarity is above this, skip Coordinator
- **Minimum Sources**: `1` - if at least 1 source with high similarity, skip Coordinator

### 4.3 Coordinator Client

**File**: `BACKEND/src/clients/coordinator.client.js`

**Function**: `routeRequest({ tenant_id, user_id, query_text, metadata })`

Makes gRPC call to Coordinator service:

```javascript
export async function routeRequest({ tenant_id, user_id, query_text, metadata = {} }) {
  const client = getGrpcClient(); // gRPC client for Coordinator
  
  const request = {
    tenant_id,
    user_id,
    query_text,
    metadata: metadata || {},
  };

  // Make gRPC call to Coordinator.Route()
  const response = await grpcCall(
    client,
    'Route',
    request,
    {},
    GRPC_TIMEOUT // Default: 30 seconds
  );

  return response; // RouteResponse with target_services, normalized_fields, etc.
}
```

**Configuration**:
- gRPC URL: `COORDINATOR_GRPC_URL` (default: `localhost:50051`)
- Proto file: `DATABASE/proto/rag/v1/coordinator.proto`
- Service name: `rag.v1.CoordinatorService`
- Timeout: `GRPC_TIMEOUT` seconds (default: 30)

### 4.4 Coordinator Protocol Definition

**File**: `DATABASE/proto/rag/v1/coordinator.proto`

```protobuf
service CoordinatorService {
  rpc Route(RouteRequest) returns (RouteResponse);
}

message RouteRequest {
  string tenant_id = 1;
  string user_id = 2;
  string query_text = 3;
  map<string, string> metadata = 4;
}

message RouteResponse {
  repeated string target_services = 1;        // e.g., ["assessment", "devlab"]
  map<string, string> normalized_fields = 2;  // Structured data from microservices
  string envelope_json = 3;                    // Universal Envelope payload
  string routing_metadata = 4;                // Routing metadata (JSON)
}
```

### 4.5 Coordinator Integration in Query Pipeline

**File**: `BACKEND/src/services/queryProcessing.service.js` (lines 984-1023)

The Coordinator is called after vector search:

```javascript
// Attempt Coordinator call (only if internal data is insufficient)
try {
  const grpcContext = await grpcFetchByCategory(category || 'general', {
    query,
    tenantId: actualTenantId,
    userId: user_id,
    vectorResults: similarVectors || [],
    internalData: internalData,
  });

  if (grpcContext && grpcContext.length > 0) {
    // Convert Coordinator results into sources format
    coordinatorSources = grpcContext.map((item) => ({
      sourceId: item.contentId,
      sourceType: item.contentType,
      sourceMicroservice: item.metadata?.target_services?.[0],
      title: item.metadata?.title,
      contentSnippet: item.contentText.substring(0, 200),
      relevanceScore: item.metadata?.relevanceScore || 0.75,
      metadata: { ...item.metadata, via: 'coordinator' },
    }));
  }
} catch (coordinatorError) {
  logger.warn('Coordinator call failed, continuing with internal data only');
  // Continue with internal data only
}
```

### 4.6 Result Merging

**File**: `BACKEND/src/communication/routingEngine.service.js`

**Function**: `mergeResults(vectorResults, coordinatorData)`

Merges vector search results with Coordinator data:

```javascript
export function mergeResults(vectorResults = [], coordinatorData = {}) {
  const merged = {
    sources: [],
    context: '',
    metadata: {
      internal_sources: 0,
      coordinator_sources: 0,
    },
  };

  // Add vector search results (internal sources)
  if (vectorResults.length > 0) {
    merged.sources.push(...vectorResults.map(vec => ({
      sourceId: vec.contentId,
      sourceType: vec.contentType,
      sourceMicroservice: vec.microserviceId || 'rag',
      // ... other fields
    })));
    merged.metadata.internal_sources = vectorResults.length;
  }

  // Add Coordinator results (real-time sources)
  if (coordinatorData.sources) {
    merged.sources.push(...coordinatorData.sources);
    merged.metadata.coordinator_sources = coordinatorData.sources.length;
  }

  // Sort by relevance score (highest first)
  merged.sources.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

  // Build context string from merged sources
  merged.context = merged.sources
    .map((source, idx) => {
      const sourceLabel = source.sourceMicroservice === 'rag' ? 'Internal' : 'Real-time';
      return `[${sourceLabel} Source ${idx + 1}]: ${source.contentSnippet}`;
    })
    .join('\n\n');

  return merged;
}
```

**Integration in Query Pipeline** (lines 1026-1049):

```javascript
if (coordinatorSources.length > 0 || sources.length > 0) {
  const merged = mergeResults(sources, {
    sources: coordinatorSources,
    metadata: {
      target_services: coordinatorSources[0]?.metadata?.target_services || [],
    },
  });

  sources = merged.sources || sources;
  retrievedContext = merged.context || retrievedContext;
  
  // Recalculate confidence based on merged results
  if (sources.length > 0) {
    confidence = sources.reduce((sum, s) => sum + (s.relevanceScore || 0), 0) / sources.length;
  }
}
```

### 4.7 Coordinator Service (External)

**Note**: The Coordinator service itself is **not in this repository**. It's a separate microservice that:
1. Receives `RouteRequest` via gRPC
2. Uses AI-powered routing to determine which microservices to call
3. Calls microservices in ranked order (with fallback)
4. Returns normalized data in `RouteResponse`

**Expected Coordinator Behavior**:
- Maps domain keywords to microservices (e.g., "test" → Assessment service)
- Tries services in priority order
- Falls back to next service if first fails
- Returns structured data in Universal Envelope format

---

## 5. Integration: How HNSW and KG Combine

### 5.1 Current State: **KG is NOT Integrated**

**Critical Finding**: The Knowledge Graph is **defined in the schema but NOT actively used** in the RAG query pipeline.

**Evidence**:
1. `queryProcessing.service.js` line 968: `kgRelations: []` - always empty
2. `knowledgeGraph.service.js` only has one function: `getUserSkillProgress()`
3. No KG query expansion or path traversal in vector search
4. No KG-based boosting or filtering of vector results

### 5.2 Current Pipeline Flow

```
1. User Query Received
   ↓
2. Query Classification (EDUCORE vs General)
   ↓
3. Embedding Generation (OpenAI)
   ↓
4. HNSW Vector Search (PostgreSQL)
   ↓
5. RBAC Filtering (User permissions)
   ↓
6. Coordinator Decision (shouldCallCoordinator)
   ↓
7a. If YES: Call Coordinator → Get real-time data
7b. If NO: Skip Coordinator
   ↓
8. Merge Results (vector + coordinator)
   ↓
9. Generate LLM Answer (OpenAI with context)
   ↓
10. Return Response
```

**Missing Step**: No Knowledge Graph enhancement between steps 4-5 or 7-8.

### 5.3 How It SHOULD Work (Ideal Integration)

Here's how HNSW + KG should combine:

```
1. HNSW Vector Search → Get top N similar embeddings
   ↓
2. Extract node IDs from vector results (e.g., contentId → KG node)
   ↓
3. Query KG for related nodes (via edges)
   ↓
4. Expand search: Find vectors linked to related KG nodes
   ↓
5. Boost relevance: Increase similarity scores for KG-related results
   ↓
6. Filter/prioritize: Use edge weights to rank results
   ↓
7. Merge enhanced results
```

**Example Scenario**:
- Query: "What skills does JavaScript support?"
- Vector search finds: Content node `"content:js-tutorial"`
- KG query finds: Edge `content:js-tutorial --supports--> skill:async-programming`
- Enhanced results include: `skill:async-programming` and related content

---

## 6. File-by-File Explanation

### Core Query Processing

#### `BACKEND/src/services/queryProcessing.service.js`
- **Purpose**: Main RAG pipeline orchestrator
- **Key Functions**:
  - `processQuery()`: Entry point for all queries (line 117)
  - `generateNoResultsMessage()`: Error message generation (line 33)
- **Lines of Interest**:
  - 356-360: Embedding generation
  - 393-397: Vector search call
  - 431-700: RBAC filtering
  - 984-1023: Coordinator integration
  - 1246-1270: LLM answer generation

#### `BACKEND/src/services/unifiedVectorSearch.service.js`
- **Purpose**: Single source of truth for vector similarity search
- **Key Functions**:
  - `unifiedVectorSearch()`: Core vector search (line 25)
- **Implementation**: Raw SQL with pgvector cosine similarity operator

### Vector Storage & Indexing

#### `DATABASE/prisma/schema.prisma`
- **Purpose**: Prisma schema definition
- **Models**:
  - `VectorEmbedding`: Vector storage model (line 149)
  - `KnowledgeGraphNode`: KG nodes (line 184)
  - `KnowledgeGraphEdge`: KG edges (line 206)

#### `DATABASE/prisma/migrations/20250101000002_add_hnsw_index/migration.sql`
- **Purpose**: Creates HNSW index for fast vector search
- **Key SQL**: `CREATE INDEX ... USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)`

### Coordinator Integration

#### `BACKEND/src/clients/coordinator.client.js`
- **Purpose**: gRPC client for Coordinator service
- **Key Functions**:
  - `routeRequest()`: Makes gRPC call to Coordinator (line 193)
  - `getGrpcClient()`: Creates/manages gRPC client (line 73)

#### `BACKEND/src/communication/communicationManager.service.js`
- **Purpose**: Decision layer for Coordinator calls
- **Key Functions**:
  - `shouldCallCoordinator()`: Decides when to call Coordinator (line 42)
  - `callCoordinatorRoute()`: Executes Coordinator call (line 158)
  - `processCoordinatorResponse()`: Parses Coordinator response (line 210)

#### `BACKEND/src/services/grpcFallback.service.js`
- **Purpose**: Integrates Coordinator into RAG pipeline
- **Key Functions**:
  - `grpcFetchByCategory()`: Fetches data via Coordinator by category (line 37)

#### `BACKEND/src/communication/routingEngine.service.js`
- **Purpose**: Merges vector results with Coordinator data
- **Key Functions**:
  - `mergeResults()`: Merges internal + Coordinator sources (line 17)

### Knowledge Graph (Minimal Implementation)

#### `BACKEND/src/services/knowledgeGraph.service.js`
- **Purpose**: KG query helpers (currently minimal)
- **Key Functions**:
  - `getUserSkillProgress()`: Gets user's progress on a skill (line 17)

#### `BACKEND/src/controllers/knowledgeGraph.controller.js`
- **Purpose**: REST API for KG queries (standalone, not integrated into RAG)

---

## 7. Sequence Diagram: Query Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │ POST /api/v1/query {"query": "What is JavaScript?"}
     ▼
┌─────────────────────┐
│ Query Controller    │
│ (query.controller)  │
└────┬────────────────┘
     │ processQuery()
     ▼
┌─────────────────────┐
│ Query Processing    │
│ Service             │
│ (queryProcessing)   │
└────┬────────────────┘
     │ 1. Classify query (EDUCORE vs General)
     │ 2. Generate embedding (OpenAI)
     │    embedding = [0.123, -0.456, ...] (1536 dims)
     ▼
┌─────────────────────┐
│ Unified Vector      │
│ Search Service      │
│ (unifiedVectorSearch)│
└────┬────────────────┘
     │ SQL: SELECT ... FROM vector_embeddings
     │      WHERE embedding <=> $queryEmbedding
     │      ORDER BY embedding <=> $queryEmbedding
     │      LIMIT 20
     ▼
┌─────────────────────┐
│ PostgreSQL +        │
│ pgvector (HNSW)     │
└────┬────────────────┘
     │ Returns: [{contentId: "doc1", similarity: 0.85}, ...]
     ▼
┌─────────────────────┐
│ Query Processing    │
│ Service (continued) │
└────┬────────────────┘
     │ 3. Apply RBAC filtering
     │ 4. Check: shouldCallCoordinator()?
     ▼
     ├─ NO → Skip Coordinator
     │
     └─ YES → Call Coordinator
              ▼
         ┌─────────────────────┐
         │ Coordinator Client  │
         │ (coordinator.client)│
         └────┬────────────────┘
              │ gRPC: Route({tenant_id, user_id, query_text})
              ▼
         ┌─────────────────────┐
         │ Coordinator Service │
         │ (External)          │
         └────┬────────────────┘
              │ Routes to: Assessment/DevLab/Content
              │ Returns: RouteResponse
              ▼
         ┌─────────────────────┐
         │ Response Parser     │
         │ (coordinatorResponse│
         │  Parser)            │
         └────┬────────────────┘
              │ Parsed: {sources: [...], normalized_fields: {...}}
              ▼
┌─────────────────────┐
│ Routing Engine      │
│ (routingEngine)     │
└────┬────────────────┘
     │ mergeResults(vectorResults, coordinatorData)
     │ Sorts by relevance, builds context
     ▼
┌─────────────────────┐
│ Query Processing    │
│ Service (continued) │
└────┬────────────────┘
     │ 5. Generate LLM answer (OpenAI)
     │    Context: "[Source 1]: ... [Source 2]: ..."
     │    Prompt: "Answer based on context: ..."
     ▼
┌─────────────────────┐
│ OpenAI GPT-3.5      │
│ (LLM)               │
└────┬────────────────┘
     │ Returns: "JavaScript is a programming language..."
     ▼
┌─────────────────────┐
│ Query Processing    │
│ Service (final)     │
└────┬────────────────┘
     │ Returns: {
     │   answer: "...",
     │   confidence: 0.85,
     │   sources: [...],
     │   metadata: {...}
     │ }
     ▼
┌─────────┐
│  User   │
└─────────┘
```

---

## 8. Missing Implementations & Recommendations

### 8.1 Knowledge Graph Integration (CRITICAL MISSING)

**Status**: Schema exists, but **NOT integrated into RAG pipeline**.

**What's Missing**:

1. **KG Query Expansion**:
   - After vector search, query KG for related nodes
   - Example: Find content → Find related skills → Boost skill-related vectors

2. **KG-Enhanced Vector Search**:
   - Use KG edges to boost similarity scores
   - Example: If vector result is linked to query topic in KG, increase relevance

3. **KG-Based Filtering**:
   - Filter vector results based on KG relationships
   - Example: Only show content that supports skills the user is learning

4. **Path Traversal**:
   - Traverse KG paths to find indirect relationships
   - Example: user → learning → skill → supports → content

**Recommended Implementation**:

```javascript
// In queryProcessing.service.js, after vector search:
const kgEnhancedResults = await enhanceWithKnowledgeGraph(
  similarVectors,
  queryEmbedding,
  tenantId,
  userId
);

async function enhanceWithKnowledgeGraph(vectorResults, queryEmbedding, tenantId, userId) {
  // 1. Extract node IDs from vector results
  const contentIds = vectorResults.map(v => v.contentId);
  
  // 2. Query KG for related nodes
  const relatedNodes = await prisma.knowledgeGraphEdge.findMany({
    where: {
      tenantId,
      sourceNodeId: { in: contentIds.map(id => `content:${id}`) },
      edgeType: { in: ['supports', 'related', 'prerequisite'] },
    },
    include: { targetNode: true },
  });
  
  // 3. Boost scores for KG-related results
  const enhanced = vectorResults.map(vec => {
    const related = relatedNodes.filter(n => n.sourceNodeId === `content:${vec.contentId}`);
    const boost = related.length * 0.1; // Boost by 0.1 per related node
    return {
      ...vec,
      similarity: Math.min(1.0, vec.similarity + boost),
      kgRelated: related.map(r => r.targetNode.nodeId),
    };
  });
  
  // 4. Re-sort by enhanced similarity
  return enhanced.sort((a, b) => b.similarity - a.similarity);
}
```

### 8.2 Coordinator Service Documentation

**Status**: RAG-side integration is complete, but Coordinator service code is not in this repo.

**Missing**:
- Coordinator service implementation (routing logic, microservice mapping)
- Universal Envelope format specification
- Microservice integration examples

**Recommendation**: Document the expected Coordinator behavior and Universal Envelope schema.

### 8.3 Error Handling Improvements

**Issues Found**:

1. **Vector Search Failures**: If vector search fails, the pipeline continues without context (line 952-957). Should fail gracefully.

2. **Coordinator Timeouts**: No retry logic for Coordinator failures. Should implement exponential backoff.

3. **Embedding Generation Failures**: If OpenAI embedding fails, no fallback. Should cache embeddings or use fallback model.

**Recommendations**:
- Add retry logic for Coordinator calls
- Cache query embeddings for common queries
- Add fallback mechanisms for each stage

### 8.4 Performance Optimizations

**Opportunities**:

1. **Embedding Caching**: Cache embeddings for frequently asked queries (Redis)

2. **Parallel Vector + KG Queries**: Query KG in parallel with vector search (not sequential)

3. **HNSW Index Tuning**: Current `m=16, ef_construction=64` may need tuning for larger datasets
   - For >1M vectors: `m=32, ef_construction=128`
   - For <100K vectors: `m=16, ef_construction=64` (current)

4. **Batch Embedding Generation**: If processing multiple queries, batch OpenAI calls

### 8.5 Code Quality Improvements

**Issues Found**:

1. **Duplicated RBAC Logic**: RBAC filtering logic is duplicated in main search and fallback search (lines 431-700 and 771-861). Should extract to a function.

2. **Hardcoded Thresholds**: Similarity thresholds are hardcoded in multiple places. Should use configuration.

3. **Missing Type Safety**: No TypeScript or JSDoc types. Should add type definitions.

4. **Incomplete KG Service**: Only one function exists. Should implement full KG query API.

---

## 9. Summary: What Works vs. What's Missing

### ✅ Fully Implemented

1. **HNSW Vector Search**
   - ✅ Schema with `vector(1536)` column
   - ✅ HNSW index with cosine similarity
   - ✅ Vector search function with threshold filtering
   - ✅ Integration into query pipeline

2. **Coordinator Routing**
   - ✅ Decision logic (`shouldCallCoordinator`)
   - ✅ gRPC client implementation
   - ✅ Response parsing and merging
   - ✅ Integration into query pipeline

3. **Query Pipeline**
   - ✅ Query classification
   - ✅ Embedding generation
   - ✅ RBAC filtering
   - ✅ LLM answer generation

### ⚠️ Partially Implemented

1. **Knowledge Graph**
   - ✅ Schema defined (nodes + edges)
   - ✅ Basic service exists (one function)
   - ❌ NOT integrated into RAG pipeline
   - ❌ No query expansion
   - ❌ No relationship-based boosting

### ❌ Missing

1. **Knowledge Graph Integration**
   - No KG-enhanced vector search
   - No KG-based result boosting
   - No path traversal queries

2. **Coordinator Service**
   - Coordinator service code not in repo (expected to be separate)

3. **Advanced Features**
   - No query embedding caching
   - No parallel KG queries
   - No batch processing

---

## 10. Conclusion

The RAG microservice has a **solid foundation** with:
- ✅ Fully functional HNSW vector search
- ✅ Complete Coordinator integration
- ✅ Robust query pipeline

However, the **Knowledge Graph is defined but not integrated**. To fully leverage the KG:

1. **Implement KG query expansion** after vector search
2. **Add KG-based result boosting** for related nodes
3. **Integrate KG filtering** for user-specific results
4. **Add path traversal** for indirect relationships

The architecture is well-designed and ready for KG integration. The schema and basic services exist—they just need to be connected to the main query pipeline.

---

**Document Generated**: 2025-01-27  
**Codebase Version**: Latest  
**Analysis Scope**: RAG Microservice + Coordinator Integration


