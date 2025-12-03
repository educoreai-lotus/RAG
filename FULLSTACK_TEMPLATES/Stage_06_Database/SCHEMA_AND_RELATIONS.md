# Stage 06 - Schema & Relations

**Date:** 2025-01-27  
**Project:** EDUCORE - Contextual Assistant (RAG / Knowledge Graph) Microservice  
**Database:** PostgreSQL 15+ with pgvector extension  
**ORM:** Prisma

---

## Prisma Schema

**File:** `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Enable pgvector extension
// Run: CREATE EXTENSION IF NOT EXISTS vector;

// ============================================
// TENANT MANAGEMENT
// ============================================

model Tenant {
  id        String   @id @default(uuid())
  name      String
  domain    String   @unique
  settings  Json?    @default("{}")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  // Relations
  queries              Query[]
  vectorEmbeddings     VectorEmbedding[]
  knowledgeGraphNodes  KnowledgeGraphNode[]
  knowledgeGraphEdges  KnowledgeGraphEdge[]
  accessControlRules   AccessControlRule[]
  userProfiles         UserProfile[]
  auditLogs            AuditLog[]
  cacheEntries         CacheEntry[]

  @@map("tenants")
}

// ============================================
// QUERY MANAGEMENT
// ============================================

model Query {
  id                String   @id @default(uuid())
  tenantId          String   @map("tenant_id")
  userId            String   @map("user_id")
  sessionId         String?  @map("session_id")
  queryText         String   @db.Text @map("query_text")
  answer            String   @db.Text
  confidenceScore   Decimal  @map("confidence_score") @db.Decimal(3, 2)
  processingTimeMs  Int      @map("processing_time_ms")
  modelVersion      String   @map("model_version")
  isPersonalized    Boolean  @default(false) @map("is_personalized")
  isCached          Boolean  @default(false) @map("is_cached")
  metadata          Json?    @default("{}")
  createdAt         DateTime @default(now()) @map("created_at")

  // Relations
  tenant            Tenant                @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  sources           QuerySource[]
  recommendations   QueryRecommendation[]

  @@index([tenantId, createdAt(sort: Desc)])
  @@index([userId, createdAt(sort: Desc)])
  @@index([tenantId, sessionId])
  @@map("queries")
}

model QuerySource {
  id             String   @id @default(uuid())
  queryId        String   @map("query_id")
  sourceId       String   @map("source_id")
  sourceType     String   @map("source_type")
  title          String
  contentSnippet String   @db.Text @map("content_snippet")
  sourceUrl      String   @map("source_url")
  relevanceScore Decimal  @map("relevance_score") @db.Decimal(3, 2)
  metadata       Json?    @default("{}")
  createdAt      DateTime @default(now()) @map("created_at")

  // Relations
  query          Query    @relation(fields: [queryId], references: [id], onDelete: Cascade)

  @@index([queryId])
  @@index([sourceId])
  @@map("query_sources")
}

model QueryRecommendation {
  id                String   @id @default(uuid())
  queryId           String   @map("query_id")
  recommendationType String  @map("recommendation_type")
  recommendationId  String   @map("recommendation_id")
  title             String
  description       String   @db.Text
  reason            String   @db.Text
  priority          Int      @default(0)
  metadata          Json?    @default("{}")
  createdAt         DateTime @default(now()) @map("created_at")

  // Relations
  query             Query    @relation(fields: [queryId], references: [id], onDelete: Cascade)

  @@index([queryId])
  @@index([recommendationId])
  @@map("query_recommendations")
}

// ============================================
// VECTOR EMBEDDINGS
// ============================================

model VectorEmbedding {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")
  contentId   String   @map("content_id")
  contentType String   @map("content_type")
  embedding   Unsupported("vector(1536)") // pgvector type
  contentText String   @db.Text @map("content_text")
  chunkIndex  Int      @default(0) @map("chunk_index")
  metadata    Json?    @default("{}")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([contentId])
  @@index([tenantId, contentId])
  @@map("vector_embeddings")
}

// Note: Vector index created manually via SQL:
// CREATE INDEX ON vector_embeddings USING hnsw (embedding vector_cosine_ops)
// WITH (m = 16, ef_construction = 64);

// ============================================
// KNOWLEDGE GRAPH
// ============================================

model KnowledgeGraphNode {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  nodeId    String   @unique @map("node_id")
  nodeType  String   @map("node_type")
  properties Json?   @default("{}")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  tenant          Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  sourceEdges     KnowledgeGraphEdge[] @relation("SourceNode")
  targetEdges     KnowledgeGraphEdge[] @relation("TargetNode")

  @@index([tenantId])
  @@index([nodeId])
  @@index([nodeType])
  @@index([properties(ops: JsonbPathOps)], map: "idx_kg_nodes_properties")
  @@map("knowledge_graph_nodes")
}

model KnowledgeGraphEdge {
  id            String   @id @default(uuid())
  tenantId      String   @map("tenant_id")
  sourceNodeId  String   @map("source_node_id")
  targetNodeId  String   @map("target_node_id")
  edgeType      String   @map("edge_type")
  weight        Decimal? @db.Decimal(3, 2)
  properties    Json?    @default("{}")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  // Relations
  tenant        Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  sourceNode    KnowledgeGraphNode @relation("SourceNode", fields: [sourceNodeId], references: [nodeId], onDelete: Cascade)
  targetNode    KnowledgeGraphNode @relation("TargetNode", fields: [targetNodeId], references: [nodeId], onDelete: Cascade)

  @@index([tenantId])
  @@index([sourceNodeId, targetNodeId])
  @@index([edgeType])
  @@map("knowledge_graph_edges")
}

// ============================================
// ACCESS CONTROL
// ============================================

model AccessControlRule {
  id           String   @id @default(uuid())
  tenantId     String   @map("tenant_id")
  ruleType     String   @map("rule_type") // "RBAC", "ABAC", "content_permission"
  subjectType  String   @map("subject_type") // "user", "role", "group"
  subjectId    String   @map("subject_id")
  resourceType String   @map("resource_type")
  resourceId  String?  @map("resource_id")
  permission   String
  conditions   Json?    @default("{}")
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // Relations
  tenant       Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([subjectType, subjectId])
  @@index([resourceType, resourceId])
  @@index([tenantId, subjectType, subjectId, resourceType, resourceId])
  @@map("access_control_rules")
}

// ============================================
// USER PROFILES (PERSONALIZATION)
// ============================================

model UserProfile {
  id             String   @id @default(uuid())
  tenantId       String   @map("tenant_id")
  userId         String   @unique @map("user_id")
  role           String
  department     String?
  region         String?
  skillGaps      Json?    @default("[]") @map("skill_gaps")
  learningProgress Json?  @default("{}") @map("learning_progress")
  preferences    Json?    @default("{}")
  metadata       Json?    @default("{}")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  // Relations
  tenant         Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, userId])
  @@index([tenantId, userId])
  @@index([role])
  @@map("user_profiles")
}

// ============================================
// AUDIT LOGS
// ============================================

model AuditLog {
  id           String   @id @default(uuid())
  tenantId     String   @map("tenant_id")
  userId       String?  @map("user_id")
  action       String
  resourceType String?  @map("resource_type")
  resourceId  String?  @map("resource_id")
  ipAddress    String?  @map("ip_address")
  userAgent    String?  @map("user_agent")
  details      Json?    @default("{}")
  createdAt    DateTime @default(now()) @map("created_at")

  // Relations
  tenant       Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId, createdAt(sort: Desc)])
  @@index([userId, createdAt(sort: Desc)])
  @@index([action])
  @@map("audit_logs")
}

// ============================================
// CACHE ENTRIES
// ============================================

model CacheEntry {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")
  cacheKey    String   @unique @map("cache_key")
  queryHash   String   @map("query_hash")
  responseData Json    @map("response_data")
  expiresAt   DateTime @map("expires_at")
  createdAt   DateTime @default(now()) @map("created_at")

  // Relations
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([cacheKey])
  @@index([expiresAt])
  @@map("cache_entries")
}
```

