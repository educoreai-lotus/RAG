/**
 * Auth Routes
 * REST API routes for authentication
 */

import express from 'express';
import cors from 'cors';
import { getCurrentUser } from '../controllers/auth.controller.js';
import { logger } from '../utils/logger.util.js';

const router = express.Router();

// CORS options for auth routes - must match main server config
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // Allow Vercel origins
    if (/^https:\/\/.*\.vercel\.app$/.test(origin)) {
      logger.debug('[Auth CORS] Allowing Vercel origin:', origin);
      return callback(null, true);
    }
    
    // Allow localhost for development
    if (/^http:\/\/localhost:\d+$/.test(origin)) {
      logger.debug('[Auth CORS] Allowing localhost origin:', origin);
      return callback(null, true);
    }
    
    // Allow specific origins
    const allowedOrigins = [
      'https://rag-git-main-educoreai-lotus.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:8080',
    ];
    
    if (allowedOrigins.includes(origin)) {
      logger.debug('[Auth CORS] Allowing exact match origin:', origin);
      return callback(null, true);
    }
    
    // Allow anyway for debugging (can be removed in production)
    logger.warn('[Auth CORS] Allowing unknown origin (debugging):', origin);
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-Tenant-Id', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 204,
  maxAge: 600,
  preflightContinue: false,
};

/**
 * OPTIONS /auth/me
 * Handle preflight requests explicitly
 * This MUST be defined before the GET route
 */
router.options('/me', cors(corsOptions), (req, res) => {
  logger.debug('[Auth] OPTIONS /me - Preflight request', {
    origin: req.headers.origin,
    method: req.method,
  });
  
  // Set CORS headers explicitly
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-User-Id,X-Tenant-Id,X-Requested-With,Accept,Origin');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  
  res.status(204).end();
});

/**
 * GET /auth/me
 * Get current user information
 * Used by frontend to check authentication status
 */
router.get('/me', cors(corsOptions), (req, res, next) => {
  logger.debug('[Auth] GET /me - Request received', {
    origin: req.headers.origin,
    method: req.method,
    hasAuth: !!req.headers.authorization,
    userId: req.headers['x-user-id'],
  });
  
  // Ensure CORS headers are set
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  // Call the controller
  getCurrentUser(req, res, next);
});

export default router;







