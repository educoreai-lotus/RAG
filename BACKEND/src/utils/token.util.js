/**
 * Token Utility Functions
 * Safe token extraction and validation
 */

/**
 * Safely extract token from Authorization header
 * Prevents substring errors on undefined/null values
 * @param {string|undefined|null} authHeader - Authorization header value
 * @returns {string|null} - Extracted token or null if invalid
 */
export function extractTokenFromHeader(authHeader) {
  // Safety checks
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }
  
  // Check if it starts with "Bearer "
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  // Extract token (skip "Bearer " prefix)
  const extractedToken = authHeader.substring(7).trim();
  
  // Validate token is not empty or "undefined"/"null" strings
  if (!extractedToken || extractedToken.length === 0 || extractedToken === 'undefined' || extractedToken === 'null') {
    return null;
  }
  
  return extractedToken;
}

/**
 * Safely extract token from request headers
 * @param {Object} headers - Request headers object
 * @returns {string|null} - Extracted token or null if invalid
 */
export function extractTokenFromRequest(headers) {
  const authHeader = headers?.authorization || headers?.Authorization;
  return extractTokenFromHeader(authHeader);
}

