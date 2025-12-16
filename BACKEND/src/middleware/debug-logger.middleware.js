/**
 * Critical Debug Logger Middleware
 * Logs EVERY request with full details for debugging 405 errors
 */

import { logger } from '../utils/logger.util.js';

export function criticalDebugLogger(req, res, next) {
  // Log EVERY request with full details
  // CRITICAL: Use console.log for Railway visibility
  
  // Special handling for support routes - EXTRA DETAILED LOGGING
  const isSupportRoute = req.path.includes('/support') || req.path.includes('/devlab') || req.path.includes('/assessment');
  
  if (isSupportRoute) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚨🚨🚨 [CRITICAL DEBUG] SUPPORT ROUTE DETECTED 🚨🚨🚨');
    console.log(`🚨 [REQUEST] ${req.method} ${req.originalUrl || req.url}`);
    console.log(`🚨 [PATH] ${req.path}`);
    console.log(`🚨 [ORIGIN] ${req.headers.origin || 'NO ORIGIN'}`);
    console.log(`🚨 [USER-AGENT] ${req.headers['user-agent'] || 'NO USER-AGENT'}`);
    console.log(`🚨 [CONTENT-TYPE] ${req.headers['content-type'] || 'NO CONTENT-TYPE'}`);
    console.log(`🚨 [AUTHORIZATION] ${req.headers.authorization ? 'PRESENT' : 'MISSING'}`);
    console.log(`🚨 [X-USER-ID] ${req.headers['x-user-id'] || 'MISSING'}`);
    console.log(`🚨 [X-TENANT-ID] ${req.headers['x-tenant-id'] || 'MISSING'}`);
    console.log(`🚨 [X-SOURCE] ${req.headers['x-source'] || 'MISSING'}`);
    console.log(`🚨 [QUERY] ${JSON.stringify(req.query)}`);
    console.log(`🚨 [PARAMS] ${JSON.stringify(req.params)}`);
    console.log(`🚨 [HEADERS FULL] ${JSON.stringify(req.headers, null, 2)}`);
    
    // For POST/PUT requests, log full body
    if (req.method === 'POST' || req.method === 'PUT') {
      const bodyStr = req.body ? JSON.stringify(req.body, null, 2) : 'undefined';
      console.log(`🚨 [BODY FULL] ${bodyStr}`);
    } else {
      console.log(`🚨 [BODY] N/A (method: ${req.method})`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } else {
    // Regular logging for non-support routes
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
    
    // For POST/PUT requests, log truncated body
    if (req.method === 'POST' || req.method === 'PUT') {
      const bodyStr = req.body ? JSON.stringify(req.body) : 'undefined';
      console.log(`🔍 [BODY] ${bodyStr.length > 200 ? bodyStr.substring(0, 200) : bodyStr}`);
    } else {
      console.log(`🔍 [BODY] N/A`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

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

