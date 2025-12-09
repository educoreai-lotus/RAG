/**
 * Cache utility tests
 */

import { jest } from '@jest/globals';

// Mock redis.config.js BEFORE imports (ES modules require this)
const mockRedis = {
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  status: 'ready',
};

const mockIsRedisAvailable = jest.fn(() => true);

jest.mock('../../../src/config/redis.config.js', () => ({
  redis: mockRedis,
  isRedisAvailable: mockIsRedisAvailable,
  getRedis: jest.fn(() => mockRedis),
}));

import { get, set, del, exists } from '../../../src/utils/cache.util.js';

describe('Cache Utility', () => {
  let getSpy, setexSpy, delSpy, existsSpy;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup mock return values
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(1);
    mockRedis.exists.mockResolvedValue(0);
    mockRedis.status = 'ready';
    
    // Mock isRedisAvailable to return true
    mockIsRedisAvailable.mockReturnValue(true);
    
    // Store references for assertions
    getSpy = mockRedis.get;
    setexSpy = mockRedis.setex;
    delSpy = mockRedis.del;
    existsSpy = mockRedis.exists;
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
