/**
 * בדיקה מקיפה של תקשורת עם Coordinator
 * בודק כל האפשרויות: TCP Proxy, SSL, Direct connection
 * 
 * שימוש:
 *   node scripts/test-coordinator-comprehensive.js
 */

import { routeRequest, isCoordinatorAvailable } from '../src/clients/coordinator.client.js';
import { generateSignature } from '../src/utils/signature.js';
import { logger } from '../src/utils/logger.util.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n🧪 בדיקה מקיפה של תקשורת עם Coordinator\n');

// טעינת מפתח פרטי אם קיים
function loadPrivateKey() {
  try {
    const keyPath = join(__dirname, '../keys/rag-service-private-key.pem');
    const keyContent = readFileSync(keyPath, 'utf-8');
    const base64Key = Buffer.from(keyContent, 'utf-8').toString('base64');
    process.env.RAG_PRIVATE_KEY = base64Key;
    console.log('✅ מפתח פרטי נטען מהקובץ\n');
    return true;
  } catch (error) {
    if (process.env.RAG_PRIVATE_KEY) {
      console.log('✅ משתמש ב-RAG_PRIVATE_KEY מהסביבה\n');
      return true;
    }
    console.log('⚠️  לא נמצא מפתח פרטי - בדיקת חתימות תיכשל\n');
    return false;
  }
}

// הגדרות שונות לבדיקה
const testConfigs = [
  {
    name: 'TCP Proxy (gondola.proxy.rlwy.net)',
    url: 'gondola.proxy.rlwy.net',
    port: '16335',
    ssl: false,
  },
  {
    name: 'TCP Proxy עם SSL',
    url: 'gondola.proxy.rlwy.net',
    port: '16335',
    ssl: true,
  },
  {
    name: 'Direct URL (coordinator-production)',
    url: 'coordinator-production-6004.up.railway.app',
    port: '50051',
    ssl: false,
  },
  {
    name: 'Direct URL עם SSL',
    url: 'coordinator-production-6004.up.railway.app',
    port: '50051',
    ssl: true,
  },
  {
    name: 'Localhost (development)',
    url: 'localhost',
    port: '50051',
    ssl: false,
  },
];

async function testConfig(config) {
  console.log(`\n📋 בודק: ${config.name}`);
  console.log(`   URL: ${config.url}:${config.port}`);
  console.log(`   SSL: ${config.ssl ? 'Yes' : 'No'}`);
  
  // הגדרת משתני סביבה
  const originalUrl = process.env.COORDINATOR_URL;
  const originalPort = process.env.COORDINATOR_GRPC_PORT;
  const originalSSL = process.env.GRPC_USE_SSL;
  const originalProto = process.env.COORDINATOR_PROTO_PATH;
  
  process.env.COORDINATOR_URL = config.url;
  process.env.COORDINATOR_GRPC_PORT = config.port;
  process.env.GRPC_USE_SSL = config.ssl ? 'true' : 'false';
  process.env.COORDINATOR_PROTO_PATH = process.env.COORDINATOR_PROTO_PATH || 
    join(__dirname, '../../DATABASE/proto/rag/v1/coordinator.proto');
  
  try {
    // בדיקת זמינות
    console.log('   🔍 בודק זמינות...');
    const available = await isCoordinatorAvailable();
    
    if (!available) {
      console.log('   ❌ לא זמין');
      return false;
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
        }
      } catch (error) {
        console.log(`   ❌ שגיאה ביצירת חתימה: ${error.message}`);
      }
    }
    
    // בדיקת שליחת בקשה
    console.log('   🔍 שולח בקשה...');
    try {
      const response = await routeRequest({
        tenant_id: 'test-tenant-123',
        user_id: 'test-user-456',
        query_text: 'test query for routing',
        metadata: {
          source: 'comprehensive-test',
          timestamp: new Date().toISOString(),
        },
      });
      
      if (response) {
        console.log('   ✅ בקשה נשלחה בהצלחה!');
        console.log(`   📦 תגובה: ${JSON.stringify(response, null, 2).substring(0, 200)}...`);
        return true;
      } else {
        console.log('   ⚠️  לא קיבלנו תגובה');
        return false;
      }
    } catch (error) {
      console.log(`   ❌ שגיאה בשליחת בקשה: ${error.message}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ שגיאה: ${error.message}`);
    return false;
  } finally {
    // שחזור משתני סביבה
    if (originalUrl) process.env.COORDINATOR_URL = originalUrl;
    if (originalPort) process.env.COORDINATOR_GRPC_PORT = originalPort;
    if (originalSSL) process.env.GRPC_USE_SSL = originalSSL;
    if (originalProto) process.env.COORDINATOR_PROTO_PATH = originalProto;
  }
}

async function runTests() {
  // טעינת מפתח פרטי
  const hasKey = loadPrivateKey();
  
  console.log('🔍 מתחיל בדיקות עם כל ההגדרות...\n');
  
  const results = [];
  
  for (const config of testConfigs) {
    const success = await testConfig(config);
    results.push({ config, success });
    
    // הפסקה קצרה בין בדיקות
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // סיכום
  console.log('\n\n📊 סיכום תוצאות:\n');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    console.log('✅ הגדרות שעובדות:');
    successful.forEach(r => {
      console.log(`   - ${r.config.name} (${r.config.url}:${r.config.port})`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ הגדרות שלא עובדות:');
    failed.forEach(r => {
      console.log(`   - ${r.config.name} (${r.config.url}:${r.config.port})`);
    });
  }
  
  if (successful.length === 0) {
    console.log('\n⚠️  אף הגדרה לא עבדה!');
    console.log('\n💡 פתרונות אפשריים:');
    console.log('   1. בדוק ש-Coordinator רץ ב-Railway');
    console.log('   2. בדוק את ה-logs של Coordinator');
    console.log('   3. בדוק ש-gRPC port (50051) חשוף');
    console.log('   4. נסה להשתמש ב-private networking ב-Railway');
    console.log('   5. בדוק ש-TCP Proxy מוגדר נכון');
  } else {
    console.log(`\n✅ נמצאו ${successful.length} הגדרות שעובדות!`);
    console.log('💡 השתמש בהגדרות שעובדות ב-production');
  }
  
  console.log('\n');
}

runTests().catch(error => {
  console.error('❌ שגיאה בבדיקה:', error);
  process.exit(1);
});

