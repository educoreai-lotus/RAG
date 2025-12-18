/**
 * Coordinator Response Parser Service
 * Comprehensive parsing and handling of Coordinator RouteResponse
 * Handles all scenarios: success at rank 1, fallback success, and all services failed
 */

import { logger } from '../utils/logger.util.js';

/**
 * Parse and validate Coordinator RouteResponse
 * @param {Object} response - RouteResponse from Coordinator
 * @returns {Object|null} Parsed response or null if invalid
 */
export function parseRouteResponse(response) {
  if (!response) {
    return null;
  }

  try {
    const parsed = {
      // Raw response fields
      target_services: response.target_services || [],
      normalized_fields: response.normalized_fields || {},
      envelope_json: response.envelope_json || null,
      routing_metadata: response.routing_metadata || null,

      // Parsed fields
      envelope: null,
      routing: null,
      
      // Status information
      status: 'unknown',
      success: false,
      successful_service: null,
      rank_used: 0,
      total_attempts: 0,
      stopped_reason: null,
      quality_score: 0,
      
      // AI routing information
      primary_target: null,
      primary_confidence: 0,
      
      // Performance metrics
      processing_time_ms: 0,
    };

    // Parse normalized_fields
    const normalized = parsed.normalized_fields;
    parsed.successful_service = normalized.successful_service || 'none';
    parsed.rank_used = parseInt(normalized.rank_used || '0', 10);
    parsed.total_attempts = parseInt(normalized.total_attempts || '0', 10);
    parsed.stopped_reason = normalized.stopped_reason || 'unknown';
    parsed.quality_score = parseFloat(normalized.quality_score || '0');
    parsed.primary_target = normalized.primary_target || null;
    parsed.primary_confidence = parseFloat(normalized.primary_confidence || '0');
    
    // Parse processing time (handle both "200ms" string and number)
    const processingTime = normalized.processing_time || normalized.processing_time_ms || '0';
    if (typeof processingTime === 'string') {
      parsed.processing_time_ms = parseInt(processingTime.replace('ms', ''), 10) || 0;
    } else {
      parsed.processing_time_ms = processingTime || 0;
    }

    // Determine status
    if (parsed.successful_service === 'none' || parsed.rank_used === 0) {
      parsed.status = 'all_failed';
      parsed.success = false;
    } else if (parsed.rank_used === 1) {
      parsed.status = 'success_primary';
      parsed.success = true;
    } else if (parsed.rank_used > 1) {
      parsed.status = 'success_fallback';
      parsed.success = true;
    } else {
      parsed.status = 'unknown';
      parsed.success = false;
    }

    // Parse envelope_json
    if (parsed.envelope_json) {
      try {
        parsed.envelope = typeof parsed.envelope_json === 'string'
          ? JSON.parse(parsed.envelope_json)
          : parsed.envelope_json;
        
        logger.debug('🔍 [PARSE ROUTE RESPONSE] Parsed envelope_json successfully', {
          envelope_keys: parsed.envelope ? Object.keys(parsed.envelope) : [],
          has_successfulResult: !!parsed.envelope?.successfulResult,
          has_successfulResult_data: !!parsed.envelope?.successfulResult?.data,
          successfulResult_data_is_array: Array.isArray(parsed.envelope?.successfulResult?.data),
        });
      } catch (parseError) {
        logger.warn('Failed to parse envelope_json', {
          error: parseError.message,
        });
        parsed.envelope = null;
      }
    } else {
      logger.debug('🔍 [PARSE ROUTE RESPONSE] No envelope_json in response', {
        response_keys: Object.keys(response || {}),
      });
    }

    // Parse routing_metadata
    if (parsed.routing_metadata) {
      try {
        parsed.routing = typeof parsed.routing_metadata === 'string'
          ? JSON.parse(parsed.routing_metadata)
          : parsed.routing_metadata;
      } catch (parseError) {
        logger.warn('Failed to parse routing_metadata', {
          error: parseError.message,
        });
        parsed.routing = null;
      }
    }

    logger.debug('Parsed Coordinator response', {
      status: parsed.status,
      successful_service: parsed.successful_service,
      rank_used: parsed.rank_used,
      quality_score: parsed.quality_score,
    });

    return parsed;
  } catch (error) {
    logger.error('Error parsing Coordinator response', {
      error: error.message,
      stack: error.stack,
    });
    return null;
  }
}

