/**
 * Coordinator Response Parser Unit Tests
 * Tests for parsing RouteResponse, extracting business data, and handling all scenarios
 */

// MOCKS MUST BE FIRST - before any imports (Jest hoists these)
// For ES modules, use require() to access jest in factory functions
jest.mock('../../../src/utils/logger.util.js', () => {
  const { jest } = require('@jest/globals');
  return {
    logger: {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  };
});

import { jest } from '@jest/globals';

import {
  parseRouteResponse,
  extractBusinessData,
  getRoutingSummary,
  isAllFailed,
  isFallbackUsed,
  getQualityAssessment,
} from '../../../src/services/coordinatorResponseParser.service.js';
import { logger } from '../../../src/utils/logger.util.js';

describe('Coordinator Response Parser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mocks using jest.mocked() to ensure they're recognized as mocks
    jest.mocked(logger.debug).mockReset();
    jest.mocked(logger.warn).mockReset();
    jest.mocked(logger.error).mockReset();
  });

  describe('parseRouteResponse', () => {
    describe('Success at Primary Service (rank 1)', () => {
      const mockSuccessResponse = {
        target_services: ['payment-service'],
        normalized_fields: {
          successful_service: 'payment-service',
          rank_used: '1',
          total_attempts: '1',
          stopped_reason: 'found_good_response',
          quality_score: '0.9',
          primary_target: 'payment-service',
          primary_confidence: '0.95',
          processing_time: '200ms',
        },
        envelope_json: JSON.stringify({
          version: '1.0',
          timestamp: '2025-01-27T00:00:00Z',
          request_id: 'req-123',
          tenant_id: 'org-123',
          user_id: 'user-456',
          source: 'payment-service',
          payload: {
            payments: [
              { id: '1', amount: 100, date: '2025-01-20' },
              { id: '2', amount: 200, date: '2025-01-21' },
            ],
          },
        }),
        routing_metadata: JSON.stringify({
          routing_strategy: 'cascading_fallback',
          ai_ranking: [
            {
              name: 'payment-service',
              confidence: 0.95,
              reasoning: 'High confidence match',
            },
          ],
          execution: {
            total_attempts: 1,
            successful_rank: 1,
            stopped_reason: 'found_good_response',
            successful_service: 'payment-service',
          },
          performance: {
            cascade_time: '150ms',
            total_duration_ms: 200,
          },
        }),
      };

      it('should parse successful primary response correctly', () => {
        const parsed = parseRouteResponse(mockSuccessResponse);

        expect(parsed).toBeDefined();
        expect(parsed.status).toBe('success_primary');
        expect(parsed.success).toBe(true);
        expect(parsed.successful_service).toBe('payment-service');
        expect(parsed.rank_used).toBe(1);
        expect(parsed.total_attempts).toBe(1);
        expect(parsed.stopped_reason).toBe('found_good_response');
        expect(parsed.quality_score).toBe(0.9);
        expect(parsed.primary_target).toBe('payment-service');
        expect(parsed.primary_confidence).toBe(0.95);
        expect(parsed.processing_time_ms).toBe(200);
      });

      it('should parse envelope_json correctly', () => {
        const parsed = parseRouteResponse(mockSuccessResponse);

        expect(parsed.envelope).toBeDefined();
        expect(parsed.envelope.version).toBe('1.0');
        expect(parsed.envelope.source).toBe('payment-service');
        expect(parsed.envelope.payload).toBeDefined();
        expect(parsed.envelope.payload.payments).toHaveLength(2);
      });

      it('should parse routing_metadata correctly', () => {
        const parsed = parseRouteResponse(mockSuccessResponse);

        expect(parsed.routing).toBeDefined();
        expect(parsed.routing.routing_strategy).toBe('cascading_fallback');
        expect(parsed.routing.execution.successful_service).toBe('payment-service');
        expect(parsed.routing.performance.total_duration_ms).toBe(200);
      });
    });

    describe('Success at Fallback Service (rank > 1)', () => {
      const mockFallbackResponse = {
        target_services: ['payment-service', 'billing-service'],
        normalized_fields: {
          successful_service: 'billing-service',
          rank_used: '2',
          total_attempts: '2',
          stopped_reason: 'found_good_response',
          quality_score: '0.7',
          primary_target: 'payment-service',
          primary_confidence: '0.85',
          processing_time: '350ms',
        },
        envelope_json: JSON.stringify({
          version: '1.0',
          timestamp: '2025-01-27T00:00:00Z',
          source: 'billing-service',
          payload: {
            billing_info: { total: 500, due_date: '2025-02-01' },
          },
        }),
        routing_metadata: JSON.stringify({
          routing_strategy: 'cascading_fallback',
          execution: {
            total_attempts: 2,
            successful_rank: 2,
            stopped_reason: 'found_good_response',
            successful_service: 'billing-service',
          },
          all_attempts: [
            {
              rank: 1,
              service: 'payment-service',
              success: false,
              quality: 0.3,
            },
            {
              rank: 2,
              service: 'billing-service',
              success: true,
              quality: 0.7,
            },
          ],
        }),
      };

      it('should parse fallback response correctly', () => {
        const parsed = parseRouteResponse(mockFallbackResponse);

        expect(parsed.status).toBe('success_fallback');
        expect(parsed.success).toBe(true);
        expect(parsed.successful_service).toBe('billing-service');
        expect(parsed.rank_used).toBe(2);
        expect(parsed.total_attempts).toBe(2);
        expect(parsed.quality_score).toBe(0.7);
        expect(parsed.processing_time_ms).toBe(350);
      });

      it('should identify fallback was used', () => {
        const parsed = parseRouteResponse(mockFallbackResponse);
        expect(isFallbackUsed(parsed)).toBe(true);
      });
    });

    describe('All Services Failed', () => {
      const mockFailureResponse = {
        target_services: ['service-1', 'service-2', 'service-3'],
        normalized_fields: {
          successful_service: 'none',
          rank_used: '0',
          total_attempts: '3',
          stopped_reason: 'exhausted_candidates',
          quality_score: '0',
          primary_target: 'service-1',
          primary_confidence: '0.6',
        },
        envelope_json: '{}',
        routing_metadata: JSON.stringify({
          routing_strategy: 'cascading_fallback',
          execution: {
            total_attempts: 3,
            successful_rank: 0,
            stopped_reason: 'exhausted_candidates',
            successful_service: 'none',
          },
          all_attempts: [
            { rank: 1, service: 'service-1', success: false },
            { rank: 2, service: 'service-2', success: false },
            { rank: 3, service: 'service-3', success: false },
          ],
        }),
      };

      it('should parse failure response correctly', () => {
        const parsed = parseRouteResponse(mockFailureResponse);

        expect(parsed.status).toBe('all_failed');
        expect(parsed.success).toBe(false);
        expect(parsed.successful_service).toBe('none');
        expect(parsed.rank_used).toBe(0);
        expect(parsed.total_attempts).toBe(3);
        expect(parsed.stopped_reason).toBe('exhausted_candidates');
        expect(parsed.quality_score).toBe(0);
      });

      it('should identify all services failed', () => {
        const parsed = parseRouteResponse(mockFailureResponse);
        expect(isAllFailed(parsed)).toBe(true);
      });
    });

    describe('Edge Cases and Error Handling', () => {
      it('should handle null response', () => {
        const parsed = parseRouteResponse(null);
        expect(parsed).toBeNull();
      });

      it('should handle undefined response', () => {
        const parsed = parseRouteResponse(undefined);
        expect(parsed).toBeNull();
      });

      it('should handle missing normalized_fields', () => {
        const response = {
          target_services: ['service-1'],
          envelope_json: '{}',
        };

        const parsed = parseRouteResponse(response);

        expect(parsed).toBeDefined();
        expect(parsed.normalized_fields).toEqual({});
        expect(parsed.successful_service).toBe('none');
        expect(parsed.rank_used).toBe(0);
        expect(parsed.status).toBe('all_failed');
      });

      it('should handle missing target_services', () => {
        const response = {
          normalized_fields: {
            successful_service: 'payment-service',
            rank_used: '1',
          },
        };

        const parsed = parseRouteResponse(response);
        expect(parsed.target_services).toEqual([]);
      });

      it('should handle invalid JSON in envelope_json', () => {
        const response = {
          target_services: ['service-1'],
          normalized_fields: { successful_service: 'service-1', rank_used: '1' },
          envelope_json: 'invalid json{',
        };

        const parsed = parseRouteResponse(response);

        expect(parsed).toBeDefined();
        expect(parsed.envelope).toBeNull();
        expect(jest.mocked(logger.warn)).toHaveBeenCalledWith(
          'Failed to parse envelope_json',
          expect.any(Object)
        );
      });

      it('should handle invalid JSON in routing_metadata', () => {
        const response = {
          target_services: ['service-1'],
          normalized_fields: { successful_service: 'service-1', rank_used: '1' },
          routing_metadata: 'invalid json{',
        };

        const parsed = parseRouteResponse(response);

        expect(parsed).toBeDefined();
        expect(parsed.routing).toBeNull();
        expect(jest.mocked(logger.warn)).toHaveBeenCalledWith(
          'Failed to parse routing_metadata',
          expect.any(Object)
        );
      });

      it('should handle envelope_json as object (not string)', () => {
        const envelopeObj = {
          version: '1.0',
          payload: { data: 'test' },
        };

        const response = {
          target_services: ['service-1'],
          normalized_fields: { successful_service: 'service-1', rank_used: '1' },
          envelope_json: envelopeObj, // Already an object
        };

        const parsed = parseRouteResponse(response);
        expect(parsed.envelope).toEqual(envelopeObj);
      });

      it('should handle processing_time as number', () => {
        const response = {
          target_services: ['service-1'],
          normalized_fields: {
            successful_service: 'service-1',
            rank_used: '1',
            processing_time_ms: 250, // Number instead of string
          },
        };

        const parsed = parseRouteResponse(response);
        expect(parsed.processing_time_ms).toBe(250);
      });

      it('should handle processing_time as string with "ms"', () => {
        const response = {
          target_services: ['service-1'],
          normalized_fields: {
            successful_service: 'service-1',
            rank_used: '1',
            processing_time: '300ms',
          },
        };

        const parsed = parseRouteResponse(response);
        expect(parsed.processing_time_ms).toBe(300);
      });

      it('should handle empty envelope_json', () => {
        const response = {
          target_services: ['service-1'],
          normalized_fields: { successful_service: 'service-1', rank_used: '1' },
          envelope_json: '',
        };

        const parsed = parseRouteResponse(response);
        expect(parsed.envelope).toBeNull();
      });

      it('should handle parsing errors gracefully', () => {
        const response = {
          target_services: ['service-1'],
          normalized_fields: {
            // This will cause an error if we try to access properties incorrectly
            successful_service: 'service-1',
            rank_used: '1',
          },
        };

        // Should not throw
        const parsed = parseRouteResponse(response);
        expect(parsed).toBeDefined();
      });
    });
  });

  describe('extractBusinessData', () => {
    it('should extract business data from successful response', () => {
      const parsed = {
        success: true,
        envelope: {
          payload: {
            payments: [{ id: '1', amount: 100 }],
          },
          source: 'payment-service',
          timestamp: '2025-01-27T00:00:00Z',
          request_id: 'req-123',
          tenant_id: 'org-123',
          user_id: 'user-456',
        },
        normalized_fields: {
          successful_service: 'payment-service',
          rank_used: '1',
          quality_score: '0.9',
        },
        quality_score: 0.9,
        rank_used: 1,
        successful_service: 'payment-service',
      };

      const businessData = extractBusinessData(parsed);

      expect(businessData.data).toEqual({
        payments: [{ id: '1', amount: 100 }],
      });
      expect(businessData.metadata.source).toBe('payment-service');
      expect(businessData.metadata.quality_score).toBe(0.9);
      expect(businessData.metadata.rank_used).toBe(1);
    });

    it('should extract business fields from normalized_fields', () => {
      const parsed = {
        success: true,
        normalized_fields: {
          successful_service: 'payment-service',
          rank_used: '1',
          // Business fields (not system fields)
          payment_id: 'pay-123',
          amount: '100.50',
          status: 'completed',
        },
      };

      const businessData = extractBusinessData(parsed);

      expect(businessData.data).toEqual({
        payment_id: 'pay-123',
        amount: '100.50',
        status: 'completed',
      });
    });

    it('should extract sources from envelope payload', () => {
      const parsed = {
        success: true,
        envelope: {
          payload: {
            content: [
              { id: '1', title: 'Payment 1' },
              { id: '2', title: 'Payment 2' },
            ],
          },
        },
        normalized_fields: {
          successful_service: 'payment-service',
          rank_used: '1',
        },
      };

      const businessData = extractBusinessData(parsed);

      expect(businessData.sources).toHaveLength(2);
      expect(businessData.sources[0].id).toBe('1');
    });

    it('should extract sources from routing metadata', () => {
      const parsed = {
        success: true,
        routing: {
          all_attempts: [
            {
              rank: 1,
              service: 'payment-service',
              success: true,
              quality: 0.9,
            },
            {
              rank: 2,
              service: 'billing-service',
              success: false,
              quality: 0.3,
            },
          ],
        },
        normalized_fields: {
          successful_service: 'payment-service',
          rank_used: '1',
        },
      };

      const businessData = extractBusinessData(parsed);

      expect(businessData.sources).toHaveLength(1);
      expect(businessData.sources[0].service).toBe('payment-service');
      expect(businessData.sources[0].rank).toBe(1);
    });

    it('should return empty data for failed response', () => {
      const parsed = {
        success: false,
        status: 'all_failed',
      };

      const businessData = extractBusinessData(parsed);

      expect(businessData.data).toBeNull();
      expect(businessData.sources).toEqual([]);
      expect(businessData.metadata).toEqual({});
    });

    it('should return empty data for null parsed response', () => {
      const businessData = extractBusinessData(null);

      expect(businessData.data).toBeNull();
      expect(businessData.sources).toEqual([]);
    });

    it('should parse JSON values in normalized_fields', () => {
      const parsed = {
        success: true,
        normalized_fields: {
          successful_service: 'payment-service',
          rank_used: '1',
          metadata: '{"key":"value"}', // JSON string
        },
      };

      const businessData = extractBusinessData(parsed);

      expect(businessData.data.metadata).toEqual({ key: 'value' });
    });

    it('should handle JSON parse errors in normalized_fields', () => {
      const parsed = {
        success: true,
        normalized_fields: {
          successful_service: 'payment-service',
          rank_used: '1',
          metadata: 'invalid json{', // Invalid JSON
        },
      };

      const businessData = extractBusinessData(parsed);

      // Should keep as string if parsing fails
      expect(businessData.data.metadata).toBe('invalid json{');
    });
  });

  describe('getRoutingSummary', () => {
    it('should generate summary for primary success', () => {
      const parsed = {
        status: 'success_primary',
        success: true,
        successful_service: 'payment-service',
        rank_used: 1,
        total_attempts: 1,
        stopped_reason: 'found_good_response',
        quality_score: 0.9,
        processing_time_ms: 200,
        target_services: ['payment-service'],
        primary_target: 'payment-service',
        primary_confidence: 0.95,
      };

      const summary = getRoutingSummary(parsed);

      expect(summary.status).toBe('success_primary');
      expect(summary.success).toBe(true);
      expect(summary.message).toContain('Success at primary service');
      expect(summary.message).toContain('payment-service');
      expect(summary.message).toContain('0.9');
    });

    it('should generate summary for fallback success', () => {
      const parsed = {
        status: 'success_fallback',
        success: true,
        successful_service: 'billing-service',
        rank_used: 2,
        total_attempts: 2,
        stopped_reason: 'found_good_response',
        quality_score: 0.7,
        processing_time_ms: 350,
        target_services: ['payment-service', 'billing-service'],
      };

      const summary = getRoutingSummary(parsed);

      expect(summary.status).toBe('success_fallback');
      expect(summary.message).toContain('Success at fallback service');
      expect(summary.message).toContain('billing-service');
      expect(summary.message).toContain('rank 2');
    });

    it('should generate summary for all failed', () => {
      const parsed = {
        status: 'all_failed',
        success: false,
        successful_service: 'none',
        rank_used: 0,
        total_attempts: 3,
        stopped_reason: 'exhausted_candidates',
        quality_score: 0,
        target_services: ['service-1', 'service-2', 'service-3'],
      };

      const summary = getRoutingSummary(parsed);

      expect(summary.status).toBe('all_failed');
      expect(summary.message).toContain('All 3 service(s) failed');
      expect(summary.message).toContain('service-1, service-2, service-3');
    });

    it('should handle null parsed response', () => {
      const summary = getRoutingSummary(null);

      expect(summary.status).toBe('no_response');
      expect(summary.message).toBe('No response from Coordinator');
    });
  });

  describe('Helper Functions', () => {
    describe('isAllFailed', () => {
      it('should return true for all_failed status', () => {
        const parsed = { status: 'all_failed' };
        expect(isAllFailed(parsed)).toBe(true);
      });

      it('should return true when successful_service is "none"', () => {
        const parsed = { successful_service: 'none' };
        expect(isAllFailed(parsed)).toBe(true);
      });

      it('should return true when rank_used is 0', () => {
        const parsed = { rank_used: 0 };
        expect(isAllFailed(parsed)).toBe(true);
      });

      it('should return false for successful response', () => {
        const parsed = {
          status: 'success_primary',
          successful_service: 'payment-service',
          rank_used: 1,
        };
        expect(isAllFailed(parsed)).toBe(false);
      });

      it('should return false for null', () => {
        expect(isAllFailed(null)).toBe(false);
      });
    });

    describe('isFallbackUsed', () => {
      it('should return true for success_fallback status', () => {
        const parsed = { status: 'success_fallback' };
        expect(isFallbackUsed(parsed)).toBe(true);
      });

      it('should return true when rank_used > 1 and success', () => {
        const parsed = { rank_used: 2, success: true };
        expect(isFallbackUsed(parsed)).toBe(true);
      });

      it('should return false for primary success', () => {
        const parsed = { status: 'success_primary', rank_used: 1 };
        expect(isFallbackUsed(parsed)).toBe(false);
      });

      it('should return false for failed response', () => {
        const parsed = { status: 'all_failed', rank_used: 0 };
        expect(isFallbackUsed(parsed)).toBe(false);
      });
    });

    describe('getQualityAssessment', () => {
      it('should return high quality for score >= 0.8', () => {
        const parsed = { success: true, quality_score: 0.9 };
        const assessment = getQualityAssessment(parsed);

        expect(assessment.level).toBe('high');
        expect(assessment.score).toBe(0.9);
        expect(assessment.acceptable).toBe(true);
      });

      it('should return medium quality for score >= 0.6', () => {
        const parsed = { success: true, quality_score: 0.7 };
        const assessment = getQualityAssessment(parsed);

        expect(assessment.level).toBe('medium');
        expect(assessment.score).toBe(0.7);
        expect(assessment.acceptable).toBe(true);
      });

      it('should return low quality for score < 0.6', () => {
        const parsed = { success: true, quality_score: 0.5 };
        const assessment = getQualityAssessment(parsed);

        expect(assessment.level).toBe('low');
        expect(assessment.score).toBe(0.5);
        expect(assessment.acceptable).toBe(true);
      });

      it('should return unacceptable for score < 0.5', () => {
        const parsed = { success: true, quality_score: 0.4 };
        const assessment = getQualityAssessment(parsed);

        expect(assessment.level).toBe('low');
        expect(assessment.acceptable).toBe(false);
      });

      it('should return none for failed response', () => {
        const parsed = { success: false };
        const assessment = getQualityAssessment(parsed);

        expect(assessment.level).toBe('none');
        expect(assessment.score).toBe(0);
        expect(assessment.acceptable).toBe(false);
      });

      it('should return none for null response', () => {
        const assessment = getQualityAssessment(null);
        expect(assessment.level).toBe('none');
        expect(assessment.acceptable).toBe(false);
      });
    });
  });
});






