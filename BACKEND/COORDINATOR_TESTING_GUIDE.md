# Coordinator Integration Testing Guide

Complete testing guide for the Coordinator gRPC integration, including grpcurl commands and test scenarios.

## Prerequisites

1. **grpcurl** - Command-line tool for testing gRPC services
   ```bash
   # Install grpcurl
   # macOS
   brew install grpcurl
   
   # Linux
   wget https://github.com/fullstorydev/grpcurl/releases/download/v1.8.9/grpcurl_1.8.9_linux_x86_64.tar.gz
   tar -xzf grpcurl_1.8.9_linux_x86_64.tar.gz
   sudo mv grpcurl /usr/local/bin/
   
   # Windows (using Chocolatey)
   choco install grpcurl
   ```

2. **Coordinator Service Running**
   - Ensure Coordinator is running and accessible
   - Default: `coordinator:50051` (or `localhost:50051` for local)

3. **Proto File**
   - Located at: `DATABASE/proto/rag/v1/coordinator.proto`

## Testing with grpcurl

### Basic Route Request

```bash
grpcurl -plaintext \
  -d '{
    "tenant_id": "org-123",
    "user_id": "user-456",
    "query_text": "Show me my recent payments",
    "metadata": {
      "session_id": "abc-xyz",
      "source": "web_app"
    }
  }' \
  localhost:50051 \
  rag.v1.CoordinatorService/Route
```

### Using Proto File (Recommended)

```bash
grpcurl -plaintext \
  -proto DATABASE/proto/rag/v1/coordinator.proto \
  -d '{
    "tenant_id": "org-123",
    "user_id": "user-456",
    "query_text": "Show me my recent payments"
  }' \
  localhost:50051 \
  rag.v1.CoordinatorService/Route
```

### List Available Services

```bash
grpcurl -plaintext localhost:50051 list
```

### Describe Service

```bash
grpcurl -plaintext localhost:50051 describe rag.v1.CoordinatorService
```

### Describe Route Method

```bash
grpcurl -plaintext localhost:50051 describe rag.v1.CoordinatorService.Route
```

## Test Scenarios

### 1. Success at Primary Service

```bash
grpcurl -plaintext \
  -proto DATABASE/proto/rag/v1/coordinator.proto \
  -d '{
    "tenant_id": "org-123",
    "user_id": "user-456",
    "query_text": "Show me my recent payments",
    "metadata": {
      "category": "payment"
    }
  }' \
  localhost:50051 \
  rag.v1.CoordinatorService/Route
```

**Expected Response:**
```json
{
  "target_services": ["payment-service"],
  "normalized_fields": {
    "successful_service": "payment-service",
    "rank_used": "1",
    "total_attempts": "1",
    "stopped_reason": "found_good_response",
    "quality_score": "0.9",
    "primary_target": "payment-service",
    "primary_confidence": "0.95",
    "processing_time": "200ms"
  },
  "envelope_json": "{\"version\":\"1.0\",\"timestamp\":\"...\",\"payload\":{...}}",
  "routing_metadata": "{\"routing_strategy\":\"cascading_fallback\",...}"
}
```

### 2. Success at Fallback Service

```bash
grpcurl -plaintext \
  -proto DATABASE/proto/rag/v1/coordinator.proto \
  -d '{
    "tenant_id": "org-123",
    "user_id": "user-456",
    "query_text": "Show me my billing information",
    "metadata": {
      "category": "billing"
    }
  }' \
  localhost:50051 \
  rag.v1.CoordinatorService/Route
```

**Expected Response:**
```json
{
  "target_services": ["payment-service", "billing-service"],
  "normalized_fields": {
    "successful_service": "billing-service",
    "rank_used": "2",
    "total_attempts": "2",
    "stopped_reason": "found_good_response",
    "quality_score": "0.7",
    "primary_target": "payment-service",
    "primary_confidence": "0.85",
    "processing_time": "350ms"
  },
  "envelope_json": "{...}",
  "routing_metadata": "{...}"
}
```

### 3. All Services Failed

