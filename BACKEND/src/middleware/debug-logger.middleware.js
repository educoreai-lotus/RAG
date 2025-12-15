/**
 * Critical Debug Logger Middleware
 * Logs EVERY request with full details for debugging 405 errors
 */

import { logger } from '../utils/logger.util.js';

export function criticalDebugLogger(req, res, next) {
  // Log EVERY request with full details
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🔍 [REQUEST] ${req.method} ${req.originalUrl || req.url}`);
  console.log(`🔍 [PATH] ${req.path}`);
  console.log(`🔍 [ORIGIN] ${req.headers.origin || 'NO ORIGIN'}`);
  console.log(`🔍 [USER-AGENT] ${req.headers['user-agent'] || 'NO USER-AGENT'}`);
  console.log(`🔍 [CONTENT-TYPE] ${req.headers['content-type'] || 'NO CONTENT-TYPE'}`);
  console.log(`🔍 [AUTHORIZATION] ${req.headers.authorization ? 'PRESENT' : 'MISSING'}`);
  console.log(`🔍 [X-USER-ID] ${req.headers['x-user-id'] || 'MISSING'}`);
  console.log(`🔍 [X-TENANT-ID] ${req.headers['x-tenant-id'] || 'MISSING'}`);
  console.log(`🔍 [X-SOURCE] ${req.headers['x-source'] || 'MISSING'}`);
  console.log(`🔍 [QUERY] ${JSON.stringify(req.query)}`);
  console.log(`🔍 [BODY] ${req.method === 'POST' || req.method === 'PUT' ? JSON.stringify(req.body).substring(0, 200) : 'N/A'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Also log via Winston logger
  logger.info('🔍 CRITICAL DEBUG - Request details', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    url: req.url,
    origin: req.headers.origin,
    'user-agent': req.headers['user-agent'],
    'content-type': req.headers['content-type'],
    hasAuthorization: !!req.headers.authorization,
    'x-user-id': req.headers['x-user-id'],
    'x-tenant-id': req.headers['x-tenant-id'],
    'x-source': req.headers['x-source'],
    query: req.query,
    body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined,
  });

  // Log response when finished
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`✅ [RESPONSE] ${req.method} ${req.path} → ${res.statusCode}`);
    logger.info('✅ CRITICAL DEBUG - Response sent', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
    });
    return originalSend.call(this, data);
  };

  next();
}

