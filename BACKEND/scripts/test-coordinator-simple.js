#!/usr/bin/env node
/**
 * Simple Coordinator Test - Just test if Coordinator responds
 * This is a minimal test that only checks Coordinator communication
 */

import { routeRequest } from '../src/clients/coordinator.client.js';

async function testCoordinator() {
  console.log('\n🔍 Testing Coordinator Connection');
  console.log('═'.repeat(60));
  
  const testQuery = process.argv[2] || 'Show me recent management reports';
  
  console.log(`📤 Sending query: "${testQuery}"`);
  console.log(`📍 Coordinator URL: ${process.env.COORDINATOR_URL || 'localhost:50051'}`);
  console.log('─'.repeat(60));
  
  try {
    const response = await routeRequest({
      tenant_id: process.env.TEST_TENANT_ID || 'test-tenant-123',
      user_id: process.env.TEST_USER_ID || 'test-user-456',
      query_text: testQuery,
      metadata: {
        test: 'true',
        source: 'rag-service-e2e-test'
      }
    });

    if (!response) {
      console.log('\n❌ No response from Coordinator');
      console.log('\n💡 Possible issues:');
      console.log('   1. Coordinator service is not running');
      console.log('   2. COORDINATOR_URL is not set correctly');
      console.log('   3. Network connectivity issue');
      console.log('   4. gRPC port 50051 is not accessible');
      return;
    }

    console.log('\n✅ Response received from Coordinator!');
    console.log('─'.repeat(60));
    
    // Show basic response info
    if (response.target_services) {
      console.log(`📋 Target Services: ${response.target_services.join(', ')}`);
    }
    
    if (response.successfulResult) {
      console.log('✅ Successful Result found!');
      if (response.successfulResult.data) {
        const data = response.successfulResult.data;
        if (Array.isArray(data)) {
          console.log(`   Items returned: ${data.length}`);
          if (data.length > 0) {
            console.log('   First item keys:', Object.keys(data[0]).join(', '));
          }
        } else {
          console.log('   Data type:', typeof data);
        }
      }
    }
    
    if (response.cascadeAttempts) {
      console.log(`📊 Cascade Attempts: ${response.cascadeAttempts.length}`);
      response.cascadeAttempts.forEach((attempt, idx) => {
        console.log(`   ${idx + 1}. ${attempt.service}: ${attempt.success ? '✅' : '❌'}`);
      });
    }
    
    console.log('\n✅ Test completed successfully!');
    console.log('\n📋 What you should see:');
    console.log('   - In Coordinator logs: Routing decision, service selection');
    console.log('   - In Microservice logs: Request received, data processing');
    console.log('   - Here: Response received with data');
    
  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    if (error.code) {
      console.error(`   gRPC Error Code: ${error.code}`);
    }
    if (error.details) {
      console.error(`   Details: ${error.details}`);
    }
    
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check Coordinator is running: docker ps | grep coordinator');
    console.log('   2. Check COORDINATOR_URL env var');
    console.log('   3. Check network connectivity');
    console.log('   4. Check gRPC port is accessible');
  }
}

testCoordinator().catch(console.error);
