# API Endpoints Documentation

Complete documentation of all API endpoints with their supported HTTP methods.

## Base URL

- **Production**: `https://devlab-backend-production-59bb.up.railway.app`
- **Development**: `http://localhost:8080`

## Endpoint Summary

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/` | GET, OPTIONS | API information |
| `/health` | GET, OPTIONS | Health check |
| `/auth/me` | GET, OPTIONS | Get current user |
| `/api/v1/query` | POST, OPTIONS | Process RAG query |
| `/api/v1/personalized/recommendations/:userId` | GET, OPTIONS | Get recommendations |
| `/api/v1/knowledge/progress/user/:userId/skill/:skillId` | GET, OPTIONS | Get skill progress |
| `/api/assessment/support` | POST, OPTIONS | Assessment support proxy |
| `/api/devlab/support` | POST, OPTIONS | DevLab support proxy |
| `/api/debug/embeddings-status` | GET, OPTIONS | Check embeddings status |
| `/api/debug/test-vector-search` | GET, OPTIONS | Test vector search |
| `/api/debug/add-content` | POST, OPTIONS | Add content to knowledge base |
| `/api/debug/add-js-prerequisites` | POST, OPTIONS | Add JS prerequisites |
| `/embed/bot.js` | GET | Bot embedding script |
| `/embed/bot-bundle.js` | GET | Bot bundle script |
| `/assets/*` | GET | Static assets |

---

## Detailed Endpoint Documentation

### Root Endpoint

**GET /**  
Returns API information and available endpoints.

**Response:**
```json
{
  "service": "RAG Microservice",
  "version": "1.0.0",
  "status": "running",
  "endpoints": { ... }
}
```

**Supported Methods:** GET, OPTIONS

---

### Health Check

**GET /health**  
Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "ok",
  "service": "rag-microservice",
  "timestamp": "2025-01-15T12:00:00.000Z",
  "dependencies": { ... }
}
```

**Supported Methods:** GET, OPTIONS

---

### Authentication

**GET /auth/me**  
Get current authenticated user information.

**Headers:**
- `Authorization: Bearer <token>` (required)
- `X-User-Id: <userId>` (optional)
- `X-Tenant-Id: <tenantId>` (optional)

**Response:**
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "name": "User Name"
}
```

**Supported Methods:** GET, OPTIONS

---

### Query Processing

**POST /api/v1/query**  
Process a RAG query and return AI-generated answer.

**Headers:**
- `Authorization: Bearer <token>` (required)
- `X-User-Id: <userId>` (required)
- `X-Tenant-Id: <tenantId>` (required)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "query": "What is JavaScript?",
  "tenant_id": "dev.educore.local",
  "user_id": "user-123"
}
```

**Response:**
```json
{
  "answer": "JavaScript is a programming language...",
  "sources": [...],
  "recommendations": [...]
}
```

**Supported Methods:** POST, OPTIONS

---

### Recommendations

**GET /api/v1/personalized/recommendations/:userId**  
Get personalized recommendations for a user.

**Headers:**
- `Authorization: Bearer <token>` (required)
- `X-User-Id: <userId>` (required)
- `X-Tenant-Id: <tenantId>` (required)

**Query Parameters:**
- `tenant_id` (optional)
- `mode` (optional)
- `limit` (optional, default: 5)

**Example:**
```
GET /api/v1/personalized/recommendations/user-123?tenant_id=dev.educore.local&limit=10
```

**Supported Methods:** GET, OPTIONS

---

### Knowledge Graph

**GET /api/v1/knowledge/progress/user/:userId/skill/:skillId**  
Get skill progress for a user.

**Headers:**
- `Authorization: Bearer <token>` (required)
- `X-User-Id: <userId>` (required)
- `X-Tenant-Id: <tenantId>` (required)

**Query Parameters:**
- `tenant_id` (optional)

**Example:**
```
GET /api/v1/knowledge/progress/user/user-123/skill/skill-456?tenant_id=dev.educore.local
```

**Supported Methods:** GET, OPTIONS

---

### Microservice Support

#### Assessment Support

**POST /api/assessment/support**  
Proxy endpoint for Assessment microservice support.

**Headers:**
- `Authorization: Bearer <token>` (required)
- `X-User-Id: <userId>` (required)
- `X-Tenant-Id: <tenantId>` (required)
- `X-Source: assessment` (optional, can be in body)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "query": "How do I create an assessment?",
  "timestamp": "2025-01-15T12:00:00.000Z",
  "session_id": "session-123",
  "support_mode": "Assessment"
}
```

**Supported Methods:** POST, OPTIONS

#### DevLab Support

**POST /api/devlab/support**  
Proxy endpoint for DevLab microservice support.

**Headers:**
- `Authorization: Bearer <token>` (required)
- `X-User-Id: <userId>` (required)
- `X-Tenant-Id: <tenantId>` (required)
- `X-Source: devlab` (optional, can be in body)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "query": "How do I execute code?",
  "timestamp": "2025-01-15T12:00:00.000Z",
  "session_id": "session-123",
  "support_mode": "DevLab"
}
```

**Supported Methods:** POST, OPTIONS

---

### Diagnostics

#### Embeddings Status

**GET /api/debug/embeddings-status**  
Check embeddings status in database.

**Headers:**
- `Authorization: Bearer <token>` (optional)
- `X-Tenant-Id: <tenantId>` (optional)

**Query Parameters:**
- `tenant_id` (optional)

**Supported Methods:** GET, OPTIONS

#### Test Vector Search

**GET /api/debug/test-vector-search**  
Test vector search with a sample query.

**Headers:**
- `Authorization: Bearer <token>` (optional)
- `X-Tenant-Id: <tenantId>` (optional)

**Query Parameters:**
- `query` (required)
- `tenant_id` (optional)
- `threshold` (optional, default: 0.3)

**Example:**
```
GET /api/debug/test-vector-search?query=JavaScript&tenant_id=dev.educore.local
```

**Supported Methods:** GET, OPTIONS

---

### Content Management

#### Add Content

**POST /api/debug/add-content**  
Add single content item to knowledge base.

**Headers:**
- `Authorization: Bearer <token>` (required)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "content": "Content text...",
  "tenant_id": "dev.educore.local",
  "metadata": { ... }
}
```

**Supported Methods:** POST, OPTIONS

#### Add JS Prerequisites

**POST /api/debug/add-js-prerequisites**  
Add JavaScript prerequisites content (convenience endpoint).

**Headers:**
- `Authorization: Bearer <token>` (required)
- `Content-Type: application/json`

**Supported Methods:** POST, OPTIONS

---

### Static Assets

**GET /embed/bot.js**  
Bot embedding script for microservices.

**Supported Methods:** GET

**GET /embed/bot-bundle.js**  
Bot bundle script (React components).

**Supported Methods:** GET

**GET /assets/***  
Static assets (JS, CSS, images).

**Supported Methods:** GET

---

## CORS Configuration

All endpoints support CORS preflight requests (OPTIONS method).

**Allowed Origins:**
- `https://rag-git-main-educoreai-lotus.vercel.app`
- `https://*.vercel.app` (all Vercel preview deployments)
- `http://localhost:3000`
- `http://localhost:5173`
- `http://localhost:5174`
- `http://localhost:8080`

**Allowed Methods:**
- GET
- POST
- PUT
- DELETE
- PATCH
- OPTIONS

**Allowed Headers:**
- Content-Type
- Authorization
- X-User-Id
- X-Tenant-Id
- X-Source
- X-Embed-Secret
- X-Requested-With
- Accept
- Origin

---

## Error Responses

### 400 Bad Request
```json
{
  "error": {
    "message": "Validation error",
    "statusCode": 400
  }
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Support mode is disabled"
}
```

### 404 Not Found
```json
{
  "error": {
    "message": "Not Found",
    "statusCode": 404,
    "path": "/api/invalid"
  }
}
```

### 405 Method Not Allowed
```json
{
  "error": "Method Not Allowed",
  "message": "Method GET is not allowed for /api/devlab/support",
  "method": "GET",
  "path": "/api/devlab/support",
  "allowedMethods": ["POST", "OPTIONS"]
}
```

### 500 Internal Server Error
```json
{
  "error": {
    "message": "Internal Server Error",
    "statusCode": 500
  }
}
```

---

## Testing Checklist

See `API_TESTING_CHECKLIST.md` for comprehensive testing instructions.

