/**
 * Auth Routes
 * REST API routes for authentication
 */

import express from 'express';
import { getCurrentUser } from '../controllers/auth.controller.js';

const router = express.Router();

/**
 * GET /auth/me
 * Get current user information
 * Used by frontend to check authentication status
 */
router.get('/me', getCurrentUser);

export default router;

