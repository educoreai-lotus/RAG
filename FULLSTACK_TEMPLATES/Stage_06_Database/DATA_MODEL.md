# Stage 06 - Data Model

**Date:** 2025-01-27  
**Project:** EDUCORE - Contextual Assistant (RAG / Knowledge Graph) Microservice  
**Database:** PostgreSQL 15+ with pgvector extension

## Overview

This document defines the data model for the RAG microservice, including entities, relations, indexes, constraints, and data retention policies. The model supports:
- Multi-tenant isolation
- Vector embeddings for RAG queries
- Knowledge graph storage
- Access control (RBAC, ABAC)
- Personalization data
- Audit logging
- GDPR compliance

---

## Core Entities

### 1. Tenant
**Purpose:** Multi-tenant isolation  
**Table:** `tenants`

**Fields:**
- `id` (UUID, PK) - Tenant identifier
- `name` (VARCHAR) - Tenant name
- `domain` (VARCHAR, UNIQUE) - Tenant domain
- `settings` (JSONB) - Tenant-specific settings
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- `deleted_at` (TIMESTAMP, nullable) - Soft delete

**Relations:**
- One-to-Many: Queries, KnowledgeGraphNodes, AccessControlRules, AuditLogs

---

### 2. Query
**Purpose:** Store RAG query requests and responses  
**Table:** `queries`

**Fields:**
- `id` (UUID, PK)
- `tenant_id` (UUID, FK → tenants.id)
- `user_id` (VARCHAR) - User identifier from EDUCORE
- `session_id` (VARCHAR, nullable) - Session identifier
- `query_text` (TEXT) - Original query
- `answer` (TEXT) - Generated answer
- `confidence_score` (DECIMAL) - Confidence (0-1)
- `processing_time_ms` (INTEGER) - Processing time
- `model_version` (VARCHAR) - LLM model version used
- `is_personalized` (BOOLEAN) - Whether personalization was applied
- `is_cached` (BOOLEAN) - Whether response was cached
- `metadata` (JSONB) - Additional metadata
- `created_at` (TIMESTAMP)

**Relations:**
- Many-to-One: Tenant
- One-to-Many: QuerySources, QueryRecommendations

**Indexes:**
- `idx_queries_tenant_id_created_at` - For tenant queries by date
- `idx_queries_user_id_created_at` - For user query history
- `idx_queries_tenant_id_session_id` - For session tracking

**Retention:** 90 days (configurable per tenant)

---

### 3. QuerySource
**Purpose:** Source citations for queries  
**Table:** `query_sources`

**Fields:**
- `id` (UUID, PK)
- `query_id` (UUID, FK → queries.id)
- `source_id` (VARCHAR) - Source ID from EDUCORE
- `source_type` (VARCHAR) - "course", "lesson", "assessment", etc.
- `title` (VARCHAR)
- `content_snippet` (TEXT)
- `source_url` (VARCHAR)
- `relevance_score` (DECIMAL) - Relevance (0-1)
- `metadata` (JSONB)
- `created_at` (TIMESTAMP)

**Relations:**
- Many-to-One: Query

**Indexes:**
- `idx_query_sources_query_id` - For query source lookup
- `idx_query_sources_source_id` - For source popularity tracking

---

### 4. QueryRecommendation
**Purpose:** Personalized recommendations from queries  
**Table:** `query_recommendations`

**Fields:**
- `id` (UUID, PK)
- `query_id` (UUID, FK → queries.id)
- `recommendation_type` (VARCHAR) - "course", "exercise", "assessment", "mentor"
- `recommendation_id` (VARCHAR) - ID of recommended item
- `title` (VARCHAR)
- `description` (TEXT)
- `reason` (TEXT) - Why this was recommended
- `priority` (INTEGER) - Recommendation priority
- `metadata` (JSONB)
- `created_at` (TIMESTAMP)

**Relations:**
- Many-to-One: Query

**Indexes:**
- `idx_query_recommendations_query_id` - For query recommendations
- `idx_query_recommendations_recommendation_id` - For recommendation analytics

