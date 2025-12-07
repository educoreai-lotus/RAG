/**
 * Coordinator Client Unit Tests
 * Tests for gRPC client initialization, connection handling, and Route() method calls
 */

import { routeRequest, getMetrics, isCoordinatorAvailable, resetClient, resetMetrics } from '../../../src/clients/coordinator.client.js';
import { createGrpcClient, grpcCall } from '../../../src/clients/grpcClient.util.js';
import * as grpc from '@grpc/grpc-js';
import { logger } from '../../../src/utils/logger.util.js';

// Mock dependencies
jest.mock('../../../src/clients/grpcClient.util.js');
jest.mock('../../../src/utils/logger.util.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Coordinator Client', () => {
  let mockClient;
  let mockGrpcCall;

  beforeEach(() => {
    // Reset client state
    resetClient();
    resetMetrics();

    // Mock gRPC client
    mockClient = {
      Route: jest.fn(),
      close: jest.fn(),
    };

    // Mock grpcCall utility
    mockGrpcCall = jest.fn();
    grpcCall.mockImplementation(mockGrpcCall);

    // Mock createGrpcClient
    createGrpcClient.mockReturnValue(mockClient);

    // Reset environment variables
    delete process.env.COORDINATOR_ENABLED;
    delete process.env.COORDINATOR_URL;
    delete process.env.COORDINATOR_GRPC_PORT;
    delete process.env.COORDINATOR_GRPC_URL;
    delete process.env.GRPC_TIMEOUT;

    // Clear mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetClient();
    resetMetrics();
  });

  describe('Client Initialization', () => {
    it('should create client with correct configuration', async () => {
      process.env.COORDINATOR_ENABLED = 'true';
      process.env.COORDINATOR_URL = 'test-coordinator';
      process.env.COORDINATOR_GRPC_PORT = '50051';

      await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query',
      });

      expect(createGrpcClient).toHaveBeenCalledWith(
        expect.stringContaining('test-coordinator:50051'),
        expect.stringContaining('coordinator.proto'),
        'rag.v1.CoordinatorService'
      );
    });

    it('should use COORDINATOR_GRPC_URL if provided', async () => {
      process.env.COORDINATOR_ENABLED = 'true';
      process.env.COORDINATOR_GRPC_URL = 'custom-host:9999';

      await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query',
      });

      expect(createGrpcClient).toHaveBeenCalledWith(
        'custom-host:9999',
        expect.any(String),
        expect.any(String)
      );
    });

    it('should default to localhost:50051 when no env vars set', async () => {
      process.env.COORDINATOR_ENABLED = 'true';

      await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query',
      });

      expect(createGrpcClient).toHaveBeenCalledWith(
        'localhost:50051',
        expect.any(String),
        expect.any(String)
      );
    });

    it('should reuse existing client connection', async () => {
      process.env.COORDINATOR_ENABLED = 'true';

      // First call
      await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query 1',
      });

      const firstCallCount = createGrpcClient.mock.calls.length;

      // Second call
      await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query 2',
      });

      // Should not create new client
      expect(createGrpcClient.mock.calls.length).toBe(firstCallCount);
    });

    it('should not create client if COORDINATOR_ENABLED is false', async () => {
      process.env.COORDINATOR_ENABLED = 'false';

      const response = await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query',
      });

      expect(createGrpcClient).not.toHaveBeenCalled();
      expect(response).toBeNull();
      expect(logger.debug).toHaveBeenCalledWith('Coordinator client disabled');
    });

    it('should handle client creation errors gracefully', async () => {
      process.env.COORDINATOR_ENABLED = 'true';
      createGrpcClient.mockImplementation(() => {
        throw new Error('Failed to create client');
      });

      const response = await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query',
      });

      expect(response).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to create Coordinator gRPC client',
        expect.objectContaining({
          error: 'Failed to create client',
        })
      );
    });
  });

  describe('Route() Method Calls', () => {
    beforeEach(() => {
      process.env.COORDINATOR_ENABLED = 'true';
    });

    it('should send request with all required fields', async () => {
      const mockResponse = {
        target_services: ['payment-service'],
        normalized_fields: {
          successful_service: 'payment-service',
          rank_used: '1',
        },
      };

      mockGrpcCall.mockResolvedValue(mockResponse);

      await routeRequest({
        tenant_id: 'test-tenant-123',
        user_id: 'test-user-456',
        query_text: 'Show me my recent payments',
        metadata: {
          session_id: 'session-abc',
          source: 'web_app',
        },
      });

      expect(mockGrpcCall).toHaveBeenCalledWith(
        mockClient,
        'Route',
        {
          tenant_id: 'test-tenant-123',
          user_id: 'test-user-456',
          query_text: 'Show me my recent payments',
          metadata: {
            session_id: 'session-abc',
            source: 'web_app',
          },
        },
        {},
        expect.any(Number) // timeout
      );
    });

    it('should handle successful response', async () => {
      const mockResponse = {
        target_services: ['payment-service'],
        normalized_fields: {
          successful_service: 'payment-service',
          rank_used: '1',
          total_attempts: '1',
          quality_score: '0.9',
          primary_target: 'payment-service',
          primary_confidence: '0.95',
        },
        envelope_json: JSON.stringify({
          version: '1.0',
          timestamp: '2025-01-27T00:00:00Z',
          payload: { payments: [] },
        }),
        routing_metadata: JSON.stringify({
          routing_strategy: 'cascading_fallback',
        }),
      };

      mockGrpcCall.mockResolvedValue(mockResponse);

      const response = await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query',
      });

      expect(response).toEqual(mockResponse);
      expect(logger.info).toHaveBeenCalledWith(
        'Coordinator route request successful',
        expect.objectContaining({
          tenant_id: 'test-tenant',
          user_id: 'test-user',
          target_services: ['payment-service'],
          rank_used: 1,
        })
      );
    });

    it('should track metrics on successful request', async () => {
      const mockResponse = {
        target_services: ['payment-service'],
        normalized_fields: {
          successful_service: 'payment-service',
          rank_used: '1',
        },
      };

      mockGrpcCall.mockResolvedValue(mockResponse);

      await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query',
      });

      const metrics = getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.servicesUsed['payment-service']).toBe(1);
    });

    it('should track fallback requests (rank > 1)', async () => {
      const mockResponse = {
        target_services: ['payment-service', 'billing-service'],
        normalized_fields: {
          successful_service: 'billing-service',
          rank_used: '2',
          total_attempts: '2',
        },
      };

      mockGrpcCall.mockResolvedValue(mockResponse);

      await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query',
      });

      const metrics = getMetrics();
      expect(metrics.fallbackRequests).toBe(1);
    });

    it('should validate required parameters', async () => {
      // Missing tenant_id
      const response1 = await routeRequest({
        user_id: 'test-user',
        query_text: 'test query',
      });
      expect(response1).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid route request: missing required parameters',
        expect.any(Object)
      );

      // Missing user_id
      const response2 = await routeRequest({
        tenant_id: 'test-tenant',
        query_text: 'test query',
      });
      expect(response2).toBeNull();

      // Missing query_text
      const response3 = await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
      });
      expect(response3).toBeNull();

      const metrics = getMetrics();
      expect(metrics.failedRequests).toBe(3);
    });

    it('should handle null response gracefully', async () => {
      mockGrpcCall.mockResolvedValue(null);

      const response = await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query',
      });

      expect(response).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Coordinator returned null response',
        expect.any(Object)
      );

      const metrics = getMetrics();
      expect(metrics.failedRequests).toBe(1);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.COORDINATOR_ENABLED = 'true';
    });

    it('should handle DEADLINE_EXCEEDED (timeout)', async () => {
      const timeoutError = new Error('Request timed out');
      timeoutError.code = grpc.status.DEADLINE_EXCEEDED;

      mockGrpcCall.mockRejectedValue(timeoutError);

      const response = await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query',
      });

      expect(response).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Coordinator gRPC call error (retryable)',
        expect.objectContaining({
          type: 'TIMEOUT',
          code: grpc.status.DEADLINE_EXCEEDED,
        })
      );

      // Should reset client on timeout
      expect(mockClient.close).toHaveBeenCalled();
    });

    it('should handle UNAVAILABLE (service down)', async () => {
      const unavailableError = new Error('Service unavailable');
      unavailableError.code = grpc.status.UNAVAILABLE;

      mockGrpcCall.mockRejectedValue(unavailableError);

      const response = await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query',
      });

      expect(response).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Coordinator gRPC call error (retryable)',
        expect.objectContaining({
          type: 'SERVICE_UNAVAILABLE',
          code: grpc.status.UNAVAILABLE,
        })
      );

      // Should reset client
      expect(mockClient.close).toHaveBeenCalled();
    });

    it('should handle NOT_FOUND (service not found)', async () => {
      const notFoundError = new Error('Service not found');
      notFoundError.code = grpc.status.NOT_FOUND;

      mockGrpcCall.mockRejectedValue(notFoundError);

      const response = await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query',
      });

      expect(response).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Coordinator gRPC call error (non-retryable)',
        expect.objectContaining({
          type: 'NOT_FOUND',
          code: grpc.status.NOT_FOUND,
        })
      );
    });

    it('should handle INVALID_ARGUMENT', async () => {
      const invalidError = new Error('Invalid argument');
      invalidError.code = grpc.status.INVALID_ARGUMENT;

      mockGrpcCall.mockRejectedValue(invalidError);

      const response = await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query',
      });

      expect(response).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Coordinator gRPC call error (non-retryable)',
        expect.objectContaining({
          type: 'INVALID_REQUEST',
        })
      );
    });

    it('should handle INTERNAL error', async () => {
      const internalError = new Error('Internal error');
      internalError.code = grpc.status.INTERNAL;

      mockGrpcCall.mockRejectedValue(internalError);

      const response = await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query',
      });

      expect(response).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Coordinator gRPC call error (retryable)',
        expect.objectContaining({
          type: 'INTERNAL_ERROR',
        })
      );
    });

    it('should handle unknown errors', async () => {
      const unknownError = new Error('Unknown error');
      unknownError.code = 999; // Unknown code

      mockGrpcCall.mockRejectedValue(unknownError);

      const response = await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query',
      });

      expect(response).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Coordinator gRPC call error (non-retryable)',
        expect.objectContaining({
          type: 'UNKNOWN_ERROR',
        })
      );
    });

    it('should track errors by code in metrics', async () => {
      const timeoutError = new Error('Timeout');
      timeoutError.code = grpc.status.DEADLINE_EXCEEDED;

      mockGrpcCall.mockRejectedValue(timeoutError);

      await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query',
      });

      const metrics = getMetrics();
      expect(metrics.errorsByCode[grpc.status.DEADLINE_EXCEEDED]).toBe(1);
    });

    it('should calculate processing time', async () => {
      const mockResponse = {
        target_services: ['payment-service'],
        normalized_fields: { successful_service: 'payment-service' },
      };

      // Simulate delay
      mockGrpcCall.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(mockResponse), 100);
        });
      });

      await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query',
      });

      const metrics = getMetrics();
      expect(metrics.totalProcessingTime).toBeGreaterThan(0);
      expect(metrics.averageProcessingTimeMs).toBeGreaterThan(0);
    });
  });

  describe('Configuration', () => {
    it('should use GRPC_TIMEOUT from environment', async () => {
      process.env.COORDINATOR_ENABLED = 'true';
      process.env.GRPC_TIMEOUT = '60'; // 60 seconds

      const mockResponse = {
        target_services: ['payment-service'],
        normalized_fields: { successful_service: 'payment-service' },
      };

      mockGrpcCall.mockResolvedValue(mockResponse);

      await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query',
      });

      // Should convert seconds to milliseconds
      expect(mockGrpcCall).toHaveBeenCalledWith(
        expect.any(Object),
        'Route',
        expect.any(Object),
        {},
        60000 // 60 seconds = 60000ms
      );
    });

    it('should default to 30 seconds timeout', async () => {
      process.env.COORDINATOR_ENABLED = 'true';
      delete process.env.GRPC_TIMEOUT;

      const mockResponse = {
        target_services: ['payment-service'],
        normalized_fields: { successful_service: 'payment-service' },
      };

      mockGrpcCall.mockResolvedValue(mockResponse);

      await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query',
      });

      expect(mockGrpcCall).toHaveBeenCalledWith(
        expect.any(Object),
        'Route',
        expect.any(Object),
        {},
        30000 // 30 seconds default
      );
    });
  });

  describe('Metrics', () => {
    beforeEach(() => {
      process.env.COORDINATOR_ENABLED = 'true';
    });

    it('should calculate success rate', async () => {
      const mockResponse = {
        target_services: ['payment-service'],
        normalized_fields: { successful_service: 'payment-service', rank_used: '1' },
      };

      mockGrpcCall.mockResolvedValue(mockResponse);

      // 2 successful requests
      await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query 1',
      });
      await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query 2',
      });

      // 1 failed request
      mockGrpcCall.mockRejectedValue(new Error('Error'));
      await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query 3',
      });

      const metrics = getMetrics();
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.successRate).toBeCloseTo(66.67, 1);
    });

    it('should calculate fallback rate', async () => {
      // Primary success
      mockGrpcCall.mockResolvedValueOnce({
        target_services: ['payment-service'],
        normalized_fields: { successful_service: 'payment-service', rank_used: '1' },
      });

      await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query 1',
      });

      // Fallback success
      mockGrpcCall.mockResolvedValueOnce({
        target_services: ['payment-service', 'billing-service'],
        normalized_fields: { successful_service: 'billing-service', rank_used: '2' },
      });

      await routeRequest({
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        query_text: 'test query 2',
      });

      const metrics = getMetrics();
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.fallbackRequests).toBe(1);
      expect(metrics.fallbackRate).toBe(50);
    });

    it('should reset metrics', () => {
      resetMetrics();
      const metrics = getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(0);
    });
  });

  describe('Availability Check', () => {
    it('should return false if disabled', async () => {
      process.env.COORDINATOR_ENABLED = 'false';
      const available = await isCoordinatorAvailable();
      expect(available).toBe(false);
    });

    it('should return true if client exists', async () => {
      process.env.COORDINATOR_ENABLED = 'true';
      const available = await isCoordinatorAvailable();
      expect(available).toBe(true);
    });

    it('should return false if client creation failed', async () => {
      process.env.COORDINATOR_ENABLED = 'true';
      createGrpcClient.mockImplementation(() => {
        throw new Error('Failed');
      });

      const available = await isCoordinatorAvailable();
      expect(available).toBe(false);
    });
  });

  describe('Client Reset', () => {
    it('should close and reset client', () => {
      process.env.COORDINATOR_ENABLED = 'true';
      resetClient();

      expect(mockClient.close).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Coordinator gRPC client reset');
    });

    it('should handle close errors gracefully', () => {
      process.env.COORDINATOR_ENABLED = 'true';
      mockClient.close.mockImplementation(() => {
        throw new Error('Close error');
      });

      // Should not throw
      expect(() => resetClient()).not.toThrow();
    });
  });
});






