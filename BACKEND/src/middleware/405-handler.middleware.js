/**
 * 405 Method Not Allowed Handler
 * Catches requests with unsupported HTTP methods and provides detailed error information
 */

import { logger } from '../utils/logger.util.js';

/**
 * 405 Error Handler Middleware
 * This should be placed AFTER all routes but BEFORE the 404 handler
 * It catches requests that reached a route but used an unsupported method
 */
export function methodNotAllowedHandler(req, res, next) {
  // Only handle if this is not a 404 (route exists but method wrong)
  // Express sets req.route when a route matches but method doesn't
  if (req.route) {
    logger.error('405 Method Not Allowed', {
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl,
      route: req.route.path,
      headers: {
        origin: req.headers.origin,
        'user-agent': req.headers['user-agent'],
      },
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
    }

    return res.status(405).json({
      error: 'Method Not Allowed',
      message: `Method ${req.method} is not allowed for ${req.path}`,
      method: req.method,
      path: req.path,
      statusCode: 405,
      hint: 'Check the API documentation for supported methods for this endpoint',
    });
  }

  // If no route matched, pass to 404 handler
  next();
}

