/**
 * Mode Detector - Detects chat mode based on user message keywords
 */

import { MODES } from '../store/slices/chatMode.slice.js';

// Assessment Support Mode keywords
const ASSESSMENT_KEYWORDS = [
  'assessment',
  'test',
  'exam',
  'question bank',
  'scoring',
  'grading',
  'quiz',
  'questions',
  'evaluation',
];

// DevLab Support Mode keywords
const DEVLAB_KEYWORDS = [
  'devlab',
  'auto grader',
  'code execution',
  'sandbox',
  'runtime error',
  'submission',
  'code',
  'programming',
  'debug',
  'github integration',
  'environment',
];

// Exit Support Mode keywords
const EXIT_KEYWORDS = [
  'exit support',
  'finish',
  'back to chat',
  'return to general chat',
  'exit',
  'back',
  'general chat',
];

/**
 * Detects if message should trigger mode change
 * @param {string} message - User message
 * @param {string} currentMode - Current chat mode
 * @returns {string|null} - New mode to switch to, or null if no change
 */
export const detectModeChange = (message, currentMode) => {
  const lowerMessage = message.toLowerCase();

  // Check for exit keywords first
  if (currentMode !== MODES.GENERAL) {
    const shouldExit = EXIT_KEYWORDS.some((keyword) =>
      lowerMessage.includes(keyword)
    );
    if (shouldExit) {
      return MODES.GENERAL;
    }
  }

  // If already in support mode, stay in support mode (unless exit)
  if (currentMode !== MODES.GENERAL) {
    return null; // Stay in current support mode
  }

  // Check for Assessment Support keywords
  const hasAssessmentKeyword = ASSESSMENT_KEYWORDS.some((keyword) =>
    lowerMessage.includes(keyword)
  );
  if (hasAssessmentKeyword) {
    return MODES.ASSESSMENT_SUPPORT;
  }

  // Check for DevLab Support keywords
  const hasDevLabKeyword = DEVLAB_KEYWORDS.some((keyword) =>
    lowerMessage.includes(keyword)
  );
  if (hasDevLabKeyword) {
    return MODES.DEVLAB_SUPPORT;
  }

  return null; // No mode change
};

/**
 * Gets mode-specific bot response
 * @param {string} message - User message
 * @param {string} mode - Current chat mode
 * @returns {string} - Bot response
 */
export const getModeSpecificResponse = (message, mode) => {
  const lowerMessage = message.toLowerCase();

  if (mode === MODES.ASSESSMENT_SUPPORT) {
    if (lowerMessage.includes('create') || lowerMessage.includes('new')) {
      return "I can help you create exams and quizzes. Would you like to create a new exam, set up a question bank, or configure scoring logic?";
    }
    if (lowerMessage.includes('scoring') || lowerMessage.includes('grading')) {
      return "For scoring and grading, I can help you set up automatic grading rules, configure point values, and troubleshoot scoring issues. What specific scoring challenge are you facing?";
    }
    if (lowerMessage.includes('error') || lowerMessage.includes('problem')) {
      return "I'm here to help troubleshoot assessment issues. Common problems include question bank errors, scoring calculation issues, and API integration problems. What error are you seeing?";
    }
    if (lowerMessage.includes('api') || lowerMessage.includes('integration')) {
      return "The Assessment API allows you to create exams, manage question banks, and retrieve results. I can guide you through the API endpoints and best practices. What would you like to know?";
    }
    return "I'm in Assessment Support mode. I can help with creating exams, question banks, scoring logic, troubleshooting errors, and API usage. What do you need help with?";
  }

  if (mode === MODES.DEVLAB_SUPPORT) {
    if (lowerMessage.includes('code') || lowerMessage.includes('execution')) {
      return "I can help with code execution issues. This includes sandbox errors, runtime problems, and execution timeouts. What specific issue are you experiencing?";
    }
    if (lowerMessage.includes('error') || lowerMessage.includes('debug')) {
      return "For debugging sandbox errors, I can help identify runtime issues, environment problems, and submission failures. Please share the error message or describe the problem.";
    }
    if (lowerMessage.includes('submission') || lowerMessage.includes('submit')) {
      return "I can help with submission workflows, including handling student submissions, processing results, and troubleshooting submission failures. What do you need?";
    }
    if (lowerMessage.includes('github') || lowerMessage.includes('integration')) {
      return "For GitHub integration, I can help set up repository connections, configure webhooks, and troubleshoot sync issues. What would you like to configure?";
    }
    if (lowerMessage.includes('environment') || lowerMessage.includes('sandbox')) {
      return "I can help debug environment and sandbox issues. This includes container problems, dependency errors, and runtime environment configuration. What's the issue?";
    }
    return "I'm in DevLab Support mode. I can help with code execution, auto-grading, sandbox errors, submission workflows, GitHub integration, and environment debugging. How can I assist?";
  }

  // General mode responses (only in GENERAL mode)
  if (mode === MODES.GENERAL) {
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return "Hello! I'm here to help you. What would you like to know?";
    }
    if (lowerMessage.includes('help')) {
      return "I can help you with various topics. Feel free to ask me anything!";
    }
    if (lowerMessage.includes('thanks') || lowerMessage.includes('thank you')) {
      return "You're welcome! Is there anything else I can help you with?";
    }
    if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
      return "Goodbye! Have a great day!";
    }

    return `I understand you're asking about "${message}". Let me help you with that!`;
  }

  // Support mode responses - no small talk, only focused help
  // If user tries small talk in support mode, redirect to support topics
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    if (mode === MODES.ASSESSMENT_SUPPORT) {
      return "I'm in Assessment Support mode. I can help with creating exams, question banks, scoring logic, troubleshooting errors, and API usage. What do you need help with?";
    }
    if (mode === MODES.DEVLAB_SUPPORT) {
      return "I'm in DevLab Support mode. I can help with code execution, auto-grading, sandbox errors, submission workflows, GitHub integration, and environment debugging. How can I assist?";
    }
  }

  if (lowerMessage.includes('thanks') || lowerMessage.includes('thank you')) {
    if (mode === MODES.ASSESSMENT_SUPPORT) {
      return "You're welcome! Is there anything else related to assessments I can help you with?";
    }
    if (mode === MODES.DEVLAB_SUPPORT) {
      return "You're welcome! Is there anything else related to DevLab I can help you with?";
    }
  }

  // Default support mode response
  if (mode === MODES.ASSESSMENT_SUPPORT) {
    return "I'm focused on Assessment Support. I can help with creating exams, question banks, scoring logic, troubleshooting errors, and API usage. What specific issue do you need help with?";
  }

  if (mode === MODES.DEVLAB_SUPPORT) {
    return "I'm focused on DevLab Support. I can help with code execution, auto-grading, sandbox errors, submission workflows, GitHub integration, and environment debugging. What specific issue do you need help with?";
  }

  return `I understand you're asking about "${message}". Let me help you with that!`;
};

