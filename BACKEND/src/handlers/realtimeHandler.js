/**
 * REAL-TIME HANDLER
 * Handles real-time RAG requests from microservices
 */

import schemaLoader from '../core/schemaLoader.js';
import dataExtractor from '../core/dataExtractor.js';
import vectorizer from '../core/vectorizer.js';
import storage from '../core/storage.js';
import responseBuilder from '../core/responseBuilder.js';
import { logger } from '../utils/logger.util.js';
import { getPrismaClient } from '../config/database.config.js';
import crypto from 'crypto';

class RealtimeHandler {
  async handle(input) {
    const startTime = Date.now();

    try {
      const {
        source_service,
        user_query,
        user_id,
        tenant_id,
        response_envelope
      } = input;

      // 🎯 DEBUG: Log handler entry
      console.log('🎯 [RealtimeHandler] handle() called!', {
        source_service: source_service,
        user_query: user_query?.substring(0, 100),
        has_response_envelope: !!response_envelope,
        response_envelope_keys: response_envelope ? Object.keys(response_envelope) : [],
      });

      logger.info('[Real-time] Processing', {
        service: source_service,
        query: user_query,
        user_id
      });

      // 1. Load schema
      const schema = schemaLoader.getSchema(source_service);

      // 2. Extract data (vector_embeddings table already exists)
      const items = dataExtractor.extractItems(response_envelope, schema);

      // 📦 DEBUG: Log extracted items
      console.log('📦 [RealtimeHandler] Extracted items:', {
        count: items.length,
        sample: items[0] ? Object.keys(items[0]) : 'none',
        firstItemPreview: items[0] ? JSON.stringify(items[0]).substring(0, 200) : 'none',
      });

      if (items.length === 0) {
        return {
          success: false,
          message: `No data found from ${schema.description || schema.service_name}`,
          suggestions: ['Try a different query', 'Check if data exists']
        };
      }

      // 4. Generate LLM response
      const llmResponse = await responseBuilder.buildResponse(
        items,
        user_query,
        schema
      );

      // 5. Store LLM RESPONSE (not raw data!) in background
      this.storeLLMResponseInBackground(
        llmResponse,           // ← The LLM answer!
        user_query,            // ← The original query
        items,                 // ← Raw data for metadata
        tenant_id,
        schema
      ).catch(error => {
        logger.warn('[Real-time] Background store failed', {
          service: source_service,
          error: error.message
        });
      });

      logger.info('[Real-time] Completed', {
        service: source_service,
        duration_ms: Date.now() - startTime,
        items: items.length
      });

      return {
        success: true,
        answer: llmResponse,
        source: {
          service: source_service,
          description: schema.description || schema.service_name
        },
        metadata: {
          query: user_query,
          items_count: items.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('[Real-time] Failed', {
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
   * Store LLM response in vector_embeddings
   * This is what will be found by semantic search!
   */
  async storeLLMResponseInBackground(llmAnswer, userQuery, rawItems, tenantId, schema) {
    try {
      if (!llmAnswer || llmAnswer.trim().length === 0) {
        logger.warn('[RealtimeHandler] Empty LLM answer, skipping storage');
        return;
      }

      logger.info('[RealtimeHandler] 💾 Storing LLM response', {
        answerLength: llmAnswer.length,
        query: userQuery.substring(0, 50),
        service: schema.service_name
      });

      // Build content to vectorize:
      // Include both the question and answer for better semantic matching
      const contentToVectorize = `
Question: ${userQuery}

Answer: ${llmAnswer}

Source: ${schema.service_name}
      `.trim();

      // Generate embedding for the LLM response
      const embedding = await vectorizer.generateEmbedding(contentToVectorize);

      // Build metadata (summary of raw data, not full data)
      const metadata = {
        query: userQuery,
        source_service: schema.service_name,
        items_count: rawItems?.length || 0,
        generated_at: new Date().toISOString(),
        // Include only key identifiers from raw data, not everything
        data_summary: this.buildDataSummary(rawItems, schema)
      };

      // Store in vector_embeddings
      await this.storeInVectorEmbeddings(
        contentToVectorize,
        embedding,
        tenantId,
        schema.service_name,
        userQuery,  // Use query as content_id for deduplication
        metadata
      );

      logger.info('[RealtimeHandler] ✅ LLM response stored successfully', {
        contentLength: contentToVectorize.length,
        service: schema.service_name
      });

      // ════════════════════════════════════════════════════════════════════════════
      // NEW: Build Knowledge Graph (optional, non-blocking)
      // ════════════════════════════════════════════════════════════════════════════
      try {
        const kgBuilder = await import('../services/kgBuilder.service.js');
        const kgBuilderService = kgBuilder.default;
        
        // Generate uniqueContentId same way as in storeInVectorEmbeddings
        const queryHash = crypto.createHash('md5').update(userQuery).digest('hex').substring(0, 16);
        const uniqueContentId = `${schema.service_name}-${queryHash}`;
        
        // Run in background, don't await
        kgBuilderService.buildFromContent(
          uniqueContentId,
          contentToVectorize,
          metadata,
          tenantId
        ).catch(kgError => {
          // Just log, don't fail
          logger.debug('[RealtimeHandler] KG build failed (non-critical)', {
            error: kgError.message
          });
        });
        
      } catch (kgImportError) {
        // KG service not available, skip silently
        logger.debug('[RealtimeHandler] KG service not available');
      }

    } catch (error) {
      logger.warn('[RealtimeHandler] Failed to store LLM response', {
        error: error.message
      });
    }
  }

  /**
   * Build a summary of raw data (not full data)
   */
  buildDataSummary(items, schema) {
    if (!items || items.length === 0) return {};

    // Get primary key field
    const pkField = Object.keys(schema.data_structure || {})[0];
    
    return {
      count: items.length,
      primary_keys: items.slice(0, 5).map(item => item[pkField]).filter(Boolean),
      service: schema.service_name
    };
  }

  /**
   * Store directly in vector_embeddings table
   */
  async storeInVectorEmbeddings(content, embedding, tenantId, serviceName, contentId, metadata) {
    const prisma = await getPrismaClient();
    const embeddingStr = `[${embedding.join(',')}]`;
    
    // Generate unique content_id based on query hash
    const queryHash = crypto.createHash('md5').update(contentId).digest('hex').substring(0, 16);
    const uniqueContentId = `${serviceName}-${queryHash}`;

    // Check if exists
    const existing = await prisma.vectorEmbedding.findFirst({
      where: {
        tenantId: tenantId,
        contentId: uniqueContentId
      }
    });

    if (existing) {
      // Update existing
      await prisma.$executeRawUnsafe(`
        UPDATE vector_embeddings
        SET 
          content_text = $1,
          embedding = $2::vector,
          metadata = $3::jsonb,
          updated_at = NOW()
        WHERE id = $4
      `, content, embeddingStr, JSON.stringify(metadata), existing.id);

      logger.info('[Storage] Updated existing vector embedding', {
        id: existing.id,
        contentId: uniqueContentId
      });
    } else {
      // Insert new
      await prisma.$executeRawUnsafe(`
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
          gen_random_uuid(),
          $1,
          $2,
          $3,
          $4::vector,
          $5,
          0,
          $6::jsonb,
          NOW(),
          NOW()
        )
      `,
        tenantId,
        uniqueContentId,
        'llm_response',  // ← New content type!
        embeddingStr,
        content,
        JSON.stringify(metadata)
      );

      logger.info('[Storage] Inserted new vector embedding', {
        contentId: uniqueContentId,
        contentType: 'llm_response'
      });
    }
  }
}

export default new RealtimeHandler();

