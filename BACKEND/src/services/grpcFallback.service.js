import { logger } from '../utils/logger.util.js';
import { 
  shouldCallCoordinator, 
  callCoordinatorRoute, 
  processCoordinatorResponse 
} from '../communication/communicationManager.service.js';
import { 
  interpretNormalizedFields, 
  createStructuredFields 
} from '../communication/schemaInterpreter.service.js';

/**
 * gRPC Fallback Service
 * Integrates with Coordinator for real-time microservice data retrieval
 * 
 * NOTE: This service is called ONLY after internal RAG retrieval is insufficient.
 * The decision to call Coordinator is made by shouldCallCoordinator() in Communication Manager.
 */

const grpcEnabled = process.env.GRPC_ENABLED === 'true';

/**
 * Attempt to fetch EDUCORE data via Coordinator by category.
 * This function is called when internal RAG retrieval is insufficient.
 * 
 * Returns an array of { contentId, contentType, contentText, metadata } to be used as context.
 * 
 * @param {string} category - Query category
 * @param {Object} params - Parameters
 * @param {string} params.query - User query
 * @param {string} params.tenantId - Tenant identifier
 * @param {string} params.userId - User identifier (optional)
 * @param {Array} params.vectorResults - Vector search results (for decision making)
 * @param {Object} params.internalData - Additional internal data
 * @returns {Promise<Array>} Array of content items
 */
export async function grpcFetchByCategory(category, { query, tenantId, userId = 'anonymous', vectorResults = [], internalData = {} }) {
  if (!grpcEnabled) {
    logger.debug('gRPC fallback disabled');
    return [];
  }

  try {
    // Decision layer: Check if Coordinator should be called
    // This ensures we only call Coordinator when internal data is insufficient
    const shouldCall = shouldCallCoordinator(query, vectorResults, internalData);
    
    if (!shouldCall) {
      logger.debug('gRPC fallback skipped: Internal data is sufficient', {
        category,
        tenantId,
        vectorResultsCount: vectorResults.length,
      });
      return []; // Internal data is sufficient, no need for Coordinator
    }

    logger.info('gRPC fallback: Calling Coordinator', {
      category,
      tenantId,
      userId,
      query: query.substring(0, 100),
    });

    // Call Coordinator via Communication Manager
    const coordinatorResponse = await callCoordinatorRoute({
      tenant_id: tenantId,
      user_id: userId,
      query_text: query,
      metadata: {
        category,
        source: 'rag_fallback',
        vector_results_count: vectorResults.length,
      },
    });

    if (!coordinatorResponse) {
      logger.warn('Coordinator route returned no response', {
        category,
        tenantId,
      });
      return []; // Coordinator unavailable, return empty
    }

    // Process Coordinator response
    const processed = processCoordinatorResponse(coordinatorResponse);
    if (!processed) {
      logger.warn('Failed to process Coordinator response', {
        category,
        tenantId,
      });
      return [];
    }

    // Interpret normalized fields
    const interpretedFields = interpretNormalizedFields(processed.normalized_fields);
    
    // Create structured fields
    const structured = createStructuredFields(processed, interpretedFields);

    // Convert to format expected by queryProcessing.service.js
    const contentItems = structured.sources.map((source) => ({
      contentId: source.sourceId,
      contentType: source.sourceType || category,
      contentText: source.contentSnippet || '',
      metadata: {
        ...source.metadata,
        title: source.title,
        url: source.sourceUrl,
        relevanceScore: source.relevanceScore,
        source: 'coordinator',
        target_services: processed.target_services || [],
      },
    }));

    logger.info('gRPC fallback: Coordinator data retrieved', {
      category,
      tenantId,
      items_count: contentItems.length,
      target_services: processed.target_services || [],
    });

    return contentItems;
  } catch (error) {
    logger.warn('gRPC fallback failed', {
      error: error.message,
      category,
      tenantId,
      stack: error.stack,
    });
    return []; // Return empty on error, allow fallback to internal data
  }
}


