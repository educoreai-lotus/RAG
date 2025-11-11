import { logger as defaultLogger } from '../utils/logger.util.js';
import { retry as defaultRetry } from '../utils/retry.util.js';

let defaultOpenAIClientPromise = null;
let defaultRateLimiterPromise = null;

async function resolveDefaultOpenAI() {
  if (!defaultOpenAIClientPromise) {
    const module = await import('../config/openai.config.js');
    defaultOpenAIClientPromise = Promise.resolve(module.openai);
  }

  return defaultOpenAIClientPromise;
}

async function resolveDefaultRateLimiter() {
  if (!defaultRateLimiterPromise) {
    try {
      const module = await import('../utils/rate-limiter.util.js');
      defaultRateLimiterPromise = Promise.resolve(module.rateLimiter);
    } catch (error) {
      defaultRateLimiterPromise = Promise.resolve({
        schedule: (fn) => fn(),
      });
    }
  }

  return defaultRateLimiterPromise;
}

class AIIntegrationService {
  constructor({
    openAIClient = undefined,
    rateLimiter = undefined,
    retryFn = defaultRetry,
    logger = defaultLogger,
    embeddingModel = 'text-embedding-3-large',
    chatModel = 'gpt-4.1-mini',
  } = {}) {
    const hasCustomOpenAI = openAIClient !== undefined;
    const hasCustomLimiter = rateLimiter !== undefined;

    this.openAIProvider = hasCustomOpenAI
      ? () => Promise.resolve(openAIClient)
      : () => resolveDefaultOpenAI();
    this.rateLimiterProvider = hasCustomLimiter
      ? () => Promise.resolve(rateLimiter)
      : () => resolveDefaultRateLimiter();

    this.retryFn = retryFn;
    this.logger = logger;
    this.embeddingModel = embeddingModel;
    this.chatModel = chatModel;
  }

  async generateEmbedding(text) {
    try {
      const openAI = await this.openAIProvider();
      const response = await openAI.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });

      return response?.data?.[0]?.embedding ?? [];
    } catch (error) {
      this.logger.error('AI embedding generation failed', {
        error: error.message,
      });
      throw error;
    }
  }

  buildPrompt({ query, context = [] }) {
    const contextBlock = context
      .map((item, index) => `${index + 1}. ${item.title ?? 'Source'}: ${item.content ?? ''}`)
      .join('\n');

    return `You are Educore Assistant. Use the provided context to answer the query.\n\nQuery: ${query}\n\nContext:\n${contextBlock}`;
  }

  async generateChatCompletion({ prompt, temperature = 0.2, maxTokens = 800 }) {
    const openAI = await this.openAIProvider();
    const rateLimiter = await this.rateLimiterProvider();

    return this.retryFn(() =>
      rateLimiter.schedule(() =>
        openAI.chat.completions.create({
          model: this.chatModel,
          messages: [
            { role: 'system', content: 'You are Educore Assistant and must cite sources when possible.' },
            { role: 'user', content: prompt },
          ],
          temperature,
          max_tokens: maxTokens,
        })
      )
    );
  }

  async generateRAGResponse({
    query,
    context = [],
    citations = [],
    temperature = 0.2,
    maxTokens = 800,
  }) {
    const prompt = this.buildPrompt({ query, context });

    try {
      const completion = await this.generateChatCompletion({ prompt, temperature, maxTokens });
      const answer = completion?.choices?.[0]?.message?.content ?? '';

      return {
        answer,
        metadata: {
          citations,
        },
      };
    } catch (error) {
      this.logger.error('AI response generation failed', {
        error: error.message,
      });
      throw error;
    }
  }
}

const aiIntegrationService = new AIIntegrationService();

export { AIIntegrationService, aiIntegrationService };
