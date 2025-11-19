# Microservice Integration with Coordinator - Developer Guide

**Purpose:** This guide provides step-by-step instructions for integrating any EDUCORE microservice with the Coordinator for real-time data routing.

**Target Audience:** Microservice developers who need to expose their service data to RAG via the Coordinator.

---

## Overview

The Coordinator acts as a central routing layer between RAG and all EDUCORE microservices. When RAG needs real-time data that isn't available in its internal database, it calls the Coordinator, which then routes requests to the appropriate microservices using a Universal Envelope format.

**Architecture Flow:**
```
RAG → Coordinator (gRPC) → Your Microservice (HTTP Envelope) → Coordinator → RAG
```

---

## Step 1: Expose Universal Endpoint

Your microservice **MUST** expose the following endpoint:

### Endpoint Specification

**URL:** `/api/fill-content-metrics`

**Method:** `POST`

**Content-Type:** `application/json`

**Authentication:** Use your existing authentication mechanism (JWT, API key, etc.)

### Request Format

The Coordinator will send requests to your microservice in the following envelope format:

```json
{
  "requester_service": "coordinator",
  "payload": {
    "tenant_id": "string",
    "user_id": "string",
    "query_text": "string",
    "required_fields": ["field1", "field2"],
    "metadata": {
      "category": "string",
      "source": "rag",
      "timestamp": "ISO8601"
    }
  },
  "response": null
}
```

### Response Format

Your microservice **MUST** respond in the following envelope format:

```json
{
  "requester_service": "coordinator",
  "payload": {
    "tenant_id": "string",
    "user_id": "string",
    "query_text": "string"
  },
  "response": {
    "success": true,
    "data": {
      "field1": "value1",
      "field2": "value2",
      "content": [
        {
          "id": "content-id",
          "type": "content_type",
          "title": "Content Title",
          "text": "Content text...",
          "url": "https://...",
          "metadata": {}
        }
      ],
      "metadata": {
        "source": "your-service-name",
        "timestamp": "ISO8601"
      }
    },
    "errors": []
  }
}
```

### Error Response Format

If your service encounters an error, respond with:

```json
{
  "requester_service": "coordinator",
  "payload": {
    "tenant_id": "string",
    "user_id": "string",
    "query_text": "string"
  },
  "response": {
    "success": false,
    "data": null,
    "errors": [
      {
        "code": "ERROR_CODE",
        "message": "Human-readable error message",
        "details": {}
      }
    ]
  }
}
```

---

## Step 2: Create Migration File

Each microservice must create a migration file that registers the service with the Coordinator.

### Migration File Format

Create a file: `migrations/register_with_coordinator.sql`

```sql
-- Register [Your Service Name] with Coordinator
INSERT INTO coordinator.microservices (
  service_name,
  service_url,
  endpoint_path,
  enabled,
  metadata
) VALUES (
  'your-service-name',
  'https://your-service.educore.local',
  '/api/fill-content-metrics',
  true,
  '{
    "description": "Your service description",
    "version": "1.0.0",
    "supported_fields": ["field1", "field2"],
    "categories": ["category1", "category2"]
  }'::jsonb
) ON CONFLICT (service_name) DO UPDATE SET
  service_url = EXCLUDED.service_url,
  endpoint_path = EXCLUDED.endpoint_path,
  enabled = EXCLUDED.enabled,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();
```

**Important:** Replace placeholders:
- `your-service-name`: Your actual service name (e.g., `assessment`, `devlab`, `content`)
- `https://your-service.educore.local`: Your actual service URL
- Update `supported_fields` and `categories` arrays with your service's capabilities

---

## Step 3: Register with Coordinator

### Registration Endpoint

**URL:** `POST /register` (Coordinator endpoint)

**Request:**
```json
{
  "service_name": "your-service-name",
  "service_url": "https://your-service.educore.local",
  "endpoint_path": "/api/fill-content-metrics",
  "metadata": {
    "description": "Your service description",
    "version": "1.0.0",
    "supported_fields": ["field1", "field2"],
    "categories": ["category1", "category2"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "service_id": "uuid",
  "message": "Service registered successfully"
}
```

