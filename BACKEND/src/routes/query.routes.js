/**
 * Query Routes
 * REST API routes for query processing
 */

import express from 'express';
import { submitQuery } from '../controllers/query.controller.js';

const router = express.Router();

/**
 * POST /api/v1/query
 * Process a RAG query and return AI-generated answer
 */
router.post('/query', submitQuery);

export default router;

