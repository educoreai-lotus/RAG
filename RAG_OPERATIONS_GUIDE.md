# Complete RAG Operations Guide - All Communication Operations

This document lists **ALL** RAG operations needed for communication with EDUCORE microservices via gRPC, including both implemented and not-yet-implemented operations.

## Overview

The RAG microservice communicates with multiple EDUCORE microservices through gRPC. This guide includes:
- Operations from proto files (`DATABASE/proto/rag/v1/`)
- Operations from detailed specification (`ENDPOINTS_SPEC.md`)
- Implementation status for each operation

---

## 1. Query Service

**Proto File:** `DATABASE/proto/rag/v1/query.proto`  
**Service Name:** `rag.v1.QueryService`  
**Client:** `BACKEND/src/clients/query.client.js` (TODO)  
**Status:** ❌ Not implemented

### Operations:

#### 1.1 SubmitQuery
- **RPC Method:** `SubmitQuery`
- **Request:** `QueryRequest`
  - `tenant_id` (string)
  - `user_id` (string)
  - `query_text` (string)
  - `session_id` (string)
  - `metadata` (map<string, string>)
- **Response:** `QueryResponse`
  - `query_id` (string)
  - `answer` (string)
  - `sources` (repeated Source)
  - `confidence_score` (float)
  - `processing_time_ms` (int32)
  - `model_version` (string)
- **Usage:** Submit a query to the RAG system and get an answer with sources
- **Implementation:** ❌ Needs client implementation

#### 1.2 GetQueryHistory
- **RPC Method:** `GetQueryHistory`
- **Request:** `QueryHistoryRequest`
  - `tenant_id` (string)
  - `user_id` (string)
  - `limit` (int32)
  - `offset` (int32)
- **Response:** `QueryHistoryResponse`
  - `queries` (repeated QueryResponse)
  - `total` (int32)
- **Usage:** Retrieve query history for a user
- **Implementation:** ❌ Needs client implementation

#### 1.3 Query (from ENDPOINTS_SPEC)
- **RPC Method:** `Query`
- **Request:** `QueryRequest` (detailed spec)
  - `query` (string) - Natural language question
  - `tenant_id` (string)
  - `context` (optional QueryContext)
    - `user_id` (string)
    - `session_id` (string)
    - `tags` (repeated string)
  - `options` (optional QueryOptions)
    - `max_results` (int32)
    - `min_confidence` (double)
    - `include_metadata` (bool)
- **Response:** `QueryResponse` (detailed spec)
  - `answer` (string)
  - `confidence` (double)
  - `sources` (repeated Source)
  - `metadata` (QueryMetadata)
  - `access_info` (optional AccessControlInfo)
- **Usage:** Contextual query processing with automatic access control
- **Implementation:** ❌ Needs client implementation

#### 1.4 BatchQuery (from ENDPOINTS_SPEC)
- **RPC Method:** `BatchQuery`
- **Request:** `BatchQueryRequest`
  - `queries` (repeated QueryRequest)
  - `tenant_id` (string)
- **Response:** `BatchQueryResponse`
  - `responses` (repeated QueryResponse)
  - `metadata` (BatchMetadata)
- **Usage:** High-throughput batch query processing
- **Implementation:** ❌ Needs client implementation

---

## 2. Assessment Support Service

**Proto File:** `DATABASE/proto/rag/v1/assessment.proto` (stub)  
**Service Name (stub):** `rag.v1.AssessmentService`  
**Service Name (spec):** `rag.v1.AssessmentSupportService`  
**Client:** `BACKEND/src/clients/assessment.client.js` (TODO)  
**Status:** ❌ Not implemented

### Operations:

#### 2.1 GetAssessmentData (from proto stub)
- **RPC Method:** `GetAssessmentData`
- **Request:** `AssessmentRequest`
  - `tenant_id` (string)
  - `user_id` (string)
- **Response:** `AssessmentResponse`
  - `data` (map<string, string>)
- **Usage:** Fetch assessment data for a user
- **Implementation:** ❌ Needs client implementation

