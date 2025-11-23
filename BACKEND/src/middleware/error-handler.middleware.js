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
export function errorHandler(err, req, res, next) {
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
export function notFoundHandler(req, res, next) {
  // Ignore common browser requests that cause 404 spam
  const ignoredPaths = ['/favicon.ico', '/robots.txt', '/apple-touch-icon.png', '/favicon-32x32.png', '/favicon-16x16.png'];
  
  // Only log 404 for non-ignored paths or in debug mode
  if (!ignoredPaths.includes(req.path)) {
    logger.warn('404 Not Found', {
      method: req.method,
      path: req.path,
      url: req.url,
      query: req.query,
      userAgent: req.get('user-agent'),
    });
  }
  
  res.status(404).json({
    error: {
      message: 'Not Found',
      statusCode: 404,
      path: req.path,
      hint: 'Check /health for service status or /api/v1/query for API endpoint',
    },
  });
}




