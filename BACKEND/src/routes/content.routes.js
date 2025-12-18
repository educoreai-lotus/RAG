/**
 * Content Management Routes
 * REST API routes for adding content to knowledge base
 */

import express from 'express';
import { addContent, addJsPrerequisites } from '../controllers/content.controller.js';

const router = express.Router();

/**
 * OPTIONS /api/debug/add-content
 * Handle CORS preflight requests
 */
router.options('/add-content', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Tenant-Id');
  }
  res.status(204).end();
});

/**
 * OPTIONS /api/debug/add-js-prerequisites
 * Handle CORS preflight requests
 */
router.options('/add-js-prerequisites', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Tenant-Id');
  }
  res.status(204).end();
});

/**
 * POST /api/debug/add-content
 * Add single content item to knowledge base
 */
router.post('/add-content', addContent);

/**
 * POST /api/debug/add-js-prerequisites
 * Add JavaScript prerequisites content (convenience endpoint)
 */
router.post('/add-js-prerequisites', addJsPrerequisites);

export default router;

