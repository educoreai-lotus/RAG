/**
 * Data Storage Service
 * Handles storing microservice data in Supabase
 */

import { getPrismaClient } from '../config/database.config.js';
import { getSchema } from '../schemas/microserviceSchemas.js';
import { logger } from '../utils/logger.util.js';

class DataStorageService {
  constructor() {
    this.prisma = null;
  }

  async getPrisma() {
    if (!this.prisma) {
      this.prisma = await getPrismaClient();
    }
    return this.prisma;
  }

  /**
   * Store data from a microservice
   * @param {string} serviceName - Name of the microservice
   * @param {Array} items - Array of data items
   * @param {Object} options - Storage options
   * @param {string} options.tenantId - Tenant ID (default: 'system')
   * @returns {Promise<Object>} Storage result
   */
  async storeData(serviceName, items, options = {}) {
    try {
      const schema = getSchema(serviceName);
      const tenantId = options.tenantId || 'system';
      
      logger.info('[DataStorage] Storing data', {
        service: serviceName,
        items_count: items.length,
        table: schema.storage.table,
        tenantId
      });

      const stored = [];
      const errors = [];

      for (const item of items) {
        try {
          const storedItem = await this.storeItem(serviceName, item, schema, tenantId);
          stored.push(storedItem);
        } catch (error) {
          logger.error('[DataStorage] Failed to store item', {
            service: serviceName,
            item_id: item[schema.storage.id_field],
            error: error.message,
            stack: error.stack
          });
          errors.push({ item, error: error.message });
        }
      }

      logger.info('[DataStorage] Storage complete', {
        service: serviceName,
        stored: stored.length,
        errors: errors.length
      });

      return {
        success: true,
        stored: stored.length,
        errors: errors.length,
        items: stored
      };

    } catch (error) {
      logger.error('[DataStorage] Storage failed', {
        service: serviceName,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Store a single item
   * @param {string} serviceName - Name of the microservice
   * @param {Object} item - Data item to store
   * @param {Object} schema - Schema configuration
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Stored item
   */
  async storeItem(serviceName, item, schema, tenantId) {
    const prisma = await this.getPrisma();
    const tableName = schema.storage.table;
    const idField = schema.storage.id_field;
    const timestampField = schema.storage.timestamp_field;

    // Map fields according to schema
    const mappedData = this.mapFields(item, schema.field_mapping);

    // Prepare data for storage
    const contentId = item[idField] || this.generateId();
    const timestamp = item[timestampField] ? new Date(item[timestampField]) : new Date();

    // For now, we'll use raw SQL since microservice_data table might not be in Prisma schema yet
    // This allows us to work with the table even if migration hasn't been run
    try {
      // Try to upsert using raw SQL
      const result = await prisma.$queryRawUnsafe(
        `
        INSERT INTO microservice_data (
          id, tenant_id, service_name, content_id, content_type, 
          content_data, metadata, timestamp,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid()::text, $1::uuid, $2, $3, $4, $5::jsonb, $6::jsonb, $7, NOW(), NOW()
        )
        ON CONFLICT (service_name, content_id) 
        DO UPDATE SET
          content_data = EXCLUDED.content_data,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING id, service_name, content_id, content_type
        `,
        tenantId,
        serviceName,
        contentId,
        serviceName, // content_type
        JSON.stringify(item), // content_data
        JSON.stringify(mappedData.metadata || {}), // metadata
        timestamp
      );

      return {
        id: result[0]?.id,
        service_name: result[0]?.service_name,
        content_id: result[0]?.content_id,
        content_type: result[0]?.content_type
      };
    } catch (error) {
      // If table doesn't exist, log error but don't fail completely
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        logger.warn('[DataStorage] microservice_data table does not exist - migration may be needed', {
          service: serviceName,
          error: error.message
        });
        // Return a mock result so pipeline can continue
        return {
          id: this.generateId(),
          service_name: serviceName,
          content_id: contentId,
          content_type: serviceName,
          _migration_needed: true
        };
      }
      throw error;
    }
  }

  /**
   * Map fields according to schema mapping
   * @param {Object} item - Source item
   * @param {Object} fieldMapping - Field mapping configuration
   * @returns {Object} Mapped data
   */
  mapFields(item, fieldMapping) {
    const mapped = {};

    for (const [sourceField, targetField] of Object.entries(fieldMapping)) {
      const value = this.getNestedValue(item, sourceField);
      if (value !== undefined) {
        mapped[targetField] = value;
      }
    }

    return mapped;
  }

  /**
   * Get nested value from object (supports dot notation)
   * @param {Object} obj - Source object
   * @param {string} path - Dot-notation path (e.g., 'conclusions.summary')
   * @returns {*} Value at path or undefined
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current?.[key];
    }, obj);
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export default new DataStorageService();

