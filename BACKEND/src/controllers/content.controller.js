/**
 * Content Management Controller
 * Handles adding content to the knowledge base
 */

import { logger } from '../utils/logger.util.js';
import { getPrismaClient } from '../config/database.config.js';
import { openai } from '../config/openai.config.js';
import { getOrCreateTenant } from '../services/tenant.service.js';

/**
 * POST /api/debug/add-content
 * Add content to the knowledge base with embeddings
 * 
 * Body:
 * {
 *   "contentId": "unique-content-id",
 *   "contentType": "guide|document|assessment|etc",
 *   "contentText": "The content text...",
 *   "metadata": { "title": "...", "tags": [...] },
 *   "tenant_id": "default.local" (optional)
 * }
 */
export async function addContent(req, res, next) {
  try {
    const { contentId, contentType, contentText, metadata = {}, tenant_id = 'default.local' } = req.body;

    // Validation
    if (!contentId || !contentType || !contentText) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'contentId, contentType, and contentText are required',
      });
    }

    logger.info('Adding content to knowledge base', {
      contentId,
      contentType,
      textLength: contentText.length,
      tenant_id,
    });

    // Get or create tenant
    const tenant = await getOrCreateTenant(tenant_id);

    // Create embedding using OpenAI
    let embedding;
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: contentText,
      });
      embedding = response.data[0].embedding;
      
      if (embedding.length !== 1536) {
        throw new Error(`Invalid embedding dimensions: ${embedding.length} (expected 1536)`);
      }
    } catch (embedError) {
      logger.error('Failed to create embedding', { error: embedError.message });
      return res.status(500).json({
        error: 'Failed to create embedding',
        message: embedError.message,
      });
    }

    // Insert into database
    const prisma = await getPrismaClient();
    const embeddingArray = `[${embedding.join(',')}]`;

    // Check if record already exists
    const existing = await prisma.$queryRawUnsafe(
      `SELECT id FROM vector_embeddings 
       WHERE tenant_id = $1 AND content_id = $2 AND chunk_index = $3`,
      tenant.id,
      contentId,
      req.body.chunkIndex || 0
    );

    let result;
    if (existing && existing.length > 0) {
      // Update existing record
      result = await prisma.$queryRawUnsafe(
        `UPDATE vector_embeddings SET
          content_text = $4,
          embedding = $5::vector,
          metadata = $6::jsonb,
          updated_at = NOW()
        WHERE tenant_id = $1 AND content_id = $2 AND chunk_index = $3
        RETURNING id, content_id, content_type`,
        tenant.id,
        contentId,
        req.body.chunkIndex || 0,
        contentText,
        embeddingArray,
        JSON.stringify(metadata)
      );
    } else {
      // Insert new record
      result = await prisma.$queryRawUnsafe(
        `INSERT INTO vector_embeddings (
          id, tenant_id, content_id, content_type, embedding,
          content_text, chunk_index, metadata, created_at, updated_at
        ) VALUES (
          gen_random_uuid()::text, $1, $2, $3, $4::vector,
          $5, $6, $7::jsonb, NOW(), NOW()
        )
        RETURNING id, content_id, content_type`,
        tenant.id,
        contentId,
        contentType,
        embeddingArray,
        contentText,
        req.body.chunkIndex || 0,
        JSON.stringify(metadata)
      );
    }

    logger.info('Content added successfully', {
      contentId,
      contentType,
      tenant_id: tenant.id,
    });

    res.json({
      success: true,
      message: 'Content added successfully',
      data: {
        id: result[0].id,
        contentId: result[0].content_id,
        contentType: result[0].content_type,
        tenantId: tenant.id,
        action: existing && existing.length > 0 ? 'updated' : 'inserted',
      },
    });
  } catch (error) {
    logger.error('Add content error', {
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
}

/**
 * POST /api/debug/add-js-prerequisites
 * Add JavaScript prerequisites content (convenience endpoint)
 */
export async function addJsPrerequisites(req, res, next) {
  try {
    const tenant_id = req.body.tenant_id || 'default.local';
    
    logger.info('Adding JavaScript prerequisites content', { tenant_id });

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

    const results = [];
    const errors = [];

    for (const content of prerequisitesContent) {
      try {
        // Create embedding
        const response = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: content.contentText,
        });
        const embedding = response.data[0].embedding;

        // Get tenant
        const tenant = await getOrCreateTenant(tenant_id);

        // Insert into database
        const prisma = await getPrismaClient();
        const embeddingArray = `[${embedding.join(',')}]`;

        // Check if record already exists
        const existing = await prisma.$queryRawUnsafe(
          `SELECT id FROM vector_embeddings 
           WHERE tenant_id = $1 AND content_id = $2 AND chunk_index = $3`,
          tenant.id,
          content.contentId,
          content.chunkIndex
        );

        let result;
        if (existing && existing.length > 0) {
          // Update existing record
          result = await prisma.$queryRawUnsafe(
            `UPDATE vector_embeddings SET
              content_text = $4,
              embedding = $5::vector,
              metadata = $6::jsonb,
              updated_at = NOW()
            WHERE tenant_id = $1 AND content_id = $2 AND chunk_index = $3
            RETURNING id, content_id, content_type`,
            tenant.id,
            content.contentId,
            content.chunkIndex,
            content.contentText,
            embeddingArray,
            JSON.stringify(content.metadata)
          );
        } else {
          // Insert new record
          result = await prisma.$queryRawUnsafe(
            `INSERT INTO vector_embeddings (
              id, tenant_id, content_id, content_type, embedding,
              content_text, chunk_index, metadata, created_at, updated_at
            ) VALUES (
              gen_random_uuid()::text, $1, $2, $3, $4::vector,
              $5, $6, $7::jsonb, NOW(), NOW()
            )
            RETURNING id, content_id, content_type`,
            tenant.id,
            content.contentId,
            content.contentType,
            embeddingArray,
            content.contentText,
            content.chunkIndex,
            JSON.stringify(content.metadata)
          );
        }

        results.push({
          contentId: result[0].content_id,
          contentType: result[0].content_type,
          chunkIndex: content.chunkIndex,
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        errors.push({
          contentId: content.contentId,
          chunkIndex: content.chunkIndex,
          error: error.message,
        });
        logger.error('Failed to add content chunk', {
          contentId: content.contentId,
          chunkIndex: content.chunkIndex,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: `Added ${results.length} content chunks`,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error('Add JS prerequisites error', {
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
}

