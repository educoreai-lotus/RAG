/**
 * Response Formatter Utility
 * Formats AI responses for better readability and structure
 */

/**
 * Format bot response for enhanced readability
 * @param {string} answer - Raw AI response
 * @param {Object} context - Additional context for formatting
 * @returns {string} Formatted response
 */
export function formatBotResponse(answer, context = {}) {
  if (!answer || typeof answer !== 'string') {
    return answer;
  }

  let formatted = answer.trim();

  // 1. Format user profile information
  formatted = formatUserProfileInfo(formatted);

  // 2. Format lists and bullet points
  formatted = formatLists(formatted);

  // 3. Format headers and sections
  formatted = formatHeaders(formatted);

  // 4. Format course/document content
  formatted = formatCourseContent(formatted);

  // 5. Format assessment information
  formatted = formatAssessmentInfo(formatted);

  // 6. Add proper paragraph breaks
  formatted = addParagraphBreaks(formatted);

  // 7. Clean up extra whitespace
  formatted = cleanupWhitespace(formatted);

  return formatted;
}

/**
 * Format user profile information with clear structure
 * @param {string} text - Text containing profile info
 * @returns {string} Formatted text
 */
function formatUserProfileInfo(text) {
  // Pattern for profile information (Name: Value format)
  const profilePattern = /^([A-Za-z\s]+):\s*(.+)$/gm;
  
  return text.replace(profilePattern, (match, key, value) => {
    const cleanKey = key.trim();
    const cleanValue = value.trim();
    
    // Common profile fields that should be formatted specially
    const profileFields = [
      'name', 'full name', 'role', 'position', 'title', 'department', 
      'team', 'manager', 'email', 'phone', 'location', 'office',
      'skills', 'experience', 'joined', 'started', 'hire date'
    ];
    
    if (profileFields.some(field => cleanKey.toLowerCase().includes(field))) {
      return `**${cleanKey}:** ${cleanValue}`;
    }
    
    return match;
  });
}

/**
 * Format lists and bullet points for better readability
 * @param {string} text - Text containing lists
 * @returns {string} Formatted text
 */
function formatLists(text) {
  // Split into lines for processing
  const lines = text.split('\n');
  const formatted = [];
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if this line is a list item
    const isListItem = /^[-*•]\s+|^\d+\.\s+|^[a-zA-Z]\.\s+/.test(line);
    
    if (isListItem) {
      if (!inList) {
        // Starting a new list, add spacing before
        if (formatted.length > 0 && formatted[formatted.length - 1].trim() !== '') {
          formatted.push('');
        }
        inList = true;
      }
      formatted.push(line);
    } else {
      if (inList && line !== '') {
        // Ending a list, add spacing after
        formatted.push('');
        inList = false;
      }
      formatted.push(line);
    }
  }
  
  return formatted.join('\n');
}

/**
 * Format headers and section titles
 * @param {string} text - Text containing headers
 * @returns {string} Formatted text
 */
