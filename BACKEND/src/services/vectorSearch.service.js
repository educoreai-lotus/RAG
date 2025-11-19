/**
 * Vector Search Service
 * Handles vector similarity search using pgvector
 */

import { getPrismaClient } from '../config/database.config.js';
import { logger } from '../utils/logger.util.js';

/**
 * Search for similar vectors using cosine similarity
 * @param {number[]} queryEmbedding - Query embedding vector (1536 dimensions)
 * @param {string} tenantId - Tenant identifier
 * @param {Object} options - Search options
 * @param {number} options.limit - Maximum number of results (default: 5)
 * @param {number} options.threshold - Minimum similarity threshold (default: 0.7)
 * @param {string} options.contentType - Filter by content type (optional)
 * @param {string} options.contentId - Filter by content ID (optional)
 * @param {string} options.microserviceId - Filter by microservice ID (optional)
 * @param {string[]} options.microserviceIds - Filter by multiple microservice IDs (optional)
 * @returns {Promise<Array>} Array of similar vector embeddings
 */
export async function searchSimilarVectors(
  queryEmbedding,
  tenantId,
  options = {}
) {
  const { 
    limit = 5, 
    threshold = 0.7, 
    contentType, 
    contentId,
    microserviceId,
    microserviceIds 
  } = options;

  try {
    const prisma = await getPrismaClient();

    // Build the query using raw SQL for pgvector similarity search
    // pgvector uses cosine distance: 1 - cosine_similarity
    // We want results where similarity > threshold
    
    // Convert embedding array to PostgreSQL vector format
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Build WHERE clause
    let whereConditions = [`tenant_id = $1`];
    const params = [tenantId];
    let paramIndex = 2;

    if (contentType) {
      whereConditions.push(`content_type = $${paramIndex}`);
      params.push(contentType);
      paramIndex++;
    }

    if (contentId) {
      whereConditions.push(`content_id = $${paramIndex}`);
      params.push(contentId);
      paramIndex++;
    }

    // Filter by single microservice
    if (microserviceId) {
      whereConditions.push(`microservice_id = $${paramIndex}`);
      params.push(microserviceId);
      paramIndex++;
    }

    // Filter by multiple microservices
    if (microserviceIds && microserviceIds.length > 0) {
      const placeholders = microserviceIds.map((_, idx) => `$${paramIndex + idx}`).join(', ');
      whereConditions.push(`microservice_id IN (${placeholders})`);
      params.push(...microserviceIds);
      paramIndex += microserviceIds.length;
    }

    // Add embedding and threshold to params
    const embeddingParamIndex = paramIndex;
    params.push(embeddingStr);
    paramIndex++;
    
    const thresholdParamIndex = paramIndex;
    params.push(threshold);
    paramIndex++;
    
    const limitParamIndex = paramIndex;
    params.push(limit);

    // Use cosine distance: 1 - cosine_similarity
    // Order by distance (ascending) to get most similar first
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
        1 - (embedding <=> $${embeddingParamIndex}::vector) as similarity
      FROM vector_embeddings
      WHERE ${whereConditions.join(' AND ')}
        AND (1 - (embedding <=> $${embeddingParamIndex}::vector)) >= $${thresholdParamIndex}
      ORDER BY embedding <=> $${embeddingParamIndex}::vector
      LIMIT $${limitParamIndex}
    `;

    const results = await prisma.$queryRawUnsafe(query, ...params);

    logger.info('Vector search completed', {
      tenantId,
      resultsCount: results.length,
      threshold,
      limit,
      queryEmbeddingLength: queryEmbedding?.length || 0,
      hasResults: results.length > 0,
      topSimilarity: results.length > 0 ? parseFloat(results[0].similarity) : null,
    });
    
    // Log first result details for debugging
    if (results.length > 0) {
      logger.debug('Vector search top result', {
        contentId: results[0].content_id,
        contentType: results[0].content_type,
        similarity: parseFloat(results[0].similarity),
        contentTextPreview: results[0].content_text?.substring(0, 100),
      });
    } else {
      // If no results, check if there's any data in the table
      const totalCount = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM vector_embeddings WHERE tenant_id = $1`,
        tenantId
      );
      
      // Also check all tenants to see if data exists with different tenant_id
      const allTenantsCount = await prisma.$queryRawUnsafe(
        `SELECT tenant_id, COUNT(*) as count FROM vector_embeddings GROUP BY tenant_id`
      );
      
      // Check if "Eden Levi" exists with any tenant_id
      const edenLeviCheck = await prisma.$queryRawUnsafe(
        `SELECT tenant_id, content_id, content_text FROM vector_embeddings WHERE content_id = $1 LIMIT 5`,
        'user:manager-001'
      );
      
      logger.warn('No vector search results found', {
        tenantId,
        threshold,
        totalRecordsForThisTenant: totalCount[0]?.count || 0,
        allTenantsData: allTenantsCount,
        edenLeviExists: edenLeviCheck.length > 0,
        edenLeviTenantIds: edenLeviCheck.map(r => r.tenant_id),
      });
    }

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
    logger.error('Vector search error', {
      error: error.message,
      tenantId,
      stack: error.stack,
    });
    throw new Error(`Vector search failed: ${error.message}`);
  }
}

