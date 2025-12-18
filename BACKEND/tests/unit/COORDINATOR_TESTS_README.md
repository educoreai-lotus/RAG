# Coordinator Integration Unit Tests

Comprehensive unit test suite for the Coordinator gRPC integration.

## Test Files

### 1. `clients/coordinator.client.test.js`
Tests for the gRPC client implementation:
- ✅ Client initialization and configuration
- ✅ Connection reuse
- ✅ Route() method calls
- ✅ Request building and validation
- ✅ Response handling
- ✅ Error handling (network, timeout, unavailable)
- ✅ Metrics tracking
- ✅ Configuration (env vars)

**Coverage:** Client creation, request/response handling, error scenarios, metrics

### 2. `services/coordinatorResponseParser.service.test.js`
Tests for response parsing:
- ✅ Parse normalized_fields
- ✅ Parse envelope_json (with error handling)
- ✅ Parse routing_metadata (with error handling)
- ✅ Handle all scenarios (primary success, fallback, all failed)
- ✅ Extract business data
- ✅ Helper functions (isAllFailed, isFallbackUsed, getQualityAssessment)
- ✅ Edge cases (null, missing fields, invalid JSON)

**Coverage:** All parsing logic, error handling, data extraction

### 3. `communication/communicationManager.service.test.js`
Tests for communication manager:
- ✅ Decision logic (shouldCallCoordinator)
- ✅ Coordinator route calls
- ✅ Response processing
- ✅ All three scenarios (primary, fallback, failure)
- ✅ Error handling
- ✅ Logging

**Coverage:** Decision logic, integration, response processing

### 4. `services/grpcFallback.service.test.js`
Tests for RAG pipeline integration:
- ✅ Feature flag handling
- ✅ Decision logic integration
- ✅ Coordinator calls
- ✅ Response conversion to content items
- ✅ Error handling
- ✅ Logging

**Coverage:** RAG integration, data transformation

## Running Tests

### Run all Coordinator tests
```bash
npm test -- coordinator
```

### Run specific test file
```bash
npm test -- coordinator.client.test.js
npm test -- coordinatorResponseParser.service.test.js
npm test -- communicationManager.service.test.js
npm test -- grpcFallback.service.test.js
```

### Run with coverage
```bash
npm run test:coverage -- coordinator
```

### Run in watch mode
```bash
npm run test:watch -- coordinator
```

## Test Structure

All tests follow this structure:
```javascript
describe('Component Name', () => {
  describe('Feature Group', () => {
    it('should do something specific', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

## Mocking Strategy

### gRPC Client Tests
- Mocks `grpcClient.util.js` functions
- Mocks gRPC client instance
- Simulates network responses and errors

### Parser Tests
- Uses realistic mock responses from documentation
- Tests with actual JSON structures
- Tests error scenarios

### Communication Manager Tests
- Mocks `coordinator.client.js`
- Mocks parser functions
- Tests decision logic with various inputs

### Fallback Service Tests
- Mocks communication manager
- Mocks schema interpreter
- Tests end-to-end flow

## Mock Data

Tests include realistic mock responses:

### Success Response (Rank 1)
```javascript
{
  target_services: ['payment-service'],
  normalized_fields: {
    successful_service: 'payment-service',
    rank_used: '1',
    quality_score: '0.9',
  },
  envelope_json: '{"payload": {...}}',
  routing_metadata: '{"routing_strategy": "cascading_fallback"}',
}
```

### Fallback Response (Rank 2)
```javascript
{
  target_services: ['payment-service', 'billing-service'],
  normalized_fields: {
    successful_service: 'billing-service',
    rank_used: '2',
    quality_score: '0.7',
  },
}
```

### Failure Response
```javascript
{
  target_services: ['service-1', 'service-2'],
  normalized_fields: {
    successful_service: 'none',
    rank_used: '0',
  },
}
```

## Coverage Goals

- **Target:** ≥80% code coverage
- **Current:** Run `npm run test:coverage` to check

## Test Scenarios Covered

### ✅ Client Initialization
- Default configuration
- Environment variable configuration
- Connection reuse
- Client creation errors

### ✅ Request Handling
- All required fields
- Optional metadata
- Parameter validation
- Request building

### ✅ Response Handling
- Primary success (rank 1)
- Fallback success (rank > 1)
- All services failed
- Null responses

### ✅ Error Handling
- Network errors (timeout, unavailable)
- Invalid responses
- JSON parse errors
- Missing fields

### ✅ Metrics
- Request counting
- Success/failure tracking
- Fallback tracking
- Processing time calculation
- Error code tracking

### ✅ Decision Logic
- Vector similarity thresholds
- Real-time keyword detection
- Microservice keyword detection
- Internal data sufficiency

## Integration Tests

**Note:** These are unit tests with mocks. For integration tests with a real Coordinator service, see:
- `BACKEND/scripts/test-coordinator-integration.js` - Manual integration test script
- `BACKEND/COORDINATOR_TESTING_GUIDE.md` - Testing guide with grpcurl

## TODO: Integration Tests

Future work:
- [ ] Create integration tests with mock Coordinator server
- [ ] Test end-to-end flow with real proto definitions
- [ ] Test error scenarios with actual gRPC errors
- [ ] Performance tests

## Running Tests in CI

Tests are configured to run in CI with:
- Jest as test runner
- Coverage thresholds (80%)
- Test timeout: 10 seconds
- Max workers: 50%

## Debugging Tests

### Run single test
```bash
npm test -- -t "should create client with correct configuration"
```

### Run with verbose output
```bash
npm test -- --verbose coordinator
```

### Debug failing test
```bash
node --inspect-brk node_modules/.bin/jest --runInBand coordinator.client.test.js
```

## Best Practices

1. **Isolation:** Each test is independent
2. **Mocking:** All external dependencies are mocked
3. **Realistic Data:** Mock responses match real Coordinator responses
4. **Error Scenarios:** All error paths are tested
5. **Edge Cases:** Null, undefined, missing fields handled

## Maintenance

When updating Coordinator integration:
1. Update corresponding test file
2. Add tests for new features
3. Ensure coverage stays ≥80%
4. Run tests before committing















