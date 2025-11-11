export default [
  {
    id: 'rbac-rule-1',
    tenantId: 'tenant-123',
    ruleType: 'RBAC',
    subjectType: 'role',
    subjectId: 'trainer',
    resourceType: 'course',
    resourceId: null,
    permission: 'read',
    conditions: {
      maskFields: ['instructorNotes', 'salaryBand'],
    },
    isActive: true,
  },
  {
    id: 'rbac-rule-2',
    tenantId: 'tenant-123',
    ruleType: 'RBAC',
    subjectType: 'role',
    subjectId: 'learner',
    resourceType: 'course',
    resourceId: null,
    permission: 'read',
    conditions: {},
    isActive: true,
  },
];

