# Backend Quick Start Guide

## Prerequisites

1. Node.js 20+ installed
2. OpenAI API key
3. Redis running (optional, for caching)
4. PostgreSQL with pgvector (optional, for vector search - not yet implemented)

## Setup

### 1. Install Dependencies

```bash
cd BACKEND
npm install
```

### 2. Environment Variables

Create a `.env` file in the `BACKEND` directory:

```env
# Server
PORT=8080  # or 3000 (default: 3000)
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# OpenAI
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_API_URL=https://api.openai.com/v1

# Redis (optional - for caching)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true  # Set to 'false' to disable Redis completely

# Database (optional - for future vector search)
DATABASE_URL=postgresql://user:password@localhost:5432/rag_db
```

### 3. Start the Server

```bash
# Development mode (with watch)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000` (or the port specified in `PORT` env var)

## API Endpoints

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "ok",
  "service": "rag-microservice"
}
```

### Query Endpoint (General Chat Mode)

```bash
POST /api/v1/query
Content-Type: application/json
Authorization: Bearer <token> (optional)
```

Request Body:
```json
{
  "query": "What is machine learning?",
  "tenant_id": "default",
  "context": {
    "user_id": "user-123",
    "session_id": "session-456"
  },
  "options": {
    "max_results": 5,
    "min_confidence": 0.7,
    "include_metadata": true
  }
}
```

Response:
```json
{
  "answer": "Machine learning is a subset of artificial intelligence...",
  "confidence": 0.85,
  "sources": [],
  "metadata": {
    "processing_time_ms": 1200,
    "sources_retrieved": 0,
    "cached": false,
    "model_version": "gpt-3.5-turbo"
  }
}
```

### Assessment Support Endpoint (Proxy)

```bash
POST /api/assessment/support
Content-Type: application/json
```

Request Body:
```json
{
  "query": "How do I create a new exam?",
  "timestamp": "2025-01-27T12:00:00Z",
  "session_id": "session-123",
  "support_mode": "Assessment",
  "metadata": {
    "user_id": "user-123",
    "tenant_id": "default"
  }
}
```

Response:
```json
{
  "response": "Assessment Support: I received your question...",
  "timestamp": "2025-01-27T12:00:01Z",
  "session_id": "session-123"
}
```

### DevLab Support Endpoint (Proxy)

```bash
POST /api/devlab/support
Content-Type: application/json
```

Request Body:
```json
{
  "query": "How do I debug a sandbox error?",
  "timestamp": "2025-01-27T12:00:00Z",
  "session_id": "session-123",
  "support_mode": "DevLab",
  "metadata": {
    "user_id": "user-123",
    "tenant_id": "default"
  }
}
```

Response:
```json
{
  "response": "DevLab Support: I received your question...",
  "timestamp": "2025-01-27T12:00:01Z",
  "session_id": "session-123"
}
```

**Note:** These are proxy endpoints. In production, they should forward requests to the actual Assessment/DevLab microservices.

## Current Implementation Status

### ✅ Implemented
- REST API endpoint `/api/v1/query` (General Chat Mode with OpenAI)
- Query Processing Service with OpenAI integration
- Proxy endpoints `/api/assessment/support` and `/api/devlab/support`
- CORS support for frontend
- Request validation
- Error handling
- Caching with Redis (optional)

### ⏳ Not Yet Implemented
- Vector similarity search (pgvector)
- Access Control (RBAC/ABAC)
- Personalized Assistance
- gRPC services
- Knowledge Graph integration

### ℹ️ Optional Features
- **Redis Caching:** Optional - service works without it
  - If Redis is not available, queries go directly to OpenAI
  - Set `REDIS_ENABLED=false` to disable Redis completely
  - See `REDIS_EXPLANATION.md` for details

## Testing

### Manual Test

```bash
curl -X POST http://localhost:3000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Hello, how are you?",
    "tenant_id": "default",
    "context": {
      "user_id": "test-user"
    }
  }'
```

### Frontend Integration

The frontend is configured to connect to `http://localhost:3000` by default. Make sure:
1. Backend is running (check `PORT` env var - default: 3000, but may be 8080 in production)
2. `VITE_API_BASE_URL` in frontend `.env` matches backend port:
   - If backend on 3000: `VITE_API_BASE_URL=http://localhost:3000`
   - If backend on 8080: `VITE_API_BASE_URL=http://localhost:8080`
3. CORS is enabled (already configured)

## Troubleshooting

### "OPENAI_API_KEY not set" warning
- Make sure `.env` file exists with `OPENAI_API_KEY` set
- Restart the server after adding the key

### "Redis connection error"
- Redis is optional for caching
- If Redis is not available, caching will be skipped
- To disable Redis, comment out Redis usage in `queryProcessing.service.js`

### CORS errors from frontend
- Check `FRONTEND_URL` in `.env` matches your frontend URL
- Default is `http://localhost:5173` (Vite default)

### Port already in use
- Change `PORT` in `.env` to a different port
- Update frontend `VITE_API_BASE_URL` to match

## Next Steps

1. Implement vector similarity search with pgvector
2. Add Access Control services
3. Implement personalized assistance
4. Add gRPC services
5. Add Assessment/DevLab support endpoints

