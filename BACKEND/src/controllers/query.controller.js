/**
 * Query Controller
 * Handles REST API requests for query processing
 */

import { processQuery } from '../services/queryProcessing.service.js';
import { assessmentSupport, devlabSupport } from './microserviceSupport.controller.js';
import { validate, schemas } from '../utils/validation.util.js';
import { logger } from '../utils/logger.util.js';
import { validateAndFixTenantId, logTenantAtEntryPoint } from '../utils/tenant-validation.util.js';
import Joi from 'joi';

/**
 * Generate a unique conversation ID
 * Format: conv-{timestamp}-{random}
 * @returns {string} Unique conversation identifier
 */
function generateConversationId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `conv-${timestamp}-${random}`;
}

/**
 * Query request validation schema
 */
const queryRequestSchema = Joi.object({
  query: schemas.query, // Now max(2000) instead of max(1000)
  tenant_id: Joi.string().min(1).default('default'),
  conversation_id: Joi.string().optional(), // Optional conversation identifier for multi-turn conversations
  context: Joi.object({
    user_id: schemas.userId, // Now default('anonymous') instead of required
    session_id: schemas.sessionId,
    role: Joi.string().valid('admin', 'administrator', 'hr', 'manager', 'trainer', 'employee', 'user', 'learner', 'anonymous', 'guest').optional(),
    tags: Joi.array().items(Joi.string()).optional(),
  }).optional().default({}), // CRITICAL FIX: default empty object if not provided
  options: Joi.object({
    max_results: Joi.number().integer().min(1).max(20).default(5),
    min_confidence: Joi.number().min(0).max(1).default(0.7),
    include_metadata: Joi.boolean().default(true),
  }).optional().default({}), // CRITICAL FIX: default empty object if not provided
});

/**
 * POST /api/v1/query
 * Process a RAG query
 */
