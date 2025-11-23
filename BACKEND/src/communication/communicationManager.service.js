/**
 * Communication Manager Service
 * Decision layer for when to call Coordinator and handles Coordinator communication
 * 
 * RAG must ALWAYS search its own Supabase database first.
 * Coordinator is called ONLY if internal data is insufficient.
 */

import { logger } from '../utils/logger.util.js';
import { routeRequest } from '../clients/coordinator.client.js';
import { 
  parseRouteResponse, 
  extractBusinessData, 
  getRoutingSummary 
} from '../services/coordinatorResponseParser.service.js';

/**
 * Decision thresholds
 */
const VECTOR_SIMILARITY_THRESHOLD = 0.7; // Minimum similarity score to consider internal data sufficient
const MIN_REQUIRED_SOURCES = 1; // Minimum number of sources to consider internal data sufficient

/**
 * Determine if Coordinator should be called
 * 
 * Returns FALSE if internal data is sufficient:
 * - High vector similarity scores
 * - Required fields exist in internal data
 * - Data freshness is acceptable
 * 
 * Returns TRUE only if:
 * - Missing required fields
 * - Low similarity results
 * - Data requires real-time freshness
 * - Microservice-specific live updates needed
 * 
 * @param {string} query - User query text
 * @param {Array} vectorResults - Results from vector search
 * @param {Object} internalData - Additional internal data (metadata, KG relations, etc.)
 * @returns {boolean} True if Coordinator should be called, false otherwise
 */
export function shouldCallCoordinator(query, vectorResults = [], internalData = {}) {
  try {
    // If no vector results, check if we have other internal data
    if (vectorResults.length === 0) {
      // Check if we have cached data, KG relations, or other internal sources
      const hasInternalData = 
        internalData.cachedData?.length > 0 ||
        internalData.kgRelations?.length > 0 ||
        internalData.metadata?.length > 0;
      
      if (!hasInternalData) {
        logger.info('Should call Coordinator: No internal data available', {
          query: query.substring(0, 100),
        });
        return true; // No internal data, need Coordinator
      }
    }

    // Check vector similarity scores
    if (vectorResults.length > 0) {
      const avgSimilarity = vectorResults.reduce((sum, r) => sum + (r.similarity || r.relevanceScore || 0), 0) / vectorResults.length;
      
      // High similarity and sufficient sources - internal data is sufficient
      if (avgSimilarity >= VECTOR_SIMILARITY_THRESHOLD && vectorResults.length >= MIN_REQUIRED_SOURCES) {
        logger.debug('Should NOT call Coordinator: High similarity and sufficient sources', {
          avgSimilarity,
          sourceCount: vectorResults.length,
        });
        return false; // Internal data is sufficient
      }

      // Low similarity - might need Coordinator
      if (avgSimilarity < VECTOR_SIMILARITY_THRESHOLD) {
        logger.info('Should call Coordinator: Low similarity scores', {
          avgSimilarity,
          threshold: VECTOR_SIMILARITY_THRESHOLD,
        });
        return true; // Low similarity, might need real-time data
      }
    }

    // Check for real-time data requirements in query
    const realTimeKeywords = [
      'current', 'now', 'live', 'real-time', 'realtime', 'latest', 'updated',
      'status', 'progress', 'active', 'running', 'pending', 'completed',
      'today', 'now', 'recent', 'just now'
    ];
    
    const queryLower = query.toLowerCase();
    const requiresRealTime = realTimeKeywords.some(keyword => queryLower.includes(keyword));
    
    if (requiresRealTime) {
      logger.info('Should call Coordinator: Query requires real-time data', {
        query: query.substring(0, 100),
      });
      return true; // Query explicitly requires real-time data
    }

    // Check for microservice-specific requirements
    const microserviceKeywords = {
      'assessment': ['test', 'exam', 'quiz', 'assessment', 'question', 'answer', 'score'],
      'devlab': ['code', 'programming', 'debug', 'error', 'sandbox', 'execution', 'compile'],
      'analytics': ['report', 'analytics', 'metrics', 'dashboard', 'statistics', 'performance'],
      'content': ['course', 'lesson', 'module', 'content', 'material', 'resource'],
    };

    const requiresMicroservice = Object.entries(microserviceKeywords).some(([service, keywords]) => {
      return keywords.some(keyword => queryLower.includes(keyword));
    });

    if (requiresMicroservice && vectorResults.length < MIN_REQUIRED_SOURCES) {
      logger.info('Should call Coordinator: Microservice-specific query with insufficient internal data', {
        query: query.substring(0, 100),
        sourceCount: vectorResults.length,
      });
      return true; // Microservice query but insufficient internal data
    }

    // Check if required fields are missing
    // This is a simplified check - can be enhanced based on specific field requirements
    const hasRequiredFields = vectorResults.length > 0 || internalData.hasRequiredFields === true;
    
    if (!hasRequiredFields) {
      logger.info('Should call Coordinator: Missing required fields', {
        query: query.substring(0, 100),
      });
      return true; // Missing required fields
    }

    // Default: internal data is sufficient
    logger.debug('Should NOT call Coordinator: Internal data is sufficient', {
      sourceCount: vectorResults.length,
      hasInternalData: !!internalData,
    });
    return false;
  } catch (error) {
    logger.error('Error in shouldCallCoordinator decision', {
      error: error.message,
      query: query.substring(0, 100),
    });
    // On error, default to NOT calling Coordinator (fail-safe)
    return false;
  }
}

