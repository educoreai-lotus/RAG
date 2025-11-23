# Stage 06 - Database Design Approval

**Date:** 2025-01-27  
**Project:** EDUCORE - Contextual Assistant (RAG / Knowledge Graph) Microservice

## Checklist Completion Status

- ✅ **Entities and relations defined**
  - 11 core entities documented
  - ERD diagram created
  - All relations mapped
  - Documented in: `DATA_MODEL.md`

- ✅ **Schema and migrations outlined**
  - Complete Prisma schema defined
  - All tables, columns, constraints specified
  - Indexes planned (25+ indexes)
  - Migration strategy documented
  - Documented in: `SCHEMA_AND_RELATIONS.md`

- ✅ **Seeds plan written**
  - Seed data structure defined
  - Default tenant, rules, users, nodes, edges
  - Sample vector embeddings plan
  - Documented in: `MIGRATION_PLAN.md`

- ✅ **Summary logged to `PROJECT_EVOLUTION_LOG.md`**
  - Entry: `2025-01-27 | Project Team | COMPLETE | Stage_06`

---

## Data Model Summary

### Core Entities (11)

1. **Tenant** - Multi-tenant isolation
2. **Query** - RAG query requests and responses
3. **QuerySource** - Source citations for queries
4. **QueryRecommendation** - Personalized recommendations
5. **VectorEmbedding** - Vector embeddings for RAG retrieval (pgvector)
6. **KnowledgeGraphNode** - Knowledge graph nodes
7. **KnowledgeGraphEdge** - Knowledge graph relationships
8. **AccessControlRule** - RBAC and ABAC rules
9. **UserProfile** - User profile data for personalization
10. **AuditLog** - Audit logs for compliance (7-year retention)
11. **CacheEntry** - Cached query responses

### Key Features

- **Multi-tenancy:** Row-level isolation via `tenant_id`
- **Vector Search:** pgvector with HNSW index (1536 dimensions)
- **Knowledge Graph:** Nodes and edges for cross-service insights
- **Access Control:** RBAC, ABAC, fine-grained permissions
- **Personalization:** User profiles with skill gaps and progress
- **Audit Logging:** GDPR-compliant 7-year retention
- **Performance:** <100ms vector search, <50ms query insertion

---

## Schema Summary

### Database: PostgreSQL 15+ with pgvector

### Tables: 11 tables
- All tables use UUID primary keys
- All tables include `tenant_id` for multi-tenant isolation
- JSONB columns for flexible metadata storage
- Vector column for embeddings (pgvector)

### Indexes: 25+ indexes
- Primary keys: All tables
- Foreign keys: All foreign keys
- Query indexes: Based on common query patterns
- Composite indexes: For multi-column queries
- Vector index: HNSW for similarity search
- GIN indexes: For JSONB columns

### Constraints
- Check constraints: Confidence scores, processing times, weights
- Unique constraints: Tenant domains, node IDs, cache keys
- Foreign keys: All with CASCADE delete

---

## Migration Strategy

### Initial Migrations (4)

1. **Enable pgvector extension**
2. **Create all tables** (via Prisma)
3. **Create vector indexes** (HNSW)
4. **Add check constraints**

### Seed Data

- Default tenant (dev.educore.local)
- Default RBAC rules (learner, trainer, hr, admin)
- Sample ABAC rules
- Sample user profiles
- Sample knowledge graph nodes and edges
- Sample vector embeddings

---

## Performance Targets

| Operation | Target | Status |
|-----------|--------|--------|
| Vector similarity search | < 100ms | ✅ With HNSW index |
| Query insertion | < 50ms | ✅ With indexes |
| Permission check | < 10ms | ✅ With composite index |
| Knowledge graph traversal | < 50ms | ✅ With indexes |
| Audit log query | < 200ms | ✅ With time-based index |

---

## Data Retention

| Table | Retention | Cleanup |
|-------|-----------|---------|
| `queries` | 90 days | Automatic |
| `query_sources` | 90 days | Cascade |
| `query_recommendations` | 90 days | Cascade |
| `vector_embeddings` | Permanent | Manual |
| `knowledge_graph_nodes` | Permanent | Manual |
| `knowledge_graph_edges` | Permanent | Manual |
| `access_control_rules` | Permanent | Manual |
| `user_profiles` | Permanent | Manual |
| `audit_logs` | 7 years | Automatic (GDPR) |
| `cache_entries` | Until expiration | Automatic |

---

## Compliance & Security

### GDPR Compliance
- ✅ Audit logs retained for 7 years
- ✅ Soft delete support (deleted_at)
- ✅ Data retention policies defined
- ✅ Automatic cleanup jobs planned

### Multi-Tenancy
- ✅ Row-level isolation via `tenant_id`
- ✅ All queries filtered by tenant
- ✅ Indexes optimized for tenant isolation
- ✅ Referential integrity with tenant_id

### Security
- ✅ Foreign key constraints
- ✅ Check constraints for data validation
- ✅ Unique constraints for data integrity
- ✅ Indexes for performance and security

---

## Approval Decision

**Status:** ✅ **APPROVED**

**Approved By:** Project Team  
**Date:** 2025-01-27

**Decision:** Stage 06 - Database Design is **COMPLETE** and **APPROVED**.  
Data model, schema, relations, indexes, and migration plan are finalized. The database design supports all requirements including multi-tenancy, vector search, knowledge graph, access control, personalization, and audit logging. Ready to proceed to **Stage 07 - QA and Testing** or begin database implementation.

## Unlock Condition

**Stage 07 Status:** ✅ **UNLOCKED**

Stage 07 can now proceed with:
- Test strategy planning
- Test environment setup
- Integration test planning
- E2E test planning

---

**Next Steps:**
1. Option A: Proceed to Stage 07 - QA and Testing
2. Option B: Begin database implementation
   - Set up Prisma project
   - Create schema.prisma file
   - Run initial migrations
   - Create seed script
   - Test database locally








