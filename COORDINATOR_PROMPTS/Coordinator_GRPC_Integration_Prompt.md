# Coordinator gRPC Integration Prompt

**Target:** Coordinator Microservice  
**Purpose:** Add gRPC server support for RAG ↔ Coordinator communication  
**Date:** 2025-01-27  
**Status:** Ready for Implementation

---

## 🎯 Context

The RAG microservice has been updated to communicate with the Coordinator via gRPC. The Coordinator must now implement the gRPC server side to receive requests from RAG and route them to appropriate microservices.

**Architecture Flow:**
```
RAG → Coordinator.Route() [gRPC] → Microservices [HTTP Envelope] → Coordinator → RAG [gRPC]
```

**Important:** This implementation must maintain full backward compatibility with existing Coordinator functionality.

---

## 📋 Prerequisites

Before starting, ensure you have:

- [ ] Access to Coordinator microservice codebase
- [ ] Proto file: `DATABASE/proto/rag/v1/coordinator.proto` (from RAG repo)
- [ ] Existing Coordinator HTTP endpoints working
- [ ] Schema Registry access
- [ ] Microservice Universal Envelope format documented
- [ ] gRPC libraries installed (e.g., `@grpc/grpc-js`, `@grpc/proto-loader`)

---

## 🏗️ Implementation Steps

### Step 1: Add gRPC Server Setup

#### 1.1 Install Dependencies

Add to `package.json` (if not already present):

```json
{
  "dependencies": {
    "@grpc/grpc-js": "^1.10.0",
    "@grpc/proto-loader": "^0.7.11"
  }
}
```

#### 1.2 Folder Structure

Create/update folder structure:

```
coordinator/
├── src/
│   ├── grpc/
│   │   ├── server.js              # gRPC server setup
│   │   ├── services/
│   │   │   └── coordinator.service.js  # Route() RPC handler
│   │   └── proto/
│   │       └── coordinator.proto  # Copy from RAG repo
│   ├── services/
│   │   ├── routing.service.js     # Routing logic
│   │   ├── envelope.service.js    # Universal Envelope handling
│   │   └── normalization.service.js  # Field normalization
│   ├── registry/
│   │   └── schema.registry.js    # Schema Registry integration
│   └── index.js                   # Main entry point
```

#### 1.3 Copy Proto File

Copy the proto file from RAG repository:

**Source:** `RAG_microservice/DATABASE/proto/rag/v1/coordinator.proto`

**Destination:** `coordinator/src/grpc/proto/coordinator.proto`

**Proto Content:**
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
  map<string, string> metadata = 4;
}

message RouteResponse {
  repeated string target_services = 1;
  map<string, string> normalized_fields = 2;
  string envelope_json = 3;
  string routing_metadata = 4;
}
```

---

### Step 2: Implement gRPC Server

#### 2.1 Create gRPC Server File

**File:** `src/grpc/server.js`

**Purpose:** Initialize and start gRPC server

**Template:**

```javascript
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { coordinatorService } from './services/coordinator.service.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROTO_PATH = process.env.COORDINATOR_PROTO_PATH || 
  join(__dirname, 'proto/coordinator.proto');
const GRPC_PORT = process.env.COORDINATOR_GRPC_PORT || 50051;
const GRPC_HOST = process.env.COORDINATOR_GRPC_HOST || '0.0.0.0';

/**
 * Load proto file and create package definition
 */
function loadProto() {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  return grpc.loadPackageDefinition(packageDefinition);
}

/**
 * Start gRPC server
 */
export function startGrpcServer() {
  const packageDefinition = loadProto();
  const coordinatorProto = packageDefinition.rag.v1;

  const server = new grpc.Server();

  // Register Coordinator service
  server.addService(coordinatorProto.CoordinatorService.service, {
    Route: coordinatorService.route,
  });

  const address = `${GRPC_HOST}:${GRPC_PORT}`;
  
  server.bindAsync(
    address,
    grpc.ServerCredentials.createInsecure(),
    (error, port) => {
      if (error) {
        logger.error('Failed to start gRPC server', { error: error.message });
        throw error;
      }

      logger.info('gRPC server started', {
        address,
        port,
        service: 'CoordinatorService',
      });

      server.start();
    }
  );

  return server;
}
```

#### 2.2 Integrate with Main Application

**File:** `src/index.js` (or main entry point)

**Add:**

```javascript
import { startGrpcServer } from './grpc/server.js';

