# RAG Microservice - Complete Interview Preparation Guide

**Generated:** 2025-01-27  
**Project:** EDUCORE - Contextual Assistant (RAG / Knowledge Graph) Microservice  
**Purpose:** Comprehensive technical interview preparation

---

## ====================================
## PHASE 1 – Project Mapping & Tech Stack
## ====================================

### 1. Project Overview

**What the project does:**
- This is a **RAG (Retrieval-Augmented Generation) microservice** that provides contextual AI assistance for the EDUCORE learning platform
- It serves as the **central contextual intelligence layer** integrating with 10+ other microservices
- Main capabilities:
  - **RAG Query Processing**: Answers questions using vector similarity search + OpenAI
  - **Vector Search**: Semantic similarity search using PostgreSQL with pgvector extension
  - **Knowledge Graph**: Unified knowledge graph integrating all microservices
  - **Personalized Assistance**: Role and profile-based responses
  - **Access Control**: RBAC (Role-Based Access Control) and ABAC (Attribute-Based Access Control)
  - **Multi-tenant Isolation**: Complete tenant data isolation

**Main Domain:**
- **RAG (Retrieval-Augmented Generation)**
- **Microservices Architecture**
- **Knowledge Management**
- **AI/ML Integration**

**Services & Communication:**
1. **Backend Service** (Node.js/Express)
   - REST API endpoints (`/api/v1/query`, `/api/v1/personalized/*`, etc.)
   - gRPC client for Coordinator service communication
   - Communicates with: PostgreSQL (via Prisma), Redis (caching), OpenAI API, Kafka (message queue)

2. **Frontend Widget** (React)
   - Floating chat widget component
   - Embedded mode support for other microservices
   - Communicates with backend via RTK Query (Redux Toolkit Query)

3. **Database Layer** (PostgreSQL + pgvector)
   - Prisma ORM for database access
   - Vector embeddings stored in `vector_embeddings` table
   - Multi-tenant schema with complete data isolation

4. **External Services** (via gRPC)
   - Coordinator service (intelligent routing to microservices)
   - AI Learner service (personalized recommendations)
   - Assessment/DevLab microservices (support mode)

---

### 2. Tech Stack Summary

#### Backend
- **Language**: JavaScript (ES2022+), Node.js 20 LTS
- **Framework**: Express.js 4.18.2
- **Key Libraries**:
  - **ORM**: Prisma 5.8.0 (database access)
  - **Auth**: jsonwebtoken 9.0.2 (JWT support), role-based auth via headers
  - **Validation**: Joi 17.11.0 (request validation)
  - **Logging**: Winston 3.11.0 (structured logging)
  - **Cache**: ioredis 5.3.2 (Redis client)
  - **Message Queue**: kafkajs 2.2.4 (Kafka client)
  - **AI**: openai 4.20.0 (OpenAI API client)
  - **gRPC**: @grpc/grpc-js 1.10.0, @grpc/proto-loader 0.7.11
  - **HTTP Client**: axios 1.6.2

#### Frontend
- **Framework**: React 18.2.0
- **State Management**: Redux Toolkit 2.0.1 + RTK Query (API layer)
- **UI Library**: Material-UI (MUI) 5.15.0
- **Styling**: Tailwind CSS 3.4.1, Emotion (CSS-in-JS)
- **Real-time**: Supabase Realtime (via @supabase/supabase-js 2.39.0)
- **Build Tool**: Vite 5.0.8
- **Animations**: framer-motion 10.16.16
- **Icons**: react-icons 5.2.1, @mui/icons-material

#### Database
- **Type**: PostgreSQL 15+ with pgvector extension
- **ORM**: Prisma Client
- **Vector Storage**: `vector_embeddings` table with 1536-dimension embeddings
- **Vector Index**: HNSW (Hierarchical Navigable Small World) index for fast similarity search
- **Main Tables/Models**:
  - `tenants` - Multi-tenant isolation
  - `vector_embeddings` - Vector embeddings for semantic search
  - `queries` - Query history and analytics
  - `query_sources` - Source citations for queries
  - `query_recommendations` - Personalized recommendations
  - `knowledge_graph_nodes` - Knowledge graph nodes
  - `knowledge_graph_edges` - Knowledge graph relationships
  - `user_profiles` - User profiles for personalization
  - `access_control_rules` - RBAC/ABAC rules
  - `audit_logs` - Audit trail
  - `cache_entries` - Cache entries (optional)
  - `microservices` - Microservice registry

#### Infrastructure
- **Containerization**: Docker (docker-compose.dev.yml, docker-compose.test.yml)
- **Deployment**: Railway (production), Vercel (frontend, optional)
- **Database Hosting**: Supabase (PostgreSQL with pgvector)
- **Cache**: Redis 7+ (optional, graceful degradation)
- **Message Queue**: Apache Kafka (optional)
- **CI/CD**: GitHub Actions (templates available)
- **Environment Management**: `.env` files, Railway environment variables

---

### 3. Project Structure

```
RAG_microservice/
├── BACKEND/                    # Backend service
│   ├── src/
│   │   ├── clients/            # gRPC clients (coordinator, ai-learner)
│   │   ├── communication/      # Communication layer (routing, schema interpretation)
│   │   ├── config/              # Configuration (database, redis, openai, kafka, messages)
│   │   ├── controllers/        # API endpoint handlers
│   │   ├── grpc/               # gRPC service definitions
│   │   ├── middleware/         # Express middleware (error handling)
│   │   ├── routes/             # Express route definitions
│   │   ├── services/           # Business logic services
│   │   └── utils/               # Utility functions (logger, cache, validation, etc.)
│   ├── tests/                  # Test suites (unit, integration, e2e)
│   └── scripts/                # Utility scripts
│
├── FRONTEND/                   # Frontend widget
│   ├── src/
│   │   ├── components/         # React components (chat, chatbot)
│   │   ├── hooks/              # Custom React hooks (useAuth, useChat, useRealtime)
│   │   ├── services/           # API services (api.js, microserviceProxy.js, supabase.js)
│   │   ├── store/              # Redux store (slices, API)
│   │   ├── theme/              # Theme configuration (dark/light)
│   │   └── utils/              # Utility functions
│   └── tests/                  # Frontend tests
│
├── DATABASE/                   # Database schema and migrations
│   ├── prisma/
│   │   ├── schema.prisma       # Prisma schema definition
│   │   ├── migrations/         # Database migrations
│   │   └── seed.js             # Database seeding script
│   └── proto/                  # Protocol Buffer definitions (gRPC)
│
└── FULLSTACK_TEMPLATES/        # Development templates and documentation
```

