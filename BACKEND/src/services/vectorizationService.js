/**
 * Vectorization Service
 * Handles creating embeddings and storing them in vector database
 */

import { getPrismaClient } from '../config/database.config.js';
import { openai } from '../config/openai.config.js';
import { getSchema } from '../schemas/microserviceSchemas.js';
import { logger } from '../utils/logger.util.js';

class VectorizationService {
  constructor() {
    this.prisma = null;
    this.embeddingModel = 'text-embedding-ada-002';
  }

  async getPrisma() {
    if (!this.prisma) {
      this.prisma = await getPrismaClient();
    }
    return this.prisma;
  }

  /**
   * Vectorize data from a microservice
   * @param {string} serviceName - Name of the microservice
   * @param {Array} items - Array of data items (already stored)
   * @param {Object} options - Options
   * @param {string} options.tenantId - Tenant ID (default: 'system')
   * @returns {Promise<Object>} Vectorization result
   */
  async vectorizeData(serviceName, items, options = {}) {
    try {
      const schema = getSchema(serviceName);
      const tenantId = options.tenantId || 'system';

      if (!schema.vectorization.enabled) {
        logger.info('[Vectorization] Skipped - disabled for service', {
          service: serviceName
        });
        return { success: true, vectorized: 0, skipped: items.length };
      }

      logger.info('[Vectorization] Starting vectorization', {
        service: serviceName,
        items_count: items.length,
        tenantId
      });

      const vectorized = [];
      const errors = [];

      // Process in batches to avoid rate limits
      const batchSize = 10;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        
        for (const item of batch) {
          try {
            const result = await this.vectorizeItem(serviceName, item, schema, tenantId);
            if (result) {
              vectorized.push(result);
            }
          } catch (error) {
            logger.error('[Vectorization] Failed to vectorize item', {
              service: serviceName,
              item_id: item[schema.storage.id_field],
              error: error.message,
              stack: error.stack
            });
            errors.push({ item, error: error.message });
          }
        }

        // Small delay between batches to avoid rate limits
        if (i + batchSize < items.length) {
          await this.sleep(200);
        }
      }

      logger.info('[Vectorization] Vectorization complete', {
        service: serviceName,
        vectorized: vectorized.length,
        errors: errors.length
      });

      return {
        success: true,
        vectorized: vectorized.length,
        errors: errors.length
      };

    } catch (error) {
      logger.error('[Vectorization] Vectorization failed', {
        service: serviceName,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Vectorize a single item
   * @param {string} serviceName - Name of the microservice
   * @param {Object} item - Data item
   * @param {Object} schema - Schema configuration
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object|null>} Vectorization result
   */
  async vectorizeItem(serviceName, item, schema, tenantId) {
    // Extract text to vectorize based on schema
    const textToVectorize = this.extractTextForVectorization(item, schema);

    if (!textToVectorize || textToVectorize.trim().length === 0) {
      logger.warn('[Vectorization] No text to vectorize', {
        service: serviceName,
        item_id: item[schema.storage.id_field]
      });
      return null;
    }

    // Generate embedding
    const embedding = await this.generateEmbedding(textToVectorize);

    // Store in vector_embeddings table
    const vectorId = await this.storeEmbedding(serviceName, item, embedding, textToVectorize, schema, tenantId);

    return {
      item_id: item[schema.storage.id_field],
      vector_id: vectorId,
      text_length: textToVectorize.length
    };
  }

  /**
   * Extract text for vectorization based on schema
   * @param {Object} item - Data item
   * @param {Object} schema - Schema configuration
   * @returns {string} Text to vectorize
   */
  extractTextForVectorization(item, schema) {
    const { fields, combineStrategy } = schema.vectorization;

    if (combineStrategy === 'weighted_concat') {
      // Combine fields with weights
      const parts = [];

      for (const fieldConfig of fields) {
        const value = this.getNestedValue(item, fieldConfig.name);
        
        if (value) {
          let text = fieldConfig.transform ? fieldConfig.transform(value) : String(value);
          
          // Apply weight by repeating text
          const weight = Math.floor(fieldConfig.weight);
          for (let i = 0; i < weight; i++) {
            parts.push(text);
          }
        }
      }

      return parts.join(' ');

    } else if (combineStrategy === 'json') {
      // Convert entire item to JSON string
      return JSON.stringify(item);

    } else {
      // Simple concatenation
      const parts = [];
      for (const fieldConfig of fields) {
        const value = this.getNestedValue(item, fieldConfig.name);
        if (value) {
          parts.push(fieldConfig.transform ? fieldConfig.transform(value) : String(value));
        }
      }
      return parts.join(' ');
    }
  }

  /**
   * Generate embedding using OpenAI
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} Embedding vector
   */
  async generateEmbedding(text) {
    try {
      const response = await openai.embeddings.create({
        model: this.embeddingModel,
        input: text
      });

      return response.data[0].embedding;

    } catch (error) {
      logger.error('[Vectorization] OpenAI API error', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Store embedding in vector_embeddings table
   * @param {string} serviceName - Service name
   * @param {Object} item - Data item
   * @param {number[]} embedding - Embedding vector
   * @param {string} contentText - Text content
   * @param {Object} schema - Schema configuration
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<string>} Vector ID
   */
  async storeEmbedding(serviceName, item, embedding, contentText, schema, tenantId) {
    const prisma = await this.getPrisma();
    const contentId = item[schema.storage.id_field] || this.generateId();

    // Verify embedding dimensions
    if (embedding.length !== 1536) {
      throw new Error(`Invalid embedding dimensions: ${embedding.length} (expected 1536)`);
    }

    // Use raw query for pgvector support
    try {
      const embeddingArray = `[${embedding.join(',')}]`;
      const escapedEmbeddingStr = embeddingArray.replace(/'/g, "''");
      
      const result = await prisma.$queryRawUnsafe(
        `
        INSERT INTO vector_embeddings (
          id, tenant_id, content_id, content_type, content_text, 
          embedding, metadata, microservice_id, created_at, updated_at
        ) VALUES (
          gen_random_uuid()::text, $1, $2, $3, $4, $5::vector, $6::jsonb, $7, NOW(), NOW()
        )
        ON CONFLICT (tenant_id, content_id, content_type) 
        DO UPDATE SET
          embedding = $5::vector,
          content_text = $4,
          metadata = $6::jsonb,
          updated_at = NOW()
        RETURNING id
        `,
        tenantId,
        contentId,
        serviceName,
        contentText.substring(0, 10000),  // Limit text length
        escapedEmbeddingStr,  // Format for pgvector
        JSON.stringify(item),
        serviceName
      );

      return result[0]?.id || this.generateId();
    } catch (error) {
      logger.error('[Vectorization] Failed to store embedding', {
        error: error.message,
        contentId,
        serviceName
      });
      throw error;
    }
  }

  /**
   * Get nested value from object
   * @param {Object} obj - Source object
   * @param {string} path - Dot-notation path (supports array notation with [])
   * @returns {*} Value at path
   */
  getNestedValue(obj, path) {
    // Handle array notation: field[]
    if (path.includes('[]')) {
      const basePath = path.replace('[]', '');
      const value = this.getNestedValue(obj, basePath);
      return Array.isArray(value) ? value : [];
    }

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

  /**
   * Sleep helper for rate limiting
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export default new VectorizationService();

