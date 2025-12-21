/**
 * DATA EXTRACTOR
 * Extracts data from microservice responses based on schema
 * ⭐ UPDATED: Now supports unlimited nesting depth for objects and arrays
 */

import { logger } from '../utils/logger.util.js';

class DataExtractor {
  /**
   * Extract items from response
   * Handles both direct responses and Coordinator-wrapped responses
   */
  extractItems(responseEnvelope, schema) {
    // Log the structure we received for debugging
    logger.debug('[DataExtractor] Received response structure', {
      service: schema.service_name,
      has_success: 'success' in responseEnvelope,
      has_data: 'data' in responseEnvelope,
      has_successfulResult: 'successfulResult' in responseEnvelope,
      top_level_keys: Object.keys(responseEnvelope)
    });

    // ═══════════════════════════════════════════════════════════
    // STEP 1: Extract data from Coordinator's wrapped format
    // ═══════════════════════════════════════════════════════════

    let actualData = null;
    let success = false;

    // Format 1: Coordinator wrapped format
    // { successfulResult: { data: [...] }, ... }
    if (responseEnvelope.successfulResult) {
      logger.debug('[DataExtractor] Detected Coordinator wrapped format');
      actualData = responseEnvelope.successfulResult.data;
      success = true; // If we got successfulResult, it succeeded
    }

    // Format 2: Direct format from microservice
    // { success: true, data: [...] }
    else if (responseEnvelope.success !== undefined) {
      logger.debug('[DataExtractor] Detected direct microservice format');
      success = responseEnvelope.success;
      actualData = responseEnvelope.data;
    }

    // Format 3: Just data field
    // { data: [...] }
    else if (responseEnvelope.data !== undefined) {
      logger.debug('[DataExtractor] Detected data-only format');
      success = true;
      actualData = responseEnvelope.data;
    }

    // Unknown format
    else {
      logger.error('[DataExtractor] Unknown response format', {
        service: schema.service_name,
        keys: Object.keys(responseEnvelope)
      });
      return [];
    }

    // Check if operation was successful
    if (!success || !actualData) {
      logger.warn('[DataExtractor] No data or unsuccessful response', {
        service: schema.service_name,
        success,
        has_data: !!actualData
      });
      return [];
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Extract items array from data
    // ═══════════════════════════════════════════════════════════

    let items = [];

    // Case 1: data is already an array
    // data: [item1, item2, ...]
    if (Array.isArray(actualData)) {
      logger.debug('[DataExtractor] Data is array', {
        service: schema.service_name,
        count: actualData.length
      });
      items = actualData;
    }

    // Case 2: data has items property (batch format)
    // data: { items: [...], page: 1, total: 100 }
    else if (actualData.items && Array.isArray(actualData.items)) {
      logger.debug('[DataExtractor] Data has items array', {
        service: schema.service_name,
        count: actualData.items.length,
        page: actualData.page,
        total: actualData.total
      });
      items = actualData.items;
    }

    // Case 3: data is single object (real-time single item)
    // data: { id: 123, name: "..." }
    else if (typeof actualData === 'object' && actualData !== null) {
      logger.debug('[DataExtractor] Data is single object', {
        service: schema.service_name
      });
      items = [actualData];
    }

    // Unknown data format
    else {
      logger.warn('[DataExtractor] Unknown data format', {
        service: schema.service_name,
        data_type: typeof actualData,
        is_array: Array.isArray(actualData)
      });
      return [];
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Extract each item according to schema
    // ═══════════════════════════════════════════════════════════

    const extractedItems = items.map(item => this.extractItem(item, schema));

    logger.info('[DataExtractor] Extraction complete', {
      service: schema.service_name,
      input_count: items.length,
      output_count: extractedItems.length
    });

    return extractedItems;
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
        return this.formatObject(label, value, 0); // Start at depth 0
      case 'array':
        return this.formatArray(label, value, 0);   // Start at depth 0
      case 'datetime':
        return `${label}: ${new Date(value).toLocaleDateString()}`;
      default:
        return `${label}: ${value}`;
    }
  }

  /**
   * Format object for content (RECURSIVE - supports unlimited nesting depth)
   * @param {string} label - Field label
   * @param {object} obj - Object to format
   * @param {number} depth - Current nesting depth (for indentation)
   */
  formatObject(label, obj, depth = 0) {
    const indent = '  '.repeat(depth);
    const parts = [`${indent}${label}:`];

    if (obj === null || obj === undefined) {
      return `${indent}${label}: (empty)`;
    }

    if (typeof obj !== 'object') {
      return `${indent}${label}: ${obj}`;
    }

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        parts.push(`${indent}  ${key}: (empty)`);
      } else if (Array.isArray(value)) {
        // Handle arrays - check if items are objects
        parts.push(`${indent}  ${key}:`);
        value.forEach((item, i) => {
          if (typeof item === 'object' && item !== null) {
            // ⭐ RECURSIVE: Array of objects
            parts.push(this.formatObject(`${i + 1}`, item, depth + 2));
          } else {
            parts.push(`${indent}    ${i + 1}. ${item}`);
          }
        });
      } else if (typeof value === 'object') {
        // ⭐ RECURSIVE: Nested object - go deeper!
        parts.push(this.formatObject(key, value, depth + 1));
      } else {
        parts.push(`${indent}  ${key}: ${value}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Format array for content (RECURSIVE - supports nested objects in arrays)
   * @param {string} label - Field label
   * @param {array} arr - Array to format
   * @param {number} depth - Current nesting depth (for indentation)
   */
  formatArray(label, arr, depth = 0) {
    const indent = '  '.repeat(depth);
    const parts = [`${indent}${label}:`];

    if (!Array.isArray(arr)) {
      return `${indent}${label}: ${arr}`;
    }

    arr.forEach((item, i) => {
      if (typeof item === 'object' && item !== null) {
        // ⭐ RECURSIVE: Object inside array
        parts.push(this.formatObject(`${i + 1}`, item, depth + 1));
      } else {
        parts.push(`${indent}  ${i + 1}. ${item}`);
      }
    });

    return parts.join('\n');
  }
}

export default new DataExtractor();

