# EDUCORE RAG Microservice - Complete Project Prompt

**Project:** EDUCORE - Contextual Assistant (RAG / Knowledge Graph) Microservice  
**Purpose:** Central contextual intelligence layer for EDUCORE learning ecosystem  
**Status:** Implementation in Progress

---

## Project Overview

This is a production-ready RAG (Retrieval-Augmented Generation) microservice that serves as the central contextual intelligence layer for the EDUCORE learning ecosystem. It integrates with 9 other microservices to provide intelligent, personalized, and permission-aware Q&A capabilities.

**Key Characteristics:**
- Multi-tenant SaaS architecture
- Real-time knowledge graph synchronization
- Advanced access control (RBAC, ABAC, fine-grained)
- Personalized assistance based on user profile
- GDPR compliant with 7-year audit retention
- High performance: ≤3s response time, 200 QPS

---

## Complete Feature List (F-0002 to F-0016)

### F-0002: Unified Knowledge Graph Integration 📋 Planned
**Status:** Planned  
**Dependencies:** None  
**Description:** Integration with all 9 EDUCORE microservices to build unified knowledge graph
- Real-time sync via Kafka events (≤5 min freshness)
- Graph nodes: users, courses, skills, assessments, content
- Graph edges: relationships, dependencies, progress
- Version management and conflict resolution

### F-0003: RAG Retrieval Engine 📋 Planned
**Status:** Planned  
**Dependencies:** F-0002  
**Description:** Core RAG query processing with vector search
- OpenAI embeddings (text-embedding-ada-002, 1536 dimensions)
- PGVector similarity search (HNSW index)
- Context retrieval and ranking
- Source citation generation
- Answer generation with GPT-4/GPT-3.5-turbo

### F-0004: Contextual Support for Assessment 📋 Planned
**Status:** Planned  
**Dependencies:** F-0003  
**Description:** Real-time assessment hints and explanations
- Contextual hints (no direct answers)
- Related concept suggestions
- Learning content recommendations
- Exam integrity tracking via audit logs

### F-0005: Contextual Support for DevLab 📋 Planned
**Status:** Planned  
**Dependencies:** F-0003  
**Description:** Technical support for coding exercises
- Error explanation and debugging help
- Code review and best practices
- Concept explanations
- Related learning resources

### F-0006: Analytics Explanations & Report Links 📋 Planned
**Status:** Planned  
**Dependencies:** F-0003  
**Description:** Contextual explanations for learning analytics
- Metric explanations
- Dashboard insights
- Actionable recommendations
- Links to related reports

### F-0007: HR Reporting Explanations & Navigation 📋 Planned
**Status:** Planned  
**Dependencies:** F-0003  
**Description:** HR report explanations and cross-navigation
- Report section explanations
- Executive summaries
- Key metrics breakdown
- Navigation to related reports
- Strategic recommendations

### F-0008: Content Studio Content Retrieval 📋 Planned
**Status:** Planned  
**Dependencies:** F-0003  
**Description:** Multi-format content retrieval
- Text, video, image, presentation, code, mind map, summary
- Media-linked content
- Content previews and thumbnails
- Relevance scoring

### F-0009: Personalized Assistance Engine ✅ Done
**Status:** Complete  
**Dependencies:** F-0003  
**Description:** Role and profile-based personalized responses
- Adapt responses by: role, profile, skill gaps, learning progress
- Real-time integration: Learner AI, Skills Engine, Assessment, DevLab
- Personalized recommendations: courses, exercises, assessments, mentors
- Skill gap analysis

### F-0010: RBAC (Role-Based Access Control) ✅ Done
**Status:** Complete  
**Dependencies:** F-0003  
**Description:** Role-based permission system
- Roles: learner, trainer, hr, admin
- Role-based permissions
- Permission inheritance
- Role assignment and management

### F-0011: ABAC (Attribute-Based Access Control) ✅ Done
**Status:** Complete  
**Dependencies:** F-0010  
**Description:** Attribute-based permission system
- Attributes: department, region, compliance flags
- Dynamic policy evaluation
- Context-aware access control
- Multi-attribute policies

### F-0012: Fine-Grained Content Permissions ✅ Done
**Status:** Complete  
**Dependencies:** F-0010  
**Description:** Content-level permission system
- Permissions per: course, lesson, assessment, document
- Granular access control
- Content filtering
- Permission-aware content retrieval

