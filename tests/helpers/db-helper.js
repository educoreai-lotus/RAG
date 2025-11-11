const testDatabaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

let prismaTestClient;

async function getPrismaClient() {
  if (!testDatabaseUrl) {
    return null;
  }

  if (!prismaTestClient) {
    const { PrismaClient } = await import('@prisma/client');
    prismaTestClient = new PrismaClient({
      datasources: {
        db: {
          url: testDatabaseUrl,
        },
      },
    });
  }

  return prismaTestClient;
}

async function cleanupDatabase() {
  const client = await getPrismaClient();
  if (!client) {
    return;
  }

  await client.$transaction([
    client.queryRecommendation.deleteMany(),
    client.querySource.deleteMany(),
    client.query.deleteMany(),
    client.vectorEmbedding.deleteMany(),
    client.knowledgeGraphEdge.deleteMany(),
    client.knowledgeGraphNode.deleteMany(),
    client.accessControlRule.deleteMany(),
    client.userProfile.deleteMany(),
    client.auditLog.deleteMany(),
    client.cacheEntry.deleteMany(),
  ]);

  await client.tenant.deleteMany();
}

async function seedTestData() {
  const client = await getPrismaClient();
  if (!client) {
    return;
  }

  const tenant = await client.tenant.upsert({
    where: { domain: 'test.local' },
    update: {},
    create: {
      name: 'Test Tenant',
      domain: 'test.local',
      settings: {
        queryRetentionDays: 90,
        enableAuditLogs: true,
        enablePersonalization: true,
      },
    },
  });

  await client.accessControlRule.createMany({
    data: [
      {
        tenantId: tenant.id,
        ruleType: 'RBAC',
        subjectType: 'role',
        subjectId: 'learner',
        resourceType: 'course',
        permission: 'read',
      },
      {
        tenantId: tenant.id,
        ruleType: 'RBAC',
        subjectType: 'role',
        subjectId: 'trainer',
        resourceType: 'course',
        permission: 'write',
      },
      {
        tenantId: tenant.id,
        ruleType: 'RBAC',
        subjectType: 'role',
        subjectId: 'hr',
        resourceType: 'report',
        permission: 'read',
      },
    ],
    skipDuplicates: true,
  });

  await client.userProfile.createMany({
    data: [
      {
        tenantId: tenant.id,
        userId: 'learner-001',
        role: 'learner',
        department: 'Engineering',
        region: 'US',
        skillGaps: ['JavaScript', 'React'],
        learningProgress: {
          completedCourses: 5,
          inProgressCourses: 2,
        },
        preferences: {
          preferredLanguage: 'en',
          notificationEnabled: true,
        },
      },
      {
        tenantId: tenant.id,
        userId: 'trainer-001',
        role: 'trainer',
        department: 'Education',
        region: 'US',
        skillGaps: [],
        learningProgress: {},
        preferences: {
          preferredLanguage: 'en',
        },
      },
    ],
    skipDuplicates: true,
  });
}

async function disconnectTestDatabase() {
  const client = await getPrismaClient();
  if (!client) {
    return;
  }

  await client.$disconnect();
  prismaTestClient = undefined;
}

export { getPrismaClient, cleanupDatabase, seedTestData, disconnectTestDatabase };