#### 2.2 GetAssessmentHint (from ENDPOINTS_SPEC)
- **RPC Method:** `GetAssessmentHint`
- **Request:** `AssessmentHintRequest`
  - `assessment_id` (string)
  - `question_id` (string)
  - `tenant_id` (string)
  - `user_id` (string)
  - `user_answer` (optional string)
  - `level` (HintLevel enum: SUBTLE, MODERATE, DETAILED)
- **Response:** `AssessmentHintResponse`
  - `hint` (string)
  - `concept_references` (repeated string)
  - `related_content` (repeated Source)
  - `answer_revealed` (bool)
  - `audit` (AuditInfo)
- **Usage:** Real-time assessment support with contextual hints
- **Implementation:** ❌ Needs client implementation

---

## 3. DevLab Support Service

**Proto File:** `DATABASE/proto/rag/v1/devlab.proto` (stub)  
**Service Name (stub):** `rag.v1.DevLabService`  
**Service Name (spec):** `rag.v1.DevLabSupportService`  
**Client:** `BACKEND/src/clients/devlab.client.js` (TODO)  
**Status:** ❌ Not implemented

### Operations:

#### 3.1 GetDevLabData (from proto stub)
- **RPC Method:** `GetDevLabData`
- **Request:** `DevLabRequest`
  - `tenant_id` (string)
  - `user_id` (string)
- **Response:** `DevLabResponse`
  - `data` (map<string, string>)
- **Usage:** Fetch DevLab data for a user
- **Implementation:** ❌ Needs client implementation

#### 3.2 GetTechnicalSupport (from ENDPOINTS_SPEC)
- **RPC Method:** `GetTechnicalSupport`
- **Request:** `TechnicalSupportRequest`
  - `exercise_id` (string)
  - `tenant_id` (string)
  - `user_id` (string)
  - `code` (string)
  - `error_message` (string)
  - `language` (string)
  - `type` (SupportType enum: ERROR_EXPLANATION, CODE_REVIEW, BEST_PRACTICES, CONCEPT_EXPLANATION)
- **Response:** `TechnicalSupportResponse`
  - `explanation` (string)
  - `examples` (repeated CodeExample)
  - `best_practices` (repeated string)
  - `related_resources` (repeated Source)
  - `audit` (AuditInfo)
- **Usage:** DevLab technical support for coding exercises
- **Implementation:** ❌ Needs client implementation

---

## 4. Analytics Explanation Service

**Proto File:** `DATABASE/proto/rag/v1/analytics.proto` (stub)  
**Service Name (stub):** `rag.v1.AnalyticsService`  
**Service Name (spec):** `rag.v1.AnalyticsExplanationService`  
**Client:** `BACKEND/src/clients/analytics.client.js` (TODO)  
**Status:** ❌ Not implemented

### Operations:

#### 4.1 GetAnalytics (from proto stub)
- **RPC Method:** `GetAnalytics`
- **Request:** `AnalyticsRequest`
  - `tenant_id` (string)
- **Response:** `AnalyticsResponse`
  - `data` (map<string, string>)
- **Usage:** Fetch analytics data for a tenant
- **Implementation:** ❌ Needs client implementation

#### 4.2 ExplainAnalytics (from ENDPOINTS_SPEC)
- **RPC Method:** `ExplainAnalytics`
- **Request:** `AnalyticsExplanationRequest`
  - `metric_id` (string)
  - `tenant_id` (string)
  - `user_id` (string)
  - `context` (AnalyticsContext)
    - `dashboard_id` (string)
    - `visualization_type` (string)
    - `data` (map<string, string>)
- **Response:** `AnalyticsExplanationResponse`
  - `explanation` (string)
  - `recommendations` (repeated string)
  - `report_links` (repeated ReportLink)
  - `insights` (map<string, string>)
- **Usage:** Learning analytics explanations
- **Implementation:** ❌ Needs client implementation