---

### 5. VectorEmbedding
**Purpose:** Store vector embeddings for RAG retrieval  
**Table:** `vector_embeddings`

**Fields:**
- `id` (UUID, PK)
- `tenant_id` (UUID, FK → tenants.id)
- `content_id` (VARCHAR) - Content ID from EDUCORE
- `content_type` (VARCHAR) - "course", "lesson", "assessment", etc.
- `embedding` (VECTOR(1536)) - OpenAI embedding (1536 dimensions)
- `content_text` (TEXT) - Original text that was embedded
- `chunk_index` (INTEGER) - Chunk index for long content
- `metadata` (JSONB) - Content metadata
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Relations:**
- Many-to-One: Tenant

**Indexes:**
- `idx_vector_embeddings_tenant_id` - For tenant isolation
- `idx_vector_embeddings_content_id` - For content lookup
- `idx_vector_embeddings_embedding` - Vector similarity search (pgvector HNSW)
- `idx_vector_embeddings_tenant_content` - Composite for tenant + content

**Retention:** Permanent (content embeddings)

---

### 6. KnowledgeGraphNode
**Purpose:** Store knowledge graph nodes  
**Table:** `knowledge_graph_nodes`

**Fields:**
- `id` (UUID, PK)
- `tenant_id` (UUID, FK → tenants.id)
- `node_id` (VARCHAR, UNIQUE) - Node identifier
- `node_type` (VARCHAR) - "user", "course", "skill", "assessment", etc.
- `properties` (JSONB) - Node properties
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Relations:**
- Many-to-One: Tenant
- Many-to-Many: KnowledgeGraphEdge (via edges)

**Indexes:**
- `idx_kg_nodes_tenant_id` - For tenant isolation
- `idx_kg_nodes_node_id` - For node lookup
- `idx_kg_nodes_node_type` - For type-based queries
- `idx_kg_nodes_properties` - GIN index for JSONB queries

**Retention:** Permanent (knowledge graph)

---

### 7. KnowledgeGraphEdge
**Purpose:** Store knowledge graph relationships  
**Table:** `knowledge_graph_edges`

**Fields:**
- `id` (UUID, PK)
- `tenant_id` (UUID, FK → tenants.id)
- `source_node_id` (VARCHAR, FK → knowledge_graph_nodes.node_id)
- `target_node_id` (VARCHAR, FK → knowledge_graph_nodes.node_id)
- `edge_type` (VARCHAR) - "enrolled_in", "has_skill", "completed", etc.
- `weight` (DECIMAL) - Edge weight/strength
- `properties` (JSONB) - Edge properties
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Relations:**
- Many-to-One: Tenant
- Many-to-One: KnowledgeGraphNode (source)
- Many-to-One: KnowledgeGraphNode (target)

**Indexes:**
- `idx_kg_edges_tenant_id` - For tenant isolation
- `idx_kg_edges_source_target` - For graph traversal
- `idx_kg_edges_edge_type` - For type-based queries

**Retention:** Permanent (knowledge graph)

---

### 8. AccessControlRule
**Purpose:** Store RBAC and ABAC rules  
**Table:** `access_control_rules`

**Fields:**
- `id` (UUID, PK)
- `tenant_id` (UUID, FK → tenants.id)
- `rule_type` (VARCHAR) - "RBAC", "ABAC", "content_permission"
- `subject_type` (VARCHAR) - "user", "role", "group"
- `subject_id` (VARCHAR) - User ID, role name, or group ID
- `resource_type` (VARCHAR) - "course", "lesson", "assessment", etc.
- `resource_id` (VARCHAR, nullable) - Specific resource ID (null = all)
- `permission` (VARCHAR) - "read", "write", "execute", etc.
- `conditions` (JSONB) - ABAC conditions (department, region, etc.)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Relations:**
- Many-to-One: Tenant

