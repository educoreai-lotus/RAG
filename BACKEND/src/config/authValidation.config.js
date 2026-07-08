/**
 * Auth validation feature flags (Phase 1: log-only Coordinator / nAuth validation)
 *
 * AUTH_VALIDATION_ENABLED=true + AUTH_POLICY_MODE=log_only activates validation
 * without blocking requests.
 */

export const AUTH_VALIDATION_ENABLED = process.env.AUTH_VALIDATION_ENABLED === 'true';

export const AUTH_POLICY_MODE = (process.env.AUTH_POLICY_MODE || 'off').toLowerCase();

export const AUTH_POLICY_MODES = {
  OFF: 'off',
  LOG_ONLY: 'log_only',
  ENFORCE: 'enforce',
};

/**
 * True when Coordinator / nAuth validation should run in log-only mode.
 */
export function isLogOnlyAuthValidationEnabled() {
  return AUTH_VALIDATION_ENABLED && AUTH_POLICY_MODE === AUTH_POLICY_MODES.LOG_ONLY;
}

/**
 * Coordinator HTTP base URL for /request (matches coordinator.client.js precedence).
 */
export function getCoordinatorHttpBaseUrl() {
  const raw =
    process.env.COORDINATOR_HTTP_URL ||
    process.env.COORDINATOR_URL ||
    'https://coordinator-production.up.railway.app';

  const trimmed = String(raw).trim().replace(/\/+$/, '');

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export const COORDINATOR_AUTH_TIMEOUT_MS = parseInt(
  process.env.COORDINATOR_AUTH_TIMEOUT_MS || '10000',
  10
);

export const COORDINATOR_REQUESTER_SERVICE = 'rag-service';

export const NAUTH_VALIDATION_ACTION =
  'Route this request to nAuth service only for access token validation and session continuity decision.';
