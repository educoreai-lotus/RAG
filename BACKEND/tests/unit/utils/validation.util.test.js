/**
 * Validation utility tests
 */

import { validate, schemas } from '../../../src/utils/validation.util.js';
import Joi from 'joi';

describe('Validation Utility', () => {
  describe('validate', () => {
    it('should validate valid data', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        age: Joi.number().required(),
      });

      const data = { name: 'John', age: 30 };
      const result = validate(data, schema);

      expect(result.valid).toBe(true);
      expect(result.value).toEqual(data);
    });

    it('should reject invalid data', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        age: Joi.number().required(),
      });

      const data = { name: 'John' }; // Missing age
      const result = validate(data, schema);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should strip unknown fields', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
      });

      const data = { name: 'John', extra: 'field' };
      const result = validate(data, schema);

      expect(result.valid).toBe(true);
      expect(result.value).toEqual({ name: 'John' });
      expect(result.value.extra).toBeUndefined();
    });
  });

  describe('schemas', () => {
    it('should have tenantId schema', () => {
      expect(schemas.tenantId).toBeDefined();
    });

    it('should have userId schema', () => {
      expect(schemas.userId).toBeDefined();
    });

    it('should have query schema', () => {
      expect(schemas.query).toBeDefined();
    });
  });
});