/**
 * Store vector embedding in database
 * @param {Object} embeddingData - Embedding data
 * @param {string} embeddingData.tenantId - Tenant identifier
 * @param {string} embeddingData.contentId - Content identifier
 * @param {string} embeddingData.contentType - Content type
 * @param {number[]} embeddingData.embedding - Embedding vector (1536 dimensions)
 * @param {string} embeddingData.contentText - Original content text
 * @param {number} embeddingData.chunkIndex - Chunk index (default: 0)
 * @param {Object} embeddingData.metadata - Additional metadata
 * @returns {Promise<Object>} Created embedding record
 */
export async function storeVectorEmbedding(embeddingData) {
  const {
    tenantId,
    contentId,
    contentType,
    embedding,
    contentText,
    chunkIndex = 0,
    metadata = {},
  } = embeddingData;

  try {
    const prisma = await getPrismaClient();

    // Use raw SQL to insert vector embedding
    // Prisma doesn't support vector type directly, so we use raw SQL
    const embeddingArray = `[${embedding.join(',')}]`;

    const query = `
      INSERT INTO vector_embeddings (
        id,
        tenant_id,
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
        $4::vector,
        $5,
        $6,
        $7::jsonb,
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    const result = await prisma.$queryRawUnsafe(
      query,
      tenantId,
      contentId,
      contentType,
      embeddingArray,
      contentText,
      chunkIndex,
      JSON.stringify(metadata)
    );

    logger.info('Vector embedding stored', {
      tenantId,
      contentId,
      contentType,
      chunkIndex,
    });

    return {
      id: result[0].id,
      tenantId: result[0].tenant_id,
      contentId: result[0].content_id,
      contentType: result[0].content_type,
      chunkIndex: result[0].chunk_index,
      metadata: result[0].metadata || {},
      createdAt: result[0].created_at,
    };
  } catch (error) {
    logger.error('Store vector embedding error', {
      error: error.message,
      tenantId,
      contentId,
      stack: error.stack,
    });
    throw new Error(`Store vector embedding failed: ${error.message}`);
  }
}

/**
 * Delete vector embeddings by content ID
 * @param {string} tenantId - Tenant identifier
 * @param {string} contentId - Content identifier
 * @returns {Promise<number>} Number of deleted embeddings
 */
export async function deleteVectorEmbeddings(tenantId, contentId) {
  try {
    const prisma = await getPrismaClient();

    const result = await prisma.$executeRawUnsafe(
      `
      DELETE FROM vector_embeddings
      WHERE tenant_id = $1 AND content_id = $2
    `,
      tenantId,
      contentId
    );

    logger.info('Vector embeddings deleted', {
      tenantId,
      contentId,
      deletedCount: result,
    });

    return result;
  } catch (error) {
    logger.error('Delete vector embeddings error', {
      error: error.message,
      tenantId,
      contentId,
      stack: error.stack,
    });
    throw new Error(`Delete vector embeddings failed: ${error.message}`);
  }
}