### F-0013: Field-Level Masking ✅ Done
**Status:** Complete  
**Dependencies:** F-0010  
**Description:** Role-based data visibility
- Learners see own scores
- Managers see aggregated data
- Field-level masking rules
- Masked value indicators

### F-0014: Permission-Aware Response Filtering ✅ Done
**Status:** Complete  
**Dependencies:** F-0010, F-0011, F-0012  
**Description:** Automatic permission filtering in responses
- Source filtering by permissions
- Response content filtering
- Access control info in responses
- Filtered source indicators

### F-0015: Access Control Audit & Compliance ✅ Done
**Status:** Complete  
**Dependencies:** F-0010, F-0011, F-0012  
**Description:** Complete audit trail for compliance
- All access attempts logged
- Permission checks logged
- 7-year retention (GDPR)
- Immutable audit logs
- Compliance reporting

### F-0016: Frontend Chatbot UI Widget ✅ Done
**Status:** Complete  
**Dependencies:** None  
**Description:** Modern floating chatbot widget
- TailwindCSS with Dark Emerald theme
- Framer Motion animations
- 6 React components (ChatWidgetButton, ChatPanel, ChatHeader, ChatMessage, Recommendations, ChatInput)
- Mock bot logic with contextual responses
- Dynamic recommendation system
- Responsive design
- Ready for backend integration

---

## Technical Specifications

### Technology Stack

**Backend Runtime:**
- Node.js 20 LTS
- JavaScript (ES2022+)
- Express.js (REST endpoints)
- @grpc/grpc-js (gRPC services)

**Database:**
- PostgreSQL 15+ with pgvector extension
- Prisma ORM
- HNSW index for vector search (1536 dimensions)
- Multi-tenant isolation via tenant_id

**Caching:**
- Redis 7+ (sub-millisecond latency)
- Cache invalidation strategies
- TTL-based expiration

**Message Queue:**
- Apache Kafka (event streaming)
- Real-time sync (≤5 min freshness)
- Durable event log

**AI/ML:**
- OpenAI GPT-4/GPT-3.5-turbo (LLM)
- OpenAI text-embedding-ada-002 (embeddings, 1536 dims)
- Rate limiting and retry logic

**Authentication:**
- OAuth2/JWT for REST (jsonwebtoken, express-jwt)
- mTLS for gRPC (built-in @grpc/grpc-js)

**Frontend:**
- React 18
- Redux Toolkit + RTK Query
- TailwindCSS (Dark Emerald theme)
- Framer Motion (animations)
- Material-UI (MUI) components
- Vite (build tool)

**Testing:**
- Jest (unit/integration)
- Playwright (E2E)
- Coverage target: ≥80% overall, ≥85% critical

**CI/CD:**
- GitHub Actions
- Railway (backend deployment)
- Vercel (frontend deployment)

---

## Performance Requirements

**Response Time:**
- ≤3 seconds for 90% of queries
- ≤1 second for cached queries
- <100ms for vector similarity search

**Throughput:**
- 200 QPS (queries per second)
- Burst capacity: 300 QPS

**Scale:**
- 100,000 active users
- 10M+ vector embeddings
- Multi-tenant (unlimited tenants)

**Data Freshness:**
- 95% of updates within ≤5 minutes
- Real-time via Kafka event streaming

---

## Security & Compliance

**GDPR Compliance:**
- Right to deletion (DeleteUserData endpoint)
- Data portability (ExportUserData endpoint)
- Consent management
- 7-year audit log retention

**Multi-Tenancy:**
- Complete tenant isolation (tenant_id in all queries)
- Row-level security
- Tenant ID from mTLS certificate

**Authentication:**
- OAuth2/JWT for UI
- mTLS for gRPC inter-service communication
- Token validation and refresh

**Access Control:**
- RBAC: Role-based (learner, trainer, hr, admin)
- ABAC: Attribute-based (department, region, compliance)
- Fine-grained: Content-level permissions
- Field-level masking: Role-based data visibility
- Permission-aware: All responses respect permissions

**Audit Trail:**
- All queries logged
- All access attempts logged
- Permission checks logged
- Immutable logs (7-year retention)

---

## API Endpoints (10 gRPC Services)

### 1. RAG Query Service (`rag.v1.QueryService`)
- `Query(QueryRequest) returns (QueryResponse)` - Core RAG query
- `BatchQuery(BatchQueryRequest) returns (BatchQueryResponse)` - High-throughput batch queries

