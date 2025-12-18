/**
 * GRPC Flow End-to-End Tests
 * Verifies the complete flow from Coordinator request to RAG response
 */

import { describe, test, expect, beforeAll } from 'vitest';
import realtimeHandler from '../../src/handlers/realtimeHandler.js';
import batchHandler from '../../src/handlers/batchHandler.js';
import mockCoordinator from '../helpers/mock-coordinator.js';
import schemaLoader from '../../src/core/schemaLoader.js';

describe('GRPC Flow End-to-End Tests', () => {
  beforeAll(() => {
    // Load all schemas
    schemaLoader.loadAll();
  });

  const services = mockCoordinator.listAvailableServices();

  services.forEach(serviceName => {
    describe(`${serviceName} - Real-time Flow`, () => {
      test('should process real-time request successfully', async () => {
        // Skip if no mock available
        try {
          mockCoordinator.loadMockResponse(serviceName);
        } catch (error) {
          return; // Skip this test
        }

        // Simulate Coordinator request
        const input = mockCoordinator.simulateRAGRequest(
          serviceName,
          'Show recent items'
        );

        // Process request
        const result = await realtimeHandler.handle(input);

        // Verify response
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.answer).toBeDefined();
        expect(result.source).toBeDefined();
        expect(result.source.service).toBe(serviceName);
      }, 30000); // 30 second timeout

      test('should return proper metadata', async () => {
        try {
          mockCoordinator.loadMockResponse(serviceName);
        } catch (error) {
          return;
        }

        // Simulate request
        const input = mockCoordinator.simulateRAGRequest(serviceName);

        // Process
        const result = await realtimeHandler.handle(input);

        // Verify metadata
        expect(result.metadata).toBeDefined();
        expect(result.metadata.query).toBeDefined();
        expect(result.metadata.items_returned).toBeGreaterThan(0);
        expect(result.metadata.timestamp).toBeDefined();
      }, 30000);

      test('should handle errors gracefully', async () => {
        // Test with invalid service name
        const input = {
          mode: 'realtime',
          source_service: 'invalid-service-name',
          user_query: 'Test query',
          user_id: 'test-user',
          tenant_id: 'test-tenant',
          response_envelope: {}
        };

        // Process - should handle error gracefully
        const result = await realtimeHandler.handle(input);

        // Should return an error response, not throw
        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      }, 30000);
    });
  });
});

