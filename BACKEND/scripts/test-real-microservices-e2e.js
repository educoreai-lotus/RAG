#!/usr/bin/env node
/**
 * Real E2E Test - Tests with actual microservices running
 * 
 * This script sends REAL requests to Coordinator, which forwards to microservices
 * You will see logs in:
 * - RAG Service logs (here)
 * - Coordinator logs (in Coordinator service)
 * - Microservice logs (in each microservice that receives the request)
 * 
 * Prerequisites:
 * 1. All microservices must be running
 * 2. Coordinator must be running
 * 3. Environment variables must be set (DATABASE_URL, OPENAI_API_KEY, etc.)
 * 
 * Usage:
 *   node scripts/test-real-microservices-e2e.js
 *   node scripts/test-real-microservices-e2e.js --service=managementreporting-service
 */

import { routeRequest } from '../src/clients/coordinator.client.js';
import { logger } from '../src/utils/logger.util.js';

// Try to import RAG handler, but don't fail if OpenAI key is missing
let handleRAGRequest = null;
try {
  const ragModule = await import('../src/core/ragHandler.js');
  handleRAGRequest = ragModule.handleRAGRequest;
} catch (error) {
  console.warn('⚠️  Could not load RAG handler (OpenAI key may be missing)');
  console.warn('   Will only test Coordinator → Microservice communication');
}

// Test configuration
const TEST_TENANT_ID = process.env.TEST_TENANT_ID || 'test-tenant-123';
const TEST_USER_ID = process.env.TEST_USER_ID || 'test-user-456';

async function testRealMicroservice(serviceName) {
  console.log(`\n🔍 Testing REAL microservice: ${serviceName}`);
  console.log('─'.repeat(60));
  console.log('📤 Sending request to Coordinator...');
  console.log('   (You should see logs in Coordinator and microservice)');
  console.log('─'.repeat(60));

  try {
    // Step 1: Send request to Coordinator
    const coordinatorResponse = await routeRequest({
      tenant_id: TEST_TENANT_ID,
      user_id: TEST_USER_ID,
      query_text: `Show me recent items from ${serviceName}`,
      metadata: {
        test: 'e2e',
        source: 'rag-service'
      }
    });

    if (!coordinatorResponse) {
      console.log('❌ No response from Coordinator');
      console.log('   Make sure Coordinator is running!');
      return;
    }

    console.log('\n✅ Response received from Coordinator');
    console.log(`   Target Services: ${coordinatorResponse.target_services?.join(', ') || 'none'}`);

    // Step 2: Check if we got successfulResult
    if (coordinatorResponse.successfulResult?.data) {
      console.log('✅ Data received from microservice');
      console.log(`   Items count: ${Array.isArray(coordinatorResponse.successfulResult.data) 
        ? coordinatorResponse.successfulResult.data.length 
        : 'N/A'}`);

      // Step 3: Process with RAG handler (if available)
      if (handleRAGRequest) {
        console.log('\n📊 Processing with RAG handler...');
        const ragInput = {
          mode: 'realtime',
          source_service: serviceName,
          user_query: `Show me recent items from ${serviceName}`,
          user_id: TEST_USER_ID,
          tenant_id: TEST_TENANT_ID,
          response_envelope: coordinatorResponse
        };

        const ragResult = await handleRAGRequest(ragInput);

        if (ragResult.success) {
          console.log('✅ RAG processing successful');
          console.log(`   Answer length: ${ragResult.answer?.length || 0} chars`);
          console.log(`   Items returned: ${ragResult.metadata?.items_returned || 0}`);
        } else {
          console.log('❌ RAG processing failed:', ragResult.error);
        }
      } else {
        console.log('\n⚠️  Skipping RAG processing (OpenAI key not available)');
        console.log('   But Coordinator → Microservice communication worked! ✅');
      }
    } else {
      console.log('⚠️  No data in response');
      console.log('   This could mean:');
      console.log('   - Microservice returned empty result');
      console.log('   - Error occurred in microservice');
      console.log('   - Check microservice logs!');
    }

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.error('   Stack:', error.stack);
  }
}

async function testAllMicroservices() {
  const services = [
    'managementreporting-service',
    // Add more services as they become available
  ];

  console.log('🚀 Starting E2E tests with REAL microservices');
  console.log('════════════════════════════════════════════════════════════');
  console.log('⚠️  Make sure all services are running:');
  console.log('   - Coordinator service');
  console.log('   - All microservices (managementreporting-service, etc.)');
  console.log('   - RAG service (this one)');
  console.log('════════════════════════════════════════════════════════════\n');

  for (const service of services) {
    await testRealMicroservice(service);
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✅ E2E tests complete!');
  console.log('\n📋 Check logs in:');
  console.log('   - Coordinator service (should show routing decisions)');
  console.log('   - Each microservice (should show processing logs)');
  console.log('   - RAG service (this terminal)');
}

// Main execution
const serviceArg = process.argv.find(arg => arg.startsWith('--service='));
const serviceName = serviceArg ? serviceArg.split('=')[1] : null;

if (serviceName) {
  testRealMicroservice(serviceName).catch(console.error);
} else {
  testAllMicroservices().catch(console.error);
}

