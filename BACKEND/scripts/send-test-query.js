/**
 * Send Test Query to RAG Service
 * 
 * This script sends a test query to the RAG service to trigger Coordinator routing
 * 
 * Usage:
 *   node scripts/send-test-query.js
 */

import https from 'https';

const RAG_URL = process.env.RAG_URL || 'https://rag-production-3a4c.up.railway.app';
const QUERY_ENDPOINT = `${RAG_URL}/api/v1/query`;

console.log('\n🧪 Sending test query to RAG Service\n');
console.log(`URL: ${QUERY_ENDPOINT}\n`);

const testQuery = {
  tenant_id: 'test-tenant-123',
  user_id: 'test-user-456',
  query: 'show me my recent payments', // Note: 'query' not 'query_text'
  metadata: {
    source: 'coordinator-test',
    timestamp: new Date().toISOString()
  }
};

function sendRequest() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(testQuery);
    
    const options = {
      hostname: new URL(RAG_URL).hostname,
      port: 443,
      path: '/api/v1/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      },
      timeout: 30000
    };

    console.log('📤 Sending request...');
    console.log(`   Tenant ID: ${testQuery.tenant_id}`);
    console.log(`   User ID: ${testQuery.user_id}`);
    console.log(`   Query: "${testQuery.query}"\n`);

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        console.log(`📥 Response Status: ${res.statusCode}\n`);
        
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const json = JSON.parse(responseData);
            console.log('✅ Response received:');
            console.log(JSON.stringify(json, null, 2).substring(0, 500));
            console.log('\n✅ Query processed successfully!');
            console.log('💡 Check RAG logs for gRPC connection messages');
            console.log('💡 Check Coordinator logs for incoming requests\n');
          } catch (e) {
            console.log('📦 Response (text):');
            console.log(responseData.substring(0, 500));
          }
        } else {
          console.log('⚠️  Response (not 200):');
          console.log(responseData.substring(0, 500));
        }
        
        resolve({ status: res.statusCode, data: responseData });
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Request error: ${error.message}`);
      reject(error);
    });

    req.on('timeout', () => {
      console.log('❌ Request timeout');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(data);
    req.end();
  });
}

sendRequest().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

