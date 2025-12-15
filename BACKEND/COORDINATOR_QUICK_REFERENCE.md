# Coordinator Integration Quick Reference

Quick reference guide for the Coordinator gRPC integration.

## Quick Start

```javascript
import { routeRequest } from './clients/coordinator.client.js';
import { parseRouteResponse, extractBusinessData } from './services/coordinatorResponseParser.service.js';

// Make request
const response = await routeRequest({
  tenant_id: 'org-123',
  user_id: 'user-456',
  query_text: 'Show me my recent payments'
});

// Parse response
const parsed = parseRouteResponse(response);
const businessData = extractBusinessData(parsed);
```

## Configuration

```bash
COORDINATOR_ENABLED=true
COORDINATOR_URL=coordinator          # or localhost for local dev
COORDINATOR_GRPC_PORT=50051
GRPC_TIMEOUT=30                      # seconds
```

## Response Statuses

- `success_primary` - Primary service succeeded (rank 1)
- `success_fallback` - Fallback service succeeded (rank > 1)
- `all_failed` - All services failed

## Key Functions

### Client Functions
- `routeRequest({ tenant_id, user_id, query_text, metadata })` - Make route request
- `isCoordinatorAvailable()` - Check if Coordinator is available
- `getMetrics()` - Get monitoring metrics
- `resetMetrics()` - Reset metrics

### Parser Functions
- `parseRouteResponse(response)` - Parse Coordinator response
- `extractBusinessData(parsed)` - Extract business data
- `getRoutingSummary(parsed)` - Get routing summary
- `isAllFailed(parsed)` - Check if all services failed
- `isFallbackUsed(parsed)` - Check if fallback was used
- `getQualityAssessment(parsed)` - Get quality assessment

### Communication Manager (Recommended)
- `callCoordinatorRoute({ tenant_id, user_id, query_text, metadata })` - Call with decision logic
- `processCoordinatorResponse(response)` - Process response

## Response Structure

```javascript
{
  status: 'success_primary' | 'success_fallback' | 'all_failed',
  success: true | false,
  successful_service: 'service-name' | 'none',
  rank_used: 1,
  quality_score: 0.9,
  business_data: { ... },
  sources: [ ... ],
  metadata: { ... }
}
```

## Error Handling

```javascript
try {
  const response = await routeRequest({ ... });
  if (!response) {
    // Coordinator unavailable
    return handleFallback();
  }
  // Process response...
} catch (error) {
  // Handle gRPC errors
  if (error.code === grpc.status.DEADLINE_EXCEEDED) {
    // Timeout
  } else if (error.code === grpc.status.UNAVAILABLE) {
    // Service unavailable
  }
}
```

## Testing with grpcurl

```bash
grpcurl -plaintext \
  -proto DATABASE/proto/rag/v1/coordinator.proto \
  -d '{"tenant_id":"org-123","user_id":"user-456","query_text":"test"}' \
  localhost:50051 \
  rag.v1.CoordinatorService/Route
```

## Test Script

```bash
# Run all tests
node scripts/test-coordinator-integration.js

# Run specific scenario
node scripts/test-coordinator-integration.js --scenario=basic
node scripts/test-coordinator-integration.js --scenario=parse
node scripts/test-coordinator-integration.js --scenario=monitoring
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Connection refused | Check `COORDINATOR_URL` and ensure Coordinator is running |
| Proto file not found | Verify `COORDINATOR_PROTO_PATH` is correct |
| Timeout errors | Increase `GRPC_TIMEOUT` value |
| Service not found | Verify `COORDINATOR_SERVICE_NAME` matches proto |

## Documentation

- [Full Integration Guide](./COORDINATOR_INTEGRATION_GUIDE.md)
- [Testing Guide](./COORDINATOR_TESTING_GUIDE.md)
- [Usage Examples](./examples/coordinator-usage-example.js)













