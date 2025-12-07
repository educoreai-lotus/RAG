# Stage 08 - Project Structure

**Date:** 2025-01-27  
**Project:** EDUCORE - Contextual Assistant (RAG / Knowledge Graph) Microservice

---

## Complete Project Structure

```
rag-microservice/
├── .github/
│   └── workflows/
│       ├── ci-cd.yml
│       ├── test.yml
│       └── deploy.yml
├── src/
│   ├── services/                    # Business logic services
│   │   ├── gateway.service.js
│   │   ├── query-processing.service.js
│   │   ├── access-control.service.js
│   │   ├── vector-retrieval.service.js
│   │   ├── knowledge-graph-manager.service.js
│   │   ├── ai-integration.service.js
│   │   ├── personalized-assistance.service.js
│   │   └── audit.service.js
│   ├── controllers/                 # Request handlers
│   │   ├── query.controller.js
│   │   ├── personalized.controller.js
│   │   ├── assessment.controller.js
│   │   ├── devlab.controller.js
│   │   ├── analytics.controller.js
│   │   ├── content.controller.js
│   │   ├── graph.controller.js
│   │   ├── access-control.controller.js
│   │   ├── gdpr.controller.js
│   │   └── health.controller.js
│   ├── middleware/                  # Express/gRPC middleware
│   │   ├── auth.middleware.js
│   │   ├── tenant.middleware.js
│   │   ├── permission.middleware.js
│   │   ├── error-handler.middleware.js
│   │   └── rate-limit.middleware.js
│   ├── utils/                       # Utility functions
│   │   ├── cache.util.js
│   │   ├── logger.util.js
│   │   ├── retry.util.js
│   │   └── validation.util.js
│   ├── models/                      # Data models (Prisma)
│   │   └── (Prisma generates these)
│   ├── clients/                     # External service clients
│   │   ├── openai.client.js
│   │   ├── educore-skills.client.js
│   │   ├── educore-learner.client.js
│   │   ├── educore-assessment.client.js
│   │   ├── educore-devlab.client.js
│   │   └── educore-content.client.js
│   ├── grpc/                        # gRPC server and services
│   │   ├── server.js
│   │   ├── services/
│   │   │   ├── query.service.js
│   │   │   ├── personalized.service.js
│   │   │   ├── assessment.service.js
│   │   │   ├── devlab.service.js
│   │   │   ├── analytics.service.js
│   │   │   ├── content.service.js
│   │   │   ├── graph.service.js
│   │   │   ├── access-control.service.js
│   │   │   ├── gdpr.service.js
│   │   │   └── health.service.js
│   │   └── proto/                   # Generated from .proto files
│   ├── config/                      # Configuration files
│   │   ├── database.config.js
│   │   ├── redis.config.js
│   │   ├── kafka.config.js
│   │   └── openai.config.js
│   └── index.js                     # Application entry point
├── frontend/                         # Frontend widget (optional separate repo)
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Button/
│   │   │   │   ├── Input/
│   │   │   │   ├── Modal/
│   │   │   │   ├── Toast/
│   │   │   │   └── LoadingSpinner/
│   │   │   └── chat/
│   │   │       ├── FloatingChatWidget/
│   │   │       ├── ChatInterface/
│   │   │       ├── ChatHeader/
│   │   │       ├── MessageList/
│   │   │       ├── MessageBubble/
│   │   │       ├── MessageInput/
│   │   │       ├── TypingIndicator/
│   │   │       └── SourceCitations/
│   │   ├── store/
│   │   │   ├── slices/
│   │   │   │   ├── auth.slice.js
│   │   │   │   ├── chat.slice.js
│   │   │   │   ├── user.slice.js
│   │   │   │   └── ui.slice.js
│   │   │   ├── api/
│   │   │   │   └── ragApi.js
│   │   │   └── store.js
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── supabase.js
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useChat.js
│   │   │   └── useRealtime.js
│   │   ├── utils/
│   │   │   ├── answerFormatter.js
│   │   │   └── constants.js
│   │   ├── theme/
│   │   │   ├── theme.js
│   │   │   ├── lightTheme.js
│   │   │   └── darkTheme.js
│   │   └── App.jsx
│   ├── public/
│   │   └── embedding-snippet.html
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   └── package.json
├── tests/                            # Backend tests
│   ├── unit/
│   │   ├── services/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── clients/
│   ├── integration/
│   │   ├── api/
│   │   ├── database/
│   │   ├── cache/
│   │   ├── message-queue/
│   │   └── external/
│   ├── e2e/
│   ├── fixtures/
│   │   ├── mock-data/
│   │   └── test-helpers/
│   └── setup.js
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.js
├── proto/                            # Protocol Buffer definitions
│   └── rag/
│       └── v1/
│           ├── query.proto
│           ├── personalized.proto
│           ├── assessment.proto
│           ├── devlab.proto
│           ├── analytics.proto
│           ├── content.proto
│           ├── graph.proto
│           ├── access-control.proto
│           ├── gdpr.proto
│           └── health.proto
├── scripts/
│   ├── setup-test-db.sh
│   ├── cleanup-old-data.js
│   ├── deploy-staging.sh
│   ├── deploy-production.sh
│   └── rollback.sh
├── docker/
│   ├── Dockerfile
│   ├── Dockerfile.test
│   └── docker-compose.yml
├── docs/
│   ├── api/
│   ├── deployment/
│   └── development/
├── .env.example
├── .env.test
├── .eslintrc.js
├── .prettierrc
├── .gitignore
├── jest.config.js
├── jest.config.frontend.js
├── playwright.config.js
├── package.json
├── package-lock.json
└── README.md
```

