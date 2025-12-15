# מדריך רישום RAG Service ב-Coordinator

## סטטוס
⚠️ **Coordinator לא זמין כרגע** - נסה שוב כשה-Coordinator יהיה פעיל.

## URLs

- **Coordinator:** `https://coordinator-production-6004.up.railway.app`
- **RAG Service:** `https://rag-production-3a4c.up.railway.app`
- **RAG Health Check:** `https://rag-production-3a4c.up.railway.app/health`

## תהליך רישום דו-שלבי

### Stage 1: Basic Registration

**Endpoint:** `POST https://coordinator-production-6004.up.railway.app/register`

**Request Body:**

```json
{
  "serviceName": "rag-service",
  "version": "1.0.0",
  "endpoint": "https://rag-production-3a4c.up.railway.app",
  "healthCheck": "/health",
  "description": "EDUCORE - Contextual Assistant (RAG / Knowledge Graph) Microservice. Provides Retrieval-Augmented Generation capabilities with vector similarity search, knowledge graph operations, personalized recommendations, and support for Assessment/DevLab microservices.",
  "metadata": {
    "team": "EDUCORE Team",
    "capabilities": [
      "rag_query_processing",
      "vector_similarity_search",
      "knowledge_graph_operations",
      "personalized_recommendations",
      "assessment_support",
      "devlab_support",
      "content_embedding",
      "query_classification",
      "multi_tenant_support",
      "access_control_rbac_abac"
    ]
  }
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Service registered successfully. Please upload migration file.",
  "serviceId": "uuid-here",
  "status": "pending_migration",
  "nextStep": {
    "action": "POST",
    "endpoint": "/register/{serviceId}/migration",
    "description": "Upload your migration file to complete registration"
  }
}
```

### Stage 2: Migration Upload

**Endpoint:** `POST https://coordinator-production-6004.up.railway.app/register/{serviceId}/migration`

**Request Body:** (השתמש בקובץ `rag-migration-file.json`)

הקובץ `rag-migration-file.json` מוכן ומכיל:
- ✅ Database schema (12 tables)
- ✅ Migrations list
- ✅ gRPC services (6 services)
- ✅ Dependencies
- ✅ Capabilities
- ✅ Events (publishes & subscribes)
- ✅ `api.endpoints: []` (ריק, כנדרש)

## הוראות ביצוע

### Option 1: PowerShell Script

```powershell
# הרץ את הסקריפט:
powershell -ExecutionPolicy Bypass -File register-rag-service.ps1
```

### Option 2: cURL (ב-Git Bash או WSL)

```bash
# Stage 1
curl -X POST https://coordinator-production-6004.up.railway.app/register \
  -H "Content-Type: application/json" \
  -d @register-rag-stage1.json

# Stage 2 (החלף {serviceId} ב-ID שקיבלת)
curl -X POST https://coordinator-production-6004.up.railway.app/register/{serviceId}/migration \
  -H "Content-Type: application/json" \
  -d @rag-migration-file.json
```

### Option 3: Postman/Insomnia

1. **Stage 1:**
   - Method: `POST`
   - URL: `https://coordinator-production-6004.up.railway.app/register`
   - Headers: `Content-Type: application/json`
   - Body: העתק מ-`register-rag-stage1.json`

2. **Stage 2:**
   - Method: `POST`
   - URL: `https://coordinator-production-6004.up.railway.app/register/{serviceId}/migration`
   - Headers: `Content-Type: application/json`
   - Body: העתק מ-`rag-migration-file.json`

## קבצים מוכנים

1. ✅ `rag-migration-file.json` - קובץ המיגרציה המלא
2. ✅ `register-rag-stage1.json` - Body ל-Stage 1
3. ✅ `register-rag-service.ps1` - סקריפט PowerShell אוטומטי

## בדיקות לאחר הרישום

### 1. בדוק שהשירות נרשם

```bash
GET https://coordinator-production-6004.up.railway.app/services
```

### 2. בדוק פרטי השירות

```bash
GET https://coordinator-production-6004.up.railway.app/services/{serviceId}
```

### 3. בדוק Schema Registry

```bash
GET https://coordinator-production-6004.up.railway.app/schemas/{serviceId}
```

## פתרון בעיות

### שגיאה 499/502
- Coordinator לא זמין - בדוק שה-Coordinator רץ
- נסה שוב אחרי כמה דקות

### שגיאה 409 Conflict
- השירות כבר רשום - בדוק ב-`/services`
- אם צריך לעדכן, השתמש ב-`PUT /register/{serviceId}/migration`

### שגיאה 400 Bad Request
- בדוק שה-JSON תקין
- ודא שכל השדות הנדרשים קיימים

## מידע נוסף

- **Documentation:** [Coordinator API Documentation](./COORDINATOR_API_DOCS.md)
- **Migration File:** `rag-migration-file.json`
- **Service Name:** `rag-service`
- **Version:** `1.0.0`






