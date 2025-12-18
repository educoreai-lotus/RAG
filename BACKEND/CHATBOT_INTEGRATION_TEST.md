# Chatbot Integration Testing Checklist

**Version:** 1.0  
**Last Updated:** 2025-01-27

---

## 🎯 Overview

This checklist ensures the chatbot works correctly in **BOTH modes** (SUPPORT and CHAT) across **ALL microservices**.

---

## 📋 SUPPORT Mode Tests

### DevLab Microservice

**Endpoint:** `POST /api/devlab/support`

- [ ] **OPTIONS preflight** - `OPTIONS /api/devlab/support` returns `204` with CORS headers
- [ ] **POST with auth** - `POST /api/devlab/support` with valid token returns `200`
- [ ] **POST without auth** - `POST /api/devlab/support` without token returns `401/403`
- [ ] **CORS headers** - Response includes `Access-Control-Allow-Origin` header
- [ ] **CORS origin** - DevLab frontend origin (`https://dev-lab-frontend.vercel.app` or preview) is allowed
- [ ] **Bot widget** - Widget appears on DevLab dashboard
- [ ] **Messages sent** - Messages are successfully sent to backend
- [ ] **Response received** - Bot receives and displays response from DevLab microservice
- [ ] **Error handling** - Errors are displayed correctly in widget

**Test Commands:**
```bash
# Test OPTIONS preflight
curl -X OPTIONS https://rag-production-3a4c.up.railway.app/api/devlab/support \
  -H "Origin: https://dev-lab-frontend.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Test POST request
curl -X POST https://rag-production-3a4c.up.railway.app/api/devlab/support \
  -H "Content-Type: application/json" \
  -H "Origin: https://dev-lab-frontend.vercel.app" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-User-Id: test-user-123" \
  -H "X-Tenant-Id: devlab" \
  -d '{"query": "How do I debug a sandbox error?", "support_mode": "DevLab"}' \
  -v
```

---

### Assessment Microservice

**Endpoint:** `POST /api/assessment/support`

- [ ] **OPTIONS preflight** - `OPTIONS /api/assessment/support` returns `204` with CORS headers
- [ ] **POST with auth** - `POST /api/assessment/support` with valid token returns `200`
- [ ] **POST without auth** - `POST /api/assessment/support` without token returns `401/403`
- [ ] **CORS headers** - Response includes `Access-Control-Allow-Origin` header
- [ ] **CORS origin** - Assessment frontend origin (`https://assessment-frontend.vercel.app` or preview) is allowed
- [ ] **Bot widget** - Widget appears on Assessment dashboard
- [ ] **Messages sent** - Messages are successfully sent to backend
- [ ] **Response received** - Bot receives and displays response from Assessment microservice
- [ ] **Error handling** - Errors are displayed correctly in widget

**Test Commands:**
```bash
# Test OPTIONS preflight
curl -X OPTIONS https://rag-production-3a4c.up.railway.app/api/assessment/support \
  -H "Origin: https://assessment-frontend.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Test POST request
curl -X POST https://rag-production-3a4c.up.railway.app/api/assessment/support \
  -H "Content-Type: application/json" \
  -H "Origin: https://assessment-frontend.vercel.app" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-User-Id: test-user-123" \
  -H "X-Tenant-Id: assessment" \
  -d '{"query": "How do I create a new assessment?", "support_mode": "Assessment"}' \
  -v
```

---

## 📋 CHAT Mode Tests

### Course Builder Microservice (Example)

**Endpoint:** `POST /api/v1/query`

- [ ] **OPTIONS preflight** - `OPTIONS /api/v1/query` returns `204` with CORS headers
- [ ] **POST with auth** - `POST /api/v1/query` with valid token returns `200`
- [ ] **POST without auth** - `POST /api/v1/query` without token returns `401/403`
- [ ] **CORS headers** - Response includes `Access-Control-Allow-Origin` header
- [ ] **CORS origin** - Course Builder frontend origin (`https://course-builder.vercel.app` or preview) is allowed
- [ ] **Bot widget** - Widget appears on Course Builder dashboard
- [ ] **Messages sent** - Messages are successfully sent to backend
- [ ] **RAG response** - Bot receives RAG-powered response from backend
- [ ] **Error handling** - Errors are displayed correctly in widget

