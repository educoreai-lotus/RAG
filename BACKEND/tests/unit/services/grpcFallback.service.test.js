/**
 * gRPC Fallback Service Unit Tests
 * Tests for RAG pipeline integration with Coordinator
 */

import { jest } from '@jest/globals';

// Import modules to spy on
import * as communicationManager from '../../../src/communication/communicationManager.service.js';
import * as schemaInterpreter from '../../../src/communication/schemaInterpreter.service.js';
import { grpcFetchByCategory } from '../../../src/services/grpcFallback.service.js';
import { logger } from '../../../src/utils/logger.util.js';

describe('gRPC Fallback Service', () => {
  let shouldCallCoordinatorSpy, callCoordinatorRouteSpy, processCoordinatorResponseSpy;
  let interpretNormalizedFieldsSpy, createStructuredFieldsSpy;

  beforeEach(() => {
    process.env.GRPC_ENABLED = 'true';
    
    // Spy on module exports (named exports)
    shouldCallCoordinatorSpy = jest.spyOn(communicationManager, 'shouldCallCoordinator').mockReturnValue(false);
    callCoordinatorRouteSpy = jest.spyOn(communicationManager, 'callCoordinatorRoute').mockResolvedValue({});
    processCoordinatorResponseSpy = jest.spyOn(communicationManager, 'processCoordinatorResponse').mockReturnValue({});
    interpretNormalizedFieldsSpy = jest.spyOn(schemaInterpreter, 'interpretNormalizedFields').mockReturnValue({});
    createStructuredFieldsSpy = jest.spyOn(schemaInterpreter, 'createStructuredFields').mockReturnValue({});
    
    // Spy on logger methods (object methods)
    jest.spyOn(logger, 'info').mockImplementation(() => {});
    jest.spyOn(logger, 'warn').mockImplementation(() => {});
    jest.spyOn(logger, 'error').mockImplementation(() => {});
    jest.spyOn(logger, 'debug').mockImplementation(() => {});
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
        expect(logger.debug).toHaveBeenCalledWith('gRPC fallback disabled');
        expect(shouldCallCoordinatorSpy).not.toHaveBeenCalled();
      });

      it('should proceed if GRPC_ENABLED is true', async () => {
        process.env.GRPC_ENABLED = 'true';
        shouldCallCoordinatorSpy.mockReturnValue(false);

        await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
        });

        expect(shouldCallCoordinatorSpy).toHaveBeenCalled();
      });
    });

    describe('Decision Logic', () => {
      it('should skip Coordinator if internal data is sufficient', async () => {
        shouldCallCoordinatorSpy.mockReturnValue(false);

        const result = await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
          userId: 'user-456',
          vectorResults: [
            { similarity: 0.9, content: 'result 1' },
          ],
        });

        expect(result).toEqual([]);
        expect(logger.debug).toHaveBeenCalledWith(
          'gRPC fallback skipped: Internal data is sufficient',
          expect.any(Object)
        );
        expect(callCoordinatorRouteSpy).not.toHaveBeenCalled();
      });

      it('should call Coordinator if internal data is insufficient', async () => {
        shouldCallCoordinatorSpy.mockReturnValue(true);
        callCoordinatorRouteSpy.mockResolvedValue({
          target_services: ['payment-service'],
          normalized_fields: { successful_service: 'payment-service' },
        });

        processCoordinatorResponseSpy.mockReturnValue({
          status: 'success_primary',
          success: true,
          target_services: ['payment-service'],
          normalized_fields: {},
        });

        interpretNormalizedFieldsSpy.mockReturnValue({});
        createStructuredFieldsSpy.mockReturnValue({
          sources: [],
        });

        await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
          userId: 'user-456',
          vectorResults: [],
        });

        expect(shouldCallCoordinatorSpy).toHaveBeenCalledWith(
          'test query',
          [],
          {}
        );
        expect(callCoordinatorRouteSpy).toHaveBeenCalled();
      });
    });

    describe('Coordinator Integration', () => {
      it('should call Coordinator with correct parameters', async () => {
        shouldCallCoordinatorSpy.mockReturnValue(true);
        callCoordinatorRouteSpy.mockResolvedValue({});
        processCoordinatorResponseSpy.mockReturnValue({
          status: 'success_primary',
          success: true,
          target_services: [],
          normalized_fields: {},
        });
        interpretNormalizedFieldsSpy.mockReturnValue({});
        createStructuredFieldsSpy.mockReturnValue({ sources: [] });

        await grpcFetchByCategory('payment', {
          query: 'show me payments',
          tenantId: 'org-123',
          userId: 'user-456',
          vectorResults: [],
          internalData: { test: 'data' },
        });

        expect(callCoordinatorRouteSpy).toHaveBeenCalledWith({
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
        shouldCallCoordinatorSpy.mockReturnValue(true);
        callCoordinatorRouteSpy.mockResolvedValue(null);

        const result = await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
        });

        expect(result).toEqual([]);
        expect(logger.warn).toHaveBeenCalledWith(
          'Coordinator route returned no response',
          expect.any(Object)
        );
      });

      it('should handle failed response processing', async () => {
        shouldCallCoordinatorSpy.mockReturnValue(true);
        callCoordinatorRouteSpy.mockResolvedValue({});
        processCoordinatorResponseSpy.mockReturnValue(null);

        const result = await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
        });

        expect(result).toEqual([]);
        expect(logger.warn).toHaveBeenCalledWith(
          'Failed to process Coordinator response',
          expect.any(Object)
        );
      });
    });

    describe('Response Processing', () => {
      it('should convert Coordinator response to content items', async () => {
        shouldCallCoordinatorSpy.mockReturnValue(true);
        callCoordinatorRouteSpy.mockResolvedValue({});

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

        processCoordinatorResponseSpy.mockReturnValue(mockProcessed);
        interpretNormalizedFieldsSpy.mockReturnValue(mockInterpreted);
        createStructuredFieldsSpy.mockReturnValue(mockStructured);

        const result = await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
          userId: 'user-456',
        });

        expect(processCoordinatorResponseSpy).toHaveBeenCalled();
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
        shouldCallCoordinatorSpy.mockReturnValue(true);
        callCoordinatorRouteSpy.mockResolvedValue({});
        processCoordinatorResponseSpy.mockReturnValue({
          status: 'success_primary',
          success: true,
          target_services: [],
          normalized_fields: {},
        });
        interpretNormalizedFieldsSpy.mockReturnValue({});
        createStructuredFieldsSpy.mockReturnValue({
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
        shouldCallCoordinatorSpy.mockReturnValue(true);
        callCoordinatorRouteSpy.mockResolvedValue({});
        processCoordinatorResponseSpy.mockReturnValue({
          status: 'success_primary',
          success: true,
          target_services: [],
          normalized_fields: {},
        });
        interpretNormalizedFieldsSpy.mockReturnValue({});
        createStructuredFieldsSpy.mockReturnValue({
          sources: [],
        });

        const result = await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
        });

        expect(result).toEqual([]);
        expect(logger.info).toHaveBeenCalledWith(
          'gRPC fallback: Coordinator data retrieved',
          expect.objectContaining({
            items_count: 0,
          })
        );
      });
    });

    describe('Error Handling', () => {
      it('should handle errors gracefully and return empty array', async () => {
        shouldCallCoordinatorSpy.mockReturnValue(true);
        callCoordinatorRouteSpy.mockRejectedValue(new Error('Network error'));

        const result = await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
        });

        expect(result).toEqual([]);
        expect(logger.warn).toHaveBeenCalledWith(
          'gRPC fallback failed',
          expect.objectContaining({
            error: 'Network error',
          })
        );
      });

      it('should handle processing errors', async () => {
        shouldCallCoordinatorSpy.mockReturnValue(true);
        callCoordinatorRouteSpy.mockResolvedValue({});
        processCoordinatorResponseSpy.mockImplementation(() => {
          throw new Error('Processing error');
        });

        const result = await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
        });

        expect(result).toEqual([]);
        expect(logger.warn).toHaveBeenCalled();
      });
    });

    describe('Logging', () => {
      it('should log when calling Coordinator', async () => {
        shouldCallCoordinatorSpy.mockReturnValue(true);
        callCoordinatorRouteSpy.mockResolvedValue({});
        processCoordinatorResponseSpy.mockReturnValue({
          status: 'success_primary',
          success: true,
          target_services: [],
          normalized_fields: {},
        });
        interpretNormalizedFieldsSpy.mockReturnValue({});
        createStructuredFieldsSpy.mockReturnValue({ sources: [] });

        await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
          userId: 'user-456',
        });

        expect(logger.info).toHaveBeenCalledWith(
          'gRPC fallback: Calling Coordinator',
          expect.objectContaining({
            category: 'payment',
            tenantId: 'org-123',
            userId: 'user-456',
          })
        );
      });

      it('should log successful data retrieval', async () => {
        shouldCallCoordinatorSpy.mockReturnValue(true);
        callCoordinatorRouteSpy.mockResolvedValue({});
        processCoordinatorResponseSpy.mockReturnValue({
          status: 'success_primary',
          success: true,
          target_services: ['payment-service'],
          normalized_fields: {},
        });
        interpretNormalizedFieldsSpy.mockReturnValue({});
        createStructuredFieldsSpy.mockReturnValue({
          sources: [
            { sourceId: '1', contentSnippet: 'Content' },
            { sourceId: '2', contentSnippet: 'Content 2' },
          ],
        });

        await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
        });

        expect(logger.info).toHaveBeenCalledWith(
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
        shouldCallCoordinatorSpy.mockReturnValue(true);
        callCoordinatorRouteSpy.mockResolvedValue({});
        processCoordinatorResponseSpy.mockReturnValue({
          status: 'success_primary',
          success: true,
          target_services: [],
          normalized_fields: {},
        });
        interpretNormalizedFieldsSpy.mockReturnValue({});
        createStructuredFieldsSpy.mockReturnValue({ sources: [] });

        await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
          // userId not provided
        });

        expect(callCoordinatorRouteSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: 'anonymous',
          })
        );
      });

      it('should pass vectorResults count in metadata', async () => {
        shouldCallCoordinatorSpy.mockReturnValue(true);
        callCoordinatorRouteSpy.mockResolvedValue({});
        processCoordinatorResponseSpy.mockReturnValue({
          status: 'success_primary',
          success: true,
          target_services: [],
          normalized_fields: {},
        });
        interpretNormalizedFieldsSpy.mockReturnValue({});
        createStructuredFieldsSpy.mockReturnValue({ sources: [] });

        await grpcFetchByCategory('payment', {
          query: 'test query',
          tenantId: 'org-123',
          vectorResults: [
            { id: '1' },
            { id: '2' },
            { id: '3' },
          ],
        });

        expect(callCoordinatorRouteSpy).toHaveBeenCalledWith(
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






