/**
 * בדיקת תקשורת HTTP עם Coordinator
 * בודק שהשרת זמין דרך HTTP לפני בדיקת gRPC
 */

import https from 'https';
import http from 'http';

const COORDINATOR_URL = process.env.COORDINATOR_URL || 'coordinator-production-6004.up.railway.app';
const COORDINATOR_HTTP_URL = `https://${COORDINATOR_URL}`;

console.log('\n🌐 בדיקת תקשורת HTTP עם Coordinator\n');
console.log(`URL: ${COORDINATOR_HTTP_URL}\n`);

async function testHttpEndpoint(path = '/health') {
  return new Promise((resolve, reject) => {
    const url = `${COORDINATOR_HTTP_URL}${path}`;
    console.log(`📡 בודק: ${url}`);
    
    https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`✅ Status: ${res.statusCode}`);
        try {
          const json = JSON.parse(data);
          console.log(`📦 Response: ${JSON.stringify(json, null, 2)}`);
        } catch {
          console.log(`📦 Response: ${data.substring(0, 500)}`);
        }
        resolve({ status: res.statusCode, data });
      });
    }).on('error', (error) => {
      console.log(`❌ שגיאה: ${error.message}`);
      reject(error);
    }).on('timeout', () => {
      console.log('❌ Timeout');
      reject(new Error('Request timeout'));
    });
  });
}

async function runTests() {
  try {
    console.log('1️⃣  בודק /health endpoint...\n');
    await testHttpEndpoint('/health');
    
    console.log('\n2️⃣  בודק /services endpoint...\n');
    await testHttpEndpoint('/services');
    
    console.log('\n3️⃣  בודק root endpoint...\n');
    await testHttpEndpoint('/');
    
    console.log('\n✅ כל בדיקות HTTP הצליחו!');
    console.log('💡 Coordinator זמין דרך HTTP');
    console.log('💡 אם gRPC לא עובד, ייתכן ש-port 50051 לא חשוף או צריך TCP Proxy\n');
  } catch (error) {
    console.log(`\n❌ שגיאה בבדיקות HTTP: ${error.message}`);
    console.log('💡 Coordinator כנראה לא זמין או יש בעיית רשת\n');
  }
}

runTests();