---

## Database Constraints

### Check Constraints

```sql
-- Queries table
ALTER TABLE queries ADD CONSTRAINT chk_confidence_score 
  CHECK (confidence_score >= 0 AND confidence_score <= 1);

ALTER TABLE queries ADD CONSTRAINT chk_processing_time 
  CHECK (processing_time_ms >= 0);

-- Vector embeddings table
ALTER TABLE vector_embeddings ADD CONSTRAINT chk_chunk_index 
  CHECK (chunk_index >= 0);

-- Knowledge graph edges table
ALTER TABLE knowledge_graph_edges ADD CONSTRAINT chk_weight 
  CHECK (weight IS NULL OR (weight >= 0 AND weight <= 1));
```

### Unique Constraints

```sql
-- Already defined in Prisma schema:
-- tenants.domain
-- knowledge_graph_nodes.node_id
-- cache_entries.cache_key
-- user_profiles.user_id (per tenant)
```

---

## Indexes

### Automatic Indexes (via Prisma)
- All primary keys
- All foreign keys
- All `@unique` fields
- All `@@index` directives

### Manual Indexes (via SQL)

```sql
-- Vector similarity search index (HNSW)
CREATE INDEX idx_vector_embeddings_embedding_hnsw 
ON vector_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- GIN indexes for JSONB (if not auto-created)
CREATE INDEX idx_kg_nodes_properties_gin 
ON knowledge_graph_nodes 
USING gin (properties);

CREATE INDEX idx_user_profiles_skill_gaps_gin 
ON user_profiles 
USING gin (skill_gaps);

CREATE INDEX idx_user_profiles_preferences_gin 
ON user_profiles 
USING gin (preferences);
```

