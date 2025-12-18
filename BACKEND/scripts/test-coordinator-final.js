/**
 * בדיקה סופית של תקשורת עם Coordinator
 * בודק את כל האפשרויות ומציג סיכום
 */

import { routeRequest, isCoordinatorAvailable } from '../src/clients/coordinator.client.js';
import { generateSignature } from '../src/utils/signature.js';
import { logger } from '../src/utils/logger.util.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n🧪 בדיקה סופית של תקשורת עם Coordinator\n');

// טעינת מפתח פרטי
function loadPrivateKey() {
  try {
    const keyPath = join(__dirname, '../keys/rag-service-private-key.pem');
    const keyContent = readFileSync(keyPath, 'utf-8');
    const base64Key = Buffer.from(keyContent, 'utf-8').toString('base64');
    process.env.RAG_PRIVATE_KEY = base64Key;
    return true;
  } catch (error) {
    if (process.env.RAG_PRIVATE_KEY) {
      return true;
    }
    return false;
  }
}

// הגדרות לבדיקה
const testConfigs = [
  {
    name: 'Private Networking (Railway)',
    endpoint: 'coordinator.railway.internal:50051',
    ssl: false,
    note: 'עובד רק בתוך Railway'
  },
  {
    name: 'Public URL - Port 443 (HTTPS)',
    endpoint: 'coordinator-production-6004.up.railway.app:443',
    ssl: true,
    note: 'עובד גם מ-local'
  },
  {
    name: 'Public URL - Port 50051',
    endpoint: 'coordinator-production-6004.up.railway.app:50051',
    ssl: false,
    note: 'צריך TCP Proxy'
  },
  {
    name: 'Public URL - Port 50051 (SSL)',
    endpoint: 'coordinator-production-6004.up.railway.app:50051',
    ssl: true,
    note: 'צריך TCP Proxy'
  },
];

async function testConfig(config) {
  console.log(`\n📋 בודק: ${config.name}`);
  console.log(`   Endpoint: ${config.endpoint}`);
  console.log(`   SSL: ${config.ssl ? 'Yes' : 'No'}`);
  if (config.note) {
    console.log(`   💡 ${config.note}`);
  }
  
  // שמירת הגדרות קודמות
  const originalEndpoint = process.env.COORDINATOR_GRPC_ENDPOINT;
  const originalSSL = process.env.GRPC_USE_SSL;
  const originalProto = process.env.COORDINATOR_PROTO_PATH;
  
  // הגדרת משתני סביבה
  process.env.COORDINATOR_GRPC_ENDPOINT = config.endpoint;
  process.env.GRPC_USE_SSL = config.ssl ? 'true' : 'false';
  process.env.COORDINATOR_PROTO_PATH = process.env.COORDINATOR_PROTO_PATH || 
    join(__dirname, '../../DATABASE/proto/rag/v1/coordinator.proto');
  
  try {
    // בדיקת זמינות
    console.log('   🔍 בודק זמינות...');
    const available = await isCoordinatorAvailable();
    
    if (!available) {
      console.log('   ❌ לא זמין');
      return { success: false, reason: 'Not available' };
    }
    
    console.log('   ✅ זמין!');
    
    // בדיקת חתימה
    if (process.env.RAG_PRIVATE_KEY) {
      console.log('   🔍 בודק יצירת חתימה...');
      try {
        const testPayload = {
          tenant_id: 'test-tenant',
          user_id: 'test-user',
          query_text: 'test query',
        };
        const signature = generateSignature('rag-service', 
          Buffer.from(process.env.RAG_PRIVATE_KEY, 'base64').toString('utf-8'),
          testPayload
        );
        if (signature) {
          console.log('   ✅ חתימה נוצרה בהצלחה');
        } else {
          console.log('   ❌ חתימה לא נוצרה');
          return { success: false, reason: 'Signature generation failed' };
        }
      } catch (error) {
        console.log(`   ❌ שגיאה ביצירת חתימה: ${error.message}`);
        return { success: false, reason: `Signature error: ${error.message}` };
      }
    }
    
    // בדיקת שליחת בקשה
    console.log('   🔍 שולח בקשה...');
    try {
      const startTime = Date.now();
      const response = await routeRequest({
        tenant_id: 'test-tenant-123',
        user_id: 'test-user-456',
        query_text: 'test query for routing',
        metadata: {
          source: 'final-test',
          timestamp: new Date().toISOString(),
        },
      });
      
      const duration = Date.now() - startTime;
      
      if (response) {
        console.log(`   ✅ בקשה נשלחה בהצלחה! (${duration}ms)`);
        console.log(`   📦 תגובה: ${JSON.stringify(response).substring(0, 200)}...`);
        return { success: true, duration };
      } else {
        console.log('   ⚠️  לא קיבלנו תגובה');
        return { success: false, reason: 'No response' };
      }
    } catch (error) {
      console.log(`   ❌ שגיאה בשליחת בקשה: ${error.message}`);
      return { success: false, reason: error.message };
    }
  } catch (error) {
    console.log(`   ❌ שגיאה: ${error.message}`);
    return { success: false, reason: error.message };
  } finally {
    // שחזור משתני סביבה
    if (originalEndpoint) process.env.COORDINATOR_GRPC_ENDPOINT = originalEndpoint;
    if (originalSSL) process.env.GRPC_USE_SSL = originalSSL;
    if (originalProto) process.env.COORDINATOR_PROTO_PATH = originalProto;
  }
}

