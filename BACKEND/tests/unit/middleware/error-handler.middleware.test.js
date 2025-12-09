/**
 * Error handler middleware tests
 */

import { describe, it, expect, vi } from 'vitest';
import { errorHandler, notFoundHandler } from '../../../src/middleware/error-handler.middleware.js';

describe('Error Handler Middleware', () => {
  describe('errorHandler', () => {
    it('should handle error and return JSON response', () => {
      const err = new Error('Test error');
      err.statusCode = 400;

      const req = {
        url: '/test',
        method: 'GET',
      };

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      errorHandler(err, req, res, () => {});

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          message: 'Test error',
          statusCode: 400,
        }),
      });
    });

    it('should use default status code 500', () => {
      const err = new Error('Test error');

      const req = { url: '/test', method: 'GET' };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      errorHandler(err, req, res, () => {});

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 response', () => {
      const req = { 
        path: '/not-found',
        url: '/not-found',
        query: {},
        get: vi.fn().mockReturnValue('test-agent'),
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      notFoundHandler(req, res, () => {});

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: 'Not Found',
          statusCode: 404,
          path: '/not-found',
          hint: expect.any(String),
        },
      });
    });
  });
});












