/**
 * Response Validation Utilities
 * 
 * Detects negative/insufficient responses that shouldn't be saved to the database
 */

import { logger } from './logger.util.js';

/**
 * Check if response indicates "no information available" or similar negative response
 * 
 * @param {string} answer - The LLM response to check
 * @returns {boolean} - true if response is negative/insufficient
 */
export function isNegativeResponse(answer) {
  if (!answer || typeof answer !== 'string') {
    return true; // Empty or invalid = negative
  }

  const normalized = answer.toLowerCase().trim();
  
  // ═══════════════════════════════════════════════════════════════
  // 1. EDUCORE-SPECIFIC PATTERNS (Highest Priority)
  // ═══════════════════════════════════════════════════════════════
  if (/educore (doesn'?t|does not) (include|contain|have|provide)/i.test(answer)) {
    logger.debug('[ResponseValidation] Detected EDUCORE negative pattern');
    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. SHORT RESPONSES WITH NEGATIVE KEYWORDS
  // ═══════════════════════════════════════════════════════════════
  if (normalized.length < 100) {
    const shortNegativeKeywords = [
      'no information',
      'not enough',
      'couldn\'t find',
      'could not find',
      'insufficient',
      'no data',
      'not available',
      'no relevant',
      'אין מידע',
      'לא נמצא',
      'אין לי מספיק'
    ];
    
    if (shortNegativeKeywords.some(keyword => normalized.includes(keyword))) {
      logger.debug('[ResponseValidation] Detected short negative response', {
        length: normalized.length,
        preview: normalized.substring(0, 50)
      });
      return true;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. GENERAL NEGATIVE PATTERNS (English)
  // ═══════════════════════════════════════════════════════════════
  const negativePatterns = [
    // Information not found
    /i don'?t have (enough|sufficient) information/i,
    /i couldn'?t find (any )?(relevant )?information/i,
    /i could not find (any )?(relevant )?information/i,
    /the context doesn'?t contain (enough|sufficient|relevant)/i,
    /the context does not (provide|contain|have) (any )?(information|data|details)/i,
    /does not provide (any )?(information|data|details)/i,
    /no (data|information|content) (was )?(found|available|provided)/i,
    /there is no (data|information|content)/i,
    
    // Null/empty values
    /(is|are|was|were) (listed as|set to|marked as|shows as) null/i,
    /(is|are|was|were) null/i,
    /value is null/i,
    /(field|property|attribute) (is|are) null/i,
    
    // Insufficient context
    /insufficient (information|data|context)/i,
    /not enough (information|data|context)/i,
    /doesn'?t contain (enough|sufficient) information/i,
    /does not contain (enough|sufficient|any) (information|data)/i,
    
    // Cannot generate
    /i (could|can) ?not generate a (proper )?response/i,
    /unable to (provide|generate|find)/i,
    /cannot (provide|answer|respond)/i,
    
    // Apology patterns (often indicate no info)
    /^i'?m sorry,? (but )?(i |the |there )/i,
    /^unfortunately,? (i |the |there |no )/i,
    
    // Based on context fallback (empty response indicator)
    /^based on (the )?(available |provided )?(context|information):?\s*$/i,
    
    // Context does not provide patterns
    /the context does not provide/i,
    /context does not (have|contain|include|show)/i
  ];

  // ═══════════════════════════════════════════════════════════════
  // 4. HEBREW NEGATIVE PATTERNS
  // ═══════════════════════════════════════════════════════════════
  const hebrewNegativePatterns = [
    /אין לי (מספיק )?מידע/,
    /לא נמצא מידע/,
    /אין מידע (זמין|רלוונטי)/,
    /המערכת (לא מכילה|אינה מכילה)/,
    /לא הצלחתי למצוא/,
    /אין נתונים/,
    /מידע לא (זמין|נמצא)/,
    /^מצטער,? (אבל )?(אין|לא)/
  ];

  // Check English patterns
  if (negativePatterns.some(pattern => pattern.test(answer))) {
    logger.debug('[ResponseValidation] Detected English negative pattern');
    return true;
  }

  // Check Hebrew patterns
  if (hebrewNegativePatterns.some(pattern => pattern.test(answer))) {
    logger.debug('[ResponseValidation] Detected Hebrew negative pattern');
    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. VERY SHORT RESPONSES (likely unhelpful)
  // ═══════════════════════════════════════════════════════════════
  if (normalized.length < 20) {
    logger.debug('[ResponseValidation] Response too short', {
      length: normalized.length
    });
    return true;
  }

  return false;
}

/**
 * Check if response should be saved to database
 * 
 * @param {string} answer - The LLM response
 * @param {Object} options - Additional options
 * @returns {Object} - { shouldSave: boolean, reason: string }
 */
export function shouldSaveResponse(answer, options = {}) {
  // Check if empty
  if (!answer || answer.trim().length === 0) {
    return {
      shouldSave: false,
      reason: 'empty_response'
    };
  }

  // Check if negative response
  if (isNegativeResponse(answer)) {
    return {
      shouldSave: false,
      reason: 'negative_response'
    };
  }

  // All checks passed
  return {
    shouldSave: true,
    reason: 'valid_response'
  };
}

