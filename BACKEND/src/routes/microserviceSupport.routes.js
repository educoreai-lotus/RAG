/**
 * Microservice Support Routes
 * Proxy routes for Assessment and DevLab microservices
 */

import express from 'express';
import { assessmentSupport, devlabSupport } from '../controllers/microserviceSupport.controller.js';
import { logger } from '../utils/logger.util.js';

const router = express.Router();

// Log all requests to support routes for debugging
router.use((req, res, next) => {
  logger.debug('Support route request', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    headers: {
      'x-source': req.headers['x-source'],
      'x-microservice-source': req.headers['x-microservice-source'],
      origin: req.headers.origin,
    },
  });
  next();
});

// Middleware: gate support mode by env + optional origin/secret authorization
function supportAuthMiddleware(req, res, next) {
  console.log('🔐 [AUTH MIDDLEWARE] supportAuthMiddleware called');
  console.log('🔐 [AUTH MIDDLEWARE] Method:', req.method);
  console.log('🔐 [AUTH MIDDLEWARE] Path:', req.path);
  console.log('🔐 [AUTH MIDDLEWARE] SUPPORT_MODE_ENABLED:', process.env.SUPPORT_MODE_ENABLED);
  
  logger.debug('supportAuthMiddleware called', {
    method: req.method,
    path: req.path,
    supportModeEnabled: process.env.SUPPORT_MODE_ENABLED,
  });

  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    logger.debug('Handling OPTIONS preflight request');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Tenant-Id, X-Source, X-Embed-Secret');
    return res.status(200).end();
  }

  // If SUPPORT_MODE_ENABLED is not set, allow by default (for backward compatibility)
  // Set SUPPORT_MODE_ENABLED=false to explicitly disable
  const supportEnabledEnv = (process.env.SUPPORT_MODE_ENABLED || '').toLowerCase();
  const supportEnabled = supportEnabledEnv !== 'false'; // Default to true if not explicitly disabled
  
  if (!supportEnabled) {
    return res.status(403).json({ error: 'Forbidden', message: 'Support mode is disabled' });
  }

  const origin = (req.headers.origin || '').toString();
  const allowedOrigins = (process.env.SUPPORT_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  
  // Only check origin if SUPPORT_ALLOWED_ORIGINS is explicitly set
  if (allowedOrigins.length > 0 && origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Forbidden', message: 'Origin not allowed for support mode' });
  }

  const sharedSecret = process.env.SUPPORT_SHARED_SECRET || '';
  const providedSecret = (req.headers['x-embed-secret'] || '').toString();
  
  // Only check secret if SUPPORT_SHARED_SECRET is explicitly set
  if (sharedSecret && providedSecret !== sharedSecret) {
    console.error('❌ [AUTH MIDDLEWARE] Invalid secret');
    return res.status(403).json({ error: 'Forbidden', message: 'Invalid support shared secret' });
  }

  console.log('✅ [AUTH MIDDLEWARE] Authentication passed, calling next()');
  next();
}

// Handle OPTIONS requests for CORS preflight (must be before POST routes)
router.options('/assessment/support', (req, res) => {
  logger.debug('OPTIONS request for /assessment/support');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Tenant-Id, X-Source, X-Embed-Secret');
  res.status(200).end();
});

router.options('/devlab/support', (req, res) => {
  logger.debug('OPTIONS request for /devlab/support');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Tenant-Id, X-Source, X-Embed-Secret');
  res.status(200).end();
});

/**
 * POST /api/assessment/support
 * Proxy endpoint for Assessment microservice
 */
router.post('/assessment/support', supportAuthMiddleware, assessmentSupport);

/**
 * POST /api/devlab/support
 * Proxy endpoint for DevLab microservice
 */
router.post('/devlab/support', supportAuthMiddleware, (req, res, next) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📍 [ROUTE] POST /devlab/support route handler called');
  console.log('📍 [ROUTE] Request body:', JSON.stringify(req.body, null, 2));
  console.log('📍 [ROUTE] Request headers:', JSON.stringify(req.headers, null, 2));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  logger.info('POST /devlab/support route handler called');
  devlabSupport(req, res, next);
});

export default router;

