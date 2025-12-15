/**
 * Recommendations Routes
 * REST API routes for personalized recommendations
 */

import express from 'express';
import { getRecommendations } from '../controllers/recommendations.controller.js';

const router = express.Router();

/**
 * OPTIONS /api/v1/personalized/recommendations/:userId
 * Handle CORS preflight requests
 */
router.options('/personalized/recommendations/:userId', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Tenant-Id');
  }
  res.status(204).end();
});

/**
 * GET /api/v1/personalized/recommendations/:userId
 * Get personalized recommendations for a user
 */
router.get('/personalized/recommendations/:userId', getRecommendations);

export default router;

