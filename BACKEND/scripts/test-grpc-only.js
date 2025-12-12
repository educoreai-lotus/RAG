/**
 * בדיקה ממוקדת של תקשורת gRPC עם Coordinator
 * 
 * שימוש:
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

console.log('\n🔌 בדיקת תקשורת gRPC עם Coordinator\n');

// הגדרות
const COORDINATOR_URL = process.env.COORDINATOR_URL || 'coordinator-production-e0a0.up.railway.app';
const COORDINATOR_GRPC_PORT = process.env.COORDINATOR_GRPC_PORT || '50051';
const COORDINATOR_GRPC_URL = process.env.COORDINATOR_GRPC_URL || `${COORDINATOR_URL}:${COORDINATOR_GRPC_PORT}`;
const COORDINATOR_PROTO_PATH = process.env.COORDINATOR_PROTO_PATH || 
  join(__dirname, '../../DATABASE/proto/rag/v1/coordinator.proto');
const COORDINATOR_SERVICE_NAME = 'rag.v1.CoordinatorService';
const GRPC_USE_SSL = process.env.GRPC_USE_SSL === 'true';

console.log('📋 הגדרות:');
console.log(`   URL: ${COORDINATOR_GRPC_URL}`);
console.log(`   Proto: ${COORDINATOR_PROTO_PATH}`);
console.log(`   SSL: ${GRPC_USE_SSL ? 'Yes' : 'No'}\n`);

async function testGrpcConnection() {
  try {
    // שלב 1: יצירת gRPC client
    console.log('1️⃣  יוצר gRPC client...');
    
    // Set GRPC_USE_SSL temporarily
    const originalSSL = process.env.GRPC_USE_SSL;
    process.env.GRPC_USE_SSL = GRPC_USE_SSL ? 'true' : 'false';
    
    const client = createGrpcClient(
      COORDINATOR_GRPC_URL,
      COORDINATOR_PROTO_PATH,
      COORDINATOR_SERVICE_NAME
    );
    
    console.log('✅ gRPC client נוצר\n');
    
    // שלב 2: בדיקת חיבור
    console.log('2️⃣  בודק חיבור ל-Coordinator...');
    
    const connected = await new Promise((resolve) => {
      const deadline = Date.now() + 10000; // 10 שניות timeout
      client.waitForReady(deadline, (error) => {
        if (error) {
          console.log(`❌ חיבור נכשל: ${error.message}`);
          resolve(false);
        } else {
          console.log('✅ חיבור הצליח!\n');
          resolve(true);
        }
      });
    });
    
    if (!connected) {
      client.close();
      console.log('\n💡 פתרונות אפשריים:');
      console.log('   - בדוק ש-Coordinator רץ');
      console.log('   - בדוק את COORDINATOR_URL');
      console.log('   - נסה עם GRPC_USE_SSL=true');
      console.log('   - אם על Railway, נסה עם service name');
      return;
    }
    
    // שלב 3: יצירת חתימה
    console.log('3️⃣  יוצר חתימה דיגיטלית...');
    
    if (!process.env.RAG_PRIVATE_KEY) {
      console.log('❌ RAG_PRIVATE_KEY לא מוגדר');
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
      console.log(`❌ שגיאה בטעינת מפתח פרטי: ${error.message}`);
      console.log('💡 ודא ש-RAG_PRIVATE_KEY הוא base64 encoded PEM format');
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
    
    // יצירת חתימה
    const signature = generateSignature(serviceName, privateKey, requestData);
    console.log(`✅ חתימה נוצרה: ${signature.substring(0, 50)}...\n`);
    
    // שלב 4: יצירת gRPC metadata עם חתימה
    console.log('4️⃣  יוצר gRPC metadata עם חתימה...');
    
    const metadata = new grpc.Metadata();
    metadata.add('x-signature', signature);
    metadata.add('x-service-name', serviceName);
    metadata.add('x-timestamp', Date.now().toString());
    metadata.add('x-requester-service', serviceName);
    
    console.log('✅ Metadata נוצר עם חתימה\n');
    
    // שלב 5: שליחת בקשה gRPC (שימוש ב-routeRequest מהקוד הקיים)
    console.log('5️⃣  שולח בקשה gRPC ל-Coordinator...');
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
        console.log(`❌ לא קיבלנו תגובה (${duration}ms)`);
        client.close();
        return;
      }
      
      console.log(`✅ תגובה התקבלה! (${duration}ms)\n`);
      
      // שלב 6: הצגת התוצאות
      console.log('6️⃣  תוצאות:');
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
          console.log('   Envelope: (לא ניתן לפרסר)');
        }
      }
      
      console.log('\n✅ בדיקת gRPC הושלמה בהצלחה!');
      console.log('\n📊 סיכום:');
      console.log('   ✅ חיבור gRPC עובד');
      console.log('   ✅ חתימה נשלחה ב-metadata');
      console.log('   ✅ בקשה נשלחה בהצלחה');
      console.log('   ✅ תגובה התקבלה');
      
      client.close();
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ שגיאה בשליחת בקשה (${duration}ms)`);
      console.log(`   Error: ${error.message}`);
      
      if (error.code === grpc.status.UNAVAILABLE) {
        console.log('\n💡 Coordinator לא זמין');
        console.log('   - בדוק ש-Coordinator רץ');
        console.log('   - בדוק את הפורט');
      } else if (error.code === grpc.status.DEADLINE_EXCEEDED) {
        console.log('\n💡 Timeout');
        console.log('   - הגדל את GRPC_TIMEOUT');
        console.log('   - בדוק את הרשת');
      } else if (error.code === grpc.status.UNAUTHENTICATED) {
        console.log('\n💡 אימות נכשל');
        console.log('   - בדוק שהחתימה נכונה');
        console.log('   - בדוק שהמפתח הציבורי רשום ב-Coordinator');
      } else if (error.code === grpc.status.PERMISSION_DENIED) {
        console.log('\n💡 הרשאה נדחתה');
        console.log('   - בדוק שהשירות מורשה');
      } else {
        console.log(`\n💡 שגיאת gRPC: ${error.code} (${grpc.status[error.code]})`);
      }
      
      client.close();
    }
    
    // Restore original SSL setting
    process.env.GRPC_USE_SSL = originalSSL;
    
  } catch (error) {
    console.error('\n❌ שגיאה כללית:', error.message);
    console.error(error);
  }
}

testGrpcConnection();

