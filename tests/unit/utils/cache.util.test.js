/**
 * Cache utility tests
 */

import { jest } from '@jest/globals';

const mockRedisClient = {
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  on: jest.fn(),
};

await jest.unstable_mockModule('../../../src/config/redis.config.js', () => ({
  redis: mockRedisClient,
}));

const { get, set, del, exists } = await import('../../../src/utils/cache.util.js');
const { redis } = await import('../../../src/config/redis.config.js');

describe('Cache Utility', () => {
  beforeEach(() => {
    Object.values(mockRedisClient).forEach((fn) => fn.mockReset?.());
  });

  describe('get', () => {
    it('should get value from cache', async () => {
      redis.get.mockResolvedValue(JSON.stringify({ data: 'test' }));

      const result = await get('test-key');
      expect(result).toEqual({ data: 'test' });
    });

    it('should return null if key does not exist', async () => {
      redis.get.mockResolvedValue(null);

      const result = await get('non-existent-key');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value in cache with TTL', async () => {
      redis.setex.mockResolvedValue('OK');

      const result = await set('test-key', { data: 'test' }, 3600);
      expect(result).toBe(true);
      expect(redis.setex).toHaveBeenCalledWith('test-key', 3600, expect.any(String));
    });
  });

  describe('del', () => {
    it('should delete value from cache', async () => {
      redis.del.mockResolvedValue(1);

      const result = await del('test-key');
      expect(result).toBe(true);
    });
  });

  describe('exists', () => {
    it('should check if key exists', async () => {
      redis.exists.mockResolvedValue(1);

      const result = await exists('test-key');
      expect(result).toBe(true);
    });
  });
});
