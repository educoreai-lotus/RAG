/**
 * Test gRPC Connection to Coordinator
 * 
 * This script tests different ways to connect to Coordinator gRPC service on Railway
 */

import { createGrpcClient, grpcCall } from '../src/clients/grpcClient.util.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as grpc from '@grpc/grpc-js';
import { logger } from '../src/utils/logger.util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const COORDINATOR_HOST = process.env.COORDINATOR_URL || 'coordinator-production-e0a0.up.railway.app';
const COORDINATOR_PROTO_PATH = process.env.COORDINATOR_PROTO_PATH || 
  join(__dirname, '../../DATABASE/proto/rag/v1/coordinator.proto');
const COORDINATOR_SERVICE_NAME = 'rag.v1.CoordinatorService';

// Test different ports
const PORTS_TO_TEST = [
  50051,  // Standard gRPC port
  443,    // HTTPS port (might be used for gRPC-Web)
  80,     // HTTP port
];

// Test different connection methods
const CONNECTION_METHODS = [
  { name: 'Insecure', useSSL: false },
  { name: 'SSL/TLS', useSSL: true },
];

console.log('\n🔍 Testing gRPC Connection to Coordinator\n');
console.log(`Host: ${COORDINATOR_HOST}`);
console.log(`Proto: ${COORDINATOR_PROTO_PATH}\n`);

async function testConnection(host, port, useSSL) {
  const url = `${host}:${port}`;
  const method = useSSL ? 'SSL/TLS' : 'Insecure';
  
  console.log(`\n📡 Testing: ${method} on ${url}`);
  
  try {
    // Temporarily set GRPC_USE_SSL
    const originalSSL = process.env.GRPC_USE_SSL;
    process.env.GRPC_USE_SSL = useSSL ? 'true' : 'false';
    
    const client = createGrpcClient(
      url,
      COORDINATOR_PROTO_PATH,
      COORDINATOR_SERVICE_NAME
    );
    
    // Try to connect
    const connected = await new Promise((resolve) => {
      const deadline = Date.now() + 5000; // 5 second timeout
      client.waitForReady(deadline, (error) => {
        resolve(!error);
      });
    });
    
    if (connected) {
      console.log(`✅ Connection successful!`);
      
      // Try to make a test call
      try {
        const testRequest = {
          tenant_id: 'test',
          user_id: 'test',
          query_text: 'test',
          requester_service: 'rag-service',
          context: {},
          envelope_json: JSON.stringify({ version: '1.0', timestamp: new Date().toISOString() })
        };
        
        const metadata = new grpc.Metadata();
        const response = await grpcCall(client, 'Route', testRequest, metadata, 10000);
        
        console.log(`✅ gRPC call successful!`);
        console.log(`   Response received: ${JSON.stringify(response).substring(0, 100)}...`);
        
        client.close();
        return { success: true, url, method };
      } catch (callError) {
        console.log(`⚠️  Connection works but call failed: ${callError.message}`);
        client.close();
        return { success: false, url, method, error: callError.message };
      }
    } else {
      console.log(`❌ Connection failed`);
      client.close();
      return { success: false, url, method };
    }
    
    // Restore original SSL setting
    process.env.GRPC_USE_SSL = originalSSL;
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { success: false, url, method, error: error.message };
  }
}

async function runTests() {
  const results = [];
  
  for (const port of PORTS_TO_TEST) {
    for (const method of CONNECTION_METHODS) {
      const result = await testConnection(COORDINATOR_HOST, port, method.useSSL);
      results.push(result);
      
      // If successful, we can stop
      if (result.success) {
        console.log(`\n🎉 Found working connection!`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Method: ${result.method}`);
        return result;
      }
    }
  }
  
  console.log(`\n❌ No working connection found`);
  console.log(`\nPossible solutions:`);
  console.log(`1. Check Railway dashboard for gRPC port configuration`);
  console.log(`2. Verify Coordinator service is running`);
  console.log(`3. Check if gRPC is exposed through different URL`);
  console.log(`4. Contact Coordinator administrator for correct gRPC endpoint`);
  
  return null;
}

runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});





