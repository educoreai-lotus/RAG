/**
 * Script to test if "about" query finds the platform content
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
import vectorizer from '../src/core/vectorizer.js';

const LOTUS_TENANT_ID = '5a1cb1d2-343c-438c-9f4b-76f0f1aac59d';

async function testAboutQuery() {
  try {
    const prisma = await getPrismaClient();
    
    console.log('\n🔍 Testing "about" query...\n');
    
    // Generate embedding for "about"
    const queryText = 'about';
    console.log(`Query: "${queryText}"`);
    
    const queryEmbedding = await vectorizer.generateEmbedding(queryText);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    
    console.log(`✅ Generated embedding (${queryEmbedding.length} dimensions)\n`);
    
    // Search for similar content
    const results = await prisma.$queryRawUnsafe(`
      SELECT 
        content_id,
        content_type,
        content_text,
        1 - (embedding <=> $1::vector) as similarity
      FROM vector_embeddings
      WHERE tenant_id = $2
        AND embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT 10
    `, embeddingStr, LOTUS_TENANT_ID);
    
    console.log(`📊 Found ${results.length} results:\n`);
    
    results.forEach((result, index) => {
      const similarity = parseFloat(result.similarity);
      const preview = result.content_text.substring(0, 100).replace(/\n/g, ' ');
      console.log(`${index + 1}. ${result.content_id} (${result.content_type})`);
      console.log(`   Similarity: ${(similarity * 100).toFixed(2)}%`);
      console.log(`   Preview: "${preview}..."`);
      console.log('');
    });
    
    // Check specifically for platform-content
    const platformResults = results.filter(r => r.content_id.startsWith('platform-content-'));
    console.log(`\n📝 Platform content found: ${platformResults.length}`);
    
    if (platformResults.length > 0) {
      console.log('\n✅ Platform content is being found!');
      const topResult = platformResults[0];
      console.log(`\nTop match: ${topResult.content_id}`);
      console.log(`Similarity: ${(parseFloat(topResult.similarity) * 100).toFixed(2)}%`);
      console.log(`Content: ${topResult.content_text.substring(0, 200)}...`);
    } else {
      console.log('\n⚠️ Platform content NOT found in top results');
      console.log('This might be a similarity threshold issue.');
    }
    
    await prisma.$disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testAboutQuery();

