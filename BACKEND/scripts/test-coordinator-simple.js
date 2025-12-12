/**
 * בדיקה פשוטה של תקשורת עם Coordinator
 * 
 * שימוש:
 *   node scripts/test-coordinator-simple.js
 */

import { routeRequest, isCoordinatorAvailable } from '../src/clients/coordinator.client.js';
import { logger } from '../src/utils/logger.util.js';

console.log('\n🧪 בדיקת תקשורת עם Coordinator\n');

async function test() {
  try {
    // שלב 1: בדיקת זמינות
    console.log('1️⃣  בודק זמינות Coordinator...');
    const available = await isCoordinatorAvailable();
    
    if (!available) {
      console.log('❌ Coordinator לא זמין');
      console.log('\n💡 פתרונות אפשריים:');
      console.log('   - בדוק ש-Coordinator רץ');
      console.log('   - בדוק את COORDINATOR_URL');
      console.log('   - בדוק את COORDINATOR_GRPC_PORT');
      return;
    }
    
    console.log('✅ Coordinator זמין!\n');
    
    // שלב 2: שליחת בקשה
    console.log('2️⃣  שולח בקשה ל-Coordinator...');
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
      console.log('❌ לא קיבלנו תגובה מ-Coordinator');
      console.log('\n💡 זה יכול להיות כי:');
      console.log('   - הבקשה נדחתה');
      console.log('   - חתימה לא תקינה');
      console.log('   - Coordinator לא מצא שירותים מתאימים');
      return;
    }
    
    console.log('✅ קיבלנו תגובה!\n');
    
    // שלב 3: הצגת התוצאות
    console.log('3️⃣  תוצאות:');
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
        console.log('   Envelope: (לא ניתן לפרסר)');
      }
    }
    
    console.log('\n✅ הבדיקה הושלמה בהצלחה!');
    
  } catch (error) {
    console.error('\n❌ שגיאה:', error.message);
    console.error('\nפרטים:', error);
  }
}

test();

