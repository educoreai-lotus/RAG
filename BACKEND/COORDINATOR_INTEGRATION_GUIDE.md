# Coordinator gRPC Integration Guide

Complete guide for integrating the RAG service with the Coordinator service via gRPC.

## Overview

The Coordinator integration allows the RAG service to:
- Route user queries to appropriate microservices via AI-powered routing
- Receive structured responses with metadata
- Handle cascading fallback (tries services in ranked order)
- Parse and use response data from multiple microservices

## Architecture

```
RAG Service → Coordinator Client → Coordinator Service → Microservices
                ↓
         Response Parser → Business Logic
```

## Components

### 1. Coordinator Client (`src/clients/coordinator.client.js`)
- Handles gRPC connection to Coordinator
- Manages client lifecycle and reconnection
- Tracks metrics and monitoring

### 2. Response Parser (`src/services/coordinatorResponseParser.service.js`)
- Parses RouteResponse from Coordinator
- Extracts business data from normalized fields
- Handles all scenarios (success, fallback, failure)

### 3. Communication Manager (`src/communication/communicationManager.service.js`)
- Decision layer for when to call Coordinator
- Processes Coordinator responses
- Integrates with RAG pipeline

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# Coordinator Service (gRPC)
COORDINATOR_ENABLED=true
COORDINATOR_URL=coordinator          # Hostname (default: coordinator)
COORDINATOR_GRPC_PORT=50051          # gRPC port (default: 50051)
COORDINATOR_GRPC_URL=coordinator:50051  # Full URL (optional, overrides above)
COORDINATOR_PROTO_PATH=../DATABASE/proto/rag/v1/coordinator.proto
COORDINATOR_SERVICE_NAME=rag.v1.CoordinatorService
GRPC_TIMEOUT=30                      # Timeout in seconds (default: 30)
```

### Local Development

For local development, use:
```bash
COORDINATOR_URL=localhost
COORDINATOR_GRPC_PORT=50051
```

## Usage Examples

### Basic Usage

```javascript
import { routeRequest } from './clients/coordinator.client.js';
import { 
  parseRouteResponse, 
  extractBusinessData,
  getRoutingSummary 
} from './services/coordinatorResponseParser.service.js';

// Make a route request
const response = await routeRequest({
  tenant_id: 'org-123',
  user_id: 'user-456',
  query_text: 'Show me my recent payments',
  metadata: {
    session_id: 'abc-xyz',
    source: 'web_app'
  }
});

if (response) {
  // Parse the response
  const parsed = parseRouteResponse(response);
  
  // Extract business data
  const businessData = extractBusinessData(parsed);
  
  // Get routing summary
  const summary = getRoutingSummary(parsed);
  
  console.log('Status:', summary.status);
  console.log('Successful Service:', parsed.successful_service);
  console.log('Quality Score:', parsed.quality_score);
  console.log('Business Data:', businessData.data);
}
```

### Using Communication Manager (Recommended)

```javascript
import { 
  callCoordinatorRoute,
  processCoordinatorResponse 
} from './communication/communicationManager.service.js';

// Call Coordinator (includes decision logic)
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
  // Process response (includes parsing and extraction)
  const processed = processCoordinatorResponse(response);
  
  if (processed.success) {
    console.log('Success at rank:', processed.rank_used);
    console.log('Service:', processed.successful_service);
    console.log('Data:', processed.business_data);
    console.log('Sources:', processed.sources);
  } else {
    console.log('All services failed');
  }
}
```

### Handling Different Scenarios

#### Success at Primary Service (Rank 1)

```javascript
const parsed = parseRouteResponse(response);

if (parsed.status === 'success_primary') {
  console.log('Primary service succeeded');
  console.log('Service:', parsed.successful_service);
  console.log('Quality:', parsed.quality_score);
  // Use parsed.envelope.payload for business data
}
```

#### Success at Fallback Service (Rank > 1)

```javascript
const parsed = parseRouteResponse(response);

if (parsed.status === 'success_fallback') {
  console.log('Fallback service succeeded');
  console.log('Rank used:', parsed.rank_used);
  console.log('Total attempts:', parsed.total_attempts);
  // Quality might be lower, but still usable
}
```

#### All Services Failed

```javascript
const parsed = parseRouteResponse(response);

if (parsed.status === 'all_failed') {
  console.log('All services failed');
  console.log('Attempted services:', parsed.target_services);
  console.log('Total attempts:', parsed.total_attempts);
  // Handle gracefully - return empty or use internal data
}
```

### Error Handling

```javascript
import { routeRequest } from './clients/coordinator.client.js';
import * as grpc from '@grpc/grpc-js';

