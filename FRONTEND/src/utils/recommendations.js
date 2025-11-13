/**
 * Recommendations Generator - Generates mode-specific recommendations
 */

import { MODES } from '../store/slices/chatMode.slice.js';

/**
 * Gets recommendations based on current mode
 * @param {string} mode - Current chat mode
 * @param {Array} messages - Chat messages history
 * @returns {Array} - Recommendations array
 */
export const getModeSpecificRecommendations = (mode, messages = []) => {
  if (mode === MODES.ASSESSMENT_SUPPORT) {
    return [
      {
        id: 'assess-1',
        type: 'button',
        label: 'Create New Exam',
        description: 'Set up a new assessment or quiz',
      },
      {
        id: 'assess-2',
        type: 'button',
        label: 'Fix Scoring Logic',
        description: 'Troubleshoot scoring and grading issues',
      },
      {
        id: 'assess-3',
        type: 'card',
        label: 'See Question Bank API',
        description: 'View API documentation for question banks',
      },
      {
        id: 'assess-4',
        type: 'button',
        label: 'Troubleshoot Errors',
        description: 'Get help with common assessment errors',
      },
    ];
  }

  if (mode === MODES.DEVLAB_SUPPORT) {
    return [
      {
        id: 'devlab-1',
        type: 'button',
        label: 'Run Code Again',
        description: 'Re-execute code in sandbox',
      },
      {
        id: 'devlab-2',
        type: 'button',
        label: 'Debug Sandbox Error',
        description: 'Troubleshoot sandbox execution issues',
      },
      {
        id: 'devlab-3',
        type: 'card',
        label: 'View Student Logs',
        description: 'Access student submission logs',
      },
      {
        id: 'devlab-4',
        type: 'button',
        label: 'GitHub Integration',
        description: 'Configure GitHub repository connections',
      },
    ];
  }

  // General mode recommendations (only if in GENERAL mode)
  if (mode === MODES.GENERAL) {
    if (messages.length <= 1) {
      return [
        {
          id: 'rec-1',
          type: 'button',
          label: 'Get Started Guide',
          description: 'Learn how to use our platform',
        },
        {
          id: 'rec-2',
          type: 'button',
          label: 'Contact Support',
          description: 'Talk to our support team',
        },
        {
          id: 'rec-3',
          type: 'card',
          label: 'Documentation',
          description: 'Browse our comprehensive documentation',
        },
        {
          id: 'rec-4',
          type: 'card',
          label: 'FAQ',
          description: 'Find answers to common questions',
        },
      ];
    }

    const lastMessage = messages[messages.length - 1]?.text?.toLowerCase() || '';

    if (lastMessage.includes('help') || lastMessage.includes('support')) {
      return [
        {
          id: 'rec-support-1',
          type: 'button',
          label: 'Live Chat',
          description: 'Connect with support agent',
        },
      ];
    }

    if (lastMessage.includes('documentation') || lastMessage.includes('docs')) {
      return [
        {
          id: 'rec-docs-1',
          type: 'card',
          label: 'API Reference',
          description: 'Complete API documentation',
        },
        {
          id: 'rec-docs-2',
          type: 'card',
          label: 'Tutorials',
          description: 'Step-by-step guides',
        },
      ];
    }

    return [
      {
        id: 'rec-default-1',
        type: 'button',
        label: 'More Help',
      },
      {
        id: 'rec-default-2',
        type: 'button',
        label: 'Browse Topics',
      },
    ];
  }

  // If in support mode but no specific recommendations, return empty array
  // This ensures no general recommendations appear in support mode
  return [];
};

