/**
 * Mock Coordinator
 * Simulates how Coordinator wraps microservice responses
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MockCoordinator {
  /**
   * Load mock response for a service
   */
  loadMockResponse(serviceName) {
    const filePath = path.join(
      __dirname,
      '../fixtures/mock-responses',
      `${serviceName}.json`
    );

    if (!fs.existsSync(filePath)) {
      throw new Error(`No mock response found for service: ${serviceName}`);
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return data.coordinator_wrapped;
  }

  /**
   * Simulate Coordinator sending request to RAG
   */
  simulateRAGRequest(serviceName, userQuery = 'Show recent items') {
    const response = this.loadMockResponse(serviceName);

    // Update request with provided query
    response.request.user_query = userQuery;
    response.request.request_id = `test-${Date.now()}`;

    return {
      mode: 'realtime',
      source_service: serviceName,
      user_query: userQuery,
      user_id: 'test-user-123',
      tenant_id: 'test-tenant-456',
      response_envelope: response
    };
  }

  /**
   * List all available mock services
   */
  listAvailableServices() {
    const dir = path.join(__dirname, '../fixtures/mock-responses');

    if (!fs.existsSync(dir)) {
      return [];
    }

    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  }
}

export default new MockCoordinator();

