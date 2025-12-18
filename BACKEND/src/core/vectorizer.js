/**
 * VECTORIZER
 * Generates embeddings for content using OpenAI
 */

import { openai } from '../config/openai.config.js';
import { logger } from '../utils/logger.util.js';

class Vectorizer {
  /**
   * Generate embedding for text
   */
  async generateEmbedding(text) {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Cannot generate embedding for empty text');
      }

      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text.trim(),
        dimensions: 1536
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('Embedding generation failed', {
        error: error.message,
        text_length: text?.length || 0
      });
      throw error;
    }
  }

  /**
   * Generate embeddings in batch
   */
  async generateBatch(texts) {
    const BATCH_SIZE = 100;
    const embeddings = [];

    // Filter out empty texts
    const validTexts = texts
      .map((text, index) => ({ text: text?.trim() || '', index }))
      .filter(({ text }) => text.length > 0);

    if (validTexts.length === 0) {
      throw new Error('No valid texts provided for embedding generation');
    }

    for (let i = 0; i < validTexts.length; i += BATCH_SIZE) {
      const batch = validTexts.slice(i, i + BATCH_SIZE).map(item => item.text);

      try {
        const response = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: batch,
          dimensions: 1536
        });

        // Map embeddings back to original positions
        const batchEmbeddings = response.data.map(d => d.embedding);
        embeddings.push(...batchEmbeddings);
      } catch (error) {
        logger.error('Batch embedding failed', {
          batch_start: i,
          batch_size: batch.length,
          error: error.message
        });
        throw error;
      }
    }

    return embeddings;
  }
}

export default new Vectorizer();

