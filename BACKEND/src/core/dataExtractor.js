/**
 * DATA EXTRACTOR
 * Extracts data from microservice responses based on schema
 */

import { logger } from '../utils/logger.util.js';

class DataExtractor {
  /**
   * Extract items from response
   */
  extractItems(responseEnvelope, schema) {
    const { success, data } = responseEnvelope;

    if (!success || !data) {
      return [];
    }

    // Handle both formats
    let items = Array.isArray(data) ? data : data.items || [];

    return items.map(item => this.extractItem(item, schema));
  }

  /**
   * Extract single item
   */
  extractItem(sourceItem, schema) {
    const extracted = {};

    for (const [fieldName, fieldType] of Object.entries(schema.data_structure)) {
      extracted[fieldName] = this.extractField(sourceItem, fieldName, fieldType);
    }

    return extracted;
  }

  /**
   * Extract field value
   */
  extractField(obj, fieldName, fieldType) {
    const value = obj[fieldName];

    if (value === undefined || value === null) {
      return null;
    }

    // Convert to appropriate type
    switch (fieldType) {
      case 'datetime':
        return new Date(value);
      case 'object':
      case 'array':
        return typeof value === 'object' ? value : JSON.parse(value);
      default:
        return value;
    }
  }

  /**
   * Build content text for vectorization
   */
  buildContent(item, schema) {
    const parts = [];

    // Add main fields
    for (const [fieldName, fieldType] of Object.entries(schema.data_structure)) {
      const value = item[fieldName];
      if (!value) continue;

      const formatted = this.formatForContent(fieldName, value, fieldType, schema);
      if (formatted) {
        parts.push(formatted);
      }
    }

    return parts.join('\n\n');
  }

  /**
   * Format field for content text
   */
  formatForContent(fieldName, value, fieldType, schema) {
    // Get description if available
    const description = schema.field_descriptions?.[fieldName];
    const label = description ? description.split(' ')[0] : fieldName;

    switch (fieldType) {
      case 'object':
        return this.formatObject(label, value);
      case 'array':
        return this.formatArray(label, value);
      case 'datetime':
        return `${label}: ${new Date(value).toLocaleDateString()}`;
      default:
        return `${label}: ${value}`;
    }
  }

  /**
   * Format object for content
   */
  formatObject(label, obj) {
    if (!obj || typeof obj !== 'object') {
      return `${label}: ${obj}`;
    }

    const parts = [`${label}:`];

    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        parts.push(`${key}:`);
        value.forEach((item, i) => parts.push(`${i + 1}. ${item}`));
      } else if (typeof value === 'object' && value !== null) {
        parts.push(`${key}: ${JSON.stringify(value)}`);
      } else {
        parts.push(`${key}: ${value}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Format array for content
   */
  formatArray(label, arr) {
    if (!Array.isArray(arr)) {
      return `${label}: ${arr}`;
    }
    return `${label}:\n${arr.map((item, i) => `${i + 1}. ${item}`).join('\n')}`;
  }
}

export default new DataExtractor();