---

## Migration Strategy

### Initial Migration

**File:** `prisma/migrations/0001_init/migration.sql`

**Steps:**
1. Enable pgvector extension
2. Create all tables
3. Create all indexes
4. Add check constraints
5. Create initial seed data

### Migration Naming Convention

```
YYYYMMDDHHMMSS_description
```

Example: `20250127120000_add_vector_indexes`

### Migration Workflow

1. **Development:**
   ```bash
   npx prisma migrate dev --name description
   ```

2. **Production:**
   ```bash
   npx prisma migrate deploy
   ```

3. **Rollback:**
   ```bash
   npx prisma migrate resolve --rolled-back migration_name
   ```

---

## Seed Data Plan

**File:** `prisma/seed.js`

### Seed Data Categories

1. **Default Tenant**
   - Create default tenant for development
   - Domain: `dev.educore.local`

2. **Sample Access Control Rules**
   - Default RBAC rules (learner, trainer, hr, admin)
   - Sample ABAC rules (department-based)

3. **Sample User Profiles**
   - Test users for each role
   - Sample skill gaps and learning progress

4. **Sample Knowledge Graph Nodes**
   - Sample course nodes
   - Sample skill nodes
   - Sample user nodes

5. **Sample Vector Embeddings**
   - Sample content embeddings for testing
   - Sample chunks for RAG retrieval

### Seed Script Structure

```javascript
// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Create default tenant
  const tenant = await prisma.tenant.upsert({
    where: { domain: 'dev.educore.local' },
    update: {},
    create: {
      name: 'Development Tenant',
      domain: 'dev.educore.local',
      settings: {},
    },
  });

  // 2. Create sample access control rules
  // ... (RBAC, ABAC rules)

  // 3. Create sample user profiles
  // ... (test users)

  // 4. Create sample knowledge graph nodes
  // ... (courses, skills, users)

  // 5. Create sample vector embeddings
  // ... (test content)
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Run Seeds:**
```bash
npx prisma db seed
```

---

## Query Patterns

### Common Queries

#### 1. RAG Query Retrieval
```sql
-- Vector similarity search
SELECT 
  content_id,
  content_type,
  content_text,
  metadata,
  1 - (embedding <=> $1::vector) as similarity
FROM vector_embeddings
WHERE tenant_id = $2
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

#### 2. User Query History
```sql
SELECT *
FROM queries
WHERE tenant_id = $1 AND user_id = $2
ORDER BY created_at DESC
LIMIT 50;
```

#### 3. Permission Check
```sql
SELECT *
FROM access_control_rules
WHERE tenant_id = $1
  AND subject_type = $2
  AND subject_id = $3
  AND resource_type = $4
  AND (resource_id = $5 OR resource_id IS NULL)
  AND is_active = true;
```

#### 4. Knowledge Graph Traversal
```sql
-- Get connected nodes
SELECT target_node_id, edge_type, weight
FROM knowledge_graph_edges
WHERE tenant_id = $1
  AND source_node_id = $2
ORDER BY weight DESC;
```

#### 5. Audit Log Query
```sql
SELECT *
FROM audit_logs
WHERE tenant_id = $1
  AND created_at >= $2
  AND created_at <= $3
ORDER BY created_at DESC;
```

---

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Vector similarity search | < 100ms | With HNSW index |
| Query insertion | < 50ms | With indexes |
| Permission check | < 10ms | With composite index |
| Knowledge graph traversal | < 50ms | With indexes |
| Audit log query | < 200ms | With time-based index |

---

## Data Retention Implementation

### Automatic Cleanup Job

**File:** `scripts/cleanup-old-data.js`

```javascript
// Cleanup queries older than 90 days
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - 90);

await prisma.query.deleteMany({
  where: {
    createdAt: {
      lt: cutoffDate,
    },
  },
});

// Cleanup expired cache entries
await prisma.cacheEntry.deleteMany({
  where: {
    expiresAt: {
      lt: new Date(),
    },
  },
});
```

**Schedule:** Run daily via cron job or scheduler

---

## Next Steps

1. ✅ Data Model defined
2. ✅ Schema defined (Prisma)
3. ✅ Relations defined
4. ✅ Indexes planned
5. ✅ Migration strategy outlined
6. ✅ Seed data plan created
7. ⏭️ Create migration files
8. ⏭️ Create seed script
9. ⏭️ Test migrations

---

**Status:** ✅ Schema & Relations Complete











