# Database - Prisma Schema and Migrations

Database schema, migrations, and seed data for the RAG microservice.

## Structure

```
DATABASE/
├── prisma/
│   ├── schema.prisma    # Prisma schema definition
│   ├── seed.js          # Seed script for initial data
│   └── migrations/      # Database migrations
└── proto/               # Protocol Buffer definitions for gRPC
    └── rag/
        └── v1/
```

## Schema Overview

The schema includes 11 main models:

1. **Tenant** - Multi-tenant isolation
2. **Query** - User queries and responses
3. **QuerySource** - Source citations for queries
4. **QueryRecommendation** - Personalized recommendations
5. **VectorEmbedding** - Vector embeddings for semantic search (pgvector)
6. **KnowledgeGraphNode** - Knowledge graph nodes
7. **KnowledgeGraphEdge** - Knowledge graph edges
8. **AccessControlRule** - RBAC/ABAC rules
9. **UserProfile** - User profiles for personalization
10. **AuditLog** - Audit trail
11. **CacheEntry** - Cache entries

## Quick Start

```bash
# Generate Prisma client (from BACKEND/ or DATABASE/)
npx prisma generate --schema=prisma/schema.prisma

# Run migrations
npx prisma migrate dev --schema=prisma/schema.prisma

# Seed database
node prisma/seed.js

# Open Prisma Studio
npx prisma studio --schema=prisma/schema.prisma
```

## Prisma Client

The Prisma client is generated and used by the backend. To generate it from the backend:

```bash
cd ../BACKEND
npm run db:generate
```

## Vector Search

The schema uses pgvector for vector similarity search. Make sure to:

1. Enable the pgvector extension in PostgreSQL:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

2. Create the HNSW index manually:
```sql
CREATE INDEX ON vector_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```








