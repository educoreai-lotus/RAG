/**
 * Cache utility tests
 */

import { jest } from '@jest/globals';
import { get, set, del, exists } from '../../../src/utils/cache.util.js';
import { redis } from '../../../src/config/redis.config.js';

describe('Cache Utility', () => {
  let getSpy, setexSpy, delSpy, existsSpy;

  beforeEach(() => {
    // Spy on redis methods
    getSpy = jest.spyOn(redis, 'get').mockResolvedValue(null);
    setexSpy = jest.spyOn(redis, 'setex').mockResolvedValue('OK');
    delSpy = jest.spyOn(redis, 'del').mockResolvedValue(1);
    existsSpy = jest.spyOn(redis, 'exists').mockResolvedValue(0);
  });

  afterEach(() => {
    // Restore all spies
    jest.restoreAllMocks();
  });

  describe('get', () => {
    it('should get value from cache', async () => {
      getSpy.mockResolvedValue(JSON.stringify({ data: 'test' }));

      const result = await get('test-key');
      expect(result).toEqual({ data: 'test' });
    });

    it('should return null if key does not exist', async () => {
      getSpy.mockResolvedValue(null);

      const result = await get('non-existent-key');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value in cache with TTL', async () => {
      setexSpy.mockResolvedValue('OK');

      const result = await set('test-key', { data: 'test' }, 3600);
      expect(result).toBe(true);
      expect(setexSpy).toHaveBeenCalledWith('test-key', 3600, expect.any(String));
    });
  });

  describe('del', () => {
    it('should delete value from cache', async () => {
      delSpy.mockResolvedValue(1);

      const result = await del('test-key');
      expect(result).toBe(true);
    });
  });

  describe('exists', () => {
    it('should check if key exists', async () => {
      existsSpy.mockResolvedValue(1);

      const result = await exists('test-key');
      expect(result).toBe(true);
    });
  });
});
