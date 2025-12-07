/**
 * gRPC Fallback Service Unit Tests
 * Tests for RAG pipeline integration with Coordinator
 */

// MOCKS MUST BE FIRST - before any imports (Jest hoists these)
// For ES modules, use require() to access jest in factory functions
jest.mock('../../../src/communication/communicationManager.service.js', () => {
  const { jest } = require('@jest/globals');
  return {
    shouldCallCoordinator: jest.fn(),
    callCoordinatorRoute: jest.fn(),
    processCoordinatorResponse: jest.fn(),
  };
});
jest.mock('../../../src/communication/schemaInterpreter.service.js', () => {
  const { jest } = require('@jest/globals');
  return {
    interpretNormalizedFields: jest.fn(),
    createStructuredFields: jest.fn(),
  };
});
jest.mock('../../../src/utils/logger.util.js', () => {
  const { jest } = require('@jest/globals');
  return {
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
  };
});

import { jest } from '@jest/globals';

// Import AFTER mocks are set up
import { grpcFetchByCategory } from '../../../src/services/grpcFallback.service.js';
import {
  shouldCallCoordinator,
  callCoordinatorRoute,
  processCoordinatorResponse,
} from '../../../src/communication/communicationManager.service.js';
import {
  interpretNormalizedFields,
  createStructuredFields,
} from '../../../src/communication/schemaInterpreter.service.js';
import { logger } from '../../../src/utils/logger.util.js';

