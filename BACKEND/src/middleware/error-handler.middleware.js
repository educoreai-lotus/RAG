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

  // Preserve CORS headers if they were set
  const origin = req.headers.origin;
  const isVercel = origin && /^https:\/\/.*\.vercel\.app$/.test(origin);
  const allowedOrigins = [
    'https://rag-git-main-educoreai-lotus.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
  ];
  
  // Set CORS headers if origin is allowed
  if (origin && (allowedOrigins.includes(origin) || isVercel)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,X-User-Id,X-Tenant-Id,X-Source,X-Embed-Secret');
  }

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
  // Ignore common browser requests that cause 404 spam
  const ignoredPaths = ['/favicon.ico', '/robots.txt', '/apple-touch-icon.png', '/favicon-32x32.png', '/favicon-16x16.png'];
  
  // Special handling for support routes - check if it's a method issue
  if (req.path.includes('/support') && req.method !== 'POST' && req.method !== 'OPTIONS') {
    logger.warn('405 Method Not Allowed (from notFoundHandler)', {
      method: req.method,
      path: req.path,
      url: req.url,
      hint: 'Support routes only accept POST and OPTIONS methods',
    });
    
    // Set CORS headers
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Tenant-Id, X-Source, X-Embed-Secret');
    }
    
    return res.status(405).json({
      error: {
        message: 'Method Not Allowed',
        statusCode: 405,
        path: req.path,
        method: req.method,
        allowedMethods: ['POST', 'OPTIONS'],
        hint: 'Support routes only accept POST requests. Use POST method.',
      },
    });
  }
  
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