```bash
grpcurl -plaintext \
  -proto DATABASE/proto/rag/v1/coordinator.proto \
  -d '{
    "tenant_id": "org-123",
    "user_id": "user-456",
    "query_text": "Show me something that doesn't exist",
    "metadata": {
      "category": "unknown"
    }
  }' \
  localhost:50051 \
  rag.v1.CoordinatorService/Route
```

**Expected Response:**
```json
{
  "target_services": ["service-1", "service-2", "service-3"],
  "normalized_fields": {
    "successful_service": "none",
    "rank_used": "0",
    "total_attempts": "3",
    "stopped_reason": "exhausted_candidates",
    "quality_score": "0",
    "primary_target": "service-1",
    "primary_confidence": "0.6"
  },
  "envelope_json": "{}",
  "routing_metadata": "{...all attempts failed...}"
}
```

### 4. Timeout Test

```bash
grpcurl -plaintext \
  -max-time 5s \
  -proto DATABASE/proto/rag/v1/coordinator.proto \
  -d '{
    "tenant_id": "org-123",
    "user_id": "user-456",
    "query_text": "Slow query"
  }' \
  localhost:50051 \
  rag.v1.CoordinatorService/Route
```

### 5. Invalid Request (Missing Required Fields)

```bash
grpcurl -plaintext \
  -proto DATABASE/proto/rag/v1/coordinator.proto \
  -d '{
    "query_text": "Missing tenant_id and user_id"
  }' \
  localhost:50051 \
  rag.v1.CoordinatorService/Route
```

## Testing from Node.js

### Unit Test Example

```javascript
import { routeRequest } from '../clients/coordinator.client.js';
import { parseRouteResponse } from '../services/coordinatorResponseParser.service.js';

describe('Coordinator Integration', () => {
  it('should route request successfully', async () => {
    const response = await routeRequest({
      tenant_id: 'org-123',
      user_id: 'user-456',
      query_text: 'Show me my recent payments'
    });
    
    expect(response).toBeDefined();
    expect(response.target_services).toBeDefined();
    
    const parsed = parseRouteResponse(response);
    expect(parsed).toBeDefined();
    expect(parsed.status).toBeOneOf(['success_primary', 'success_fallback', 'all_failed']);
  });
  
  it('should handle timeout errors', async () => {
    // Set short timeout
    process.env.GRPC_TIMEOUT = '1';
    
    await expect(
      routeRequest({
        tenant_id: 'org-123',
        user_id: 'user-456',
        query_text: 'Slow query'
      })
    ).rejects.toThrow();
  });
});
```

### Integration Test Example

```javascript
import { callCoordinatorRoute, processCoordinatorResponse } from '../communication/communicationManager.service.js';

describe('Coordinator Communication Manager', () => {
  it('should call Coordinator and process response', async () => {
    const response = await callCoordinatorRoute({
      tenant_id: 'org-123',
      user_id: 'user-456',
      query_text: 'Show me my recent payments',
      metadata: {
        category: 'payment',
        source: 'rag_fallback'
      }
    });
    
    if (response) {
      const processed = processCoordinatorResponse(response);
      expect(processed).toBeDefined();
      
      if (processed.success) {
        expect(processed.business_data).toBeDefined();
        expect(processed.sources).toBeDefined();
      }
    }
  });
});
```

## Testing Error Scenarios

### 1. Service Unavailable

```bash
# Stop Coordinator service, then test
grpcurl -plaintext \
  -proto DATABASE/proto/rag/v1/coordinator.proto \
  -d '{"tenant_id":"org-123","user_id":"user-456","query_text":"test"}' \
  localhost:50051 \
  rag.v1.CoordinatorService/Route
```

**Expected Error:**
```
Error: rpc error: code = Unavailable desc = connection error
```

### 2. Invalid Proto Path

```javascript
// In coordinator.client.js, set invalid path
process.env.COORDINATOR_PROTO_PATH = '/invalid/path.proto';

// Should log error and return null client
```

### 3. Invalid Service Name

```javascript
// In coordinator.client.js, set invalid service name
process.env.COORDINATOR_SERVICE_NAME = 'invalid.service';

// Should throw error when creating client
```

## Verifying Response Parsing

### Test Response Parser