async function runTests() {
  // טעינת מפתח פרטי
  const hasKey = loadPrivateKey();
  if (!hasKey) {
    console.log('⚠️  לא נמצא מפתח פרטי - בדיקת חתימות תיכשל\n');
  } else {
    console.log('✅ מפתח פרטי נטען\n');
  }
  
  console.log('🔍 מתחיל בדיקות עם כל ההגדרות...\n');
  
  const results = [];
  
  for (const config of testConfigs) {
    const result = await testConfig(config);
    results.push({ config, result });
    
    // הפסקה קצרה בין בדיקות
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // סיכום
  console.log('\n\n📊 סיכום תוצאות:\n');
  
  const successful = results.filter(r => r.result.success);
  const failed = results.filter(r => !r.result.success);
  
  if (successful.length > 0) {
    console.log('✅ הגדרות שעובדות:');
    successful.forEach(r => {
      console.log(`   - ${r.config.name}`);
      console.log(`     Endpoint: ${r.config.endpoint}`);
      if (r.result.duration) {
        console.log(`     זמן תגובה: ${r.result.duration}ms`);
      }
      console.log('');
    });
  }
  
  if (failed.length > 0) {
    console.log('❌ הגדרות שלא עובדות:');
    failed.forEach(r => {
      console.log(`   - ${r.config.name}`);
      console.log(`     Endpoint: ${r.config.endpoint}`);
      console.log(`     סיבה: ${r.result.reason}`);
      console.log('');
    });
  }
  
  if (successful.length === 0) {
    console.log('⚠️  אף הגדרה לא עבדה!');
    console.log('\n💡 פתרונות אפשריים:');
    console.log('   1. בדוק ש-Coordinator רץ ב-Railway');
    console.log('   2. בדוק ש-GRPC_ENABLED=true ב-Coordinator');
    console.log('   3. בדוק ש-port 50051 חשוף');
    console.log('   4. אם אתה על local machine, השתמש ב-public URL עם port 443');
    console.log('   5. אם אתה על Railway, השתמש ב-private networking');
  } else {
    console.log(`\n✅ נמצאו ${successful.length} הגדרות שעובדות!`);
    console.log('💡 השתמש בהגדרות שעובדות ב-production\n');
    
    // המלצה
    const bestConfig = successful[0];
    console.log('🎯 המלצה:');
    console.log(`   COORDINATOR_GRPC_ENDPOINT=${bestConfig.config.endpoint}`);
    console.log(`   GRPC_USE_SSL=${bestConfig.config.ssl ? 'true' : 'false'}\n`);
  }
}

runTests().catch(error => {
  console.error('❌ שגיאה בבדיקה:', error);
  process.exit(1);
});



