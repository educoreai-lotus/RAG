import { jest } from '@jest/globals';

const redis = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
};

export { redis };
export function isRedisAvailable() {
  return true;
}
export function getRedis() {
  return redis;
}

