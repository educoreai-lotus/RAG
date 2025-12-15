/**
 * Method Handler Middleware
 * Handles OPTIONS requests globally and provides method validation
 */

import { logger } from '../utils/logger.util.js';

/**
 * Global OPTIONS handler middleware
 * Handles CORS preflight requests for all routes
 */
export function globalOptionsHandler(req, res, next) {
  if (req.method === 'OPTIONS') {
    logger.debug('Global OPTIONS handler - Preflight request', {
      path: req.path,
      origin: req.headers.origin,
    });

    // Set CORS headers
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-User-Id, X-Tenant-Id, X-Source, X-Embed-Secret, X-Requested-With, Accept, Origin'
      );
      res.setHeader('Access-Control-Max-Age', '600');
    } else {
      // No origin - allow anyway (for same-origin requests)
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-User-Id, X-Tenant-Id, X-Source, X-Embed-Secret, X-Requested-With, Accept, Origin'
      );
    }

    return res.status(204).end();
  }

  next();
}

/**
 * Request logging middleware
 * Logs all incoming requests for debugging
 */
export function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Log request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    query: req.query,
    headers: {
      origin: req.headers.origin,
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
      authorization: req.headers.authorization ? '***' : undefined,
      'x-user-id': req.headers['x-user-id'],
      'x-tenant-id': req.headers['x-tenant-id'],
      'x-source': req.headers['x-source'],
    },
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
}

/**
 * Method validation middleware
 * Validates that the requested method is allowed for the route
 * This should be used after routes are defined
 */
export function methodValidator(allowedMethods) {
  return (req, res, next) => {
    if (!allowedMethods.includes(req.method)) {
      logger.warn('Method not allowed', {
        method: req.method,
        path: req.path,
        allowedMethods,
      });

      // Set CORS headers even for errors
      const origin = req.headers.origin;
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', allowedMethods.join(', '));
      }

      return res.status(405).json({
        error: 'Method Not Allowed',
        message: `Method ${req.method} is not allowed for ${req.path}`,
        method: req.method,
        path: req.path,
        allowedMethods,
      });
    }

    next();
  };
}

