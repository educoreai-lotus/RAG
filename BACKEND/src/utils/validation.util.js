/**
 * Validation utility
 * Input validation using Joi
 */

import Joi from 'joi';
import { logger } from './logger.util.js';

/**
 * Validate data against schema
 * @param {Object} data - Data to validate
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Object} Validation result { valid: boolean, value?: any, error?: string }
 */
function validate(data, schema) {
  try {
    const { value, error } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');
      logger.warn('Validation error:', errorMessage);
      return { valid: false, error: errorMessage };
    }

    return { valid: true, value };
  } catch (err) {
    logger.error('Validation exception:', err);
    return { valid: false, error: err.message };
  }
}

/**
 * Common validation schemas
 */
const schemas = {
  tenantId: Joi.string().min(1).default('default'),
  userId: Joi.string().min(1).default('anonymous'), // CRITICAL FIX: default instead of required, allows 'anonymous'
  query: Joi.string().min(1).max(2000).required(), // CRITICAL FIX: increased from 1000 to 2000 to match SUPPORT MODE
  sessionId: Joi.string().optional(),
};

export { validate, schemas };