/**
 * Extract business data from parsed response
 * @param {Object} parsedResponse - Parsed response from parseRouteResponse
 * @returns {Object} Business data extracted from envelope and normalized fields
 */
export function extractBusinessData(parsedResponse) {
  logger.info('🔍 [EXTRACT BUSINESS DATA] Starting extraction', {
    has_parsedResponse: !!parsedResponse,
    success: parsedResponse?.success,
    has_envelope: !!parsedResponse?.envelope,
    has_envelope_json: !!parsedResponse?.envelope_json,
    has_successfulResult: !!parsedResponse?.envelope?.successfulResult,
    has_successfulResult_data: !!parsedResponse?.envelope?.successfulResult?.data,
    has_normalized_fields: !!parsedResponse?.normalized_fields,
    normalized_fields_keys: parsedResponse?.normalized_fields ? Object.keys(parsedResponse.normalized_fields) : [],
    envelope_keys: parsedResponse?.envelope ? Object.keys(parsedResponse.envelope) : [],
  });

  if (!parsedResponse || !parsedResponse.success) {
    logger.warn('🔍 [EXTRACT BUSINESS DATA] No response or not successful', {
      has_parsedResponse: !!parsedResponse,
      success: parsedResponse?.success,
    });
    return {
      data: null,
      sources: [],
      metadata: {},
    };
  }

  try {
    const businessData = {
      data: null,
      sources: [],
      metadata: {},
    };

    // ⭐ PRIORITY 1: Check for Coordinator wrapped format (successfulResult.data)
    // This is the format that Coordinator sends: { successfulResult: { data: [...] }, ... }
    if (parsedResponse.envelope?.successfulResult?.data) {
      logger.info('🔍 [EXTRACT BUSINESS DATA] Found envelope.successfulResult.data (Coordinator wrapped format)', {
        data_is_array: Array.isArray(parsedResponse.envelope.successfulResult.data),
        data_length: Array.isArray(parsedResponse.envelope.successfulResult.data) 
          ? parsedResponse.envelope.successfulResult.data.length 
          : 'N/A',
        envelope_keys: Object.keys(parsedResponse.envelope),
        successfulResult_keys: Object.keys(parsedResponse.envelope.successfulResult),
      });
      
      const data = parsedResponse.envelope.successfulResult.data;
      
      if (Array.isArray(data)) {
        businessData.data = data;
        businessData.sources = data;
        logger.info('🔍 [EXTRACT BUSINESS DATA] Extracted array from successfulResult.data', {
          items_count: data.length,
        });
      } else if (typeof data === 'object' && data !== null) {
        // Single object - wrap in array
        businessData.data = [data];
        businessData.sources = [data];
        logger.info('🔍 [EXTRACT BUSINESS DATA] Extracted single object from successfulResult.data');
      }
      
      // Extract metadata from envelope if available
      if (parsedResponse.envelope.metadata) {
        businessData.metadata = {
          ...businessData.metadata,
          ...parsedResponse.envelope.metadata,
        };
      }
      
      if (parsedResponse.envelope.request?.request_id) {
        businessData.metadata.request_id = parsedResponse.envelope.request.request_id;
      }
      
      logger.info('✅ [EXTRACT BUSINESS DATA] Successfully extracted from Coordinator wrapped format', {
        sources_count: businessData.sources.length,
        metadata_keys: Object.keys(businessData.metadata),
      });
      
      // Return early - we found the data!
      businessData.metadata = {
        ...businessData.metadata,
        source: parsedResponse.envelope?.source || parsedResponse.successful_service,
        timestamp: parsedResponse.envelope?.metadata?.timestamp || new Date().toISOString(),
        request_id: businessData.metadata.request_id || parsedResponse.envelope?.request?.request_id || null,
        tenant_id: parsedResponse.envelope?.request?.tenant_id || null,
        user_id: parsedResponse.envelope?.request?.user_id || null,
        quality_score: parsedResponse.quality_score,
        rank_used: parsedResponse.rank_used,
        successful_service: parsedResponse.successful_service,
      };
      
      logger.info('🔍 [EXTRACT BUSINESS DATA] Extraction completed (Coordinator format)', {
        has_data: !!businessData.data,
        data_is_array: Array.isArray(businessData.data),
        data_length: Array.isArray(businessData.data) ? businessData.data.length : 'N/A',
        sources_count: businessData.sources.length,
        metadata_keys: Object.keys(businessData.metadata),
      });
      
      return businessData;
    }

    // ⭐ PRIORITY 2: Extract from envelope payload (legacy format)
    // envelope.payload might be the full structure: { request_id, success, data: [...], metadata: {...} }
    if (parsedResponse.envelope?.payload) {
      logger.info('🔍 [EXTRACT BUSINESS DATA] Found envelope.payload', {
        payload_keys: Object.keys(parsedResponse.envelope.payload),
        has_data: !!parsedResponse.envelope.payload.data,
        data_is_array: Array.isArray(parsedResponse.envelope.payload.data),
        has_content: !!parsedResponse.envelope.payload.content,
        has_metadata: !!parsedResponse.envelope.payload.metadata,
        has_request_id: !!parsedResponse.envelope.payload.request_id,
        has_success: parsedResponse.envelope.payload.success !== undefined,
        payload_structure: parsedResponse.envelope.payload.data && Array.isArray(parsedResponse.envelope.payload.data) 
          ? 'NEW_FORMAT_WITH_DATA_ARRAY' 
          : (parsedResponse.envelope.payload.content ? 'OLD_FORMAT_WITH_CONTENT' : 'UNKNOWN'),
      });
      
      // ⭐ Check if payload IS the new structure (has data array directly)
      if (parsedResponse.envelope.payload.data && Array.isArray(parsedResponse.envelope.payload.data)) {
        logger.info('🔍 [EXTRACT BUSINESS DATA] envelope.payload IS the new structure with data array', {
          data_array_length: parsedResponse.envelope.payload.data.length,
        });
        // This is the new structure - use it directly
        businessData.data = parsedResponse.envelope.payload.data;
        businessData.sources = parsedResponse.envelope.payload.data;
        
        if (parsedResponse.envelope.payload.metadata) {
          businessData.metadata = {
            ...parsedResponse.envelope.payload.metadata,
            request_id: parsedResponse.envelope.payload.request_id || null,
          };
        }
      } else {
        // Store payload for later processing
        businessData.data = parsedResponse.envelope.payload;
      }
    }

    // Extract from normalized_fields (business fields)
    const normalized = parsedResponse.normalized_fields;
    const businessFields = {};
    
    // Filter out system fields, keep only business data
    const systemFields = [
      'successful_service', 'rank_used', 'total_attempts', 'stopped_reason',
      'quality_score', 'primary_target', 'primary_confidence', 'processing_time',
      'processing_time_ms',
    ];

    logger.info('🔍 [EXTRACT BUSINESS DATA] Processing normalized_fields', {
      normalized_fields_count: Object.keys(normalized).length,
      system_fields_count: systemFields.length,
    });

    Object.entries(normalized).forEach(([key, value]) => {
      if (!systemFields.includes(key)) {
        // Try to parse JSON values
        let parsedValue = value;
        if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
          try {
            parsedValue = JSON.parse(value);
            logger.debug('🔍 [EXTRACT BUSINESS DATA] Parsed JSON field', {
              key,
              value_type_before: 'string',
              value_type_after: typeof parsedValue,
              is_array: Array.isArray(parsedValue),
              is_object: typeof parsedValue === 'object',
            });
          } catch (_e) {
            // Keep as string if parsing fails
            logger.debug('🔍 [EXTRACT BUSINESS DATA] Failed to parse JSON field', {
              key,
              error: _e.message,
            });
          }
        }
        businessFields[key] = parsedValue;
      }
    });

    logger.info('🔍 [EXTRACT BUSINESS DATA] Business fields extracted', {
      business_fields_keys: Object.keys(businessFields),
      has_data_field: !!businessFields.data,
      data_field_type: typeof businessFields.data,
      data_field_is_array: Array.isArray(businessFields.data),
    });

    // ⭐ NEW STRUCTURE: Check for new format in businessFields or other locations (if not already extracted)
    // Expected structure: { request_id, success, data: [...], metadata: {...} }
    let extractedData = null;
    
    logger.info('🔍 [EXTRACT BUSINESS DATA] Checking for new structure (sources not yet extracted)', {
      businessFields_has_data: !!businessFields.data,
      businessFields_data_type: typeof businessFields.data,
      businessFields_data_is_array: Array.isArray(businessFields.data),
      businessData_has_data: !!businessData.data,
      businessData_data_type: typeof businessData.data,
      businessData_data_is_array: Array.isArray(businessData.data),
    });
    
    // Check if businessFields contains 'data' field with new structure
    if (businessFields.data && typeof businessFields.data === 'object' && Array.isArray(businessFields.data.data)) {
      logger.info('🔍 [EXTRACT BUSINESS DATA] Found new structure in businessFields.data.data (array)');
      extractedData = businessFields.data;
    } else if (businessFields.data && typeof businessFields.data === 'object' && !Array.isArray(businessFields.data) && businessFields.data.data) {
      logger.info('🔍 [EXTRACT BUSINESS DATA] Found new structure in businessFields.data (nested object)');
      extractedData = businessFields.data;
    } else if (businessData.data && typeof businessData.data === 'object' && !Array.isArray(businessData.data) && Array.isArray(businessData.data.data)) {
      logger.info('🔍 [EXTRACT BUSINESS DATA] Found new structure in businessData.data.data (array)');
      extractedData = businessData.data;
    } else if (businessData.data && typeof businessData.data === 'object' && !Array.isArray(businessData.data) && businessData.data.data) {
      logger.info('🔍 [EXTRACT BUSINESS DATA] Found new structure in businessData.data (nested object)');
      extractedData = businessData.data;
    }
    
    // If found new structure, extract it
    if (extractedData && Array.isArray(extractedData.data)) {
      logger.info('🔍 [EXTRACT BUSINESS DATA] Extracting from new structure', {
        data_array_length: extractedData.data.length,
        has_metadata: !!extractedData.metadata,
        request_id: extractedData.request_id,
        metadata_keys: extractedData.metadata ? Object.keys(extractedData.metadata) : [],
      });
      businessData.data = extractedData.data;
      businessData.sources = extractedData.data;
      
      if (extractedData.metadata) {
        businessData.metadata = {
          ...businessData.metadata,
          ...extractedData.metadata,
          request_id: extractedData.request_id || businessData.metadata.request_id,
        };
      }
      logger.info('🔍 [EXTRACT BUSINESS DATA] Extracted from new structure', {
        sources_count: businessData.sources.length,
        metadata_keys: Object.keys(businessData.metadata),
      });
    } else if (!businessData.sources || businessData.sources.length === 0) {
      logger.info('🔍 [EXTRACT BUSINESS DATA] Checking fallback options', {
        has_envelope_payload_content: !!parsedResponse.envelope?.payload?.content,
        has_routing: !!parsedResponse.routing?.all_attempts,
      });
      
      if (parsedResponse.envelope?.payload?.content) {
        logger.info('🔍 [EXTRACT BUSINESS DATA] Using envelope.payload.content (old format)');
        businessData.sources = Array.isArray(parsedResponse.envelope.payload.content)
          ? parsedResponse.envelope.payload.content
          : [parsedResponse.envelope.payload.content];
      } else if (parsedResponse.routing?.all_attempts) {
        logger.info('🔍 [EXTRACT BUSINESS DATA] Using routing.all_attempts');
        businessData.sources = parsedResponse.routing.all_attempts
          .filter(attempt => attempt.success)
          .map(attempt => ({
            service: attempt.service,
            rank: attempt.rank,
            quality: attempt.quality,
          }));
      } else {
        logger.info('🔍 [EXTRACT BUSINESS DATA] Using fallback structure');
        businessData.data = businessData.data || businessFields;
      }
    }

    // Extract metadata
    businessData.metadata = {
      source: parsedResponse.envelope?.source || parsedResponse.successful_service,
      timestamp: parsedResponse.envelope?.timestamp || new Date().toISOString(),
      request_id: parsedResponse.envelope?.request_id || businessData.metadata.request_id || null,
      tenant_id: parsedResponse.envelope?.tenant_id || null,
      user_id: parsedResponse.envelope?.user_id || null,
      quality_score: parsedResponse.quality_score,
      rank_used: parsedResponse.rank_used,
      successful_service: parsedResponse.successful_service,
    };

    logger.info('🔍 [EXTRACT BUSINESS DATA] Extraction completed', {
      has_data: !!businessData.data,
      data_is_array: Array.isArray(businessData.data),
      data_length: Array.isArray(businessData.data) ? businessData.data.length : 'N/A',
      sources_count: businessData.sources.length,
      metadata_keys: Object.keys(businessData.metadata),
      first_source_preview: businessData.sources[0] ? JSON.stringify(businessData.sources[0]).substring(0, 200) : 'N/A',
    });

    return businessData;
  } catch (error) {
    logger.error('Error extracting business data', {
      error: error.message,
    });
    return {
      data: null,
      sources: [],
      metadata: {},
    };
  }
}

