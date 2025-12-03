/**
 * Logger utility tests
 */

import { logger } from '../../../src/utils/logger.util.js';

describe('Logger Utility', () => {
  it('should create logger instance', () => {
    expect(logger).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
  });

  it('should log info message', () => {
    const spy = jest.spyOn(logger, 'info');
    logger.info('Test message');
    expect(spy).toHaveBeenCalledWith('Test message');
    spy.mockRestore();
  });

  it('should log error message', () => {
    const spy = jest.spyOn(logger, 'error');
    logger.error('Error message');
    expect(spy).toHaveBeenCalledWith('Error message');
    spy.mockRestore();
  });
});











