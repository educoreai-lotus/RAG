/**
 * Test Utilities
 */

import schemaLoader from '../../src/core/schemaLoader.js';

class TestUtils {
  /**
   * Load schema for service
   */
  loadSchema(serviceName) {
    return schemaLoader.getSchema(serviceName);
  }

  /**
   * Verify item matches schema
   */
  verifyItemMatchesSchema(item, schema) {
    const errors = [];

    for (const [fieldName, fieldType] of Object.entries(schema.data_structure)) {
      if (!(fieldName in item)) {
        errors.push(`Missing field: ${fieldName}`);
        continue;
      }

      const value = item[fieldName];
      const actualType = this.getActualType(value);

      if (!this.typesMatch(actualType, fieldType)) {
        errors.push(
          `Field ${fieldName}: expected ${fieldType}, got ${actualType}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get actual type of value
   */
  getActualType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'datetime';

    const type = typeof value;
    if (type === 'object') return 'object';
    if (type === 'number') {
      return Number.isInteger(value) ? 'integer' : 'number';
    }

    return type;
  }

  /**
   * Check if types match (allowing some flexibility)
   */
  typesMatch(actualType, expectedType) {
    // Exact match
    if (actualType === expectedType) return true;

    // Number/integer flexibility
    if (expectedType === 'number' && actualType === 'integer') return true;
    if (expectedType === 'integer' && actualType === 'number') return true;

    // String/text flexibility
    if (expectedType === 'text' && actualType === 'string') return true;
    if (expectedType === 'string' && actualType === 'text') return true;

    // Null is acceptable for most types
    if (actualType === 'null') return true;

    return false;
  }

  /**
   * Wait for async operations
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new TestUtils();