**Indexes:**
- `idx_ac_rules_tenant_id` - For tenant isolation
- `idx_ac_rules_subject` - For subject lookup
- `idx_ac_rules_resource` - For resource lookup
- `idx_ac_rules_tenant_subject_resource` - Composite for efficient permission checks

**Retention:** Permanent (access control rules)

---

### 9. UserProfile
**Purpose:** Store user profile data for personalization  
**Table:** `user_profiles`

**Fields:**
- `id` (UUID, PK)
- `tenant_id` (UUID, FK → tenants.id)
- `user_id` (VARCHAR, UNIQUE) - User ID from EDUCORE
- `role` (VARCHAR) - "learner", "trainer", "hr", "admin"
- `department` (VARCHAR, nullable)
- `region` (VARCHAR, nullable)
- `skill_gaps` (JSONB) - Array of skill gaps
- `learning_progress` (JSONB) - Learning progress data
- `preferences` (JSONB) - User preferences
- `metadata` (JSONB) - Additional metadata
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Relations:**
- Many-to-One: Tenant

**Indexes:**
- `idx_user_profiles_tenant_user` - For tenant + user lookup
- `idx_user_profiles_role` - For role-based queries

**Retention:** Permanent (user profiles)

---

### 10. AuditLog
**Purpose:** Store audit logs for compliance  
**Table:** `audit_logs`

**Fields:**
- `id` (UUID, PK)
- `tenant_id` (UUID, FK → tenants.id)
- `user_id` (VARCHAR, nullable)
- `action` (VARCHAR) - "query", "access_denied", "permission_changed", etc.
- `resource_type` (VARCHAR, nullable)
- `resource_id` (VARCHAR, nullable)
- `ip_address` (VARCHAR, nullable)
- `user_agent` (VARCHAR, nullable)
- `details` (JSONB) - Additional audit details
- `created_at` (TIMESTAMP)

**Relations:**
- Many-to-One: Tenant

**Indexes:**
- `idx_audit_logs_tenant_id_created_at` - For tenant audit queries
- `idx_audit_logs_user_id_created_at` - For user activity tracking
- `idx_audit_logs_action` - For action-based queries

**Retention:** 7 years (GDPR compliance)

---

### 11. CacheEntry
**Purpose:** Store cached query responses (also in Redis, but backup in DB)  
**Table:** `cache_entries`

**Fields:**
- `id` (UUID, PK)
- `tenant_id` (UUID, FK → tenants.id)
- `cache_key` (VARCHAR, UNIQUE) - Cache key hash
- `query_hash` (VARCHAR) - Hash of query text + context
- `response_data` (JSONB) - Cached response
- `expires_at` (TIMESTAMP) - Cache expiration
- `created_at` (TIMESTAMP)

**Relations:**
- Many-to-One: Tenant

**Indexes:**
- `idx_cache_entries_cache_key` - For cache lookup
- `idx_cache_entries_expires_at` - For cache cleanup

**Retention:** Until expiration (auto-cleanup)

---

## Entity Relationships Diagram (ERD)

```
tenants (1) ──< (N) queries
tenants (1) ──< (N) vector_embeddings
tenants (1) ──< (N) knowledge_graph_nodes
tenants (1) ──< (N) knowledge_graph_edges
tenants (1) ──< (N) access_control_rules
tenants (1) ──< (N) user_profiles
tenants (1) ──< (N) audit_logs
tenants (1) ──< (N) cache_entries

queries (1) ──< (N) query_sources
queries (1) ──< (N) query_recommendations

knowledge_graph_nodes (1) ──< (N) knowledge_graph_edges (source)
knowledge_graph_nodes (1) ──< (N) knowledge_graph_edges (target)
```

---

## Multi-Tenancy Strategy

**Approach:** Row-level isolation via `tenant_id` foreign key

**Implementation:**
- All tables include `tenant_id` (except `tenants` itself)
- All queries filtered by `tenant_id` (from mTLS certificate)
- Indexes include `tenant_id` for efficient tenant isolation
- Foreign keys include `tenant_id` for referential integrity

