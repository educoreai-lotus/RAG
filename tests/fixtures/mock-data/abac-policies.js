export default [
  {
    id: 'abac-rule-1',
    tenantId: 'tenant-123',
    ruleType: 'ABAC',
    subjectType: 'attribute',
    subjectId: 'department',
    resourceType: 'report',
    resourceId: null,
    permission: 'read',
    conditions: {
      department: ['Engineering', 'AI'],
      region: ['US', 'CA'],
      seniority: { gte: 3 },
    },
    isActive: true,
  },
  {
    id: 'abac-rule-2',
    tenantId: 'tenant-123',
    ruleType: 'ABAC',
    subjectType: 'attribute',
    subjectId: 'department',
    resourceType: 'course',
    resourceId: null,
    permission: 'read',
    conditions: {
      department: ['Engineering'],
    },
    isActive: true,
  },
];