### Registration Instructions

1. **During Development:**
   - Register manually via Coordinator's `/register` endpoint
   - Or use the migration file (Step 2) if Coordinator supports SQL migrations

2. **During Deployment:**
   - Include registration in your deployment script
   - Ensure registration happens before Coordinator starts routing requests

3. **Health Check:**
   - Coordinator will periodically check your service health
   - Ensure your service responds to health checks at `/health` or `/api/health`

---

## Step 4: Validation Rules

Your microservice **MUST** implement the following validation:

### Required Validations

1. **Tenant ID Validation:**
   - Must be non-empty string
   - Must match your service's tenant format
   - Return error if tenant doesn't exist

2. **User ID Validation:**
   - Must be non-empty string (or "anonymous" if allowed)
   - Must have access to requested tenant
   - Return error if user doesn't exist or lacks access

3. **Query Text Validation:**
   - Must be non-empty string
   - Maximum length: 2000 characters
   - Return error if invalid

4. **Envelope Format Validation:**
   - Must contain `requester_service`, `payload`, `response`
   - `requester_service` must be "coordinator"
   - Return error if envelope format is invalid

### Example Validation Code (Node.js/Express)

```javascript
function validateEnvelopeRequest(req, res, next) {
  const { requester_service, payload, response } = req.body;

  // Check envelope structure
  if (!requester_service || !payload || response !== null) {
    return res.status(400).json({
      requester_service: "coordinator",
      payload: payload || {},
      response: {
        success: false,
        data: null,
        errors: [{
          code: "INVALID_ENVELOPE",
          message: "Invalid envelope format. Expected: {requester_service, payload, response: null}",
        }]
      }
    });
  }

  // Check requester
  if (requester_service !== "coordinator") {
    return res.status(403).json({
      requester_service: "coordinator",
      payload: payload || {},
      response: {
        success: false,
        data: null,
        errors: [{
          code: "UNAUTHORIZED_REQUESTER",
          message: "Only Coordinator can call this endpoint",
        }]
      }
    });
  }

  // Validate payload
  const { tenant_id, user_id, query_text } = payload || {};
  if (!tenant_id || !user_id || !query_text) {
    return res.status(400).json({
      requester_service: "coordinator",
      payload: payload || {},
      response: {
        success: false,
        data: null,
        errors: [{
          code: "MISSING_REQUIRED_FIELDS",
          message: "Missing required fields: tenant_id, user_id, query_text",
        }]
      }
    });
  }

  // Validate query text length
  if (query_text.length > 2000) {
    return res.status(400).json({
      requester_service: "coordinator",
      payload: payload || {},
      response: {
        success: false,
        data: null,
        errors: [{
          code: "QUERY_TOO_LONG",
          message: "Query text exceeds maximum length of 2000 characters",
        }]
      }
    });
  }

  next();
}
```

---

## Step 5: Fallback Rules

Your microservice **MUST** implement fallback logic when errors occur.

### Fallback Requirements

1. **On Error:**
   - If your service encounters an error, return error response (see Error Response Format above)
   - Coordinator will handle fallback to mock data if needed

2. **Mock Data Fallback:**
   - Coordinator will read `/mockData/index.json` from your service if:
     - Your service returns an error
     - Your service is unavailable
     - Timeout occurs

3. **Mock Data Format:**
   Create a file: `public/mockData/index.json`

```json
{
  "fallback_data": {
    "field1": "default_value1",
    "field2": "default_value2",
    "content": [
      {
        "id": "mock-content-1",
        "type": "content_type",
        "title": "Mock Content Title",
        "text": "Mock content text...",
        "url": "",
        "metadata": {
          "source": "mock",
          "is_fallback": true
        }
      }
    ],
    "metadata": {
      "source": "your-service-name",
      "is_fallback": true,
      "timestamp": "ISO8601"
    }
  }
}
```

**Important:** Mock data should be safe, non-sensitive, and clearly marked as fallback data.

---

## Step 6: HTTP Behavior Expectations

### Response Time

- **Target:** < 2 seconds
- **Maximum:** < 5 seconds
- **Timeout:** Coordinator will timeout after 10 seconds

