/**
 * STORAGE
 * Stores data in vector_embeddings table and performs vector searches
 */

import { getPrismaClient } from '../config/database.config.js';
import { logger } from '../utils/logger.util.js';

class Storage {
  /**
   * Store item with embedding in vector_embeddings table
   * @param {Object} item - Business data item
   * @param {string} content - Text content for search
   * @param {Array} embedding - Vector embedding (1536 dimensions)
   * @param {string} tenantId - Tenant ID
   * @param {Object} schema - Service schema
   */
  async store(item, content, embedding, tenantId, schema) {
    const prisma = await getPrismaClient();

    try {
      // Get primary key field from schema (first field)
      const pkField = Object.keys(schema.data_structure)[0];
      const contentId = String(item[pkField]);

      if (!contentId) {
        throw new Error(`Primary key field ${pkField} is missing from item`);
      }

      // Get or create microservice record
      const microserviceId = await this.getOrCreateMicroservice(
        prisma,
        tenantId,
        schema.service_name,
        schema.description
      );

      // Convert embedding array to PostgreSQL vector format
      const embeddingStr = `[${embedding.join(',')}]`;

      // Prepare metadata (all business data)
      const metadata = {
        ...item,
        _schema_version: schema.version || '1.0.0',
        _source_service: schema.service_name,
        _stored_at: new Date().toISOString()
      };

      logger.info('[STORAGE] Storing item in vector_embeddings', {
        tenantId,
        microserviceId,
        contentId,
        service: schema.service_name,
        contentLength: content?.length || 0,
        embeddingLength: embedding?.length || 0
      });

      // Check if record exists
      const existing = await prisma.vectorEmbedding.findFirst({
        where: {
          tenantId: tenantId,
          contentId: contentId,
          microserviceId: microserviceId || undefined
        }
      });

      if (existing) {
        // Update existing record
        await prisma.$executeRawUnsafe(`
          UPDATE vector_embeddings
          SET 
            content_text = $1,
            embedding = $2::vector,
            metadata = $3::jsonb,
            updated_at = NOW()
          WHERE id = $4
        `, content, embeddingStr, JSON.stringify(metadata), existing.id);

        logger.info('[STORAGE] Item updated in vector_embeddings', {
          id: existing.id,
          contentId,
          service: schema.service_name
        });
      } else {
        // Insert new record
        await prisma.$executeRawUnsafe(`
          INSERT INTO vector_embeddings (
            id,
            tenant_id,
            microservice_id,
            content_id,
            content_type,
            embedding,
            content_text,
            chunk_index,
            metadata,
            created_at,
            updated_at
          ) VALUES (
            gen_random_uuid()::text,
            $1,
            $2,
            $3,
            $4,
            $5::vector,
            $6,
            $7,
            $8::jsonb,
            NOW(),
            NOW()
          )
        `,
          tenantId,
          microserviceId,
          contentId,
          'microservice_data',
          embeddingStr,
          content,
          0,
          JSON.stringify(metadata)
        );

        logger.info('[STORAGE] Item inserted in vector_embeddings', {
          contentId,
          service: schema.service_name,
          tenantId
        });
      }

      logger.info('[STORAGE] ✅ Item stored successfully', {
        table: 'vector_embeddings',
        contentId,
        service: schema.service_name,
        tenantId
      });

    } catch (error) {
      logger.error('[STORAGE] ❌ Failed to store item', {
        service: schema.service_name,
        tenantId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get or create microservice record
   */
  async getOrCreateMicroservice(prisma, tenantId, serviceName, description) {
    try {
      // Check if microservice exists
      let microservice = await prisma.microservice.findFirst({
        where: {
          tenantId: tenantId,
          name: serviceName
        }
      });

      if (!microservice) {
        // Create microservice record
        microservice = await prisma.microservice.create({
          data: {
            tenantId: tenantId,
            name: serviceName,
            serviceId: `${serviceName}-${tenantId}`,
            displayName: serviceName.replace(/-/g, ' ').replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            description: description || `Data from ${serviceName}`,
            isActive: true
          }
        });

        logger.info('[STORAGE] Created microservice record', {
          id: microservice.id,
          name: serviceName,
          tenantId
        });
      }

      return microservice.id;

    } catch (error) {
      // If microservice creation fails, return null (optional field)
      logger.warn('[STORAGE] Could not get/create microservice', {
        serviceName,
        tenantId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Vector similarity search in vector_embeddings
   * Note: This method is kept for backward compatibility but may not be used
   * The unifiedVectorSearch service should be used instead
   */
  async vectorSearch(query, embedding, tenantId, schema, options = {}) {
    const prisma = await getPrismaClient();

    const {
      limit = 5,
      threshold = 0.7
    } = options;

    try {
      // Convert embedding array to PostgreSQL vector format string
      const embeddingStr = `[${embedding.join(',')}]`;

      // Execute search using cosine similarity in vector_embeddings table
      const sql = `
        SELECT 
          id,
          tenant_id,
          microservice_id,
          content_id,
          content_type,
          content_text,
          metadata,
          1 - (embedding <=> $1::vector) as similarity
        FROM vector_embeddings
        WHERE tenant_id = $2
          AND content_type = 'microservice_data'
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

      logger.debug('[STORAGE] Vector search completed', {
        table: 'vector_embeddings',
        tenant_id: tenantId,
        results_count: result?.length || 0
      });

      return result || [];
    } catch (error) {
      logger.error('[STORAGE] Vector search failed', {
        table: 'vector_embeddings',
        tenant_id: tenantId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

export default new Storage();

