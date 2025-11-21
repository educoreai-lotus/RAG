/**
 * Tenant Validation Utility
 * Ensures correct tenant ID is used throughout the system
 */

import { logger } from './logger.util.js';

// CORRECT tenant ID for Eden Levi's data
const CORRECT_TENANT_ID = 'b9db3773-ca63-4da3-9ac3-c69bb858a6a8';
const WRONG_TENANT_ID = '2fbb2ecb-2b41-43c9-8010-3fe9d3df6bb1';

// Domain-to-tenant-ID mapping for default.local
const DEFAULT_DOMAIN_TO_TENANT = {
  'default.local': CORRECT_TENANT_ID,
};

/**
 * Validate and fix tenant ID
 * - Auto-corrects wrong tenant IDs
 * - Maps default.local to correct tenant
 * - Returns the correct tenant ID or UUID
 * 
 * @param {string} tenant_id - Tenant ID (can be domain or UUID)
 * @returns {string} Validated and corrected tenant ID
 */
export function validateAndFixTenantId(tenant_id) {
  // Handle null/undefined/empty
  if (!tenant_id || tenant_id === 'null' || tenant_id === 'undefined') {
    logger.warn('⚠️ Empty tenant_id provided, using default.local mapping');
    tenant_id = 'default.local';
  }

  // Trim whitespace
  tenant_id = String(tenant_id).trim();

  // CRITICAL: If someone tries to use the wrong tenant, auto-correct it
  if (tenant_id === WRONG_TENANT_ID) {
    logger.error('⚠️ WARNING: Wrong tenant_id detected, auto-correcting!', {
      wrong_tenant: WRONG_TENANT_ID,
      correct_tenant: CORRECT_TENANT_ID,
    });
    return CORRECT_TENANT_ID;
  }

  // If tenant_id is 'default.local' or matches a domain mapping, return correct tenant
  if (tenant_id === 'default.local' || DEFAULT_DOMAIN_TO_TENANT[tenant_id]) {
    logger.info('🔧 Resolving domain to correct tenant_id', {
      domain: tenant_id,
      tenant_id: CORRECT_TENANT_ID,
    });
    return CORRECT_TENANT_ID;
  }

  // If it's already the correct tenant ID, return as-is
  if (tenant_id === CORRECT_TENANT_ID) {
    return tenant_id;
  }

  // If it's a valid UUID format, return as-is (might be another valid tenant)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(tenant_id)) {
    // Log that we're using a custom tenant ID (not the default)
    logger.debug('Using custom tenant_id (UUID format)', { tenant_id });
    return tenant_id;
  }

  // If it's a domain name (contains dots, not a UUID), map it or return default
  if (tenant_id.includes('.')) {
    logger.info('Domain provided, mapping to tenant or using default', {
      domain: tenant_id,
      mapped_tenant: DEFAULT_DOMAIN_TO_TENANT[tenant_id] || CORRECT_TENANT_ID,
    });
    return DEFAULT_DOMAIN_TO_TENANT[tenant_id] || CORRECT_TENANT_ID;
  }

  // Unknown format - default to correct tenant for safety
  logger.warn('Unknown tenant_id format, defaulting to correct tenant', {
    provided: tenant_id,
    default_tenant: CORRECT_TENANT_ID,
  });
  return CORRECT_TENANT_ID;
}

/**
 * Get the correct default tenant ID
 * @returns {string} Correct tenant ID
 */
export function getCorrectTenantId() {
  return CORRECT_TENANT_ID;
}

/**
 * Check if a tenant ID is the wrong tenant
 * @param {string} tenant_id - Tenant ID to check
 * @returns {boolean} True if it's the wrong tenant
 */
export function isWrongTenant(tenant_id) {
  return tenant_id === WRONG_TENANT_ID;
}

/**
 * Log tenant information at entry point for debugging
 * @param {Object} req - Express request object
 * @param {string} finalTenantId - Final tenant ID after validation
 */
export function logTenantAtEntryPoint(req, finalTenantId) {
  const debugInfo = {
    from_query: req.query?.tenant_id || null,
    from_body: req.body?.tenant_id || null,
    from_headers: req.headers['x-tenant-id'] || null,
    from_user: req.user?.tenant_id || null,
    from_session: req.session?.tenant_id || null,
    FINAL: finalTenantId,
  };

  logger.info('🔍 TENANT DEBUG - Entry Point', debugInfo);

  // CRITICAL: Throw error if wrong tenant detected
  if (finalTenantId === WRONG_TENANT_ID) {
    const errorMsg = 'WRONG TENANT DETECTED! Cannot use 2fbb2ecb-2b41-43c9-8010-3fe9d3df6bb1';
    logger.error('❌ ' + errorMsg, debugInfo);
    throw new Error(errorMsg);
  }
}

