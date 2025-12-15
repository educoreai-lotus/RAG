# Microservice gRPC Implementation Guide

**Document Version:** 1.0  
**Last Updated:** 2025-01-27  
**Purpose:** Step-by-step guide for developers to add gRPC server to their microservice

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Complete Code Template](#complete-code-template)
5. [Configuration](#configuration)
6. [Testing](#testing)
7. [Common Mistakes & Troubleshooting](#common-mistakes--troubleshooting)
8. [Best Practices](#best-practices)

---

## Prerequisites

### Required Knowledge

- Basic understanding of gRPC and Protocol Buffers
- Node.js (v20+) or your preferred language
- Understanding of microservice architecture

### Required Tools

- Node.js v20+ (for JavaScript/TypeScript)
- Protocol Buffer compiler (`protoc`) - Optional (for code generation)
- gRPC libraries for your language

---

## Quick Start

### 1. Install Dependencies

**Node.js/JavaScript:**
```bash
npm install @grpc/grpc-js @grpc/proto-loader
```

**Python:**
```bash
pip install grpcio grpcio-tools
```

**Go:**
```bash
go get google.golang.org/grpc
```

### 2. Copy Proto File

Copy the relevant proto file from `DATABASE/proto/rag/v1/` to your microservice.

**Example:** If implementing Coordinator service:
```bash
cp DATABASE/proto/rag/v1/coordinator.proto your-microservice/proto/
```

### 3. Implement Service Handler

See [Complete Code Template](#complete-code-template) below.

### 4. Start gRPC Server

```javascript
const server = new grpc.Server();
server.addService(CoordinatorService, {
  Route: handleRoute
});
server.bindAsync('0.0.0.0:50051', credentials, () => {
  server.start();
});
```

---

## Step-by-Step Implementation

### Step 1: Define Your Service Contract

**Option A: Use Existing Proto File**

Copy from `DATABASE/proto/rag/v1/`:
- `coordinator.proto` - For Coordinator service
- `query.proto` - For Query service
- `personalized.proto` - For Personalized service
- Or create your own `.proto` file

**Option B: Create Custom Proto File**

Create `your-service.proto`:

```protobuf
syntax = "proto3";

package yourservice.v1;

service YourService {
  rpc YourMethod(YourRequest) returns (YourResponse);
}

message YourRequest {
  string tenant_id = 1;
  string user_id = 2;
  string query_text = 3;
  map<string, string> context = 4;
}

message YourResponse {
  repeated string target_services = 1;
  map<string, string> normalized_fields = 2;
  string envelope_json = 3;
}
```

### Step 2: Install Dependencies

**Node.js:**
```bash
npm install @grpc/grpc-js @grpc/proto-loader
```

**package.json:**
```json
{
  "dependencies": {
    "@grpc/grpc-js": "^1.10.0",
    "@grpc/proto-loader": "^0.7.11"
  }
}
```

### Step 3: Load Proto File

**Node.js Example:**

```javascript
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load proto file
const PROTO_PATH = join(__dirname, '../proto/rag/v1/coordinator.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const coordinatorProto = protoDescriptor.rag.v1;
```

### Step 4: Implement Service Handler

**Example: Coordinator Service Route Handler**

```javascript
/**
 * Handle Route RPC call
 * @param {Object} call - gRPC call object
 * @param {Function} callback - gRPC callback function
 */
async function handleRoute(call, callback) {
  try {
    const request = call.request;
    
    // 1. Validate request
    if (!request.tenant_id || !request.user_id || !request.query_text) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'Missing required fields: tenant_id, user_id, query_text'
      });
    }
    
    // 2. Validate signature (from metadata)
    const metadata = call.metadata;
    const signature = metadata.get('x-signature')[0];
    const timestamp = metadata.get('x-timestamp')[0];
    const requesterService = metadata.get('x-requester-service')[0];
    
    if (!validateSignature(signature, timestamp, requesterService, request)) {
      return callback({
        code: grpc.status.UNAUTHENTICATED,
        message: 'Invalid signature'
      });
    }
    
    // 3. Parse Universal Envelope
    const envelope = JSON.parse(request.envelope_json || '{}');
    
    // 4. Route to target microservices
    const targetServices = await routeToMicroservices(request, envelope);
    
    // 5. Aggregate responses
    const normalizedFields = await aggregateResponses(targetServices);
    
    // 6. Build response
    const response = {
      target_services: targetServices.map(s => s.name),
      normalized_fields: normalizedFields,
      envelope_json: JSON.stringify({
        ...envelope,
        response_timestamp: new Date().toISOString()
      }),
      routing_metadata: JSON.stringify({
        routing_time_ms: Date.now() - parseInt(timestamp),
        services_called: targetServices.length
      })
    };
    
    callback(null, response);
  } catch (error) {
    console.error('Route handler error:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
}
```

### Step 5: Create gRPC Server

```javascript
import * as grpc from '@grpc/grpc-js';

// Get credentials (insecure for dev, SSL for prod)
function getCredentials() {
  if (process.env.GRPC_USE_SSL === 'true') {
    // Production: Use SSL/TLS
    const rootCert = process.env.GRPC_ROOT_CERT;
    if (rootCert) {
      return grpc.credentials.createSsl(
        Buffer.from(rootCert, 'base64')
      );
    }
    return grpc.credentials.createSsl();
  }
  
  // Development: Insecure
  return grpc.credentials.createInsecure();
}

// Create server
const server = new grpc.Server();

// Add service
server.addService(coordinatorProto.CoordinatorService.service, {
  Route: handleRoute
});

// Start server
const PORT = process.env.GRPC_PORT || '50051';
const HOST = process.env.GRPC_HOST || '0.0.0.0';

server.bindAsync(
  `${HOST}:${PORT}`,
  getCredentials(),
  (error, port) => {
    if (error) {
      console.error('Failed to start gRPC server:', error);
      process.exit(1);
    }
    
    server.start();
    console.log(`gRPC server listening on ${HOST}:${PORT}`);
  }
);
```

### Step 6: Add Signature Validation

```javascript
import crypto from 'crypto';

/**
 * Validate signature from RAG service
 */
function validateSignature(signature, timestamp, requesterService, request) {
  try {
    // 1. Check timestamp freshness (prevent replay attacks)
    const requestTime = parseInt(timestamp);
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    if (Math.abs(now - requestTime) > maxAge) {
      console.warn('Signature timestamp too old');
      return false;
    }
    
    // 2. Get public key for requester service
    const publicKey = getPublicKeyForService(requesterService);
    if (!publicKey) {
      console.warn('No public key found for service:', requesterService);
      return false;
    }
    
    // 3. Reconstruct message
    const payload = {
      tenant_id: request.tenant_id,
      user_id: request.user_id,
      query_text: request.query_text,
      requester_service: requesterService,
      timestamp: requestTime
    };
    
    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    
    const message = `educoreai-${requesterService}-${payloadHash}`;
    
    // 4. Verify signature
    const verify = crypto.createVerify('SHA256');
    verify.update(message);
    verify.end();
    
    return verify.verify(publicKey, signature, 'base64');
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}

/**
 * Get public key for a service
 * In production, fetch from key management service
 */
function getPublicKeyForService(serviceName) {
  // Example: Load from environment or key management service
  const publicKeyBase64 = process.env[`${serviceName.toUpperCase()}_PUBLIC_KEY`];
  if (!publicKeyBase64) {
    return null;
  }
  
  return Buffer.from(publicKeyBase64, 'base64').toString('utf-8');
}
```

### Step 7: Handle Errors Properly

```javascript
function handleRoute(call, callback) {
  try {
    // ... your logic ...
  } catch (error) {
    // Map errors to gRPC status codes
    const grpcError = mapToGrpcError(error);
    callback(grpcError);
  }
}

function mapToGrpcError(error) {
  // Map common errors to gRPC status codes
  if (error.code === 'VALIDATION_ERROR') {
    return {
      code: grpc.status.INVALID_ARGUMENT,
      message: error.message
    };
  }
  
  if (error.code === 'NOT_FOUND') {
    return {
      code: grpc.status.NOT_FOUND,
      message: error.message
    };
  }
  
  if (error.code === 'UNAUTHORIZED') {
    return {
      code: grpc.status.UNAUTHENTICATED,
      message: error.message
    };
  }
  
  // Default: Internal error
  return {
    code: grpc.status.INTERNAL,
    message: error.message || 'Internal server error'
  };
}
```

---

## Complete Code Template

### Node.js/JavaScript Template

**File: `src/grpc/server.js`**

```javascript
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const PROTO_PATH = process.env.PROTO_PATH || 
  join(__dirname, '../../proto/rag/v1/coordinator.proto');
const GRPC_PORT = process.env.GRPC_PORT || '50051';
const GRPC_HOST = process.env.GRPC_HOST || '0.0.0.0';

// ============================================================================
// Load Proto File
// ============================================================================

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const coordinatorProto = protoDescriptor.rag.v1;

// ============================================================================
// Signature Validation
// ============================================================================

function validateSignature(signature, timestamp, requesterService, request) {
  try {
    // Check timestamp freshness
    const requestTime = parseInt(timestamp);
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    if (Math.abs(now - requestTime) > maxAge) {
      console.warn('Signature timestamp too old');
      return false;
    }
    
    // Get public key
    const publicKeyBase64 = process.env[`${requesterService.toUpperCase()}_PUBLIC_KEY`];
    if (!publicKeyBase64) {
      console.warn('No public key found for service:', requesterService);
      return false;
    }
    
    const publicKey = Buffer.from(publicKeyBase64, 'base64').toString('utf-8');
    
    // Reconstruct message
    const payload = {
      tenant_id: request.tenant_id,
      user_id: request.user_id,
      query_text: request.query_text,
      requester_service: requesterService,
      timestamp: requestTime
    };
    
    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    
    const message = `educoreai-${requesterService}-${payloadHash}`;
    
    // Verify signature
    const verify = crypto.createVerify('SHA256');
    verify.update(message);
    verify.end();
    
    return verify.verify(publicKey, signature, 'base64');
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}

// ============================================================================
// Service Handlers
// ============================================================================

/**
 * Handle Route RPC call
 */
async function handleRoute(call, callback) {
  try {
    const request = call.request;
    
    // 1. Validate request
    if (!request.tenant_id || !request.user_id || !request.query_text) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'Missing required fields: tenant_id, user_id, query_text'
      });
    }
    
    // 2. Validate signature
    const metadata = call.metadata;
    const signature = metadata.get('x-signature')?.[0];
    const timestamp = metadata.get('x-timestamp')?.[0];
    const requesterService = metadata.get('x-requester-service')?.[0];
    
    if (!signature || !timestamp || !requesterService) {
      return callback({
        code: grpc.status.UNAUTHENTICATED,
        message: 'Missing authentication metadata'
      });
    }
    
    if (!validateSignature(signature, timestamp, requesterService, request)) {
      return callback({
        code: grpc.status.UNAUTHENTICATED,
        message: 'Invalid signature'
      });
    }
    
    // 3. Parse Universal Envelope
    let envelope = {};
    try {
      envelope = JSON.parse(request.envelope_json || '{}');
    } catch (error) {
      console.warn('Failed to parse envelope_json:', error);
    }
    
    // 4. Route to target microservices (your logic here)
    const targetServices = await routeToMicroservices(request, envelope);
    
    // 5. Aggregate responses (your logic here)
    const normalizedFields = await aggregateResponses(targetServices);
    
    // 6. Build response
    const response = {
      target_services: targetServices.map(s => s.name),
      normalized_fields: normalizedFields,
      envelope_json: JSON.stringify({
        ...envelope,
        response_timestamp: new Date().toISOString()
      }),
      routing_metadata: JSON.stringify({
        routing_time_ms: Date.now() - parseInt(timestamp),
        services_called: targetServices.length
      })
    };
    
    callback(null, response);
  } catch (error) {
    console.error('Route handler error:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Route to target microservices
 * TODO: Implement your routing logic
 */
async function routeToMicroservices(request, envelope) {
  // Example: Determine which microservices to call based on query
  const queryText = request.query_text.toLowerCase();
  const services = [];
  
  if (queryText.includes('assessment')) {
    services.push({ name: 'assessment-service', priority: 1 });
  }
  
  if (queryText.includes('devlab') || queryText.includes('code')) {
    services.push({ name: 'devlab-service', priority: 1 });
  }
  
  // Call each service and collect responses
  // TODO: Implement actual gRPC calls to microservices
  
  return services;
}

/**
 * Aggregate responses from microservices
 * TODO: Implement your aggregation logic
 */
async function aggregateResponses(services) {
  const normalizedFields = {};
  
  // Example: Aggregate data from all services
  normalizedFields.services_called = services.length.toString();
  normalizedFields.timestamp = Date.now().toString();
  
  // TODO: Add actual normalized fields from microservice responses
  
  return normalizedFields;
}

// ============================================================================
// Get Credentials
// ============================================================================

function getCredentials() {
  if (process.env.GRPC_USE_SSL === 'true') {
    console.log('Using SSL/TLS credentials for gRPC');
    const rootCert = process.env.GRPC_ROOT_CERT;
    if (rootCert) {
      return grpc.credentials.createSsl(
        Buffer.from(rootCert, 'base64')
      );
    }
    return grpc.credentials.createSsl();
  }
  
  console.log('Using insecure credentials for gRPC (development)');
  return grpc.credentials.createInsecure();
}

// ============================================================================
// Start Server
// ============================================================================

const server = new grpc.Server();

// Add service
server.addService(coordinatorProto.CoordinatorService.service, {
  Route: handleRoute
});

// Start server
server.bindAsync(
  `${GRPC_HOST}:${GRPC_PORT}`,
  getCredentials(),
  (error, port) => {
    if (error) {
      console.error('Failed to start gRPC server:', error);
      process.exit(1);
    }
    
    server.start();
    console.log(`✅ gRPC server listening on ${GRPC_HOST}:${port}`);
    console.log(`   Proto: ${PROTO_PATH}`);
    console.log(`   Service: CoordinatorService`);
  }
);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gRPC server...');
  server.tryShutdown((error) => {
    if (error) {
      console.error('Error shutting down server:', error);
      process.exit(1);
    }
    console.log('gRPC server shut down gracefully');
    process.exit(0);
  });
});
```

### Python Template

**File: `grpc_server.py`**

```python
import grpc
from concurrent import futures
import json
import time
import hashlib
import hmac
from proto import coordinator_pb2, coordinator_pb2_grpc

class CoordinatorService(coordinator_pb2_grpc.CoordinatorServiceServicer):
    def Route(self, request, context):
        # 1. Validate request
        if not request.tenant_id or not request.user_id or not request.query_text:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details('Missing required fields')
            return coordinator_pb2.RouteResponse()
        
        # 2. Validate signature
        metadata = dict(context.invocation_metadata())
        signature = metadata.get('x-signature', '')
        timestamp = metadata.get('x-timestamp', '')
        requester_service = metadata.get('x-requester-service', '')
        
        if not self.validate_signature(signature, timestamp, requester_service, request):
            context.set_code(grpc.StatusCode.UNAUTHENTICATED)
            context.set_details('Invalid signature')
            return coordinator_pb2.RouteResponse()
        
        # 3. Parse envelope
        try:
            envelope = json.loads(request.envelope_json or '{}')
        except json.JSONDecodeError:
            envelope = {}
        
        # 4. Route to microservices
        target_services = self.route_to_microservices(request, envelope)
        
        # 5. Aggregate responses
        normalized_fields = self.aggregate_responses(target_services)
        
        # 6. Build response
        return coordinator_pb2.RouteResponse(
            target_services=[s['name'] for s in target_services],
            normalized_fields=normalized_fields,
            envelope_json=json.dumps({
                **envelope,
                'response_timestamp': time.time()
            }),
            routing_metadata=json.dumps({
                'routing_time_ms': int(time.time() * 1000) - int(timestamp),
                'services_called': len(target_services)
            })
        )
    
    def validate_signature(self, signature, timestamp, requester_service, request):
        # TODO: Implement signature validation
        return True
    
    def route_to_microservices(self, request, envelope):
        # TODO: Implement routing logic
        return []
    
    def aggregate_responses(self, services):
        # TODO: Implement aggregation logic
        return {}

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    coordinator_pb2_grpc.add_CoordinatorServiceServicer_to_server(
        CoordinatorService(), server
    )
    
    port = os.getenv('GRPC_PORT', '50051')
    server.add_insecure_port(f'[::]:{port}')
    server.start()
    print(f'✅ gRPC server listening on port {port}')
    server.wait_for_termination()

if __name__ == '__main__':
    serve()
```

---

## Configuration

### Environment Variables

**Required:**
```bash
# gRPC Server
GRPC_PORT=50051
GRPC_HOST=0.0.0.0

# Proto file path
PROTO_PATH=./proto/rag/v1/coordinator.proto

# Authentication (for signature validation)
RAG_SERVICE_PUBLIC_KEY=<base64-encoded-public-key>
```

**Optional:**
```bash
# TLS/SSL (production)
GRPC_USE_SSL=true
GRPC_ROOT_CERT=<base64-encoded-cert>

# Service name
SERVICE_NAME=coordinator-service
```

### Docker Configuration

**Dockerfile:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 50051

CMD ["node", "src/grpc/server.js"]
```

**docker-compose.yml:**
```yaml
services:
  your-microservice:
    build: .
    ports:
      - "50051:50051"
    environment:
      - GRPC_PORT=50051
      - GRPC_HOST=0.0.0.0
      - RAG_SERVICE_PUBLIC_KEY=${RAG_SERVICE_PUBLIC_KEY}
    networks:
      - educore-network
```

---

## Testing

### 1. Unit Testing

**Example Test (Node.js with Jest):**

```javascript
import { handleRoute } from '../src/grpc/server.js';
import * as grpc from '@grpc/grpc-js';

describe('CoordinatorService', () => {
  it('should handle valid Route request', async () => {
    const call = {
      request: {
        tenant_id: 'tenant-123',
        user_id: 'user-456',
        query_text: 'Show my assessments',
        requester_service: 'rag-service',
        context: {},
        envelope_json: JSON.stringify({
          version: '1.0',
          tenant_id: 'tenant-123',
          user_id: 'user-456'
        })
      },
      metadata: new grpc.Metadata()
    };
    
    call.metadata.add('x-signature', 'valid-signature');
    call.metadata.add('x-timestamp', Date.now().toString());
    call.metadata.add('x-requester-service', 'rag-service');
    
    const callback = jest.fn();
    
    await handleRoute(call, callback);
    
    expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({
      target_services: expect.any(Array),
      normalized_fields: expect.any(Object)
    }));
  });
  
  it('should reject request with missing fields', async () => {
    const call = {
      request: {
        tenant_id: 'tenant-123'
        // Missing user_id and query_text
      },
      metadata: new grpc.Metadata()
    };
    
    const callback = jest.fn();
    
    await handleRoute(call, callback);
    
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        code: grpc.status.INVALID_ARGUMENT
      })
    );
  });
});
```

### 2. Integration Testing

**Test with gRPC Client:**

```javascript
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

// Load proto
const packageDefinition = protoLoader.loadSync('./proto/rag/v1/coordinator.proto', {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const coordinatorProto = protoDescriptor.rag.v1;

// Create client
const client = new coordinatorProto.CoordinatorService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

// Make request
const request = {
  tenant_id: 'tenant-123',
  user_id: 'user-456',
  query_text: 'Show my assessments',
  requester_service: 'rag-service',
  context: {},
  envelope_json: JSON.stringify({
    version: '1.0',
    tenant_id: 'tenant-123',
    user_id: 'user-456'
  })
};

const metadata = new grpc.Metadata();
metadata.add('x-signature', 'test-signature');
metadata.add('x-timestamp', Date.now().toString());
metadata.add('x-requester-service', 'rag-service');

client.Route(request, metadata, (error, response) => {
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Response:', response);
  }
});
```

### 3. Manual Testing with grpcurl

**Install grpcurl:**
```bash
# macOS
brew install grpcurl

# Linux
wget https://github.com/fullstorydev/grpcurl/releases/download/v1.8.9/grpcurl_1.8.9_linux_x86_64.tar.gz
tar -xzf grpcurl_1.8.9_linux_x86_64.tar.gz
```

**Test Route RPC:**
```bash
grpcurl -plaintext \
  -d '{
    "tenant_id": "tenant-123",
    "user_id": "user-456",
    "query_text": "Show my assessments",
    "requester_service": "rag-service",
    "envelope_json": "{\"version\":\"1.0\"}"
  }' \
  -H "x-signature: test-signature" \
  -H "x-timestamp: 1234567890" \
  -H "x-requester-service: rag-service" \
  localhost:50051 \
  rag.v1.CoordinatorService/Route
```

---

## Common Mistakes & Troubleshooting

### Mistake 1: Missing Signature Validation

**Problem:**
```javascript
// ❌ Wrong: No signature validation
async function handleRoute(call, callback) {
  const request = call.request;
  // Process request without validating signature
}
```

**Solution:**
```javascript
// ✅ Correct: Validate signature
async function handleRoute(call, callback) {
  const metadata = call.metadata;
  const signature = metadata.get('x-signature')?.[0];
  
  if (!validateSignature(signature, ...)) {
    return callback({
      code: grpc.status.UNAUTHENTICATED,
      message: 'Invalid signature'
    });
  }
  // Process request...
}
```

### Mistake 2: Incorrect Error Handling

**Problem:**
```javascript
// ❌ Wrong: Throwing errors instead of using callback
async function handleRoute(call, callback) {
  if (!request.tenant_id) {
    throw new Error('Missing tenant_id'); // Wrong!
  }
}
```

**Solution:**
```javascript
// ✅ Correct: Use callback for errors
async function handleRoute(call, callback) {
  if (!request.tenant_id) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: 'Missing tenant_id'
    });
  }
}
```

### Mistake 3: Not Handling Metadata Correctly

**Problem:**
```javascript
// ❌ Wrong: Accessing metadata incorrectly
const signature = call.metadata.x-signature; // Wrong!
```

**Solution:**
```javascript
// ✅ Correct: Use get() method
const metadata = call.metadata;
const signature = metadata.get('x-signature')?.[0];
```

### Mistake 4: Wrong Proto File Path

**Problem:**
```javascript
// ❌ Wrong: Hardcoded path
const PROTO_PATH = '/absolute/path/to/proto';
```

**Solution:**
```javascript
// ✅ Correct: Use relative path or environment variable
const PROTO_PATH = process.env.PROTO_PATH || 
  join(__dirname, '../../proto/rag/v1/coordinator.proto');
