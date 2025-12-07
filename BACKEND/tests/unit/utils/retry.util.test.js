/**
 * Retry utility tests
 */

import { retry, sleep } from '../../../src/utils/retry.util.js';

describe('Retry Utility', () => {
  describe('retry', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await retry(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');
      const result = await retry(fn, { maxRetries: 3, initialDelay: 10 });
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      await expect(retry(fn, { maxRetries: 2, initialDelay: 10 })).rejects.toThrow('fail');
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should respect shouldRetry function', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      const shouldRetry = jest.fn().mockReturnValue(false);
      await expect(retry(fn, { shouldRetry, initialDelay: 10 })).rejects.toThrow('fail');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalled();
    });
  });

  describe('sleep', () => {
    it('should sleep for specified milliseconds', async () => {
      const start = Date.now();
      await sleep(100);
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(90); // Allow some tolerance
    });
  });
});












