/**
 * REAL-TIME HANDLER
 * Handles real-time RAG requests from microservices
 */

import schemaLoader from '../core/schemaLoader.js';
import tableManager from '../core/tableManager.js';
import dataExtractor from '../core/dataExtractor.js';
import vectorizer from '../core/vectorizer.js';
import storage from '../core/storage.js';
import responseBuilder from '../core/responseBuilder.js';
import { logger } from '../utils/logger.util.js';

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

      // 2. Ensure table exists
      await tableManager.ensureTable(schema);

      // 3. Extract data
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

      // 4. Generate response
      const answer = await responseBuilder.buildResponse(
        items,
        user_query,
        schema
      );

      // 5. Store items (background - don't block response)
      this.storeInBackground(items, tenant_id, schema).catch(error => {
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
        answer: answer,
        source: {
          service: source_service,
          description: schema.description || schema.service_name
        },
        metadata: {
          query: user_query,
          items_returned: items.length,
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
   * Store items in background (don't block response)
   */
  async storeInBackground(items, tenantId, schema) {
    for (const item of items) {
      try {
        const content = dataExtractor.buildContent(item, schema);
        const embedding = await vectorizer.generateEmbedding(content);
        await storage.store(item, content, embedding, tenantId, schema);
      } catch (error) {
        logger.warn('[Real-time] Store failed for item', {
          service: schema.service_name,
          error: error.message
        });
      }
    }
  }
}

export default new RealtimeHandler();

