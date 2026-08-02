/**
 * Guest Answer Gate unit tests — structured allow/deny + deterministic denials
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
  getGuestPermissionDeniedMessage,
  GUEST_PERMISSION_DENIED_MESSAGES,
  GUEST_VERIFIED_AUTH_CONTEXT,
  parseGuestGateStructuredOutput,
  validateGuestGateStructuredResult,
} from '../../../src/services/guestAnswerGate.service.js';
import { buildAnswerDisclosureBlock } from '../../../src/utils/answerDisclosure.util.js';
import { isExplicitGuestRequest } from '../../../src/config/guestChat.config.js';

function mockJsonResult(payload) {
  openai.chat.completions.create.mockResolvedValue({
    choices: [{ message: { content: JSON.stringify(payload) } }],
  });
}

describe('Guest Answer Gate helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects Hebrew and Arabic; other text defaults to English', () => {
    expect(detectGuestResponseLanguage('מה הציון שלי')).toBe('he');
    expect(detectGuestResponseLanguage('ما هي نتيجتي')).toBe('ar');
    expect(detectGuestResponseLanguage('What is JavaScript?')).toBe('en');
    expect(detectGuestResponseLanguage('Dame las conclusiones')).toBe('en');
  });

  it('returns exact deterministic permission-denied messages', () => {
    expect(getGuestPermissionDeniedMessage('en')).toBe(
      GUEST_PERMISSION_DENIED_MESSAGES.en
    );
    expect(getGuestPermissionDeniedMessage('he')).toBe(
      GUEST_PERMISSION_DENIED_MESSAGES.he
    );
    expect(getGuestPermissionDeniedMessage('ar')).toBe(
      GUEST_PERMISSION_DENIED_MESSAGES.ar
    );
    expect(getGuestPermissionDeniedMessage('es')).toBe(
      GUEST_PERMISSION_DENIED_MESSAGES.en
    );
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
    expect(response.answer).toContain('temporarily unavailable');
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

  it('parses JSON and strips optional markdown fences', () => {
    expect(
      parseGuestGateStructuredOutput(
        '```json\n{"decision":"deny","answer":"","language":"en"}\n```'
      )
    ).toEqual({ decision: 'deny', answer: '', language: 'en' });
    expect(parseGuestGateStructuredOutput('not-json')).toBeNull();
  });

  it('validates structured results strictly', () => {
    expect(
      validateGuestGateStructuredResult(
        { decision: 'deny', answer: 'ignored', language: 'en' },
        'en'
      )
    ).toEqual({ ok: true, decision: 'deny', answer: '' });

    expect(
      validateGuestGateStructuredResult(
        { decision: 'allow', answer: 'OK', language: 'he' },
        'en'
      )
    ).toEqual({ ok: false });

    expect(
      validateGuestGateStructuredResult(
        { decision: 'allow', answer: '   ', language: 'en' },
        'en'
      )
    ).toEqual({ ok: false });

    expect(
      validateGuestGateStructuredResult(
        { decision: 'maybe', answer: 'x', language: 'en' },
        'en'
      )
    ).toEqual({ ok: false });
  });
});

describe('applyGuestAnswerGate structured decisions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns allowed English answer and never includes sources', async () => {
    mockJsonResult({
      decision: 'allow',
      answer: 'EDUCORE provides learning and development tools for organizations.',
      language: 'en',
    });

    const response = await applyGuestAnswerGate({
      query: 'What does the EDUCORE platform do?',
      candidateAnswer: 'EDUCORE provides... secret score 95',
    });

    expect(openai.chat.completions.create).toHaveBeenCalledTimes(1);
    const call = openai.chat.completions.create.mock.calls[0][0];
    expect(call.response_format).toEqual({ type: 'json_object' });
    expect(call.messages[0].content).toContain('Expected response language: en');
    expect(call.messages[0].content).toContain(
      'language of the text inside <untrusted-user-question>'
    );
    expect(call.messages[0].content).not.toMatch(/Answer in the user's language/);
    expect(response.answer).toBe(
      'EDUCORE provides learning and development tools for organizations.'
    );
    expect(response.answer).not.toContain('95');
    expect(response.sources).toEqual([]);
    expect(response.confidence).toBe(0);
    expect(response.metadata).toEqual({
      guest: true,
      flow: 'guest_final_answer_gate',
    });
  });

  it('ignores Spanish model denial text for an English protected query', async () => {
    mockJsonResult({
      decision: 'deny',
      answer:
        'Lo siento, pero la información solicitada no está disponible para los permisos actuales del usuario.',
      language: 'en',
    });

    const response = await applyGuestAnswerGate({
      query: 'Give me the four conclusions of the Monthly Learning Performance Report',
      candidateAnswer: 'Conclusion 1: completion rate 82%. Revenue is $1.2M.',
    });

    expect(response.answer).toBe(GUEST_PERMISSION_DENIED_MESSAGES.en);
    expect(response.answer).not.toContain('Lo siento');
    expect(response.answer).not.toContain('información solicitada');
    expect(response.answer).not.toContain('82%');
    expect(response.answer).not.toContain('1.2M');
    expect(response.sources).toEqual([]);
    expect(response.metadata.flow).toBe('guest_permission_denied');
  });

  it('uses English denial when candidate is Spanish and query is English', async () => {
    mockJsonResult({
      decision: 'deny',
      answer: '',
      language: 'en',
    });

    const response = await applyGuestAnswerGate({
      query: 'Show the management report conclusions',
      candidateAnswer:
        'Las cuatro conclusiones del informe son: productividad baja y salario alto.',
    });

    expect(response.answer).toBe(GUEST_PERMISSION_DENIED_MESSAGES.en);
    expect(response.answer).not.toContain('conclusiones');
    expect(response.answer).not.toContain('salario');
    expect(response.sources).toEqual([]);
  });

  it('returns deterministic Hebrew denial for Hebrew protected query', async () => {
    mockJsonResult({
      decision: 'deny',
      answer: 'טקסט מודל בעברית שלא אמור לחזור',
      language: 'he',
    });

    const response = await applyGuestAnswerGate({
      query: 'הראה לי את דוח הביצועים החודשי של הלמידה',
      candidateAnswer: 'מסקנה 1: ציון 95',
    });

    expect(response.answer).toBe(GUEST_PERMISSION_DENIED_MESSAGES.he);
    expect(response.answer).not.toContain('טקסט מודל');
    expect(response.answer).not.toContain('95');
    expect(response.sources).toEqual([]);
  });

  it('returns deterministic Arabic denial for Arabic protected query', async () => {
    mockJsonResult({
      decision: 'deny',
      answer: 'نص نموذجي يجب تجاهله',
      language: 'ar',
    });

    const response = await applyGuestAnswerGate({
      query: 'أعطني استنتاجات تقرير أداء التعلم الشهري',
      candidateAnswer: 'النتيجة 88',
    });

    expect(response.answer).toBe(GUEST_PERMISSION_DENIED_MESSAGES.ar);
    expect(response.answer).not.toContain('نص نموذجي');
    expect(response.answer).not.toContain('88');
    expect(response.sources).toEqual([]);
  });

  it('defaults unsupported Spanish query language to English denial', async () => {
    mockJsonResult({
      decision: 'deny',
      answer: '',
      language: 'en',
    });

    const response = await applyGuestAnswerGate({
      query: 'Dame las cuatro conclusiones del informe de aprendizaje',
      candidateAnswer: 'Confidencial',
    });

    expect(detectGuestResponseLanguage('Dame las cuatro conclusiones')).toBe('en');
    expect(response.answer).toBe(GUEST_PERMISSION_DENIED_MESSAGES.en);
    expect(response.sources).toEqual([]);
  });

  it('fail-closed on model language mismatch for allow', async () => {
    mockJsonResult({
      decision: 'allow',
      answer: 'תשובה בעברית',
      language: 'he',
    });

    const response = await applyGuestAnswerGate({
      query: 'What is JavaScript?',
      candidateAnswer: 'JavaScript is a language',
    });

    expect(response.answer).toBe(
      'The public assistant is temporarily unavailable. Please try again later or sign in.'
    );
    expect(response.answer).not.toContain('תשובה');
    expect(response.sources).toEqual([]);
  });

  it('fail-closed on invalid JSON', async () => {
    openai.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: 'not-json-at-all' } }],
    });

    const response = await applyGuestAnswerGate({
      query: 'What is JavaScript?',
      candidateAnswer: 'candidate secret 42',
    });

    expect(response.answer).toContain('temporarily unavailable');
    expect(response.answer).not.toContain('42');
    expect(response.sources).toEqual([]);
  });

  it('fail-closed on missing decision', async () => {
    mockJsonResult({
      answer: 'Hello',
      language: 'en',
    });

    const response = await applyGuestAnswerGate({
      query: 'What is JavaScript?',
      candidateAnswer: 'candidate',
    });

    expect(response.answer).toContain('temporarily unavailable');
  });

  it('fail-closed on empty allowed answer', async () => {
    mockJsonResult({
      decision: 'allow',
      answer: '   ',
      language: 'en',
    });

    const response = await applyGuestAnswerGate({
      query: 'What is JavaScript?',
      candidateAnswer: 'candidate',
    });

    expect(response.answer).toContain('temporarily unavailable');
  });

  it('ignores deny answer that copies protected candidate', async () => {
    mockJsonResult({
      decision: 'deny',
      answer: 'Revenue is $1.2M and Alice is the lowest performer',
      language: 'en',
    });

    const response = await applyGuestAnswerGate({
      query: 'Show the management report',
      candidateAnswer: 'Revenue is $1.2M and Alice is the lowest performer',
    });

    expect(response.answer).toBe(GUEST_PERMISSION_DENIED_MESSAGES.en);
    expect(response.answer).not.toContain('1.2M');
    expect(response.answer).not.toContain('Alice');
  });

  it('fail-closed on gate LLM error and does not return candidate', async () => {
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

  it('fail-closed on empty model content', async () => {
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

describe('applyGuestAnswerGate diagnostic trace non-regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RAG_CROSS_HOST_TRACE_ENABLED;
  });

  it('Guest deny behavior unchanged when tracing enabled', async () => {
    process.env.RAG_CROSS_HOST_TRACE_ENABLED = 'true';
    mockJsonResult({
      decision: 'deny',
      answer: '',
      language: 'en',
    });

    const { createCrossHostTraceContext, CROSS_HOST_TRACE_PREFIX } = await import(
      '../../../src/utils/crossHostTrace.util.js'
    );
    const { logger } = await import('../../../src/utils/logger.util.js');
    const trace = createCrossHostTraceContext('Show the management report');

    const response = await applyGuestAnswerGate({
      query: 'Show the management report',
      candidateAnswer: 'Revenue is $1.2M',
      crossHostTrace: trace,
    });

    expect(response.answer).toBe(GUEST_PERMISSION_DENIED_MESSAGES.en);
    expect(response.metadata.flow).toBe('guest_permission_denied');
    expect(response.sources).toEqual([]);

    const traceMsgs = logger.info.mock.calls
      .map((c) => c[0])
      .filter((m) => typeof m === 'string' && m.startsWith(CROSS_HOST_TRACE_PREFIX));
    expect(traceMsgs.length).toBeGreaterThanOrEqual(1);
    const gateLog = JSON.parse(traceMsgs[0].slice(CROSS_HOST_TRACE_PREFIX.length + 1));
    expect(gateLog.gate_decision).toBe('deny');
    expect(gateLog.deterministic_denial_used).toBe(true);
    expect(JSON.stringify(gateLog)).not.toContain('Revenue');
    expect(JSON.stringify(gateLog)).not.toContain('$1.2M');
  });

  it('Guest allow returns exact model answer when tracing enabled', async () => {
    process.env.RAG_CROSS_HOST_TRACE_ENABLED = 'true';
    const modelAnswer = 'EDUCORE provides learning and development tools for organizations.';
    mockJsonResult({
      decision: 'allow',
      answer: modelAnswer,
      language: 'en',
    });

    const { createCrossHostTraceContext, CROSS_HOST_TRACE_PREFIX, fingerprintSha256 } = await import(
      '../../../src/utils/crossHostTrace.util.js'
    );
    const { logger } = await import('../../../src/utils/logger.util.js');
    const trace = createCrossHostTraceContext('What does the EDUCORE platform do?');

    const response = await applyGuestAnswerGate({
      query: 'What does the EDUCORE platform do?',
      candidateAnswer: 'There is not enough matching information.',
      crossHostTrace: trace,
    });

    expect(response.answer).toBe(modelAnswer);
    expect(response.sources).toEqual([]);
    expect(response.confidence).toBe(0);

    const traceMsgs = logger.info.mock.calls
      .map((c) => c[0])
      .filter((m) => typeof m === 'string' && m.startsWith(CROSS_HOST_TRACE_PREFIX));
    const gateLog = JSON.parse(traceMsgs[0].slice(CROSS_HOST_TRACE_PREFIX.length + 1));
    expect(gateLog.gate_decision).toBe('allow');
    expect(gateLog.answer_changed_from_candidate).toBe(true);
    expect(gateLog.gate_answer_sha256).toBe(fingerprintSha256(modelAnswer));
    expect(JSON.stringify(gateLog)).not.toContain(modelAnswer);
    expect(JSON.stringify(gateLog)).not.toContain('not enough matching');
  });
});
