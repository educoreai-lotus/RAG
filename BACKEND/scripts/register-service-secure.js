/**
 * Secure Service Registration Script (Stage 1)
 * Registers service with Coordinator using digital signatures
 * 
 * Usage:
 *   node scripts/register-service-secure.js
 * 
 * Environment Variables Required:
 *   - PRIVATE_KEY: Private key from GitHub Secrets
 *   - SERVICE_NAME: Name of the microservice (e.g., "rag-service")
 *   - COORDINATOR_URL: Coordinator domain (e.g., "http://localhost:3000")
 *   - SERVICE_ENDPOINT: Full URL of this service (e.g., "http://rag-service:3000")
 *   - SERVICE_VERSION: Service version (e.g., "1.0.0")
 *   - SERVICE_HEALTH_CHECK: Health check path (e.g., "/health")
 *   - SERVICE_DESCRIPTION: Optional service description
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { generateSignature, verifySignature } from '../src/utils/signature.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Configuration
// Production: https://coordinator-production-e0a0.up.railway.app
// Local: http://localhost:3000
const COORDINATOR_URL = process.env.COORDINATOR_URL || process.env.COORDINATOR_DOMAIN || 'http://localhost:3000';
const SERVICE_NAME = process.env.SERVICE_NAME || 'rag-service';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const COORDINATOR_PUBLIC_KEY = process.env.COORDINATOR_PUBLIC_KEY; // Optional for verification

// Service registration data
// Production: https://ragmicroservice-production.up.railway.app
// Local: http://localhost:3000
const SERVICE_ENDPOINT = process.env.SERVICE_ENDPOINT || 'http://localhost:3000';
const SERVICE_VERSION = process.env.SERVICE_VERSION || '1.0.0';
const SERVICE_HEALTH_CHECK = process.env.SERVICE_HEALTH_CHECK || '/health';
const SERVICE_DESCRIPTION = process.env.SERVICE_DESCRIPTION || 'RAG Microservice - Contextual Assistant (RAG / Knowledge Graph) Microservice';

// Validate required environment variables
if (!PRIVATE_KEY) {
  console.error('❌ Error: PRIVATE_KEY environment variable is required');
  console.error('   Set it from GitHub Secrets or .env file');
  process.exit(1);
}

if (!SERVICE_NAME) {
  console.error('❌ Error: SERVICE_NAME environment variable is required');
  process.exit(1);
}

// Prepare registration data
const registrationData = {
  serviceName: SERVICE_NAME,
  version: SERVICE_VERSION,
  endpoint: SERVICE_ENDPOINT,
  healthCheck: SERVICE_HEALTH_CHECK,
  description: SERVICE_DESCRIPTION,
  metadata: {
    team: process.env.SERVICE_TEAM || 'EDUCORE Team',
    owner: process.env.SERVICE_OWNER || 'EDUCORE',
    capabilities: [
      'rag queries',
      'knowledge graph',
      'vector search',
      'content management',
      'assessment support',
      'devlab support',
      'personalized recommendations'
    ]
  }
};

console.log('🔐 Secure Service Registration (Stage 1)');
console.log('========================================\n');
console.log(`Service Name: ${SERVICE_NAME}`);
console.log(`Service Version: ${SERVICE_VERSION}`);
console.log(`Service Endpoint: ${SERVICE_ENDPOINT}`);
console.log(`Coordinator: ${COORDINATOR_URL}\n`);

// Generate signature
console.log('📝 Generating signature...');
let signature;
try {
  signature = generateSignature(SERVICE_NAME, PRIVATE_KEY, registrationData);
  console.log('✅ Signature generated\n');
} catch (error) {
  console.error('❌ Error generating signature:', error.message);
  process.exit(1);
}

// Prepare request
const url = `${COORDINATOR_URL}/register`;
const headers = {
  'Content-Type': 'application/json',
  'X-Service-Name': SERVICE_NAME,
  'X-Signature': signature
};

console.log('📤 Registering service...');
console.log(`   URL: ${url}`);
console.log(`   Headers:`);
console.log(`     X-Service-Name: ${SERVICE_NAME}`);
console.log(`     X-Signature: ${signature.substring(0, 50)}...\n`);

// Make request
try {
  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(registrationData)
  });

  const responseData = await response.json();

  if (!response.ok) {
    console.error('❌ Registration failed:');
    console.error(`   Status: ${response.status} ${response.statusText}`);
    console.error(`   Response:`, JSON.stringify(responseData, null, 2));
    process.exit(1);
  }

  console.log('✅ Service registered successfully!\n');
  console.log('Response:');
  console.log(JSON.stringify(responseData, null, 2));

  // Verify response signature if coordinator public key is available
  const responseSignature = response.headers.get('x-service-signature');
  const responseServiceName = response.headers.get('x-service-name');

  if (responseSignature && responseServiceName) {
    console.log('\n📋 Response Signature Info:');
    console.log(`   Service: ${responseServiceName}`);
    console.log(`   Signature: ${responseSignature.substring(0, 50)}...`);

    if (COORDINATOR_PUBLIC_KEY) {
      try {
        const isValid = verifySignature(
          'coordinator',
          responseSignature,
          COORDINATOR_PUBLIC_KEY,
          responseData
        );

        if (isValid) {
          console.log('   ✅ Coordinator signature verified!');
        } else {
          console.log('   ⚠️  Coordinator signature verification failed!');
        }
      } catch (error) {
        console.log(`   ⚠️  Could not verify signature: ${error.message}`);
      }
    } else {
      console.log('   ⚠️  Coordinator public key not provided - skipping verification');
      console.log('   💡 Set COORDINATOR_PUBLIC_KEY in .env to enable verification');
    }
  }

  // Save service ID for next step
  if (responseData.serviceId) {
    const serviceIdPath = path.join(__dirname, '..', '.service-id');
    fs.writeFileSync(serviceIdPath, responseData.serviceId, 'utf8');
    console.log(`\n💾 Service ID saved to: ${serviceIdPath}`);
    console.log(`   Service ID: ${responseData.serviceId}`);
    console.log('\n📋 Next Steps:');
    console.log('   1. Send your public key to coordinator administrator');
    console.log('   2. Get coordinator\'s public key and add to .env as COORDINATOR_PUBLIC_KEY');
    console.log('   3. Run: node scripts/upload-migration-secure.js');
  }

} catch (error) {
  console.error('❌ Error registering service:', error.message);
  if (error.code === 'ECONNREFUSED') {
    console.error('   Make sure the coordinator is running and accessible');
  }
  process.exit(1);
}