#### 4.3 ExplainHRReport (from ENDPOINTS_SPEC)
- **RPC Method:** `ExplainHRReport`
- **Request:** `HRReportExplanationRequest`
  - `report_id` (string)
  - `tenant_id` (string)
  - `user_role` (string)
  - `section_ids` (repeated string)
  - `generate_summary` (bool)
- **Response:** `HRReportExplanationResponse`
  - `explanation` (string)
  - `executive_summary` (optional string)
  - `related_reports` (repeated ReportLink)
  - `key_metrics` (map<string, string>)
  - `recommendations` (repeated string)
- **Usage:** HR report explanations and navigation
- **Implementation:** ❌ Needs client implementation

---

## 5. Content Retrieval Service

**Proto File:** `DATABASE/proto/rag/v1/content.proto` (stub)  
**Service Name (stub):** `rag.v1.ContentService`  
**Service Name (spec):** `rag.v1.ContentRetrievalService`  
**Client:** `BACKEND/src/clients/content.client.js` (TODO)  
**Status:** ❌ Not implemented

### Operations:

#### 5.1 GetContent (from proto stub)
- **RPC Method:** `GetContent`
- **Request:** `ContentRequest`
  - `tenant_id` (string)
  - `content_id` (string)
- **Response:** `ContentResponse`
  - `data` (map<string, string>)
- **Usage:** Fetch specific content item
- **Implementation:** ❌ Needs client implementation

#### 5.2 RetrieveContent (from ENDPOINTS_SPEC)
- **RPC Method:** `RetrieveContent`
- **Request:** `ContentRetrievalRequest`
  - `query` (string)
  - `tenant_id` (string)
  - `content_types` (repeated ContentType enum: TEXT, VIDEO, IMAGE, PRESENTATION, CODE, MIND_MAP, SUMMARY)
  - `max_results` (int32)
- **Response:** `ContentRetrievalResponse`
  - `items` (repeated ContentItem)
  - `total_results` (int32)
- **Usage:** Content retrieval with media links
- **Implementation:** ❌ Needs client implementation

---

## 6. Knowledge Graph Service

**Proto File:** `DATABASE/proto/rag/v1/graph.proto` (stub)  
**Service Name (stub):** `rag.v1.GraphService`  
**Service Name (spec):** `rag.v1.KnowledgeGraphService`  
**Client:** `BACKEND/src/clients/graph.client.js` (TODO)  
**Status:** ❌ Not implemented

### Operations:

#### 6.1 GetGraphData (from proto stub)
- **RPC Method:** `GetGraphData`
- **Request:** `GraphRequest`
  - `tenant_id` (string)
  - `node_id` (string)
- **Response:** `GraphResponse`
  - `data` (map<string, string>)
- **Usage:** Fetch knowledge graph data for a specific node
- **Implementation:** ❌ Needs client implementation

#### 6.2 GetGraphContext (from ENDPOINTS_SPEC)
- **RPC Method:** `GetGraphContext`
- **Request:** `GraphContextRequest`
  - `entity_id` (string)
  - `entity_type` (string)
  - `tenant_id` (string)
  - `max_depth` (int32)
- **Response:** `GraphContextResponse`
  - `entity` (GraphNode)
  - `related_entities` (repeated GraphNode)
  - `relationships` (repeated GraphEdge)
  - `graph_version` (string)
- **Usage:** Knowledge graph integration with context
- **Implementation:** ❌ Needs client implementation

---

## 7. Personalized Assistance Service (AI LEARNER)

**Proto File:** `DATABASE/proto/rag/v1/personalized.proto`  
**Service Name (proto):** `rag.v1.PersonalizedService`  
**Service Name (spec):** `rag.v1.PersonalizedAssistanceService`  
**Client:** `BACKEND/src/clients/aiLearner.client.js`  
**Status:** ✅ Partially implemented

### Operations:

#### 7.1 GetRecommendations ✅ IMPLEMENTED
- **RPC Method:** `GetRecommendations`
- **Request:** `RecommendationsRequest`
  - `tenant_id` (string)
  - `user_id` (string)
  - `query_id` (string)
- **Response:** `RecommendationsResponse`
  - `recommendations` (repeated Recommendation)