// ... existing code ...

// Start gRPC server alongside HTTP server
if (process.env.GRPC_ENABLED !== 'false') {
  startGrpcServer();
}
```

---

### Step 3: Implement Route() RPC Handler

#### 3.1 Create Coordinator Service

**File:** `src/grpc/services/coordinator.service.js`

**Purpose:** Handle `Route()` RPC calls from RAG

**Template:**

```javascript
import { logger } from '../../utils/logger.js';
import { routeRequest } from '../../services/routing.service.js';
import { normalizeResponse } from '../../services/normalization.service.js';

/**
 * Route RPC handler
 * Receives requests from RAG and routes to appropriate microservices
 * 
 * @param {Object} call - gRPC call object
 * @param {Object} callback - gRPC callback function
 */
export async function route(call, callback) {
  const startTime = Date.now();
  const { tenant_id, user_id, query_text, metadata = {} } = call.request;

  try {
    logger.info('Coordinator.Route() called', {
      tenant_id,
      user_id,
      query_length: query_text?.length || 0,
      metadata_keys: Object.keys(metadata),
    });

    // Step 1: Determine which microservices to call
    const targetServices = await determineTargetServices({
      query_text,
      tenant_id,
      user_id,
      metadata,
    });

    if (targetServices.length === 0) {
      logger.warn('No target services found for route request', {
        tenant_id,
        query_text: query_text?.substring(0, 100),
      });

      return callback(null, {
        target_services: [],
        normalized_fields: {},
        envelope_json: JSON.stringify({}),
        routing_metadata: JSON.stringify({ message: 'No services matched' }),
      });
    }

    // Step 2: Call microservices via Universal Envelope
    const microserviceResponses = await callMicroservices({
      targetServices,
      tenant_id,
      user_id,
      query_text,
      metadata,
    });

    // Step 3: Normalize responses
    const normalizedFields = await normalizeResponse({
      responses: microserviceResponses,
      targetServices,
      tenant_id,
      metadata,
    });

    // Step 4: Build RouteResponse
    const response = {
      target_services: targetServices,
      normalized_fields: normalizedFields,
      envelope_json: JSON.stringify({
        requester_service: 'coordinator',
        payload: {
          tenant_id,
          user_id,
          query_text,
        },
        response: {
          success: true,
          data: normalizedFields,
        },
      }),
      routing_metadata: JSON.stringify({
        services_called: targetServices,
        responses_count: microserviceResponses.length,
        processing_time_ms: Date.now() - startTime,
      }),
    };

    logger.info('Coordinator.Route() completed', {
      tenant_id,
      user_id,
      target_services: targetServices,
      processing_time_ms: Date.now() - startTime,
    });

    callback(null, response);
  } catch (error) {
    logger.error('Coordinator.Route() error', {
      error: error.message,
      stack: error.stack,
      tenant_id,
      user_id,
    });

    // Return error response (don't throw - gRPC handles errors differently)
    callback(null, {
      target_services: [],
      normalized_fields: {},
      envelope_json: JSON.stringify({
        requester_service: 'coordinator',
        payload: {
          tenant_id,
          user_id,
          query_text,
        },
        response: {
          success: false,
          data: null,
          errors: [{
            code: 'ROUTING_ERROR',
            message: error.message,
          }],
        },
      }),
      routing_metadata: JSON.stringify({
        error: error.message,
        processing_time_ms: Date.now() - startTime,
      }),
    });
  }
}
```

---

### Step 4: Implement Routing Service

#### 4.1 Determine Target Services

**File:** `src/services/routing.service.js`

**Purpose:** Determine which microservices to call based on query and metadata

**Template:**

```javascript
import { logger } from '../utils/logger.js';
import { getSchemaRegistry } from '../registry/schema.registry.js';

/**
 * Determine which microservices should be called
 * 
 * @param {Object} params
 * @param {string} params.query_text - User query
 * @param {string} params.tenant_id - Tenant ID
 * @param {string} params.user_id - User ID
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Array<string>>} Array of microservice names
 */
