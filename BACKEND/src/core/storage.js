/**
 * STORAGE
 * Stores data in database and performs vector searches
 */

import { getPrismaClient } from '../config/database.config.js';
import tableManager from './tableManager.js';
import { logger } from '../utils/logger.util.js';

class Storage {
  /**
   * Store item
   */
  async store(item, content, embedding, tenantId, schema) {
    const tableName = tableManager.getTableName(schema.service_name);
    const prisma = await getPrismaClient();

    try {
      // Find primary key for upsert (use first field as primary key identifier)
      const pkField = Object.keys(schema.data_structure)[0];
      const pkColumn = tableManager.sanitizeColumnName(pkField);
      const pkValue = item[pkField];

      if (!pkValue) {
        throw new Error(`Primary key field ${pkField} is missing from item`);
      }

      // Convert embedding array to PostgreSQL vector format string
      const embeddingStr = `[${embedding.join(',')}]`;

      // Build column-value pairs for insertion/update
      const columnValuePairs = [];
      const updatePairs = [];
      const insertValues = [];
      const updateValues = [];
      let updateParamIndex = 1; // Start from 1 for UPDATE SET clause (WHERE uses separate params)

      // Add tenant_id
      columnValuePairs.push('tenant_id');
      insertValues.push(tenantId);
      updatePairs.push(`tenant_id = $${updateParamIndex}`);
      updateValues.push(tenantId);
      updateParamIndex++;

      // Add schema fields
      for (const [fieldName, fieldType] of Object.entries(schema.data_structure)) {
        const colName = tableManager.sanitizeColumnName(fieldName);
        columnValuePairs.push(colName);
        
        let value = item[fieldName];
        
        // Convert to JSON string if object/array
        if ((fieldType === 'object' || fieldType === 'array') && value !== null && value !== undefined) {
          value = JSON.stringify(value);
        }
        
        insertValues.push(value);
        
        // For update, skip primary key
        if (colName !== pkColumn) {
          updatePairs.push(`${colName} = $${updateParamIndex}`);
          updateValues.push(value);
          updateParamIndex++;
        }
      }

      // Add content
      columnValuePairs.push('full_content');
      insertValues.push(content);
      updatePairs.push(`full_content = $${updateParamIndex}`);
      updateValues.push(content);
      updateParamIndex++;

      // Add embedding (as vector)
      columnValuePairs.push('embedding');
      insertValues.push(embeddingStr);
      updatePairs.push(`embedding = $${updateParamIndex}::vector`);
      updateValues.push(embeddingStr);
      updateParamIndex++;

      // Add synced_at
      columnValuePairs.push('synced_at');
      insertValues.push(new Date());
      updatePairs.push(`synced_at = $${updateParamIndex}`);
      updateValues.push(new Date());
      updateParamIndex++;

      // Build placeholders for INSERT
      const placeholders = insertValues.map((_, i) => `$${i + 1}`).join(', ');

      // Build SQL for upsert using ON CONFLICT
      // Note: We need to add a unique constraint on (tenant_id, pk_column) for this to work
      // For now, we'll use a simpler approach: check then insert/update
      const checkSQL = `
        SELECT id FROM ${tableName}
        WHERE ${pkColumn} = $1 AND tenant_id = $2
        LIMIT 1
      `;

      const existing = await prisma.$queryRawUnsafe(checkSQL, pkValue, tenantId);

      if (existing && existing.length > 0) {
        // Update existing record - build update SQL with proper parameter binding
        // WHERE clause parameters come after SET parameters
        const whereParamStart = updateParamIndex;
        const updateSQL = `
          UPDATE ${tableName}
          SET ${updatePairs.join(', ')}
          WHERE ${pkColumn} = $${whereParamStart} AND tenant_id = $${whereParamStart + 1}
        `;
        // Update values already contain all SET values, now add WHERE values
        await prisma.$executeRawUnsafe(updateSQL, ...updateValues, pkValue, tenantId);
      } else {
        // Insert new record
        const insertSQL = `
          INSERT INTO ${tableName} (${columnValuePairs.join(', ')})
          VALUES (${placeholders})
        `;
        await prisma.$executeRawUnsafe(insertSQL, ...insertValues);
      }

      logger.debug('Item stored', {
        table: tableName,
        tenant_id: tenantId,
        pk_field: pkField,
        pk_value: pkValue
      });
    } catch (error) {
      logger.error('Failed to store item', {
        table: tableName,
        tenant_id: tenantId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Search using vector similarity
   */
  async vectorSearch(query, embedding, tenantId, schema, options = {}) {
    const tableName = tableManager.getTableName(schema.service_name);
    const prisma = await getPrismaClient();

    const {
      limit = 5,
      threshold = 0.7
    } = options;

    try {
      // Build column list for selection
      const columns = Object.keys(schema.data_structure)
        .map(f => `${tableManager.sanitizeColumnName(f)}`)
        .join(', ');

      // Convert embedding array to PostgreSQL vector format string
      const embeddingStr = `[${embedding.join(',')}]`;

      // Execute search using cosine similarity
      // Using 1 - (embedding <=> query_embedding) for cosine similarity
      // Note: $queryRawUnsafe with parameters - embeddingStr must be cast to vector
      const sql = `
        SELECT 
          ${columns},
          full_content,
          1 - (embedding <=> $1::vector) as similarity
        FROM ${tableName}
        WHERE tenant_id = $2
          AND (1 - (embedding <=> $1::vector)) > $3
        ORDER BY embedding <=> $1::vector
        LIMIT $4
      `;

      const result = await prisma.$queryRawUnsafe(
        sql,
        embeddingStr,
        tenantId,
        threshold,
        limit
      );

      logger.debug('Vector search completed', {
        table: tableName,
        tenant_id: tenantId,
        results_count: result?.length || 0
      });

      return result || [];
    } catch (error) {
      logger.error('Vector search failed', {
        table: tableName,
        tenant_id: tenantId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

export default new Storage();

