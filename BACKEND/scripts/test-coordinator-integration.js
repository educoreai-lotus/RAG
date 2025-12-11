#!/usr/bin/env node
/**
 * Coordinator Integration Test Script
 * 
 * Tests the Coordinator gRPC integration with various scenarios
 * 
 * Usage:
 *   node scripts/test-coordinator-integration.js
 *   node scripts/test-coordinator-integration.js --scenario=basic
 *   node scripts/test-coordinator-integration.js --scenario=all
 */

import { routeRequest, getMetrics, isCoordinatorAvailable, resetMetrics } from '../src/clients/coordinator.client.js';
import { 
  parseRouteResponse, 
  extractBusinessData,
  getRoutingSummary,
  isAllFailed,
  isFallbackUsed,
  getQualityAssessment
} from '../src/services/coordinatorResponseParser.service.js';
import { logger } from '../src/utils/logger.util.js';

const scenarios = {
  basic: testBasicRequest,
  parse: testResponseParsing,
  success: testSuccessScenarios,
  error: testErrorHandling,
  monitoring: testMonitoring,
  all: runAllTests
};

async function testBasicRequest() {
  console.log('\n📋 Test: Basic Route Request');
  console.log('─'.repeat(50));
  
  const response = await routeRequest({
    tenant_id: 'test-org-123',
    user_id: 'test-user-456',
    query_text: 'Show me my recent payments',
    metadata: {
      test: 'true',
      scenario: 'basic'
    }
  });

  if (response) {
    console.log('✅ Response received');
    console.log('   Target Services:', response.target_services?.join(', ') || 'none');
    console.log('   Has Normalized Fields:', !!response.normalized_fields);
    console.log('   Has Envelope JSON:', !!response.envelope_json);
    console.log('   Has Routing Metadata:', !!response.routing_metadata);
  } else {
    console.log('❌ No response from Coordinator');
    console.log('   Check if Coordinator is running and accessible');
  }
}

async function testResponseParsing() {
  console.log('\n📋 Test: Response Parsing');
  console.log('─'.repeat(50));
  
  const response = await routeRequest({
    tenant_id: 'test-org-123',
    user_id: 'test-user-456',
    query_text: 'Show me my recent payments',
    metadata: {
      test: 'true',
      scenario: 'parse'
    }
  });

  if (!response) {
    console.log('❌ No response to parse');
    return;
  }

  const parsed = parseRouteResponse(response);
  if (!parsed) {
    console.log('❌ Failed to parse response');
    return;
  }

  console.log('✅ Response parsed successfully');
  console.log('   Status:', parsed.status);
  console.log('   Success:', parsed.success);
  console.log('   Successful Service:', parsed.successful_service);
  console.log('   Rank Used:', parsed.rank_used);
  console.log('   Total Attempts:', parsed.total_attempts);
  console.log('   Quality Score:', parsed.quality_score);
  console.log('   Processing Time:', parsed.processing_time_ms + 'ms');

  // Extract business data
  const businessData = extractBusinessData(parsed);
  console.log('\n   Business Data:');
  console.log('     Has Data:', !!businessData.data);
  console.log('     Sources Count:', businessData.sources.length);
  console.log('     Has Metadata:', !!businessData.metadata);

  // Get routing summary
  const summary = getRoutingSummary(parsed);
  console.log('\n   Routing Summary:');
  console.log('     Message:', summary.message);
}

async function testSuccessScenarios() {
  console.log('\n📋 Test: Success Scenarios');
  console.log('─'.repeat(50));
  
  const response = await routeRequest({
    tenant_id: 'test-org-123',
    user_id: 'test-user-456',
    query_text: 'Show me my recent payments',
    metadata: {
      test: 'true',
      scenario: 'success'
    }
  });

  if (!response) {
    console.log('❌ No response');
    return;
  }

  const parsed = parseRouteResponse(response);
  if (!parsed) {
    console.log('❌ Failed to parse');
    return;
  }

  if (parsed.status === 'success_primary') {
    console.log('✅ Primary service succeeded');
    console.log('   Service:', parsed.successful_service);
    console.log('   Quality:', parsed.quality_score);
    console.log('   Confidence:', parsed.primary_confidence);
  } else if (parsed.status === 'success_fallback') {
    console.log('⚠️  Fallback service succeeded');
    console.log('   Service:', parsed.successful_service);
    console.log('   Rank Used:', parsed.rank_used);
    console.log('   Total Attempts:', parsed.total_attempts);
    console.log('   Quality:', parsed.quality_score);
  } else if (parsed.status === 'all_failed') {
    console.log('❌ All services failed');
    console.log('   Attempted Services:', parsed.target_services.join(', '));
    console.log('   Total Attempts:', parsed.total_attempts);
  } else {
    console.log('❓ Unknown status:', parsed.status);
  }

  // Test helper functions
  console.log('\n   Helper Functions:');
  console.log('     Is All Failed:', isAllFailed(parsed));
  console.log('     Is Fallback Used:', isFallbackUsed(parsed));
  
  const quality = getQualityAssessment(parsed);
  console.log('     Quality Level:', quality.level);
  console.log('     Quality Acceptable:', quality.acceptable);
}