**Features:**
- Automatic access control (RBAC, ABAC, fine-grained)
- Field-level masking
- Source citations
- Confidence scoring
- Caching support

### 2. Assessment Support Service (`rag.v1.AssessmentSupportService`)
- `GetAssessmentHint(AssessmentHintRequest) returns (AssessmentHintResponse)`

**Features:**
- Contextual hints (no direct answers)
- Related concepts
- Learning content recommendations
- Exam integrity tracking

### 3. DevLab Support Service (`rag.v1.DevLabSupportService`)
- `GetTechnicalSupport(TechnicalSupportRequest) returns (TechnicalSupportResponse)`

**Features:**
- Error explanation
- Code review
- Best practices
- Related learning resources

### 4. Analytics Explanation Service (`rag.v1.AnalyticsExplanationService`)
- `ExplainAnalytics(AnalyticsExplanationRequest) returns (AnalyticsExplanationResponse)`
- `ExplainHRReport(HRReportExplanationRequest) returns (HRReportExplanationResponse)`

**Features:**
- Metric explanations
- Dashboard insights
- Report navigation
- Strategic recommendations

### 5. Content Retrieval Service (`rag.v1.ContentRetrievalService`)
- `RetrieveContent(ContentRetrievalRequest) returns (ContentRetrievalResponse)`

**Features:**
- Multi-format content (text, video, image, presentation, code, mind map, summary)
- Media links and thumbnails
- Relevance scoring

### 6. Knowledge Graph Service (`rag.v1.KnowledgeGraphService`)
- `GetGraphContext(GraphContextRequest) returns (GraphContextResponse)`

**Features:**
- Graph node retrieval
- Relationship traversal
- Graph versioning

### 7. GDPR Compliance Service (`rag.v1.GDPRService`)
- `DeleteUserData(DeleteUserDataRequest) returns (DeleteUserDataResponse)`
- `ExportUserData(ExportUserDataRequest) returns (ExportUserDataResponse)`

**Features:**
- Right to deletion
- Data portability
- Audit trail preservation

### 8. Personalized Assistance Service (`rag.v1.PersonalizedAssistanceService`)
- `GetPersonalizedQuery(PersonalizedQueryRequest) returns (PersonalizedQueryResponse)`
- `GetPersonalizedRecommendations(RecommendationsRequest) returns (RecommendationsResponse)`

**Features:**
- Role-based personalization
- Skill gap analysis
- Learning progress integration
- Personalized recommendations (courses, exercises, assessments, mentors)

### 9. Access Control Service (`rag.v1.AccessControlService`)
- `CheckPermissions(PermissionCheckRequest) returns (PermissionCheckResponse)`
- `GetAccessibleContent(AccessibleContentRequest) returns (AccessibleContentResponse)`
- `ApplyFieldMasking(FieldMaskingRequest) returns (FieldMaskingResponse)`
- `GetAccessAuditLog(AuditLogRequest) returns (AuditLogResponse)`

**Features:**
- RBAC evaluation
- ABAC evaluation
- Fine-grained content permissions
- Field-level masking
- Access audit logging

### 10. Health & Monitoring Service (`rag.v1.HealthService`)
- `HealthCheck(HealthCheckRequest) returns (HealthCheckResponse)`
- `GetMetrics(MetricsRequest) returns (MetricsResponse)`

**Features:**
- System health status
- Service health (database, cache, Kafka, AI service)
- System metrics (QPS, response time, uptime, memory, CPU)

---

## Data Model (11 Entities)

### Core Entities
1. **Tenant** - Multi-tenant isolation
2. **Query** - RAG query requests and responses (90-day retention)
3. **QuerySource** - Source citations for queries
4. **QueryRecommendation** - Personalized recommendations
5. **VectorEmbedding** - Vector embeddings (1536 dimensions, permanent)
6. **KnowledgeGraphNode** - Knowledge graph nodes (permanent)
7. **KnowledgeGraphEdge** - Knowledge graph relationships (permanent)
8. **AccessControlRule** - RBAC/ABAC rules (permanent)
9. **UserProfile** - User profile data for personalization (permanent)
10. **AuditLog** - Audit trail (7-year retention, GDPR)
11. **CacheEntry** - Cached responses (TTL-based)

**Key Characteristics:**
- All tables include `tenant_id` for multi-tenant isolation
- UUID primary keys
- JSONB for flexible metadata
- GIN indexes for JSONB queries
- HNSW vector index for similarity search
- Foreign keys with ON DELETE CASCADE

