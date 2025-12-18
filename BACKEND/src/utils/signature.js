/**
 * Signature Utility
 * Digital signature generation and verification for inter-service communication
 * 
 * Uses ECDSA P-256 with SHA-256
 * Format: "educoreai-{microservice-name}" or with payload hash
 */

import crypto from 'crypto';

/**
 * Generate signature for a message
 * @param {string} microserviceName - Name of the service signing
 * @param {string} privateKey - PEM formatted private key
 * @param {Object} payload - Optional payload to include in signature
 * @returns {string} Base64 encoded signature
 */
export function generateSignature(microserviceName, privateKey, payload = null) {
  // Use simple format: "educoreai-{microservice-name}"
  let message = `educoreai-${microserviceName}`;
  
  // Optionally include payload hash for request/response signing
  if (payload) {
    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    message = `${message}-${payloadHash}`;
  }
  
  // Sign the message
  const sign = crypto.createSign('SHA256');
  sign.update(message);
  sign.end();
  
  return sign.sign(privateKey, 'base64');
}

/**
 * Verify signature
 * @param {string} microserviceName - Name of the service that signed
 * @param {string} signature - Base64 encoded signature
 * @param {string} publicKey - PEM formatted public key
 * @param {Object} payload - Optional payload that was signed
 * @returns {boolean} True if signature is valid
 */
export function verifySignature(microserviceName, signature, publicKey, payload = null) {
  // Reconstruct the message
  let message = `educoreai-${microserviceName}`;
  
  // Include payload hash if provided
  if (payload) {
    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    message = `${message}-${payloadHash}`;
  }
  
  // Verify signature
  const verify = crypto.createVerify('SHA256');
  verify.update(message);
  verify.end();
  
  try {
    return verify.verify(publicKey, signature, 'base64');
  } catch (_error) {
    // Invalid signature format or key
    return false;
  }
}