```javascript
import { parseRouteResponse, extractBusinessData } from '../services/coordinatorResponseParser.service.js';

// Mock response
const mockResponse = {
  target_services: ['payment-service'],
  normalized_fields: {
    successful_service: 'payment-service',
    rank_used: '1',
    total_attempts: '1',
    stopped_reason: 'found_good_response',
    quality_score: '0.9',
    primary_target: 'payment-service',
    primary_confidence: '0.95',
    processing_time: '200ms'
  },
  envelope_json: JSON.stringify({
    version: '1.0',
    timestamp: new Date().toISOString(),
    payload: { payments: [] }
  }),
  routing_metadata: JSON.stringify({
    routing_strategy: 'cascading_fallback',
    execution: {
      total_attempts: 1,
      successful_rank: 1
    }
  })
};

const parsed = parseRouteResponse(mockResponse);
console.log('Parsed:', parsed);

const businessData = extractBusinessData(parsed);
console.log('Business Data:', businessData);
```

## Monitoring Tests

### Test Metrics

```javascript
import { getMetrics, resetMetrics } from '../clients/coordinator.client.js';

// Make some requests
await routeRequest({ tenant_id: 'org-123', user_id: 'user-456', query_text: 'test' });

// Get metrics
const metrics = getMetrics();
console.log('Metrics:', metrics);

// Reset metrics
resetMetrics();
```

### Test Availability Check

```javascript
import { isCoordinatorAvailable } from '../clients/coordinator.client.js';

const available = await isCoordinatorAvailable();
console.log('Coordinator available:', available);
```

## Continuous Testing

### Health Check Script

Create `scripts/test-coordinator-health.js`:

```javascript
import { isCoordinatorAvailable, getMetrics } from '../src/clients/coordinator.client.js';

async function healthCheck() {
  const available = await isCoordinatorAvailable();
  const metrics = getMetrics();
  
  console.log('Coordinator Health Check:');
  console.log('  Available:', available);
  console.log('  Total Requests:', metrics.totalRequests);
  console.log('  Success Rate:', metrics.successRate + '%');
  console.log('  Fallback Rate:', metrics.fallbackRate + '%');
  console.log('  Avg Processing Time:', metrics.averageProcessingTimeMs + 'ms');
  
  if (!available) {
    process.exit(1);
  }
}

healthCheck();
```

Run with:
```bash
node scripts/test-coordinator-health.js
```

## Debugging Tips

1. **Enable Debug Logging**
   ```bash
   LOG_LEVEL=debug npm start
   ```

2. **Check gRPC Connection**
   ```bash
   # Test basic connectivity
   grpcurl -plaintext localhost:50051 list
   ```

3. **Inspect Proto File**
   ```bash
   cat DATABASE/proto/rag/v1/coordinator.proto
   ```

4. **Monitor Network Traffic**
   ```bash
   # Use tcpdump or Wireshark to inspect gRPC traffic
   tcpdump -i any -A -s 0 'tcp port 50051'
   ```

5. **Check Environment Variables**
   ```javascript
   console.log('COORDINATOR_URL:', process.env.COORDINATOR_URL);
   console.log('COORDINATOR_GRPC_PORT:', process.env.COORDINATOR_GRPC_PORT);
   console.log('GRPC_TIMEOUT:', process.env.GRPC_TIMEOUT);
   ```

## Common Issues

### Issue: Connection Refused

**Solution:**
- Verify Coordinator is running
- Check `COORDINATOR_URL` and `COORDINATOR_GRPC_PORT`
- For Docker, ensure services are on same network

### Issue: Proto File Not Found

**Solution:**
- Verify `COORDINATOR_PROTO_PATH` is correct
- Use absolute path if relative path doesn't work
- Check file permissions

### Issue: Service Not Found

**Solution:**
- Verify `COORDINATOR_SERVICE_NAME` matches proto definition
- Check proto file package name
- Ensure service name is fully qualified (e.g., `rag.v1.CoordinatorService`)

### Issue: Timeout Errors

**Solution:**
- Increase `GRPC_TIMEOUT` value
- Check Coordinator service performance
- Verify network latency

## Next Steps

1. Run basic grpcurl tests to verify Coordinator is accessible
2. Test all three scenarios (primary success, fallback success, all failed)
3. Verify response parsing with test data
4. Set up monitoring and health checks
5. Review logs for any errors or warnings













