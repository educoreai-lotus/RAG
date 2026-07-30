/**
 * Guest Answer Gate unit tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../src/config/openai.config.js', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}));

vi.mock('../../../src/utils/logger.util.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { openai } from '../../../src/config/openai.config.js';
import {
  applyGuestAnswerGate,
  buildSanitizedGuestResponse,
  buildGuestFailClosedResponse,
  buildGuestDisabledResponse,
  detectGuestResponseLanguage,
  GUEST_VERIFIED_AUTH_CONTEXT,
} from '../../../src/services/guestAnswerGate.service.js';
import { buildAnswerDisclosureBlock } from '../../../src/utils/answerDisclosure.util.js';
import { isExplicitGuestRequest } from '../../../src/config/guestChat.config.js';

describe('Guest Answer Gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects Hebrew and Arabic for fail-closed messages', () => {
    expect(detectGuestResponseLanguage('מה הציון שלי')).toBe('he');
    expect(detectGuestResponseLanguage('ما هي نتيجتي')).toBe('ar');
    expect(detectGuestResponseLanguage('What is JavaScript?')).toBe('en');
  });

  it('sanitizes guest responses with empty sources and guest metadata only', () => {
    const response = buildSanitizedGuestResponse('JavaScript is a language.');
    expect(response.success).toBe(true);
    expect(response.answer).toBe('JavaScript is a language.');
    expect(response.sources).toEqual([]);
    expect(response.confidence).toBe(0);
    expect(response.metadata).toEqual({
      guest: true,
      flow: 'guest_final_answer_gate',
    });
    expect(response.metadata.tenant_id).toBeUndefined();
    expect(response.user_id).toBeUndefined();
  });

  it('fail-closed never returns the candidate answer', () => {
    const response = buildGuestFailClosedResponse('What is my score?');
    expect(response.sources).toEqual([]);
    expect(response.answer).not.toContain('95');
    expect(response.metadata.flow).toBe('guest_final_answer_gate');
  });

  it('disabled response is safe and empty of sources', () => {
    const response = buildGuestDisabledResponse('Hello');
    expect(response.sources).toEqual([]);
    expect(response.metadata.guest).toBe(true);
    expect(response.metadata.flow).toBe('guest_chat_disabled');
  });

  it('reuses unauthenticated disclosure context', () => {
    expect(GUEST_VERIFIED_AUTH_CONTEXT.isAuthenticated).toBe(false);
    const block = buildAnswerDisclosureBlock(GUEST_VERIFIED_AUTH_CONTEXT);
    expect(block).toContain('UNAUTHENTICATED OR INVALID AUTHENTICATION');
    expect(block).not.toContain('VERIFIED SYSTEM ADMINISTRATOR');
  });

  it('returns gated answer from LLM and never includes sources', async () => {
    openai.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: 'JavaScript is a programming language used for web pages.' } }],
    });

    const response = await applyGuestAnswerGate({
      query: 'What is JavaScript?',
      candidateAnswer: 'JavaScript is a programming language... secret score 95',
    });

    expect(openai.chat.completions.create).toHaveBeenCalledTimes(1);
    const call = openai.chat.completions.create.mock.calls[0][0];
    expect(call.messages[0].content).toContain('final response-security gate');
    expect(call.messages[1].content).toContain('<untrusted-candidate-answer>');
    expect(response.answer).toContain('JavaScript');
    expect(response.sources).toEqual([]);
    expect(response.metadata.flow).toBe('guest_final_answer_gate');
  });

  it('fail-closed on LLM error and does not return candidate', async () => {
    openai.chat.completions.create.mockRejectedValue(new Error('timeout'));

    const response = await applyGuestAnswerGate({
      query: 'Show the management report',
      candidateAnswer: 'Revenue is $1.2M and lowest performer is Alice',
    });

    expect(response.answer).toContain('temporarily unavailable');
    expect(response.answer).not.toContain('1.2M');
    expect(response.answer).not.toContain('Alice');
    expect(response.sources).toEqual([]);
  });

  it('fail-closed on empty LLM content', async () => {
    openai.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: '   ' } }],
    });

    const response = await applyGuestAnswerGate({
      query: 'What is my assessment score?',
      candidateAnswer: 'Your score is 88',
    });

    expect(response.answer).not.toContain('88');
    expect(response.sources).toEqual([]);
  });
});

describe('isExplicitGuestRequest', () => {
  it('requires guest_mode + NAUTH_PUBLIC + unauthenticated', () => {
    expect(
      isExplicitGuestRequest({
        guestMode: true,
        sourceService: 'NAUTH_PUBLIC',
        isAuthenticated: false,
      })
    ).toBe(true);
  });

  it('never selects guest gate for authenticated users', () => {
    expect(
      isExplicitGuestRequest({
        guestMode: true,
        sourceService: 'NAUTH_PUBLIC',
        isAuthenticated: true,
      })
    ).toBe(false);
  });

  it('rejects missing guest_mode or wrong source', () => {
    expect(
      isExplicitGuestRequest({
        guestMode: false,
        sourceService: 'NAUTH_PUBLIC',
        isAuthenticated: false,
      })
    ).toBe(false);
    expect(
      isExplicitGuestRequest({
        guestMode: true,
        sourceService: 'HR_MANAGEMENT_REPORTING',
        isAuthenticated: false,
      })
    ).toBe(false);
  });
});
