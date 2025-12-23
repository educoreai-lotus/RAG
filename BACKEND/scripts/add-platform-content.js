/**
 * Script to add platform content to database and knowledge graph
 * 
 * This script:
 * 1. Splits content into paragraphs
 * 2. Generates embeddings for each paragraph
 * 3. Stores them in vector_embeddings table
 * 4. Creates knowledge graph nodes and edges
 * 
 * Usage: 
 *   node scripts/add-platform-content.js
 * 
 * Environment variables:
 *   OPENAI_API_KEY - OpenAI API key (required)
 *   DATABASE_URL - Database connection string (required)
 */

// Load environment variables from .env file if it exists
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

import { getPrismaClient } from '../src/config/database.config.js';
import vectorizer from '../src/core/vectorizer.js';
import kgBuilderService from '../src/services/kgBuilder.service.js';
import { getOrCreateTenant } from '../src/services/tenant.service.js';
import { logger } from '../src/utils/logger.util.js';

// Lotus TechHub tenant information
const LOTUS_TENANT_ID = '5a1cb1d2-343c-438c-9f4b-76f0f1aac59d';
const LOTUS_DOMAIN = 'lotustechhub.com';
const LOTUS_COMPANY_NAME = 'Lotus TechHub';

// Platform content to add
const platformContent = `ABOUT

The platform is an intelligent corporate learning system that unifies people, skills, and content into one continuous learning experience. It enables organizations to design personalized learning paths, create and enrich learning materials, practice and assess knowledge, and measure learning effectiveness in real time. AI-driven engines continuously analyze progress, identify skill gaps, and adapt each learner's journey, while a smart contextual assistant connects organizational knowledge to clear explanations, summaries, and actionable recommendations—turning learning into a measurable, targeted, and business-driven process.

__________________________________________

HOW TO START

Employee / Learner Start by completing your profile so the system understands your role and current skill level. Follow the recommended learning path, engage with the learning materials, complete exercises and assessments, and use the built-in assistant to ask questions or get clarifications. As you progress, the platform adapts the content and pace to help you close skill gaps efficiently.

Manager Begin by reviewing your team's profiles and skill landscape. Assign or approve learning paths aligned with team goals, monitor progress and performance, and use insights to identify strengths, gaps, and risks. The system supports data-driven decisions for upskilling, reskilling, and team development.

HR Start by defining organizational roles, competencies, and learning objectives. Use the platform to track skill coverage, compliance, and learning ROI across the organization. Leverage analytics and recommendations to plan workforce development, anticipate future skill needs, and support strategic talent decisions.

Trainer Begin by designing structured learning paths and creating or refining learning content. Build lessons, exercises, and assessments, and continuously improve them based on learner feedback and performance insights. The system helps ensure high-quality content that adapts to different learner levels and organizational needs.

___________

how many test need to attempt in order to fill a gap

A skill gap is closed based on demonstrated competency, not on a fixed number of test attempts. The system evaluates mastery using multiple signals such as assessment results, practical exercises, and performance consistency over time. Simple skills may be validated with a single strong assessment, while broader or critical skills usually require two to three successful evaluations across different contexts.

In addition, to complete and officially close a learning path, the learner must pass a final assessment at the end of the course. This final test serves as a comprehensive validation that the required knowledge and skills have been fully acquired. Only after successfully passing this end-of-course assessment is the learning path marked as completed and the associated skill gap considered closed.

_________________________

what to do after logging in / How to Start & What to Do With a Learning Path

Start by selecting or accepting a learning path that matches your role, goals, or identified skill gaps. Review the path overview to understand the objectives, expected outcomes, and completion criteria. Then follow the path step by step: study the learning materials, complete the required exercises, and take the assessments as they appear along the way.

As you progress, track your performance and feedback to see where you are improving and where more practice is needed. The system may adapt the path by adjusting difficulty, recommending additional content, or suggesting remediation based on your results. To successfully complete the learning path, you must pass the final assessment at the end of the course, which validates overall mastery. Once completed, the path is closed, the related skill gaps are marked as addressed, and your progress is reflected in your profile`;

/**
 * Split content into meaningful paragraphs
 */
function splitIntoParagraphs(content) {
  const paragraphs = [];
  
  // First, split by separator lines (like "___________" or "__________________________________________")
  const separatorPattern = /\n\s*_{5,}\s*\n/g;
  const sections = content.split(separatorPattern);
  
  for (const section of sections) {
    // Split by double newlines first (paragraph breaks)
    const doubleNewlineSplits = section.split(/\n\s*\n/);
    
    for (const doubleSplit of doubleNewlineSplits) {
      // Split by single newlines but keep related content together
      const lines = doubleSplit.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      if (lines.length === 0) continue;
      
      let currentParagraph = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if this is a heading (all caps, short, or starts a new topic)
        const isHeading = (line.length < 50 && line === line.toUpperCase() && line.length > 3) ||
                         (i === 0 && line.length < 100);
        
        if (isHeading && currentParagraph.length > 0) {
          // Save previous paragraph and start new one
          paragraphs.push(currentParagraph.trim());
          currentParagraph = line;
        } else {
          // Continue building paragraph
          if (currentParagraph.length > 0) {
            currentParagraph += ' ' + line;
          } else {
            currentParagraph = line;
          }
        }
      }
      
      // Add last paragraph if exists
      if (currentParagraph.trim().length > 0) {
        paragraphs.push(currentParagraph.trim());
      }
    }
  }
  
  // Filter out very short paragraphs (less than 20 characters) and clean up
  return paragraphs
    .map(p => p.trim())
    .filter(p => p.length >= 20)
    .filter(p => !p.match(/^_{5,}$/)); // Remove separator-only lines
}

