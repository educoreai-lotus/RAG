/**
 * Query Controller
 * Handles REST API requests for query processing
 */

import { processQuery } from '../services/queryProcessing.service.js';
import { assessmentSupport, devlabSupport } from './microserviceSupport.controller.js';
import { validate, schemas } from '../utils/validation.util.js';
import { logger } from '../utils/logger.util.js';
import Joi from 'joi';

/**
 * Query request validation schema
 */
const queryRequestSchema = Joi.object({
  query: schemas.query,
  tenant_id: Joi.string().min(1).default('default'),
  context: Joi.object({
    user_id: schemas.userId,
    session_id: schemas.sessionId,
    tags: Joi.array().items(Joi.string()).optional(),
  }).optional(),
  options: Joi.object({
    max_results: Joi.number().integer().min(1).max(20).default(5),
    min_confidence: Joi.number().min(0).max(1).default(0.7),
    include_metadata: Joi.boolean().default(true),
  }).optional(),
});

/**
 * POST /api/v1/query
 * Process a RAG query
 */
export async function submitQuery(req, res, next) {
  try {
    // Header/metadata based support-mode routing (no keyword detection)
    const headerSource = (req.headers['x-source'] || req.headers['x-microservice-source'] || '').toString().toLowerCase();
    const metaSource = (req.body?.metadata?.source || '').toString().toLowerCase();
    const supportModeFlag = (req.body?.support_mode || '').toString().toLowerCase();

    // Hardened gating: support mode must be explicitly enabled and authorized
    const supportEnabled = (process.env.SUPPORT_MODE_ENABLED || '').toLowerCase() === 'true';
    const sharedSecret = process.env.SUPPORT_SHARED_SECRET || '';
    const providedSecret = (req.headers['x-embed-secret'] || '').toString();
    const origin = (req.headers.origin || '').toString();
    const allowedOrigins = (process.env.SUPPORT_ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const originAllowed = allowedOrigins.length === 0 || (origin && allowedOrigins.includes(origin));
    const secretOk = !sharedSecret || providedSecret === sharedSecret;

    const supportAuthorized = supportEnabled && originAllowed && secretOk;

    if (supportAuthorized) {
      if (headerSource === 'assessment' || metaSource === 'assessment' || supportModeFlag === 'assessment') {
        logger.info('Routing to Assessment Support (authorized + header/metadata/flag matched)', {
          headerSource,
          metaSource,
          supportModeFlag,
          origin,
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
          origin,
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
        origin,
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

    const { query, tenant_id, context = {}, options = {} } = validation.value;

    // Extract user_id from token if not provided
    const user_id = context.user_id || req.user?.id || 'anonymous';
    const session_id = context.session_id || req.session?.id;

    // Process the query
    logger.info('Routing to normal chatbot flow (no support-mode signal found)', {
      headerSource,
      metaSource,
      supportModeFlag,
    });
    const result = await processQuery({
      query,
      tenant_id,
      context: {
        ...context,
        user_id,
        session_id,
      },
      options,
    });

    // Return response
    res.json(result);
  } catch (error) {
    logger.error('Query controller error', {
      error: error.message,
      stack: error.stack,
    });

    next(error);
  }
}

