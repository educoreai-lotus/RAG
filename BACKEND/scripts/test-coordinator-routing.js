/**
 * בדיקת ניתוב Coordinator למיקרו-שירותים
 * 
 * בודק שהתקשורת gRPC עובדת והבקשה מנותבת למיקרו-שירות הנכון
 * 
 * שימוש:
 *   node scripts/test-coordinator-routing.js
 */

import { routeRequest } from '../src/clients/coordinator.client.js';
import { logger } from '../src/utils/logger.util.js';

console.log('\n🧪 בדיקת ניתוב Coordinator למיקרו-שירותים\n');

// רשימת המיקרו-שירותים הרשומים
const MICROSERVICES = {
  'directory': {
    name: 'Directory',
    description: 'Trainers, internal experts, organizational roles',
    example: 'Who can mentor me in backend development?'
  },
  'course-builder': {
    name: 'Course Builder',
    description: 'Courses, modules, learning paths, trainers',
    example: 'Which internal course teaches Python basics?'
  },
  'content-studio': {
    name: 'Content Studio',
    description: 'Lesson content, transcripts, summaries, mind maps',
    example: 'Explain lesson 3 in simple terms.'
  },
  'assessment': {
    name: 'Assessment',
    description: 'Test results, feedback, scores, difficulty progression',
    example: 'Why did I fail the SQL assessment?'
  },
  'skills-engine': {
    name: 'Skills Engine',
    description: 'Skills, competencies, gaps mapping',
    example: 'What skills am I missing to become a data analyst?'
  },
  'learner-ai': {
    name: 'Learner AI',
    description: 'Personalization, learner goals, current path, progress',
    example: 'What should I learn next?'
  },
  'learning-analytics': {
    name: 'Learning Analytics',
    description: 'Performance, engagement, effectiveness metrics',
    example: 'Which course works best for beginners?'
  },
  'hr-management': {
    name: 'HR & Management Reporting',
    description: 'Organizational and managerial insights',
    example: 'Which team has the largest skill gap this quarter?'
  },
  'devlab': {
    name: 'DevLab',
    description: 'Practical exercises and coding performance',
    example: 'Give me a harder React exercise.'
  }
};

// בדיקות לפי קטגוריות
const TEST_QUERIES = [
  {
    category: 'Directory',
    query: 'Who can mentor me in backend development?',
    expectedService: 'directory',
    description: 'חיפוש מנטור - Directory'
  },
  {
    category: 'Course Builder',
    query: 'Which internal course teaches Python basics?',
    expectedService: 'course-builder',
    description: 'חיפוש קורס - Course Builder'
  },
  {
    category: 'Content Studio',
    query: 'Explain lesson 3 in simple terms.',
    expectedService: 'content-studio',
    description: 'הסבר שיעור - Content Studio'
  },
  {
    category: 'Assessment',
    query: 'Why did I fail the SQL assessment?',
    expectedService: 'assessment',
    description: 'הסבר תוצאות - Assessment'
  },
  {
    category: 'Skills Engine',
    query: 'What skills am I missing to become a data analyst?',
    expectedService: 'skills-engine',
    description: 'ניתוח כישורים - Skills Engine'
  },
  {
    category: 'Learner AI',
    query: 'What should I learn next?',
    expectedService: 'learner-ai',
    description: 'המלצה אישית - Learner AI'
  },
  {
    category: 'Learning Analytics',
    query: 'Which course works best for beginners?',
    expectedService: 'learning-analytics',
    description: 'ניתוח ביצועים - Learning Analytics'
  },
  {
    category: 'HR & Management',
    query: 'Which team has the largest skill gap this quarter?',
    expectedService: 'hr-management',
    description: 'דוחות ארגוניים - HR & Management'
  },
  {
    category: 'DevLab',
    query: 'Give me a harder React exercise.',
    expectedService: 'devlab',
    description: 'תרגיל קוד - DevLab'
  }
];