---

## File Naming Conventions

### Backend Files

- **Services:** `*.service.js`
- **Controllers:** `*.controller.js`
- **Middleware:** `*.middleware.js`
- **Utils:** `*.util.js`
- **Clients:** `*.client.js`
- **Config:** `*.config.js`
- **Models:** `*.model.js` (or Prisma-generated)

### Frontend Files

- **Components:** `ComponentName.jsx`
- **Hooks:** `useHookName.js`
- **Utils:** `utilityName.js`
- **Slices:** `sliceName.slice.js`
- **API:** `apiName.js`

### Test Files

- **Unit Tests:** `*.test.js` or `*.test.jsx`
- **Integration Tests:** `*.integration.test.js`
- **E2E Tests:** `*.spec.js` or `*.e2e.test.js`

---

## Directory Responsibilities

### `/src/services/`
Business logic layer - Core service implementations

### `/src/controllers/`
Request handling layer - HTTP/gRPC request handlers

### `/src/middleware/`
Cross-cutting concerns - Auth, validation, error handling

### `/src/utils/`
Reusable utilities - Cache, logger, retry, validation

### `/src/clients/`
External service clients - OpenAI, EDUCORE services

### `/src/grpc/`
gRPC server and service implementations

### `/src/config/`
Configuration management - Database, Redis, Kafka, OpenAI

### `/tests/`
All test files organized by type

### `/prisma/`
Database schema and migrations

### `/proto/`
Protocol Buffer definitions for gRPC

---

## Import Conventions

### Backend Imports

```javascript
// External dependencies first
import express from 'express';
import { PrismaClient } from '@prisma/client';

// Internal modules
import { QueryProcessingService } from '../services/query-processing.service.js';
import { logger } from '../utils/logger.util.js';
```

### Frontend Imports

```javascript
// External dependencies first
import React from 'react';
import { useSelector } from 'react-redux';
import { Box } from '@mui/material';

// Internal modules
import { FloatingChatWidget } from './components/chat/FloatingChatWidget';
import { useChat } from './hooks/useChat';
```

---

## Configuration Files

### Environment Variables

**`.env.example`** - Template for environment variables
**`.env.test`** - Test environment variables
**`.env.development`** - Development environment
**`.env.production`** - Production environment (not committed)

### Linting & Formatting

**`.eslintrc.js`** - ESLint configuration
**`.prettierrc`** - Prettier configuration

### Testing

**`jest.config.js`** - Jest configuration (backend)
**`jest.config.frontend.js`** - Jest configuration (frontend)
**`playwright.config.js`** - Playwright configuration (E2E)

---

## Next Steps

1. ✅ Project structure defined
2. ⏭️ Create development workflow
3. ⏭️ Begin implementation (Phase 1)

---

**Status:** ✅ Project Structure Complete












