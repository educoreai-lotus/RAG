/**
 * SCHEMA LOADER
 * Loads and manages DATA_STRUCTURE_REPORT.json files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SchemaLoader {
  constructor() {
    this.schemas = new Map();
    this.configDir = path.join(__dirname, '../config/microservices');
  }

  /**
   * Load all schemas from config directory
   */
  loadAll() {
    logger.info('Loading microservice schemas', {
      config_dir: this.configDir
    });

    // Check if directory exists
    if (!fs.existsSync(this.configDir)) {
      logger.warn('Microservices config directory not found', {
        config_dir: this.configDir
      });
      return;
    }

    // Read all JSON files from config directory
    const files = fs.readdirSync(this.configDir)
      .filter(f => f.endsWith('.json'));

    if (files.length === 0) {
      logger.warn('No microservice schemas found', {
        config_dir: this.configDir,
        message: 'Add DATA_STRUCTURE_REPORT.json files from microservices to this directory'
      });
      return;
    }

    for (const file of files) {
      try {
        const filePath = path.join(this.configDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const schema = JSON.parse(content);

        // Skip placeholder files (files with _status: "pending")
        if (schema._status === 'pending') {
          logger.debug('Skipping placeholder file', {
            file,
            message: 'Waiting for real DATA_STRUCTURE_REPORT.json'
          });
          continue;
        }

        // Validate it's a real schema (has required fields)
        if (!schema.service_name || !schema.data_structure) {
          logger.warn('Invalid schema file - missing required fields', {
            file,
            has_service_name: !!schema.service_name,
            has_data_structure: !!schema.data_structure
          });
          continue;
        }

        this.schemas.set(schema.service_name, schema);

        logger.info('Schema loaded', {
          service: schema.service_name,
          version: schema.version,
          fields: Object.keys(schema.data_structure).length
        });
      } catch (error) {
        logger.error('Failed to load schema', {
          file,
          error: error.message
        });
      }
    }

    logger.info('All schemas loaded', {
      total: this.schemas.size,
      services: Array.from(this.schemas.keys())
    });
  }

  /**
   * Get schema for service
   */
  getSchema(serviceName) {
    const schema = this.schemas.get(serviceName);
    if (!schema) {
      throw new Error(`No schema found for service: ${serviceName}`);
    }
    return schema;
  }

  /**
   * Check if service has schema
   */
  hasSchema(serviceName) {
    return this.schemas.has(serviceName);
  }

  /**
   * List all registered services
   */
  listServices() {
    return Array.from(this.schemas.keys());
  }

  /**
   * Reload schemas (useful for adding new services)
   */
  reload() {
    this.schemas.clear();
    this.loadAll();
  }
}

// Export singleton instance
export default new SchemaLoader();

