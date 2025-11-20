/**
 * Tenant Service
 * Handles tenant management and retrieval
 */

import { getPrismaClient } from '../config/database.config.js';
import { logger } from '../utils/logger.util.js';
import { validateAndFixTenantId, getCorrectTenantId } from '../utils/tenant-validation.util.js';

/**
 * Get or create tenant by domain or tenant ID
 * @param {string} domainOrTenantId - Tenant domain (e.g., 'default.local') or tenant ID (UUID)
 * @returns {Promise<Object>} Tenant object
 */
export async function getOrCreateTenant(domainOrTenantId) {
  try {
    const prisma = await getPrismaClient();

    // CRITICAL: Validate and fix tenant ID first
    // If domainOrTenantId is 'default.local' or a domain, map it to correct tenant UUID
    // If it's already a UUID, validate it's not the wrong one
    const validatedTenantId = validateAndFixTenantId(domainOrTenantId);

    // If validatedTenantId is a UUID (36 chars with dashes), try to find by ID first
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(validatedTenantId);
    
    let tenant = null;
    
    // Try to find by ID if it's a UUID
    if (isUUID) {
      tenant = await prisma.tenant.findUnique({
        where: { id: validatedTenantId },
      });
      
      if (tenant) {
        logger.info('Tenant found by ID', { 
          tenantId: tenant.id, 
          domain: tenant.domain,
          requested: domainOrTenantId,
          validated: validatedTenantId,
        });
        return tenant;
      }
      
      // If not found by ID, try to find by domain (if domainOrTenantId was a domain)
      if (domainOrTenantId && domainOrTenantId !== validatedTenantId && domainOrTenantId.includes('.')) {
        tenant = await prisma.tenant.findUnique({
          where: { domain: domainOrTenantId },
        });
      }
    } else {
      // If it's a domain name, try to find by domain
      tenant = await prisma.tenant.findUnique({
        where: { domain: domainOrTenantId },
      });
    }

    // If tenant not found, create it
    if (!tenant) {
      // Determine domain and ID for new tenant
      const isCreatingFromDomain = domainOrTenantId && domainOrTenantId.includes('.');
      const domain = isCreatingFromDomain ? domainOrTenantId : 'default.local';
      
      // For default.local, use the correct tenant ID
      const tenantId = domain === 'default.local' ? validatedTenantId : undefined;
      
      logger.info('Creating new tenant', { 
        domain, 
        requested: domainOrTenantId,
        validated: validatedTenantId,
        using_tenant_id: tenantId,
      });
      
      const tenantData = {
        name: domain,
        domain,
        settings: {
          queryRetentionDays: 90,
          enableAuditLogs: true,
          enablePersonalization: true,
        },
      };
      
      // If we have a specific tenant ID (e.g., for default.local), use it
      if (tenantId && domain === 'default.local') {
        // Try to create with specific ID, but handle if it already exists
        try {
          tenant = await prisma.tenant.upsert({
            where: { id: tenantId },
            update: { domain, name: domain },
            create: {
              id: tenantId,
              ...tenantData,
            },
          });
        } catch (upsertError) {
          // If upsert fails, try to find existing tenant
          tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
          }) || await prisma.tenant.findUnique({
            where: { domain },
          });
          
          if (!tenant) {
            // Last resort: create without ID
            tenant = await prisma.tenant.create({
              data: tenantData,
            });
          }
        }
      } else {
        // Create without specific ID
        tenant = await prisma.tenant.create({
          data: tenantData,
        });
      }
      
      logger.info('Tenant created/found', { 
        domain, 
        tenantId: tenant.id,
        requested: domainOrTenantId,
        validated: validatedTenantId,
      });
    }

    // CRITICAL: Ensure the returned tenant ID is correct
    if (tenant.id === '2fbb2ecb-2b41-43c9-8010-3fe9d3df6bb1') {
      logger.error('❌ CRITICAL: Wrong tenant ID in database!', {
        wrong_tenant: tenant.id,
        correct_tenant: getCorrectTenantId(),
        domain: tenant.domain,
      });
      // Try to find correct tenant
      const correctTenant = await prisma.tenant.findUnique({
        where: { id: getCorrectTenantId() },
      });
      
      if (correctTenant) {
        logger.warn('Found correct tenant, returning that instead', {
          wrong_tenant: tenant.id,
          correct_tenant: correctTenant.id,
        });
        return correctTenant;
      }
    }

    return tenant;
  } catch (error) {
    logger.error('Get or create tenant error', {
      error: error.message,
      domain: domainOrTenantId,
      stack: error.stack,
    });
    throw new Error(`Tenant management failed: ${error.message}`);
  }
}

/**
 * Get tenant by ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object|null>} Tenant object or null
 */
export async function getTenantById(tenantId) {
  try {
    const prisma = await getPrismaClient();

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    return tenant;
  } catch (error) {
    logger.error('Get tenant by ID error', {
      error: error.message,
      tenantId,
      stack: error.stack,
    });
    throw new Error(`Get tenant failed: ${error.message}`);
  }
}

/**
 * Get tenant by domain
 * @param {string} domain - Tenant domain
 * @returns {Promise<Object|null>} Tenant object or null
 */
export async function getTenantByDomain(domain) {
  try {
    const prisma = await getPrismaClient();

    const tenant = await prisma.tenant.findUnique({
      where: { domain },
    });

    return tenant;
  } catch (error) {
    logger.error('Get tenant by domain error', {
      error: error.message,
      domain,
      stack: error.stack,
    });
    throw new Error(`Get tenant failed: ${error.message}`);
  }
}
