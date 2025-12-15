/**
 * Focused gRPC communication test with Coordinator
 * 
 * Usage:
 *   node scripts/test-grpc-only.js
 */

import { routeRequest } from '../src/clients/coordinator.client.js';
import { generateSignature } from '../src/utils/signature.js';
import { createGrpcClient, grpcCall } from '../src/clients/grpcClient.util.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as grpc from '@grpc/grpc-js';
import { logger } from '../src/utils/logger.util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n🔌 Testing gRPC communication with Coordinator\n');

// הגדרות
// Priority: COORDINATOR_GRPC_ENDPOINT > COORDINATOR_GRPC_URL > COORDINATOR_URL + PORT
const COORDINATOR_GRPC_ENDPOINT = process.env.COORDINATOR_GRPC_ENDPOINT;
const COORDINATOR_GRPC_URL = process.env.COORDINATOR_GRPC_URL;
const COORDINATOR_URL = process.env.COORDINATOR_URL || 'coordinator-production-6004.up.railway.app';
const COORDINATOR_GRPC_PORT = process.env.COORDINATOR_GRPC_PORT || '50051';
const COORDINATOR_GRPC_URL_FINAL = COORDINATOR_GRPC_ENDPOINT || COORDINATOR_GRPC_URL || `${COORDINATOR_URL}:${COORDINATOR_GRPC_PORT}`;
const COORDINATOR_PROTO_PATH = process.env.COORDINATOR_PROTO_PATH || 
  join(__dirname, '../../DATABASE/proto/rag/v1/coordinator.proto');
const COORDINATOR_SERVICE_NAME = 'rag.v1.CoordinatorService';
const GRPC_USE_SSL = process.env.GRPC_USE_SSL === 'true';

console.log('📋 Configuration:');
console.log(`   Endpoint: ${COORDINATOR_GRPC_ENDPOINT || 'Not set'}`);
console.log(`   URL: ${COORDINATOR_GRPC_URL_FINAL}`);
console.log(`   Proto: ${COORDINATOR_PROTO_PATH}`);
console.log(`   SSL: ${GRPC_USE_SSL ? 'Yes' : 'No'}\n`);

