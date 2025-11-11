import { jest } from '@jest/globals';

import { AIIntegrationService } from '../../../src/services/ai-integration.service.js';

describe('AIIntegrationService', () => {
  let openAIClientMock;
  let rateLimiterMock;
  let retryFn;
  let loggerMock;
  let service;

  beforeEach(() => {
    openAIClientMock = {
      embeddings: {
        create: jest.fn().mockResolvedValue({
          data: [
            {
              embedding: [0.1, 0.2, 0.3],
            },
          ],
        }),
      },
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: 'Answer content',
                },
              },
            ],
          }),
        },
      },
    };

    rateLimiterMock = {
      schedule: jest.fn().mockImplementation((fn) => fn()),
    };

    retryFn = jest.fn(async (fn) => fn());

    loggerMock = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    service = new AIIntegrationService({
      openAIClient: openAIClientMock,
      rateLimiter: rateLimiterMock,
      retryFn,
      logger: loggerMock,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateEmbedding', () => {
    it('calls OpenAI embeddings API with expected payload', async () => {
      const embedding = await service.generateEmbedding('test input');

      expect(openAIClientMock.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-large',
        input: 'test input',
      });
      expect(embedding).toEqual([0.1, 0.2, 0.3]);
    });
  });

  describe('generateRAGResponse', () => {
    it('assembles prompt with context and calls OpenAI chat completion', async () => {
      const response = await service.generateRAGResponse({
        query: 'Explain microservices',
        context: [{ title: 'Doc', content: 'Microservices doc' }],
        citations: ['doc-1'],
      });

      expect(rateLimiterMock.schedule).toHaveBeenCalled();
      expect(openAIClientMock.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4.1-mini',
          messages: expect.any(Array),
          temperature: 0.2,
          max_tokens: 800,
        })
      );
      expect(response).toEqual({
        answer: 'Answer content',
        metadata: expect.objectContaining({ citations: ['doc-1'] }),
      });
    });

    it('retries on failure when retryFn provided', async () => {
      const error = new Error('temporary');
      openAIClientMock.chat.completions.create
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: 'Recovered answer',
              },
            },
          ],
        });

      retryFn.mockImplementation(async (fn) => {
        try {
          return await fn();
        } catch (err) {
          return fn();
        }
      });

      const response = await service.generateRAGResponse({ query: 'q', context: [] });

      expect(retryFn).toHaveBeenCalled();
      expect(response.answer).toBe('Recovered answer');
    });
  });

  describe('handleRateLimit', () => {
    it('throws when rate limiter rejects', async () => {
      rateLimiterMock.schedule.mockRejectedValueOnce(new Error('rate limit'));

      await expect(service.generateRAGResponse({ query: 'q', context: [] })).rejects.toThrow(
        'rate limit'
      );
    });
  });

  describe('error handling', () => {
    it('logs and rethrows OpenAI embedding errors', async () => {
      openAIClientMock.embeddings.create.mockRejectedValueOnce(new Error('embedding failed'));

      await expect(service.generateEmbedding('q')).rejects.toThrow('embedding failed');
      expect(loggerMock.error).toHaveBeenCalledWith('AI embedding generation failed', {
        error: 'embedding failed',
      });
    });

    it('logs and rethrows chat completion errors', async () => {
      openAIClientMock.chat.completions.create.mockRejectedValueOnce(new Error('chat failed'));

      await expect(service.generateRAGResponse({ query: 'q', context: [] })).rejects.toThrow(
        'chat failed'
      );
      expect(loggerMock.error).toHaveBeenCalledWith('AI response generation failed', {
        error: 'chat failed',
      });
    });
  });
});
