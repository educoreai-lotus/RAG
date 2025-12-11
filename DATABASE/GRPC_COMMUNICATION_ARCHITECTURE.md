# gRPC Communication Architecture

**Document Version:** 1.0  
**Last Updated:** 2025-01-27  
**Purpose:** Explain how RAG chatbot communicates with microservices via gRPC

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Communication Flow](#communication-flow)
4. [When Microservices Are Called](#when-microservices-are-called)
5. [Protocol Buffers (.proto) Contracts](#protocol-buffers-proto-contracts)
6. [Data Flow](#data-flow)
7. [Authentication & Authorization](#authentication--authorization)
8. [Error Propagation](#error-propagation)
9. [Configuration](#configuration)

---

## Overview

The RAG microservice communicates with external microservices via **gRPC** (gRPC Remote Procedure Calls) using **Protocol Buffers** for serialization. The primary communication pattern is:

1. **RAG → Coordinator → Target Microservices**
2. **Coordinator** acts as a routing layer that:
   - Receives requests from RAG
   - Routes to appropriate microservices
   - Normalizes responses
   - Returns aggregated data

### Key Components

- **RAG Service**: The chatbot service that processes user queries
- **Coordinator Service**: Routing and orchestration layer
- **Target Microservices**: Various EDUCORE microservices (Assessment, DevLab, Content, etc.)
- **gRPC Clients**: Client stubs in RAG that call Coordinator
- **Protocol Buffers**: Message definitions for type-safe communication

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER (Frontend)                         │
│                    HTTP/REST API Requests                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RAG Microservice                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Query Processing Service                                │   │
│  │  - Receives user query                                   │   │
│  │  - Performs vector search (internal)                     │   │
│  │  - Decides if Coordinator is needed                      │   │
│  └───────────────────────┬──────────────────────────────────┘   │
│                          │                                       │
│  ┌───────────────────────▼──────────────────────────────────┐   │
│  │  gRPC Fallback Service                                   │   │
│  │  - Checks if internal data is sufficient                 │   │
│  │  - Calls Coordinator if needed                            │   │
│  └───────────────────────┬──────────────────────────────────┘   │
│                          │                                       │
│  ┌───────────────────────▼──────────────────────────────────┐   │
│  │  Coordinator Client (gRPC)                               │   │
│  │  - Creates gRPC client                                   │   │
│  │  - Generates signed metadata                             │   │
│  │  - Makes Route() RPC call                                │   │
│  └───────────────────────┬──────────────────────────────────┘   │
└──────────────────────────┼──────────────────────────────────────┘
                           │ gRPC (Protocol Buffers)
                           │ RouteRequest + Signed Metadata
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Coordinator Service                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  CoordinatorService.Route()                              │   │
│  │  - Validates signature                                   │   │
│  │  - Parses Universal Envelope                             │   │
│  │  - Routes to target microservices                        │   │
│  └───────┬───────────────────────────────┬───────────────────┘   │
│          │                               │                       │
│          │ gRPC                          │ gRPC                 │
│          ▼                               ▼                       │
│  ┌──────────────┐              ┌──────────────┐                │
│  │ Assessment   │              │   DevLab     │                │
│  │ Microservice │              │ Microservice │                │
│  └──────────────┘              └──────────────┘                │
│          │                               │                       │
│          └───────────────┬───────────────┘                       │
│                          │                                       │
│  ┌───────────────────────▼──────────────────────────────────┐   │
│  │  Response Aggregation                                    │   │
│  │  - Normalizes responses                                  │   │
│  │  - Creates RouteResponse                                 │   │
│  └───────────────────────┬──────────────────────────────────┘   │
└──────────────────────────┼──────────────────────────────────────┘
                           │ gRPC RouteResponse
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RAG Microservice                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Response Processing                                     │   │
│  │  - Merges internal + Coordinator results                 │   │
│  │  - Generates final answer                                │   │
│  └───────────────────────┬──────────────────────────────────┘   │
└──────────────────────────┼──────────────────────────────────────┘
                           │ HTTP Response
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                         USER (Frontend)                         │
│                    Receives Final Answer                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Communication Flow

### Step-by-Step Flow

#### 1. **User Query Arrives**
```
User → HTTP POST /api/query → RAG Service
```

#### 2. **Internal RAG Processing**
- RAG performs vector similarity search
- Checks internal knowledge base
- Evaluates if internal data is sufficient

#### 3. **Decision: Call Coordinator?**
```javascript
// In grpcFallback.service.js
const shouldCall = shouldCallCoordinator(query, vectorResults, internalData);
```

**Decision Criteria:**
- Internal data insufficient (low relevance scores)
- Query requires real-time data
- Query category matches microservice capabilities

#### 4. **gRPC Call to Coordinator**
```javascript
// In coordinator.client.js
const response = await routeRequest({
  tenant_id: 'tenant-123',
  user_id: 'user-456',
  query_text: 'Show me my assessment results',
  metadata: { category: 'assessment' }
});
```

**What Happens:**
- Creates Universal Envelope (JSON)
- Generates digital signature
- Builds RouteRequest message
- Makes gRPC call with signed metadata

#### 5. **Coordinator Routes to Microservices**
- Coordinator validates signature
- Parses Universal Envelope
- Identifies target microservices
- Calls each microservice via gRPC
- Aggregates responses

#### 6. **Response Returns to RAG**
- Coordinator returns RouteResponse
- Contains normalized_fields and envelope_json
- Includes target_services list

#### 7. **RAG Merges Results**
- Combines internal + Coordinator results
- Generates final answer using LLM
- Returns to user

---

## When Microservices Are Called

### Decision Logic

Microservices are called **ONLY** when:

1. **Internal RAG data is insufficient**
   - Vector search returns low relevance scores (< 0.7)
   - No matching content found
   - Query requires real-time data

2. **Query category matches microservice**
   - Assessment queries → Assessment Service
   - DevLab queries → DevLab Service
   - Content queries → Content Service
   - Analytics queries → Analytics Service

3. **Real-time data required**
   - User-specific data (scores, progress)
   - Dynamic content (current assessments)
   - Live analytics

### Code Location

**Decision Point:** `BACKEND/src/services/grpcFallback.service.js`

```javascript
export async function grpcFetchByCategory(category, { query, tenantId, userId, vectorResults, internalData }) {
  // Decision layer: Check if Coordinator should be called
  const shouldCall = shouldCallCoordinator(query, vectorResults, internalData);
  
  if (!shouldCall) {
    return []; // Internal data is sufficient
  }
  
  // Call Coordinator...
}
```

**Implementation:** `BACKEND/src/communication/communicationManager.service.js`

---

## Protocol Buffers (.proto) Contracts

### Core Proto Files

Located in: `DATABASE/proto/rag/v1/`

#### 1. **coordinator.proto** (Primary Contract)

```protobuf
syntax = "proto3";
package rag.v1;

service CoordinatorService {
  rpc Route(RouteRequest) returns (RouteResponse);
}

message RouteRequest {
  string tenant_id = 1;
  string user_id = 2;
  string query_text = 3;
  string requester_service = 4;
  map<string, string> context = 5;
  string envelope_json = 6;  // Universal Envelope JSON
}

message RouteResponse {
  repeated string target_services = 1;
  map<string, string> normalized_fields = 2;
  string envelope_json = 3;
  string routing_metadata = 4;
}
```

#### 2. **query.proto**

```protobuf
service QueryService {
  rpc SubmitQuery(QueryRequest) returns (QueryResponse);
  rpc GetQueryHistory(QueryHistoryRequest) returns (QueryHistoryResponse);
}

message QueryRequest {
  string tenant_id = 1;
  string user_id = 2;
  string query_text = 3;
  string session_id = 4;
  map<string, string> metadata = 5;
}
```

#### 3. **personalized.proto**

```protobuf
service PersonalizedService {
  rpc GetRecommendations(RecommendationsRequest) returns (RecommendationsResponse);
  rpc UpdateUserProfile(UserProfileRequest) returns (UserProfileResponse);
}
```

#### 4. **Other Proto Files**

- `access-control.proto` - Permission checks
- `graph.proto` - Knowledge graph operations
- `content.proto` - Content retrieval
- `gdpr.proto` - GDPR compliance
- `analytics.proto` - Analytics operations
- `devlab.proto` - DevLab support
- `health.proto` - Health checks
- `assessment.proto` - Assessment support

### Message Structure

**Universal Envelope Format:**
```json
{
  "version": "1.0",
  "timestamp": "2025-01-27T10:00:00Z",
  "request_id": "rag-1234567890-abc123",
  "tenant_id": "tenant-123",
  "user_id": "user-456",
  "source": "rag-service",
  "payload": {
    "query_text": "Show me my assessment results",
    "metadata": {
      "category": "assessment"
    }
  }
}
```

---

## Data Flow

### Complete Flow: User → Chatbot → RAG → Microservice → Response → User

```
┌─────────────┐
│    USER     │
│  "Show my   │
│ assessment  │
│  results"   │
└──────┬──────┘
       │ HTTP POST /api/query
       │ { query: "...", tenantId: "...", userId: "..." }
       ▼
┌──────────────────────────────────────────────────────────┐
│              RAG Microservice                             │
│                                                            │
│  1. Query Processing Service                              │
│     - Receives HTTP request                              │
│     - Extracts query, tenantId, userId                    │
│                                                            │
│  2. Vector Search (Internal)                              │
│     - Generates query embedding                          │
│     - Searches vector database                           │
│     - Gets similar content                               │
│                                                            │
│  3. Decision: Is internal data sufficient?               │
│     ✓ Yes → Use internal data only                      │
│     ✗ No  → Call Coordinator                            │
│                                                            │
│  4. gRPC Fallback Service                                │
│     - Creates Universal Envelope                         │
│     - Generates signature                                │
│     - Calls Coordinator.Route()                          │
└──────┬───────────────────────────────────────────────────┘
       │ gRPC RouteRequest
       │ {
       │   tenant_id: "tenant-123",
       │   user_id: "user-456",
       │   query_text: "Show my assessment results",
       │   requester_service: "rag-service",
       │   context: { category: "assessment" },
       │   envelope_json: "{...}"
       │ }
       │ Metadata: {
       │   x-signature: "base64...",
       │   x-timestamp: "1234567890",
       │   x-requester-service: "rag-service"
       │ }
       ▼
┌──────────────────────────────────────────────────────────┐
│            Coordinator Service                           │
│                                                            │
│  1. Validates Signature                                   │
│     - Verifies x-signature header                        │
│     - Checks timestamp                                    │
│                                                            │
│  2. Parses Universal Envelope                            │
│     - Extracts tenant_id, user_id                        │
│     - Identifies query category                          │
│                                                            │
│  3. Routes to Target Microservices                       │
│     - Assessment Service (for assessment queries)        │
│     - DevLab Service (for devlab queries)                │
│     - Content Service (for content queries)              │
│                                                            │
│  4. Aggregates Responses                                  │
│     - Normalizes data from all services                  │
│     - Creates RouteResponse                              │
└──────┬───────────────────────────────────────────────────┘
       │ gRPC RouteResponse
       │ {
       │   target_services: ["assessment-service"],
       │   normalized_fields: {
       │     "assessment_id": "assess-123",
       │     "score": "85",
       │     "status": "completed"
       │   },
       │   envelope_json: "{...}",
       │   routing_metadata: "{...}"
       │ }
       ▼
┌──────────────────────────────────────────────────────────┐
│              RAG Microservice                            │
│                                                            │
│  5. Process Coordinator Response                         │
│     - Parses normalized_fields                           │
│     - Converts to source format                          │
│                                                            │
│  6. Merge Results                                         │
│     - Combines internal + Coordinator results            │
│     - Deduplicates sources                                │
│                                                            │
│  7. Generate Answer                                        │
│     - Uses LLM with merged context                       │
│     - Formats response                                    │
└──────┬───────────────────────────────────────────────────┘
       │ HTTP Response
       │ {
       │   answer: "Your assessment results show...",
       │   sources: [...],
       │   confidence: 0.92
       │ }
       ▼
┌─────────────┐
│    USER     │
│  Receives   │
│   Answer    │
└─────────────┘
```

---

## Authentication & Authorization

### Authentication Flow

#### 1. **Digital Signature Generation**

**Location:** `BACKEND/src/utils/signature.js`

```javascript
// RAG generates signature before calling Coordinator
const signature = generateSignature('rag-service', privateKey, {
  tenant_id: request.tenant_id,
  user_id: request.user_id,
  query_text: request.query_text,
  timestamp: timestamp
});
```

**Signature Format:**
- Algorithm: ECDSA P-256 with SHA-256
- Message: `educoreai-rag-service-{payload_hash}`
- Encoding: Base64

#### 2. **gRPC Metadata**

**Location:** `BACKEND/src/clients/coordinator.client.js`

```javascript
function createSignedMetadata(request) {
  const metadata = new grpc.Metadata();
  metadata.add('x-signature', signature);
  metadata.add('x-timestamp', timestamp.toString());
  metadata.add('x-requester-service', 'rag-service');
  return metadata;
}
```

**Metadata Headers:**
- `x-signature`: Base64-encoded signature
- `x-timestamp`: Unix timestamp (milliseconds)
- `x-requester-service`: Service identifier ("rag-service")

#### 3. **Coordinator Validation**

Coordinator validates:
1. Signature authenticity (using RAG's public key)
2. Timestamp freshness (prevents replay attacks)
3. Service identity (verifies requester-service)

### Authorization Flow

#### Tenant Isolation

Every request includes:
- `tenant_id`: Tenant identifier (required)
- `user_id`: User identifier (required)

**Tenant Isolation:**
- All data is scoped to tenant_id
- Microservices enforce tenant boundaries
- No cross-tenant data leakage

#### User Context

**User Identity:**
- Extracted from HTTP headers (`X-User-Id`, `X-Tenant-Id`)
- Passed through gRPC requests
- Used for personalization and access control

#### Access Control

**RBAC/ABAC:**
- Microservices check permissions
- Field-level masking applied
- Audit trail maintained

**Location:** `DATABASE/proto/rag/v1/access-control.proto`

```protobuf
service AccessControlService {
  rpc CheckPermission(PermissionRequest) returns (PermissionResponse);
}
```

---

## Error Propagation

### Error Flow

```
Microservice Error
       │
       ▼
┌─────────────────────────────────────┐
│   Coordinator Service                │
│   - Catches gRPC errors             │
│   - Maps error codes                 │
│   - Returns error in RouteResponse   │
└──────────────┬───────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   RAG Coordinator Client             │
│   - Receives gRPC error              │
│   - Maps to error details            │
│   - Logs error                       │
└──────────────┬───────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   gRPC Fallback Service              │
│   - Handles Coordinator errors       │
│   - Falls back to internal data      │
│   - Returns empty array on error     │
└──────────────┬───────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Query Processing Service            │
│   - Continues with internal data     │
│   - Generates answer                 │
│   - Returns to user                  │
└──────────────┬───────────────────────┘
               │
               ▼
         User receives
      answer (may indicate
      limited data)
```

### Error Types

#### gRPC Status Codes

**Location:** `BACKEND/src/clients/coordinator.client.js`

```javascript
function getGrpcErrorDetails(error) {
  const errorMappings = {
    [grpc.status.DEADLINE_EXCEEDED]: {
      type: 'TIMEOUT',
      retryable: true,
    },
    [grpc.status.UNAVAILABLE]: {
      type: 'SERVICE_UNAVAILABLE',
      retryable: true,
    },
    [grpc.status.NOT_FOUND]: {
      type: 'NOT_FOUND',
      retryable: false,
    },
    [grpc.status.INVALID_ARGUMENT]: {
      type: 'INVALID_REQUEST',
      retryable: false,
    },
    [grpc.status.INTERNAL]: {
      type: 'INTERNAL_ERROR',
      retryable: true,
    },
  };
}
```

#### Error Handling Strategy

1. **Retryable Errors** (UNAVAILABLE, DEADLINE_EXCEEDED, INTERNAL)
   - Logged as warnings
   - Client reset for reconnection
   - Fallback to internal data

2. **Non-Retryable Errors** (NOT_FOUND, INVALID_ARGUMENT)
   - Logged as errors
   - No retry attempted
   - Fallback to internal data

3. **Graceful Degradation**
   - RAG continues with internal data
   - User receives answer (may indicate limited data)
   - No service interruption

### Error Logging

**Location:** `BACKEND/src/clients/coordinator.client.js`

```javascript
if (errorDetails.retryable) {
  logger.warn('Coordinator gRPC call error (retryable)', {
    ...errorDetails,
    tenant_id,
    user_id,
  });
} else {
  logger.error('Coordinator gRPC call error (non-retryable)', {
    ...errorDetails,
    tenant_id,
    user_id,
  });
}
```

---

## Configuration

### Environment Variables

**RAG Service Configuration:**

```bash
# Enable/disable gRPC
GRPC_ENABLED=true

# Coordinator settings
COORDINATOR_ENABLED=true
COORDINATOR_URL=coordinator  # or localhost for dev
COORDINATOR_GRPC_PORT=50051
COORDINATOR_GRPC_URL=coordinator:50051  # Full URL (optional)

# Timeout settings
GRPC_TIMEOUT=30  # seconds

# Authentication
RAG_PRIVATE_KEY=<base64-encoded-pem-key>

# TLS/SSL (production)
GRPC_USE_SSL=false  # true for production
GRPC_ROOT_CERT=<base64-encoded-cert>  # Optional
```

### gRPC Client Configuration

**Location:** `BACKEND/src/clients/grpcClient.util.js`

**Credentials:**
- **Development:** Insecure credentials (`grpc.credentials.createInsecure()`)
- **Production:** SSL/TLS credentials (`grpc.credentials.createSsl()`)

**Timeout:**
- Default: 30 seconds (configurable via `GRPC_TIMEOUT`)
- Applied per RPC call

### Proto File Paths

**Default Locations:**
- Coordinator: `DATABASE/proto/rag/v1/coordinator.proto`
- Service Name: `rag.v1.CoordinatorService`

**Configurable via:**
- `COORDINATOR_PROTO_PATH`
- `COORDINATOR_SERVICE_NAME`

---

## Summary

### Key Points

1. **Communication Pattern:** RAG → Coordinator → Target Microservices
2. **Protocol:** gRPC with Protocol Buffers
3. **Authentication:** Digital signatures (ECDSA P-256)
4. **Authorization:** Tenant isolation + user context
5. **Error Handling:** Graceful degradation with fallback
6. **Decision Logic:** Only call Coordinator when internal data is insufficient

### Benefits

- ✅ **Type Safety:** Protocol Buffers ensure type-safe communication
- ✅ **Performance:** gRPC is faster than REST (HTTP/2, binary serialization)
- ✅ **Security:** Digital signatures prevent unauthorized access
- ✅ **Reliability:** Error handling and fallback mechanisms
- ✅ **Scalability:** Coordinator handles routing and aggregation

---

## Related Documentation

- [MICROSERVICE_IMPLEMENTATION_GUIDE.md](./MICROSERVICE_IMPLEMENTATION_GUIDE.md) - How to implement gRPC server in your microservice
- [MICROSERVICE_INTEGRATION.md](./MICROSERVICE_INTEGRATION.md) - General microservice integration guide
- Proto files: `DATABASE/proto/rag/v1/*.proto`

---

**Document Maintained By:** RAG Microservice Team  
**Questions?** Contact the development team or refer to implementation guide.