describe('gRPC Fallback Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GRPC_ENABLED = 'true';
    // Reset all mocks using jest.mocked() to ensure they're recognized as mocks
    jest.mocked(shouldCallCoordinator).mockReset();
    jest.mocked(callCoordinatorRoute).mockReset();
    jest.mocked(processCoordinatorResponse).mockReset();
    jest.mocked(interpretNormalizedFields).mockReset();
    jest.mocked(createStructuredFields).mockReset();
    jest.mocked(logger.info).mockReset();
    jest.mocked(logger.warn).mockReset();
    jest.mocked(logger.error).mockReset();
    jest.mocked(logger.debug).mockReset();
  });

  afterEach(() => {
    delete process.env.GRPC_ENABLED;
  });

  describe('grpcFetchByCategory', () => {
    describe('Feature Flag', () => {
      it('should return empty array if GRPC_ENABLED is false', async () => {
        process.env.GRPC_ENABLED = 'false';

        const result = await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
          userId: 'user-456',
        });

        expect(result).toEqual([]);
        expect(jest.mocked(logger.debug)).toHaveBeenCalledWith('gRPC fallback disabled');
        expect(jest.mocked(shouldCallCoordinator)).not.toHaveBeenCalled();
      });

      it('should proceed if GRPC_ENABLED is true', async () => {
        process.env.GRPC_ENABLED = 'true';
        jest.mocked(shouldCallCoordinator).mockReturnValue(false);

        await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
        });

        expect(jest.mocked(shouldCallCoordinator)).toHaveBeenCalled();
      });
    });

    describe('Decision Logic', () => {
      it('should skip Coordinator if internal data is sufficient', async () => {
        jest.mocked(shouldCallCoordinator).mockReturnValue(false);

        const result = await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
          userId: 'user-456',
          vectorResults: [
            { similarity: 0.9, content: 'result 1' },
          ],
        });

        expect(result).toEqual([]);
        expect(jest.mocked(logger.debug)).toHaveBeenCalledWith(
          'gRPC fallback skipped: Internal data is sufficient',
          expect.any(Object)
        );
        expect(jest.mocked(callCoordinatorRoute)).not.toHaveBeenCalled();
      });

      it('should call Coordinator if internal data is insufficient', async () => {
        jest.mocked(shouldCallCoordinator).mockReturnValue(true);
        jest.mocked(callCoordinatorRoute).mockResolvedValue({
          target_services: ['payment-service'],
          normalized_fields: { successful_service: 'payment-service' },
        });

        jest.mocked(processCoordinatorResponse).mockReturnValue({
          status: 'success_primary',
          success: true,
          target_services: ['payment-service'],
          normalized_fields: {},
        });

        interpretNormalizedFields.mockReturnValue({});
        createStructuredFields.mockReturnValue({
          sources: [],
        });

        await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
          userId: 'user-456',
          vectorResults: [],
        });

        expect(shouldCallCoordinator).toHaveBeenCalledWith(
          'test query',
          [],
          {}
        );
        expect(jest.mocked(callCoordinatorRoute)).toHaveBeenCalled();
      });
    });

    describe('Coordinator Integration', () => {
      it('should call Coordinator with correct parameters', async () => {
        jest.mocked(shouldCallCoordinator).mockReturnValue(true);
        jest.mocked(callCoordinatorRoute).mockResolvedValue({});
        jest.mocked(processCoordinatorResponse).mockReturnValue({
          status: 'success_primary',
          success: true,
          target_services: [],
          normalized_fields: {},
        });
        interpretNormalizedFields.mockReturnValue({});
        createStructuredFields.mockReturnValue({ sources: [] });

        await grpcFetchByCategory('payment', {
          query: 'show me payments',
          tenantId: 'org-123',
          userId: 'user-456',
          vectorResults: [],
          internalData: { test: 'data' },
        });

        expect(jest.mocked(callCoordinatorRoute)).toHaveBeenCalledWith({
          tenant_id: 'org-123',
          user_id: 'user-456',
          query_text: 'show me payments',
          metadata: expect.objectContaining({
            category: 'payment',
            source: 'rag_fallback',
            vector_results_count: 0,
          }),
        });
      });

      it('should handle null Coordinator response', async () => {
        jest.mocked(shouldCallCoordinator).mockReturnValue(true);
        jest.mocked(callCoordinatorRoute).mockResolvedValue(null);

        const result = await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
        });

        expect(result).toEqual([]);
        expect(jest.mocked(logger.warn)).toHaveBeenCalledWith(
          'Coordinator route returned no response',
          expect.any(Object)
        );
      });

      it('should handle failed response processing', async () => {
        jest.mocked(shouldCallCoordinator).mockReturnValue(true);
        jest.mocked(callCoordinatorRoute).mockResolvedValue({});
        jest.mocked(processCoordinatorResponse).mockReturnValue(null);

        const result = await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
        });

        expect(result).toEqual([]);
        expect(jest.mocked(logger.warn)).toHaveBeenCalledWith(
          'Failed to process Coordinator response',
          expect.any(Object)
        );
      });
    });

    describe('Response Processing', () => {
      it('should convert Coordinator response to content items', async () => {
        jest.mocked(shouldCallCoordinator).mockReturnValue(true);
        jest.mocked(callCoordinatorRoute).mockResolvedValue({});

        const mockProcessed = {
          status: 'success_primary',
          success: true,
          target_services: ['payment-service'],
          normalized_fields: {
            successful_service: 'payment-service',
          },
        };

        const mockInterpreted = {
          field1: 'value1',
        };

        const mockStructured = {
          sources: [
            {
              sourceId: 'src-1',
              sourceType: 'payment',
              contentSnippet: 'Payment content',
              title: 'Payment 1',
              sourceUrl: 'https://example.com/payment/1',
              relevanceScore: 0.9,
              metadata: { amount: 100 },
            },
          ],
        };

        jest.mocked(processCoordinatorResponse).mockReturnValue(mockProcessed);
        interpretNormalizedFields.mockReturnValue(mockInterpreted);
        createStructuredFields.mockReturnValue(mockStructured);

        const result = await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
          userId: 'user-456',
        });

        expect(jest.mocked(processCoordinatorResponse)).toHaveBeenCalled();
        expect(interpretNormalizedFields).toHaveBeenCalledWith(
          mockProcessed.normalized_fields
        );
        expect(createStructuredFields).toHaveBeenCalledWith(
          mockProcessed,
          mockInterpreted
        );

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          contentId: 'src-1',
          contentType: 'payment',
          contentText: 'Payment content',
          metadata: {
            amount: 100,
            title: 'Payment 1',
            url: 'https://example.com/payment/1',
            relevanceScore: 0.9,
            source: 'coordinator',
            target_services: ['payment-service'],
          },
        });
      });

      it('should use category as contentType if sourceType is missing', async () => {
        jest.mocked(shouldCallCoordinator).mockReturnValue(true);
        jest.mocked(callCoordinatorRoute).mockResolvedValue({});
        jest.mocked(processCoordinatorResponse).mockReturnValue({
          status: 'success_primary',
          success: true,
          target_services: [],
          normalized_fields: {},
        });
        interpretNormalizedFields.mockReturnValue({});
        createStructuredFields.mockReturnValue({
          sources: [
            {
              sourceId: 'src-1',
              contentSnippet: 'Content',
            },
          ],
        });

        const result = await grpcFetchByCategory('billing', {
          query: 'test query',
          tenantId: 'org-123',
        });

        expect(result[0].contentType).toBe('billing');
      });

      it('should handle empty sources', async () => {
        jest.mocked(shouldCallCoordinator).mockReturnValue(true);
        jest.mocked(callCoordinatorRoute).mockResolvedValue({});
        jest.mocked(processCoordinatorResponse).mockReturnValue({
          status: 'success_primary',
          success: true,
          target_services: [],
          normalized_fields: {},
        });
        interpretNormalizedFields.mockReturnValue({});
        createStructuredFields.mockReturnValue({
          sources: [],
        });

        const result = await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
        });

        expect(result).toEqual([]);
        expect(jest.mocked(logger.info)).toHaveBeenCalledWith(
          'gRPC fallback: Coordinator data retrieved',
          expect.objectContaining({
            items_count: 0,
          })
        );
      });
    });

    describe('Error Handling', () => {
      it('should handle errors gracefully and return empty array', async () => {
        jest.mocked(shouldCallCoordinator).mockReturnValue(true);
        jest.mocked(callCoordinatorRoute).mockRejectedValue(new Error('Network error'));

        const result = await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
        });

        expect(result).toEqual([]);
        expect(jest.mocked(logger.warn)).toHaveBeenCalledWith(
          'gRPC fallback failed',
          expect.objectContaining({
            error: 'Network error',
          })
        );
      });

      it('should handle processing errors', async () => {
        jest.mocked(shouldCallCoordinator).mockReturnValue(true);
        jest.mocked(callCoordinatorRoute).mockResolvedValue({});
        jest.mocked(processCoordinatorResponse).mockImplementation(() => {
          throw new Error('Processing error');
        });

        const result = await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
        });

        expect(result).toEqual([]);
        expect(jest.mocked(logger.warn)).toHaveBeenCalled();
      });
    });

    describe('Logging', () => {
      it('should log when calling Coordinator', async () => {
        jest.mocked(shouldCallCoordinator).mockReturnValue(true);
        jest.mocked(callCoordinatorRoute).mockResolvedValue({});
        jest.mocked(processCoordinatorResponse).mockReturnValue({
          status: 'success_primary',
          success: true,
          target_services: [],
          normalized_fields: {},
        });
        interpretNormalizedFields.mockReturnValue({});
        createStructuredFields.mockReturnValue({ sources: [] });

        await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
          userId: 'user-456',
        });

        expect(jest.mocked(logger.info)).toHaveBeenCalledWith(
          'gRPC fallback: Calling Coordinator',
          expect.objectContaining({
            category: 'payment',
            tenantId: 'org-123',
            userId: 'user-456',
          })
        );
      });

      it('should log successful data retrieval', async () => {
        jest.mocked(shouldCallCoordinator).mockReturnValue(true);
        jest.mocked(callCoordinatorRoute).mockResolvedValue({});
        jest.mocked(processCoordinatorResponse).mockReturnValue({
          status: 'success_primary',
          success: true,
          target_services: ['payment-service'],
          normalized_fields: {},
        });
        interpretNormalizedFields.mockReturnValue({});
        createStructuredFields.mockReturnValue({
          sources: [
            { sourceId: '1', contentSnippet: 'Content' },
            { sourceId: '2', contentSnippet: 'Content 2' },
          ],
        });

        await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
        });

        expect(jest.mocked(logger.info)).toHaveBeenCalledWith(
          'gRPC fallback: Coordinator data retrieved',
          expect.objectContaining({
            category: 'payment',
            tenantId: 'org-123',
            items_count: 2,
            target_services: ['payment-service'],
          })
        );
      });
    });

    describe('Parameter Handling', () => {
      it('should use default userId if not provided', async () => {
        jest.mocked(shouldCallCoordinator).mockReturnValue(true);
        jest.mocked(callCoordinatorRoute).mockResolvedValue({});
        jest.mocked(processCoordinatorResponse).mockReturnValue({
          status: 'success_primary',
          success: true,
          target_services: [],
          normalized_fields: {},
        });
        interpretNormalizedFields.mockReturnValue({});
        createStructuredFields.mockReturnValue({ sources: [] });

        await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
          // userId not provided
        });

        expect(jest.mocked(callCoordinatorRoute)).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: 'anonymous',
          })
        );
      });

      it('should pass vectorResults count in metadata', async () => {
        jest.mocked(shouldCallCoordinator).mockReturnValue(true);
        jest.mocked(callCoordinatorRoute).mockResolvedValue({});
        jest.mocked(processCoordinatorResponse).mockReturnValue({
          status: 'success_primary',
          success: true,
          target_services: [],
          normalized_fields: {},
        });
        interpretNormalizedFields.mockReturnValue({});
        createStructuredFields.mockReturnValue({ sources: [] });

        await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
          vectorResults: [
            { id: '1' },
            { id: '2' },
            { id: '3' },
          ],
        });

        expect(jest.mocked(callCoordinatorRoute)).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              vector_results_count: 3,
            }),
          })
        );
      });
    });
  });
});






