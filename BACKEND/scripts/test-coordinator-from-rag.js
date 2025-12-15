/**
 * Test Coordinator Connection from RAG
 * 
 * This script simulates a query request to test if Coordinator connection works
 * It will trigger the gRPC client creation and show connection status
 * 
 * Usage:
 *   node scripts/test-coordinator-from-rag.js
 */

import { routeRequest, isCoordinatorAvailable } from '../src/clients/coordinator.client.js';
import { logger } from '../src/utils/logger.util.js';

console.log('\n🧪 Testing Coordinator Connection from RAG\n');

async function testConnection() {
  try {
    // Step 1: Check availability (this will create gRPC client)
    console.log('1️⃣  Checking Coordinator availability...');
    console.log('   (This will create gRPC client if not already created)\n');
    
    const available = await isCoordinatorAvailable();
    
    if (available) {
      console.log('✅ Coordinator is available!\n');
    } else {
      console.log('❌ Coordinator not available\n');
      console.log('💡 Possible issues:');
      console.log('   - Coordinator gRPC server not running');
      console.log('   - Wrong COORDINATOR_GRPC_ENDPOINT');
      console.log('   - Network connectivity issue');
      return;
    }

    // Step 2: Send a test request
    console.log('2️⃣  Sending test request to Coordinator...');
    console.log('   Tenant ID: test-tenant-123');
    console.log('   User ID: test-user-456');
    console.log('   Query: "test query for routing"\n');

    const startTime = Date.now();
    
    try {
      const response = await routeRequest({
        tenant_id: 'test-tenant-123',
        user_id: 'test-user-456',
        query_text: 'test query for routing',
        metadata: {
          source: 'connection-test',
          timestamp: new Date().toISOString()
        }
      });

      const duration = Date.now() - startTime;

      if (response) {
        console.log(`✅ Request sent and received response! (${duration}ms)\n`);
        console.log('📦 Response:');
        console.log(`   Target Services: ${response.target_services?.join(', ') || 'None'}`);
        
        if (response.normalized_fields) {
          const nf = response.normalized_fields;
          console.log(`   Successful Service: ${nf.successful_service || 'None'}`);
        }
        
        console.log('\n✅ SUCCESS: Coordinator connection works!');
        console.log('   - gRPC client created');
        console.log('   - Connection established');
        console.log('   - Request sent successfully');
        console.log('   - Response received');
      } else {
        console.log(`⚠️  Request sent but no response (${duration}ms)`);
        console.log('   This could mean:');
        console.log('   - Coordinator received but microservices are not responding (expected)');
        console.log('   - Check Coordinator logs to verify request was received');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ Error sending request (${duration}ms)`);
      console.log(`   Error: ${error.message}`);
      
      if (error.code === 14) { // UNAVAILABLE
        console.log('\n💡 Coordinator gRPC server may not be running');
        console.log('   - Check Coordinator logs');
        console.log('   - Verify GRPC_ENABLED=true in Coordinator');
      } else if (error.code === 4) { // DEADLINE_EXCEEDED
        console.log('\n💡 Request timeout');
        console.log('   - Coordinator may be processing (check logs)');
      }
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error(error);
  }
}

// Show configuration
console.log('📋 Configuration:');
console.log(`   COORDINATOR_GRPC_ENDPOINT: ${process.env.COORDINATOR_GRPC_ENDPOINT || 'Not set'}`);
console.log(`   GRPC_USE_SSL: ${process.env.GRPC_USE_SSL || 'Not set'}`);
console.log(`   RAG_PRIVATE_KEY: ${process.env.RAG_PRIVATE_KEY ? 'Set' : 'Not set'}\n`);

testConnection().then(() => {
  console.log('\n✅ Test completed\n');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});

