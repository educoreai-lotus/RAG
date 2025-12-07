/**
 * Secure Migration Upload Script
 * Uploads migration file with digital signature
 * 
 * Usage:
 *   node scripts/upload-migration-secure.js
 * 
 * Environment Variables Required:
 *   - PRIVATE_KEY: Private key from GitHub Secrets
 *   - SERVICE_NAME: Name of the microservice (e.g., "rag-service")
 *   - COORDINATOR_URL: Coordinator domain (e.g., "http://localhost:3000")
 *   - SERVICE_ID: Service ID from Stage 1 registration
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
// Try to read Service ID from .service-id file (saved during registration)
let SERVICE_ID = process.env.SERVICE_ID;
if (!SERVICE_ID) {
  const serviceIdPath = path.join(__dirname, '..', '.service-id');
  if (fs.existsSync(serviceIdPath)) {
    SERVICE_ID = fs.readFileSync(serviceIdPath, 'utf8').trim();
  } else {
    SERVICE_ID = 'b75b5a42-3b19-404e-819b-262001c4c38d'; // Fallback to provided ID
  }
}

// Production: https://coordinator-production-e0a0.up.railway.app
// Local: http://localhost:3000
const COORDINATOR_URL = process.env.COORDINATOR_URL || process.env.COORDINATOR_DOMAIN || 'http://localhost:3000';
const SERVICE_NAME = process.env.SERVICE_NAME || 'rag-service';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const COORDINATOR_PUBLIC_KEY = process.env.COORDINATOR_PUBLIC_KEY; // Optional for verification

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

// Paths
const migrationFilePath = path.join(__dirname, '..', '..', 'migration-file.json');

// Check if migration file exists
if (!fs.existsSync(migrationFilePath)) {
  console.error(`❌ Error: Migration file not found: ${migrationFilePath}`);
  process.exit(1);
}

// Read migration file
let migrationData;
try {
  const migrationContent = fs.readFileSync(migrationFilePath, 'utf8');
  migrationData = JSON.parse(migrationContent);
} catch (error) {
  console.error('❌ Error reading migration file:', error.message);
  process.exit(1);
}

// Extract migrationFile from the JSON structure
const requestBody = {
  migrationFile: migrationData.migrationFile || migrationData
};

console.log('🔐 Secure Migration Upload');
console.log('==========================\n');
console.log(`Service Name: ${SERVICE_NAME}`);
console.log(`Service ID: ${SERVICE_ID}`);
console.log(`Coordinator: ${COORDINATOR_URL}`);
console.log(`Migration File: ${migrationFilePath}\n`);

// Generate signature
console.log('📝 Generating signature...');
let signature;
try {
  signature = generateSignature(SERVICE_NAME, PRIVATE_KEY, requestBody);
  console.log('✅ Signature generated\n');
} catch (error) {
  console.error('❌ Error generating signature:', error.message);
  process.exit(1);
}

// Prepare request
const url = `${COORDINATOR_URL}/register/${SERVICE_ID}/migration`;
const headers = {
  'Content-Type': 'application/json',
  'X-Service-Name': SERVICE_NAME,
  'X-Signature': signature
};

console.log('📤 Uploading migration file...');
console.log(`   URL: ${url}`);
console.log(`   Headers:`);
console.log(`     X-Service-Name: ${SERVICE_NAME}`);
console.log(`     X-Signature: ${signature.substring(0, 50)}...\n`);

// Make request
try {
  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(requestBody)
  });

  const responseData = await response.json();

  if (!response.ok) {
    console.error('❌ Upload failed:');
    console.error(`   Status: ${response.status} ${response.statusText}`);
    console.error(`   Response:`, JSON.stringify(responseData, null, 2));
    process.exit(1);
  }

  console.log('✅ Migration uploaded successfully!\n');
  console.log('Response:');
  console.log(JSON.stringify(responseData, null, 2));

  // Verify response signature if present
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

} catch (error) {
  console.error('❌ Error uploading migration:', error.message);
  if (error.code === 'ECONNREFUSED') {
    console.error('   Make sure the coordinator is running and accessible');
  }
  process.exit(1);
}