/**
 * Main function to add content
 */
async function addPlatformContent() {
  try {
    logger.info('🚀 Starting platform content addition for Lotus TechHub...');
    
    // Get Prisma client
    const prisma = await getPrismaClient();
    
    // Get or create Lotus TechHub tenant
    let tenant;
    try {
      // Try to get tenant by ID first
      tenant = await prisma.tenant.findUnique({
        where: { id: LOTUS_TENANT_ID }
      });
      
      if (!tenant) {
        // Try to get by domain
        tenant = await prisma.tenant.findUnique({
          where: { domain: LOTUS_DOMAIN }
        });
      }
      
      if (!tenant) {
        // Create new tenant with specific ID
        logger.info('Creating Lotus TechHub tenant...');
        tenant = await prisma.tenant.create({
          data: {
            id: LOTUS_TENANT_ID,
            name: LOTUS_COMPANY_NAME,
            domain: LOTUS_DOMAIN,
            settings: {
              company_name: LOTUS_COMPANY_NAME,
              queryRetentionDays: 90,
              enableAuditLogs: true,
              enablePersonalization: true,
            }
          }
        });
        logger.info('✅ Lotus TechHub tenant created', { tenantId: tenant.id });
      } else {
        logger.info('✅ Lotus TechHub tenant found', { 
          tenantId: tenant.id, 
          domain: tenant.domain,
          name: tenant.name 
        });
      }
    } catch (error) {
      logger.error('Failed to get/create tenant', { error: error.message });
      throw error;
    }
    
    const tenantId = tenant.id;
    
    // Split content into paragraphs
    const paragraphs = splitIntoParagraphs(platformContent);
    logger.info(`📝 Split content into ${paragraphs.length} paragraphs`);
    
    // Log paragraph previews
    paragraphs.forEach((p, i) => {
      const preview = p.substring(0, 100).replace(/\n/g, ' ');
      logger.debug(`Paragraph ${i + 1}: ${preview}...`);
    });
    
    // Generate embeddings for all paragraphs
    logger.info('🔄 Generating embeddings...');
    const embeddings = await vectorizer.generateBatch(paragraphs);
    logger.info(`✅ Generated ${embeddings.length} embeddings`);
    
    // Store each paragraph with its embedding
    const storedContentIds = [];
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      const embedding = embeddings[i];
      const contentId = `platform-content-${i + 1}`;
      
      try {
        // Convert embedding array to PostgreSQL vector format
        const embeddingStr = `[${embedding.join(',')}]`;
        
        // Prepare metadata
        const metadata = {
          source: 'platform_documentation',
          company: LOTUS_COMPANY_NAME,
          tenant_id: tenantId,
          paragraph_index: i + 1,
          total_paragraphs: paragraphs.length,
          content_type: 'documentation',
          created_at: new Date().toISOString()
        };
        
        // Check if record exists
        const existing = await prisma.vectorEmbedding.findFirst({
          where: {
            tenantId: tenantId,
            contentId: contentId,
            contentType: 'documentation'
          }
        });
        
        if (existing) {
          // Update existing record
          await prisma.$executeRawUnsafe(`
            UPDATE vector_embeddings
            SET 
              content_text = $1,
              embedding = $2::vector,
              metadata = $3::jsonb,
              updated_at = NOW()
            WHERE id = $4
          `, paragraph, embeddingStr, JSON.stringify(metadata), existing.id);
          
          logger.info(`✅ Updated paragraph ${i + 1}`, { contentId });
        } else {
          // Insert new record
          await prisma.$executeRawUnsafe(`
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
              NULL,
              $2,
              $3,
              $4::vector,
              $5,
              $6,
              $7::jsonb,
              NOW(),
              NOW()
            )
          `,
            tenantId,
            contentId,
            'documentation',
            embeddingStr,
            paragraph,
            i,
            JSON.stringify(metadata)
          );
          
          logger.info(`✅ Stored paragraph ${i + 1}`, { contentId });
        }
        
        storedContentIds.push({ contentId, contentText: paragraph });
        
        // Build Knowledge Graph node (non-blocking)
        try {
          await kgBuilderService.buildFromContent(
            contentId,
            paragraph,
            {
              source_service: 'platform_documentation',
              company: LOTUS_COMPANY_NAME,
              paragraph_index: i + 1,
              content_type: 'documentation'
            },
            tenantId
          );
          logger.info(`✅ Created KG node for paragraph ${i + 1}`);
        } catch (kgError) {
          logger.warn(`⚠️ KG build failed for paragraph ${i + 1} (non-critical)`, {
            error: kgError.message
          });
        }
        
      } catch (error) {
        logger.error(`❌ Failed to store paragraph ${i + 1}`, {
          error: error.message,
          contentId
        });
      }
    }
    
    logger.info('🎉 Platform content addition completed!', {
      company: LOTUS_COMPANY_NAME,
      tenant_id: tenantId,
      total_paragraphs: paragraphs.length,
      stored: storedContentIds.length
    });
    
    // Print summary
    console.log('\n📊 Summary:');
    console.log(`   Company: ${LOTUS_COMPANY_NAME}`);
    console.log(`   Tenant ID: ${tenantId}`);
    console.log(`   Domain: ${LOTUS_DOMAIN}`);
    console.log(`   Total paragraphs: ${paragraphs.length}`);
    console.log(`   Successfully stored: ${storedContentIds.length}`);
    console.log('\n✅ Content is now available for RAG queries!\n');
    
    process.exit(0);
    
  } catch (error) {
    logger.error('❌ Failed to add platform content', {
      error: error.message,
      stack: error.stack
    });
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
addPlatformContent();
