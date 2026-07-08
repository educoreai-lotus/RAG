/**
 * Coordinator / nAuth validation middleware (Phase 1: log-only, never blocks)
 */

import { isLogOnlyAuthValidationEnabled } from '../config/authValidation.config.js';
import { validateAccessTokenViaCoordinator } from '../services/nAuthValidation.service.js';
import { extractTokenFromRequest } from '../utils/token.util.js';
import { logger } from '../utils/logger.util.js';

const LOG_SOURCE = 'coordinator-nauth';
const LOG_MODE = 'log_only';

/**
 * Attach log-only auth context without blocking the request chain.
 * @param {import('express').Request} req
 * @param {Object} authContext
 */
function attachAuthContext(req, authContext) {
  req.auth = {
    ...authContext,
    source: LOG_SOURCE,
    mode: LOG_MODE,
  };
}

/**
 * Log validation outcome without secrets.
 * @param {string} event
 * @param {Object} meta
 */
function logAuthEvent(event, meta) {
  logger.info(`[CoordinatorAuth] ${event}`, meta);
}

/**
 * Phase 1: validate token via Coordinator when flags are on; always call next().
 */
export async function coordinatorAuthMiddleware(req, res, next) {
  try {
    if (!isLogOnlyAuthValidationEnabled()) {
      return next();
    }

    const route = req.originalUrl || req.path || '/api/v1/query';
    const method = req.method || 'POST';
    const token = extractTokenFromRequest(req.headers);

    if (!token) {
      attachAuthContext(req, {
        valid: false,
        reason: 'missing_token',
        directoryUserId: null,
        organizationId: null,
        primaryRole: null,
        isSystemAdmin: false,
        isTrainer: false,
        newAccessToken: null,
        authState: null,
      });

      logAuthEvent('validation_skipped', {
        reason: 'missing_token',
        route,
        method,
        hasToken: false,
        tokenLength: 0,
        mode: LOG_MODE,
      });

      return next();
    }

    const validationResult = await validateAccessTokenViaCoordinator(
      token,
      route,
      method
    );

    attachAuthContext(req, {
      valid: validationResult.valid,
      reason: validationResult.reason || '',
      directoryUserId: validationResult.directoryUserId,
      organizationId: validationResult.organizationId,
      primaryRole: validationResult.primaryRole,
      isSystemAdmin: validationResult.isSystemAdmin,
      isTrainer: validationResult.isTrainer,
      newAccessToken: validationResult.newAccessToken,
      authState: validationResult.authState,
      validationError: validationResult.validationError || null,
    });

    logAuthEvent('validation_complete', {
      valid: req.auth.valid,
      reason: req.auth.reason || undefined,
      directoryUserId: req.auth.directoryUserId || undefined,
      organizationId: req.auth.organizationId || undefined,
      primaryRole: req.auth.primaryRole || undefined,
      isSystemAdmin: req.auth.isSystemAdmin,
      isTrainer: req.auth.isTrainer,
      hasNewAccessToken: !!req.auth.newAccessToken,
      validationError: req.auth.validationError || undefined,
      route,
      method,
      hasToken: true,
      tokenLength: token.length,
      mode: LOG_MODE,
    });

    return next();
  } catch (error) {
    logger.warn('[CoordinatorAuth] Unexpected middleware error (continuing)', {
      validationError: error?.message || 'unknown_error',
      route: req.originalUrl || req.path,
      method: req.method,
    });

    attachAuthContext(req, {
      valid: false,
      reason: 'middleware_error',
      directoryUserId: null,
      organizationId: null,
      primaryRole: null,
      isSystemAdmin: false,
      isTrainer: false,
      newAccessToken: null,
      authState: null,
      validationError: error?.message || 'unknown_error',
    });

    return next();
  }
}