async function testGrpcConnection() {
  try {
    // Step 1: Create gRPC client
    console.log('1️⃣  Creating gRPC client...');
    
    // Set GRPC_USE_SSL temporarily
    const originalSSL = process.env.GRPC_USE_SSL;
    process.env.GRPC_USE_SSL = GRPC_USE_SSL ? 'true' : 'false';
    
    const client = createGrpcClient(
      COORDINATOR_GRPC_URL_FINAL,
      COORDINATOR_PROTO_PATH,
      COORDINATOR_SERVICE_NAME
    );
    
    console.log('✅ gRPC client created\n');
    
    // Step 2: Test connection
    console.log('2️⃣  Testing connection to Coordinator...');
    
    const connected = await new Promise((resolve) => {
      const deadline = Date.now() + 10000; // 10 seconds timeout
      client.waitForReady(deadline, (error) => {
        if (error) {
          console.log(`❌ Connection failed: ${error.message}`);
          resolve(false);
        } else {
          console.log('✅ Connection successful!\n');
          resolve(true);
        }
      });
    });
    
    if (!connected) {
      client.close();
      console.log('\n💡 Possible solutions:');
      console.log('   - Check that Coordinator is running');
      console.log('   - Check COORDINATOR_URL');
      console.log('   - Try with GRPC_USE_SSL=true');
      console.log('   - If on Railway, try with service name');
      return;
    }
    
    // Step 3: Generate signature
    console.log('3️⃣  Generating digital signature...');
    
    if (!process.env.RAG_PRIVATE_KEY) {
      console.log('❌ RAG_PRIVATE_KEY not set');
      client.close();
      return;
    }
    
    // Decode private key from base64
    let privateKey;
    try {
      privateKey = Buffer.from(process.env.RAG_PRIVATE_KEY, 'base64').toString('utf-8');
      // Verify it's a valid PEM key
      if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
        throw new Error('Invalid private key format');
      }
    } catch (error) {
      console.log(`❌ Error loading private key: ${error.message}`);
      console.log('💡 Make sure RAG_PRIVATE_KEY is base64 encoded PEM format');
      client.close();
      return;
    }
    const serviceName = 'rag-service';
    
    // Build request exactly like coordinator.client.js does
    const requestData = {
      tenant_id: 'test-tenant-123',
      user_id: 'test-user-456',
      query_text: 'show me my recent payments',
      requester_service: serviceName,
      context: {},  // Empty context map
      envelope_json: JSON.stringify({
        version: '1.0',
        timestamp: new Date().toISOString(),
        request_id: `test-${Date.now()}`,
        tenant_id: 'test-tenant-123',
        user_id: 'test-user-456',
        source: 'rag-service',
        payload: {
          query_text: 'show me my recent payments'
        }
      })
    };
    
    // Generate signature
    const signature = generateSignature(serviceName, privateKey, requestData);
    console.log(`✅ Signature generated: ${signature.substring(0, 50)}...\n`);
    
    // Step 4: Create gRPC metadata with signature
    console.log('4️⃣  Creating gRPC metadata with signature...');
    
    const metadata = new grpc.Metadata();
    metadata.add('x-signature', signature);
    metadata.add('x-service-name', serviceName);
    metadata.add('x-timestamp', Date.now().toString());
    metadata.add('x-requester-service', serviceName);
    
    console.log('✅ Metadata created with signature\n');
    
    // Step 5: Send gRPC request (using routeRequest from existing code)
    console.log('5️⃣  Sending gRPC request to Coordinator...');
    console.log(`   Tenant ID: ${requestData.tenant_id}`);
    console.log(`   User ID: ${requestData.user_id}`);
    console.log(`   Query: ${requestData.query_text}\n`);
    
    const startTime = Date.now();
    
    try {
      // Use routeRequest from coordinator.client.js instead
      const response = await routeRequest({
        tenant_id: requestData.tenant_id,
        user_id: requestData.user_id,
        query_text: requestData.query_text,
        metadata: {} // Empty metadata for now
      });
      
      const duration = Date.now() - startTime;
      
      if (!response) {
        console.log(`❌ No response received (${duration}ms)`);
        client.close();
        return;
      }
      
      console.log(`✅ Response received! (${duration}ms)\n`);
      
      // Step 6: Display results
      console.log('6️⃣  Results:');
      console.log(`   Target Services: ${response.target_services?.join(', ') || 'None'}`);
      
      if (response.normalized_fields) {
        const nf = response.normalized_fields;
        console.log(`   Successful Service: ${nf.successful_service || 'None'}`);
        console.log(`   Rank Used: ${nf.rank_used || 'N/A'}`);
        console.log(`   Quality Score: ${nf.quality_score || 'N/A'}`);
        console.log(`   Total Attempts: ${nf.total_attempts || 'N/A'}`);
      }
      
      if (response.envelope_json) {
        try {
          const envelope = JSON.parse(response.envelope_json);
          console.log(`   Envelope Version: ${envelope.version || 'N/A'}`);
          console.log(`   Envelope Timestamp: ${envelope.timestamp || 'N/A'}`);
        } catch (e) {
          console.log('   Envelope: (cannot parse)');
        }
      }
      
      console.log('\n✅ gRPC test completed successfully!');
      console.log('\n📊 Summary:');
      console.log('   ✅ gRPC connection works');
      console.log('   ✅ Signature sent in metadata');
      console.log('   ✅ Request sent successfully');
      console.log('   ✅ Response received');
      
      client.close();
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ Error sending request (${duration}ms)`);
      console.log(`   Error: ${error.message}`);
      
      if (error.code === grpc.status.UNAVAILABLE) {
        console.log('\n💡 Coordinator unavailable');
        console.log('   - Check that Coordinator is running');
        console.log('   - Check the port');
      } else if (error.code === grpc.status.DEADLINE_EXCEEDED) {
        console.log('\n💡 Timeout');
        console.log('   - Increase GRPC_TIMEOUT');
        console.log('   - Check the network');
      } else if (error.code === grpc.status.UNAUTHENTICATED) {
        console.log('\n💡 Authentication failed');
        console.log('   - Check that signature is correct');
        console.log('   - Check that public key is registered in Coordinator');
      } else if (error.code === grpc.status.PERMISSION_DENIED) {
        console.log('\n💡 Permission denied');
        console.log('   - Check that service is authorized');
      } else {
        console.log(`\n💡 gRPC error: ${error.code} (${grpc.status[error.code]})`);
      }
      
      client.close();
    }
    
    // Restore original SSL setting
    process.env.GRPC_USE_SSL = originalSSL;
    
  } catch (error) {
    console.error('\n❌ General error:', error.message);
    console.error(error);
  }
}

testGrpcConnection();

