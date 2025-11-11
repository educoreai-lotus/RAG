import { jest } from '@jest/globals';

import { getPrismaClient } from '../../helpers/prisma-loader.cjs';
import { VectorRetrievalService } from '../../../src/services/vector-retrieval.service.js';

let prisma;
let redis;

describe('Integration: VectorRetrievalService', () => {
  let tenantId;
  let service;

  beforeAll(async () => {
    const redisModule = await import('ioredis');

    const PrismaClient = await getPrismaClient();
    const RedisClient = redisModule.default ?? redisModule;

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL,
        },
      },
    });

    redis = new RedisClient(process.env.TEST_REDIS_URL, {
      enableOfflineQueue: false,
    });

    await prisma.queryRecommendation.deleteMany();
    await prisma.querySource.deleteMany();
    await prisma.query.deleteMany();
    await prisma.knowledgeGraphEdge.deleteMany();
    await prisma.knowledgeGraphNode.deleteMany();
    await prisma.vectorEmbedding.deleteMany();
    await prisma.tenant.deleteMany();

    const tenant = await prisma.tenant.create({
      data: {
        name: 'Integration Tenant',
        domain: 'integration.local',
      },
    });
    tenantId = tenant.id;

    await prisma.vectorEmbedding.createMany({
      data: [
        {
          id: 'vec-a',
          tenantId,
          contentId: 'doc-a',
          contentType: 'course',
          embedding: new Array(1536).fill(0.1),
          contentText: 'Learn microservices with Node.js',
          chunkIndex: 0,
        },
        {
          id: 'vec-b',
          tenantId,
          contentId: 'doc-b',
          contentType: 'course',
          embedding: new Array(1536).fill(0.05),
          contentText: 'Distributed systems fundamentals',
          chunkIndex: 0,
        },
      ],
    });

    service = new VectorRetrievalService({
      prismaClient: prisma,
      redisClient: redis,
      accessControlService: null,
    });
  });

  afterAll(async () => {
    if (redis) {
      await redis.quit();
    }
  });

  beforeEach(async () => {
    if (redis) {
      await redis.flushall();
    }
  });

  it('retrieves vectors and caches results', async () => {
    const embedding = new Array(1536).fill(0.1);

    const firstCall = await service.getSimilarContent({
      tenantId,
      embedding,
      topK: 2,
      useCache: true,
    });

    expect(firstCall).toHaveLength(2);

    const getSpy = jest.spyOn(redis, 'get');
    const setexSpy = jest.spyOn(redis, 'setex');

    const secondCall = await service.getSimilarContent({
      tenantId,
      embedding,
      topK: 2,
      useCache: true,
    });

    expect(secondCall).toEqual(firstCall);
    expect(getSpy).toHaveBeenCalled();
    expect(setexSpy).toHaveBeenCalled();
  });
});