export async function determineTargetServices({ query_text, tenant_id, user_id, metadata = {} }) {
  try {
    const schemaRegistry = await getSchemaRegistry();
    
    // Get registered microservices
    const registeredServices = await schemaRegistry.getRegisteredServices();
    
    // Analyze query to determine relevant services
    const queryLower = query_text.toLowerCase();
    const category = metadata.category || detectCategory(query_text);
    
    // Match services based on:
    // 1. Query category
    // 2. Required fields from metadata
    // 3. Service capabilities from Schema Registry
    
    const targetServices = [];
    
    for (const service of registeredServices) {
      if (!service.enabled) continue;
      
      // Check if service matches category
      if (service.metadata?.categories?.includes(category)) {
        targetServices.push(service.service_name);
        continue;
      }
      
      // Check if service supports required fields
      const requiredFields = metadata.required_fields || [];
      if (requiredFields.length > 0) {
        const supportedFields = service.metadata?.supported_fields || [];
        const hasRequiredFields = requiredFields.some(field => 
          supportedFields.includes(field)
        );
        
        if (hasRequiredFields) {
          targetServices.push(service.service_name);
        }
      }
    }
    
    // Remove duplicates
    return [...new Set(targetServices)];
  } catch (error) {
    logger.error('Error determining target services', {
      error: error.message,
      query_text: query_text?.substring(0, 100),
    });
    return [];
  }
}

/**
 * Detect query category
 */
function detectCategory(queryText) {
  const queryLower = queryText.toLowerCase();
  
  if (queryLower.includes('test') || queryLower.includes('exam') || queryLower.includes('assessment')) {
    return 'assessment';
  }
  if (queryLower.includes('code') || queryLower.includes('programming') || queryLower.includes('debug')) {
    return 'devlab';
  }
  if (queryLower.includes('analytics') || queryLower.includes('report') || queryLower.includes('metrics')) {
    return 'analytics';
  }
  if (queryLower.includes('course') || queryLower.includes('lesson') || queryLower.includes('content')) {
    return 'content';
  }
  
  return 'general';
}
```

#### 4.2 Call Microservices

**File:** `src/services/routing.service.js` (continued)

**Template:**

```javascript
import axios from 'axios';

/**
 * Call microservices via Universal Envelope
 * 
 * @param {Object} params
 * @param {Array<string>} params.targetServices - Services to call
 * @param {string} params.tenant_id - Tenant ID
 * @param {string} params.user_id - User ID
 * @param {string} params.query_text - Query text
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Array>} Array of microservice responses
 */
export async function callMicroservices({ targetServices, tenant_id, user_id, query_text, metadata = {} }) {
  const schemaRegistry = await getSchemaRegistry();
  const responses = [];
  
  // Call each microservice in parallel
  const promises = targetServices.map(async (serviceName) => {
    try {
      const service = await schemaRegistry.getService(serviceName);
      if (!service || !service.enabled) {
        logger.warn('Service not found or disabled', { serviceName });
        return null;
      }
      
      const serviceUrl = service.service_url;
      const endpointPath = service.endpoint_path || '/api/fill-content-metrics';
      const fullUrl = `${serviceUrl}${endpointPath}`;
      
      // Build Universal Envelope request
      const envelope = {
        requester_service: 'coordinator',
        payload: {
          tenant_id,
          user_id,
          query_text,
          required_fields: metadata.required_fields || [],
          metadata: {
            ...metadata,
            source: 'coordinator',
            timestamp: new Date().toISOString(),
          },
        },
        response: null,
      };
      
      logger.info('Calling microservice', {
        service: serviceName,
        url: fullUrl,
        tenant_id,
      });
      
      // Make HTTP POST request
      const response = await axios.post(fullUrl, envelope, {
        headers: {
          'Content-Type': 'application/json',
          // Add authentication headers if needed
          // 'Authorization': `Bearer ${getServiceToken(serviceName)}`,
        },
        timeout: 10000, // 10 second timeout
      });
      
      // Validate envelope response
      if (!response.data || !response.data.response) {
        throw new Error('Invalid envelope response format');
      }
      
      return {
        service: serviceName,
        success: response.data.response.success,
        data: response.data.response.data,
        errors: response.data.response.errors || [],
        envelope: response.data,
      };
    } catch (error) {
      logger.error('Microservice call failed', {
        service: serviceName,
        error: error.message,
        code: error.code,
        tenant_id,
      });
      
      // Try fallback to mock data
      try {
        const mockData = await getMockData(serviceName);
        return {
          service: serviceName,
          success: false,
          data: mockData,
          errors: [{
            code: 'SERVICE_ERROR',
            message: error.message,
            fallback_used: true,
          }],
          fallback: true,
        };
      } catch (fallbackError) {
        logger.error('Fallback to mock data failed', {
          service: serviceName,
          error: fallbackError.message,
        });
        
        return {
          service: serviceName,
          success: false,
          data: null,
          errors: [{
            code: 'SERVICE_ERROR',
            message: error.message,
          }],
        };
      }
    }
  });
  
  const results = await Promise.allSettled(promises);
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      responses.push(result.value);
    } else {
      logger.warn('Microservice call promise rejected', {
        service: targetServices[index],
        error: result.reason?.message,
      });
    }
  });
  
  return responses;
}