/**
 * Get routing summary for logging/monitoring
 * @param {Object} parsedResponse - Parsed response from parseRouteResponse
 * @returns {Object} Routing summary
 */
export function getRoutingSummary(parsedResponse) {
  if (!parsedResponse) {
    return {
      status: 'no_response',
      message: 'No response from Coordinator',
    };
  }

  const summary = {
    status: parsedResponse.status,
    success: parsedResponse.success,
    successful_service: parsedResponse.successful_service,
    rank_used: parsedResponse.rank_used,
    total_attempts: parsedResponse.total_attempts,
    stopped_reason: parsedResponse.stopped_reason,
    quality_score: parsedResponse.quality_score,
    processing_time_ms: parsedResponse.processing_time_ms,
    target_services: parsedResponse.target_services,
    primary_target: parsedResponse.primary_target,
    primary_confidence: parsedResponse.primary_confidence,
  };

  // Generate human-readable message
  if (parsedResponse.status === 'all_failed') {
    summary.message = `All ${parsedResponse.total_attempts} service(s) failed: ${parsedResponse.target_services.join(', ')}`;
  } else if (parsedResponse.status === 'success_primary') {
    summary.message = `Success at primary service (${parsedResponse.successful_service}) with quality ${parsedResponse.quality_score}`;
  } else if (parsedResponse.status === 'success_fallback') {
    summary.message = `Success at fallback service (${parsedResponse.successful_service}, rank ${parsedResponse.rank_used}) after ${parsedResponse.total_attempts} attempt(s)`;
  } else {
    summary.message = `Unknown status: ${parsedResponse.status}`;
  }

  return summary;
}

