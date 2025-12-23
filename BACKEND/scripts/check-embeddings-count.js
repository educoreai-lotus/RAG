/**
 * Script to check how many vector embeddings exist for Lotus TechHub
 */

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
  // .env file doesn't exist, that's okay
}

import { getPrismaClient } from '../src/config/database.config.js';

const LOTUS_TENANT_ID = '5a1cb1d2-343c-438c-9f4b-76f0f1aac59d';

async function checkEmbeddings() {
  try {
    const prisma = await getPrismaClient();
    
    // Count all embeddings for Lotus TechHub
    const totalCount = await prisma.vectorEmbedding.count({
      where: {
        tenantId: LOTUS_TENANT_ID
      }
    });
    
    // Count by content type
    const byType = await prisma.vectorEmbedding.groupBy({
      by: ['contentType'],
      where: {
        tenantId: LOTUS_TENANT_ID
      },
      _count: {
        id: true
      }
    });
    
    // Get platform content specifically
    const platformContent = await prisma.vectorEmbedding.findMany({
      where: {
        tenantId: LOTUS_TENANT_ID,
        contentId: {
          startsWith: 'platform-content-'
        }
      },
      select: {
        contentId: true,
        contentType: true,
        contentText: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    console.log('\n📊 Vector Embeddings Count for Lotus TechHub:');
    console.log(`   Total embeddings: ${totalCount}`);
    console.log('\n   By content type:');
    byType.forEach(item => {
      console.log(`     - ${item.contentType}: ${item._count.id}`);
    });
    
    console.log(`\n   Platform content (documentation): ${platformContent.length}`);
    if (platformContent.length > 0) {
      console.log('\n   Platform content IDs:');
      platformContent.forEach((item, index) => {
        const preview = item.contentText.substring(0, 60).replace(/\n/g, ' ');
        console.log(`     ${index + 1}. ${item.contentId} - "${preview}..."`);
      });
    }
    
    console.log('\n');
    
    await prisma.$disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkEmbeddings();

