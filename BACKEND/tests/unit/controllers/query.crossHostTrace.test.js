/**
 * Controller-level cross-host diagnostic trace (flag-gated, answer-preserving)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const processQueryMock = vi.fn();
const applyGuestAnswerGateMock = vi.fn();
const buildGuestDisabledResponseMock = vi.fn();
const loggerInfo = vi.fn();

vi.mock('../../../src/services/queryProcessing.service.js', () => ({
  processQuery: (...args) => processQueryMock(...args),
}));

vi.mock('../../../src/services/guestAnswerGate.service.js', () => ({
  applyGuestAnswerGate: (...args) => applyGuestAnswerGateMock(...args),
  buildGuestDisabledResponse: (...args) => buildGuestDisabledResponseMock(...args),
}));

vi.mock('../../../src/controllers/microserviceSupport.controller.js', () => ({
  assessmentSupport: vi.fn(),
  devlabSupport: vi.fn(),
}));

vi.mock('../../../src/utils/logger.util.js', () => ({
  logger: {
    info: (...args) => loggerInfo(...args),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../../src/services/authorizationPolicy.service.js', () => ({
  evaluateAuthorizationPolicy: vi.fn(() => ({ mode: 'off' })),
  logAuthorizationPolicyDecision: vi.fn(),
}));

vi.mock('../../../src/utils/tenant-validation.util.js', () => ({
  validateAndFixTenantId: vi.fn((id) => id || 'default-tenant'),
  logTenantAtEntryPoint: vi.fn(),
}));

import { submitQuery } from '../../../src/controllers/query.controller.js';
import { CROSS_HOST_TRACE_PREFIX, CROSS_HOST_TRACE_HEADER } from '../../../src/utils/crossHostTrace.util.js';

function mockRes() {
  return {
    setHeader: vi.fn(),
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
  };
}

function parseTraceLogs() {
  return loggerInfo.mock.calls
    .map((c) => c[0])
    .filter((msg) => typeof msg === 'string' && msg.startsWith(CROSS_HOST_TRACE_PREFIX))
    .map((msg) => JSON.parse(msg.slice(CROSS_HOST_TRACE_PREFIX.length + 1)));
}

describe('submitQuery cross-host diagnostic trace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GUEST_CHAT_ENABLED;
    delete process.env.RAG_CROSS_HOST_TRACE_ENABLED;
  });

  afterEach(() => {
    delete process.env.GUEST_CHAT_ENABLED;
    delete process.env.RAG_CROSS_HOST_TRACE_ENABLED;
  });

  it('flag missing: no trace logs, no header, answer unchanged', async () => {
    process.env.GUEST_CHAT_ENABLED = 'true';
    const candidate = {
      success: true,
      answer: 'Directory answer',
      sources: [{ id: 1 }],
      confidence: 0.8,
      metadata: { mode: 'rag' },
    };
    processQueryMock.mockResolvedValue(candidate);

    const req = {
      method: 'POST',
      path: '/query',
      originalUrl: '/api/v1/query',
      headers: {},
      body: {
        query: 'What does the EDUCORE platform do?',
        tenant_id: 'org-1',
        source_service: 'DIRECTORY',
        context: { user_id: 'u1', session_id: 's1' },
        options: { max_results: 5, min_confidence: 0.7, include_metadata: true },
      },
      auth: {
        valid: true,
        directoryUserId: 'u1',
        organizationId: 'org-1',
        primaryRole: 'Employee',
        isSystemAdmin: false,
        isTrainer: false,
      },
    };
    const res = mockRes();
    await submitQuery(req, res, vi.fn());

    expect(parseTraceLogs()).toHaveLength(0);
    expect(res.setHeader).not.toHaveBeenCalledWith(CROSS_HOST_TRACE_HEADER, expect.anything());
    expect(res.json).toHaveBeenCalledWith(candidate);
  });

  it('flag false: no trace logs, response unchanged', async () => {
    process.env.RAG_CROSS_HOST_TRACE_ENABLED = 'false';
    process.env.GUEST_CHAT_ENABLED = 'true';
    const candidate = { answer: 'ok', sources: [], confidence: 0.5, metadata: {} };
    processQueryMock.mockResolvedValue(candidate);

    const req = {
      method: 'POST',
      path: '/query',
      originalUrl: '/api/v1/query',
      headers: {},
      body: {
        query: 'Hello',
        source_service: 'DIRECTORY',
        context: { user_id: 'u1' },
      },
      auth: { valid: true, directoryUserId: 'u1', isSystemAdmin: false, isTrainer: false },
    };
    const res = mockRes();
    await submitQuery(req, res, vi.fn());

    expect(parseTraceLogs()).toHaveLength(0);
    expect(res.json).toHaveBeenCalledWith(candidate);
  });

  it('flag true authenticated: process_query owner, no guest gate stage, body unchanged', async () => {
    process.env.RAG_CROSS_HOST_TRACE_ENABLED = 'true';
    process.env.GUEST_CHAT_ENABLED = 'true';
    const candidate = {
      answer: 'There is not enough matching information in the provided context.',
      sources: [],
      confidence: 0,
      metadata: { mode: 'rag', filtering_reason: 'NO_DATA', cached: false },
    };
    processQueryMock.mockResolvedValue(candidate);

    const req = {
      method: 'POST',
      path: '/query',
      originalUrl: '/api/v1/query',
      headers: {},
      body: {
        query: 'What does the EDUCORE platform do?',
        tenant_id: 'org-1',
        source_service: 'DIRECTORY',
        context: { user_id: 'u1', session_id: 's1' },
        options: { max_results: 5, min_confidence: 0.7, include_metadata: true },
      },
      auth: {
        valid: true,
        directoryUserId: 'u1',
        organizationId: 'org-1',
        primaryRole: 'Employee',
        isSystemAdmin: false,
        isTrainer: false,
      },
    };
    const res = mockRes();
    await submitQuery(req, res, vi.fn());

    expect(applyGuestAnswerGateMock).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(candidate);
    expect(res.setHeader).toHaveBeenCalledWith(CROSS_HOST_TRACE_HEADER, expect.any(String));

    const traces = parseTraceLogs();
    const stages = traces.map((t) => t.stage);
    expect(stages).toContain('request_classified');
    expect(stages).toContain('candidate_ready');
    expect(stages).toContain('final_response');
    expect(stages).not.toContain('guest_gate_completed');

    const final = traces.find((t) => t.stage === 'final_response');
    expect(final.final_answer_owner).toBe('process_query');
    expect(final.final_differs_from_candidate).toBe(false);

    const serialized = JSON.stringify(traces);
    expect(serialized).not.toContain('org-1');
    expect(serialized).not.toContain('u1');
    expect(serialized).not.toContain(candidate.answer);
    expect(serialized).not.toContain('Authorization');
  });

  it('flag true explicit Guest: shared trace id across stages, gate called, response unchanged', async () => {
    process.env.RAG_CROSS_HOST_TRACE_ENABLED = 'true';
    process.env.GUEST_CHAT_ENABLED = 'true';
    processQueryMock.mockResolvedValue({
      answer: 'Candidate insufficient',
      sources: [],
      confidence: 0,
      metadata: { filtering_reason: 'NO_DATA' },
    });
    const guestBody = {
      success: true,
      answer: 'EDUCORE provides learning tools.',
      sources: [],
      confidence: 0,
      abstained: false,
      metadata: { guest: true, flow: 'guest_final_answer_gate' },
    };
    applyGuestAnswerGateMock.mockImplementation(async ({ candidateAnswer, crossHostTrace }) => {
      if (crossHostTrace?.enabled) {
        crossHostTrace._gateResult = { decision: 'allow', parseStatus: 'valid' };
        const { emitCrossHostTrace, fingerprintSha256 } = await import(
          '../../../src/utils/crossHostTrace.util.js'
        );
        const gateAnswer = guestBody.answer;
        emitCrossHostTrace(crossHostTrace, {
          stage: 'guest_gate_completed',
          gate_called: true,
          gate_parse_status: 'valid',
          gate_decision: 'allow',
          expected_language: 'en',
          candidate_sha256: fingerprintSha256(candidateAnswer),
          gate_answer_length: gateAnswer.length,
          gate_answer_sha256: fingerprintSha256(gateAnswer),
          answer_changed_from_candidate: true,
          deterministic_denial_used: false,
        });
      }
      return guestBody;
    });

    const req = {
      method: 'POST',
      path: '/query',
      originalUrl: '/api/v1/query',
      headers: {},
      body: {
        query: 'What does the EDUCORE platform do?',
        source_service: 'NAUTH_PUBLIC',
        guest_mode: true,
        context: { session_id: 'guest_session' },
        options: { max_results: 5, min_confidence: 0.7, include_metadata: false },
      },
      auth: { valid: false, reason: 'missing_token' },
    };
    const res = mockRes();
    await submitQuery(req, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith(guestBody);
    expect(applyGuestAnswerGateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'What does the EDUCORE platform do?',
        candidateAnswer: 'Candidate insufficient',
        crossHostTrace: expect.objectContaining({ enabled: true, traceId: expect.any(String) }),
      })
    );

    const headerTraceId = res.setHeader.mock.calls.find((c) => c[0] === CROSS_HOST_TRACE_HEADER)?.[1];
    const traces = parseTraceLogs();
    expect(traces.length).toBeGreaterThanOrEqual(3);
    expect(traces.every((t) => t.trace_id === headerTraceId)).toBe(true);

    const classified = traces.find((t) => t.stage === 'request_classified');
    expect(classified.explicit_guest).toBe(true);
    expect(classified.authenticated).toBe(false);

    const final = traces.find((t) => t.stage === 'final_response');
    expect(final.final_answer_owner).toBe('guest_gate_allow');
    expect(final.final_differs_from_candidate).toBe(true);

    const serialized = JSON.stringify(traces);
    expect(serialized).not.toContain('Candidate insufficient');
    expect(serialized).not.toContain('EDUCORE provides learning tools');
  });
});
