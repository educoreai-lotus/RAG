/**
 * Query Controller
 * Handles REST API requests for query processing
 */

import { processQuery } from '../services/queryProcessing.service.js';
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

