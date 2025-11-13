/**
 * Redis configuration
 * 
 * Redis is OPTIONAL - used for caching query responses
 * If Redis is not available, the service will work without caching
 */

import Redis from 'ioredis';
import { logger } from '../utils/logger.util.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisEnabled = process.env.REDIS_ENABLED !== 'false'; // Default: true, set REDIS_ENABLED=false to disable

let redis = null;
let redisAvailable = false;

if (redisEnabled) {
  try {
    redis = new Redis(redisUrl, {
      retryStrategy: (times) => {
        // Stop retrying after 3 attempts to avoid spam
        if (times > 3) {
          logger.warn('Redis: Giving up connection after 3 retries. Service will continue without Redis cache.');
          return null; // Stop retrying
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 1, // Only retry once per request
      lazyConnect: true, // Don't connect immediately
      enableOfflineQueue: false, // Don't queue commands if offline
    });

    redis.on('error', (err) => {
      // Only log first error, then silence
      if (!redisAvailable) {
        logger.warn('Redis connection error (Redis is optional - service will work without it):', err.code || err.message);
        redisAvailable = false;
      }
    });

    redis.on('connect', () => {
      redisAvailable = true;
      logger.info('Redis connected - caching enabled');
    });

    redis.on('ready', () => {
      redisAvailable = true;
      logger.info('Redis ready - caching enabled');
    });

    // Try to connect (non-blocking)
    redis.connect().catch(() => {
      // Silently fail - Redis is optional
      redisAvailable = false;
    });
  } catch (error) {
    logger.warn('Redis initialization failed (Redis is optional):', error.message);
    redis = null;
    redisAvailable = false;
  }
} else {
  logger.info('Redis disabled (REDIS_ENABLED=false)');
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable() {
  return redisAvailable && redis && (redis.status === 'ready' || redis.status === 'connect');
}

/**
 * Get Redis client (may be null if not available)
 */
export function getRedis() {
  return isRedisAvailable() ? redis : null;
}

// Export redis for backward compatibility, but warn if not available
export { redis };




