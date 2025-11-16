# Backend - RAG Microservice

Backend implementation for the EDUCORE Contextual Assistant microservice.

## Features

- Strict RAG pipeline:
  - Query classification to decide EDUCORE vs. general questions
  - Vector similarity over `vector_embeddings` (pgvector)
  - Context-only OpenAI answers for EDUCORE queries
  - gRPC fallback to EDUCORE microservices when RAG has no hits
  - Dynamic, contextual “no EDUCORE data” messages if both RAG and gRPC have no data
- Caching (optional Redis) for query responses
- Audit logs and persisted query history with sources and recommendations
- Configurable CORS and environment-based configuration

## Logging

- Logging uses Winston (`src/utils/logger.util.js`).
- Control level with `LOG_LEVEL` env var (default: `info`). Common values: `error`, `warn`, `info`, `debug`.
- Key log points in the RAG flow (`src/services/queryProcessing.service.js`):
  - Query classification decision (EDUCORE vs general)
  - RAG vector search summary (count and average confidence)
  - gRPC fallback attempts and results
  - Final “no data” outcome after RAG and gRPC

## Structure

```
BACKEND/
├── src/
│   ├── config/          # Configuration files (database, redis, openai, kafka)
│   ├── controllers/     # Express/gRPC request handlers
│   ├── services/        # Business logic services
│   ├── middleware/      # Express/gRPC middleware (auth, tenant, permissions)
│   ├── utils/           # Utility functions (logger, cache, retry, validation)
│   ├── clients/         # External service clients (OpenAI, EDUCORE services)
│   ├── grpc/            # gRPC server and services
│   └── index.js         # Application entry point
├── tests/               # Test files
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   └── e2e/             # End-to-end tests
└── package.json
```

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Database setup (schema is in ../DATABASE/prisma/)
npm run db:generate
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with watch mode
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data
- `npm test` - Run all tests
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Lint code
- `npm run format` - Format code

## Database

The Prisma schema is located at `../DATABASE/prisma/schema.prisma`.

To generate Prisma client:
```bash
npm run db:generate
```

To run migrations:
```bash
npm run db:migrate
```

To seed database:
```bash
npm run db:seed
```

## Environment Variables (partial)

- `DATABASE_URL` - PostgreSQL/Supabase connection string (required)
- `OPENAI_API_KEY` - OpenAI API key (required for embeddings/completions)
- `OPENAI_API_URL` - Optional base URL
- `REDIS_URL` - Optional Redis URL
- `REDIS_ENABLED` - Set to `false` to disable Redis
- `LOG_LEVEL` - Logging level (`info` by default)
- `GRPC_ENABLED` - Set to `true` to enable gRPC fallback client stubs




