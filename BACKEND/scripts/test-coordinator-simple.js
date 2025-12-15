/**
 * Simple Coordinator communication test
 * 
 * Usage:
 *   node scripts/test-coordinator-simple.js
 */

import { routeRequest, isCoordinatorAvailable } from '../src/clients/coordinator.client.js';
import { logger } from '../src/utils/logger.util.js';

console.log('\n🧪 Testing communication with Coordinator\n');

async function test() {
  try {
    // Step 1: Check availability
    console.log('1️⃣  Checking Coordinator availability...');
    const available = await isCoordinatorAvailable();
    
    if (!available) {
      console.log('❌ Coordinator not available');
      console.log('\n💡 Possible solutions:');
      console.log('   - Check that Coordinator is running');
      console.log('   - Check COORDINATOR_URL');
      console.log('   - Check COORDINATOR_GRPC_PORT');
      return;
    }
    
    console.log('✅ Coordinator available!\n');
    
    // Step 2: Send request
    console.log('2️⃣  Sending request to Coordinator...');
    const response = await routeRequest({
      tenant_id: 'test-tenant-123',
      user_id: 'test-user-456',
      query_text: 'show me my recent payments',
      metadata: {
        source: 'test-script',
        timestamp: new Date().toISOString()
      }
    });
    
    if (!response) {
      console.log('❌ No response from Coordinator');
      console.log('\n💡 This could be because:');
      console.log('   - Request was rejected');
      console.log('   - Invalid signature');
      console.log('   - Coordinator did not find matching services');
      return;
    }
    
    console.log('✅ Response received!\n');
    
    // Step 3: Display results
    console.log('3️⃣  Results:');
    console.log('   Target Services:', response.target_services || 'None');
    
    if (response.normalized_fields) {
      const nf = response.normalized_fields;
      console.log('   Successful Service:', nf.successful_service || 'None');
      console.log('   Rank Used:', nf.rank_used || 'N/A');
      console.log('   Quality Score:', nf.quality_score || 'N/A');
      console.log('   Total Attempts:', nf.total_attempts || 'N/A');
    }
    
    if (response.envelope_json) {
      try {
        const envelope = JSON.parse(response.envelope_json);
        console.log('   Envelope:', JSON.stringify(envelope, null, 2).substring(0, 200) + '...');
      } catch (e) {
        console.log('   Envelope: (cannot parse)');
      }
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nDetails:', error);
  }
}

test();


