/**
 * Authorization policy evaluation (Phase 3: log-only, never blocks)
 */

import { AUTH_POLICY_MODE, AUTH_POLICY_MODES } from '../config/authValidation.config.js';
import { normalizeSourceService } from '../utils/sourceService.util.js';
import { detectDirectoryPersona } from '../utils/platformRoleMap.util.js';
import { logger } from '../utils/logger.util.js';

/**
 * @param {Object} params
 * @param {Object|null|undefined} params.auth
 * @param {string|null|undefined} params.sourceService
 * @param {string|null|undefined} params.query
 * @param {string|null|undefined} params.route
 * @param {string|null|undefined} params.method
 * @returns {Object} policy decision (never used to block in Phase 3)
 */
export function evaluateAuthorizationPolicy({
  auth = null,
  sourceService = null,
  query = null,
  route = null,
  method = null,
} = {}) {
  const mode = AUTH_POLICY_MODE || AUTH_POLICY_MODES.OFF;

  if (mode === AUTH_POLICY_MODES.OFF) {
    return {
      mode: AUTH_POLICY_MODES.OFF,
      sourceServiceRaw: sourceService || null,
      sourceService: 'UNKNOWN',
      decision: 'POLICY_DISABLED',
      reason: 'auth_policy_mode_off',
      userPersona: null,
      authValid: auth?.valid === true,
      isSystemAdmin: auth?.isSystemAdmin === true,
      primaryRole: auth?.primaryRole || null,
      isTrainer: auth?.isTrainer === true,
      directoryUserId: auth?.directoryUserId || null,
      organizationId: auth?.organizationId || null,
      route: route || null,
      method: method || null,
    };
  }

  if (mode === AUTH_POLICY_MODES.ENFORCE) {
    logger.warn('[AuthorizationPolicy] AUTH_POLICY_MODE=enforce is not implemented; continuing without blocking', {
      route: route || undefined,
      method: method || undefined,
    });
  }

  const { raw: sourceServiceRaw, normalized } = normalizeSourceService(sourceService);
  const authValid = auth?.valid === true;
  const isSystemAdmin = auth?.isSystemAdmin === true;
  const isTrainer = auth?.isTrainer === true;
  const primaryRole = auth?.primaryRole || null;
  const directoryUserId = auth?.directoryUserId || null;
  const organizationId = auth?.organizationId || null;

  const base = {
    mode: mode === AUTH_POLICY_MODES.ENFORCE ? AUTH_POLICY_MODES.ENFORCE : AUTH_POLICY_MODES.LOG_ONLY,
    sourceServiceRaw,
    sourceService: normalized,
    authValid,
    isSystemAdmin,
    primaryRole,
    isTrainer,
    directoryUserId,
    organizationId,
    route: route || null,
    method: method || null,
    // query length only — never log full query body content in decision object consumers
    hasQuery: !!(query && String(query).trim()),
  };

  if (!sourceServiceRaw) {
    return {
      ...base,
      decision: 'NO_SOURCE_SERVICE',
      reason: 'source_service_missing',
      userPersona: authValid ? detectDirectoryPersona(auth) : null,
    };
  }

  if (!auth) {
    return {
      ...base,
      decision: 'NO_VERIFIED_AUTH',
      reason: 'req_auth_missing',
      userPersona: null,
    };
  }

  if (normalized === 'MANAGEMENT_REPORTING') {
    if (authValid && isSystemAdmin) {
      return {
        ...base,
        decision: 'WOULD_ALLOW',
        reason: 'management_reporting_system_admin',
        userPersona: 'SYSTEM_ADMIN',
      };
    }

    return {
      ...base,
      decision: 'WOULD_DENY',
      reason: authValid
        ? 'management_reporting_requires_system_admin'
        : 'management_reporting_requires_valid_system_admin',
      userPersona: detectDirectoryPersona(auth),
    };
  }

  if (normalized === 'DIRECTORY') {
    return {
      ...base,
      decision: 'NO_POLICY_CONFIGURED',
      reason: 'directory_policy_not_configured_yet',
      userPersona: detectDirectoryPersona(auth),
    };
  }

  return {
    ...base,
    decision: 'NO_POLICY_CONFIGURED',
    reason: 'no_policy_configured_for_source_service',
    userPersona: authValid ? detectDirectoryPersona(auth) : null,
  };
}

/**
 * Safe log for a policy decision (no tokens / secrets).
 * @param {Object} decision
 */
export function logAuthorizationPolicyDecision(decision) {
  if (!decision) {
    return;
  }

  if (decision.decision === 'POLICY_DISABLED') {
    return;
  }

  logger.info('[AuthorizationPolicy] decision', {
    mode: decision.mode,
    sourceServiceRaw: decision.sourceServiceRaw || undefined,
    sourceService: decision.sourceService,
    decision: decision.decision,
    reason: decision.reason,
    userPersona: decision.userPersona || undefined,
    authValid: decision.authValid,
    primaryRole: decision.primaryRole || undefined,
    isSystemAdmin: decision.isSystemAdmin,
    isTrainer: decision.isTrainer,
    directoryUserId: decision.directoryUserId || undefined,
    organizationId: decision.organizationId || undefined,
    route: decision.route || undefined,
    method: decision.method || undefined,
  });
}
