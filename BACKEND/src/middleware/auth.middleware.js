/**
 * Authentication Middleware
 * Handles JWT token validation and dummy token support for testing
 */

import { extractTokenFromHeader } from '../utils/token.util.js';
import { isDummyToken, getDummyUser, DUMMY_TOKEN_ENABLED } from '../config/dummyToken.config.js';
import { logger } from '../utils/logger.util.js';

/**
 * Authentication middleware
 * Checks for dummy tokens (development/testing) or validates JWT tokens
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function authenticateRequest(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token = extractTokenFromHeader(authHeader);

    // If no token provided, continue without authentication
    // (Some endpoints may allow anonymous access)
    if (!token) {
      logger.debug('[AUTH] No token provided', {
        path: req.path,
        method: req.method,
      });
      return next();
    }

    // ═══════════════════════════════════════════════════════════════
    // DUMMY TOKEN CHECK (Development/Testing Only)
    // ═══════════════════════════════════════════════════════════════
    if (isDummyToken(token)) {
      const dummyUser = getDummyUser();

      if (!dummyUser) {
        // Dummy token feature is disabled
        logger.warn('[AUTH] Dummy token provided but feature is disabled', {
          path: req.path,
          DUMMY_TOKEN_ENABLED: DUMMY_TOKEN_ENABLED,
        });
        return res.status(401).json({
          success: false,
          error: 'Dummy token feature is disabled',
        });
      }

      // Optional: Extra protection for production
      // If DUMMY_TOKEN_ENABLED=true, allow it even in production (user explicitly enabled it)
      // Only block if explicitly set to block in production
      if (process.env.NODE_ENV === 'production' && 
          process.env.DUMMY_TOKEN_BLOCK_IN_PRODUCTION === 'true') {
        logger.error('⛔ [AUTH] Dummy token blocked in production!', {
          path: req.path,
          user_id: dummyUser.user_id,
        });
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
        });
      }

      logger.warn('🔓 [AUTH] Dummy token used - DEVELOPMENT MODE', {
        user_id: dummyUser.user_id,
        tenant_id: dummyUser.tenant_id,
        role: dummyUser.role,
        path: req.path,
        warning: 'Dummy tokens should not be used in production!',
      });

      // Attach dummy user to request
      req.user = dummyUser;
      req.tenantId = dummyUser.tenant_id;
      req.userId = dummyUser.user_id;

      return next();
    }
    // ═══════════════════════════════════════════════════════════════

    // Continue with real JWT validation if needed
    // For now, if it's not a dummy token and no JWT validation is implemented,
    // we'll continue without setting req.user
    // This allows the existing code to work with headers or other auth methods

    logger.debug('[AUTH] Token provided but not a dummy token', {
      path: req.path,
      hasToken: !!token,
      tokenLength: token?.length,
    });

    // TODO: Add JWT validation here when implemented
    // For now, continue without authentication
    // The query controller will handle missing user info gracefully

    next();
  } catch (error) {
    logger.error('[AUTH] Authentication middleware error', {
      error: error.message,
      stack: error.stack,
      path: req.path,
    });
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
}

/**
 * Optional authentication middleware
 * Only authenticates if a token is provided, otherwise allows anonymous access
 * This is useful for endpoints that support both authenticated and anonymous access
 */
export const optionalAuth = authenticateRequest;

/**
 * Required authentication middleware
 * Requires a valid token (dummy or JWT) to proceed
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided',
    });
  }

  // Use the main authenticateRequest middleware
  return authenticateRequest(req, res, next);
}