- **Usage:** Fetch personalized learning recommendations for a user
- **Implementation:** ✅ `fetchLearningRecommendations(userId, tenantId, options)` in `aiLearner.client.js`

#### 7.2 UpdateUserProfile
- **RPC Method:** `UpdateUserProfile`
- **Request:** `UserProfileRequest`
  - `tenant_id` (string)
  - `user_id` (string)
  - `profile_data` (map<string, string>)
- **Response:** `UserProfileResponse`
  - `user_id` (string)
  - `success` (bool)
- **Usage:** Update user profile data in AI LEARNER
- **Implementation:** ❌ Not yet implemented

#### 7.3 GetPersonalizedQuery (from ENDPOINTS_SPEC)
- **RPC Method:** `GetPersonalizedQuery`
- **Request:** `PersonalizedQueryRequest`
  - `query` (string)
  - `tenant_id` (string)
  - `user_id` (string)
  - `user_context` (optional UserContext)
  - `options` (optional PersonalizationOptions)
- **Response:** `PersonalizedQueryResponse`
  - `answer` (string)
  - `confidence` (double)
  - `sources` (repeated Source)
  - `recommendations` (repeated PersonalizedRecommendation)
  - `skill_gaps` (optional SkillGapAnalysis)
  - `metadata` (PersonalizationMetadata)
- **Usage:** Personalized query responses with skill gap analysis
- **Implementation:** ❌ Needs client implementation

#### 7.4 GetPersonalizedRecommendations (from ENDPOINTS_SPEC)
- **RPC Method:** `GetPersonalizedRecommendations`
- **Request:** `RecommendationsRequest` (detailed spec)
  - `tenant_id` (string)
  - `user_id` (string)
  - `types` (repeated RecommendationType: COURSES, EXERCISES, ASSESSMENTS, MENTORS)
  - `max_results` (int32)
- **Response:** `RecommendationsResponse` (detailed spec)
  - `courses` (repeated PersonalizedRecommendation)
  - `exercises` (repeated PersonalizedRecommendation)
  - `assessments` (repeated PersonalizedRecommendation)
  - `mentors` (repeated PersonalizedRecommendation)
  - `generated_at` (string)
- **Usage:** Personalized content recommendations by type
- **Implementation:** ❌ Needs client implementation

---

## 8. Access Control Service

**Proto File:** `DATABASE/proto/rag/v1/access-control.proto` (stub)  
**Service Name:** `rag.v1.AccessControlService`  
**Client:** `BACKEND/src/clients/accessControl.client.js` (TODO)  
**Status:** ❌ Not implemented

### Operations:

#### 8.1 CheckPermission (from proto stub)
- **RPC Method:** `CheckPermission`
- **Request:** `PermissionRequest`
  - `tenant_id` (string)
  - `user_id` (string)
  - `resource_type` (string)
  - `resource_id` (string)
  - `permission` (string)
- **Response:** `PermissionResponse`
  - `allowed` (bool)
  - `reason` (string)
- **Usage:** Check if a user has permission to access a specific resource
- **Implementation:** ❌ Needs client implementation

#### 8.2 CheckPermissions (from ENDPOINTS_SPEC)
- **RPC Method:** `CheckPermissions`
- **Request:** `PermissionCheckRequest`
  - `tenant_id` (string)
  - `user_id` (string)
  - `resource_type` (string)
  - `resource_id` (string)
  - `action` (string)
  - `user_attributes` (optional UserAttributes)
- **Response:** `PermissionCheckResponse`
  - `allowed` (bool)
  - `reason` (string)
  - `applied_policies` (repeated string)
  - `metadata` (AccessControlMetadata)
- **Usage:** RBAC, ABAC, and fine-grained permissions check
- **Implementation:** ❌ Needs client implementation

#### 8.3 GetAccessibleContent (from ENDPOINTS_SPEC)
- **RPC Method:** `GetAccessibleContent`
- **Request:** `AccessibleContentRequest`
  - `tenant_id` (string)
  - `user_id` (string)
  - `content_type` (string)
  - `course_id` (optional string)
  - `search_query` (optional string)
