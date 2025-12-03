/**
 * Content Management Routes
 * REST API routes for adding content to knowledge base
 */

import express from 'express';
import { addContent, addJsPrerequisites } from '../controllers/content.controller.js';

const router = express.Router();

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

