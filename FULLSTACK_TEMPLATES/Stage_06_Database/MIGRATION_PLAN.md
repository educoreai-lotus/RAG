# Stage 06 - Migration Plan & Seeds

**Date:** 2025-01-27  
**Project:** EDUCORE - Contextual Assistant (RAG / Knowledge Graph) Microservice  
**Database:** PostgreSQL 15+ with pgvector extension

---

## Migration Strategy

### Initial Setup

**Step 1: Enable pgvector Extension**
```sql
-- Migration: 0001_enable_pgvector
CREATE EXTENSION IF NOT EXISTS vector;
```

**Step 2: Create All Tables**
```sql
-- Migration: 0002_create_tables
-- All tables created via Prisma schema
```

**Step 3: Create Manual Indexes**
```sql
-- Migration: 0003_create_vector_indexes
CREATE INDEX idx_vector_embeddings_embedding_hnsw 
ON vector_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**Step 4: Add Check Constraints**
```sql
-- Migration: 0004_add_check_constraints
ALTER TABLE queries ADD CONSTRAINT chk_confidence_score 
  CHECK (confidence_score >= 0 AND confidence_score <= 1);

ALTER TABLE queries ADD CONSTRAINT chk_processing_time 
  CHECK (processing_time_ms >= 0);

ALTER TABLE vector_embeddings ADD CONSTRAINT chk_chunk_index 
  CHECK (chunk_index >= 0);

ALTER TABLE knowledge_graph_edges ADD CONSTRAINT chk_weight 
  CHECK (weight IS NULL OR (weight >= 0 AND weight <= 1));
```

---

## Migration Files Structure

```
prisma/
├── schema.prisma
├── migrations/
│   ├── 0001_enable_pgvector/
│   │   └── migration.sql
│   ├── 0002_create_tables/
│   │   └── migration.sql
│   ├── 0003_create_vector_indexes/
│   │   └── migration.sql
│   └── 0004_add_check_constraints/
│       └── migration.sql
└── seed.js
```

---

## Seed Data Structure

**File:** `prisma/seed.js`

### 1. Default Tenant

```javascript
const defaultTenant = {
  name: 'Development Tenant',
  domain: 'dev.educore.local',
  settings: {
    queryRetentionDays: 90,
    enableAuditLogs: true,
    enablePersonalization: true,
  },
};
```

### 2. Default Access Control Rules

```javascript
const defaultRBACRules = [
  {
    ruleType: 'RBAC',
    subjectType: 'role',
    subjectId: 'learner',
    resourceType: 'course',
    resourceId: null, // All courses
    permission: 'read',
    isActive: true,
  },
  {
    ruleType: 'RBAC',
    subjectType: 'role',
    subjectId: 'trainer',
    resourceType: 'course',
    resourceId: null,
    permission: 'write',
    isActive: true,
  },
  {
    ruleType: 'RBAC',
    subjectType: 'role',
    subjectId: 'hr',
    resourceType: 'report',
    resourceId: null,
    permission: 'read',
    isActive: true,
  },
  {
    ruleType: 'RBAC',
    subjectType: 'role',
    subjectId: 'admin',
    resourceType: '*',
    resourceId: null,
    permission: 'all',
    isActive: true,
  },
];
```

### 3. Sample ABAC Rules

```javascript
const sampleABACRules = [
  {
    ruleType: 'ABAC',
    subjectType: 'user',
    subjectId: '*',
    resourceType: 'report',
    resourceId: null,
    permission: 'read',
    conditions: {
      department: ['HR', 'Management'],
    },
    isActive: true,
  },
];
```

### 4. Sample User Profiles

```javascript
const sampleUsers = [
  {
    userId: 'learner-001',
    role: 'learner',
    department: 'Engineering',
    region: 'US',
    skillGaps: ['JavaScript', 'React'],
    learningProgress: {
      completedCourses: 5,
      inProgressCourses: 2,
    },
    preferences: {
      preferredLanguage: 'en',
      notificationEnabled: true,
    },
  },
  {
    userId: 'trainer-001',
    role: 'trainer',
    department: 'Education',
    region: 'US',
    skillGaps: [],
    learningProgress: {},
    preferences: {
      preferredLanguage: 'en',
    },
  },
];
```

### 5. Sample Knowledge Graph Nodes

```javascript
const sampleNodes = [
  {
    nodeId: 'course-001',
    nodeType: 'course',
    properties: {
      title: 'Introduction to JavaScript',
      description: 'Learn JavaScript basics',
      duration: 3600,
      difficulty: 'beginner',
    },
  },
  {
    nodeId: 'skill-001',
    nodeType: 'skill',
    properties: {
      name: 'JavaScript',
      category: 'Programming',
      level: 'beginner',
    },
  },
  {
    nodeId: 'user-learner-001',
    nodeType: 'user',
    properties: {
      name: 'John Doe',
      role: 'learner',
      department: 'Engineering',
    },
  },
];
```

### 6. Sample Knowledge Graph Edges

```javascript
const sampleEdges = [
  {
    sourceNodeId: 'user-learner-001',
    targetNodeId: 'course-001',
    edgeType: 'enrolled_in',
    weight: 0.8,
    properties: {
      enrollmentDate: '2025-01-01',
      progress: 0.5,
    },
  },
  {
    sourceNodeId: 'course-001',
    targetNodeId: 'skill-001',
    edgeType: 'teaches',
    weight: 1.0,
    properties: {},
  },
];
```

### 7. Sample Vector Embeddings

**Note:** Vector embeddings require actual embeddings from OpenAI API. Seed script should:
1. Generate embeddings for sample content
2. Store in `vector_embeddings` table

```javascript
// Sample content to embed
const sampleContent = [
  {
    contentId: 'course-001-lesson-001',
    contentType: 'lesson',
    contentText: 'JavaScript is a programming language...',
    chunkIndex: 0,
  },
];
```

---

## Seed Script Execution

```bash
# Run seed script
npx prisma db seed