/**
 * Call Coordinator Route
 * Only called if shouldCallCoordinator() returns true
 * 
 * @param {Object} params - Route parameters
 * @param {string} params.tenant_id - Tenant identifier
 * @param {string} params.user_id - User identifier
 * @param {string} params.query_text - Original user query
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Object|null>} Coordinator response or null
 */
export async function callCoordinatorRoute({ tenant_id, user_id, query_text, metadata = {} }) {
  try {
    logger.info('Calling Coordinator.Route()', {
      tenant_id,
      user_id,
      query_length: query_text?.length || 0,
    });

    const response = await routeRequest({
      tenant_id,
      user_id,
      query_text,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        source: 'rag',
      },
    });

    if (response) {
      logger.info('Coordinator route response received', {
        tenant_id,
        user_id,
        target_services: response.target_services || [],
        has_normalized_fields: !!response.normalized_fields,
      });
    } else {
      logger.warn('Coordinator route returned null', {
        tenant_id,
        user_id,
      });
    }

    return response;
  } catch (error) {
    logger.error('Error calling Coordinator route', {
      error: error.message,
      tenant_id,
      user_id,
    });
    return null;
  }
}

/**
 * Process Coordinator response
 * Transforms Coordinator response into format usable by RAG
 * Uses comprehensive parser for all scenarios
 * 
 * @param {Object} coordinatorResponse - Response from Coordinator.Route()
 * @returns {Object} Processed response with normalized data
 */
export function processCoordinatorResponse(coordinatorResponse) {
  if (!coordinatorResponse) {
    return null;
  }

  try {
    // Use comprehensive parser
    const parsed = parseRouteResponse(coordinatorResponse);
    if (!parsed) {
      logger.warn('Failed to parse Coordinator response');
      return null;
    }

    // Extract business data
    const businessData = extractBusinessData(parsed);
    
    // Get routing summary for logging
    const routingSummary = getRoutingSummary(parsed);
    
    // Log routing summary
    logger.info('Coordinator response processed', {
      ...routingSummary,
      has_business_data: !!businessData.data,
      sources_count: businessData.sources.length,
    });

    // Return enhanced processed response
    return {
      // Original parsed fields
      target_services: parsed.target_services,
      normalized_fields: parsed.normalized_fields,
      envelope: parsed.envelope,
      routing: parsed.routing,
      
      // Status information
      status: parsed.status,
      success: parsed.success,
      successful_service: parsed.successful_service,
      rank_used: parsed.rank_used,
      total_attempts: parsed.total_attempts,
      stopped_reason: parsed.stopped_reason,
      quality_score: parsed.quality_score,
      
      // Business data
      business_data: businessData.data,
      sources: businessData.sources,
      metadata: businessData.metadata,
      
      // Routing summary
      routing_summary: routingSummary,
    };
  } catch (error) {
    logger.error('Error processing Coordinator response', {
      error: error.message,
      stack: error.stack,
    });
    return null;
  }
}

