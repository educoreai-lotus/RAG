/**
 * Convert Private Key to Base64
 * 
 * שימוש:
 *   node scripts/convert-key-to-base64.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceName = process.env.SERVICE_NAME || 'rag-service';
const privateKeyPath = path.join(__dirname, '..', 'keys', `${serviceName}-private-key.pem`);

if (!fs.existsSync(privateKeyPath)) {
  console.error(`❌ קובץ מפתח לא נמצא: ${privateKeyPath}`);
  console.log('💡 הרץ קודם: node scripts/generate-keys.js');
  process.exit(1);
}

const privateKey = fs.readFileSync(privateKeyPath, 'utf-8');
const base64Key = Buffer.from(privateKey, 'utf-8').toString('base64');

console.log('\n✅ המפתח הפרטי הומר ל-base64:\n');
console.log(base64Key);
console.log('\n📋 העתק את זה ל-RAG_PRIVATE_KEY:\n');
console.log(`RAG_PRIVATE_KEY="${base64Key}"`);
console.log('\n');