```

### Common Errors

#### Error: "Service not found"
**Cause:** Proto file not loaded correctly or service name mismatch  
**Solution:** Check proto file path and service name

#### Error: "Connection refused"
**Cause:** Server not running or wrong port  
**Solution:** Check server is running and port is correct

#### Error: "Invalid signature"
**Cause:** Signature validation failing  
**Solution:** Check public key configuration and signature format

#### Error: "Deadline exceeded"
**Cause:** Request taking too long  
**Solution:** Increase timeout or optimize handler logic

---

## Best Practices

### 1. Error Handling

✅ **Always use callback for errors:**
```javascript
callback({
  code: grpc.status.INVALID_ARGUMENT,
  message: 'Clear error message'
});
```

✅ **Map errors to appropriate gRPC status codes:**
- `INVALID_ARGUMENT` - Bad request data
- `UNAUTHENTICATED` - Authentication failed
- `PERMISSION_DENIED` - Authorization failed
- `NOT_FOUND` - Resource not found
- `INTERNAL` - Server error

### 2. Logging

✅ **Log all requests and errors:**
```javascript
console.log('Received Route request:', {
  tenant_id: request.tenant_id,
  user_id: request.user_id,
  query_preview: request.query_text.substring(0, 50)
});
```

### 3. Performance

✅ **Use async/await for async operations:**
```javascript
async function handleRoute(call, callback) {
  try {
    const result = await someAsyncOperation();
    callback(null, result);
  } catch (error) {
    callback({ code: grpc.status.INTERNAL, message: error.message });
  }
}
```

### 4. Security

✅ **Always validate signatures:**
```javascript
if (!validateSignature(signature, timestamp, requesterService, request)) {
  return callback({
    code: grpc.status.UNAUTHENTICATED,
    message: 'Invalid signature'
  });
}
```

✅ **Check timestamp freshness:**
```javascript
const maxAge = 5 * 60 * 1000; // 5 minutes
if (Math.abs(Date.now() - parseInt(timestamp)) > maxAge) {
  return callback({
    code: grpc.status.UNAUTHENTICATED,
    message: 'Request expired'
  });
}
```

### 5. Testing

✅ **Write unit tests for handlers:**
```javascript
describe('handleRoute', () => {
  it('should validate required fields', ...);
  it('should validate signature', ...);
  it('should handle errors gracefully', ...);
});
```

✅ **Test with real gRPC client:**
```javascript
const client = new coordinatorProto.CoordinatorService(...);
client.Route(request, metadata, callback);
```

---

## Summary

### Checklist

- [ ] Install gRPC dependencies
- [ ] Copy/create proto file
- [ ] Load proto file
- [ ] Implement service handler
- [ ] Add signature validation
- [ ] Handle errors properly
- [ ] Configure environment variables
- [ ] Write tests
- [ ] Deploy and test

### Next Steps

1. **Implement your routing logic** in `routeToMicroservices()`
2. **Implement aggregation logic** in `aggregateResponses()`
3. **Add health check endpoint** (see `health.proto`)
4. **Set up monitoring** and logging
5. **Configure TLS/SSL** for production

---

## Related Documentation

- [GRPC_COMMUNICATION_ARCHITECTURE.md](./GRPC_COMMUNICATION_ARCHITECTURE.md) - Architecture overview
- Proto files: `DATABASE/proto/rag/v1/*.proto`
- [MICROSERVICE_INTEGRATION.md](./MICROSERVICE_INTEGRATION.md) - General integration guide

---

**Document Maintained By:** RAG Microservice Team  
**Questions?** Contact the development team or refer to architecture document.







