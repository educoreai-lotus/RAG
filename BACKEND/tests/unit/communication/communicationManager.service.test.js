/**
 * Communication Manager Unit Tests
 * Tests for decision logic, Coordinator integration, and response processing
 */

import { jest } from '@jest/globals';

// Mock modules BEFORE imports (ES modules require this)
jest.mock('../../../src/clients/coordinator.client.js');
jest.mock('../../../src/services/coordinatorResponseParser.service.js');
jest.mock('../../../src/utils/logger.util.js');

// Import AFTER mocks
import { routeRequest } from '../../../src/clients/coordinator.client.js';
import {
  parseRouteResponse,
  extractBusinessData,
  getRoutingSummary,
} from '../../../src/services/coordinatorResponseParser.service.js';
import { logger } from '../../../src/utils/logger.util.js';
import {
  shouldCallCoordinator,
  callCoordinatorRoute,
  processCoordinatorResponse,
} from '../../../src/communication/communicationManager.service.js';

describe('Communication Manager', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Spy on logger methods (object methods)
    jest.spyOn(logger, 'info').mockImplementation(() => {});
    jest.spyOn(logger, 'warn').mockImplementation(() => {});
    jest.spyOn(logger, 'error').mockImplementation(() => {});
    jest.spyOn(logger, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('shouldCallCoordinator', () => {
    describe('Decision Logic', () => {
      it('should return true when no vector results and no internal data', () => {
        const result = shouldCallCoordinator('test query', [], {});

        expect(result).toBe(true);
        expect(logger.info).toHaveBeenCalledWith(
          'Should call Coordinator: No internal data available',
          expect.any(Object)
        );
      });

      it('should return false when vector results have high similarity', () => {
        const vectorResults = [
          { similarity: 0.85, content: 'result 1' },
          { similarity: 0.90, content: 'result 2' },
        ];

        const result = shouldCallCoordinator('test query', vectorResults, {});

        expect(result).toBe(false);
        expect(logger.debug).toHaveBeenCalledWith(
          'Should NOT call Coordinator: High similarity and sufficient sources',
          expect.any(Object)
        );
      });

      it('should return true when vector similarity is low', () => {
        const vectorResults = [
          { similarity: 0.5, content: 'result 1' },
          { similarity: 0.6, content: 'result 2' },
        ];

        const result = shouldCallCoordinator('test query', vectorResults, {});

        expect(result).toBe(true);
        expect(logger.info).toHaveBeenCalledWith(
          'Should call Coordinator: Low similarity scores',
          expect.any(Object)
        );
      });

      it('should return true when query requires real-time data', () => {
        // Use empty vector results so real-time check is reached
        const vectorResults = [];

        const result = shouldCallCoordinator('show me current status', vectorResults, {});

        expect(result).toBe(true);
        expect(logger.info).toHaveBeenCalledWith(
          'Should call Coordinator: Query requires real-time data',
          expect.any(Object)
        );
      });

      it('should return true for microservice-specific queries with insufficient data', () => {
        const vectorResults = []; // No results

        const result = shouldCallCoordinator('show me my test results', vectorResults, {});

        expect(result).toBe(true);
        expect(logger.info).toHaveBeenCalledWith(
          'Should call Coordinator: Microservice-specific query with insufficient internal data',
          expect.any(Object)
        );
      });

      it('should return false when internal data is sufficient', () => {
        const vectorResults = [
          { similarity: 0.85, content: 'result 1' },
        ];
        const internalData = {
          cachedData: [{ id: '1' }],
        };

        const result = shouldCallCoordinator('test query', vectorResults, internalData);

        expect(result).toBe(false);
      });

      it('should return false on error (fail-safe)', () => {
        // Force an error by passing null query (will cause substring error)
        const result = shouldCallCoordinator(null, [], {});

        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalled();
      });
    });

    describe('Real-time Keywords', () => {
      const realTimeQueries = [
        'show me current status',
        'what is the latest update',
        'realtime data please',
        'show me today\'s progress',
        'what is running now',
      ];

      realTimeQueries.forEach((query) => {
        it(`should detect real-time requirement in: "${query}"`, () => {
          const result = shouldCallCoordinator(query, [], {});
          expect(result).toBe(true);
        });
      });
    });

    describe('Microservice Keywords', () => {
      it('should detect assessment keywords', () => {
        const result = shouldCallCoordinator('show me my test results', [], {});
        expect(result).toBe(true);
      });

      it('should detect devlab keywords', () => {
        const result = shouldCallCoordinator('debug this code error', [], {});
        expect(result).toBe(true);
      });

      it('should detect analytics keywords', () => {
        const result = shouldCallCoordinator('show me analytics report', [], {});
        expect(result).toBe(true);
      });

      it('should detect content keywords', () => {
        const result = shouldCallCoordinator('show me course material', [], {});
        expect(result).toBe(true);
      });
    });
  });

  describe('callCoordinatorRoute', () => {
    it('should call routeRequest with correct parameters', async () => {
      const mockResponse = {
        target_services: ['payment-service'],
        normalized_fields: { successful_service: 'payment-service' },
      };

      routeRequest.mockResolvedValue(mockResponse);

      const result = await callCoordinatorRoute({
        tenant_id: 'org-123',
        user_id: 'user-456',
        query_text: 'test query',
        metadata: { category: 'payment' },
      });

      expect(routeRequest).toHaveBeenCalledWith({
        tenant_id: 'org-123',
        user_id: 'user-456',
        query_text: 'test query',
        metadata: expect.objectContaining({
          category: 'payment',
          timestamp: expect.any(String),
          source: 'rag',
        }),
      });

      expect(result).toEqual(mockResponse);
      expect(logger.info).toHaveBeenCalledWith(
        'Calling Coordinator.Route()',
        expect.any(Object)
      );
    });

    it('should handle null response', async () => {
      routeRequest.mockResolvedValue(null);

      const result = await callCoordinatorRoute({
        tenant_id: 'org-123',
        user_id: 'user-456',
        query_text: 'test query',
      });

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Coordinator route returned null',
        expect.any(Object)
      );
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Network error');
      routeRequest.mockRejectedValue(error);

      const result = await callCoordinatorRoute({
        tenant_id: 'org-123',
        user_id: 'user-456',
        query_text: 'test query',
      });

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Error calling Coordinator route',
        expect.objectContaining({
          error: 'Network error',
        })
      );
    });

    it('should add timestamp and source to metadata', async () => {
      routeRequest.mockResolvedValue({});

      await callCoordinatorRoute({
        tenant_id: 'org-123',
        user_id: 'user-456',
        query_text: 'test query',
        metadata: { custom: 'value' },
      });

      expect(routeRequest).toHaveBeenCalledWith({
        tenant_id: 'org-123',
        user_id: 'user-456',
        query_text: 'test query',
        metadata: {
          custom: 'value',
          timestamp: expect.any(String),
          source: 'rag',
        },
      });
    });
  });

  describe('processCoordinatorResponse', () => {
    describe('Scenario 1: Primary Success (rank 1)', () => {
      const mockCoordinatorResponse = {
        target_services: ['payment-service'],
        normalized_fields: {
          successful_service: 'payment-service',
          rank_used: '1',
          total_attempts: '1',
          quality_score: '0.9',
        },
        envelope_json: JSON.stringify({
          version: '1.0',
          payload: { payments: [] },
        }),
        routing_metadata: JSON.stringify({
          routing_strategy: 'cascading_fallback',
        }),
      };

      const mockParsedResponse = {
        status: 'success_primary',
        success: true,
        successful_service: 'payment-service',
        rank_used: 1,
        total_attempts: 1,
        quality_score: 0.9,
        target_services: ['payment-service'],
        normalized_fields: mockCoordinatorResponse.normalized_fields,
        envelope: { version: '1.0', payload: { payments: [] } },
        routing: { routing_strategy: 'cascading_fallback' },
      };

      const mockBusinessData = {
        data: { payments: [] },
        sources: [],
        metadata: {
          source: 'payment-service',
          quality_score: 0.9,
        },
      };

      const mockRoutingSummary = {
        status: 'success_primary',
        message: 'Success at primary service',
      };

      beforeEach(() => {
        parseRouteResponse.mockReturnValue(mockParsedResponse);
        extractBusinessData.mockReturnValue(mockBusinessData);
        getRoutingSummary.mockReturnValue(mockRoutingSummary);
      });

      it('should process successful primary response', () => {
        const processed = processCoordinatorResponse(mockCoordinatorResponse);

        expect(parseRouteResponse).toHaveBeenCalledWith(mockCoordinatorResponse);
        expect(extractBusinessData).toHaveBeenCalledWith(mockParsedResponse);
        expect(getRoutingSummary).toHaveBeenCalledWith(mockParsedResponse);

        expect(processed).toBeDefined();
        expect(processed.status).toBe('success_primary');
        expect(processed.success).toBe(true);
        expect(processed.successful_service).toBe('payment-service');
        expect(processed.rank_used).toBe(1);
        expect(processed.business_data).toEqual(mockBusinessData.data);
        expect(processed.sources).toEqual(mockBusinessData.sources);
        expect(processed.routing_summary).toEqual(mockRoutingSummary);
      });

      it('should log routing summary', () => {
        processCoordinatorResponse(mockCoordinatorResponse);

        expect(logger.info).toHaveBeenCalledWith(
          'Coordinator response processed',
          expect.objectContaining({
            status: 'success_primary',
            has_business_data: true,
            sources_count: 0,
          })
        );
      });
    });

    describe('Scenario 2: Fallback Success (rank > 1)', () => {
      const mockCoordinatorResponse = {
        target_services: ['payment-service', 'billing-service'],
        normalized_fields: {
          successful_service: 'billing-service',
          rank_used: '2',
          total_attempts: '2',
          quality_score: '0.7',
        },
      };

      const mockParsedResponse = {
        status: 'success_fallback',
        success: true,
        successful_service: 'billing-service',
        rank_used: 2,
        total_attempts: 2,
        quality_score: 0.7,
        target_services: ['payment-service', 'billing-service'],
        normalized_fields: mockCoordinatorResponse.normalized_fields,
        envelope: { payload: { billing: {} } },
        routing: {},
      };

      const mockBusinessData = {
        data: { billing: {} },
        sources: [],
        metadata: {},
      };

      beforeEach(() => {
        parseRouteResponse.mockReturnValue(mockParsedResponse);
        extractBusinessData.mockReturnValue(mockBusinessData);
        getRoutingSummary.mockReturnValue({
          status: 'success_fallback',
          message: 'Success at fallback service',
        });
      });

      it('should process fallback success response', () => {
        const processed = processCoordinatorResponse(mockCoordinatorResponse);

        expect(processed.status).toBe('success_fallback');
        expect(processed.success).toBe(true);
        expect(processed.successful_service).toBe('billing-service');
        expect(processed.rank_used).toBe(2);
        expect(processed.total_attempts).toBe(2);
      });
    });

    describe('Scenario 3: All Failed', () => {
      const mockCoordinatorResponse = {
        target_services: ['service-1', 'service-2'],
        normalized_fields: {
          successful_service: 'none',
          rank_used: '0',
          total_attempts: '2',
        },
      };

      const mockParsedResponse = {
        status: 'all_failed',
        success: false,
        successful_service: 'none',
        rank_used: 0,
        total_attempts: 2,
        target_services: ['service-1', 'service-2'],
        normalized_fields: mockCoordinatorResponse.normalized_fields,
        envelope: null,
        routing: {},
      };

      const mockBusinessData = {
        data: null,
        sources: [],
        metadata: {},
      };

      beforeEach(() => {
        parseRouteResponse.mockReturnValue(mockParsedResponse);
        extractBusinessData.mockReturnValue(mockBusinessData);
        getRoutingSummary.mockReturnValue({
          status: 'all_failed',
          message: 'All services failed',
        });
      });

      it('should process all failed response', () => {
        const processed = processCoordinatorResponse(mockCoordinatorResponse);

        expect(processed.status).toBe('all_failed');
        expect(processed.success).toBe(false);
        expect(processed.successful_service).toBe('none');
        expect(processed.rank_used).toBe(0);
        expect(processed.business_data).toBeNull();
      });
    });

    describe('Error Handling', () => {
      it('should return null for null response', () => {
        const processed = processCoordinatorResponse(null);
        expect(processed).toBeNull();
      });

      it('should return null if parsing fails', () => {
        parseRouteResponse.mockReturnValue(null);

        const processed = processCoordinatorResponse({});

        expect(processed).toBeNull();
        expect(logger.warn).toHaveBeenCalledWith(
          'Failed to parse Coordinator response'
        );
      });

      it('should handle processing errors gracefully', () => {
        parseRouteResponse.mockImplementation(() => {
          throw new Error('Parse error');
        });

        const processed = processCoordinatorResponse({});

        expect(processed).toBeNull();
        expect(logger.error).toHaveBeenCalledWith(
          'Error processing Coordinator response',
          expect.any(Object)
        );
      });
    });

    describe('Response Structure', () => {
      it('should return complete processed response structure', () => {
        const mockParsed = {
          status: 'success_primary',
          success: true,
          target_services: ['service-1'],
          normalized_fields: {},
          envelope: {},
          routing: {},
          successful_service: 'service-1',
          rank_used: 1,
          total_attempts: 1,
          stopped_reason: 'found_good_response',
          quality_score: 0.9,
        };

        const mockBusinessData = {
          data: { test: 'data' },
          sources: [{ id: '1' }],
          metadata: { source: 'service-1' },
        };

        const mockSummary = {
          status: 'success_primary',
          message: 'Success',
        };

        parseRouteResponse.mockReturnValue(mockParsed);
        extractBusinessData.mockReturnValue(mockBusinessData);
        getRoutingSummary.mockReturnValue(mockSummary);

        const processed = processCoordinatorResponse({});

        expect(processed).toHaveProperty('target_services');
        expect(processed).toHaveProperty('normalized_fields');
        expect(processed).toHaveProperty('envelope');
        expect(processed).toHaveProperty('routing');
        expect(processed).toHaveProperty('status');
        expect(processed).toHaveProperty('success');
        expect(processed).toHaveProperty('business_data');
        expect(processed).toHaveProperty('sources');
        expect(processed).toHaveProperty('metadata');
        expect(processed).toHaveProperty('routing_summary');
      });
    });
  });
});