export async function submitQuery(req, res, next) {
  try {
    // CRITICAL: Set CORS headers for CHAT MODE (same as SUPPORT MODE)
    const origin = req.headers.origin;
    
    // Log request details for debugging
    logger.info('Query request received', {
      method: req.method,
      path: req.path,
      origin: origin || 'NO ORIGIN',
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
    });
    
    if (origin && typeof origin === 'string') {
      // Allow all Vercel origins (same as SUPPORT MODE)
      if (/^https:\/\/.*\.vercel\.app$/.test(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      } else if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        // Allow localhost for development
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      } else {
        // Check ALLOWED_ORIGINS environment variable
        const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          // If no whitelist or origin is in whitelist, allow it
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Access-Control-Allow-Credentials', 'true');
        } else {
          // Origin not in whitelist - still set header for CORS error visibility
          res.setHeader('Access-Control-Allow-Origin', origin);
        }
      }
    }
    
    // Header/metadata based support-mode routing (no keyword detection)
    const headerSource = (req.headers['x-source'] || req.headers['x-microservice-source'] || '').toString().toLowerCase();
    const metaSource = (req.body?.metadata?.source || '').toString().toLowerCase();
    const supportModeFlag = (req.body?.support_mode || '').toString().toLowerCase();

    // Hardened gating: support mode must be explicitly enabled and authorized
    const supportEnabled = (process.env.SUPPORT_MODE_ENABLED || '').toLowerCase() === 'true';
    const sharedSecret = process.env.SUPPORT_SHARED_SECRET || '';
    const providedSecret = (req.headers['x-embed-secret'] || '').toString();
    // Use origin already defined above (line 51)
    const originStr = origin ? origin.toString() : '';
    const allowedOrigins = (process.env.SUPPORT_ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const originAllowed = allowedOrigins.length === 0 || (originStr && allowedOrigins.includes(originStr));
    const secretOk = !sharedSecret || providedSecret === sharedSecret;

    const supportAuthorized = supportEnabled && originAllowed && secretOk;

    if (supportAuthorized) {
      if (headerSource === 'assessment' || metaSource === 'assessment' || supportModeFlag === 'assessment') {
        logger.info('Routing to Assessment Support (authorized + header/metadata/flag matched)', {
          headerSource,
          metaSource,
          supportModeFlag,
          origin: originStr,
          originAllowed,
          hasSecret: !!providedSecret,
        });
        return assessmentSupport(req, res, next);
      }
      if (headerSource === 'devlab' || metaSource === 'devlab' || supportModeFlag === 'devlab') {
        logger.info('Routing to DevLab Support (authorized + header/metadata/flag matched)', {
          headerSource,
          metaSource,
          supportModeFlag,
          origin: originStr,
          originAllowed,
          hasSecret: !!providedSecret,
        });
        return devlabSupport(req, res, next);
      }
    } else if (headerSource === 'assessment' || headerSource === 'devlab' || metaSource === 'assessment' || metaSource === 'devlab' || supportModeFlag === 'assessment' || supportModeFlag === 'devlab') {
      logger.warn('Support-mode signal ignored (not enabled/authorized)', {
        headerSource,
        metaSource,
        supportModeFlag,
        supportEnabled,
        origin: originStr,
        originAllowed,
        secretProvided: !!providedSecret,
      });
    }

    // Validate request body
    const validation = validate(req.body, queryRequestSchema);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation error',
        message: validation.error,
      });
    }

    const { query, tenant_id, conversation_id, context = {}, options = {} } = validation.value;

    // CRITICAL: Validate and fix tenant_id at entry point
    // This ensures we never use the wrong tenant ID
    let validatedTenantId = tenant_id;
    if (!validatedTenantId || validatedTenantId === 'default.local') {
      // If tenant_id is 'default.local' or empty, resolve to correct tenant
      validatedTenantId = validateAndFixTenantId(validatedTenantId || 'default.local');
    } else {
      // Validate and auto-correct any wrong tenant IDs
      validatedTenantId = validateAndFixTenantId(validatedTenantId);
    }
    
    // Log tenant information at entry point for debugging
    logTenantAtEntryPoint(req, validatedTenantId);
    
    // Extract user_id from token if not provided
    const user_id = context.user_id || req.user?.id || 'anonymous';
    const session_id = context.session_id || req.session?.id;
    
    // Extract user role from headers or context
    const user_role = context.role || req.headers['x-user-role'] || req.user?.role || null;

    // Generate conversation_id if not provided
    const finalConversationId = conversation_id || generateConversationId();
    
    if (!conversation_id) {
      logger.info('Generated new conversation_id', {
        conversation_id: finalConversationId,
        user_id,
      });
    } else {
      logger.info('Using provided conversation_id', {
        conversation_id: finalConversationId,
        user_id,
      });
    }

    // Process the query
    logger.info('Routing to normal chatbot flow (no support-mode signal found)', {
      headerSource,
      metaSource,
      supportModeFlag,
      conversation_id: finalConversationId,
    });
    const result = await processQuery({
      query,
      tenant_id: validatedTenantId, // Use validated tenant ID
      context: {
        ...context,
        user_id,
        session_id,
        role: user_role, // Pass role through context
      },
      options,
      conversation_id: finalConversationId, // Pass conversation_id to processQuery
    });

    // Return response - ensure it's JSON serializable
    try {
      // Validate that result can be serialized to JSON
      JSON.stringify(result);
      res.json(result);
    } catch (jsonError) {
      logger.error('JSON serialization error', {
        error: jsonError.message,
        result_keys: Object.keys(result || {}),
        result_answer_preview: result?.answer?.substring(0, 100),
      });
      
      // Return a safe error response
      res.status(500).json({
        error: 'Response serialization error',
        message: 'An error occurred while processing your query. Please try again.',
        details: process.env.NODE_ENV === 'development' ? jsonError.message : undefined,
      });
    }
  } catch (error) {
    // CRITICAL: Comprehensive error logging for debugging 500 errors
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('🚨 [QUERY CONTROLLER] ERROR CAUGHT:');
    console.error('🚨 Error name:', error.name);
    console.error('🚨 Error message:', error.message);
    console.error('🚨 Error stack:', error.stack);
    console.error('🚨 Request method:', req.method);
    console.error('🚨 Request URL:', req.originalUrl);
    console.error('🚨 Request path:', req.path);
    console.error('🚨 Request origin:', req.headers.origin || 'NO ORIGIN');
    console.error('🚨 Request body:', JSON.stringify(req.body, null, 2));
    console.error('🚨 Request headers:', JSON.stringify(req.headers, null, 2));
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    logger.error('Query controller error', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      url: req.originalUrl,
      method: req.method,
      origin: req.headers.origin,
      body: req.body,
    });

    // Set CORS headers even on error
    const errorOrigin = req.headers.origin;
    if (errorOrigin && typeof errorOrigin === 'string') {
      if (/^https:\/\/.*\.vercel\.app$/.test(errorOrigin) || 
          errorOrigin.includes('localhost') || 
          errorOrigin.includes('127.0.0.1')) {
        res.setHeader('Access-Control-Allow-Origin', errorOrigin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    }

    next(error);
  }
}