async function testRouting(queryConfig) {
  const { category, query, expectedService, description } = queryConfig;
  
  console.log(`\n📋 ${description}`);
  console.log(`   Query: "${query}"`);
  console.log(`   Expected: ${expectedService}`);
  
  try {
    const startTime = Date.now();
    
    const response = await routeRequest({
      tenant_id: 'test-tenant-123',
      user_id: 'test-user-456',
      query_text: query,
      metadata: {
        source: 'test-routing-script',
        category: category.toLowerCase(),
        timestamp: new Date().toISOString()
      }
    });
    
    const duration = Date.now() - startTime;
    
    if (!response) {
      console.log(`   ❌ לא קיבלנו תגובה (${duration}ms)`);
      return { success: false, duration };
    }
    
    console.log(`   ✅ תגובה התקבלה (${duration}ms)`);
    
    // בדיקת target services
    const targetServices = response.target_services || [];
    console.log(`   📍 Target Services: ${targetServices.length > 0 ? targetServices.join(', ') : 'None'}`);
    
    // בדיקת normalized fields
    if (response.normalized_fields) {
      const nf = response.normalized_fields;
      const successfulService = nf.successful_service || 'None';
      const rankUsed = nf.rank_used || 'N/A';
      const qualityScore = nf.quality_score || 'N/A';
      
      console.log(`   🎯 Successful Service: ${successfulService}`);
      console.log(`   📊 Rank Used: ${rankUsed}`);
      console.log(`   ⭐ Quality Score: ${qualityScore}`);
      
      // בדיקה אם הניתוב היה נכון
      const isCorrect = successfulService.toLowerCase().includes(expectedService) ||
                       targetServices.some(s => s.toLowerCase().includes(expectedService));
      
      if (isCorrect) {
        console.log(`   ✅ ניתוב נכון!`);
      } else {
        console.log(`   ⚠️  ניתוב שונה מהצפוי`);
        console.log(`      צפוי: ${expectedService}`);
        console.log(`      קיבלנו: ${successfulService}`);
      }
      
      return {
        success: true,
        duration,
        targetServices,
        successfulService,
        rankUsed,
        qualityScore,
        isCorrect
      };
    }
    
    return { success: true, duration, targetServices };
    
  } catch (error) {
    console.log(`   ❌ שגיאה: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('🚀 מתחיל בדיקות ניתוב...\n');
  console.log(`📊 ${TEST_QUERIES.length} בדיקות מוכנות\n`);
  
  const results = [];
  
  for (const testQuery of TEST_QUERIES) {
    const result = await testRouting(testQuery);
    results.push({
      ...testQuery,
      ...result
    });
    
    // הפסקה קצרה בין בדיקות
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // סיכום
  console.log('\n' + '='.repeat(60));
  console.log('📊 סיכום תוצאות');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const correctRouting = results.filter(r => r.isCorrect);
  
  console.log(`\n✅ הצליחו: ${successful.length}/${results.length}`);
  console.log(`❌ נכשלו: ${failed.length}/${results.length}`);
  console.log(`🎯 ניתוב נכון: ${correctRouting.length}/${successful.length}`);
  
  if (successful.length > 0) {
    const avgDuration = successful.reduce((sum, r) => sum + (r.duration || 0), 0) / successful.length;
    console.log(`⏱️  זמן ממוצע: ${Math.round(avgDuration)}ms`);
  }
  
  // פירוט לפי קטגוריה
  console.log('\n📋 פירוט לפי קטגוריה:');
  for (const result of results) {
    const status = result.success 
      ? (result.isCorrect ? '✅' : '⚠️')
      : '❌';
    console.log(`   ${status} ${result.category}: ${result.successfulService || 'No response'}`);
  }
  
  // המלצות
  console.log('\n💡 המלצות:');
  if (failed.length > 0) {
    console.log('   - בדוק את החיבור ל-Coordinator');
    console.log('   - בדוק שהחתימות תקינות');
  }
  if (correctRouting.length < successful.length) {
    console.log('   - Coordinator מנתב לשירותים שונים מהצפוי');
    console.log('   - זה יכול להיות תקין - Coordinator משתמש ב-AI routing');
  }
  if (successful.length === results.length && correctRouting.length === successful.length) {
    console.log('   ✅ הכל עובד מצוין!');
  }
  
  console.log('\n');
}

// הרצה
runAllTests().catch((error) => {
  console.error('\n❌ שגיאה כללית:', error);
  process.exit(1);
});

