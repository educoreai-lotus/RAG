/**
 * Error handler middleware
 * Centralized error handling for Express
 */

import { logger } from '../utils/logger.util.js';

/**
 * Error handler middleware
 * @param {Error} err - Error object
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Express next function
 */
export function errorHandler(err, req, res, _next) {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Default error response
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

/**
 * Not found handler middleware
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Express next function
 */
export function notFoundHandler(req, res, _next) {
  res.status(404).json({
    error: {
      message: 'Not Found',
      statusCode: 404,
      path: req.path,
    },
  });
}