try {
  const response = await routeRequest({
    tenant_id: 'org-123',
    user_id: 'user-456',
    query_text: 'Show me my recent payments'
  });
  
  if (!response) {
    // Coordinator unavailable or returned null
    console.log('Coordinator unavailable, using fallback');
    return handleFallback();
  }
  
  // Process response...
} catch (error) {
  // Handle gRPC errors
  if (error.code === grpc.status.DEADLINE_EXCEEDED) {
    console.error('Request timed out');
  } else if (error.code === grpc.status.UNAVAILABLE) {
    console.error('Coordinator service unavailable');
  } else {
    console.error('Unexpected error:', error);
  }
  
  // Use fallback or return error
  return handleError(error);
}
```

## Response Structure

### RouteResponse Fields

```javascript
{
  target_services: ['payment-service', 'billing-service'],
  normalized_fields: {
    successful_service: 'payment-service',
    rank_used: '1',
    total_attempts: '1',
    stopped_reason: 'found_good_response',
    quality_score: '0.9',
    primary_target: 'payment-service',
    primary_confidence: '0.95',
    processing_time: '200ms',
    // ... business data fields
  },
  envelope_json: '{"version":"1.0","timestamp":"...","payload":{...}}',
  routing_metadata: '{"routing_strategy":"cascading_fallback",...}'
}
```

### Parsed Response Structure

```javascript
{
  // Status
  status: 'success_primary' | 'success_fallback' | 'all_failed',
  success: true | false,
  
  // Service information
  successful_service: 'payment-service' | 'none',
  rank_used: 1,
  total_attempts: 1,
  stopped_reason: 'found_good_response' | 'exhausted_candidates',
  
  // Quality metrics
  quality_score: 0.9,
  primary_target: 'payment-service',
  primary_confidence: 0.95,
  processing_time_ms: 200,
  
  // Parsed data
  envelope: { version, timestamp, payload, ... },
  routing: { routing_strategy, ai_ranking, execution, ... },
  
  // Business data (from extractBusinessData)
  business_data: { ... },
  sources: [ ... ],
  metadata: { ... }
}
```

## Monitoring

### Get Metrics

```javascript
import { getMetrics } from './clients/coordinator.client.js';

const metrics = getMetrics();
console.log('Total requests:', metrics.totalRequests);
console.log('Success rate:', metrics.successRate);
console.log('Fallback rate:', metrics.fallbackRate);
console.log('Average processing time:', metrics.averageProcessingTimeMs);
console.log('Services used:', metrics.servicesUsed);
```

### Check Availability

```javascript
import { isCoordinatorAvailable } from './clients/coordinator.client.js';

const available = await isCoordinatorAvailable();
if (!available) {
  console.log('Coordinator not available');
}
```

## Integration with RAG Pipeline

The Coordinator is integrated into the RAG pipeline via `grpcFallback.service.js`:

```javascript
// In queryProcessing.service.js or similar
import { grpcFetchByCategory } from './services/grpcFallback.service.js';

// After vector search
const vectorResults = await searchVectors(query);

// If insufficient results, call Coordinator
const coordinatorResults = await grpcFetchByCategory(category, {
  query,
  tenantId,
  userId,
  vectorResults,
  internalData: {}
});

// Combine results
const allResults = [...vectorResults, ...coordinatorResults];
```

## Best Practices

1. **Always check if Coordinator is enabled** before calling
2. **Handle null responses gracefully** - Coordinator might be unavailable
3. **Use Communication Manager** for decision logic (when to call Coordinator)
4. **Parse responses** using the parser service for consistent handling
5. **Monitor metrics** to track Coordinator usage and performance
6. **Handle all scenarios** - primary success, fallback success, and failures
7. **Log routing summaries** for debugging and monitoring

## Troubleshooting

### Coordinator Not Available

```javascript
// Check if enabled
if (process.env.COORDINATOR_ENABLED === 'false') {
  console.log('Coordinator disabled');
}

// Check availability
const available = await isCoordinatorAvailable();
if (!available) {
  console.log('Coordinator client not available');
  // Check logs for connection errors
}
```

### Connection Errors

- Check `COORDINATOR_URL` and `COORDINATOR_GRPC_PORT`
- Verify proto file path is correct
- Check network connectivity
- Review gRPC error codes in logs

### Invalid Responses

- Verify proto file matches Coordinator service
- Check response parsing logs
- Validate envelope_json and routing_metadata are valid JSON

## Next Steps

1. Review the [Testing Guide](./COORDINATOR_TESTING_GUIDE.md) for testing instructions
2. Check [Usage Examples](./examples/coordinator-usage-example.js) for complete examples
3. Review error handling in `coordinator.client.js` for specific error codes


