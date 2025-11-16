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
    // Validate request
    const validation = validate(req.body, supportRequestSchema);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation error',
        message: validation.error,
      });
    }

    const { query, session_id, metadata = {}, support_mode } = validation.value;

    // Enforce activation ONLY via explicit source (header or metadata or flag)
    const headerSource = (req.headers['x-source'] || req.headers['x-microservice-source'] || '').toString().toLowerCase();
    const metaSource = (metadata.source || '').toString().toLowerCase();
    const flagSource = (support_mode || '').toString().toLowerCase();
    const isAssessmentSource = ['assessment'].includes(headerSource) || ['assessment'].includes(metaSource) || ['assessment'].includes(flagSource);
    if (!isAssessmentSource) {
      return res.status(403).json({ error: 'Forbidden', message: 'Support mode not activated. Provide X-Source: assessment.' });
    }

    logger.info('Assessment support request', {
      query,
      session_id,
      user_id: metadata.user_id,
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
    // Validate request
    const validation = validate(req.body, supportRequestSchema);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation error',
        message: validation.error,
      });
    }

    const { query, session_id, metadata = {}, support_mode } = validation.value;

    // Enforce activation ONLY via explicit source (header or metadata or flag)
    const headerSource = (req.headers['x-source'] || req.headers['x-microservice-source'] || '').toString().toLowerCase();
    const metaSource = (metadata.source || '').toString().toLowerCase();
    const flagSource = (support_mode || '').toString().toLowerCase();
    const isDevlabSource = ['devlab'].includes(headerSource) || ['devlab'].includes(metaSource) || ['devlab'].includes(flagSource);
    if (!isDevlabSource) {
      return res.status(403).json({ error: 'Forbidden', message: 'Support mode not activated. Provide X-Source: devlab.' });
    }

    logger.info('DevLab support request', {
      query,
      session_id,
      user_id: metadata.user_id,
      source: 'devlab',
    });

    // TODO: Forward to actual DevLab microservice
    // For now, return a mock response
    // In production, this should forward to the DevLab microservice API
    
    const response = {
      response: `DevLab Support: I received your question "${query}". This is a proxy response. In production, this will be forwarded to the DevLab microservice.`,
      timestamp: new Date().toISOString(),
      session_id,
    };

    res.json(response);
  } catch (error) {
    logger.error('DevLab support error', {
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
}

