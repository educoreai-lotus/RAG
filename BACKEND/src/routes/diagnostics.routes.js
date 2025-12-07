/**
 * Diagnostics Routes
 * REST API routes for diagnostic endpoints
 */

import express from 'express';
import { getEmbeddingsStatus, testVectorSearch } from '../controllers/diagnostics.controller.js';

const router = express.Router();

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







