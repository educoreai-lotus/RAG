# RAG Microservice Architecture

## 🏗️ System Overview

This document describes the current architecture of the RAG (Retrieval-Augmented Generation) microservice after code cleanup and consolidation.

## 📁 Directory Structure

```
RAG_microservice/
├── BACKEND/src/                    # Production backend code
│   ├── services/                   # Business logic services
│   ├── controllers/                # API endpoint handlers
│   ├── routes/                     # Route definitions
│   ├── config/                     # Configuration files
│   └── utils/                      # Utility functions
├── src/                           # Development/test services
│   ├── services/                   # Development services for testing
│   ├── config/                     # Test configurations
│   └── utils/                      # Test utilities
├── FRONTEND/                       # React frontend application
├── DATABASE/                       # Database schema and migrations
└── tests/                         # Test suites
```

## 🔧 Active Services (Single Source of Truth)

**Location:** `BACKEND/src/services/`

### Core Services
- **`queryProcessing.service.js`** - Main query processing, RBAC, and response generation
- **`unifiedVectorSearch.service.js`** - Vector similarity search using pgvector (SINGLE SOURCE OF TRUTH)
- **`tenant.service.js`** - Tenant resolution and management
- **`userProfile.service.js`** - User profile management and RBAC data

### Feature Services  
- **`recommendations.service.js`** - Personalized recommendations generation
- **`knowledgeGraph.service.js`** - Knowledge graph operations and queries
- **`grpcFallback.service.js`** - gRPC fallback handling for microservice communication

## 🎮 Active Controllers

**Location:** `BACKEND/src/controllers/`

- **`query.controller.js`** - Main query endpoint (`/api/v1/query`)
- **`diagnostics.controller.js`** - Debug and testing endpoints (`/api/debug/*`)
- **`recommendations.controller.js`** - Recommendation endpoints (`/api/v1/personalized/*`)
- **`knowledgeGraph.controller.js`** - Knowledge graph endpoints (`/api/v1/knowledge/*`)
- **`microserviceSupport.controller.js`** - Assessment and DevLab support (`/api/assessment/*`, `/api/devlab/*`)

## 🛣️ Active Routes

**Location:** `BACKEND/src/routes/`

### Main API Routes
- **`query.routes.js`** - `POST /api/v1/query` - Main RAG query processing
- **`recommendations.routes.js`** - `GET /api/v1/personalized/recommendations/:userId` - Get personalized recommendations
- **`knowledgeGraph.routes.js`** - `GET /api/v1/knowledge/progress/user/:userId/skill/:skillId` - Knowledge graph queries

### Support Routes
- **`diagnostics.routes.js`** - Debug endpoints for testing and monitoring
  - `GET /api/debug/embeddings-status` - Check embedding system status
  - `GET /api/debug/test-vector-search` - Test vector search functionality
- **`microserviceSupport.routes.js`** - Support for other microservices
  - `POST /api/assessment/support` - Assessment microservice support
  - `POST /api/devlab/support` - DevLab microservice support

## 🔄 Data Flow

```
Frontend Request → API Routes → Controllers → Services → Database
                ←             ←             ←          ← 
```

### Detailed Flow
1. **Frontend** sends API request (React/RTK Query)
2. **Routes** match URL and method to appropriate handler
3. **Controllers** validate request and call business logic
4. **Services** process business logic, apply RBAC, query database
5. **Database** returns data via Prisma ORM
6. **Response** flows back through the same chain

## 🗄️ Database Integration

- **ORM:** Prisma Client
- **Database:** PostgreSQL with pgvector extension
- **Schema Location:** `DATABASE/prisma/schema.prisma`
- **Vector Storage:** `vector_embeddings` table with 1536-dimension embeddings

## 🔐 Security & RBAC

### Role-Based Access Control
- **Implementation:** `queryProcessing.service.js`
- **Roles:** `admin`, `manager`, `hr`, `trainer`, `employee`, `anonymous`
- **User Profile Access:** Controlled by role and query context
- **Message Configuration:** `BACKEND/src/config/messages.js`

### Authentication Flow
1. User role determined from request headers (`x-user-role`) or context
2. RBAC rules applied during vector search filtering
3. Role-specific error messages returned for access violations

## 🧪 Development & Testing

### Test Services (Development Only)
**Location:** `src/services/`
- Used by test suites and development scripts
- **NOT** used in production
- Provides isolated testing environment

### Test Structure
- **Unit Tests:** `tests/unit/` - Individual service/utility testing
- **Integration Tests:** `tests/integration/` - End-to-end workflow testing
- **Fixtures:** `tests/fixtures/` - Mock data for testing

## 📦 Frontend Integration

### API Communication
- **Library:** RTK Query (`FRONTEND/src/store/api/ragApi.js`)
- **Base URL:** Configurable via `VITE_API_BASE_URL`
- **Endpoints Used:**
  - `POST /api/v1/query` - Main query submission
  - `GET /api/v1/personalized/recommendations/:userId` - Get recommendations

### Component Structure
- **Main Component:** `FloatingChatWidget.jsx`
- **State Management:** Redux Toolkit
- **Error Handling:** Role-specific error message display

## 🔄 Recent Changes (November 2025)

### Code Cleanup
- ✅ **Removed:** `BACKEND/src/services/vectorSearch.service.js` (duplicate, 372 lines)
- ✅ **Kept:** `BACKEND/src/services/unifiedVectorSearch.service.js` (single source of truth)
- ✅ **Preserved:** `src/` directory (active in tests and scripts)

### RBAC Enhancement
- ✅ **Added:** Role-specific error messages
- ✅ **Added:** Centralized message configuration
- ✅ **Added:** Comprehensive security logging
- ✅ **Fixed:** Employee vs Anonymous user message distinction

## 🚀 Deployment

### Production Environment
- **Platform:** Railway
- **URL:** `https://ragmicroservice-production.up.railway.app`
- **Database:** Supabase PostgreSQL with pgvector
- **Environment:** Node.js with ES6 modules

### Configuration
- **Environment Variables:** Defined in Railway dashboard
- **Database Connection:** Via `DATABASE_URL`
- **OpenAI Integration:** Via `OPENAI_API_KEY`

## 📊 Performance Considerations

### Vector Search Optimization
- **Similarity Threshold:** Configurable (default: 0.25)
- **Result Limit:** Configurable (default: 20)
- **RBAC Filtering:** Applied after vector search to maintain performance
- **Caching:** Redis integration for frequently accessed data

### Monitoring
- **Logging:** Comprehensive logging via `logger.util.js`
- **Error Tracking:** Structured error responses
- **Performance Metrics:** Query processing time tracking

## 🔮 Future Enhancements

### Planned Improvements
1. **Database-driven messages** - Move from config files to database
2. **Internationalization** - Multi-language support
3. **Advanced caching** - More sophisticated caching strategies
4. **Microservice mesh** - Enhanced gRPC communication

### Scalability Considerations
- **Horizontal scaling** - Multiple service instances
- **Database optimization** - Vector index optimization
- **Load balancing** - Request distribution strategies

---

**Architecture Version:** 2.0  
**Last Updated:** November 20, 2025  
**Status:** ✅ Production Ready
