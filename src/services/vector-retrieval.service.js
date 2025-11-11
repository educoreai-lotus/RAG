import { createHash } from 'crypto';
import { logger as defaultLogger } from '../utils/logger.util.js';

let defaultPrismaPromise = null;
let defaultRedisPromise = null;
let defaultAccessControlPromise = null;

async function resolveDefaultPrisma() {
  if (!defaultPrismaPromise) {
    const module = await import('../config/database.config.js');
    defaultPrismaPromise = module.prisma;
  }

  return defaultPrismaPromise;
}

async function resolveDefaultRedis() {
  if (!defaultRedisPromise) {
    const module = await import('../config/redis.config.js');
    defaultRedisPromise = Promise.resolve(module.redis);
  }

  return defaultRedisPromise;
}

async function resolveDefaultAccessControl() {
  if (!defaultAccessControlPromise) {
    const module = await import('./access-control.service.js');
    defaultAccessControlPromise = Promise.resolve(module.accessControlService);
  }

  return defaultAccessControlPromise;
}

class VectorRetrievalService {
  constructor({
    prismaClient = null,
    redisClient = null,
    accessControlService = null,
    logger = defaultLogger,
    cacheTTLSeconds = 300,
  } = {}) {
    this.prismaProvider = prismaClient
      ? () => Promise.resolve(prismaClient)
      : () => resolveDefaultPrisma();
    this.redisProvider = redisClient
      ? () => Promise.resolve(redisClient)
      : () => resolveDefaultRedis();
    this.accessControlProvider = accessControlService
      ? () => Promise.resolve(accessControlService)
      : () => resolveDefaultAccessControl();
    this.logger = logger;
    this.cacheTTLSeconds = cacheTTLSeconds;
  }

  createCacheKey({ tenantId, embedding, topK, filters = {} }) {
    const hash = createHash('sha256')
      .update(JSON.stringify({ embedding, topK, filters }))
      .digest('hex');
    return `vector:${tenantId}:${hash}`;
  }

  async checkCache(cacheKey) {
    try {
      const redis = await this.redisProvider();
      if (!redis || typeof redis.get !== 'function') {
        return null;
      }

      const cached = await redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.warn('Vector cache read failed', {
        cacheKey,
        error: error.message,
      });
      return null;
    }
  }

  async cacheResults(cacheKey, data) {
    try {
      const redis = await this.redisProvider();
      if (!redis || typeof redis.setex !== 'function') {
        return false;
      }

      await redis.setex(cacheKey, this.cacheTTLSeconds, JSON.stringify(data));
      return true;
    } catch (error) {
      this.logger.warn('Vector cache write failed', {
        cacheKey,
        error: error.message,
      });
      return false;
    }
  }

  async vectorSimilaritySearch({ tenantId, embedding, topK = 5, filters = {} }) {
    if (!tenantId) {
      throw new Error('tenantId is required');
    }
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('embedding vector is required');
    }

    const prisma = await this.prismaProvider();

    try {
      const where = { tenantId };
      if (filters.contentType) {
        where.contentType = filters.contentType;
      }
      if (filters.contentId) {
        where.contentId = filters.contentId;
      }

      const rows = await prisma.vectorEmbedding.findMany({
        where,
        take: topK,
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

      return rows.map((row, index) => ({
        ...row,
        score: row.similarityScore ?? row.score ?? null,
        rank: index + 1,
      }));
    } catch (error) {
      this.logger.error('Vector similarity search failed', {
        tenantId,
        error: error.message,
      });
      throw new Error('VECTOR_SEARCH_FAILED');
    }
  }

  async filterByPermissions({
    tenantId,
    items,
    userRoles = [],
    attributes = {},
    permission = 'read',
  }) {
    if (!items || items.length === 0) {
      return [];
    }

    try {
      const accessControl = await this.accessControlProvider();
      if (!accessControl || typeof accessControl.evaluatePolicies !== 'function') {
        return items;
      }

      const allowed = [];
      for (const item of items) {
        try {
          const evaluation = await accessControl.evaluatePolicies({
            tenantId,
            userRoles,
            attributes,
            resourceType: item.contentType,
            resourceId: item.contentId,
            permission,
          });

          if (!evaluation || evaluation.allowed) {
            allowed.push(item);
          }
        } catch (error) {
          this.logger.warn('Vector permission check failed', {
            tenantId,
            resourceId: item.contentId,
            error: error.message,
          });
        }
      }

      return allowed;
    } catch (error) {
      this.logger.warn('Vector permission evaluation unavailable', {
        tenantId,
        error: error.message,
      });
      return items;
    }
  }

  async getSimilarContent({
    tenantId,
    embedding,
    topK = 5,
    filters = {},
    userRoles = [],
    attributes = {},
    permission = 'read',
    useCache = true,
  }) {
    const cacheKey = this.createCacheKey({ tenantId, embedding, topK, filters });

    if (useCache) {
      const cached = await this.checkCache(cacheKey);
      if (Array.isArray(cached)) {
        return cached;
      }
    }

    const results = await this.vectorSimilaritySearch({ tenantId, embedding, topK, filters });
    const filtered = await this.filterByPermissions({
      tenantId,
      items: results,
      userRoles,
      attributes,
      permission,
    });

    if (useCache && filtered.length) {
      await this.cacheResults(cacheKey, filtered);
    }

    return filtered;
  }
}

const vectorRetrievalService = new VectorRetrievalService();

export { VectorRetrievalService, vectorRetrievalService };
