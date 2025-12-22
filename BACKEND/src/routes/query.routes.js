/**
 * Query Routes
 * REST API routes for query processing
 */

import express from 'express';
import { submitQuery } from '../controllers/query.controller.js';
import { optionalAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * OPTIONS /api/v1/query
 * Handle CORS preflight requests for CHAT MODE
 * CRITICAL: Must match SUPPORT MODE CORS handling
 */
router.options('/query', (req, res) => {
  const origin = req.headers.origin || '*';
  
  // Allow all Vercel origins (same as SUPPORT MODE)
  if (origin && /^https:\/\/.*\.vercel\.app$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    // Allow localhost for development
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (origin && origin !== '*') {
    // Check if origin is in ALLOWED_ORIGINS environment variable
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      // If no whitelist or origin is in whitelist, allow it
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      // Origin not allowed - but still set headers for CORS error visibility
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  } else {
    // Fallback: allow all (for testing)
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Tenant-Id, X-Source, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Max-Age', '600');
  
  res.status(204).end();
});

/**
 * POST /api/v1/query
 * Process a RAG query and return AI-generated answer
 * 
 * Authentication: Optional (supports dummy tokens for testing)
 * - If dummy token provided and enabled: Uses dummy user context
 * - If no token: Allows anonymous access
 * - If JWT token provided: Validates JWT (when implemented)
 */
router.post('/query', optionalAuth, submitQuery);

export default router;

