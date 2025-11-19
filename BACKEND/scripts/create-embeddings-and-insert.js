/**
 * Script to create real OpenAI embeddings and insert into Supabase
 * 
 * This script:
 * 1. Creates real embeddings using OpenAI API
 * 2. Inserts them into vector_embeddings table
 * 3. Verifies the embeddings are correct
 * 
 * Usage: 
 *   node scripts/create-embeddings-and-insert.js
 *   or with API key: node scripts/create-embeddings-and-insert.js <OPENAI_API_KEY>
 * 
 * Environment variables:
 *   OPENAI_API_KEY - OpenAI API key (required)
 *   DATABASE_URL - Database connection string (required)
 */

// Load environment variables from .env file if it exists (for local development)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load .env file if it exists
try {
  const envPath = join(__dirname, '../../.env');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value.replace(/^["']|["']$/g, '');
      }
    }
  });
} catch (error) {
  // .env file doesn't exist, that's okay - use environment variables
}

// Allow API key to be passed as command line argument
if (process.argv[2] && !process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = process.argv[2];
}

import { getPrismaClient } from '../src/config/database.config.js';
import { openai } from '../src/config/openai.config.js';
import { logger } from '../src/utils/logger.util.js';
import { getOrCreateTenant } from '../src/services/tenant.service.js';

// Data to insert (from seed.js)
const dataToInsert = [
  {
    contentId: 'guide-get-started',
    contentType: 'guide',
    contentText: 'EDUCORE – Getting Started Guide: 1) Data-first: answers come from your Supabase database via vector_embeddings; ensure seed ran and pgvector is enabled (CREATE EXTENSION IF NOT EXISTS vector;). 2) Normal Chat: call /api/v1/query with no support flags; strict RAG uses only retrieved context; if no context, a dynamic no-data message is returned. 3) Support Mode (Assessment/DevLab): enable SUPPORT_MODE_ENABLED=true and send an explicit signal per request (X-Source: assessment|devlab or support_mode or metadata.source); optionally set VITE_DEFAULT_SUPPORT_MODE on frontend. 4) Security gating: SUPPORT_ALLOWED_ORIGINS and SUPPORT_SHARED_SECRET (header X-Embed-Secret). 5) Verify persistence in queries, query_sources, and vector_embeddings. Endpoints: /api/v1/query, /api/assessment/support, /api/devlab/support.',
    chunkIndex: 0,
    metadata: {
      title: 'Get Started Guide',
      category: 'guide',
      tags: ['get started', 'guide', 'educore', 'setup', 'support mode', 'rag'],
    },
  },
  {
    contentId: 'assessment-001',
    contentType: 'assessment',
    contentText: 'JavaScript Fundamentals Assessment: Test your knowledge of variables, functions, and control flow in JavaScript.',
    chunkIndex: 0,
    metadata: {
      title: 'JavaScript Fundamentals Assessment',
      difficulty: 'beginner',
      duration: 1800,
    },
  },
  {
    contentId: 'devlab-exercise-001',
    contentType: 'exercise',
    contentText: 'Build a simple calculator using JavaScript. Practice DOM manipulation and event handling.',
    chunkIndex: 0,
    metadata: {
      title: 'JavaScript Calculator Exercise',
      type: 'coding',
      difficulty: 'intermediate',
    },
  },
  {
    contentId: 'course-js-basics-101',
    contentType: 'document',
    contentText: 'JavaScript Basics Course: Learn the fundamentals of JavaScript programming including variables, data types, functions, and control structures.',
    chunkIndex: 0,
    metadata: {
      title: 'JavaScript Basics Course',
      courseId: 'js-basics-101',
      section: 'introduction',
    },
  },
  {
    contentId: 'course-js-basics-101',
    contentType: 'document',
    contentText: 'Advanced JavaScript Topics: Explore closures, promises, async/await, and modern ES6+ features.',
    chunkIndex: 1,
    metadata: {
      title: 'JavaScript Basics Course',
      courseId: 'js-basics-101',
      section: 'advanced',
    },
  },
  {
    contentId: 'analytics-report-001',
    contentType: 'report',
    contentText: 'Learning Progress Report: Track your progress across all courses and identify areas for improvement.',
    chunkIndex: 0,
    metadata: {
      title: 'Learning Progress Report',
      reportType: 'progress',
      userId: 'learner-001',
    },
  },
  {
    contentId: 'user:admin-001',
    contentType: 'user_profile',
    contentText: 'User Profile: Adi Cohen (admin). Department: IT. Region: IL. Title: IT Administrator. Responsibilities: system operations, security reviews, access control.',
    chunkIndex: 0,
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
    contentText: 'User Profile: Eden Levi (manager). Department: Engineering. Region: IL. Title: Engineering Manager. Focus: delivery, mentoring, planning.',
    chunkIndex: 0,
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
    contentText: 'User Profile: Noa Bar (employee). Department: Engineering. Region: IL. Title: Frontend Developer. Skills: JavaScript, CSS. Learning: React, Testing.',
    chunkIndex: 0,
    metadata: {
      fullName: 'Noa Bar',
      role: 'employee',
      department: 'Engineering',
      region: 'IL',
      title: 'Frontend Developer',
    },
  },
];

