/**
 * Simple query classifier to detect EDUCORE organizational data topics.
 * Returns an object: { isEducore, category, reason }
 * Categories: skills, users, profiles, content, courses, modules, trainers, analytics, materials, assessments
 * Supports both English and Hebrew
 */
export function isEducoreQuery(query) {
  if (!query || typeof query !== 'string') {
    return { isEducore: false, category: null, reason: 'empty_query' };
  }
  const q = query.toLowerCase();
  const normalizedQuery = q.trim();

  const categories = [
    { 
      key: 'skills', 
      patterns: [
        'skill', 'skills', 'competency', 'competencies', 'gap', 'gaps', 'development', 
        'improvement', 'target role', 'career', 'growth',
        'כישור', 'כישורים', 'מיומנות', 'מיומנויות', 'יכולת', 'יכולות', 'פיתוח', 'קריירה'
      ] 
    },
    { 
      key: 'users', 
      patterns: [
        'user ', 'users', 'employee', 'employees', 'staff', 'team members', 'colleagues',
        'who works', 'who is in', 'team lead', 'manager', 'trainer',
        'משתמש', 'משתמשים', 'עובד', 'עובדים', 'עובדת', 'עובדות', 'צוות', 'עמיתים', 'מנהל'
      ] 
    },
    { 
      key: 'profiles', 
      patterns: [
        'profile', 'profiles', 'my role', 'current role', 'my profile', 'my team', 
        'my department', 'my company', 'role', 'roles',
        'פרופיל', 'פרופילים', 'תפקיד', 'תפקידים', 'מה התפקיד', 'מה התפקיד של', 
        'התפקיד שלי', 'הצוות שלי', 'המחלקה שלי'
      ] 
    },
    { 
      key: 'content', 
      patterns: ['content', 'materials', 'material', 'תוכן', 'חומרים', 'חומר'] 
    },
    { 
      key: 'courses', 
      patterns: [
        'course', 'courses', 'my courses', 'enrolled in', 'enrolled', 'assigned to',
        'lesson', 'lessons', 'module', 'modules', 'curriculum', 'syllabus', 
        'learning path', 'training', 'certification', 'certificate',
        'prerequisite', 'prerequisites', 'requirements', 'requirement', 
        'דרישות', 'דרישה', 'קדם', 'קדמים', 'מה צריך לדעת', 'what do i need', 
        'what should i know', 'קורס', 'קורסים', 'הקורסים שלי', 'רשום', 'רשומה',
        'שיעור', 'שיעורים', 'מודול', 'מודולים', 'תוכנית לימודים'
      ] 
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
      patterns: [
        'analytics', 'report', 'reports', 'statistics', 'stats', 'my progress', 
        'my learning', 'my activity', 'my history', 'progress', 'completion', 
        'performance', 'דוח', 'דוחות', 'סטטיסטיקה', 'ניתוח', 'התקדמות', 
        'ההתקדמות שלי', 'ההיסטוריה שלי', 'ביצועים'
      ] 
    },
    { 
      key: 'materials', 
      patterns: ['material', 'materials', 'חומר', 'חומרים'] 
    },
    { 
      key: 'assessments', 
      patterns: [
        'assessment', 'assessments', 'my assessments', 'my grades', 'my scores',
        'exam', 'exams', 'quiz', 'quizzes', 'test', 'tests', 'grade', 'grades',
        'score', 'scores', 'מבחן', 'מבחנים', 'בוחן', 'בוחנים', 'ציון', 'ציונים',
        'הציונים שלי', 'המבחנים שלי', 'בוחן', 'בוחנים'
      ] 
    },
    {
      key: 'organization',
      patterns: [
        'department', 'departments', 'organization', 'company structure', 'org chart',
        'team', 'teams', 'מחלקה', 'מחלקות', 'ארגון', 'חברה', 'מבנה ארגוני'
      ]
    },
    {
      key: 'recommendations',
      patterns: [
        'my recommendations', 'recommendation', 'recommendations', 'suggest',
        'המלצות', 'המלצות שלי', 'הצע', 'הצעות'
      ]
    }
  ];

  // Check categories for keyword matches
  for (const cat of categories) {
    const matchedPatterns = cat.patterns.filter((p) => normalizedQuery.includes(p));
    if (matchedPatterns.length > 0) {
      return { 
        isEducore: true, 
        category: cat.key,
        reason: `keyword_match: ${matchedPatterns.slice(0, 3).join(', ')}`
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PERSONAL PRONOUN PATTERNS (my, me, I) - High priority for EDUCORE
  // ═══════════════════════════════════════════════════════════════
  const personalPatterns = [
    /\b(my|mine|i am|i'm|i have|i've)\b.*\b(role|course|progress|team|score|grade|skill|assessment|learning|enrolled|assigned)\b/i,
    /\b(show|get|find|what|tell|give)\b.*\b(me|my)\b/i,
    /\bam i\b/i,
    /\bdo i have\b/i,
    /\bwhat is my\b/i,
    /\bwhat are my\b/i,
    /\bwhere is my\b/i,
    /\bhow is my\b/i,
    /\bwho is my\b/i,
  ];
  
  const matchedPersonalPattern = personalPatterns.find(pattern => pattern.test(query));
  if (matchedPersonalPattern) {
    return { 
      isEducore: true, 
      category: 'profiles',
      reason: 'personal_pattern'
    };
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
  if (genericEducore.some((p) => normalizedQuery.includes(p))) {
    return { isEducore: true, category: 'general', reason: 'generic_educore_term' };
  }

  // If query contains person names or specific organizational terms, treat as EDUCORE
  // This helps catch queries like "מה התפקיד של Eden Levi"
  const personNamePatterns = [
    'eden', 'levi', 'adi', 'cohen', 'noa', 'bar',  // Known user names
    'עדן', 'לוי', 'עדי', 'כהן', 'נועה', 'בר',  // Hebrew names
  ];
  if (personNamePatterns.some((p) => normalizedQuery.includes(p))) {
    return { isEducore: true, category: 'users', reason: 'person_name_detected' };
  }

  return { isEducore: false, category: null, reason: 'no_match' };
}