---

## System Flows

### 1. Core Query Processing Flow
```
Client → Gateway → Auth → Access Control → Query Processing
  → Cache Check → Embedding Generation → Vector Search
  → Permission Filtering → Graph Enrichment → LLM Generation
  → Field Masking → Cache Update → Response
```

**Key Steps:**
1. Authentication (mTLS/OAuth2)
2. Permission check (RBAC + ABAC + fine-grained)
3. Cache check (Redis)
4. Embedding generation (OpenAI)
5. Vector similarity search (PGVector)
6. Permission filtering (remove restricted sources)
7. Knowledge graph enrichment
8. LLM answer generation (OpenAI GPT-4)
9. Field-level masking
10. Cache update
11. Audit logging

### 2. Personalized Query Flow
```
User → Personalized Service → Skills Engine (gRPC)
  → Learner AI (gRPC) → Assessment (gRPC) → DevLab (gRPC)
  → Build User Context → Query Processing → Generate Recommendations
  → Skill Gap Analysis → Personalized Response
```

**Key Steps:**
1. Retrieve user context (role, profile, skill gaps, progress)
2. Build personalized context
3. Process query with context
4. Generate personalized recommendations
5. Analyze skill gaps
6. Return personalized response

### 3. Access Control Flow
```
Request → Extract User Context → Load RBAC Policies
  → Load ABAC Policies → Load Content Permissions
  → Evaluate Policies (RBAC ∩ ABAC ∩ Content)
  → Decision (Granted/Denied) → Apply Field Masking
  → Log Access → Return Result
```

**Key Steps:**
1. Extract user context (role, attributes, tenant)
2. Load RBAC policies
3. Load ABAC policies
4. Load fine-grained content permissions
5. Evaluate all policies (intersection)
6. Apply field-level masking if granted
7. Log access attempt
8. Return result

### 4. Knowledge Graph Sync Flow (Kafka Event-Driven)
```
Microservice → Kafka Event → Graph Manager → Update Graph
  → Trigger Re-indexing → Fetch Updated Content → Generate Embeddings
  → Update Vector DB → Invalidate Cache → Update Graph Version
```

**Key Steps:**
1. Consume Kafka event (content_update, course_update, etc.)
2. Update knowledge graph
3. Trigger re-indexing
4. Fetch updated content from microservice
5. Generate new embeddings
6. Update vector database
7. Invalidate related cache
8. Update graph version
9. Verify sync (<5 minutes)

---

## Frontend Architecture

### Floating Chat Widget
**Components:**
1. **ChatWidgetButton** - Floating bubble button (bottom-right)
2. **ChatPanel** - Main chat container with slide-up animation
3. **ChatHeader** - Header with greeting, avatar, status
4. **ChatMessage** - Bot/user messages with avatars
5. **Recommendations** - Dynamic recommendation system (quick actions + cards)
6. **ChatInput** - Input field with search icon and send button

**Features:**
- Dark Emerald theme (TailwindCSS)
- Smooth animations (Framer Motion)
- Responsive design (mobile + desktop)
- Mock bot logic (ready for backend integration)
- Dynamic recommendations
- Loading states
- Error handling

**Tech Stack:**
- React 18
- Redux Toolkit (state management)
- TailwindCSS (styling)
- Framer Motion (animations)
- React Icons (icons)

---

## Implementation Status

### Completed ✅
- Frontend Chatbot UI Widget (F-0016)
- Backend Services: Access Control (F-0010, F-0011, F-0012, F-0013, F-0014, F-0015), Query Processing, AI Integration, Personalized Assistance (F-0009)
- Database Schema Design
- API Specifications
- System Architecture

### In Progress 🔄
- Backend Services Implementation (Vector Retrieval, Knowledge Graph Manager)
- API Layer (gRPC services)
- Integration with EDUCORE microservices

### Planned 📋
- Features: F-0002 (Knowledge Graph), F-0003 (RAG Engine), F-0004 (Assessment Support), F-0005 (DevLab Support), F-0006 (Analytics), F-0007 (HR Reports), F-0008 (Content Retrieval)
- Deployment and CI/CD

---

## Key Implementation Details

