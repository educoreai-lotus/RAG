/**
 * Script to add JavaScript prerequisites content to the database
 * 
 * This script adds comprehensive content about JavaScript course prerequisites
 * to help users understand what they need to know before starting the course.
 * 
 * Usage:
 *   cd BACKEND
 *   node scripts/add-js-prerequisites.js
 * 
 * Environment variables:
 *   OPENAI_API_KEY - OpenAI API key (required)
 *   DATABASE_URL - Database connection string (required)
 */

import { getPrismaClient } from '../src/config/database.config.js';
import { openai } from '../src/config/openai.config.js';
import { logger } from '../src/utils/logger.util.js';
import { getOrCreateTenant } from '../src/services/tenant.service.js';

// JavaScript Prerequisites content to add
const prerequisitesContent = [
  {
    contentId: 'js-prerequisites-guide',
    contentType: 'guide',
    contentText: 'JavaScript Course Prerequisites: Before starting the JavaScript course, you should have basic computer skills and familiarity with using a text editor. While no prior programming experience is required, having basic HTML and CSS knowledge is helpful. Understanding concepts like variables, functions, and basic logic will make learning JavaScript easier. You should be comfortable with using a web browser and have basic problem-solving skills. The course starts from the fundamentals, so beginners are welcome.',
    chunkIndex: 0,
    metadata: {
      title: 'JavaScript Course Prerequisites Guide',
      category: 'prerequisites',
      courseId: 'js-basics-101',
      tags: ['javascript', 'prerequisites', 'requirements', 'getting started', 'beginner'],
    },
  },
  {
    contentId: 'js-prerequisites-guide',
    contentType: 'guide',
    contentText: 'What You Need to Know Before JavaScript Course: Essential prerequisites include basic computer literacy, understanding of how to use a text editor or code editor, and familiarity with web browsers. Recommended but not required: basic HTML knowledge (understanding tags, attributes, document structure), basic CSS knowledge (styling, selectors, properties), and logical thinking skills. The course covers JavaScript fundamentals from scratch, so no prior JavaScript experience is needed. Having a growth mindset and willingness to practice coding exercises will help you succeed.',
    chunkIndex: 1,
    metadata: {
      title: 'JavaScript Course Prerequisites Guide',
      category: 'prerequisites',
      courseId: 'js-basics-101',
      tags: ['javascript', 'prerequisites', 'requirements', 'html', 'css', 'beginner'],
    },
  },
  {
    contentId: 'js-prerequisites-detailed',
    contentType: 'document',
    contentText: 'Detailed JavaScript Prerequisites: Required Skills: Basic computer operation (file management, using applications), Text editor usage (VS Code, Sublime Text, or similar), Web browser familiarity (Chrome, Firefox, or Edge). Recommended Skills: HTML basics (tags like div, span, p, attributes, document structure), CSS basics (selectors, properties, styling), Logical thinking and problem-solving. Optional but Helpful: Experience with any programming language, Understanding of algorithms and data structures, Familiarity with command line. The JavaScript course is designed for beginners and will teach everything from variables to advanced topics step by step.',
    chunkIndex: 0,
    metadata: {
      title: 'JavaScript Prerequisites - Detailed Guide',
      category: 'prerequisites',
      courseId: 'js-basics-101',
      difficulty: 'beginner',
      tags: ['javascript', 'prerequisites', 'requirements', 'skills', 'beginner guide'],
    },
  },
];

/**
 * Create OpenAI embedding for text
 */
async function createEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    logger.error('Failed to create embedding', { error: error.message });
    throw error;
  }
}

/**
 * Insert vector embedding into database
 */
async function insertVectorEmbedding(tenantId, data, embedding) {
  try {
    const prisma = await getPrismaClient();
    const embeddingArray = `[${embedding.join(',')}]`;

    // Check if record already exists
    const existing = await prisma.$queryRawUnsafe(
      `SELECT id FROM vector_embeddings 
       WHERE tenant_id = $1 AND content_id = $2 AND chunk_index = $3`,
      tenantId,
      data.contentId,
      data.chunkIndex
    );

    if (existing && existing.length > 0) {
      // Update existing record
      const result = await prisma.$queryRawUnsafe(
        `UPDATE vector_embeddings SET
          content_text = $4,
          embedding = $5::vector,
          metadata = $6::jsonb,
          updated_at = NOW()
        WHERE tenant_id = $1 AND content_id = $2 AND chunk_index = $3
        RETURNING id, content_id, content_type`,
        tenantId,
        data.contentId,
        data.chunkIndex,
        data.contentText,
        embeddingArray,
        JSON.stringify(data.metadata)
      );
      return result[0];
    } else {
      // Insert new record
      const result = await prisma.$queryRawUnsafe(
        `INSERT INTO vector_embeddings (
          id, tenant_id, content_id, content_type, embedding,
          content_text, chunk_index, metadata, created_at, updated_at
        ) VALUES (
          gen_random_uuid()::text, $1, $2, $3, $4::vector,
          $5, $6, $7::jsonb, NOW(), NOW()
        )
        RETURNING id, content_id, content_type`,
        tenantId,
        data.contentId,
        data.contentType,
        embeddingArray,
        data.contentText,
        data.chunkIndex,
        JSON.stringify(data.metadata)
      );
      return result[0];
    }
  } catch (error) {
    logger.error('Failed to insert vector embedding', {
      error: error.message,
      contentId: data.contentId,
    });
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('\n🚀 Adding JavaScript Prerequisites Content...\n');

    // Get or create tenant
    const tenant = await getOrCreateTenant('default.local');
    console.log(`✅ Tenant: ${tenant.domain} (${tenant.id})\n`);

    let successCount = 0;
    let errorCount = 0;

    // Process each item
    for (let i = 0; i < prerequisitesContent.length; i++) {
      const data = prerequisitesContent[i];
      console.log(`[${i + 1}/${prerequisitesContent.length}] Processing: ${data.contentId} (chunk ${data.chunkIndex})`);

      try {
        // Create embedding
        const embedding = await createEmbedding(data.contentText);
        
        if (embedding.length !== 1536) {
          throw new Error(`Invalid embedding dimensions: ${embedding.length} (expected 1536)`);
        }

        // Insert into database
        const result = await insertVectorEmbedding(tenant.id, data, embedding);
        
        console.log(`   ✅ Inserted/Updated: ${result.content_id}`);
        successCount++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('='.repeat(60) + '\n');

    // Verify content was added
    const prisma = await getPrismaClient();
    const check = await prisma.$queryRawUnsafe(
      `SELECT content_id, content_type, chunk_index, metadata->>'title' as title
       FROM vector_embeddings
       WHERE content_id LIKE 'js-prerequisites%' AND tenant_id = $1
       ORDER BY content_id, chunk_index`,
      tenant.id
    );

    if (check.length > 0) {
      console.log('✅ Prerequisites content verified:');
      check.forEach(row => {
        console.log(`   - ${row.title || 'Untitled'} (${row.content_id}, chunk ${row.chunk_index || 0})`);
      });
    }

    console.log('\n📝 Content added successfully!');
    console.log('   You can now query: "What do I need to know before the JavaScript course?"\n');

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

