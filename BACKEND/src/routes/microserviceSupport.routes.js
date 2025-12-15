/**
 * Microservice Support Routes
 * Proxy routes for Assessment and DevLab microservices
 */

import express from 'express';
import { assessmentSupport, devlabSupport } from '../controllers/microserviceSupport.controller.js';

const router = express.Router();

// Middleware: gate support mode by env + optional origin/secret authorization
function supportAuthMiddleware(req, res, next) {
  // Allow OPTIONS requests (CORS preflight) to pass through
  if (req.method === 'OPTIONS') {
    return next();
  }

  const supportEnabled = (process.env.SUPPORT_MODE_ENABLED || '').toLowerCase() === 'true';
  if (!supportEnabled) {
    return res.status(403).json({ error: 'Forbidden', message: 'Support mode is disabled' });
  }

  const origin = (req.headers.origin || '').toString();
  const allowedOrigins = (process.env.SUPPORT_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowedOrigins.length > 0 && origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Forbidden', message: 'Origin not allowed for support mode' });
  }

  const sharedSecret = process.env.SUPPORT_SHARED_SECRET || '';
  const providedSecret = (req.headers['x-embed-secret'] || '').toString();
  if (sharedSecret && providedSecret !== sharedSecret) {
    return res.status(403).json({ error: 'Forbidden', message: 'Invalid support shared secret' });
  }

  next();
}

/**
 * POST /api/assessment/support
 * Proxy endpoint for Assessment microservice
 */
router.post('/assessment/support', supportAuthMiddleware, assessmentSupport);

/**
 * POST /api/devlab/support
 * Proxy endpoint for DevLab microservice
 */
router.post('/devlab/support', supportAuthMiddleware, devlabSupport);

/**
 * OPTIONS /api/devlab/support
 * Handle CORS preflight requests
 */
router.options('/devlab/support', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Tenant-Id, X-Source, X-Embed-Secret');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(204);
});

/**
 * OPTIONS /api/assessment/support
 * Handle CORS preflight requests
 */
router.options('/assessment/support', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Tenant-Id, X-Source, X-Embed-Secret');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(204);
});

export default router;

