/**
 * Recommendations Generator - Generates mode-specific recommendations
 * 
 * STRICT RULES:
 * - General Mode: ONLY quick-action buttons (no documentation/FAQ cards)
 * - Support Mode: ONLY microservice support cards (no general chat suggestions)
 * - NO default templates like "Documentation", "FAQ", "Help Center" unless explicitly defined
 */

import { MODES } from '../store/slices/chatMode.slice.js';

/**
 * Gets recommendations based on current mode
 * @param {string} mode - Current chat mode
 * @param {Array} messages - Chat messages history
 * @returns {Array} - Recommendations array
 */
export const getModeSpecificRecommendations = (mode, messages = []) => {
  // ASSESSMENT SUPPORT MODE - Only microservice support cards
  if (mode === MODES.ASSESSMENT_SUPPORT) {
    return [
      {
        id: 'assess-1',
        type: 'card',
        label: 'Assessment Troubleshooting',
        description: 'Fix issues related to exams, scoring, and question banks.',
      },
      {
        id: 'assess-2',
        type: 'card',
        label: 'Create New Test',
        description: 'Start a new exam configuration.',
      },
    ];
  }

  // DEVLAB SUPPORT MODE - Only microservice support cards
  if (mode === MODES.DEVLAB_SUPPORT) {
    return [
      {
        id: 'devlab-1',
        type: 'card',
        label: 'Debug Sandbox Error',
        description: 'Resolve execution and runtime environment issues.',
      },
      {
        id: 'devlab-2',
        type: 'card',
        label: 'Review Student Submission',
        description: 'Analyze and troubleshoot submitted code.',
      },
    ];
  }

  // GENERAL CHAT MODE - Only quick-action buttons (NO documentation/FAQ cards)
  if (mode === MODES.GENERAL) {
    // Show recommendations only after initial greeting
    if (messages.length <= 1) {
      return [
        {
          id: 'rec-1',
          type: 'button',
          label: 'Get Started Guide',
        },
        {
          id: 'rec-2',
          type: 'button',
          label: 'Live Chat',
        },
      ];
    }

    // After conversation starts, return empty array (no recommendations)
    return [];
  }

  // Default: return empty array
  return [];
};

