/**
 * Auth Controller
 * Handles authentication-related endpoints
 */

import { logger } from '../utils/logger.util.js';

/**
 * GET /auth/me
 * Returns current user information from request headers
 * This endpoint is used by the frontend to check authentication status
 */
export const getCurrentUser = async (req, res, next) => {
  try {
    // Extract user information from headers (set by frontend)
    const userId = req.headers['x-user-id'] || req.headers['x-user-id'];
    const tenantId = req.headers['x-tenant-id'] || req.headers['x-tenant-id'];
    const authHeader = req.headers.authorization;
    
    // Extract token from Authorization header if present
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // If no user information is provided, return anonymous user
    if (!userId && !token) {
      return res.status(200).json({
        userId: null,
        token: null,
        tenantId: tenantId || 'default',
        authenticated: false,
        message: 'No authentication information provided',
      });
    }

    // Return user information
    const response = {
      userId: userId || 'anonymous',
      token: token || null,
      tenantId: tenantId || 'default',
      authenticated: !!(userId && userId !== 'anonymous' && userId !== 'guest'),
    };

    // Add additional user info if available from token (would need JWT decoding in production)
    // For now, just return what we have from headers

    logger.debug('Auth /me endpoint called', {
      userId: response.userId,
      tenantId: response.tenantId,
      authenticated: response.authenticated,
    });

    res.status(200).json(response);
  } catch (error) {
    logger.error('Error in /auth/me endpoint:', error);
    next(error);
  }
};







