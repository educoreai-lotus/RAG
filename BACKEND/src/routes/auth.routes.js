/**
 * Auth Routes
 * REST API routes for authentication
 */

import express from 'express';
import cors from 'cors';
import { getCurrentUser } from '../controllers/auth.controller.js';

const router = express.Router();

// CORS options for auth routes
const corsOptions = {
  origin: true, // Allow all origins (handled by main CORS middleware)
  credentials: true,
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-Tenant-Id'],
  optionsSuccessStatus: 204,
};

/**
 * OPTIONS /auth/me
 * Handle preflight requests explicitly
 */
router.options('/me', cors(corsOptions), (req, res) => {
  res.status(204).end();
});

/**
 * GET /auth/me
 * Get current user information
 * Used by frontend to check authentication status
 */
router.get('/me', cors(corsOptions), getCurrentUser);

export default router;







