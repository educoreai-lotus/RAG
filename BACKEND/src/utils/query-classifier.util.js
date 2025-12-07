/**
 * Simple query classifier to detect EDUCORE organizational data topics.
 * Returns an object: { isEducore, category }
 * Categories: skills, users, profiles, content, courses, modules, trainers, analytics, materials, assessments
 * Supports both English and Hebrew
 */
export function isEducoreQuery(query) {
  if (!query || typeof query !== 'string') {
    return { isEducore: false, category: null };
  }
  const q = query.toLowerCase();

  const categories = [
    { 
      key: 'skills', 
      patterns: ['skill', 'skills', 'כישור', 'כישורים', 'מיומנות', 'מיומנויות'] 
    },
    { 
      key: 'users', 
      patterns: ['user ', 'users', 'employee', 'employees', 'staff', 'משתמש', 'משתמשים', 'עובד', 'עובדים', 'עובדת', 'עובדות'] 
    },
    { 
      key: 'profiles', 
      patterns: ['profile', 'profiles', 'פרופיל', 'פרופילים', 'תפקיד', 'תפקידים', 'מה התפקיד', 'מה התפקיד של'] 
    },
    { 
      key: 'content', 
      patterns: ['content', 'materials', 'material', 'תוכן', 'חומרים', 'חומר'] 
    },
    { 
      key: 'courses', 
      patterns: ['course', 'courses', 'קורס', 'קורסים', 'prerequisite', 'prerequisites', 'requirements', 'requirement', 'דרישות', 'דרישה', 'קדם', 'קדמים', 'מה צריך לדעת', 'what do i need', 'what should i know'] 
    },
    { 
      key: 'modules', 
      patterns: ['module', 'modules', 'unit', 'units', 'מודול', 'מודולים', 'יחידה', 'יחידות'] 
    },
    { 
      key: 'trainers', 
      patterns: ['trainer', 'trainers', 'instructor', 'instructors', 'מדריך', 'מדריכים', 'מאמן', 'מאמנים'] 
    },
    { 
      key: 'analytics', 
      patterns: ['analytics', 'report', 'reports', 'statistics', 'stats', 'דוח', 'דוחות', 'סטטיסטיקה', 'ניתוח'] 
    },
    { 
      key: 'materials', 
      patterns: ['material', 'materials', 'חומר', 'חומרים'] 
    },
    { 
      key: 'assessments', 
      patterns: ['assessment', 'assessments', 'exam', 'exams', 'quiz', 'quizzes', 'test', 'tests', 'מבחן', 'מבחנים', 'בוחן', 'בוחנים'] 
    },
  ];

  for (const cat of categories) {
    if (cat.patterns.some((p) => q.includes(p))) {
      return { isEducore: true, category: cat.key };
    }
  }

  // Generic EDUCORE terms (English and Hebrew)
  const genericEducore = [
    'educore', 
    'rag', 
    'knowledge base', 
    'kb', 
    'org data', 
    'organizational data',
    'עדן לוי',  // Eden Levi - specific user name
    'eden levi',  // Eden Levi in English
    'javascript',  // JavaScript course content
    'js ',  // JavaScript abbreviation (with space to avoid matching "json")
    'python',
    'java ',
    'react',
    'node',
    'html',
    'css',
  ];
  if (genericEducore.some((p) => q.includes(p))) {
    return { isEducore: true, category: 'general' };
  }

  // If query contains person names or specific organizational terms, treat as EDUCORE
  // This helps catch queries like "מה התפקיד של Eden Levi"
  const personNamePatterns = [
    'eden', 'levi', 'adi', 'cohen', 'noa', 'bar',  // Known user names
    'עדן', 'לוי', 'עדי', 'כהן', 'נועה', 'בר',  // Hebrew names
  ];
  if (personNamePatterns.some((p) => q.includes(p))) {
    return { isEducore: true, category: 'users' };
  }

  return { isEducore: false, category: null };
}