/**
 * Create OpenAI embedding for text
 */
async function createEmbedding(text) {
  try {
    logger.info('Creating OpenAI embedding', { textLength: text.length });
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    const embedding = response.data[0].embedding;
    
    logger.info('Embedding created', { 
      dimensions: embedding.length,
      model: 'text-embedding-ada-002',
    });

    return embedding;
  } catch (error) {
    logger.error('Failed to create embedding', {
      error: error.message,
      textLength: text.length,
    });
    throw error;
  }
}

/**
 * Get or create microservice
 */
async function getOrCreateMicroservice(tenantId, serviceName) {
  try {
    const prisma = await getPrismaClient();
    
    // Try to find existing microservice
    const existing = await prisma.microservice.findFirst({
      where: {
        tenantId,
        name: serviceName,
      },
    });

    if (existing) {
      return existing.id;
    }

    // Create new microservice if not found
    const microservice = await prisma.microservice.create({
      data: {
        tenantId,
        name: serviceName,
        serviceId: `${serviceName}-${tenantId}`,
        displayName: serviceName.charAt(0).toUpperCase() + serviceName.slice(1),
        isActive: true,
      },
    });

    return microservice.id;
  } catch (error) {
    logger.warn('Failed to get/create microservice, continuing without it', {
      error: error.message,
      serviceName,
    });
    return null; // Return null if microservice creation fails
  }
}

/**
 * Insert vector embedding into database
 */