### Backend Services Structure
```
src/
├── services/
│   ├── query-processing.service.js
│   ├── vector-retrieval.service.js
│   ├── access-control.service.js
│   ├── ai-integration.service.js
│   ├── personalized-assistance.service.js
│   ├── knowledge-graph-manager.service.js
│   └── audit.service.js
├── controllers/
│   ├── query.controller.js
│   ├── assessment.controller.js
│   ├── devlab.controller.js
│   ├── analytics.controller.js
│   ├── content.controller.js
│   ├── graph.controller.js
│   ├── gdpr.controller.js
│   ├── personalized.controller.js
│   ├── access-control.controller.js
│   └── health.controller.js
├── grpc/
│   └── services/ (gRPC service implementations)
├── middleware/
│   ├── auth.middleware.js
│   └── error-handler.middleware.js
├── clients/
│   ├── openai.client.js
│   ├── redis.client.js
│   └── kafka.client.js
└── utils/
    ├── logger.util.js
    ├── cache.util.js
    ├── retry.util.js
    └── validation.util.js
```

### Database Schema Highlights
- **Multi-tenant:** All tables include `tenant_id`
- **Vector Search:** `vector_embeddings` table with pgvector HNSW index
- **Knowledge Graph:** `knowledge_graph_nodes` and `knowledge_graph_edges` tables
- **Access Control:** `access_control_rules` table with RBAC/ABAC/content policies
- **Audit:** `audit_logs` table with 7-year retention
- **Personalization:** `user_profiles` table with skill gaps and learning progress

### Testing Strategy
- **Unit Tests:** 60% of test pyramid (~500 test cases)
- **Integration Tests:** 30% (~250 test cases)
- **E2E Tests:** 10% (~80 test cases)
- **Coverage Target:** ≥80% overall, ≥85% for critical paths
- **Test Environment:** Docker Compose (PostgreSQL, Redis, Kafka)

---

## Success Metrics (KPIs)

- **Answer Accuracy:** ≥85%
- **Response Time:** ≤3 seconds (90th percentile)
- **Data Freshness:** ≤5 minutes from source update
- **Adoption Rate:** ≥70% active chatbot users
- **Integration Reliability:** ≥99.5% gRPC call success rate
- **User Satisfaction:** ≥4.5/5 feedback rating

---

## Constraints & Risks

**Constraints:**
- Budget: Within existing Railway + Vercel resources
- Timeline: MVP in 8 weeks
- Tech Stack: Node.js + JavaScript + PostgreSQL + gRPC (fixed)
- Infrastructure: Multi-tenant with auto-scaling on Railway

**Risks:**
1. High complexity in Knowledge Graph management
2. OpenAI API rate limits
3. Authentication challenges in multi-tenant environment
4. Dependency on gRPC contract changes in other microservices

**Mitigation:**
- OpenAI wrapper with exponential backoff and queue management
- PostgreSQL connection pooling and Redis caching
- Managed Kafka service (Railway/Confluent)
- Database-level tenant isolation with row-level security

---

## Next Steps for Implementation

1. **Complete Backend Services:**
   - Vector Retrieval Service (F-0003)
   - Knowledge Graph Manager (F-0002)
   - Context-specific services (F-0004, F-0005, F-0006, F-0007, F-0008)

2. **API Layer:**
   - Complete all 10 gRPC services
   - Implement controllers and middleware
   - Add error handling and retry logic

3. **Integration:**
   - Connect frontend to backend APIs
   - Real-time data integration (Learner AI, Skills Engine, etc.)
   - Kafka event consumers

4. **Testing:**
   - Complete unit tests (≥80% coverage)
   - Integration tests
   - E2E tests
   - Performance testing

5. **Deployment:**
   - CI/CD pipeline (GitHub Actions)
   - Railway deployment (backend)
   - Vercel deployment (frontend)
   - Monitoring and logging setup

---

## Usage Instructions

This prompt contains all the specifications, features, and implementation details for the EDUCORE RAG Microservice. Use it to:

1. **Understand the complete project** - All features, requirements, and architecture
2. **Continue implementation** - Know what's done and what's remaining
3. **Add new features** - Understand existing architecture and patterns
4. **Onboard new developers** - Complete project context
5. **Reference during development** - All technical specifications in one place

**Key Files to Reference:**
- `DATABASE/prisma/schema.prisma` - Database schema
- `DATABASE/proto/rag/v1/*.proto` - gRPC API definitions
- `FRONTEND/src/components/chatbot/` - Frontend components
- `BACKEND/src/services/` - Backend service implementations
- `BACKEND/src/controllers/` - API controllers

---

**Last Updated:** 2025-01-27

