/**
 * Unified Vector Search Service
 * Single source of truth for vector similarity search
 * Used by both test endpoint and production endpoint
 */

import { getPrismaClient } from '../config/database.config.js';
import { logger } from '../utils/logger.util.js';
import { Prisma } from '@prisma/client';

/**
 * Unified vector search function
 * This is the ONLY function that should perform vector searches
 * 
 * @param {number[]} queryEmbedding - Query embedding vector (1536 dimensions)
 * @param {string} tenantId - Tenant identifier (UUID)
 * @param {Object} options - Search options
 * @param {number} options.limit - Maximum number of results (default: 20)
 * @param {number} options.threshold - Minimum similarity threshold (default: 0.25)
 * @param {string} options.contentType - Filter by content type (optional)
 * @param {string} options.contentId - Filter by content ID (optional)
 * @param {string} options.microserviceId - Filter by microservice ID (optional)
 * @returns {Promise<Array>} Array of similar vector embeddings with similarity scores
 */
export async function unifiedVectorSearch(
  queryEmbedding,
  tenantId,
  options = {}
) {
  const { 
    limit = 20, 
    threshold = 0.25, 
    contentType, 
    contentId,
    microserviceId
  } = options;

  try {
    const prisma = await getPrismaClient();


    // Build query using same approach as working vectorSearch.service.js
    // Convert embedding array to PostgreSQL vector format
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    const escapedEmbeddingStr = embeddingStr.replace(/'/g, "''");
    const vectorLiteral = `'${escapedEmbeddingStr}'::vector`;
    
    // Build WHERE clause with parameterized queries
    let whereClause = 'tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;

    if (contentType) {
      whereClause += ` AND content_type = $${paramIndex}`;
      params.push(contentType);
      paramIndex++;
    }

    if (contentId) {
      whereClause += ` AND content_id = $${paramIndex}`;
      params.push(contentId);
      paramIndex++;
    }

    if (microserviceId) {
      whereClause += ` AND microservice_id = $${paramIndex}`;
      params.push(microserviceId);
      paramIndex++;
    }

    // Add threshold and limit as parameters
    const thresholdParamIndex = paramIndex;
    params.push(threshold);
    paramIndex++;
    
    const limitParamIndex = paramIndex;
    params.push(limit);

    // Build the complete query - EXACT same structure as vectorSearch.service.js
    const query = `
      SELECT 
        id,
        tenant_id,
        microservice_id,
        content_id,
        content_type,
        content_text,
        chunk_index,
        metadata,
        created_at,
        1 - (embedding <=> ${vectorLiteral}) as similarity
      FROM vector_embeddings
      WHERE ${whereClause}
        AND (1 - (embedding <=> ${vectorLiteral})) >= $${thresholdParamIndex}
      ORDER BY embedding <=> ${vectorLiteral}
      LIMIT $${limitParamIndex}
    `;

    // Execute query
    const results = await prisma.$queryRawUnsafe(query, ...params);


    // Map results to consistent format
    return results.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      microserviceId: row.microservice_id,
      contentId: row.content_id,
      contentType: row.content_type,
      contentText: row.content_text,
      chunkIndex: row.chunk_index,
      metadata: row.metadata || {},
      similarity: parseFloat(row.similarity),
      createdAt: row.created_at,
    }));
  } catch (error) {
    logger.error('Unified vector search error', {
      error: error.message,
      tenantId,
      stack: error.stack,
    });
    
    
    throw new Error(`Unified vector search failed: ${error.message}`);
  }
}

/**
 * Search without threshold (for diagnostics)
 * Returns top N results regardless of similarity
 */
export async function unifiedVectorSearchWithoutThreshold(
  queryEmbedding,
  tenantId,
  limit = 20
) {
  return unifiedVectorSearch(queryEmbedding, tenantId, {
    threshold: 0.0,
    limit: limit,
  });
}

