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
      } catch (parseError) {
        logger.warn('Failed to parse envelope_json', {
          error: parseError.message,
        });
        parsed.envelope = null;
      }
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
  if (!parsedResponse || !parsedResponse.success) {
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

    // Extract from envelope payload
    if (parsedResponse.envelope?.payload) {
      businessData.data = parsedResponse.envelope.payload;
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

    Object.entries(normalized).forEach(([key, value]) => {
      if (!systemFields.includes(key)) {
        // Try to parse JSON values
        let parsedValue = value;
        if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
          try {
            parsedValue = JSON.parse(value);
          } catch (_e) {
            // Keep as string if parsing fails
          }
        }
        businessFields[key] = parsedValue;
      }
    });

    // ⭐ NEW STRUCTURE: Check for new format in businessFields first
    // Expected structure: { request_id, success, data: [...], metadata: {...} }
    let extractedData = null;
    
    // Check if businessFields contains 'data' field with new structure
    if (businessFields.data && typeof businessFields.data === 'object' && Array.isArray(businessFields.data.data)) {
      extractedData = businessFields.data;
    } else if (businessFields.data && typeof businessFields.data === 'object' && !Array.isArray(businessFields.data) && businessFields.data.data) {
      // data field might be nested
      extractedData = businessFields.data;
    } else if (businessData.data && typeof businessData.data === 'object' && Array.isArray(businessData.data.data)) {
      // Check envelope payload
      extractedData = businessData.data;
    } else if (businessData.data && typeof businessData.data === 'object' && !Array.isArray(businessData.data) && businessData.data.data) {
      // Check envelope payload (nested)
      extractedData = businessData.data;
    }
    
    // If found new structure, extract it
    if (extractedData && Array.isArray(extractedData.data)) {
      // New format: { request_id, success, data: [...], metadata: {...} }
      businessData.data = extractedData.data; // Extract the data array
      businessData.sources = extractedData.data; // Use data array as sources
      
      // Merge metadata from the response
      if (extractedData.metadata) {
        businessData.metadata = {
          ...businessData.metadata,
          ...extractedData.metadata,
          request_id: extractedData.request_id || businessData.metadata.request_id,
        };
      }
    } else {
      // Fallback to old structure
      businessData.data = businessData.data || businessFields;
    }
    
    // Also check envelope payload for data array (if not already extracted)
    if (!businessData.sources || businessData.sources.length === 0) {
      if (parsedResponse.envelope?.payload?.data && Array.isArray(parsedResponse.envelope.payload.data)) {
        // Also check envelope payload for data array
        businessData.data = parsedResponse.envelope.payload.data;
        businessData.sources = parsedResponse.envelope.payload.data;
        
        // Extract metadata from envelope payload
        if (parsedResponse.envelope.payload.metadata) {
          businessData.metadata = {
            ...businessData.metadata,
            ...parsedResponse.envelope.payload.metadata,
          };
        }
      } else if (parsedResponse.envelope?.payload?.content) {
        // Fallback to old format: content field
        businessData.sources = Array.isArray(parsedResponse.envelope.payload.content)
          ? parsedResponse.envelope.payload.content
          : [parsedResponse.envelope.payload.content];
      } else if (parsedResponse.routing?.all_attempts) {
        // Extract from routing metadata
        businessData.sources = parsedResponse.routing.all_attempts
          .filter(attempt => attempt.success)
          .map(attempt => ({
            service: attempt.service,
            rank: attempt.rank,
            quality: attempt.quality,
          }));
      }
    }

    // Extract metadata
    businessData.metadata = {
      source: parsedResponse.envelope?.source || parsedResponse.successful_service,
      timestamp: parsedResponse.envelope?.timestamp || new Date().toISOString(),
      request_id: parsedResponse.envelope?.request_id || null,
      tenant_id: parsedResponse.envelope?.tenant_id || null,
      user_id: parsedResponse.envelope?.user_id || null,
      quality_score: parsedResponse.quality_score,
      rank_used: parsedResponse.rank_used,
      successful_service: parsedResponse.successful_service,
    };

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

