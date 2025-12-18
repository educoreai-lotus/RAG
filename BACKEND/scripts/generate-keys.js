/**
 * Key Generation Script
 * Generates ECDSA P-256 key pairs for microservices
 * 
 * Usage:
 *   node scripts/generate-keys.js
 *   SERVICE_NAME=rag-service node scripts/generate-keys.js
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get service name from environment or default
const microserviceName = process.env.SERVICE_NAME || 'rag-service';

console.log(`🔑 Generating key pair for: ${microserviceName}\n`);

// Generate ECDSA P-256 key pair
const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, '..', 'keys');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Save private key (copy to GitHub Secrets)
const privateKeyPath = path.join(outputDir, `${microserviceName}-private-key.pem`);
fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });

console.log(`✅ Private key saved: ${privateKeyPath}`);
console.log('📋 Copy this to GitHub Secrets → PRIVATE_KEY\n');
console.log('Private Key:');
console.log(privateKey);
console.log('\n');

// Save public key (send to coordinator)
const publicKeyPath = path.join(outputDir, `${microserviceName}-public-key.pem`);
fs.writeFileSync(publicKeyPath, publicKey, { mode: 0o644 });

console.log(`✅ Public key saved: ${publicKeyPath}`);
console.log('📋 Send this public key to coordinator administrator.\n');
console.log('Public Key:');
console.log(publicKey);
console.log('\n');

console.log('✅ Key generation complete!');
console.log('\nNext steps:');
console.log('1. Copy private key to GitHub Secrets → PRIVATE_KEY');
console.log('2. Send public key to coordinator administrator');
console.log('3. Get coordinator\'s public key from coordinator administrator');
console.log('4. Store coordinator\'s public key in your service config');