**Key Folder Roles:**
- **BACKEND/src/services/**: Core business logic (query processing, vector search, tenant management, user profiles, recommendations, knowledge graph)
- **BACKEND/src/controllers/**: HTTP request handlers (query, recommendations, knowledge graph, diagnostics, microservice support)
- **BACKEND/src/routes/**: Express route definitions
- **BACKEND/src/utils/**: Shared utilities (logging, caching, validation, query classification, response formatting)
- **FRONTEND/src/components/**: React components (FloatingChatWidget, ChatPanel, ChatInput, etc.)
- **FRONTEND/src/store/**: Redux state management (auth, chat, UI, chatMode slices + RTK Query API)
- **DATABASE/prisma/**: Database schema, migrations, and seed data

---

## ====================================
## PHASE 2 – Backend Deep Dive
## ====================================

### 1. API Architecture

**Architecture Pattern**: **Microservices** (this service is one microservice in a larger ecosystem)

**Main Endpoints:**

1. **POST /api/v1/query** (Primary endpoint)
   - Purpose: Process RAG queries and return AI-generated answers
   - Request: `{ query, tenant_id, context: { user_id, session_id }, options: { max_results, min_confidence } }`
   - Response: `{ answer, confidence, sources[], recommendations[], metadata }`
   - Flow: Query → Classification → Vector Search → RBAC Filtering → OpenAI Generation → Response

2. **GET /api/v1/personalized/recommendations/:userId**
   - Purpose: Get personalized recommendations for a user
   - Query params: `tenant_id`, `mode`, `limit`
   - Response: `{ recommendations[] }`

3. **GET /api/v1/knowledge/progress/user/:userId/skill/:skillId**
   - Purpose: Get knowledge graph progress for user/skill
   - Query params: `tenant_id`
   - Response: Knowledge graph data

4. **POST /api/assessment/support** (Support mode)
   - Purpose: Proxy requests to Assessment microservice
   - Requires: Support mode enabled + authorization headers

5. **POST /api/devlab/support** (Support mode)
   - Purpose: Proxy requests to DevLab microservice
   - Requires: Support mode enabled + authorization headers

6. **GET /api/debug/embeddings-status** (Diagnostics)
   - Purpose: Check embedding system status
   - Response: Embedding counts, tenant info

7. **GET /api/debug/test-vector-search** (Diagnostics)
   - Purpose: Test vector search functionality
   - Query params: `query`, `tenant_id`

**Request/Response Flow:**
```
Client Request
  ↓
Express Middleware (CORS, JSON parsing)
  ↓
Route Handler (query.routes.js)
  ↓
Controller (query.controller.js) - Validation, tenant resolution
  ↓
Service (queryProcessing.service.js) - Business logic
  ├─→ Tenant Service (tenant resolution)
  ├─→ User Profile Service (RBAC data)
  ├─→ Query Classifier (EDUCORE vs general query)
  ├─→ Vector Search Service (semantic search)
  ├─→ RBAC Filtering (access control)
  ├─→ gRPC Fallback (Coordinator service, if needed)
  ├─→ OpenAI API (answer generation)
  └─→ Recommendations Service (personalized recommendations)
  ↓
Database (Prisma) - Save query, sources, recommendations
  ↓
Cache (Redis) - Cache response (optional)
  ↓
Response to Client
```

**Communication Pattern**: 
- **REST API** for external clients
- **gRPC** for inter-microservice communication (Coordinator, AI Learner)
- **Hybrid**: Can operate as standalone or integrated with microservice mesh

---

### 2. Data Layer

**Main Models/Tables:**

1. **Tenant** (`tenants`)
   - Fields: `id` (UUID), `name`, `domain` (unique), `settings` (JSON), `createdAt`, `updatedAt`, `deletedAt`
   - Purpose: Multi-tenant isolation - every query/data is scoped to a tenant
   - Relationships: One-to-many with all other tables

2. **VectorEmbedding** (`vector_embeddings`)
   - Fields: `id`, `tenantId`, `microserviceId` (optional), `contentId`, `contentType`, `embedding` (vector(1536)), `contentText`, `chunkIndex`, `metadata` (JSON)
   - Purpose: Store vector embeddings for semantic search
   - Indexes: HNSW index on `embedding`, composite indexes on `tenantId`, `contentType`, `microserviceId`
   - Relationships: Many-to-one with Tenant, optional many-to-one with Microservice

3. **Query** (`queries`)
   - Fields: `id`, `tenantId`, `userId`, `sessionId`, `queryText`, `answer`, `confidenceScore`, `processingTimeMs`, `modelVersion`, `isPersonalized`, `isCached`, `metadata`, `createdAt`
   - Purpose: Store query history for analytics
   - Relationships: One-to-many with QuerySource, QueryRecommendation

4. **QuerySource** (`query_sources`)
   - Fields: `id`, `queryId`, `sourceId`, `sourceType`, `sourceMicroservice`, `title`, `contentSnippet`, `sourceUrl`, `relevanceScore`, `metadata`
   - Purpose: Store source citations for queries
   - Relationships: Many-to-one with Query

5. **QueryRecommendation** (`query_recommendations`)
   - Fields: `id`, `queryId`, `recommendationType`, `recommendationId`, `title`, `description`, `reason`, `priority`, `metadata`
   - Purpose: Store personalized recommendations linked to queries
   - Relationships: Many-to-one with Query

6. **UserProfile** (`user_profiles`)
   - Fields: `id`, `tenantId`, `userId` (unique), `role`, `department`, `region`, `skillGaps` (JSON), `learningProgress` (JSON), `preferences` (JSON), `metadata`
   - Purpose: User profiles for personalization and RBAC
   - Relationships: Many-to-one with Tenant

7. **KnowledgeGraphNode** (`knowledge_graph_nodes`)
   - Fields: `id`, `tenantId`, `nodeId` (unique), `nodeType`, `properties` (JSON)
   - Purpose: Knowledge graph nodes
   - Relationships: One-to-many with KnowledgeGraphEdge (as source/target)

8. **KnowledgeGraphEdge** (`knowledge_graph_edges`)
   - Fields: `id`, `tenantId`, `sourceNodeId`, `targetNodeId`, `edgeType`, `weight`, `properties` (JSON)
   - Purpose: Knowledge graph relationships
   - Relationships: Many-to-one with KnowledgeGraphNode (source/target)

9. **AccessControlRule** (`access_control_rules`)
   - Fields: `id`, `tenantId`, `ruleType` (RBAC/ABAC), `subjectType`, `subjectId`, `resourceType`, `resourceId`, `permission`, `conditions` (JSON), `isActive`
   - Purpose: RBAC/ABAC rules for access control
   - Relationships: Many-to-one with Tenant

10. **AuditLog** (`audit_logs`)
    - Fields: `id`, `tenantId`, `userId`, `action`, `resourceType`, `resourceId`, `ipAddress`, `userAgent`, `details` (JSON), `createdAt`
    - Purpose: Audit trail for compliance
    - Relationships: Many-to-one with Tenant

11. **Microservice** (`microservices`)
    - Fields: `id`, `tenantId`, `name`, `serviceId` (unique), `displayName`, `description`, `apiEndpoint`, `version`, `isActive`, `settings` (JSON), `metadata` (JSON)
    - Purpose: Microservice registry
    - Relationships: Many-to-one with Tenant

**Key Relationships:**
- **Tenant → All tables**: One-to-many (complete tenant isolation)
- **Query → QuerySource**: One-to-many (one query has multiple sources)
- **Query → QueryRecommendation**: One-to-many (one query has multiple recommendations)
- **KnowledgeGraphNode → KnowledgeGraphEdge**: One-to-many (source/target relationships)
- **VectorEmbedding → Microservice**: Many-to-one (optional, tracks which microservice provided the content)

---

### 3. Error Handling & Logging

**Error Handling:**
- **Global Error Handler**: `error-handler.middleware.js`
  - Catches all unhandled errors
  - Returns structured JSON error responses
  - Logs errors with Winston logger
  - Includes stack trace in development mode

- **Error Types**:
  - Validation errors (400) - Joi validation failures
  - Authentication errors (401) - Missing/invalid tokens
  - Authorization errors (403) - RBAC violations
  - Not found errors (404) - Resource not found
  - Internal server errors (500) - Unhandled exceptions

- **Error Flow**:
  ```
  Service throws error
    ↓
  Controller catches → logs → passes to next()
    ↓
  Error handler middleware → formats → returns JSON
  ```

**Logging Strategy:**
- **Library**: Winston 3.11.0
- **Log Levels**: `info`, `warn`, `error`, `debug`
- **Structured Logging**: JSON format with context
- **Log Context**: Includes tenant_id, user_id, query preview, processing time, etc.
- **Security Logging**: Special logging for RBAC violations and unauthorized access attempts
- **Location**: `BACKEND/src/utils/logger.util.js`

**Example Log Structure:**
```javascript
logger.info('Query processed successfully', {
  query: query.substring(0, 100),
  tenant_id: actualTenantId,
  user_id,
  processing_time_ms: processingTimeMs,
  sources_count: sources.length,
  confidence,
});
```

---

### 4. Security & Authentication

**Authentication:**
- **Method**: **Header-based authentication** (JWT tokens supported but not required)
- **Headers Used**:
  - `Authorization: Bearer <token>` (optional, for authenticated users)
  - `X-User-Id`: User identifier
  - `X-User-Role`: User role (admin, manager, hr, trainer, employee, anonymous)
  - `X-Tenant-Id`: Tenant identifier
- **Anonymous Access**: Supported (user_id = 'anonymous')
- **Token Library**: jsonwebtoken 9.0.2 (available but not enforced)

**Authorization (RBAC):**
- **Implementation**: `queryProcessing.service.js` (lines 431-700)
- **Roles**:
  - `admin` / `administrator`: Full access to all user profiles
  - `hr`: Full access to all user profiles (employee management)
  - `trainer`: Access to specific user profiles when explicitly asked
  - `manager`: Access to specific user profiles when explicitly asked
  - `employee` / `user` / `learner`: Only own profile access
  - `anonymous` / `guest`: No user profile access
- **RBAC Logic**:
  - User profiles are filtered based on role and query context
  - Specific user name detection (English and Hebrew)
  - "Own profile" detection for employees
  - Security logging for unauthorized access attempts

**Protection Layers:**

1. **SQL Injection Prevention**:
   - **Prisma ORM**: Uses parameterized queries (prevents SQL injection)
   - **Raw Queries**: Uses `$queryRawUnsafe` with parameterized placeholders (`$1`, `$2`, etc.)
   - **Vector Search**: Embedding values are escaped and parameterized
   - **Location**: `unifiedVectorSearch.service.js` (lines 48-100)

2. **XSS Prevention**:
   - **Backend**: Response data is JSON-serialized (no HTML injection)
   - **Frontend**: React automatically escapes content (JSX)
   - **Input Validation**: Joi validation sanitizes input
   - **Location**: `validation.util.js`, React components

3. **CSRF Protection**:
   - **Missing Information**: CSRF protection not explicitly implemented
   - **Recommendation**: Add CSRF tokens for state-changing operations

4. **Rate Limiting**:
   - **Status**: **Planned but not implemented** (mentioned in templates, not in production code)
   - **Recommendation**: Implement rate limiting middleware (e.g., express-rate-limit)

5. **CORS Protection**:
   - **Implementation**: `index.js` (lines 32-63)
   - **Allowed Origins**: Configurable via environment variables
   - **Credentials**: Enabled for authenticated requests
   - **Methods**: GET, POST, PUT, DELETE, OPTIONS

6. **Tenant Isolation**:
   - **Implementation**: All queries filtered by `tenant_id`
   - **Validation**: `tenant-validation.util.js` ensures correct tenant ID
   - **Security**: Prevents cross-tenant data access

7. **Input Validation**:
   - **Library**: Joi 17.11.0
   - **Location**: `validation.util.js`, `query.controller.js` (lines 16-29)
   - **Validates**: Query text, tenant_id, user_id, options (max_results, min_confidence)

---

### 5. Performance & Scalability

**Caching:**
- **Redis**: ioredis 5.3.2
- **Strategy**: Query response caching (TTL: 1 hour)
- **Cache Key**: `query:{tenantId}:{userId}:{base64(query)}`
- **Graceful Degradation**: Service works without Redis (optional dependency)
- **Location**: `queryProcessing.service.js` (lines 204-243), `redis.config.js`
- **Cache Invalidation**: Manual (TTL-based, no explicit invalidation)

**Queues & Async Workers:**
- **Kafka**: kafkajs 2.2.4 (available but usage not visible in main query flow)
- **Purpose**: Message queue for async processing (planned/optional)
- **Status**: Infrastructure exists, integration not fully implemented

**Database Indexes:**
- **Vector Index**: HNSW index on `vector_embeddings.embedding` (for fast similarity search)
- **Composite Indexes**:
  - `vector_embeddings`: `(tenant_id, content_id)`, `(tenant_id, content_type, microservice_id)`
  - `queries`: `(tenant_id, created_at DESC)`, `(user_id, created_at DESC)`
  - `audit_logs`: `(tenant_id, created_at DESC)`, `(user_id, created_at DESC)`
  - `access_control_rules`: `(tenant_id, subject_type, subject_id, resource_type, resource_id)`
- **GIN Indexes**: JSONB properties (knowledge_graph_nodes.properties)

**Optimization Strategies:**
1. **Vector Search Optimization**:
   - Similarity threshold: Configurable (default: 0.25)
   - Result limit: Configurable (default: 20, max: 20)
   - Fallback threshold: 0.1 (if no results with default threshold)
   - RBAC filtering applied after vector search (maintains performance)

2. **Query Processing**:
   - Cache check before processing
   - Parallel operations where possible
   - Processing time tracking

3. **Database Connection Pooling**:
   - Prisma handles connection pooling automatically
   - Configurable via `DATABASE_URL` connection string

4. **Response Optimization**:
   - JSON serialization validation
   - Error response caching (prevents repeated failures)

---

## ====================================
## PHASE 3 – Frontend Deep Dive
## ====================================

### 1. App Flow

**Main Screens/Components:**

1. **FloatingChatWidget** (Main component)
   - **Location**: `FRONTEND/src/components/chat/FloatingChatWidget/FloatingChatWidget.jsx`
   - **Purpose**: Main chat widget container
   - **Features**:
     - Toggle open/close
     - Mode switching (General, Assessment Support, DevLab Support)
     - User context loading
     - Recommendations display
     - Message handling

2. **ChatPanel** (Chat interface)
   - **Location**: `FRONTEND/src/components/chatbot/ChatPanel/ChatPanel.jsx`
   - **Purpose**: Chat UI panel
   - **Features**:
     - Message list display
     - Input field
     - Recommendations display
     - Loading states

3. **ChatHeader** (Header)
   - **Location**: `FRONTEND/src/components/chatbot/ChatHeader/ChatHeader.jsx`
   - **Purpose**: Chat header with title and close button

4. **ChatInput** (Input field)
   - **Location**: `FRONTEND/src/components/chatbot/ChatInput/ChatInput.jsx`
   - **Purpose**: Message input with send button

5. **ChatMessage** (Message display)
   - **Location**: `FRONTEND/src/components/chatbot/ChatMessage/ChatMessage.jsx`
   - **Purpose**: Individual message rendering (user/bot)

6. **ChatWidgetButton** (Toggle button)
   - **Location**: `FRONTEND/src/components/chatbot/ChatWidgetButton/ChatWidgetButton.jsx`
   - **Purpose**: Floating button to open/close widget

7. **Recommendations** (Recommendations display)
   - **Location**: `FRONTEND/src/components/chatbot/Recommendations/Recommendations.jsx`
   - **Purpose**: Display personalized recommendations

**User Flow:**
```
User opens widget
  ↓
FloatingChatWidget loads
  ↓
useAuth hook loads user context (if provided)
  ↓
Initial greeting shown (General mode only)
  ↓
Recommendations fetched (if authenticated)
  ↓
User types message
  ↓
Mode detection (General vs Support mode)
  ↓
If General Mode:
  - Submit to RAG API (/api/v1/query)
  - Display answer + sources
  - Update recommendations
  ↓
If Support Mode:
  - Proxy to microservice (Assessment/DevLab)
  - Display verbatim response
  ↓
Message added to chat history
```

---

### 2. State Management

**State Flow:**
```
User Action (typing message)
  ↓
handleSendMessage() in FloatingChatWidget
  ↓
Redux Action: addMessage() (user message)
  ↓
Redux Action: setLoading(true)
  ↓
RTK Query Mutation: useSubmitQueryMutation()
  ↓
API Call: POST /api/v1/query
  ↓
Backend Processing (RAG, vector search, OpenAI)
  ↓
Response received
  ↓
Redux Action: addMessage() (bot response)
  ↓
Redux Action: setLoading(false)
  ↓
UI Re-renders (React)
```

**Redux Store Structure:**
- **auth.slice.js**: User authentication state (token, userId, tenantId, role)
- **chat.slice.js**: Chat messages, loading state
- **ui.slice.js**: UI state (widget open/closed)
- **chatMode.slice.js**: Current mode (GENERAL, ASSESSMENT_SUPPORT, DEVLAB_SUPPORT)
- **user.slice.js**: User profile data
- **ragApi.js** (RTK Query): API endpoints (submitQuery, getRecommendations)

**State Management Pattern**: **Redux Toolkit + RTK Query**
- **Slices**: Redux Toolkit slices for local state
- **RTK Query**: API layer for server state
- **Selectors**: useSelector hooks for component access

---

### 3. Component Architecture

**Smart Components** (Logic-heavy):
- **FloatingChatWidget**: Main orchestrator, handles mode switching, API calls, recommendations
- **ChatPanel**: Manages message list, input handling, recommendations

**Dumb Components** (Presentation):
- **ChatMessage**: Displays individual message (user/bot)
- **ChatInput**: Input field with send button
- **ChatHeader**: Header with title and close button
- **ChatWidgetButton**: Toggle button
- **Recommendations**: Displays recommendation cards

**Separation of Concerns:**
- **Components**: UI rendering
- **Hooks**: Custom logic (useAuth, useChat, useRealtime)
- **Services**: API communication (api.js, microserviceProxy.js)
- **Store**: State management (Redux)
- **Utils**: Helper functions (answerFormatter, modeDetector, recommendations)

---

### 4. Error/Loading Handling

**Loading States:**
- **Redux State**: `chat.isLoading` (boolean)
- **RTK Query**: `isLoading` from mutations/queries
- **UI**: Loading spinner/indicator in ChatPanel
- **Location**: `FloatingChatWidget.jsx` (lines 236, 380)

**Error Handling:**
- **API Errors**: Caught in try-catch blocks
- **Error Messages**: User-friendly messages based on error type
  - Tenant errors: "There was an issue accessing your workspace data"
  - Permission errors: "You don't have permission to access it"
  - Connection errors: "Error connecting to the service"
- **Fallback**: Mode-specific fallback responses if API fails
- **Location**: `FloatingChatWidget.jsx` (lines 323-378)

**Empty States:**
- **No Messages**: Initial greeting shown
- **No Recommendations**: Recommendations hidden (not shown as empty)
- **No Results**: Error message displayed (from backend)

---

## ====================================
## PHASE 4 – System Design Perspective
## ====================================

### 1. High-Level Architecture Summary

**Architecture Diagram (Text-based):**
```
┌─────────────────┐
│   Frontend      │
│  (React Widget) │
└────────┬────────┘
         │ HTTP/REST
         │ (RTK Query)
         ↓
┌─────────────────────────────────────┐
│      Backend Service                │
│      (Node.js/Express)              │
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │   REST API   │  │  gRPC Client│ │
│  │   Endpoints  │  │  (Coordinator)│
│  └──────────────┘  └─────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  Query Processing Service      │ │
│  │  - Query Classification        │ │
│  │  - Vector Search               │ │
│  │  - RBAC Filtering              │ │
│  │  - OpenAI Integration          │ │
│  └───────────────────────────────┘ │
└─────┬──────────┬──────────┬─────────┘
      │          │          │
      │          │          │
      ↓          ↓          ↓
┌─────────┐ ┌────────┐ ┌──────────┐
│PostgreSQL│ │ Redis  │ │  OpenAI  │
│(pgvector)│ │(Cache) │ │   API    │
└─────────┘ └────────┘ └──────────┘
      │
      │ (gRPC)
      ↓
┌─────────────────┐
│  Coordinator     │
│  (Microservice)  │
└─────────────────┘
      │
      │ (Routes to other microservices)
      ↓
┌─────────────────┐
│  Other Services │
│  (Assessment,   │
│   DevLab, etc.) │
└─────────────────┘
```

**Main Flows:**

1. **Query Flow (General Mode)**:
   - User submits query via frontend
   - Backend receives request, validates tenant_id and user context
   - Query classified as EDUCORE or general knowledge
   - If EDUCORE: Vector search in PostgreSQL (pgvector) for similar content
   - RBAC filtering applied to vector results (user profile access control)
   - If insufficient results: gRPC call to Coordinator service
   - Coordinator routes to appropriate microservices
   - Results merged and sent to OpenAI for answer generation
   - Response cached in Redis (optional)
   - Answer + sources + recommendations returned to frontend

2. **Support Mode Flow**:
   - User message detected as Assessment/DevLab support request
   - Frontend switches to Support Mode
   - Messages proxied directly to microservice (Assessment/DevLab)
   - Microservice response returned verbatim to user
   - No RAG processing, no OpenAI integration

3. **Personalization Flow**:
   - User profile loaded from database
   - Skill gaps and learning progress retrieved
   - Recommendations generated based on profile + query context
   - Personalized context added to OpenAI prompt

---

### 2. Design Decisions & Tradeoffs

**1. Database Choice: PostgreSQL + pgvector**
- **Decision**: PostgreSQL with pgvector extension for vector storage
- **Reasoning**: 
  - Native vector support (pgvector)
  - ACID compliance for multi-tenant data
  - HNSW index for fast similarity search
  - Single database for vectors + relational data
- **Tradeoff**: Requires PostgreSQL 15+ with extension (not available on all hosting)

**2. Single Vector Table Pattern**
- **Decision**: One `vector_embeddings` table for all content types (documents, KG nodes, queries)
- **Reasoning**:
  - Flexibility (add new content types without schema changes)
  - Unified search across all content types
  - Single HNSW index (better performance)
- **Tradeoff**: Less normalization, harder to query specific content types

**3. Microservices Architecture**
- **Decision**: This service is one microservice in a larger ecosystem
- **Reasoning**:
  - Separation of concerns (RAG service independent)
  - Scalability (scale RAG service independently)
  - Integration with other services via gRPC
- **Tradeoff**: Increased complexity (service discovery, communication, deployment)

**4. REST + gRPC Hybrid**
- **Decision**: REST API for external clients, gRPC for inter-service communication
- **Reasoning**:
  - REST: Easy integration, standard HTTP
  - gRPC: Efficient binary protocol for microservices
- **Tradeoff**: Two communication protocols to maintain

**5. Redis as Optional Cache**
- **Decision**: Redis caching with graceful degradation
- **Reasoning**:
  - Performance improvement (cache query responses)
  - Service works without Redis (no single point of failure)
- **Tradeoff**: Cache inconsistency possible (TTL-based, no invalidation)

**6. RBAC Filtering After Vector Search**
- **Decision**: Apply RBAC filtering after vector search (not in SQL query)
- **Reasoning**:
  - Maintains vector search performance (no complex SQL filters)
  - Flexible RBAC logic (role + query context)
- **Tradeoff**: More results retrieved than needed (filtered in application)

**7. Query Classification (EDUCORE vs General)**
- **Decision**: Classify queries before processing
- **Reasoning**:
  - General queries → OpenAI directly (no vector search)
  - EDUCORE queries → Vector search + RAG
  - Reduces unnecessary database queries
- **Tradeoff**: Classification logic needs maintenance (pattern matching)

**8. Support Mode (Proxy Behavior)**
- **Decision**: Proxy mode for Assessment/DevLab microservices
- **Reasoning**:
  - Unified chat interface for all microservices
  - No RAG processing for support requests
- **Tradeoff**: Less intelligent responses (no AI enhancement)

---

### 3. Scaling Strategy

**Current Scalability:**
- **Horizontal Scaling**: Backend can be scaled horizontally (stateless)
- **Database Scaling**: PostgreSQL can be scaled (read replicas, connection pooling)
- **Cache Scaling**: Redis can be scaled (cluster mode)
- **Vector Search**: HNSW index supports large datasets (millions of vectors)

**Potential Bottlenecks:**
1. **Vector Search Performance**:
   - **Bottleneck**: HNSW index performance degrades with very large datasets
   - **Solution**: Partition vectors by tenant, use read replicas, optimize index parameters

2. **OpenAI API Rate Limits**:
   - **Bottleneck**: OpenAI API rate limits
   - **Solution**: Request queuing, exponential backoff, caching

3. **Database Connection Pool**:
   - **Bottleneck**: Connection pool exhaustion
   - **Solution**: Increase pool size, use read replicas, connection pooling optimization

4. **RBAC Filtering**:
   - **Bottleneck**: Filtering large result sets in application
   - **Solution**: Move RBAC filtering to database (if possible), optimize filtering logic

**Recommended Improvements:**
1. **Rate Limiting**: Implement rate limiting middleware (express-rate-limit)
2. **Database Read Replicas**: Use read replicas for vector search queries
3. **Caching Strategy**: Implement cache invalidation, cache warming
4. **Monitoring**: Add APM (Application Performance Monitoring), metrics collection
5. **Load Balancing**: Add load balancer for multiple backend instances
6. **Async Processing**: Use Kafka for async query processing (reduce response time)
7. **Vector Index Optimization**: Tune HNSW index parameters (m, ef_construction)
8. **Query Optimization**: Add query result pagination, limit result sets

---

## ====================================
## PHASE 5 – Interview Preparation Pack
## ====================================

### 1. "Tell me about this project" (2-3 minute explanation)

**Script:**

"This is a **RAG (Retrieval-Augmented Generation) microservice** I built for the EDUCORE learning platform. It serves as the central contextual intelligence layer that integrates with 10+ other microservices.

**What it does:**
The system answers user questions by combining semantic vector search with OpenAI's language models. When a user asks a question, it first searches a PostgreSQL database with pgvector for similar content, applies role-based access control to filter results, and then uses OpenAI to generate a contextual answer with source citations.

**Technologies:**
- **Backend**: Node.js with Express, Prisma ORM, PostgreSQL with pgvector for vector search
- **Frontend**: React with Redux Toolkit and RTK Query
- **AI**: OpenAI API for embeddings and answer generation
- **Infrastructure**: Docker, Railway for deployment, Redis for caching
- **Communication**: REST API for clients, gRPC for inter-microservice communication

**Key challenges:**
1. **Multi-tenant isolation**: Ensuring complete data separation between tenants
2. **RBAC implementation**: Complex role-based access control for user profiles (admins, HR, managers, employees, anonymous users)
3. **Vector search optimization**: Balancing search performance with RBAC filtering
4. **Hebrew/English support**: Handling bilingual queries and content
5. **Graceful degradation**: Service works without Redis (optional cache)

**What I learned:**
- Vector embeddings and semantic search (pgvector, HNSW indexes)
- Microservices architecture and gRPC communication
- RBAC implementation patterns
- Multi-tenant database design
- Performance optimization (caching, indexing, query optimization)
- Error handling and logging strategies"

---

### 2. Technical Q&A (Project-Specific)

**Q1: How does the vector search work?**
**A:** The system uses PostgreSQL with the pgvector extension. When a user submits a query, it's converted to a 1536-dimensional embedding using OpenAI's text-embedding-ada-002 model. This embedding is then compared against stored embeddings in the `vector_embeddings` table using cosine similarity (via the `<=>` operator). Results are filtered by similarity threshold (default 0.25) and limited to top N results. An HNSW (Hierarchical Navigable Small World) index is used for fast similarity search.

**Q2: How is RBAC implemented?**
**A:** RBAC is implemented in the query processing service. After vector search retrieves results, user profiles are filtered based on role and query context. Admins and HR can access all profiles, managers and trainers can access specific profiles when explicitly asked, employees can only access their own profile, and anonymous users are blocked. The system detects specific user names in queries (English and Hebrew) and checks if the query is about the user's own profile. Security logging tracks all unauthorized access attempts.

**Q3: How does the system handle multi-tenant isolation?**
**A:** Every database table includes a `tenant_id` field. All queries are filtered by `tenant_id` at the database level. The system validates and corrects tenant IDs at the entry point to prevent cross-tenant data access. Tenant resolution maps domain names to tenant UUIDs.

**Q4: What happens when vector search returns no results?**
**A:** The system tries a lower similarity threshold (0.1) as a fallback. If still no results, it attempts to call the Coordinator service via gRPC to fetch data from other microservices. If that also fails, it returns a user-friendly error message explaining why no data was found (no data, low similarity, or permission denied).

**Q5: How is caching implemented?**
**A:** Redis is used for query response caching with a 1-hour TTL. Cache keys include tenant ID, user ID, and base64-encoded query. The system gracefully degrades if Redis is unavailable - it continues working without caching. Cache is checked before processing queries to avoid unnecessary computation.

**Q6: How does the frontend communicate with the backend?**
**A:** The frontend uses Redux Toolkit Query (RTK Query) for API communication. It automatically adds authentication headers (Authorization, X-User-Id, X-Tenant-Id) from Redux state. The main endpoint is `POST /api/v1/query` which returns answers, sources, and recommendations.

**Q7: What is Support Mode?**
**A:** Support Mode is a proxy mode where the chat widget forwards messages directly to other microservices (Assessment or DevLab) without RAG processing. It's activated when specific keywords are detected or when the widget is embedded with a support mode flag. The microservice response is returned verbatim to the user.

**Q8: How are errors handled?**
**A:** Errors are handled at multiple levels: validation errors (400) from Joi, authentication errors (401), authorization errors (403) from RBAC, and internal errors (500). All errors are logged with Winston, include structured context (tenant_id, user_id, query), and return user-friendly JSON responses. Security errors are specially logged for audit purposes.

**Q9: How does query classification work?**
**A:** The system classifies queries as EDUCORE (organizational data) or general knowledge using pattern matching. EDUCORE queries trigger vector search and RAG processing, while general queries go directly to OpenAI. The classifier checks for keywords in English and Hebrew related to skills, users, profiles, content, courses, etc.

**Q10: How is the knowledge graph used?**
**A:** The knowledge graph stores nodes (entities) and edges (relationships) in PostgreSQL. It's used for tracking learning progress, skill relationships, and content connections. Knowledge graph data can be embedded and searched via vector search, and queried via dedicated endpoints (`/api/v1/knowledge/progress/user/:userId/skill/:skillId`).

---

### 3. General Fullstack Questions (Using This Project)

**Q1: How do you handle authentication and authorization?**
**A:** In this project, authentication is header-based with optional JWT tokens. The system extracts user identity from headers (`X-User-Id`, `X-User-Role`, `X-Tenant-Id`). Authorization is implemented via RBAC in the application layer - after vector search, results are filtered based on user role and query context. The system supports anonymous users with restricted access.

**Q2: How do you prevent SQL injection?**
**A:** The project uses Prisma ORM which automatically parameterizes queries, preventing SQL injection. For raw queries (vector search), I use parameterized placeholders (`$1`, `$2`, etc.) and never concatenate user input into SQL strings. All embedding values are properly escaped before being used in queries.

**Q3: How do you handle caching?**
**A:** Redis is used for query response caching with a 1-hour TTL. Cache keys include tenant ID, user ID, and query hash. The system checks cache before processing queries. Importantly, the service gracefully degrades if Redis is unavailable - it's an optional dependency, not a hard requirement.

**Q4: How do you handle errors in a microservices architecture?**
**A:** Errors are handled at multiple levels: validation at the API layer, business logic errors in services, and global error handling middleware. All errors are logged with structured context (tenant_id, user_id, query). For inter-service communication (gRPC), errors are caught and logged, with fallback to internal data if external services fail.

**Q5: How do you ensure data consistency in a distributed system?**
**A:** This project uses a single database (PostgreSQL) for the RAG service, so consistency is maintained via ACID transactions. For inter-service communication, the system uses eventual consistency - it attempts to fetch data from other services but falls back to internal data if unavailable. Query results are cached to reduce load on external services.

**Q6: How do you optimize database queries?**
**A:** The project uses several optimization strategies: (1) Composite indexes on frequently queried columns (tenant_id, content_type, user_id), (2) HNSW index for vector similarity search, (3) Query result limits (default 20), (4) Connection pooling via Prisma, (5) Caching frequently accessed data in Redis.

**Q7: How do you handle internationalization (i18n)?**
**A:** The system supports Hebrew and English. Queries in Hebrew are automatically translated to English for better vector matching (since most content is in English). The query classifier recognizes patterns in both languages. User-facing error messages are in English but can be extended to support multiple languages via the centralized message configuration.

**Q8: How do you test a microservice?**
**A:** The project has three test levels: (1) Unit tests for services and utilities, (2) Integration tests for API endpoints and database operations, (3) E2E tests using Playwright. Tests use Docker Compose for test infrastructure (PostgreSQL, Redis, Kafka). The test suite includes fixtures, mocks, and test helpers.

**Q9: How do you deploy a microservice?**
**A:** The project is deployed on Railway for the backend and Vercel for the frontend (optional). Database migrations are run automatically on deployment. Environment variables are managed via Railway dashboard. The service uses Docker for local development and can be containerized for production.

**Q10: How do you monitor and debug a production service?**
**A:** The project uses Winston for structured logging with different log levels (info, warn, error, debug). Logs include context (tenant_id, user_id, processing time). There are diagnostic endpoints (`/api/debug/embeddings-status`, `/api/debug/test-vector-search`) for debugging. Audit logs track all security events. For production, I'd recommend adding APM tools like Datadog or New Relic.

---

### 4. Security & Enterprise-Ready Features

**Key Security and Enterprise Features:**

This RAG microservice demonstrates several enterprise-grade security and architectural concepts:

1. **Access Control & Authorization**: The RBAC implementation shows deep understanding of role-based access control, which is critical in enterprise systems where different roles (admin, HR, employee) need different levels of access to sensitive data. The system enforces fine-grained permissions based on user roles and query context.

2. **Multi-Tenant Data Isolation**: The project implements complete tenant isolation at the database level, ensuring that data from one tenant cannot be accessed by another. This is essential for SaaS applications serving multiple clients where data must be completely isolated and secure.

3. **Audit Logging**: The system includes comprehensive audit logging that tracks all access attempts, especially unauthorized ones. This is essential for compliance (GDPR, SOC 2, etc.) and security monitoring - knowing who accessed what data and when.

4. **Security-First Design**: The RBAC filtering, security logging, and tenant validation demonstrate a security-first mindset. The system proactively blocks unauthorized access and logs all security events, which is crucial for enterprise applications handling sensitive data.

5. **Data Quality & Integrity**: The vector search and RAG system ensures that answers are based on verified, source-cited data from the knowledge base, not fabricated information. This ensures data accuracy and traceability, which is critical for enterprise knowledge management systems.

6. **Privacy Protection**: The user profile access control (employees can only see their own profile, managers need explicit requests) shows understanding of privacy regulations and data protection, which is critical for compliance with GDPR and other privacy regulations.

7. **Graceful Degradation**: The system is designed to work without optional dependencies (Redis, Kafka), ensuring high availability and resilience. This is important for enterprise systems that need to maintain uptime even when supporting services fail.

---

## ====================================
## PHASE 6 – Learning Checklist
## ====================================

Use this checklist to ensure you've covered all key areas:

### Architecture & Design
- [ ] Overall architecture (microservices, REST + gRPC hybrid)
- [ ] High-level data flow (Frontend → Backend → Database → External Services)
- [ ] Multi-tenant isolation strategy
- [ ] Service communication patterns (REST, gRPC)

### Data Models
- [ ] Main database tables (tenants, vector_embeddings, queries, user_profiles, etc.)
- [ ] Vector embedding storage (pgvector, 1536 dimensions)
- [ ] Relationships between tables (one-to-many, many-to-many)
- [ ] Database indexes (HNSW, composite indexes)

### Key API Flows
- [ ] Query processing flow (POST /api/v1/query)
- [ ] Vector search flow (embedding → similarity search → RBAC filtering)
- [ ] Support mode flow (proxy to microservices)
- [ ] Recommendations flow (personalized recommendations)

### Important Backend Logic
- [ ] Query classification (EDUCORE vs general)
- [ ] RBAC implementation (role-based access control)
- [ ] Vector search service (unifiedVectorSearch.service.js)
- [ ] Query processing service (queryProcessing.service.js)
- [ ] Tenant validation and resolution
- [ ] Error handling and logging

### Important Frontend Flows
- [ ] Component hierarchy (FloatingChatWidget → ChatPanel → ChatMessage)
- [ ] State management (Redux Toolkit + RTK Query)
- [ ] API communication (RTK Query mutations/queries)
- [ ] Mode switching (General vs Support modes)
- [ ] Recommendations display

### Security-Related Aspects
- [ ] RBAC implementation and role hierarchy
- [ ] SQL injection prevention (Prisma, parameterized queries)
- [ ] XSS prevention (React, JSON serialization)
- [ ] Tenant isolation (database-level filtering)
- [ ] Security logging (unauthorized access attempts)
- [ ] CORS configuration

### Performance Considerations
- [ ] Caching strategy (Redis, TTL, graceful degradation)
- [ ] Database indexes (HNSW, composite indexes)
- [ ] Vector search optimization (threshold, limits, fallback)
- [ ] Query optimization (result limits, connection pooling)

### Lessons Learned & Talking Points
- [ ] Multi-tenant architecture challenges
- [ ] Vector search performance optimization
- [ ] RBAC complexity and security tradeoffs
- [ ] Graceful degradation patterns (optional Redis)
- [ ] Bilingual support (Hebrew/English)
- [ ] Microservices integration patterns (gRPC, Coordinator)

---

## Additional Notes

**Missing Information (Not Implemented):**
- CSRF protection (not explicitly implemented)
- Rate limiting (planned but not in production code)
- Comprehensive monitoring/APM (logging exists, but no metrics dashboard)
- Cache invalidation strategy (TTL-based only)
- Database read replicas (not implemented)

**Key Files to Review:**
- `BACKEND/src/services/queryProcessing.service.js` - Main query processing logic
- `BACKEND/src/services/unifiedVectorSearch.service.js` - Vector search implementation
- `BACKEND/src/controllers/query.controller.js` - API endpoint handler
- `FRONTEND/src/components/chat/FloatingChatWidget/FloatingChatWidget.jsx` - Main frontend component
- `DATABASE/prisma/schema.prisma` - Database schema
- `BACKEND/src/config/messages.js` - Centralized error messages

**Quick Reference:**
- **Main Endpoint**: `POST /api/v1/query`
- **Database**: PostgreSQL 15+ with pgvector
- **Vector Dimensions**: 1536 (OpenAI text-embedding-ada-002)
- **Default Similarity Threshold**: 0.25
- **Cache TTL**: 1 hour (3600 seconds)
- **Supported Roles**: admin, hr, trainer, manager, employee, anonymous

---

**Good luck with your interview! 🚀**

