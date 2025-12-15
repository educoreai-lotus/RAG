/**
 * Microservice Support Controller
 * Handles proxy requests for Assessment and DevLab microservices
 */

import { logger } from '../utils/logger.util.js';
import Joi from 'joi';
import { validate } from '../utils/validation.util.js';

/**
 * Support request validation schema
 */
const supportRequestSchema = Joi.object({
  query: Joi.string().min(1).max(2000).required(),
  timestamp: Joi.string().isoDate().optional(),
  session_id: Joi.string().optional(),
  // support_mode is optional; activation is enforced by headers/explicit flag match
  support_mode: Joi.string().valid('Assessment', 'DevLab').optional(),
  metadata: Joi.object({
    user_id: Joi.string().optional(),
    tenant_id: Joi.string().optional(),
    source: Joi.string().valid('assessment', 'devlab').optional(),
  }).optional(),
});

/**
 * POST /api/assessment/support
 * Proxy endpoint for Assessment microservice support
 */
export async function assessmentSupport(req, res, next) {
  try {
    // Log incoming request for debugging
    logger.debug('Assessment support request received', {
      method: req.method,
      headers: {
        'x-source': req.headers['x-source'],
        'x-microservice-source': req.headers['x-microservice-source'],
        origin: req.headers.origin,
      },
      body: req.body,
    });

    // Validate request
    const validation = validate(req.body, supportRequestSchema);
    if (!validation.valid) {
      logger.warn('Assessment support validation failed', { error: validation.error });
      return res.status(400).json({
        error: 'Validation error',
        message: validation.error,
      });
    }

    const { query, session_id, metadata = {}, support_mode } = validation.value;

    // Enforce activation via explicit source (header or metadata or flag)
    // If no source is provided, check if support_mode is 'Assessment' (case-insensitive)
    const headerSource = (req.headers['x-source'] || req.headers['x-microservice-source'] || '').toString().toLowerCase();
    const metaSource = (metadata.source || '').toString().toLowerCase();
    const flagSource = (support_mode || '').toString().toLowerCase();
    
    // Check if any source indicates Assessment
    const isAssessmentSource = 
      ['assessment'].includes(headerSource) || 
      ['assessment'].includes(metaSource) || 
      ['assessment'].includes(flagSource) ||
      support_mode === 'Assessment'; // Also check exact match
    
    if (!isAssessmentSource) {
      logger.warn('Assessment support mode not activated', {
        headerSource,
        metaSource,
        flagSource,
        support_mode,
      });
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Support mode not activated. Provide X-Source: assessment or support_mode: Assessment in request body.' 
      });
    }

    logger.info('Assessment support request', {
      query,
      session_id,
      user_id: metadata.user_id || req.headers['x-user-id'],
      tenant_id: metadata.tenant_id || req.headers['x-tenant-id'],
      source: 'assessment',
    });

    // TODO: Forward to actual Assessment microservice
    // For now, return a mock response
    // In production, this should forward to the Assessment microservice API
    
    const response = {
      response: `Assessment Support: I received your question "${query}". This is a proxy response. In production, this will be forwarded to the Assessment microservice.`,
      timestamp: new Date().toISOString(),
      session_id,
    };

    res.json(response);
  } catch (error) {
    logger.error('Assessment support error', {
      error: error.message,
      stack: error.stack,
      requestBody: req.body,
    });
    next(error);
  }
}

/**
 * POST /api/devlab/support
 * Proxy endpoint for DevLab microservice support
 */
export async function devlabSupport(req, res, next) {
  try {
    // CRITICAL: Comprehensive logging for debugging 500 errors
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 [DEVLAB SUPPORT] Request received');
    console.log('🔍 Method:', req.method);
    console.log('🔍 URL:', req.originalUrl);
    console.log('🔍 Body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('🔍 User ID:', req.headers['x-user-id']);
    console.log('🔍 Tenant ID:', req.headers['x-tenant-id']);
    console.log('🔍 Authorization:', req.headers['authorization'] ? 'Present' : 'Missing');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Log incoming request for debugging
    logger.debug('DevLab support request received', {
      method: req.method,
      headers: {
        'x-source': req.headers['x-source'],
        'x-microservice-source': req.headers['x-microservice-source'],
        origin: req.headers.origin,
      },
      body: req.body,
    });

    // Validate request
    console.log('🔍 [DEVLAB SUPPORT] Starting validation...');
    console.log('🔍 [DEVLAB SUPPORT] Request body type:', typeof req.body);
    console.log('🔍 [DEVLAB SUPPORT] Request body keys:', Object.keys(req.body || {}));
    
    const validation = validate(req.body, supportRequestSchema);
    console.log('🔍 [DEVLAB SUPPORT] Validation result:', {
      valid: validation.valid,
      error: validation.error,
      value: validation.value
    });
    
    if (!validation.valid) {
      console.error('❌ [DEVLAB SUPPORT] Validation failed:', validation.error);
      logger.warn('DevLab support validation failed', { error: validation.error });
      return res.status(400).json({
        error: 'Validation error',
        message: validation.error,
      });
    }
    
    console.log('✅ [DEVLAB SUPPORT] Validation passed');

    const { query, session_id, metadata = {}, support_mode } = validation.value;

    // Enforce activation via explicit source (header or metadata or flag)
    // If no source is provided, check if support_mode is 'DevLab' (case-insensitive)
    const headerSource = (req.headers['x-source'] || req.headers['x-microservice-source'] || '').toString().toLowerCase();
    const metaSource = (metadata.source || '').toString().toLowerCase();
    const flagSource = (support_mode || '').toString().toLowerCase();
    
    // Check if any source indicates DevLab
    const isDevlabSource = 
      ['devlab'].includes(headerSource) || 
      ['devlab'].includes(metaSource) || 
      ['devlab'].includes(flagSource) ||
      support_mode === 'DevLab'; // Also check exact match
    
    if (!isDevlabSource) {
      logger.warn('DevLab support mode not activated', {
        headerSource,
        metaSource,
        flagSource,
        support_mode,
      });
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Support mode not activated. Provide X-Source: devlab or support_mode: DevLab in request body.' 
      });
    }

    logger.info('DevLab support request', {
      query,
      session_id,
      user_id: metadata.user_id || req.headers['x-user-id'],
      tenant_id: metadata.tenant_id || req.headers['x-tenant-id'],
      source: 'devlab',
    });

    // TODO: Forward to actual DevLab microservice
    // For now, return a mock response
    // In production, this should forward to the DevLab microservice API
    
    console.log('🔍 [DEVLAB SUPPORT] Preparing response...');
    const response = {
      response: `DevLab Support: I received your question "${query}". This is a proxy response. In production, this will be forwarded to the DevLab microservice.`,
      timestamp: new Date().toISOString(),
      session_id,
    };

    console.log('✅ [DEVLAB SUPPORT] Sending success response');
    console.log('✅ [DEVLAB SUPPORT] Response:', JSON.stringify(response, null, 2));
    res.json(response);
  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ [DEVLAB SUPPORT] ERROR CAUGHT:');
    console.error('❌ Error message:', error.message);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Request body:', JSON.stringify(req.body, null, 2));
    console.error('❌ Request headers:', JSON.stringify(req.headers, null, 2));
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    logger.error('DevLab support error', {
      error: error.message,
      stack: error.stack,
      requestBody: req.body,
    });
    next(error);
  }
}

