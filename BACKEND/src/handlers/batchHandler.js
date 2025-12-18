/**
 * BATCH HANDLER
 * Handles batch synchronization requests from microservices
 */

import schemaLoader from '../core/schemaLoader.js';
import tableManager from '../core/tableManager.js';
import dataExtractor from '../core/dataExtractor.js';
import vectorizer from '../core/vectorizer.js';
import storage from '../core/storage.js';
import { logger } from '../utils/logger.util.js';

class BatchHandler {
  async handle(input) {
    const startTime = Date.now();

    try {
      const {
        source_service,
        tenant_id,
        response_envelope
      } = input;

      const { data, metadata } = response_envelope;
      const items = data?.items || [];
      const page = metadata?.page || data?.page || 1;
      const total = metadata?.total || data?.total || items.length;

      logger.info('[Batch] Processing', {
        service: source_service,
        page,
        items: items.length,
        total
      });

      // 1. Load schema
      const schema = schemaLoader.getSchema(source_service);

      // 2. Ensure table exists
      await tableManager.ensureTable(schema);

      // 3. Extract items
      const extractedItems = dataExtractor.extractItems(response_envelope, schema);

      // 4. Process in parallel batches
      const results = await this.processParallel(
        extractedItems,
        tenant_id,
        schema
      );

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      logger.info('[Batch] Completed', {
        service: source_service,
        page,
        processed: items.length,
        successful,
        failed,
        duration_ms: Date.now() - startTime
      });

      return {
        success: true,
        processed: items.length,
        successful,
        failed,
        page,
        has_more: metadata?.has_more || false,
        total
      };
    } catch (error) {
      logger.error('[Batch] Failed', {
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
   * Process items in parallel batches
   */
  async processParallel(items, tenantId, schema) {
    const BATCH_SIZE = 50;
    const WORKERS = 5;

    const results = [];

    // Split into chunks
    const chunks = [];
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      chunks.push(items.slice(i, i + BATCH_SIZE));
    }

    // Process chunks in parallel
    for (let i = 0; i < chunks.length; i += WORKERS) {
      const batch = chunks.slice(i, i + WORKERS);
      const promises = batch.map(chunk =>
        this.processChunk(chunk, tenantId, schema)
      );
      const batchResults = await Promise.all(promises);
      results.push(...batchResults.flat());
    }

    return results;
  }

  /**
   * Process a chunk of items
   */
  async processChunk(items, tenantId, schema) {
    // Build content for all
    const contents = items.map(item =>
      dataExtractor.buildContent(item, schema)
    );

    // Generate embeddings in batch
    let embeddings;
    try {
      embeddings = await vectorizer.generateBatch(contents);
    } catch (error) {
      logger.error('[Batch] Embedding generation failed', {
        error: error.message,
        items_count: items.length
      });
      // Return failed results for all items
      return items.map(() => ({ success: false, error: error.message }));
    }

    // Store each
    const results = [];
    for (let i = 0; i < items.length; i++) {
      try {
        await storage.store(
          items[i],
          contents[i],
          embeddings[i],
          tenantId,
          schema
        );
        results.push({ success: true });
      } catch (error) {
        logger.warn('[Batch] Store failed for item', {
          error: error.message,
          index: i
        });
        results.push({ success: false, error: error.message });
      }
    }

    return results;
  }
}

export default new BatchHandler();