**Test Commands:**
```bash
# Test OPTIONS preflight
curl -X OPTIONS https://rag-production-3a4c.up.railway.app/api/v1/query \
  -H "Origin: https://course-builder.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Test POST request
curl -X POST https://rag-production-3a4c.up.railway.app/api/v1/query \
  -H "Content-Type: application/json" \
  -H "Origin: https://course-builder.vercel.app" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-User-Id: test-user-123" \
  -H "X-Tenant-Id: course-builder" \
  -d '{"query": "What courses are available?", "tenant_id": "course-builder"}' \
  -v
```

---

### Other CHAT Mode Microservices

Test the same checklist for:
- [ ] **Student Portal** (`POST /api/v1/query`)
- [ ] **Analytics Dashboard** (`POST /api/v1/query`)
- [ ] **Content Studio** (`POST /api/v1/query`)
- [ ] **Skills Engine** (`POST /api/v1/query`)
- [ ] **Learner AI** (`POST /api/v1/query`)
- [ ] **Learning Analytics** (`POST /api/v1/query`)
- [ ] **HR & Management Reporting** (`POST /api/v1/query`)

---

## 🔧 Universal Tests

### Backend Configuration

- [ ] **Route mounting** - All routes are correctly mounted in `index.js`
  - [ ] `/api/devlab/support` (SUPPORT mode)
  - [ ] `/api/assessment/support` (SUPPORT mode)
  - [ ] `/api/v1/query` (CHAT mode)
- [ ] **OPTIONS handlers** - All endpoints have OPTIONS handlers
- [ ] **CORS configuration** - CORS allows all Vercel preview URLs (`*.vercel.app`)
- [ ] **Error logging** - All errors are logged with full details

### Frontend Configuration

- [ ] **Backend URL detection** - `window.EDUCORE_BACKEND_URL` is set correctly by `bot.js`
- [ ] **Auth headers** - All requests include `Authorization`, `X-User-Id`, `X-Tenant-Id` headers
- [ ] **Mode detection** - Bot correctly detects SUPPORT vs CHAT mode based on `microservice` parameter
- [ ] **Endpoint selection** - Correct endpoint is called based on mode:
  - [ ] SUPPORT mode → `/api/{microservice}/support`
  - [ ] CHAT mode → `/api/v1/query`

### Error Handling

- [ ] **Network errors** - Network failures are handled gracefully
- [ ] **401/403 errors** - Authentication errors are displayed correctly
- [ ] **500 errors** - Server errors are logged and displayed
- [ ] **CORS errors** - CORS failures are logged with origin details

### Logging

- [ ] **Request logging** - All requests are logged in Railway logs
- [ ] **Error logging** - All errors include full stack traces
- [ ] **CORS logging** - CORS decisions are logged with origin

---

## 🧪 Quick Test Script

```bash
#!/bin/bash

# Test all endpoints
BASE_URL="https://rag-production-3a4c.up.railway.app"

echo "Testing DevLab Support..."
curl -X OPTIONS "$BASE_URL/api/devlab/support" \
  -H "Origin: https://dev-lab-frontend.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -v

echo -e "\n\nTesting Assessment Support..."
curl -X OPTIONS "$BASE_URL/api/assessment/support" \
  -H "Origin: https://assessment-frontend.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -v

echo -e "\n\nTesting Chat Query..."
curl -X OPTIONS "$BASE_URL/api/v1/query" \
  -H "Origin: https://course-builder.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

---

## ✅ Success Criteria

All tests must pass for:
- ✅ Both SUPPORT and CHAT modes
- ✅ All microservice origins (including Vercel previews)
- ✅ All endpoints (devlab/support, assessment/support, v1/query)
- ✅ Error handling and logging

---

**Document Maintained By:** RAG Microservice Team