/**
 * Check if response indicates all services failed
 * @param {Object} parsedResponse - Parsed response
 * @returns {boolean} True if all services failed
 */
export function isAllFailed(parsedResponse) {
  return parsedResponse?.status === 'all_failed' || 
         parsedResponse?.successful_service === 'none' ||
         parsedResponse?.rank_used === 0;
}

/**
 * Check if response indicates fallback was used
 * @param {Object} parsedResponse - Parsed response
 * @returns {boolean} True if fallback service was used
 */
export function isFallbackUsed(parsedResponse) {
  return parsedResponse?.status === 'success_fallback' || 
         (parsedResponse?.rank_used > 1 && parsedResponse?.success);
}

/**
 * Get quality assessment
 * @param {Object} parsedResponse - Parsed response
 * @returns {Object} Quality assessment
 */
export function getQualityAssessment(parsedResponse) {
  if (!parsedResponse || !parsedResponse.success) {
    return {
      level: 'none',
      score: 0,
      acceptable: false,
    };
  }

  const score = parsedResponse.quality_score || 0;
  
  let level = 'low';
  if (score >= 0.8) {
    level = 'high';
  } else if (score >= 0.6) {
    level = 'medium';
  }

  return {
    level,
    score,
    acceptable: score >= 0.5, // Minimum acceptable quality
  };
}

