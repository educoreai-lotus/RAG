/**
 * MAIN RAG HANDLER
 * Entry point for dynamic microservice RAG integration
 */

import schemaLoader from './schemaLoader.js';
import realtimeHandler from '../handlers/realtimeHandler.js';
import batchHandler from '../handlers/batchHandler.js';
import { logger } from '../utils/logger.util.js';

// Load all schemas on import
schemaLoader.loadAll();

/**
 * Handle RAG request
 * @param {Object} input - Request input
 * @param {string} input.mode - 'realtime' or 'batch'
 * @param {string} input.source_service - Microservice name
 * @param {string} input.user_query - User query (for realtime mode)
 * @param {string} input.user_id - User ID
 * @param {string} input.tenant_id - Tenant ID
 * @param {Object} input.response_envelope - Response envelope from microservice
 * @returns {Promise<Object>} Response object
 */
async function handleRAGRequest(input) {
  try {
    const { mode, source_service } = input;

    // Validate service
    if (!schemaLoader.hasSchema(source_service)) {
      const available = schemaLoader.listServices();
      throw new Error(
        `Unknown service: ${source_service}. ` +
        (available.length > 0
          ? `Available: ${available.join(', ')}`
          : 'No microservice schemas loaded yet. Paste DATA_STRUCTURE_REPORT.json files into src/config/microservices/')
      );
    }

    logger.info('[RAG] Request received', {
      mode,
      service: source_service
    });

    // Route to handler
    switch (mode) {
      case 'realtime':
        return await realtimeHandler.handle(input);

      case 'batch':
        return await batchHandler.handle(input);

      default:
        throw new Error(`Unknown mode: ${mode}. Use 'realtime' or 'batch'`);
    }
  } catch (error) {
    logger.error('[RAG] Request failed', {
      error: error.message,
      stack: error.stack
    });

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Reload schemas (for adding new services without restart)
 */
function reloadSchemas() {
  logger.info('[RAG] Reloading schemas');
  schemaLoader.reload();
  logger.info('[RAG] Schemas reloaded', {
    services: schemaLoader.listServices()
  });
}

/**
 * Get list of available services
 */
function getAvailableServices() {
  return schemaLoader.listServices();
}

/**
 * Check if a service has a schema loaded
 */
function hasSchema(serviceName) {
  return schemaLoader.hasSchema(serviceName);
}

export {
  handleRAGRequest,
  reloadSchemas,
  getAvailableServices,
  hasSchema
};

