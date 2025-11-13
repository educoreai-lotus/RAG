/**
 * Query Processing Service
 * Handles RAG query processing with OpenAI integration
 */

import { openai } from '../config/openai.config.js';
import { logger } from '../utils/logger.util.js';
import { getRedis, isRedisAvailable } from '../config/redis.config.js';

/**
 * Process a query using RAG (Retrieval-Augmented Generation)
 * @param {Object} params - Query parameters
 * @param {string} params.query - User's natural language question
 * @param {string} params.tenant_id - Tenant identifier
 * @param {Object} params.context - Query context (user_id, session_id)
 * @param {Object} params.options - Query options (max_results, min_confidence, include_metadata)
 * @returns {Promise<Object>} Query response with answer, sources, confidence, metadata
 */
export async function processQuery({ query, tenant_id, context = {}, options = {} }) {
  const startTime = Date.now();
  const { user_id, session_id } = context;
  const {
    max_results = 5,
    min_confidence = 0.7,
    include_metadata = true,
  } = options;

  try {
    // Check cache first (if Redis is available)
    if (isRedisAvailable()) {
      try {
        const redis = getRedis();
        const cacheKey = `query:${tenant_id}:${user_id}:${Buffer.from(query).toString('base64')}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
          logger.info('Query cache hit', { query, tenant_id, user_id });
          const cachedResponse = JSON.parse(cached);
          return {
            ...cachedResponse,
            metadata: {
              ...cachedResponse.metadata,
              cached: true,
            },
          };
        }
      } catch (cacheError) {
        // Redis error - continue without cache
        logger.debug('Redis cache check failed, continuing without cache:', cacheError.message);
      }
    }

    // Generate embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // TODO: Vector similarity search in PostgreSQL (pgvector)
    // For now, we'll use OpenAI directly without vector retrieval
    // This is a simplified implementation

    // Generate answer using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant for the EDUCORE learning platform. Provide clear, concise, and accurate answers based on the context provided.',
        },
        {
          role: 'user',
          content: query,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const answer = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
    const confidence = 0.85; // Default confidence (would be calculated from vector similarity in full implementation)

    // Mock sources (in full implementation, these would come from vector search)
    const sources = [];

    const response = {
      answer,
      confidence,
      sources,
      metadata: {
        processing_time_ms: Date.now() - startTime,
        sources_retrieved: sources.length,
        cached: false,
        model_version: 'gpt-3.5-turbo',
      },
    };

    // Cache the response (TTL: 1 hour) - if Redis is available
    if (isRedisAvailable()) {
      try {
        const redis = getRedis();
        const cacheKey = `query:${tenant_id}:${user_id}:${Buffer.from(query).toString('base64')}`;
        await redis.setex(cacheKey, 3600, JSON.stringify(response));
      } catch (cacheError) {
        // Redis error - continue without caching
        logger.debug('Redis cache save failed, continuing without cache:', cacheError.message);
      }
    }

    logger.info('Query processed successfully', {
      query,
      tenant_id,
      user_id,
      processing_time_ms: response.metadata.processing_time_ms,
    });

    return response;
  } catch (error) {
    logger.error('Query processing error', {
      error: error.message,
      query,
      tenant_id,
      user_id,
    });

    // Return error response
    throw new Error(`Query processing failed: ${error.message}`);
  }
}