**Isolation:**
- Data isolation: Complete via `tenant_id` filtering
- Performance isolation: Indexes ensure tenant queries don't affect others
- Security: Tenant ID verified from mTLS certificate

---

## Vector Search Strategy

**Extension:** pgvector

**Index Type:** HNSW (Hierarchical Navigable Small World)

**Configuration:**
- Dimension: 1536 (OpenAI embeddings)
- Index parameters: `m=16, ef_construction=64` (tuned for performance)

**Query Pattern:**
```sql
SELECT * FROM vector_embeddings
WHERE tenant_id = $1
ORDER BY embedding <-> $2::vector
LIMIT 10;
```

**Performance:**
- Target: < 100ms for similarity search
- Supports: 10M+ vectors per tenant

---

## Data Retention Policies

| Table | Retention Period | Cleanup Strategy |
|-------|-----------------|------------------|
| `queries` | 90 days | Automatic cleanup job |
| `query_sources` | 90 days | Cascade with queries |
| `query_recommendations` | 90 days | Cascade with queries |
| `vector_embeddings` | Permanent | Manual cleanup only |
| `knowledge_graph_nodes` | Permanent | Manual cleanup only |
| `knowledge_graph_edges` | Permanent | Manual cleanup only |
| `access_control_rules` | Permanent | Manual cleanup only |
| `user_profiles` | Permanent | Manual cleanup only |
| `audit_logs` | 7 years | Automatic cleanup after retention |
| `cache_entries` | Until expiration | Automatic cleanup on expiration |

**Cleanup Implementation:**
- Scheduled job (daily) for automatic cleanup
- Configurable per tenant for `queries` retention
- GDPR compliance for `audit_logs` (7 years minimum)

---

## Constraints

### Primary Keys
- All tables use UUID primary keys
- Generated using `gen_random_uuid()` (PostgreSQL)

### Foreign Keys
- All foreign keys include `ON DELETE CASCADE` where appropriate
- `tenant_id` foreign keys ensure referential integrity

### Unique Constraints
- `tenants.domain` - Unique tenant domain
- `knowledge_graph_nodes.node_id` - Unique node identifier per tenant
- `cache_entries.cache_key` - Unique cache key
- `user_profiles.user_id` - Unique user per tenant

### Check Constraints
- `queries.confidence_score` BETWEEN 0 AND 1
- `queries.processing_time_ms` >= 0
- `vector_embeddings.chunk_index` >= 0
- `knowledge_graph_edges.weight` BETWEEN 0 AND 1

---

## Indexes Summary

### Performance Indexes
- All `tenant_id` columns indexed for multi-tenant isolation
- Composite indexes for common query patterns
- GIN indexes for JSONB columns (metadata, properties)
- Vector index (HNSW) for similarity search

### Index Strategy
- **Primary Indexes:** All primary keys
- **Foreign Key Indexes:** All foreign keys
- **Query Indexes:** Based on common query patterns
- **Composite Indexes:** For multi-column queries

**Total Indexes:** ~25 indexes across all tables

---

## JSONB Usage

**Tables with JSONB:**
- `tenants.settings` - Tenant configuration
- `queries.metadata` - Query metadata
- `query_sources.metadata` - Source metadata
- `query_recommendations.metadata` - Recommendation metadata
- `vector_embeddings.metadata` - Content metadata
- `knowledge_graph_nodes.properties` - Node properties
- `knowledge_graph_edges.properties` - Edge properties
- `access_control_rules.conditions` - ABAC conditions
- `user_profiles.skill_gaps` - Skill gaps array
- `user_profiles.learning_progress` - Progress data
- `user_profiles.preferences` - User preferences
- `user_profiles.metadata` - Additional metadata
- `audit_logs.details` - Audit details
- `cache_entries.response_data` - Cached response

**Indexing:** GIN indexes on JSONB columns for efficient queries

---

## Next Steps

1. Create detailed schema with Prisma schema file
2. Define migration strategy
3. Create seed data plan
4. Document query patterns and performance targets

---

**Status:** ✅ Data Model Complete











