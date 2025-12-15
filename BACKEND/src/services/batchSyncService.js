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
import { batchSync } from '../clients/coordinator.client.js';
import { processCoordinatorResponse } from '../communication/communicationManager.service.js';
import { getPrismaClient } from '../config/database.config.js';
import dataStorageService from './dataStorageService.js';
import vectorizationService from './vectorizationService.js';
import { updateGraphFromData } from './knowledgeGraph.service.js';
import { hasSchema } from '../schemas/microserviceSchemas.js';
import { getOrCreateTenant } from './tenant.service.js';

// Configuration
const BATCH_SYNC_ENABLED = process.env.BATCH_SYNC_ENABLED !== 'false'; // Default: enabled
const BATCH_SYNC_LIMIT = parseInt(process.env.BATCH_SYNC_LIMIT || '1000', 10);
const MICROSERVICES_TO_SYNC = (process.env.BATCH_SYNC_SERVICES || 'payment-service,assessment-service,devlab-service,analytics-service')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

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
    logger.info('[BatchSync] Starting sync for service', {
      service: serviceName,
      syncType,
      has_since: !!since,
    });

    let page = 1;
    let hasMore = true;
    const allData = [];

    while (hasMore) {
      try {
        logger.debug('[BatchSync] Fetching page', {
          service: serviceName,
          page,
          limit: BATCH_SYNC_LIMIT,
        });

        // Call Coordinator batchSync with required metadata
        const response = await batchSync({
          target_service: serviceName,    // ⭐ CRITICAL - tells Coordinator where to route
          sync_type: syncType,             // ⭐ CRITICAL - triggers batch mode
          page,
          limit: BATCH_SYNC_LIMIT,
          since,
        });

        if (!response) {
          logger.warn('[BatchSync] No response from Coordinator', {
            service: serviceName,
            page,
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
 * This is the main orchestrator for data processing pipeline:
 * 1. Store data in Supabase
 * 2. Vectorize data for semantic search
 * 3. Update knowledge graph with relationships
 * 
 * @param {string} serviceName - Name of the microservice
 * @param {Array} data - Array of data items to store
 */
async function updateDataStore(serviceName, data) {
  try {
    logger.info('[BatchSync] Starting data store update', {
      service: serviceName,
      items_count: data.length,
    });

    // Check if schema exists for this service
    if (!hasSchema(serviceName)) {
      logger.warn('[BatchSync] No schema found for service - skipping data processing', {
        service: serviceName,
        suggestion: 'Add schema to microserviceSchemas.js'
      });
      // Could implement generic storage here or throw error
      throw new Error(`No schema configured for service: ${serviceName}. Please add schema to microserviceSchemas.js`);
    }

    // Get tenant ID (use default tenant for now)
    // In production, this should come from the sync context
    const defaultTenant = await getOrCreateTenant('default.local');
    const tenantId = defaultTenant.id;

    // Step 1: Store data in Supabase
    logger.info('[BatchSync] Step 1/3: Storing data in Supabase', {
      service: serviceName,
      tenantId
    });
    
    const storageResult = await dataStorageService.storeData(serviceName, data, { tenantId });
    
    logger.info('[BatchSync] Data storage complete', {
      service: serviceName,
      stored: storageResult.stored,
      errors: storageResult.errors
    });

    // Step 2: Vectorize data
    logger.info('[BatchSync] Step 2/3: Vectorizing data', {
      service: serviceName
    });
    
    const vectorizationResult = await vectorizationService.vectorizeData(
      serviceName, 
      data,
      { tenantId }
    );
    
    logger.info('[BatchSync] Vectorization complete', {
      service: serviceName,
      vectorized: vectorizationResult.vectorized,
      errors: vectorizationResult.errors
    });

    // Step 3: Update knowledge graph
    logger.info('[BatchSync] Step 3/3: Updating knowledge graph', {
      service: serviceName
    });
    
    const graphResult = await updateGraphFromData(
      tenantId,
      serviceName,
      data
    );
    
    logger.info('[BatchSync] Knowledge graph update complete', {
      service: serviceName,
      entities: graphResult.entities,
      relationships: graphResult.relationships
    });

    // Summary
    logger.info('[BatchSync] Data store update complete', {
      service: serviceName,
      summary: {
        items_processed: data.length,
        stored: storageResult.stored,
        vectorized: vectorizationResult.vectorized,
        graph_entities: graphResult.entities,
        graph_relationships: graphResult.relationships,
        total_errors: storageResult.errors + vectorizationResult.errors
      }
    });

    return {
      success: true,
      stored: storageResult.stored,
      vectorized: vectorizationResult.vectorized,
      graph_entities: graphResult.entities,
      graph_relationships: graphResult.relationships,
      errors: storageResult.errors + vectorizationResult.errors
    };

  } catch (error) {
    logger.error('[BatchSync] Failed to update data store', {
      service: serviceName,
      error: error.message,
      stack: error.stack,
      items_count: data.length
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
  const { syncType = 'daily', since = null } = options;
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

  logger.info('[BatchSync] Starting sync for all services', {
    services: MICROSERVICES_TO_SYNC,
    syncType,
    has_since: !!since,
  });

  const results = [];

  // Sync each service independently (errors in one don't stop others)
  for (const serviceName of MICROSERVICES_TO_SYNC) {
    try {
      const result = await syncService(serviceName, { syncType, since });
      results.push(result);
    } catch (error) {
      logger.error('[BatchSync] Failed to sync service', {
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
  const totalItems = results.reduce((sum, r) => sum + r.totalItems, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const successfulServices = results.filter(r => r.success).length;
  const failedServices = results.filter(r => !r.success).length;

  logger.info('[BatchSync] All services sync completed', {
    total_services: MICROSERVICES_TO_SYNC.length,
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
    services: MICROSERVICES_TO_SYNC,
    limit: BATCH_SYNC_LIMIT,
  };
}