async function testErrorHandling() {
  console.log('\n📋 Test: Error Handling');
  console.log('─'.repeat(50));
  
  // Test with invalid request (missing required fields)
  console.log('Testing with missing tenant_id...');
  const invalidResponse = await routeRequest({
    user_id: 'test-user-456',
    query_text: 'Test query'
    // Missing tenant_id
  });

  if (!invalidResponse) {
    console.log('✅ Correctly handled invalid request (returned null)');
  } else {
    console.log('⚠️  Invalid request returned response (unexpected)');
  }

  // Test with empty query
  console.log('\nTesting with empty query...');
  const emptyResponse = await routeRequest({
    tenant_id: 'test-org-123',
    user_id: 'test-user-456',
    query_text: ''
  });

  if (!emptyResponse) {
    console.log('✅ Correctly handled empty query (returned null)');
  } else {
    console.log('⚠️  Empty query returned response');
  }
}

async function testMonitoring() {
  console.log('\n📋 Test: Monitoring and Metrics');
  console.log('─'.repeat(50));
  
  // Reset metrics for clean test
  resetMetrics();
  
  // Check availability
  const available = await isCoordinatorAvailable();
  console.log('Coordinator Available:', available ? '✅' : '❌');

  // Make a few requests
  console.log('\nMaking test requests...');
  for (let i = 0; i < 3; i++) {
    await routeRequest({
      tenant_id: 'test-org-123',
      user_id: 'test-user-456',
      query_text: `Test query ${i + 1}`,
      metadata: {
        test: 'true',
        scenario: 'monitoring',
        iteration: String(i + 1)
      }
    });
  }

  // Get metrics
  const metrics = getMetrics();
  console.log('\n📊 Metrics:');
  console.log('   Total Requests:', metrics.totalRequests);
  console.log('   Successful Requests:', metrics.successfulRequests);
  console.log('   Failed Requests:', metrics.failedRequests);
  console.log('   Fallback Requests:', metrics.fallbackRequests);
  console.log('   Success Rate:', metrics.successRate.toFixed(2) + '%');
  console.log('   Fallback Rate:', metrics.fallbackRate.toFixed(2) + '%');
  console.log('   Average Processing Time:', metrics.averageProcessingTimeMs + 'ms');
  
  if (Object.keys(metrics.servicesUsed).length > 0) {
    console.log('\n   Services Used:');
    Object.entries(metrics.servicesUsed).forEach(([service, count]) => {
      console.log(`     ${service}: ${count}`);
    });
  }
  
  if (Object.keys(metrics.errorsByCode).length > 0) {
    console.log('\n   Errors by Code:');
    Object.entries(metrics.errorsByCode).forEach(([code, count]) => {
      console.log(`     ${code}: ${count}`);
    });
  }
}

async function runAllTests() {
  console.log('🧪 Running All Coordinator Integration Tests\n');
  console.log('='.repeat(50));
  
  await testBasicRequest();
  await testResponseParsing();
  await testSuccessScenarios();
  await testErrorHandling();
  await testMonitoring();
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ All tests completed');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const scenarioArg = args.find(arg => arg.startsWith('--scenario='));
  const scenario = scenarioArg ? scenarioArg.split('=')[1] : 'all';

  if (!scenarios[scenario]) {
    console.error(`Unknown scenario: ${scenario}`);
    console.error('Available scenarios:', Object.keys(scenarios).join(', '));
    process.exit(1);
  }

  try {
    await scenarios[scenario]();
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}












