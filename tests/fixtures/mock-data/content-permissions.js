export default [
  {
    id: 'content-rule-1',
    tenantId: 'tenant-123',
    ruleType: 'content_permission',
    subjectType: 'role',
    subjectId: 'trainer',
    resourceType: 'course',
    resourceId: 'course-advanced-js',
    permission: 'read',
    conditions: {
      allowedRoles: ['trainer', 'admin'],
      maskFields: ['instructorNotes', 'salaryBand'],
    },
    isActive: true,
  },
  {
    id: 'content-rule-2',
    tenantId: 'tenant-123',
    ruleType: 'content_permission',
    subjectType: 'role',
    subjectId: 'trainer',
    resourceType: 'course',
    resourceId: 'course-sensitive-ai',
    permission: 'read',
    conditions: {
      allowedRoles: ['admin'],
    },
    isActive: true,
  },
];

