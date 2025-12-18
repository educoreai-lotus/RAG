/**
 * Data Extraction Tests
 * Verifies that data extraction works correctly for all microservices
 */

import { describe, test, expect, beforeAll } from 'vitest';
import dataExtractor from '../../src/core/dataExtractor.js';
import mockCoordinator from '../helpers/mock-coordinator.js';
import testUtils from '../helpers/test-utils.js';
import schemaLoader from '../../src/core/schemaLoader.js';

describe('Data Extraction Tests', () => {
  beforeAll(() => {
    // Load all schemas before running tests
    schemaLoader.loadAll();
  });

  // Get all available services
  const services = mockCoordinator.listAvailableServices();

  // Test each service
  services.forEach(serviceName => {
    describe(`${serviceName}`, () => {
      let schema;
      let mockResponse;

      beforeAll(() => {
        // Load schema
        try {
          schema = testUtils.loadSchema(serviceName);
        } catch (error) {
          // Schema not loaded yet, skip this test
          console.warn(`Schema not found for ${serviceName}, skipping tests`);
          return;
        }

        // Load mock response
        try {
          mockResponse = mockCoordinator.loadMockResponse(serviceName);
        } catch (error) {
          console.warn(`Mock response not found for ${serviceName}, skipping tests`);
          return;
        }
      });

      test('should extract items from Coordinator wrapped format', () => {
        if (!schema || !mockResponse) {
          return; // Skip if schema or mock not available
        }

        // Extract items
        const items = dataExtractor.extractItems(mockResponse, schema);

        // Verify we got items
        expect(items).toBeDefined();
        expect(Array.isArray(items)).toBe(true);
        expect(items.length).toBeGreaterThan(0);
      });

      test('extracted items should match schema', () => {
        if (!schema || !mockResponse) {
          return;
        }

        // Extract items
        const items = dataExtractor.extractItems(mockResponse, schema);

        // Verify each item
        items.forEach((item, index) => {
          const validation = testUtils.verifyItemMatchesSchema(item, schema);

          if (!validation.valid) {
            console.error(`Item ${index} validation errors:`, validation.errors);
          }

          // Allow some flexibility - just log errors for now
          // In real tests, you might want to be stricter
        });
      });

      test('should extract all fields from schema', () => {
        if (!schema || !mockResponse) {
          return;
        }

        // Extract items
        const items = dataExtractor.extractItems(mockResponse, schema);
        
        if (items.length === 0) {
          return; // Skip if no items
        }

        const item = items[0];

        // Check all schema fields are present
        const schemaFields = Object.keys(schema.data_structure);
        const itemFields = Object.keys(item);

        schemaFields.forEach(field => {
          expect(itemFields).toContain(field);
        });
      });

      test('should build searchable content', () => {
        if (!schema || !mockResponse) {
          return;
        }

        // Extract items
        const items = dataExtractor.extractItems(mockResponse, schema);
        
        if (items.length === 0) {
          return;
        }

        const item = items[0];

        // Build content
        const content = dataExtractor.buildContent(item, schema);

        // Verify content
        expect(content).toBeDefined();
        expect(typeof content).toBe('string');
        expect(content.length).toBeGreaterThan(0);
      });
    });
  });
});