function formatHeaders(text) {
  // Add proper spacing around headers
  let formatted = text.replace(/^(#{1,6}\s+.+)$/gm, '\n$1\n');
  
  // Format common section headers that might not have # markers
  const headerPatterns = [
    /^(Course Information|Course Details|Assessment Information|Assessment Details|User Information|Profile Information|Skills|Experience|Recommendations):/gim,
    /^(About|Overview|Summary|Description|Details|Information)$/gim
  ];
  
  headerPatterns.forEach(pattern => {
    formatted = formatted.replace(pattern, '\n## $1\n');
  });
  
  return formatted;
}

/**
 * Format course and document content
 * @param {string} text - Text containing course info
 * @returns {string} Formatted text
 */
function formatCourseContent(text) {
  // Format course-specific information
  const coursePatterns = [
    { pattern: /^Course Title:\s*(.+)$/gim, replacement: '**Course:** $1' },
    { pattern: /^Course Name:\s*(.+)$/gim, replacement: '**Course:** $1' },
    { pattern: /^Instructor:\s*(.+)$/gim, replacement: '**Instructor:** $1' },
    { pattern: /^Duration:\s*(.+)$/gim, replacement: '**Duration:** $1' },
    { pattern: /^Level:\s*(.+)$/gim, replacement: '**Level:** $1' },
    { pattern: /^Prerequisites:\s*(.+)$/gim, replacement: '**Prerequisites:** $1' },
    { pattern: /^Learning Objectives:\s*(.+)$/gim, replacement: '\n**Learning Objectives:**\n$1' },
    { pattern: /^Course Description:\s*(.+)$/gim, replacement: '\n**Description:**\n$1' }
  ];
  
  let formatted = text;
  coursePatterns.forEach(({ pattern, replacement }) => {
    formatted = formatted.replace(pattern, replacement);
  });
  
  return formatted;
}

/**
 * Format assessment information
 * @param {string} text - Text containing assessment info
 * @returns {string} Formatted text
 */
function formatAssessmentInfo(text) {
  // Format assessment-specific information
  const assessmentPatterns = [
    { pattern: /^Assessment Type:\s*(.+)$/gim, replacement: '**Type:** $1' },
    { pattern: /^Score:\s*(.+)$/gim, replacement: '**Score:** $1' },
    { pattern: /^Grade:\s*(.+)$/gim, replacement: '**Grade:** $1' },
    { pattern: /^Status:\s*(.+)$/gim, replacement: '**Status:** $1' },
    { pattern: /^Due Date:\s*(.+)$/gim, replacement: '**Due Date:** $1' },
    { pattern: /^Submitted:\s*(.+)$/gim, replacement: '**Submitted:** $1' },
    { pattern: /^Feedback:\s*(.+)$/gim, replacement: '\n**Feedback:**\n$1' }
  ];
  
  let formatted = text;
  assessmentPatterns.forEach(({ pattern, replacement }) => {
    formatted = formatted.replace(pattern, replacement);
  });
  
  return formatted;
}

/**
 * Add proper paragraph breaks for better readability
 * @param {string} text - Text to format
 * @returns {string} Formatted text
 */
function addParagraphBreaks(text) {
  // Split long sentences into paragraphs at natural break points
  let formatted = text;
  
  // Add breaks after sentences that end with periods, followed by capital letters
  formatted = formatted.replace(/(\. )([A-Z][a-z])/g, '.\n\n$2');
  
  // Add breaks before common transition words/phrases
  const transitionWords = [
    'Additionally', 'Furthermore', 'Moreover', 'However', 'Nevertheless',
    'On the other hand', 'In contrast', 'Similarly', 'For example',
    'For instance', 'In conclusion', 'To summarize', 'Finally'
  ];
  
  transitionWords.forEach(word => {
    const pattern = new RegExp(`\\. (${word})`, 'g');
    formatted = formatted.replace(pattern, '.\n\n$1');
  });
  
  return formatted;
}

/**
 * Clean up extra whitespace and normalize formatting
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
function cleanupWhitespace(text) {
  let cleaned = text;
  
  // Remove excessive line breaks (more than 2)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Remove trailing spaces
  cleaned = cleaned.replace(/[ \t]+$/gm, '');
  
  // Ensure single space after periods
  cleaned = cleaned.replace(/\.  +/g, '. ');
  
  // Remove leading/trailing whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Format error messages for better user experience
 * @param {string} message - Error message
 * @param {Object} context - Error context
 * @returns {string} Formatted error message
 */
export function formatErrorMessage(message, context = {}) {
  if (!message) return message;
  
  // Make error messages more user-friendly
  let formatted = message;
  
  // Replace technical terms with user-friendly language
  const replacements = [
    { from: /no data found/gi, to: "I couldn't find information about that topic" },
    { from: /insufficient permissions/gi, to: "You don't have access to view this information" },
    { from: /authentication required/gi, to: "Please log in to access this information" },
    { from: /below threshold/gi, to: "I couldn't find relevant information" },
    { from: /vector search failed/gi, to: "I'm having trouble searching for that information" }
  ];
  
  replacements.forEach(({ from, to }) => {
    formatted = formatted.replace(from, to);
  });
  
  // Add helpful suggestions based on context
  if (context.reason === 'permission_denied') {
    formatted += "\n\nTip: If you need access to this information, please contact your administrator or try logging in with appropriate permissions.";
  } else if (context.reason === 'no_data') {
    formatted += "\n\nTip: Try rephrasing your question or asking about a different topic.";
  }
  
  return formatted;
}

/**
 * Format recommendations for better presentation
 * @param {Array} recommendations - Array of recommendation objects
 * @returns {Array} Formatted recommendations
 */
export function formatRecommendations(recommendations) {
  if (!Array.isArray(recommendations)) return recommendations;
  
  return recommendations.map(rec => ({
    ...rec,
    title: rec.title || rec.label || 'Recommendation',
    description: rec.description ? formatBotResponse(rec.description) : rec.description,
    reason: rec.reason ? `Why: ${rec.reason}` : rec.reason
  }));
}
