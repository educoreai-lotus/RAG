# Stage 07 - Test Environment Setup

**Date:** 2025-01-27  
**Project:** EDUCORE - Contextual Assistant (RAG / Knowledge Graph) Microservice

---

## Overview

This document defines the test environment setup for unit, integration, E2E, and performance testing.

---

## Docker Compose Setup

**File:** `docker-compose.test.yml`

```yaml
version: '3.8'

services:
  # PostgreSQL Test Database
  postgres-test:
    image: pgvector/pgvector:pg15
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: rag_test
    ports:
      - "5433:5432"
    volumes:
      - postgres-test-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Redis Test Cache
  redis-test:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  # Kafka Test (for event streaming tests)
  zookeeper-test:
    image: confluentinc/cp-zookeeper:latest
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  kafka-test:
    image: confluentinc/cp-kafka:latest
    depends_on:
      - zookeeper-test
    ports:
      - "9093:9093"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper-test:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9093
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

volumes:
  postgres-test-data:
```

**Usage:**
```bash
# Start test infrastructure
docker-compose -f docker-compose.test.yml up -d

# Stop test infrastructure
docker-compose -f docker-compose.test.yml down -v
```

---

## Environment Variables

**File:** `.env.test`

```env
# Database
DATABASE_URL=postgresql://test:test@localhost:5433/rag_test

# Redis
REDIS_URL=redis://localhost:6380

# Kafka
KAFKA_BROKER_URL=localhost:9093

# OpenAI (Mocked in tests)
OPENAI_API_KEY=test-key
OPENAI_API_URL=http://localhost:8080/mock-openai

# EDUCORE Services (Mocked)
LEARNER_AI_SERVICE_URL=http://localhost:8080/mock-learner-ai
SKILLS_ENGINE_SERVICE_URL=http://localhost:8080/mock-skills-engine
ASSESSMENT_SERVICE_URL=http://localhost:8080/mock-assessment
DEVLAB_SERVICE_URL=http://localhost:8080/mock-devlab
ANALYTICS_SERVICE_URL=http://localhost:8080/mock-analytics

# Supabase (Mocked)
SUPABASE_URL=http://localhost:8080/mock-supabase
SUPABASE_ANON_KEY=test-anon-key

# Test Configuration
NODE_ENV=test
LOG_LEVEL=error
```

---

## Test Database Setup

### Prisma Test Configuration

**File:** `prisma/test-schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("TEST_DATABASE_URL")
}
```

**Migration Script:**

```bash
# tests/helpers/setup-test-db.sh
#!/bin/bash

# Run migrations
npx prisma migrate deploy --schema=./prisma/test-schema.prisma

# Seed test data
node tests/helpers/seed-test-db.js
```

---

## Mock Services

### Mock Server Setup

**File:** `tests/mocks/server.js`

```javascript
const express = require('express');
const { createServer } = require('http');

const app = express();
app.use(express.json());

// Mock OpenAI API
app.post('/mock-openai/v1/embeddings', (req, res) => {
  res.json({
    data: [{
      embedding: new Array(1536).fill(0).map(() => Math.random()),
      index: 0,
    }],
  });
});

app.post('/mock-openai/v1/chat/completions', (req, res) => {
  res.json({
    choices: [{
      message: {
        content: 'Mocked answer',
      },
    }],
  });
});

// Mock EDUCORE Services
// ... (Learner AI, Skills Engine, Assessment, DevLab, Analytics)

const server = createServer(app);
server.listen(8080, () => {
  console.log('Mock server running on http://localhost:8080');
});

module.exports = server;
```

---

## Test Helpers

### Database Helper

**File:** `tests/helpers/db-helper.js`

```javascript
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL,
    },
  },
});

async function cleanupDatabase() {
  // Delete all test data
  await prisma.query.deleteMany();
  await prisma.vectorEmbedding.deleteMany();
  await prisma.knowledgeGraphNode.deleteMany();
  // ... cleanup all tables
}

async function seedTestData() {
  // Seed test data
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Test Tenant',
      domain: 'test.local',
    },
  });
  // ... seed more data
}

module.exports = {
  prisma,
  cleanupDatabase,
  seedTestData,
};
```

### Cache Helper

**File:** `tests/helpers/cache-helper.js`

```javascript
const Redis = require('ioredis');

const redis = new Redis(process.env.TEST_REDIS_URL);

async function clearCache() {
  await redis.flushall();
}

module.exports = {
  redis,
  clearCache,
};
```

---

## Test Scripts

**File:** `package.json`

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=tests/unit",
    "test:integration": "jest --testPathPattern=tests/integration",
    "test:e2e": "playwright test",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "test:setup": "docker-compose -f docker-compose.test.yml up -d && npm run test:migrate",
    "test:teardown": "docker-compose -f docker-compose.test.yml down -v",
    "test:migrate": "npx prisma migrate deploy --schema=./prisma/test-schema.prisma"
  }
}
```

---

## Jest Configuration

**File:** `jest.config.js`

```javascript
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js', '**/*.test.jsx'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000,
  maxWorkers: '50%',
};
```

---

## Test Setup File

**File:** `tests/setup.js`

```javascript
// Global test setup
beforeAll(async () => {
  // Start mock server
  await startMockServer();
  
  // Wait for test infrastructure
  await waitForDatabase();
  await waitForRedis();
  
  // Seed test data
  await seedTestData();
});

afterAll(async () => {
  // Cleanup
  await cleanupDatabase();
  await clearCache();
  await stopMockServer();
});

beforeEach(async () => {
  // Reset state between tests
});

afterEach(async () => {
  // Cleanup test data
});
```

---

## Frontend Test Setup

**File:** `jest.config.frontend.js`

```javascript
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup-frontend.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
};
```

**File:** `tests/setup-frontend.js`

```javascript
import '@testing-library/jest-dom';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

// MSW server for API mocking
export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Performance Test Setup

**File:** `artillery.config.yml`

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 200
      name: "Sustained load"
  plugins:
    expect: {}
  processor: "./tests/performance/processor.js"

scenarios:
  - name: "RAG Query"
    flow:
      - post:
          url: "/api/v1/query"
          json:
            query: "What is JavaScript?"
            tenant_id: "test-tenant"
          capture:
            - json: "$.answer"
              as: "answer"
          expect:
            - statusCode: 200
            - contentType: json
            - hasProperty: answer
```

---

## CI/CD Test Configuration

**File:** `.github/workflows/test.yml`

```yaml
name: Tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: pgvector/pgvector:pg15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: rag_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/rag_test
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Generate coverage
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## Next Steps

1. ✅ Test environment setup documented
2. ⏭️ Create integration test plan
3. ⏭️ Create E2E test plan
4. ⏭️ Create CI/CD configuration files

---

**Status:** ✅ Test Environment Setup Complete






