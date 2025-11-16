/**
 * Simple query classifier to detect EDUCORE organizational data topics.
 * Returns an object: { isEducore, category }
 * Categories: skills, users, profiles, content, courses, modules, trainers, analytics, materials, assessments
 */
export function isEducoreQuery(query) {
  if (!query || typeof query !== 'string') {
    return { isEducore: false, category: null };
  }
  const q = query.toLowerCase();

  const categories = [
    { key: 'skills', patterns: ['skill', 'skills'] },
    { key: 'users', patterns: ['user ', 'users', 'employee', 'employees', 'staff'] },
    { key: 'profiles', patterns: ['profile', 'profiles'] },
    { key: 'content', patterns: ['content', 'materials', 'material'] },
    { key: 'courses', patterns: ['course', 'courses'] },
    { key: 'modules', patterns: ['module', 'modules', 'unit', 'units'] },
    { key: 'trainers', patterns: ['trainer', 'trainers', 'instructor', 'instructors'] },
    { key: 'analytics', patterns: ['analytics', 'report', 'reports', 'statistics', 'stats'] },
    { key: 'materials', patterns: ['material', 'materials'] },
    { key: 'assessments', patterns: ['assessment', 'assessments', 'exam', 'exams', 'quiz', 'quizzes', 'test', 'tests'] },
  ];

  for (const cat of categories) {
    if (cat.patterns.some((p) => q.includes(p))) {
      return { isEducore: true, category: cat.key };
    }
  }

  // Generic EDUCORE terms
  const genericEducore = ['educore', 'rag', 'knowledge base', 'kb', 'org data', 'organizational data'];
  if (genericEducore.some((p) => q.includes(p))) {
    return { isEducore: true, category: 'general' };
  }

  return { isEducore: false, category: null };
}


