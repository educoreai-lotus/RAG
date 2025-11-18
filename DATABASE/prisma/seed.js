/**
 * Prisma seed script
 * Populates database with initial test data
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create default tenant
  const tenant = await prisma.tenant.upsert({
    where: { domain: 'dev.educore.local' },
    update: {},
    create: {
      name: 'Development Tenant',
      domain: 'dev.educore.local',
      settings: {
        queryRetentionDays: 90,
        enableAuditLogs: true,
        enablePersonalization: true,
      },
    },
  });

  console.log('✅ Created tenant:', tenant.domain);

  // 2. Create sample microservices (9-10 microservices)
  const microservices = [
    {
      name: 'assessment',
      serviceId: 'assessment',
      displayName: 'Assessment Service',
      description: 'Handles assessments, quizzes, and evaluations',
      apiEndpoint: 'https://assessment.educore.local/api',
      version: '1.0.0',
      isActive: true,
    },
    {
      name: 'devlab',
      serviceId: 'devlab',
      displayName: 'DevLab Service',
      description: 'Development lab environment and coding exercises',
      apiEndpoint: 'https://devlab.educore.local/api',
      version: '1.0.0',
      isActive: true,
    },
    {
      name: 'content',
      serviceId: 'content',
      displayName: 'Content Management Service',
      description: 'Manages learning content, courses, and materials',
      apiEndpoint: 'https://content.educore.local/api',
      version: '1.0.0',
      isActive: true,
    },
    {
      name: 'analytics',
      serviceId: 'analytics',
      displayName: 'Analytics Service',
      description: 'Learning analytics and progress tracking',
      apiEndpoint: 'https://analytics.educore.local/api',
      version: '1.0.0',
      isActive: true,
    },
    {
      name: 'user-management',
      serviceId: 'user-management',
      displayName: 'User Management Service',
      description: 'User accounts, profiles, and authentication',
      apiEndpoint: 'https://users.educore.local/api',
      version: '1.0.0',
      isActive: true,
    },
    {
      name: 'notification',
      serviceId: 'notification',
      displayName: 'Notification Service',
      description: 'Sends notifications and alerts to users',
      apiEndpoint: 'https://notifications.educore.local/api',
      version: '1.0.0',
      isActive: true,
    },
    {
      name: 'reporting',
      serviceId: 'reporting',
      displayName: 'Reporting Service',
      description: 'Generates reports and analytics dashboards',
      apiEndpoint: 'https://reporting.educore.local/api',
      version: '1.0.0',
      isActive: true,
    },
    {
      name: 'integration',
      serviceId: 'integration',
      displayName: 'Integration Service',
      description: 'Third-party integrations and API management',
      apiEndpoint: 'https://integration.educore.local/api',
      version: '1.0.0',
      isActive: true,
    },
    {
      name: 'ai-assistant',
      serviceId: 'ai-assistant',
      displayName: 'AI Assistant Service',
      description: 'RAG microservice - Contextual AI assistant (this service)',
      apiEndpoint: 'https://ai-assistant.educore.local/api',
      version: '1.0.0',
      isActive: true,
    },
    {
      name: 'gateway',
      serviceId: 'gateway',
      displayName: 'API Gateway',
      description: 'API Gateway for routing and load balancing',
      apiEndpoint: 'https://gateway.educore.local/api',
      version: '1.0.0',
      isActive: true,
    },
  ];

  const createdMicroservices = {};
  for (const microservice of microservices) {
    const created = await prisma.microservice.upsert({
      where: { serviceId: microservice.serviceId },
      update: {},
      create: {
        ...microservice,
        tenantId: tenant.id,
        settings: {},
        metadata: {},
      },
    });
    createdMicroservices[microservice.serviceId] = created;
    console.log(`✅ Created microservice: ${created.displayName}`);
  }

  // 3. Create sample access control rules
  const rbacRules = [
    {
      ruleType: 'RBAC',
      subjectType: 'role',
      subjectId: 'learner',
      resourceType: 'course',
      resourceId: null,
      permission: 'read',
      isActive: true,
    },
    {
      ruleType: 'RBAC',
      subjectType: 'role',
      subjectId: 'trainer',
      resourceType: 'course',
      resourceId: null,
      permission: 'write',
      isActive: true,
    },
    {
      ruleType: 'RBAC',
      subjectType: 'role',
      subjectId: 'hr',
      resourceType: 'report',
      resourceId: null,
      permission: 'read',
      isActive: true,
    },
  ];

  for (const rule of rbacRules) {
    await prisma.accessControlRule.create({
      data: {
        ...rule,
        tenantId: tenant.id,
      },
    });
  }

  console.log('✅ Created access control rules');

  // 4. Create sample user profiles
  const users = [
    {
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
  ];

  for (const user of users) {
    await prisma.userProfile.upsert({
      where: { userId: user.userId },
      update: {},
      create: {
        ...user,
        tenantId: tenant.id,
      },
    });
  }

  console.log('✅ Created user profiles');

  // 4b. Create additional realistic users (with names in metadata) including an admin
  const moreUsers = [
    {
      userId: 'admin-001',
      role: 'admin',
      department: 'IT',
      region: 'IL',
      skillGaps: [],
      learningProgress: {},
      preferences: { preferredLanguage: 'he' },
      metadata: { fullName: 'Adi Cohen', title: 'IT Administrator' },
    },
    {
      userId: 'manager-001',
      role: 'manager',
      department: 'Engineering',
      region: 'IL',
      skillGaps: ['People Management'],
      learningProgress: {},
      preferences: { preferredLanguage: 'he' },
      metadata: { fullName: 'Eden Levi', title: 'Engineering Manager' },
    },
    {
      userId: 'employee-001',
      role: 'employee',
      department: 'Engineering',
      region: 'IL',
      skillGaps: ['React', 'Testing'],
      learningProgress: { completedCourses: 2, inProgressCourses: 1 },
      preferences: { preferredLanguage: 'he' },
      metadata: { fullName: 'Noa Bar', title: 'Frontend Developer' },
    },
  ];

  for (const user of moreUsers) {
    await prisma.userProfile.upsert({
      where: { userId: user.userId },
      update: {},
      create: {
        tenantId: tenant.id,
        userId: user.userId,
        role: user.role,
        department: user.department,
        region: user.region,
        skillGaps: user.skillGaps,
        learningProgress: user.learningProgress,
        preferences: user.preferences,
        metadata: user.metadata,
      },
    });
  }

  console.log('✅ Created additional realistic users (admin/manager/employee)');

  // 5. Create sample knowledge graph nodes
  const courseNode = await prisma.knowledgeGraphNode.upsert({
    where: { nodeId: 'course:js-basics-101' },
    update: {},
    create: {
      tenantId: tenant.id,
      nodeId: 'course:js-basics-101',
      nodeType: 'course',
      properties: {
        title: 'JavaScript Basics 101',
        description: 'Introduction to JavaScript programming',
        duration: 3600,
        level: 'beginner',
        tags: ['javascript', 'programming', 'basics'],
      },
    },
  });

  const skillNode = await prisma.knowledgeGraphNode.upsert({
    where: { nodeId: 'skill:javascript' },
    update: {},
    create: {
      tenantId: tenant.id,
      nodeId: 'skill:javascript',
      nodeType: 'skill',
      properties: {
        name: 'JavaScript',
        category: 'programming',
        difficulty: 'intermediate',
      },
    },
  });

  const userNode = await prisma.knowledgeGraphNode.upsert({
    where: { nodeId: 'user:learner-001' },
    update: {},
    create: {
      tenantId: tenant.id,
      nodeId: 'user:learner-001',
      nodeType: 'user',
      properties: {
        name: 'John Doe',
        role: 'learner',
        department: 'Engineering',
      },
    },
  });

  console.log('✅ Created knowledge graph nodes');

  // 6. Create sample knowledge graph edges
  await prisma.knowledgeGraphEdge.createMany({
    data: [
      {
        tenantId: tenant.id,
        sourceNodeId: courseNode.nodeId,
        targetNodeId: skillNode.nodeId,
        edgeType: 'teaches',
        weight: 0.9,
        properties: {
          confidence: 0.95,
        },
      },
      {
        tenantId: tenant.id,
        sourceNodeId: userNode.nodeId,
        targetNodeId: courseNode.nodeId,
        edgeType: 'enrolled_in',
        weight: 1.0,
        properties: {
          enrolledAt: new Date().toISOString(),
          status: 'in_progress',
        },
      },
      {
        tenantId: tenant.id,
        sourceNodeId: userNode.nodeId,
        targetNodeId: skillNode.nodeId,
        edgeType: 'learning',
        weight: 0.5,
        properties: {
          progress: 0.3,
        },
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Created knowledge graph edges');

  // 7. Create sample vector embeddings with microservice_id
  // Note: Using raw SQL because Prisma doesn't support vector type directly
  console.log('Creating sample vector embeddings...');
  
  const sampleEmbeddings = [
    {
      contentId: 'guide-get-started',
      contentType: 'guide',
      microserviceId: createdMicroservices['content'].id,
      contentText:
        'EDUCORE – Getting Started Guide: 1) Data-first: answers come from your Supabase database via vector_embeddings; ensure seed ran and pgvector is enabled (CREATE EXTENSION IF NOT EXISTS vector;). 2) Normal Chat: call /api/v1/query with no support flags; strict RAG uses only retrieved context; if no context, a dynamic no-data message is returned. 3) Support Mode (Assessment/DevLab): enable SUPPORT_MODE_ENABLED=true and send an explicit signal per request (X-Source: assessment|devlab or support_mode or metadata.source); optionally set VITE_DEFAULT_SUPPORT_MODE on frontend. 4) Security gating: SUPPORT_ALLOWED_ORIGINS and SUPPORT_SHARED_SECRET (header X-Embed-Secret). 5) Verify persistence in queries, query_sources, and vector_embeddings. Endpoints: /api/v1/query, /api/assessment/support, /api/devlab/support.',
      chunkIndex: 0,
      embedding: Array(1536).fill(0).map(() => Math.random() * 2 - 1),
      metadata: {
        title: 'Get Started Guide',
        category: 'guide',
        tags: ['get started', 'guide', 'educore', 'setup', 'support mode', 'rag'],
      },
    },
    {
      contentId: 'assessment-001',
      contentType: 'assessment',
      microserviceId: createdMicroservices['assessment'].id,
      contentText: 'JavaScript Fundamentals Assessment: Test your knowledge of variables, functions, and control flow in JavaScript.',
      chunkIndex: 0,
      // Mock embedding (1536 dimensions) - in real scenario, use OpenAI embeddings
      embedding: Array(1536).fill(0).map(() => Math.random() * 2 - 1), // Random values between -1 and 1
      metadata: {
        title: 'JavaScript Fundamentals Assessment',
        difficulty: 'beginner',
        duration: 1800,
      },
    },
    {
      contentId: 'devlab-exercise-001',
      contentType: 'exercise',
      microserviceId: createdMicroservices['devlab'].id,
      contentText: 'Build a simple calculator using JavaScript. Practice DOM manipulation and event handling.',
      chunkIndex: 0,
      embedding: Array(1536).fill(0).map(() => Math.random() * 2 - 1),
      metadata: {
        title: 'JavaScript Calculator Exercise',
        type: 'coding',
        difficulty: 'intermediate',
      },
    },
    {
      contentId: 'course-js-basics-101',
      contentType: 'document',
      microserviceId: createdMicroservices['content'].id,
      contentText: 'JavaScript Basics Course: Learn the fundamentals of JavaScript programming including variables, data types, functions, and control structures.',
      chunkIndex: 0,
      embedding: Array(1536).fill(0).map(() => Math.random() * 2 - 1),
      metadata: {
        title: 'JavaScript Basics Course',
        courseId: 'js-basics-101',
        section: 'introduction',
      },
    },
    {
      contentId: 'course-js-basics-101',
      contentType: 'document',
      microserviceId: createdMicroservices['content'].id,
      contentText: 'Advanced JavaScript Topics: Explore closures, promises, async/await, and modern ES6+ features.',
      chunkIndex: 1,
      embedding: Array(1536).fill(0).map(() => Math.random() * 2 - 1),
      metadata: {
        title: 'JavaScript Basics Course',
        courseId: 'js-basics-101',
        section: 'advanced',
      },
    },
    {
      contentId: 'analytics-report-001',
      contentType: 'report',
      microserviceId: createdMicroservices['analytics'].id,
      contentText: 'Learning Progress Report: Track your progress across all courses and identify areas for improvement.',
      chunkIndex: 0,
      embedding: Array(1536).fill(0).map(() => Math.random() * 2 - 1),
      metadata: {
        title: 'Learning Progress Report',
        reportType: 'progress',
        userId: 'learner-001',
      },
    },
    // User profiles as retrievable content (visible only to admin by backend rule)
    {
      contentId: 'user:admin-001',
      contentType: 'user_profile',
      microserviceId: createdMicroservices['user-management'].id,
      contentText: 'User Profile: Adi Cohen (admin). Department: IT. Region: IL. Title: IT Administrator. Responsibilities: system operations, security reviews, access control.',
      chunkIndex: 0,
      embedding: Array(1536).fill(0).map(() => Math.random() * 2 - 1),
      metadata: {
        fullName: 'Adi Cohen',
        role: 'admin',
        department: 'IT',
        region: 'IL',
        title: 'IT Administrator',
      },
    },
    {
      contentId: 'user:manager-001',
      contentType: 'user_profile',
      microserviceId: createdMicroservices['user-management'].id,
      contentText: 'User Profile: Eden Levi (manager). Department: Engineering. Region: IL. Title: Engineering Manager. Focus: delivery, mentoring, planning.',
      chunkIndex: 0,
      embedding: Array(1536).fill(0).map(() => Math.random() * 2 - 1),
      metadata: {
        fullName: 'Eden Levi',
        role: 'manager',
        department: 'Engineering',
        region: 'IL',
        title: 'Engineering Manager',
      },
    },
    {
      contentId: 'user:employee-001',
      contentType: 'user_profile',
      microserviceId: createdMicroservices['user-management'].id,
      contentText: 'User Profile: Noa Bar (employee). Department: Engineering. Region: IL. Title: Frontend Developer. Skills: JavaScript, CSS. Learning: React, Testing.',
      chunkIndex: 0,
      embedding: Array(1536).fill(0).map(() => Math.random() * 2 - 1),
      metadata: {
        fullName: 'Noa Bar',
        role: 'employee',
        department: 'Engineering',
        region: 'IL',
        title: 'Frontend Developer',
      },
    },
  ];

  for (const embedding of sampleEmbeddings) {
    try {
      const embeddingArray = `[${embedding.embedding.join(',')}]`;
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO vector_embeddings (
          id,
          tenant_id,
          microservice_id,
          content_id,
          content_type,
          embedding,
          content_text,
          chunk_index,
          metadata,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid()::text,
          $1,
          $2,
          $3,
          $4,
          $5::vector,
          $6,
          $7,
          $8::jsonb,
          NOW(),
          NOW()
        )
        `,
        tenant.id,
        embedding.microserviceId,
        embedding.contentId,
        embedding.contentType,
        embeddingArray,
        embedding.contentText,
        embedding.chunkIndex,
        JSON.stringify(embedding.metadata)
      );
    } catch (error) {
      // Skip if already exists or other error
      console.log(`⚠️  Skipped embedding for ${embedding.contentId} (may already exist)`);
    }
  }

  console.log(`✅ Created ${sampleEmbeddings.length} sample vector embeddings with microservice tracking`);

  // 8. Create sample queries
  const sampleQuery = await prisma.query.create({
    data: {
      tenantId: tenant.id,
      userId: 'learner-001',
      sessionId: 'session-001',
      queryText: 'How do I start learning JavaScript?',
      answer: 'JavaScript is a versatile programming language. Start with the basics: variables, functions, and control flow. Then move on to DOM manipulation and async programming.',
      confidenceScore: 0.85,
      processingTimeMs: 450,
      modelVersion: 'gpt-4.1-mini',
      isPersonalized: true,
      isCached: false,
      metadata: {
        sourcesCount: 3,
        topK: 5,
      },
      sources: {
        create: [
          {
            sourceId: 'course:js-basics-101',
            sourceType: 'course',
            sourceMicroservice: 'content', // Track which microservice provided this source
            title: 'JavaScript Basics 101',
            contentSnippet: 'Introduction to JavaScript programming...',
            sourceUrl: '/courses/js-basics-101',
            relevanceScore: 0.92,
            metadata: {
              section: 'getting-started',
            },
          },
          {
            sourceId: 'assessment-001',
            sourceType: 'assessment',
            sourceMicroservice: 'assessment', // From Assessment Service
            title: 'JavaScript Fundamentals Assessment',
            contentSnippet: 'Test your knowledge of variables, functions...',
            sourceUrl: '/assessments/js-fundamentals',
            relevanceScore: 0.88,
            metadata: {
              difficulty: 'beginner',
            },
          },
        ],
      },
      recommendations: {
        create: [
          {
            recommendationType: 'course',
            recommendationId: 'course:js-advanced-201',
            title: 'JavaScript Advanced 201',
            description: 'Advanced JavaScript concepts and patterns',
            reason: 'Build on your JavaScript basics',
            priority: 1,
            metadata: {
              estimatedTime: 4800,
            },
          },
        ],
      },
    },
  });

  console.log('✅ Created sample query with sources and recommendations');

  console.log('');
  console.log('✅ Seeding complete!');
  console.log(`✅ Created tenant: ${tenant.domain} (${tenant.id})`);
  console.log(`✅ Created ${microservices.length} microservices`);
  console.log(`✅ Created ${sampleEmbeddings.length} vector embeddings with microservice tracking`);
  console.log('');
  console.log('📊 Summary:');
  console.log(`   - Tenant: ${tenant.domain}`);
  console.log(`   - Microservices: ${microservices.length}`);
  console.log(`   - Vector Embeddings: ${sampleEmbeddings.length}`);
  console.log(`   - User Profiles: ${users.length}`);
  console.log(`   - Knowledge Graph Nodes: 3`);
  console.log(`   - Knowledge Graph Edges: 3`);
  console.log(`   - Access Control Rules: ${rbacRules.length}`);
  console.log(`   - Sample Queries: 1`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });




