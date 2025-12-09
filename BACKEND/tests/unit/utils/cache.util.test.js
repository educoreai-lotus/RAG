/**
 * Cache utility tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// CRITICAL: Factory function returns named exports
vi.mock('../../../src/config/redis.config.js', () => {
  const mockRedis = {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    status: 'ready',
  };
  
  return {
    redis: mockRedis,
    isRedisAvailable: vi.fn(() => true),
    getRedis: vi.fn(() => mockRedis),
  };
});

// Import AFTER mocks
import { redis, isRedisAvailable } from '../../../src/config/redis.config.js';
import { get, set, del, exists } from '../../../src/utils/cache.util.js';

describe('Cache Utility', () => {
  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Setup default mock return values
    redis.get.mockResolvedValue(null);
    redis.setex.mockResolvedValue('OK');
    redis.del.mockResolvedValue(1);
    redis.exists.mockResolvedValue(0);
    redis.status = 'ready';
    
    // Mock isRedisAvailable to return true
    isRedisAvailable.mockReturnValue(true);
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
