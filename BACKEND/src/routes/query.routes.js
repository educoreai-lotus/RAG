/**
 * Query Routes
 * REST API routes for query processing
 */

import express from 'express';
import { submitQuery } from '../controllers/query.controller.js';

const router = express.Router();

/**
 * OPTIONS /api/v1/query
 * Handle CORS preflight requests
 */
router.options('/query', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Tenant-Id, X-Source');
  }
  res.status(204).end();
});

/**
 * POST /api/v1/query
 * Process a RAG query and return AI-generated answer
 */
router.post('/query', submitQuery);

export default router;