- **Response:** `AccessibleContentResponse`
  - `items` (repeated AccessibleContentItem)
  - `total_accessible` (int32)
  - `total_filtered` (int32)
- **Usage:** Get all content accessible to a user with fine-grained permissions
- **Implementation:** ❌ Needs client implementation

#### 8.4 ApplyFieldMasking (from ENDPOINTS_SPEC)
- **RPC Method:** `ApplyFieldMasking`
- **Request:** `FieldMaskingRequest`
  - `tenant_id` (string)
  - `user_id` (string)
  - `data` (map<string, string>)
  - `resource_type` (string)
  - `resource_id` (string)
- **Response:** `FieldMaskingResponse`
  - `masked_data` (map<string, MaskedField>)
  - `masked_fields` (repeated string)
  - `metadata` (MaskingMetadata)
- **Usage:** Apply field-level masking based on user role and attributes
- **Implementation:** ❌ Needs client implementation

#### 8.5 GetAccessAuditLog (from ENDPOINTS_SPEC)
- **RPC Method:** `GetAccessAuditLog`
- **Request:** `AuditLogRequest`
  - `tenant_id` (string)
  - `user_id` (optional string)
  - `resource_type` (optional string)
  - `resource_id` (optional string)
  - `start_time` (string)
  - `end_time` (string)
  - `limit` (int32)
  - `offset` (int32)
- **Response:** `AuditLogResponse`
  - `entries` (repeated AuditLogEntry)
  - `total_count` (int32)
  - `has_more` (bool)
- **Usage:** Access control audit and compliance logging
- **Implementation:** ❌ Needs client implementation

---

## 9. GDPR Service

**Proto File:** `DATABASE/proto/rag/v1/gdpr.proto`  
**Service Name:** `rag.v1.GDPRService`  
**Client:** `BACKEND/src/clients/gdpr.client.js` (TODO)  
**Status:** ❌ Not implemented

### Operations:

#### 9.1 DeleteUserData
- **RPC Method:** `DeleteUserData`
- **Request:** `DeleteRequest` (proto) / `DeleteUserDataRequest` (spec)
  - `tenant_id` (string)
  - `user_id` (string)
  - `delete_audit_trail` (bool) - spec only
- **Response:** `DeleteResponse` (proto) / `DeleteUserDataResponse` (spec)
  - `success` (bool)
  - `records_deleted` (int32) - spec only
  - `deleted_types` (repeated string) - spec only
  - `deletion_timestamp` (string) - spec only
- **Usage:** Delete all user data for GDPR compliance (right to be forgotten)
- **Implementation:** ❌ Needs client implementation

#### 9.2 ExportUserData
- **RPC Method:** `ExportUserData`
- **Request:** `ExportRequest` (proto) / `ExportUserDataRequest` (spec)
  - `tenant_id` (string)
  - `user_id` (string)
  - `data_types` (repeated string) - spec only
- **Response:** `ExportResponse` (proto) / `ExportUserDataResponse` (spec)
  - `data` (bytes) - proto only
  - `export_url` (string) - spec only
  - `export_format` (string) - spec only
  - `export_size_bytes` (int64) - spec only
  - `expires_at` (string) - spec only
- **Usage:** Export all user data for GDPR compliance (data portability)
- **Implementation:** ❌ Needs client implementation

---

## 10. Health & Monitoring Service

**Proto File:** `DATABASE/proto/rag/v1/health.proto`  
**Service Name:** `rag.v1.HealthService`  
**Client:** `BACKEND/src/clients/health.client.js` (TODO)  
**Status:** ❌ Not implemented

### Operations:

#### 10.1 HealthCheck
- **RPC Method:** `HealthCheck`
- **Request:** `HealthCheckRequest` (empty)
- **Response:** `HealthCheckResponse`
  - `status` (string) - proto / `HealthStatus` enum - spec
  - `version` (string) - proto
  - `services` (map<string, string>) - proto
  - `database` (ServiceHealth) - spec
  - `cache` (ServiceHealth) - spec
  - `kafka` (ServiceHealth) - spec
  - `ai_service` (ServiceHealth) - spec
  - `metrics` (SystemMetrics) - spec
