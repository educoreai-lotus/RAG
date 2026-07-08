/**
 * Coordinator / nAuth access-token validation (Phase 1: log-only, non-blocking)
 */

import axios from 'axios';
import { logger } from '../utils/logger.util.js';
import {
  getCoordinatorHttpBaseUrl,
  COORDINATOR_AUTH_TIMEOUT_MS,
  COORDINATOR_REQUESTER_SERVICE,
  NAUTH_VALIDATION_ACTION,
} from '../config/authValidation.config.js';

const LOG_SOURCE = 'coordinator-nauth';

/**
 * Build the Coordinator /request body for nAuth token validation.
 * @param {string} token - Bearer access token (never logged by callers)
 * @param {string} route - Request route path
 * @param {string} method - HTTP method
 * @returns {Object}
 */
function buildValidationRequestBody(token, route, method) {
  return {
    requester_service: COORDINATOR_REQUESTER_SERVICE,
    payload: {
      action: NAUTH_VALIDATION_ACTION,
      access_token: token,
      route: route || '/api/v1/query',
      method: method || 'POST',
    },
    response: {
      valid: false,
      reason: '',
      auth_state: '',
      directory_user_id: '',
      organization_id: '',
      new_access_token: '',
      primary_role: '',
      is_system_admin: false,
      is_trainer: false,
    },
  };
}

/**
 * Unwrap Coordinator response from common envelope shapes.
 * @param {unknown} axiosData - response.data from axios
 * @returns {Object|null}
 */
function unwrapCoordinatorResponse(axiosData) {
  if (!axiosData || typeof axiosData !== 'object') {
    return null;
  }

  if (axiosData.response && typeof axiosData.response === 'object') {
    return axiosData.response;
  }

  if (axiosData.data) {
    if (typeof axiosData.data === 'object') {
      if (axiosData.data.response && typeof axiosData.data.response === 'object') {
        return axiosData.data.response;
      }
      return axiosData.data;
    }
  }

  return axiosData;
}

/**
 * Map Coordinator snake_case auth fields to camelCase result.
 * @param {Object|null} raw
 * @returns {Object}
 */
function mapValidationResult(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      valid: false,
      reason: 'invalid_coordinator_response',
      authState: null,
      directoryUserId: null,
      organizationId: null,
      newAccessToken: null,
      primaryRole: null,
      isSystemAdmin: false,
      isTrainer: false,
      source: LOG_SOURCE,
      validationError: null,
    };
  }

  return {
    valid: raw.valid === true,
    reason: raw.reason != null ? String(raw.reason) : '',
    authState: raw.auth_state != null ? String(raw.auth_state) : null,
    directoryUserId:
      raw.directory_user_id != null ? String(raw.directory_user_id) : null,
    organizationId:
      raw.organization_id != null ? String(raw.organization_id) : null,
    newAccessToken:
      raw.new_access_token != null ? String(raw.new_access_token) : null,
    primaryRole: raw.primary_role != null ? String(raw.primary_role) : null,
    isSystemAdmin: raw.is_system_admin === true,
    isTrainer: raw.is_trainer === true,
    source: LOG_SOURCE,
    validationError: null,
  };
}

/**
 * Safe failure result when Coordinator is unavailable or returns an error.
 * @param {string} reason
 * @param {string|null} validationError
 * @returns {Object}
 */
function buildFailureResult(reason, validationError = null) {
  return {
    valid: false,
    reason,
    authState: null,
    directoryUserId: null,
    organizationId: null,
    newAccessToken: null,
    primaryRole: null,
    isSystemAdmin: false,
    isTrainer: false,
    source: LOG_SOURCE,
    validationError,
  };
}

/**
 * Validate access token via Coordinator POST /request (nAuth routing).
 * Never throws — returns a safe result object for log-only middleware.
 *
 * @param {string} token - Bearer token
 * @param {string} route - e.g. /api/v1/query
 * @param {string} method - e.g. POST
 * @returns {Promise<Object>}
 */
export async function validateAccessTokenViaCoordinator(token, route, method) {
  const baseUrl = getCoordinatorHttpBaseUrl();
  const url = `${baseUrl}/request`;

  try {
    const body = buildValidationRequestBody(token, route, method);

    const response = await axios.post(url, body, {
      timeout: COORDINATOR_AUTH_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
      },
      validateStatus: () => true,
    });

    if (response.status < 200 || response.status >= 300) {
      logger.warn('[nAuth] Coordinator /request returned non-success status', {
        status: response.status,
        route,
        method,
        hasToken: true,
        tokenLength: token?.length ?? 0,
      });

      return buildFailureResult(
        'coordinator_http_error',
        `HTTP ${response.status}`
      );
    }

    const unwrapped = unwrapCoordinatorResponse(response.data);
    const mapped = mapValidationResult(unwrapped);

    logger.info('[nAuth] Coordinator validation completed', {
      valid: mapped.valid,
      reason: mapped.reason || undefined,
      directoryUserId: mapped.directoryUserId || undefined,
      organizationId: mapped.organizationId || undefined,
      primaryRole: mapped.primaryRole || undefined,
      isSystemAdmin: mapped.isSystemAdmin,
      isTrainer: mapped.isTrainer,
      hasNewAccessToken: !!mapped.newAccessToken,
      route,
      method,
      hasToken: true,
      tokenLength: token.length,
    });

    return mapped;
  } catch (error) {
    const message = error?.message || 'unknown_error';

    logger.warn('[nAuth] Coordinator validation request failed', {
      route,
      method,
      hasToken: true,
      tokenLength: token?.length ?? 0,
      validationError: message,
    });

    return buildFailureResult('coordinator_unavailable', message);
  }
}
