/**
 * Microservice Support Routes
 * Proxy routes for Assessment and DevLab microservices
 */

import express from 'express';
import { assessmentSupport, devlabSupport } from '../controllers/microserviceSupport.controller.js';

const router = express.Router();

// Middleware: gate support mode by env + optional origin/secret authorization
function supportAuthMiddleware(req, res, next) {
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

export default router;

