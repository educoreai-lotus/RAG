/**
 * Diagnostics Routes
 * REST API routes for diagnostic endpoints
 */

import express from 'express';
import { getEmbeddingsStatus, testVectorSearch } from '../controllers/diagnostics.controller.js';

const router = express.Router();

/**
 * OPTIONS /api/debug/embeddings-status
 * Handle CORS preflight requests
 */
router.options('/embeddings-status', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Tenant-Id');
  }
  res.status(204).end();
});

/**
 * OPTIONS /api/debug/test-vector-search
 * Handle CORS preflight requests
 */
router.options('/test-vector-search', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Tenant-Id');
  }
  res.status(204).end();
});

/**
 * GET /api/debug/embeddings-status
 * Check embeddings status in database
 */
router.get('/embeddings-status', getEmbeddingsStatus);

/**
 * GET /api/debug/test-vector-search
 * Test vector search with a sample query
 * Query params: query (required), tenant_id (optional), threshold (optional, default 0.3)
 */
router.get('/test-vector-search', testVectorSearch);

export default router;














