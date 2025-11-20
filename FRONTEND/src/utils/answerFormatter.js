/**
 * Answer formatter utility
 * Formats RAG responses into well-structured, readable format
 */

/**
 * Format answer text into structured format with enhanced readability
 * @param {string} answer - Raw answer text
 * @returns {Array} Formatted segments
 */
export function formatAnswer(answer) {
  if (!answer) return [];

  // Clean up the answer first
  const cleanAnswer = answer.trim();
  
  // Split by code blocks (```code```)
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(cleanAnswer)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const text = cleanAnswer.substring(lastIndex, match.index).trim();
      if (text) {
        segments.push(...formatTextSegment(text));
      }
    }

    // Add code block
    segments.push({
      type: 'code',
      language: match[1] || 'text',
      content: match[2].trim(),
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < cleanAnswer.length) {
    const text = cleanAnswer.substring(lastIndex).trim();
    if (text) {
      segments.push(...formatTextSegment(text));
    }
  }

  // If no code blocks found, format the entire text
  if (segments.length === 0) {
    return formatTextSegment(cleanAnswer);
  }

  return segments;
}

/**
 * Format a text segment into structured components
 * @param {string} text - Text to format
 * @returns {Array} Formatted text segments
 */
function formatTextSegment(text) {
  if (!text) return [];

  const segments = [];
  
  // Split by double newlines for paragraphs
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  
  paragraphs.forEach((paragraph, index) => {
    const trimmedPara = paragraph.trim();
    if (!trimmedPara) return;

    // Check if this paragraph is a header (starts with #, ##, etc.)
    if (trimmedPara.match(/^#{1,6}\s+/)) {
      const headerMatch = trimmedPara.match(/^(#{1,6})\s+(.+)/);
      if (headerMatch) {
        segments.push({
          type: 'header',
          level: headerMatch[1].length,
          content: headerMatch[2].trim()
        });
        return;
      }
    }

    // Check if this paragraph is a list
    if (isListParagraph(trimmedPara)) {
      segments.push({
        type: 'list',
        content: formatListItems(trimmedPara)
      });
      return;
    }

    // Check if this paragraph contains user profile information
    if (containsUserProfileInfo(trimmedPara)) {
      segments.push({
        type: 'profile',
        content: formatUserProfile(trimmedPara)
      });
      return;
    }

    // Regular paragraph
    segments.push({
      type: 'paragraph',
      content: trimmedPara
    });
  });

  return segments;
}

/**
 * Check if text represents a list
 * @param {string} text - Text to check
 * @returns {boolean} True if text is a list
 */
function isListParagraph(text) {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return false;
  
  // Check for bullet points or numbered lists
  const listPatterns = [
    /^\s*[-*•]\s+/, // Bullet points
    /^\s*\d+\.\s+/, // Numbered lists
    /^\s*[a-zA-Z]\.\s+/, // Lettered lists
    /^\s*[ivxlcdm]+\.\s+/i, // Roman numerals
  ];
  
  return lines.every(line => 
    listPatterns.some(pattern => pattern.test(line)) || line.trim() === ''
  );
}

/**
 * Format list items
 * @param {string} text - List text
 * @returns {Array} Formatted list items
 */
function formatListItems(text) {
  return text.split('\n')
    .filter(line => line.trim())
    .map(line => {
      // Remove list markers and clean up
      const cleaned = line.replace(/^\s*[-*•]\s+|^\s*\d+\.\s+|^\s*[a-zA-Z]\.\s+|^\s*[ivxlcdm]+\.\s+/i, '').trim();
      return cleaned;
    })
    .filter(item => item);
}

/**
 * Check if text contains user profile information
 * @param {string} text - Text to check
 * @returns {boolean} True if contains profile info
 */
function containsUserProfileInfo(text) {
  const profileKeywords = [
    'name:', 'role:', 'department:', 'position:', 'title:',
    'email:', 'phone:', 'location:', 'manager:', 'team:',
    'skills:', 'experience:', 'joined:', 'started:'
  ];
  
  const lowerText = text.toLowerCase();
  return profileKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Format user profile information
 * @param {string} text - Profile text
 * @returns {Object} Formatted profile data
 */
function formatUserProfile(text) {
  const lines = text.split('\n').filter(line => line.trim());
  const profileData = {};
  
  lines.forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      if (key && value) {
        profileData[key] = value;
      }
    }
  });
  
  return {
    raw: text,
    structured: profileData
  };
}

/**
 * Format response for better readability (backend utility)
 * This can be used in the backend to pre-format responses
 * @param {string} answer - Raw answer from AI
 * @returns {string} Formatted answer
 */
export function formatResponseForReadability(answer) {
  if (!answer) return answer;

  let formatted = answer.trim();

  // Add spacing around headers
  formatted = formatted.replace(/^(#{1,6}\s+.+)$/gm, '\n$1\n');

  // Ensure proper spacing between paragraphs
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  // Format lists with proper spacing
  formatted = formatted.replace(/^(\s*[-*•]\s+.+)$/gm, (match, p1) => {
    return p1;
  });

  // Add spacing before and after code blocks
  formatted = formatted.replace(/(```[\s\S]*?```)/g, '\n$1\n');

  // Clean up extra whitespace
  formatted = formatted.replace(/^\s+|\s+$/g, '');
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  return formatted;
}






