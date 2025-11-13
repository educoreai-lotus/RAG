# API Setup Guide

## Overview

The chatbot connects to the RAG microservice backend API to get intelligent responses from OpenAI. In General Mode, all user queries are sent to the RAG API endpoint `/api/v1/query`.

## Configuration

### Environment Variables

Create a `.env` file in the `FRONTEND` directory:

```env
VITE_API_BASE_URL=http://localhost:3000
```

**For Production:**
```env
VITE_API_BASE_URL=https://your-rag-service.com
```

### Default Configuration

If `VITE_API_BASE_URL` is not set, the frontend defaults to:
- Development: `http://localhost:3000`
- This assumes the backend is running on port 3000

## API Endpoint

### Query Endpoint

**URL:** `POST /api/v1/query`

**Request Body:**
```json
{
  "query": "user question text",
  "tenant_id": "default",
  "context": {
    "user_id": "user-id-here",
    "session_id": "session-id-here"
  },
  "options": {
    "max_results": 5,
    "min_confidence": 0.7,
    "include_metadata": true
  }
}
```

**Response:**
```json
{
  "answer": "AI-generated response from OpenAI",
  "confidence": 0.95,
  "sources": [
    {
      "id": "source-1",
      "title": "Source Title",
      "content_snippet": "Relevant snippet...",
      "source_type": "course",
      "source_url": "https://...",
      "relevance_score": 0.9
    }
  ],
  "metadata": {
    "processing_time_ms": 1200,
    "sources_retrieved": 3,
    "cached": false,
    "model_version": "gpt-4"
  }
}
```

## Authentication

The chatbot automatically includes the authentication token from `localStorage.getItem('token')` in the request headers:

```
Authorization: Bearer <token>
```

## Error Handling

If the RAG API fails or is unavailable:
1. The chatbot shows an error message
2. Falls back to mock responses (for development/testing)
3. Logs the error to console

## Testing

### Check API Connection

1. Open browser DevTools (F12)
2. Go to Network tab
3. Send a message in the chatbot
4. Look for request to `/api/v1/query`
5. Check response status and body

### Common Issues

**Issue: "Failed to connect to RAG service"**
- Backend is not running
- Wrong `VITE_API_BASE_URL`
- CORS issues (backend needs to allow frontend origin)

**Issue: "401 Unauthorized"**
- Missing or invalid token
- Token expired
- Check `localStorage.getItem('token')`

**Issue: "404 Not Found"**
- Endpoint `/api/v1/query` doesn't exist
- Check backend routes

**Issue: "Network Error"**
- Backend not accessible
- Check backend is running
- Check firewall/network settings

## Development

### Local Development

1. Start backend on `http://localhost:3000`
2. Set `VITE_API_BASE_URL=http://localhost:3000` in `.env`
3. Start frontend: `npm run dev`
4. Chatbot will connect to local backend

### Production

1. Set `VITE_API_BASE_URL` to production backend URL
2. Build frontend: `npm run build`
3. Deploy to hosting (Vercel, etc.)
4. Ensure backend allows CORS from frontend domain

## Backend Requirements

The backend must:
1. Accept POST requests to `/api/v1/query`
2. Accept JSON request body with `query`, `tenant_id`, `context`, `options`
3. Return JSON response with `answer`, `confidence`, `sources`, `metadata`
4. Support CORS for frontend domain
5. Accept `Authorization: Bearer <token>` header

## Next Steps

1. Ensure backend is running and accessible
2. Set `VITE_API_BASE_URL` environment variable
3. Test API connection in browser DevTools
4. Check backend logs for incoming requests
5. Verify OpenAI integration in backend is working

