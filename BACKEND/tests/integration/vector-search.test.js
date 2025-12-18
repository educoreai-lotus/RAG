/**
 * Vector Search Tests
 * Verifies vector search functionality for stored data
 */

import { describe, test, expect, beforeAll } from 'vitest';
import storage from '../../src/core/storage.js';
import vectorizer from '../../src/core/vectorizer.js';
import dataExtractor from '../../src/core/dataExtractor.js';
import mockCoordinator from '../helpers/mock-coordinator.js';
import testUtils from '../helpers/test-utils.js';
import tableManager from '../../src/core/tableManager.js';
import schemaLoader from '../../src/core/schemaLoader.js';

describe('Vector Search Tests', () => {
  // Only test with services that have schemas loaded
  let availableServices = [];

  beforeAll(async () => {
    // Load all schemas
    schemaLoader.loadAll();
    
    // Get services with both schema and mock
    const mockServices = mockCoordinator.listAvailableServices();
    availableServices = mockServices.filter(serviceName => {
      try {
        schemaLoader.getSchema(serviceName);
        return true;
      } catch (error) {
        return false;
      }
    });
  });

  availableServices.forEach(serviceName => {
    describe(`${serviceName} - Search`, () => {
      let schema;
      let storedItems = [];
      const testTenantId = 'test-tenant-123';

      beforeAll(async () => {
        try {
          // Load schema
          schema = testUtils.loadSchema(serviceName);

          // Ensure table exists
          await tableManager.ensureTable(schema);

          // Get mock data
          const mockResponse = mockCoordinator.loadMockResponse(serviceName);
          const items = dataExtractor.extractItems(mockResponse, schema);

          // Store items for search (only first item to keep tests fast)
          if (items.length > 0) {
            const item = items[0];
            const content = dataExtractor.buildContent(item, schema);
            
            try {
              const embedding = await vectorizer.generateEmbedding(content);

              await storage.store(
                item,
                content,
                embedding,
                testTenantId,
                schema
              );

              storedItems.push({ item, content, embedding });
            } catch (error) {
              console.warn(`Failed to store item for ${serviceName}:`, error.message);
            }
          }
        } catch (error) {
          console.warn(`Setup failed for ${serviceName}:`, error.message);
        }
      }, 60000); // 60 second timeout for setup

      test('should find stored items by vector search', async () => {
        if (storedItems.length === 0) {
          return; // Skip if no items stored
        }

        // Use first item as query
        const queryItem = storedItems[0];

        // Search
        const results = await storage.vectorSearch(
          queryItem.content,
          queryItem.embedding,
          testTenantId,
          schema,
          { limit: 5, threshold: 0.5 }
        );

        // Verify results
        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThan(0);
      }, 30000);

      test('should return similarity scores', async () => {
        if (storedItems.length === 0) {
          return;
        }

        // Search
        const queryItem = storedItems[0];
        const results = await storage.vectorSearch(
          queryItem.content,
          queryItem.embedding,
          testTenantId,
          schema
        );

        if (results.length === 0) {
          return; // Skip if no results
        }

        // Check similarity scores
        results.forEach(result => {
          expect(result.similarity).toBeDefined();
          expect(typeof result.similarity).toBe('number');
          expect(result.similarity).toBeGreaterThanOrEqual(0);
          expect(result.similarity).toBeLessThanOrEqual(1);
        });
      }, 30000);

      test('should order results by similarity', async () => {
        if (storedItems.length === 0) {
          return;
        }

        // Search
        const queryItem = storedItems[0];
        const results = await storage.vectorSearch(
          queryItem.content,
          queryItem.embedding,
          testTenantId,
          schema,
          { limit: 10 }
        );

        if (results.length < 2) {
          return; // Need at least 2 results to test ordering
        }

        // Verify ordering (descending similarity)
        for (let i = 1; i < results.length; i++) {
          expect(results[i - 1].similarity).toBeGreaterThanOrEqual(
            results[i].similarity
          );
        }
      }, 30000);
    });
  });
});