### HTTP Status Codes

- **200 OK:** Successful response (even if `response.success` is false)
- **400 Bad Request:** Invalid envelope format or missing required fields
- **401 Unauthorized:** Authentication failed
- **403 Forbidden:** Requester is not Coordinator
- **404 Not Found:** Endpoint not found (should not happen if properly registered)
- **500 Internal Server Error:** Your service encountered an error

**Important:** Always return HTTP 200 with error details in the envelope `response.errors` array, unless the request itself is malformed (400/401/403).

### Retry Logic

- Coordinator will retry failed requests up to 2 times
- Use exponential backoff: 1s, 2s
- If all retries fail, Coordinator will use mock data fallback

### Idempotency

- Your endpoint should be idempotent
- Same request should return same response
- Use request ID or timestamp to handle duplicate requests

---

## Step 7: Testing Your Integration

### Test Checklist

- [ ] Endpoint `/api/fill-content-metrics` is accessible
- [ ] Envelope format validation works
- [ ] Tenant ID validation works
- [ ] User ID validation works
- [ ] Query text validation works
- [ ] Success response format is correct
- [ ] Error response format is correct
- [ ] Fallback to mock data works
- [ ] Response time is < 2 seconds
- [ ] Service is registered with Coordinator
- [ ] Health check endpoint works

### Test Request Example

```bash
curl -X POST https://your-service.educore.local/api/fill-content-metrics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "requester_service": "coordinator",
    "payload": {
      "tenant_id": "test-tenant",
      "user_id": "test-user",
      "query_text": "test query",
      "required_fields": ["field1"],
      "metadata": {
        "category": "test",
        "source": "rag"
      }
    },
    "response": null
  }'
```

---

## Step 8: Coordinator Communication

### How Coordinator Communicates with Your Service

1. **RAG calls Coordinator:**
   - RAG sends gRPC request to `Coordinator.Route()`
   - Includes: `tenant_id`, `user_id`, `query_text`, `metadata`

2. **Coordinator routes to your service:**
   - Coordinator determines which microservices to call based on:
     - Query category
     - Required fields
     - Service capabilities (from registration metadata)
   - Coordinator creates envelope and sends HTTP POST to your `/api/fill-content-metrics`

3. **Your service responds:**
   - Your service processes the request
   - Returns envelope with `response` object containing data

4. **Coordinator normalizes and returns:**
   - Coordinator collects responses from all called microservices
   - Normalizes data into `normalized_fields` map
   - Returns to RAG via gRPC

5. **RAG processes response:**
   - RAG merges Coordinator data with internal data
   - Sends to LLM for final answer generation

---

## Environment Variables

Add these to your service's environment configuration:

```env
# Coordinator Integration
COORDINATOR_URL=https://coordinator.educore.local
COORDINATOR_ENABLED=true
SERVICE_NAME=your-service-name
SERVICE_URL=https://your-service.educore.local
ENDPOINT_PATH=/api/fill-content-metrics
```

---

## Troubleshooting

### Common Issues

1. **Coordinator not calling my service:**
   - Check service registration
   - Verify service is enabled in Coordinator
   - Check service health endpoint

2. **Envelope format errors:**
   - Verify request structure matches specification
   - Check `requester_service` is "coordinator"
   - Ensure `response` is `null` in request

3. **Timeout errors:**
   - Optimize response time
   - Check database query performance
   - Consider caching

4. **Authentication errors:**
   - Verify Coordinator has valid credentials
   - Check token expiration
   - Verify service accepts Coordinator's authentication

---

## Support

For questions or issues:
- Check Coordinator documentation
- Contact Coordinator team
- Review RAG integration logs

---

## Summary

To integrate your microservice with Coordinator:

1. ✅ Expose `/api/fill-content-metrics` endpoint
2. ✅ Implement envelope format (request/response)
3. ✅ Create migration file for registration
4. ✅ Register with Coordinator
5. ✅ Implement validation rules
6. ✅ Implement fallback rules (mock data)
7. ✅ Test integration
8. ✅ Monitor performance and errors

**Remember:** Your service should be fast, reliable, and always return valid envelope responses, even on errors.

