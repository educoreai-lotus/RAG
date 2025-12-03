/**
 * Test script for RAG Microservice query endpoint
 */
import https from 'https';

const url = 'https://ragmicroservice-production.up.railway.app/api/v1/query';

const payload = JSON.stringify({
  query: "What is Eden Levi's role?",
  tenant_id: "default.local",
  context: {
    user_id: "admin-user-123",
    role: "admin"  // This should override any profile role
  }
});

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  },
  timeout: 30000
};

console.log('Sending request to:', url);
console.log('Payload:', payload);
console.log('\n' + '='.repeat(50) + '\n');

const req = https.request(url, options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Response Headers:`, res.headers);
  console.log('\nResponse Body:');
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('ERROR:', error.message);
});

req.on('timeout', () => {
  console.error('ERROR: Request timed out after 30 seconds');
  req.destroy();
});

req.write(payload);
req.end();

