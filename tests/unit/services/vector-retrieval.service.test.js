import { jest } from '@jest/globals';
import { VectorRetrievalService } from '../../../src/services/vector-retrieval.service.js';

describe('VectorRetrievalService', () => {
  const tenantId = 'tenant-123';
  const embedding = [0.1, 0.2, 0.3];

  let prismaMock;
  let redisMock;
  let accessControlMock;
  let loggerMock;
  let service;

  beforeEach(() => {
    prismaMock = {
      vectorEmbedding: {
        findMany: jest.fn(),
      },
    };

    redisMock = {
      get: jest.fn(),
      setex: jest.fn(),
    };

    accessControlMock = {
      evaluatePolicies: jest.fn(),
    };

    loggerMock = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    service = new VectorRetrievalService({
      prismaClient: prismaMock,
      redisClient: redisMock,
      accessControlService: accessControlMock,
      logger: loggerMock,
      cacheTTLSeconds: 60,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('vectorSimilaritySearch', () => {
    it('queries prisma with expected filters and maps results', async () => {
      prismaMock.vectorEmbedding.findMany.mockResolvedValue([
        {
          id: 'vec-1',
          tenantId,
          contentId: 'content-1',
          contentType: 'course',
          contentText: 'chunk text',
          chunkIndex: 0,
          metadata: { score: 0.9 },
          similarityScore: 0.95,
        },
      ]);

      const results = await service.vectorSimilaritySearch({
        tenantId,
        embedding,
        topK: 3,
        filters: { contentType: 'course' },
      });

      expect(prismaMock.vectorEmbedding.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          contentType: 'course',
        },
        take: 3,
        orderBy: {
          updatedAt: 'desc',
        },
        select: {
          id: true,
          tenantId: true,
          contentId: true,
          contentType: true,
          contentText: true,
          chunkIndex: true,
          metadata: true,
        },
      });

      expect(results).toEqual([
        expect.objectContaining({
          id: 'vec-1',
          score: 0.95,
          rank: 1,
        }),
      ]);
    });

    it('logs and throws when prisma query fails', async () => {
      prismaMock.vectorEmbedding.findMany.mockRejectedValue(new Error('db down'));

      await expect(
        service.vectorSimilaritySearch({ tenantId, embedding })
      ).rejects.toThrow('VECTOR_SEARCH_FAILED');

      expect(loggerMock.error).toHaveBeenCalledWith('Vector similarity search failed', {
        tenantId,
        error: 'db down',
      });
    });
  });

  describe('getSimilarContent', () => {
    it('returns cached results when available', async () => {
      redisMock.get.mockResolvedValue(JSON.stringify([{ id: 'cached' }]));

      const results = await service.getSimilarContent({ tenantId, embedding, topK: 2 });

      expect(results).toEqual([{ id: 'cached' }]);
      expect(prismaMock.vectorEmbedding.findMany).not.toHaveBeenCalled();
      expect(redisMock.setex).not.toHaveBeenCalled();
    });

    it('queries database, filters permissions, and caches results', async () => {
      redisMock.get.mockResolvedValue(null);
      prismaMock.vectorEmbedding.findMany.mockResolvedValue([
        {
          id: 'vec-1',
          tenantId,
          contentId: 'content-1',
          contentType: 'course',
          contentText: 'chunk text',
          chunkIndex: 0,
          metadata: {},
          similarityScore: 0.9,
        },
        {
          id: 'vec-2',
          tenantId,
          contentId: 'content-2',
          contentType: 'course',
          contentText: 'chunk text 2',
          chunkIndex: 1,
          metadata: {},
          similarityScore: 0.8,
        },
      ]);

      accessControlMock.evaluatePolicies
        .mockResolvedValueOnce({ allowed: true })
        .mockResolvedValueOnce({ allowed: false });

      const results = await service.getSimilarContent({
        tenantId,
        embedding,
        topK: 2,
        userRoles: ['trainer'],
      });

      expect(prismaMock.vectorEmbedding.findMany).toHaveBeenCalled();
      expect(accessControlMock.evaluatePolicies).toHaveBeenCalledTimes(2);
      expect(redisMock.setex).toHaveBeenCalledWith(
        expect.stringContaining(`vector:${tenantId}`),
        60,
        JSON.stringify([
          expect.objectContaining({ id: 'vec-1' }),
        ])
      );
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('vec-1');
    });

    it('continues when caching fails', async () => {
      redisMock.get.mockResolvedValue(null);
      prismaMock.vectorEmbedding.findMany.mockResolvedValue([
        {
          id: 'vec-1',
          tenantId,
          contentId: 'content-1',
          contentType: 'course',
          contentText: 'chunk text',
          chunkIndex: 0,
          metadata: {},
          similarityScore: 0.9,
        },
      ]);
      accessControlMock.evaluatePolicies.mockResolvedValue({ allowed: true });
      redisMock.setex.mockRejectedValue(new Error('redis down'));

      const results = await service.getSimilarContent({ tenantId, embedding });

      expect(results).toHaveLength(1);
      expect(loggerMock.warn).toHaveBeenCalledWith('Vector cache write failed', expect.any(Object));
    });
  });

  describe('filterByPermissions', () => {
    it('returns items when access control service is unavailable', async () => {
      const localService = new VectorRetrievalService({
        prismaClient: prismaMock,
        redisClient: redisMock,
        accessControlService: null,
        logger: loggerMock,
      });

      const items = [{ id: 'vec-1', contentType: 'course', contentId: 'c1' }];
      const filtered = await localService.filterByPermissions({ tenantId, items });

      expect(filtered).toEqual(items);
    });
  });
});
