/**
 * Cache utility tests
 */

// MOCKS MUST BE FIRST - before any imports (Jest hoists these)
// For ES modules, use require() to access jest in factory functions
jest.mock('../../../src/config/redis.config.js', () => {
  const { jest } = require('@jest/globals');
  return {
    redis: {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
    },
  };
});

import { jest } from '@jest/globals';
import { get, set, del, exists } from '../../../src/utils/cache.util.js';
import { redis } from '../../../src/config/redis.config.js';

describe('Cache Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mocks using jest.mocked() to ensure they're recognized as mocks
    jest.mocked(redis.get).mockReset();
    jest.mocked(redis.setex).mockReset();
    jest.mocked(redis.del).mockReset();
    jest.mocked(redis.exists).mockReset();
  });

  describe('get', () => {
    it('should get value from cache', async () => {
      jest.mocked(redis.get).mockResolvedValue(JSON.stringify({ data: 'test' }));

      const result = await get('test-key');
      expect(result).toEqual({ data: 'test' });
    });

    it('should return null if key does not exist', async () => {
      jest.mocked(redis.get).mockResolvedValue(null);

      const result = await get('non-existent-key');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value in cache with TTL', async () => {
      jest.mocked(redis.setex).mockResolvedValue('OK');

      const result = await set('test-key', { data: 'test' }, 3600);
      expect(result).toBe(true);
      expect(redis.setex).toHaveBeenCalledWith('test-key', 3600, expect.any(String));
    });
  });

  describe('del', () => {
    it('should delete value from cache', async () => {
      jest.mocked(redis.del).mockResolvedValue(1);

      const result = await del('test-key');
      expect(result).toBe(true);
    });
  });

  describe('exists', () => {
    it('should check if key exists', async () => {
      jest.mocked(redis.exists).mockResolvedValue(1);

      const result = await exists('test-key');
      expect(result).toBe(true);
    });
  });
});