- **Usage:** Check health status of microservices and system components
- **Implementation:** ❌ Needs client implementation

#### 10.2 GetMetrics (from ENDPOINTS_SPEC)
- **RPC Method:** `GetMetrics`
- **Request:** `MetricsRequest`
  - `tenant_id` (string)
  - `metric_names` (repeated string)
  - `time_range` (string)
- **Response:** `MetricsResponse`
  - `metrics` (repeated MetricValue)
  - `time_range` (string)
- **Usage:** Get system monitoring metrics
- **Implementation:** ❌ Needs client implementation

---

## Summary

### Complete Operations Count

| Service | Proto Operations | Spec Operations | Total Operations | Implemented |
|---------|-----------------|----------------|------------------|-------------|
| **Query Service** | 2 | 2 | 4 | 0 |
| **Assessment Support** | 1 | 1 | 2 | 0 |
| **DevLab Support** | 1 | 1 | 2 | 0 |
| **Analytics Explanation** | 1 | 2 | 3 | 0 |
| **Content Retrieval** | 1 | 1 | 2 | 0 |
| **Knowledge Graph** | 1 | 1 | 2 | 0 |
| **Personalized Assistance** | 2 | 2 | 4 | 1 |
| **Access Control** | 1 | 4 | 5 | 0 |
| **GDPR** | 2 | 2 | 2 | 0 |
| **Health & Monitoring** | 1 | 2 | 3 | 0 |
| **TOTAL** | **13** | **17** | **29** | **1** |

### Implementation Status

**✅ Implemented (1 operation):**
- `GetRecommendations` from Personalized Service (AI LEARNER)

**❌ Not Implemented (28 operations):**
- All other operations need client implementation

### Notes

1. **Proto Files vs Specification:**
   - Proto files contain simple stub definitions
   - ENDPOINTS_SPEC.md contains detailed production-ready specifications
   - Some operations exist in both (with different detail levels)
   - Some operations only exist in one source

2. **Service Name Variations:**
   - Proto files use simpler names (e.g., `AssessmentService`)
   - Specification uses more descriptive names (e.g., `AssessmentSupportService`)
   - Both refer to the same services but may have different method signatures

3. **Implementation Priority:**
   - High Priority: Query Service, Personalized Assistance (remaining methods)
   - Medium Priority: Assessment Support, DevLab Support, Content Retrieval
   - Low Priority: Analytics, Graph, Access Control, GDPR, Health

---

## Next Steps

To implement the remaining operations:

1. **Create client files** for each service in `BACKEND/src/clients/`
2. **Follow the pattern** from `aiLearner.client.js`:
   - Import `createGrpcClient` and `grpcCall` from `grpcClient.util.js`
   - Define gRPC URL, proto path, and service name
   - Create cached client getter function
   - Implement each RPC method as an exported function
   - Add error handling and logging

3. **Add environment variables** for each service:
   - `{SERVICE}_GRPC_URL`
   - `{SERVICE}_PROTO_PATH`
   - `{SERVICE}_SERVICE_NAME`
   - `{SERVICE}_ENABLED`

4. **Integrate clients** into `grpcFallback.service.js` for fallback scenarios

5. **Update services** to use the new clients where needed

6. **Update proto files** to match ENDPOINTS_SPEC.md if needed for production

---

## Reference

- **gRPC Communication Guide:** `GRPC_COMMUNICATION_GUIDE.md`
- **Proto Files Location:** `DATABASE/proto/rag/v1/`
- **Detailed Specification:** `FULLSTACK_TEMPLATES/Stage_02_System_and_Architecture/ENDPOINTS_SPEC.md`
- **Client Utility:** `BACKEND/src/clients/grpcClient.util.js`
- **Example Implementation:** `BACKEND/src/clients/aiLearner.client.js`
