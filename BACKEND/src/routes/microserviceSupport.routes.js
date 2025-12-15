/**
 * Microservice Support Routes
 * Proxy routes for Assessment and DevLab microservices
 */

import express from 'express';
import { assessmentSupport, devlabSupport } from '../controllers/microserviceSupport.controller.js';

const router = express.Router();

// Middleware: gate support mode by env + optional origin/secret authorization
function supportAuthMiddleware(req, res, next) {
  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
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

// Handle OPTIONS requests for CORS preflight
router.options('/assessment/support', (req, res) => {
  res.status(200).end();
});

router.options('/devlab/support', (req, res) => {
  res.status(200).end();
});

export default router;

