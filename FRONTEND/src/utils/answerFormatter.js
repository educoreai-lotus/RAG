/**
 * Answer formatter utility
 * Formats RAG responses into paragraphs with code blocks
 */

/**
 * Format answer text into structured format
 * @param {string} answer - Raw answer text
 * @returns {Array} Formatted segments
 */
export function formatAnswer(answer) {
  if (!answer) return [];

  // Split by code blocks (```code```)
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(answer)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const text = answer.substring(lastIndex, match.index).trim();
      if (text) {
        segments.push({ type: 'text', content: text });
      }
    }

    // Add code block
    segments.push({
      type: 'code',
      language: match[1] || 'text',
      content: match[2],
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < answer.length) {
    const text = answer.substring(lastIndex).trim();
    if (text) {
      segments.push({ type: 'text', content: text });
    }
  }

  // If no code blocks, split by paragraphs
  if (segments.length === 0) {
    return answer.split('\n\n').map((para) => ({
      type: 'text',
      content: para.trim(),
    }));
  }

  return segments;
}