/**
 * Get mock data fallback
 */
async function getMockData(serviceName) {
  // Try to fetch from service's mockData endpoint
  try {
    const service = await getSchemaRegistry().getService(serviceName);
    const mockUrl = `${service.service_url}/mockData/index.json`;
    const response = await axios.get(mockUrl, { timeout: 2000 });
    return response.data?.fallback_data || null;
  } catch (error) {
    logger.debug('Could not fetch mock data', { service: serviceName });
    return null;
  }
}
```

---

### Step 5: Implement Normalization Service

#### 5.1 Normalize Responses

**File:** `src/services/normalization.service.js`

**Purpose:** Normalize microservice responses into unified format

**Template:**

```javascript
import { logger } from '../utils/logger.js';
import { getSchemaRegistry } from '../registry/schema.registry.js';

/**
 * Normalize microservice responses
 * 
 * @param {Object} params
 * @param {Array} params.responses - Microservice responses
 * @param {Array<string>} params.targetServices - Service names
 * @param {string} params.tenant_id - Tenant ID
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Object>} Normalized fields map
 */
export async function normalizeResponse({ responses, targetServices, tenant_id, metadata = {} }) {
  try {
    const schemaRegistry = await getSchemaRegistry();
    const normalizedFields = {};
    
    // Process each response
    for (const response of responses) {
      if (!response.success || !response.data) {
        logger.debug('Skipping failed response', {
          service: response.service,
          errors: response.errors,
        });
        continue;
      }
      
      const serviceName = response.service;
      const serviceSchema = await schemaRegistry.getServiceSchema(serviceName);
      
      // Normalize fields based on schema
      const serviceFields = normalizeServiceFields({
        data: response.data,
        schema: serviceSchema,
        serviceName,
      });
      
      // Merge into normalized fields
      Object.assign(normalizedFields, serviceFields);
    }
    
    // Add metadata
    normalizedFields['_metadata'] = JSON.stringify({
      services: targetServices,
      timestamp: new Date().toISOString(),
      tenant_id,
      ...metadata,
    });
    
    logger.debug('Normalized responses', {
      services_count: targetServices.length,
      fields_count: Object.keys(normalizedFields).length,
    });
    
    return normalizedFields;
  } catch (error) {
    logger.error('Error normalizing responses', {
      error: error.message,
    });
    return {};
  }
}

/**
 * Normalize fields for a single service
 */
function normalizeServiceFields({ data, schema, serviceName }) {
  const normalized = {};
  
  if (!data || typeof data !== 'object') {
    return normalized;
  }
  
  // If schema exists, use it for field mapping
  if (schema && schema.field_mappings) {
    Object.entries(data).forEach(([key, value]) => {
      const mappedKey = schema.field_mappings[key] || key;
      normalized[`${serviceName}.${mappedKey}`] = 
        typeof value === 'object' ? JSON.stringify(value) : String(value);
    });
  } else {
    // Default: prefix with service name
    Object.entries(data).forEach(([key, value]) => {
      normalized[`${serviceName}.${key}`] = 
        typeof value === 'object' ? JSON.stringify(value) : String(value);
    });
  }
  
  // Handle content arrays
  if (Array.isArray(data.content)) {
    normalized[`${serviceName}.content`] = JSON.stringify(data.content);
  }
  
  return normalized;
}
```

---

### Step 6: Schema Registry Integration

#### 6.1 Schema Registry Service

**File:** `src/registry/schema.registry.js`

**Purpose:** Load and manage service schemas from migration files

**Template:**

```javascript
import { logger } from '../utils/logger.js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