async function insertVectorEmbedding(tenantId, data, embedding, microserviceId = null) {
  try {
    const prisma = await getPrismaClient();
    
    // Convert embedding array to PostgreSQL vector format
    const embeddingArray = `[${embedding.join(',')}]`;

    // Build query with or without microservice_id
    const hasMicroservice = microserviceId !== null;
    const query = hasMicroservice ? `
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
      ON CONFLICT (tenant_id, content_id, chunk_index) 
      DO UPDATE SET
        content_text = EXCLUDED.content_text,
        embedding = EXCLUDED.embedding,
        metadata = EXCLUDED.metadata,
        microservice_id = EXCLUDED.microservice_id,
        updated_at = NOW()
      RETURNING id, content_id, content_type
    ` : `
      INSERT INTO vector_embeddings (
        id,
        tenant_id,
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
        $4::vector,
        $5,
        $6,
        $7::jsonb,
        NOW(),
        NOW()
      )
      ON CONFLICT (tenant_id, content_id, chunk_index) 
      DO UPDATE SET
        content_text = EXCLUDED.content_text,
        embedding = EXCLUDED.embedding,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING id, content_id, content_type
    `;

    const params = hasMicroservice
      ? [tenantId, microserviceId, data.contentId, data.contentType, embeddingArray, data.contentText, data.chunkIndex, JSON.stringify(data.metadata)]
      : [tenantId, data.contentId, data.contentType, embeddingArray, data.contentText, data.chunkIndex, JSON.stringify(data.metadata)];

    const result = await prisma.$queryRawUnsafe(query, ...params);

    return result[0];
  } catch (error) {
    logger.error('Failed to insert vector embedding', {
      error: error.message,
      contentId: data.contentId,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('\n🚀 Starting embedding creation and insertion...\n');

    // Get or create tenant
    const tenant = await getOrCreateTenant('default.local');
    console.log(`✅ Tenant: ${tenant.domain} (${tenant.id})\n`);

    const prisma = await getPrismaClient();

    // Check existing records
    const existingCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM vector_embeddings WHERE tenant_id = ${tenant.id}
    `;
    console.log(`📊 Existing records: ${existingCount[0].count}\n`);

    let successCount = 0;
    let errorCount = 0;

    // Get or create microservices
    const microserviceMap = {
      'guide': 'content',
      'assessment': 'assessment',
      'exercise': 'devlab',
      'document': 'content',
      'report': 'analytics',
      'user_profile': 'user-management',
    };

    const microservices = {};
    for (const [contentType, serviceName] of Object.entries(microserviceMap)) {
      try {
        microservices[contentType] = await getOrCreateMicroservice(tenant.id, serviceName);
        console.log(`✅ Microservice for ${contentType}: ${serviceName}`);
      } catch (error) {
        console.log(`⚠️  Could not get microservice for ${contentType}, continuing without it`);
        microservices[contentType] = null;
      }
    }

    console.log('');

    // Process each item
    for (let i = 0; i < dataToInsert.length; i++) {
      const data = dataToInsert[i];
      console.log(`[${i + 1}/${dataToInsert.length}] Processing: ${data.contentId} (${data.contentType})`);

      try {
        // Create embedding using OpenAI
        const embedding = await createEmbedding(data.contentText);
        
        // Verify embedding dimensions
        if (embedding.length !== 1536) {
          throw new Error(`Invalid embedding dimensions: ${embedding.length} (expected 1536)`);
        }

        // Get microservice ID for this content type
        const microserviceId = microservices[data.contentType] || null;

        // Insert into database
        const result = await insertVectorEmbedding(tenant.id, data, embedding, microserviceId);
        
        console.log(`   ✅ Inserted: ${result.content_id} (${result.content_type})`);
        if (microserviceId) {
          console.log(`   📦 Microservice: ${microserviceId}`);
        }
        successCount++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        if (error.stack) {
          console.error(`   Stack: ${error.stack.split('\n')[0]}`);
        }
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('='.repeat(60) + '\n');

    // Verify "Eden Levi" was inserted
    const edenCheck = await prisma.$queryRaw`
      SELECT 
        content_id,
        content_text,
        metadata->>'fullName' as name,
        metadata->>'role' as role,
        array_length(embedding::float[], 1) as embedding_dimensions
      FROM vector_embeddings
      WHERE content_id = 'user:manager-001' AND tenant_id = ${tenant.id}
    `;

    if (edenCheck.length > 0) {
      console.log('✅ "Eden Levi" verified:');
      console.log(`   Name: ${edenCheck[0].name}`);
      console.log(`   Role: ${edenCheck[0].role}`);
      console.log(`   Embedding dimensions: ${edenCheck[0].embedding_dimensions}`);
    } else {
      console.log('❌ "Eden Levi" not found!');
    }

    // Final count
    const finalCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM vector_embeddings WHERE tenant_id = ${tenant.id}
    `;
    console.log(`\n📊 Total records now: ${finalCount[0].count}\n`);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    const prisma = await getPrismaClient();
    await prisma.$disconnect();
  }
}

// Run
main();

