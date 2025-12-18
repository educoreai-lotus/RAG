/**
 * Batch Sync Service
 * Handles scheduled batch synchronization of data from microservices via Coordinator
 * 
 * This service:
 * - Syncs data from multiple microservices on a schedule
 * - Handles pagination for large datasets
 * - Updates internal data store (vector DB, cache, etc.)
 * - Provides error handling per service (doesn't stop all if one fails)
 */

import { logger } from '../utils/logger.util.js';
import { batchSync, listServices as getCoordinatorServices } from '../clients/coordinator.client.js';
import { processCoordinatorResponse } from '../communication/communicationManager.service.js';
import { getPrismaClient } from '../config/database.config.js';

// Configuration
const BATCH_SYNC_ENABLED = process.env.BATCH_SYNC_ENABLED !== 'false'; // Default: enabled
const BATCH_SYNC_LIMIT = parseInt(process.env.BATCH_SYNC_LIMIT || '1000', 10);

/**
 * Get list of services to sync
 * Priority:
 * 1. BATCH_SYNC_SERVICES env var (manual override)
 * 2. Coordinator's list (source of truth)
 * 3. Fallback list (if Coordinator fails)
 */
async function getServicesToSync() {
  // 1. Check env var for manual override
  if (process.env.BATCH_SYNC_SERVICES) {
    const services = process.env.BATCH_SYNC_SERVICES
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    logger.info('[BatchSync] Using BATCH_SYNC_SERVICES from env var', {
      services: services,
      count: services.length,
    });
    return services;
  }

  // 2. Get services from Coordinator
  try {
    logger.info('[BatchSync] Fetching services list from Coordinator');

    const services = await getCoordinatorServices();

    if (services && services.length > 0) {
      logger.info('[BatchSync] Using services from Coordinator', {
        services: services,
        count: services.length,
      });
      return services;
    }
  } catch (error) {
    logger.error('[BatchSync] Failed to get services from Coordinator', {
      error: error.message,
    });
  }

  // 3. Fallback to known services
  logger.warn('[BatchSync] Using fallback service list');
  return [
    'managementreporting-service',
    'assessment-service',
    'devlab-service',
  ];
}

/**
 * Sync a single microservice with pagination support
 * @param {string} serviceName - Name of the microservice to sync
 * @param {Object} options - Sync options
 * @param {string} options.syncType - Type of sync ('batch', 'daily', 'incremental')
 * @param {string} options.since - ISO date string for incremental sync (optional)
 * @returns {Promise<Object>} Sync result with statistics
 */
export async function syncService(serviceName, options = {}) {
  const { syncType = 'batch', since = null } = options;
  const startTime = Date.now();
  let totalItems = 0;
  let totalPages = 0;
  let errors = [];

  if (!BATCH_SYNC_ENABLED) {
    logger.debug('Batch sync disabled, skipping service sync', { serviceName });
    return {
      service: serviceName,
      success: false,
      reason: 'batch_sync_disabled',
      totalItems: 0,
      totalPages: 0,
      errors: [],
      duration_ms: 0,
    };
  }

  try {
    logger.info('🔍 [BATCH SYNC] Starting sync for service', {
      service: serviceName,
      syncType: syncType,
      since: since,
      coordinatorUrl: process.env.COORDINATOR_GRPC_ENDPOINT || process.env.COORDINATOR_GRPC_URL || 'not set',
    });

    let page = 1;
    let hasMore = true;
    const allData = [];

    while (hasMore) {
      try {
        logger.info('🔍 [BATCH SYNC] Fetching page', {
          service: serviceName,
          page: page,
          limit: BATCH_SYNC_LIMIT,
        });

        // ⭐ ADD THIS BEFORE batchSync call
        logger.info('🔍 [BATCH SYNC] About to call Coordinator batchSync', {
          target_service: serviceName,
          sync_type: syncType,
          page: page,
          limit: BATCH_SYNC_LIMIT,
          since: since,
        });

        // Call Coordinator batchSync with required metadata
        const response = await batchSync({
          target_service: serviceName,    // ⭐ CRITICAL - tells Coordinator where to route
          sync_type: syncType,             // ⭐ CRITICAL - triggers batch mode
          page,
          limit: BATCH_SYNC_LIMIT,
          since,
        });

        // ⭐ ADD THIS AFTER batchSync call
        logger.info('🔍 [BATCH SYNC] Coordinator batchSync returned', {
          service: serviceName,
          page: page,
          has_response: !!response,
          response_keys: response ? Object.keys(response) : [],
          has_envelope_json: !!response?.envelope_json,
          has_target_services: !!response?.target_services,
        });

        if (!response) {
          logger.warn('⚠️ [BATCH SYNC] No response from Coordinator', {
            service: serviceName,
            page: page,
          });
          errors.push({
            page,
            error: 'No response from Coordinator',
          });
          hasMore = false;
          break;
        }

        // Process Coordinator response
        const processed = processCoordinatorResponse(response);
        if (!processed) {
          logger.warn('[BatchSync] Failed to process Coordinator response', {
            service: serviceName,
            page,
          });
          errors.push({
            page,
            error: 'Failed to process response',
          });
          hasMore = false;
          break;
        }

        // Extract data from response
        const envelopeJson = response.envelope_json;
        let pageData = [];

        if (envelopeJson) {
          try {
            const envelope = JSON.parse(envelopeJson);
            if (envelope.payload?.data) {
              pageData = Array.isArray(envelope.payload.data) 
                ? envelope.payload.data 
                : [envelope.payload.data];
            }
          } catch (parseError) {
            logger.warn('[BatchSync] Failed to parse envelope JSON', {
              service: serviceName,
              page,
              error: parseError.message,
            });
          }
        }

        // Check if there's more data (based on response or data count)
        const itemsInPage = pageData.length;
        totalItems += itemsInPage;
        allData.push(...pageData);

        logger.info('[BatchSync] Page sync completed', {
          service: serviceName,
          page,
          items_in_page: itemsInPage,
          total_items: totalItems,
        });

        // Determine if there's more data
        // Coordinator may indicate this via normalized_fields or we infer from data count
        const normalizedFields = response.normalized_fields || {};
        const hasMoreFlag = normalizedFields.has_more === 'true' || normalizedFields.has_more === true;
        
        if (hasMoreFlag) {
          hasMore = true;
          page++;
        } else if (itemsInPage < BATCH_SYNC_LIMIT) {
          // If we got fewer items than requested, assume no more pages
          hasMore = false;
        } else {
          // Got full page, assume there might be more
          // But limit to prevent infinite loops
          if (page >= 100) {
            logger.warn('[BatchSync] Reached max pages limit, stopping', {
              service: serviceName,
              maxPages: 100,
            });
            hasMore = false;
          } else {
            page++;
          }
        }

        totalPages = page;

        // Small delay between pages to avoid overwhelming Coordinator
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
      } catch (pageError) {
        logger.error('[BatchSync] Error syncing page', {
          service: serviceName,
          page,
          error: pageError.message,
          stack: pageError.stack,
        });
        errors.push({
          page,
          error: pageError.message,
        });
        
        // Continue to next page if error is retryable
        // Otherwise stop syncing this service
        if (pageError.code === 'DEADLINE_EXCEEDED' || pageError.code === 'UNAVAILABLE') {
          logger.warn('[BatchSync] Retryable error, continuing to next page', {
            service: serviceName,
            page,
          });
          page++;
          continue;
        } else {
          hasMore = false;
          break;
        }
      }
    }

    // Update data store with synced data
    if (allData.length > 0) {
      await updateDataStore(serviceName, allData);
    }

    const duration = Date.now() - startTime;
    const success = errors.length === 0;

    logger.info('[BatchSync] Service sync completed', {
      service: serviceName,
      success,
      totalItems,
      totalPages,
      errors_count: errors.length,
      duration_ms: duration,
    });

    return {
      service: serviceName,
      success,
      totalItems,
      totalPages,
      errors,
      duration_ms: duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('[BatchSync] Service sync failed', {
      service: serviceName,
      error: error.message,
      stack: error.stack,
      duration_ms: duration,
    });

    return {
      service: serviceName,
      success: false,
      totalItems: 0,
      totalPages: 0,
      errors: [{ error: error.message }],
      duration_ms: duration,
    };
  }
}

/**
 * Update internal data store with synced data
 * This can be extended to:
 * - Store in vector DB for embeddings
 * - Update cache
 * - Store in database
 * - Trigger re-indexing
 * 
 * @param {string} serviceName - Name of the microservice
 * @param {Array} data - Array of data items to store
 */
async function updateDataStore(serviceName, data) {
  try {
    logger.info('[BatchSync] Updating data store', {
      service: serviceName,
      items_count: data.length,
    });

    // TODO: Implement actual data store update logic
    // This could involve:
    // 1. Creating embeddings for vector search
    // 2. Storing in database
    // 3. Updating cache
    // 4. Triggering re-indexing

    // For now, just log the update
    logger.debug('[BatchSync] Data store update placeholder', {
      service: serviceName,
      sample_item: data[0] || null,
    });

    // Example: Store in database if needed
    // const prisma = getPrismaClient();
    // await prisma.syncedData.createMany({
    //   data: data.map(item => ({
    //     service: serviceName,
    //     data: item,
    //     synced_at: new Date(),
    //   })),
    // });

  } catch (error) {
    logger.error('[BatchSync] Failed to update data store', {
      service: serviceName,
      error: error.message,
      items_count: data.length,
    });
    throw error;
  }
}

/**
 * Sync all configured microservices
 * @param {Object} options - Sync options
 * @param {string} options.syncType - Type of sync ('batch', 'daily', 'incremental')
 * @param {string} options.since - ISO date string for incremental sync (optional)
 * @returns {Promise<Object>} Summary of all syncs
 */
export async function syncAllServices(options = {}) {
  const { syncType = 'batch', since = null } = options; // ✅ FIXED: 'batch' not 'daily'
  const startTime = Date.now();

  if (!BATCH_SYNC_ENABLED) {
    logger.debug('Batch sync disabled, skipping all services');
    return {
      success: false,
      reason: 'batch_sync_disabled',
      services: [],
      totalItems: 0,
      totalErrors: 0,
      duration_ms: 0,
    };
  }

  logger.info('[BatchSync] Starting sync for all services');

  // Get services list (now async!)
  const services = await getServicesToSync();

  logger.info('[BatchSync] Services to sync', {
    services: services,
    count: services.length,
    syncType: syncType,
    has_since: !!since,
  });

  const results = [];

  // Sync each service independently (errors in one don't stop others)
  for (const serviceName of services) {
    try {
      logger.info('[BatchSync] Starting sync for service', {
        service: serviceName,
      });

      const result = await syncService(serviceName, { syncType, since });

      results.push({
        service: serviceName,
        success: true,
        ...result,
      });

      logger.info('[BatchSync] Service sync completed', {
        service: serviceName,
        success: true,
        totalItems: result.totalItems,
      });

    } catch (error) {
      logger.error('[BatchSync] Service sync failed', {
        service: serviceName,
        error: error.message,
      });

      results.push({
        service: serviceName,
        success: false,
        totalItems: 0,
        totalPages: 0,
        errors: [{ error: error.message }],
        duration_ms: 0,
      });
    }
  }

  const duration = Date.now() - startTime;
  const totalItems = results.reduce((sum, r) => sum + (r.totalItems || 0), 0);
  const totalErrors = results.reduce((sum, r) => sum + (r.errors?.length || 0), 0);
  const successfulServices = results.filter(r => r.success).length;
  const failedServices = results.filter(r => !r.success).length;

  logger.info('[BatchSync] All services sync completed', {
    total: services.length,
    successful: successfulServices,
    failed: failedServices,
    totalItems,
    totalErrors,
    duration_ms: duration,
  });

  return {
    success: failedServices === 0,
    services: results,
    totalItems,
    totalErrors,
    successfulServices,
    failedServices,
    duration_ms: duration,
  };
}

/**
 * Get batch sync status and statistics
 * @returns {Object} Sync status
 */
export function getBatchSyncStatus() {
  return {
    enabled: BATCH_SYNC_ENABLED,
    services: process.env.BATCH_SYNC_SERVICES ? process.env.BATCH_SYNC_SERVICES.split(',').map(s => s.trim()) : 'from Coordinator',
    limit: BATCH_SYNC_LIMIT,
    coordinator_http_url: process.env.COORDINATOR_HTTP_URL || process.env.COORDINATOR_URL || 'not set',
  };
}