let schemaRegistry = null;
let registeredServices = [];

/**
 * Get Schema Registry instance
 */
export async function getSchemaRegistry() {
  if (!schemaRegistry) {
    schemaRegistry = new SchemaRegistry();
    await schemaRegistry.load();
  }
  return schemaRegistry;
}

class SchemaRegistry {
  constructor() {
    this.services = new Map();
    this.schemas = new Map();
  }
  
  /**
   * Load services and schemas
   */
  async load() {
    try {
      // Load from database or migration files
      await this.loadServices();
      await this.loadSchemas();
      
      logger.info('Schema Registry loaded', {
        services_count: this.services.size,
        schemas_count: this.schemas.size,
      });
    } catch (error) {
      logger.error('Failed to load Schema Registry', {
        error: error.message,
      });
    }
  }
  
  /**
   * Load registered services
   */
  async loadServices() {
    // Option 1: Load from database
    // const dbServices = await db.query('SELECT * FROM coordinator.microservices');
    
    // Option 2: Load from migration files
    const migrationsPath = process.env.MIGRATIONS_PATH || './migrations';
    
    try {
      const files = readdirSync(migrationsPath);
      const serviceFiles = files.filter(f => f.includes('register_with_coordinator'));
      
      for (const file of serviceFiles) {
        const content = readFileSync(join(migrationsPath, file), 'utf-8');
        // Parse SQL to extract service info
        // This is a simplified example - adjust based on your migration format
        const serviceMatch = content.match(/service_name['"]?\s*,\s*['"]([^'"]+)['"]/);
        if (serviceMatch) {
          // Extract service details from migration
          // Store in this.services Map
        }
      }
    } catch (error) {
      logger.warn('Could not load services from migrations', {
        error: error.message,
      });
    }
    
    // Fallback: Load from environment or config
    const defaultServices = this.getDefaultServices();
    defaultServices.forEach(service => {
      this.services.set(service.service_name, service);
    });
  }
  
  /**
   * Load schemas
   */
  async loadSchemas() {
    // Load schema definitions from files or database
    // Store in this.schemas Map
  }
  
  /**
   * Get registered services
   */
  async getRegisteredServices() {
    return Array.from(this.services.values());
  }
  
  /**
   * Get service by name
   */
  async getService(serviceName) {
    return this.services.get(serviceName) || null;
  }
  
  /**
   * Get service schema
   */
  async getServiceSchema(serviceName) {
    return this.schemas.get(serviceName) || null;
  }
  
  /**
   * Get default services (fallback)
   */
  getDefaultServices() {
    return [
      {
        service_name: 'assessment',
        service_url: process.env.ASSESSMENT_SERVICE_URL || 'http://assessment:3000',
        endpoint_path: '/api/fill-content-metrics',
        enabled: true,
        metadata: {
          categories: ['assessment', 'test', 'exam'],
          supported_fields: ['questions', 'answers', 'scores'],
        },
      },
      // Add other default services...
    ];
  }
}
```

---

### Step 7: Error Handling & Fallbacks

#### 7.1 Error Handling Strategy

**Guidelines:**

1. **Timeout Handling:**
   - Set 10-second timeout for microservice calls
   - Return partial results if some services timeout
   - Log timeout errors

2. **Missing Responses:**
   - If service returns error, try mock data fallback
   - Continue with other services even if one fails
   - Return normalized fields from successful services only

3. **Envelope Validation:**
   - Validate envelope format before sending
   - Validate response envelope format
   - Return error in normalized format if validation fails

4. **Safe Defaults:**
   - Always return valid `RouteResponse` even on errors
   - Include error details in `routing_metadata`
   - Never throw unhandled exceptions

#### 7.2 Fallback Implementation

**Template:**

```javascript
/**
 * Handle service failure with fallback
 */
async function handleServiceFailure(serviceName, error) {
  logger.warn('Service failure, attempting fallback', {
    service: serviceName,
    error: error.message,
  });
  
  // Try mock data
  const mockData = await getMockData(serviceName);
  if (mockData) {
    return {
      service: serviceName,
      success: false,
      data: mockData,
      errors: [{
        code: 'FALLBACK_USED',
        message: `Service unavailable, using mock data: ${error.message}`,
      }],
      fallback: true,
    };
  }
  
  // Return empty response
  return {
    service: serviceName,
    success: false,
    data: null,
    errors: [{
      code: 'SERVICE_UNAVAILABLE',
      message: error.message,
    }],
  };
}
```

---

### Step 8: Monitoring & Observability

#### 8.1 Logging

**Add logging at key points:**

```javascript
// Log RAG → Coordinator calls
logger.info('Coordinator.Route() called', {
  tenant_id,
  user_id,
  query_length: query_text.length,
  timestamp: new Date().toISOString(),
});

// Log Coordinator → Microservice calls
logger.info('Calling microservice', {
  service: serviceName,
  url: fullUrl,
  tenant_id,
  timestamp: new Date().toISOString(),
});

// Log response times
logger.info('Coordinator.Route() completed', {
  processing_time_ms: Date.now() - startTime,
  services_called: targetServices.length,
  success_count: successfulResponses.length,
});
```

#### 8.2 Metrics

**Add metrics endpoints:**

```javascript
// In your main server file
app.get('/metrics', async (req, res) => {
  const metrics = {
    grpc: {
      requests_total: grpcRequestCount,
      requests_success: grpcSuccessCount,
      requests_error: grpcErrorCount,
      avg_response_time_ms: avgResponseTime,
    },
    microservices: {
      calls_total: microserviceCallCount,
      calls_success: microserviceSuccessCount,
      calls_timeout: microserviceTimeoutCount,
    },
    routing: {
      services_registered: registeredServicesCount,
      routes_processed: routesProcessedCount,
    },
  };
  
  res.json(metrics);
});
```

---

## ✅ Implementation Checklist

### Setup
- [ ] Install gRPC dependencies (`@grpc/grpc-js`, `@grpc/proto-loader`)
- [ ] Copy proto file from RAG repo
- [ ] Create folder structure (`src/grpc/`, `src/services/`, `src/registry/`)

### gRPC Server
- [ ] Create `src/grpc/server.js` with server setup
- [ ] Register `CoordinatorService` with `Route()` handler
- [ ] Start gRPC server alongside HTTP server
- [ ] Configure port and host via environment variables

### Route() Handler
- [ ] Implement `route()` function in `coordinator.service.js`
- [ ] Extract `RouteRequest` parameters
- [ ] Call routing service to determine target services
- [ ] Call microservices via Universal Envelope
- [ ] Normalize responses
- [ ] Build and return `RouteResponse`
- [ ] Handle errors gracefully

### Routing Service
- [ ] Implement `determineTargetServices()`
- [ ] Integrate with Schema Registry
- [ ] Implement `callMicroservices()`
- [ ] Build Universal Envelope requests
- [ ] Make HTTP POST calls to microservices
- [ ] Parse envelope responses
- [ ] Handle timeouts and errors

### Normalization Service
- [ ] Implement `normalizeResponse()`
- [ ] Load service schemas from registry
- [ ] Map fields according to schemas
- [ ] Merge multiple service responses
- [ ] Create normalized fields map

### Schema Registry
- [ ] Create `schema.registry.js`
- [ ] Load services from migrations/database
- [ ] Load schemas from files/database
- [ ] Implement `getService()` and `getServiceSchema()`
- [ ] Support service registration

### Error Handling
- [ ] Implement timeout handling (10 seconds)
- [ ] Implement fallback to mock data
- [ ] Validate envelope formats
- [ ] Return safe defaults on errors
- [ ] Never throw unhandled exceptions

### Monitoring
- [ ] Add logging for RAG → Coordinator calls
- [ ] Add logging for Coordinator → Microservice calls
- [ ] Add metrics endpoint (`/metrics`)
- [ ] Track response times
- [ ] Track success/error rates

### Testing
- [ ] Test gRPC server startup
- [ ] Test `Route()` with valid request
- [ ] Test routing to single microservice
- [ ] Test routing to multiple microservices
- [ ] Test error handling
- [ ] Test fallback to mock data
- [ ] Test normalization
- [ ] Test with RAG client

### Backward Compatibility
- [ ] Verify existing HTTP endpoints still work
- [ ] Verify existing functionality unchanged
- [ ] Test with existing clients
- [ ] No breaking changes to existing APIs

---

## 🔧 Environment Variables

Add to your `.env` file:

```env
# gRPC Configuration
GRPC_ENABLED=true
COORDINATOR_GRPC_PORT=50051
COORDINATOR_GRPC_HOST=0.0.0.0
COORDINATOR_PROTO_PATH=./src/grpc/proto/coordinator.proto

# Schema Registry
MIGRATIONS_PATH=./migrations
SCHEMA_REGISTRY_ENABLED=true

# Microservice URLs (if not in database)
ASSESSMENT_SERVICE_URL=http://assessment:3000
DEVLAB_SERVICE_URL=http://devlab:3000
CONTENT_SERVICE_URL=http://content:3000
# ... other services
```

---

## 📝 Code Templates Summary

### Key Files to Create:

1. **`src/grpc/server.js`** - gRPC server setup
2. **`src/grpc/services/coordinator.service.js`** - Route() handler
3. **`src/services/routing.service.js`** - Routing logic
4. **`src/services/normalization.service.js`** - Field normalization
5. **`src/registry/schema.registry.js`** - Schema Registry

### Key Functions to Implement:

1. `startGrpcServer()` - Initialize gRPC server
2. `route(call, callback)` - Handle Route() RPC
3. `determineTargetServices()` - Find which services to call
4. `callMicroservices()` - Call services via HTTP
5. `normalizeResponse()` - Normalize responses
6. `getSchemaRegistry()` - Access schema registry

---

## 🎯 Best Practices

1. **Error Handling:**
   - Always return valid `RouteResponse` even on errors
   - Log errors but don't throw unhandled exceptions
   - Use fallbacks for service failures

2. **Performance:**
   - Call microservices in parallel when possible
   - Set reasonable timeouts (10 seconds)
   - Cache schema registry if possible

3. **Logging:**
   - Log all RAG → Coordinator calls
   - Log all Coordinator → Microservice calls
   - Include timing information
   - Include tenant_id and user_id for tracing

4. **Security:**
   - Validate all inputs
   - Authenticate microservice calls if needed
   - Sanitize data before returning

5. **Maintainability:**
   - Keep routing logic separate from gRPC handling
   - Use dependency injection for services
   - Write unit tests for each service

---

## 🚀 Deployment Checklist

Before deploying:

- [ ] All environment variables configured
- [ ] Proto file copied and accessible
- [ ] gRPC server starts successfully
- [ ] Schema Registry loads correctly
- [ ] Microservice URLs are correct
- [ ] Health checks pass
- [ ] Metrics endpoint works
- [ ] Logging is configured
- [ ] Tests pass
- [ ] Backward compatibility verified

---

## 📚 Additional Resources

- **RAG Proto File:** `RAG_microservice/DATABASE/proto/rag/v1/coordinator.proto`
- **Microservice Integration Guide:** `RAG_microservice/COORDINATOR_PROMPTS/Microservice_Integration_Prompt.md`
- **Universal Envelope Format:** See Microservice Integration Guide

---

## 🎬 Next Steps

1. **Review this prompt** - Understand all requirements
2. **Set up environment** - Install dependencies, configure variables
3. **Create folder structure** - Set up directories
4. **Copy proto file** - Get proto from RAG repo
5. **Implement step by step** - Follow the checklist
6. **Test thoroughly** - Test each component
7. **Deploy** - Deploy to staging first

---

## ⚠️ Important Notes

- **DO NOT** modify existing Coordinator functionality
- **DO NOT** break backward compatibility
- **DO** test with RAG client before deploying
- **DO** monitor logs and metrics after deployment
- **DO** implement proper error handling
- **DO** use the Universal Envelope format exactly as specified

---

**Ready to implement?** Start with Step 1 and work through the checklist systematically.

**Questions?** Refer to the RAG microservice documentation or contact the RAG team.

---

**Last Updated:** 2025-01-27  
**Version:** 1.0.0  
**Status:** Ready for Implementation