# Or with custom script
node prisma/seed.js
```

---

## Migration Execution

### Development

```bash
# Create new migration
npx prisma migrate dev --name description

# Apply migrations
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

### Production

```bash
# Apply migrations (production)
npx prisma migrate deploy

# Verify migration status
npx prisma migrate status
```

---

## Rollback Strategy

### Development Rollback

```bash
# Reset to specific migration
npx prisma migrate resolve --rolled-back migration_name

# Reset entire database (development only)
npx prisma migrate reset
```

### Production Rollback

**Note:** Production rollbacks require manual SQL scripts. Prisma does not support automatic rollbacks in production.

**Process:**
1. Create rollback migration script
2. Test rollback in staging
3. Apply rollback in production
4. Verify data integrity

---

## Data Migration Checklist

### Initial Setup
- [ ] Enable pgvector extension
- [ ] Create all tables
- [ ] Create all indexes
- [ ] Add check constraints
- [ ] Run seed data

### Ongoing Maintenance
- [ ] Monitor query performance
- [ ] Optimize indexes based on query patterns
- [ ] Run cleanup jobs (old queries, expired cache)
- [ ] Backup strategy (daily backups)
- [ ] Monitor vector index performance

---

## Performance Optimization

### Index Maintenance

**Regular Tasks:**
- Analyze query patterns
- Add missing indexes
- Remove unused indexes
- Update index statistics

**Commands:**
```sql
-- Analyze tables
ANALYZE queries;
ANALYZE vector_embeddings;

-- Update statistics
VACUUM ANALYZE;
```

### Vector Index Tuning

**HNSW Parameters:**
- `m = 16` - Number of connections per layer
- `ef_construction = 64` - Search width during construction

**Tuning:**
- Increase `m` for better recall (slower build)
- Increase `ef_construction` for better quality (slower build)
- Adjust based on query performance requirements

---

## Backup Strategy

### Daily Backups

**Full Backup:**
```bash
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -F c -f backup_$(date +%Y%m%d).dump
```

### Point-in-Time Recovery

**Enable WAL Archiving:**
```sql
-- postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /path/to/archive/%f'
```

---

## Monitoring & Maintenance

### Key Metrics

- Query performance (p50, p95, p99)
- Vector search latency
- Index usage statistics
- Table sizes and growth
- Cache hit rates

### Maintenance Tasks

**Daily:**
- Cleanup expired cache entries
- Monitor query performance

**Weekly:**
- Analyze table statistics
- Review slow queries

**Monthly:**
- Cleanup old queries (90 days)
- Review and optimize indexes
- Backup verification

---

## Next Steps

1. ✅ Migration strategy defined
2. ✅ Seed data plan created
3. ⏭️ Create Prisma schema file
4. ⏭️ Create migration files
5. ⏭️ Create seed script
6. ⏭️ Test migrations locally
7. ⏭️ Document production deployment process

---

**Status:** ✅ Migration Plan Complete











