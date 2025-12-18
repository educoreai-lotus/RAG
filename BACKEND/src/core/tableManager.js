/**
 * TABLE MANAGER
 * Dynamically creates tables based on schemas using raw SQL
 */

import { getPrismaClient } from '../config/database.config.js';
import { logger } from '../utils/logger.util.js';

class TableManager {
  /**
   * Ensure table exists for service
   */
  async ensureTable(schema) {
    const tableName = this.getTableName(schema.service_name);

    // Check if exists
    const exists = await this.tableExists(tableName);
    if (exists) {
      logger.debug('Table exists', { table: tableName });
      return tableName;
    }

    // Create table
    logger.info('Creating table', {
      table: tableName,
      service: schema.service_name
    });

    await this.createTable(schema);
    return tableName;
  }

  /**
   * Get table name for service
   */
  getTableName(serviceName) {
    // Convert service-name to service_name_data
    return serviceName.replace(/-/g, '_') + '_data';
  }

  /**
   * Check if table exists
   */
  async tableExists(tableName) {
    const prisma = await getPrismaClient();

    // Use unsafe query since table name is dynamic
    const result = await prisma.$queryRawUnsafe(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = $1
      )`,
      tableName
    );

    return result[0]?.exists || false;
  }

  /**
   * Create table dynamically
   */
  async createTable(schema) {
    const tableName = this.getTableName(schema.service_name);
    const columns = this.buildColumns(schema);

    const prisma = await getPrismaClient();

    // Build column definitions SQL
    const columnDefs = columns.join(',\n        ');

    // Create table with SQL
    const createTableSQL = `
      CREATE TABLE ${tableName} (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(255) NOT NULL,
        ${columnDefs},
        full_content TEXT,
        embedding vector(1536),
        synced_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await prisma.$executeRawUnsafe(createTableSQL);

    // Create indexes
    await this.createIndexes(tableName, schema);

    logger.info('Table created', {
      table: tableName,
      columns: columns.length + 4
    });
  }

  /**
   * Build column definitions from schema
   */
  buildColumns(schema) {
    const columns = [];

    for (const [fieldName, fieldType] of Object.entries(schema.data_structure)) {
      const colName = this.sanitizeColumnName(fieldName);
      const colType = this.mapTypeToSQL(fieldType);
      columns.push(`${colName} ${colType}`);
    }

    return columns;
  }

  /**
   * Sanitize column name
   */
  sanitizeColumnName(name) {
    return name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  /**
   * Map JSON type to SQL type
   */
  mapTypeToSQL(type) {
    const typeMap = {
      'string': 'VARCHAR(255)',
      'text': 'TEXT',
      'number': 'NUMERIC',
      'integer': 'INTEGER',
      'boolean': 'BOOLEAN',
      'datetime': 'TIMESTAMP',
      'date': 'DATE',
      'object': 'JSONB',
      'array': 'JSONB'
    };

    return typeMap[type] || 'TEXT';
  }

  /**
   * Create indexes
   */
  async createIndexes(tableName, schema) {
    const prisma = await getPrismaClient();

    try {
      // Tenant index
      await prisma.$executeRawUnsafe(`
        CREATE INDEX idx_${tableName}_tenant
        ON ${tableName} (tenant_id)
      `);

      // Vector index (if pgvector extension is available)
      try {
        await prisma.$executeRawUnsafe(`
          CREATE INDEX idx_${tableName}_vector
          ON ${tableName}
          USING ivfflat (embedding vector_cosine_ops)
          WITH (lists = 100)
        `);
      } catch (error) {
        // If ivfflat fails, try hnsw (newer pgvector version)
        try {
          await prisma.$executeRawUnsafe(`
            CREATE INDEX idx_${tableName}_vector
            ON ${tableName}
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64)
          `);
        } catch (hnswError) {
          logger.warn('Could not create vector index', {
            table: tableName,
            error: hnswError.message
          });
        }
      }

      // Timestamp indexes
      await prisma.$executeRawUnsafe(`
        CREATE INDEX idx_${tableName}_synced
        ON ${tableName} (tenant_id, synced_at)
      `);

      logger.info('Indexes created', { table: tableName });
    } catch (error) {
      logger.error('Failed to create indexes', {
        table: tableName,
        error: error.message
      });
      throw error;
    }
  }
}

export default new TableManager();

