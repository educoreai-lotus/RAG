/**
 * Knowledge Graph Routes
 */

import express from 'express';
import { getSkillProgress } from '../controllers/knowledgeGraph.controller.js';

const router = express.Router();

/**
 * OPTIONS /api/v1/knowledge/progress/user/:userId/skill/:skillId
 * Handle CORS preflight requests
 */
router.options('/knowledge/progress/user/:userId/skill/:skillId', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Tenant-Id');
  }
  res.status(204).end();
});

/**
 * GET /api/v1/knowledge/progress/user/:userId/skill/:skillId
 * Get skill progress for a user
 */
router.get('/knowledge/progress/user/:userId/skill/:skillId', getSkillProgress);

export default router;

















