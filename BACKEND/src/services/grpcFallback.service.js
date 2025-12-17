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
 * Extract readable text from any object structure (generic extraction)
 * Tries multiple common field names and structures
 * 
 * @param {*} item - Any object or value
 * @returns {string} Extracted text content
 */
function extractTextFromObject(item) {
  if (!item || typeof item !== 'object') {
    return typeof item === 'string' ? item : '';
  }

  // Common text field names (in priority order)
  const textFields = [
    'content', 'text', 'description', 'body', 'summary', 'message', 
    'value', 'data', 'details', 'info', 'contentText', 'snippet'
  ];

  // Try common text fields first
  for (const field of textFields) {
    if (item[field]) {
      if (typeof item[field] === 'string' && item[field].trim().length > 0) {
        return item[field];
      }
      if (Array.isArray(item[field])) {
        // If field is array, try to extract from items
        const extracted = item[field]
          .map(subItem => extractTextFromObject(subItem))
          .filter(text => text && text.trim().length > 0)
          .join('\n');
        if (extracted) return extracted;
      }
    }
  }

  // Try to extract from arrays of objects
  if (Array.isArray(item)) {
    return item
      .map(subItem => extractTextFromObject(subItem))
      .filter(text => text && text.trim().length > 0)
      .join('\n');
  }

  // Try nested structures (common patterns)
  // For conclusions-like structures: { conclusions: [...] } or { items: [...] }
  const nestedArrayFields = ['conclusions', 'items', 'results', 'data', 'list', 'entries'];
  for (const field of nestedArrayFields) {
    if (item[field] && Array.isArray(item[field])) {
      const extracted = item[field]
        .map((c, idx) => {
          // Try common fields in array items
          const statement = c.statement || c.text || c.content || c.description || c.title || '';
          const rationale = c.rationale || c.reason || c.explanation || '';
          const value = c.value || c.data || '';
          
          let itemText = '';
          if (statement) itemText = statement;
          if (rationale) itemText += (itemText ? ` (${rationale})` : rationale);
          if (value && !itemText) itemText = String(value);
          
          // If still no text, try extracting from the whole object
          if (!itemText) {
            const extractedFromObj = extractTextFromObject(c);
            if (extractedFromObj) itemText = extractedFromObj;
          }
          
          return itemText ? `${idx + 1}. ${itemText}` : null;
        })
        .filter(Boolean)
        .join('\n');
      if (extracted) return extracted;
    }
  }

  // Try to extract from object values (recursive)
  const values = Object.values(item).filter(v => 
    v !== null && v !== undefined && (typeof v === 'string' || typeof v === 'object')
  );
  if (values.length > 0) {
    const extracted = values
      .map(v => extractTextFromObject(v))
      .filter(text => text && text.trim().length > 0)
      .join('\n');
    if (extracted) return extracted;
  }

  // Fallback: try to stringify, but remove quotes and braces for readability
  try {
    const json = JSON.stringify(item);
    // If JSON is too long or unreadable, return simplified version
    if (json.length > 500) {
      // Try to extract meaningful keys
      const keys = Object.keys(item).slice(0, 5);
      return keys.map(key => `${key}: ${typeof item[key] === 'string' ? item[key].substring(0, 100) : typeof item[key]}`).join('\n');
    }
    return json;
  } catch {
    return String(item);
  }
}

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
  logger.info('🔍 [GRPC FALLBACK] grpcFetchByCategory called', {
    category,
    tenantId,
    userId,
    query: query?.substring(0, 100) || 'N/A',
    grpcEnabled,
    grpcEnabledEnv: process.env.GRPC_ENABLED,
  });
  
  if (!grpcEnabled) {
    logger.warn('❌ [GRPC FALLBACK] gRPC fallback DISABLED - GRPC_ENABLED is not "true"', {
      category,
      tenantId,
      grpcEnabledEnv: process.env.GRPC_ENABLED,
      hint: 'Set GRPC_ENABLED=true in Railway environment variables to enable',
    });
    return [];
  }

  try {
    logger.info('🔍 [GRPC FALLBACK] About to check shouldCallCoordinator', {
      category,
      tenantId,
      query: query?.substring(0, 100) || 'N/A',
      vectorResultsCount: vectorResults?.length || 0,
      internalDataKeys: internalData ? Object.keys(internalData) : [],
    });
    
    // Decision layer: Check if Coordinator should be called
    // This ensures we only call Coordinator when internal data is insufficient
    const shouldCall = shouldCallCoordinator(query, vectorResults, internalData);
    
    logger.info('🔍 [GRPC FALLBACK] shouldCallCoordinator result', {
      category,
      tenantId,
      shouldCall,
      query: query?.substring(0, 100) || 'N/A',
    });
    
    if (!shouldCall) {
      logger.info('❌ [GRPC FALLBACK] Skipped: Internal data is sufficient', {
        category,
        tenantId,
        userId,
        query: query?.substring(0, 100) || 'N/A',
        vectorResultsCount: vectorResults?.length || 0,
      });
      return []; // Internal data is sufficient, no need for Coordinator
    }

    logger.info('✅ [GRPC FALLBACK] Calling Coordinator', {
      category,
      tenantId,
      userId,
      query: query.substring(0, 100),
      vectorResultsCount: vectorResults.length,
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

    // ⭐ NEW: Also check business_data.data for new format
    // New format: { request_id, success, data: [...], metadata: {...} }
    let dataArray = [];
    if (processed.business_data?.data && Array.isArray(processed.business_data.data)) {
      // New format - data is already an array
      dataArray = processed.business_data.data;
    } else if (processed.business_data?.data && typeof processed.business_data.data === 'object' && processed.business_data.data.data) {
      // Nested data format
      dataArray = Array.isArray(processed.business_data.data.data) 
        ? processed.business_data.data.data 
        : [processed.business_data.data.data];
    }

    // Convert to format expected by queryProcessing.service.js
    // Use structured.sources if available, otherwise convert dataArray
    const sourcesToConvert = structured.sources.length > 0 ? structured.sources : dataArray.map((item, index) => {
      // Convert data array items to source format (generic extraction)
      if (typeof item === 'object' && item !== null) {
        // ⭐ GENERIC: Extract text from any object structure
        const contentText = extractTextFromObject(item);
        
        // Determine source type based on common patterns
        let sourceType = item.type || item.sourceType || category || 'coordinator';
        const targetService = processed.target_services?.[0] || 'coordinator';
        
        // Try to detect service-specific types
        if (item.report_name || item.report_id) {
          sourceType = 'management_reporting';
        } else if (targetService && targetService !== 'coordinator') {
          // Use service name as type hint
          sourceType = targetService.replace('-service', '').replace('-', '_');
        }
        
        // Extract title from common fields
        const title = item.title || item.name || item.report_name || item.label || 
                     item.subject || `Source ${index + 1}`;
        
        // Extract ID from common fields
        const sourceId = item.id || item.sourceId || item.report_id || 
                        item.identifier || `coordinator-${index}`;
        
        // Determine snippet length based on content type (longer for structured data)
        const isStructuredData = contentText.length > 200 || item.conclusions || item.items || item.data;
        const maxSnippetLength = isStructuredData ? 1500 : 500;
        
        return {
          sourceId,
          sourceType,
          sourceMicroservice: item.microservice || targetService,
          title,
          contentSnippet: contentText.substring(0, maxSnippetLength),
          sourceUrl: item.url || item.sourceUrl || item.link || '',
          relevanceScore: item.relevanceScore || item.score || item.confidence || 0.75,
          metadata: {
            ...(item.metadata || {}),
            // Preserve all original fields for reference
            ...Object.fromEntries(
              Object.entries(item).filter(([key]) => 
                !['content', 'text', 'description', 'body'].includes(key)
              )
            ),
            source: 'coordinator',
            target_services: processed.target_services || [],
          },
        };
      }
      return null;
    }).filter(Boolean);

    const contentItems = sourcesToConvert.map((source) => ({
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

    logger.info('✅ [GRPC FALLBACK] Coordinator data retrieved', {
      category,
      tenantId,
      items_count: contentItems.length,
      target_services: processed.target_services || [],
      query: query.substring(0, 100),
      content_items_preview: contentItems.map(item => ({
        contentId: item.contentId,
        contentType: item.contentType,
        contentText_length: item.contentText?.length || 0,
        contentText_preview: item.contentText?.substring(0, 100) || 'empty',
      })),
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


