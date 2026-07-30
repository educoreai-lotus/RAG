/**
 * Controller-level guest gate selection (mocked processQuery)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const processQueryMock = vi.fn();
const applyGuestAnswerGateMock = vi.fn();
const buildGuestDisabledResponseMock = vi.fn();

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
    info: vi.fn(),
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
  validateAndFixTenantId: vi.fn((id) => id || 'default'),
  logTenantAtEntryPoint: vi.fn(),
}));

import { submitQuery } from '../../../src/controllers/query.controller.js';

function mockRes() {
  return {
    setHeader: vi.fn(),
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
  };
}

describe('submitQuery guest final-answer gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GUEST_CHAT_ENABLED;
  });

  it('does not call guest gate for authenticated Management Reporting requests', async () => {
    process.env.GUEST_CHAT_ENABLED = 'true';
    const candidate = {
      success: true,
      answer: 'Management report summary',
      sources: [{ contentSnippet: 'metric' }],
      metadata: { tenant_id: 'real-tenant' },
    };
    processQueryMock.mockResolvedValue(candidate);

    const req = {
      method: 'POST',
      path: '/query',
      originalUrl: '/api/v1/query',
      headers: { origin: 'http://localhost:3000' },
      body: {
        query: 'Show the management report',
        tenant_id: 'real-tenant',
        source_service: 'HR_MANAGEMENT_REPORTING',
        context: { user_id: 'real-user', session_id: 'session_1' },
      },
      auth: {
        valid: true,
        directoryUserId: 'real-user',
        organizationId: 'real-tenant',
        primaryRole: 'System Administrator',
        isSystemAdmin: true,
        isTrainer: false,
      },
    };
    const res = mockRes();

    await submitQuery(req, res, vi.fn());

    expect(processQueryMock).toHaveBeenCalledTimes(1);
    expect(applyGuestAnswerGateMock).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(candidate);
  });

  it('applies guest gate for explicit NAUTH_PUBLIC guest requests when enabled', async () => {
    process.env.GUEST_CHAT_ENABLED = 'true';
    processQueryMock.mockResolvedValue({
      success: true,
      answer: 'Your score is 95',
      sources: [{ contentSnippet: 'score 95' }],
    });
    applyGuestAnswerGateMock.mockResolvedValue({
      success: true,
      answer: 'Please sign in to view assessment information.',
      sources: [],
      confidence: 0,
      abstained: false,
      metadata: { guest: true, flow: 'guest_final_answer_gate' },
    });

    const req = {
      method: 'POST',
      path: '/query',
      originalUrl: '/api/v1/query',
      headers: { origin: 'http://localhost:3000' },
      body: {
        query: 'What is my assessment score?',
        source_service: 'NAUTH_PUBLIC',
        guest_mode: true,
        context: { session_id: 'guest_session_abc' },
        options: { include_metadata: false },
      },
      auth: {
        valid: false,
        reason: 'missing_token',
      },
    };
    const res = mockRes();

    await submitQuery(req, res, vi.fn());

    expect(processQueryMock).toHaveBeenCalledTimes(1);
    expect(applyGuestAnswerGateMock).toHaveBeenCalledWith({
      query: 'What is my assessment score?',
      candidateAnswer: 'Your score is 95',
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        sources: [],
        metadata: expect.objectContaining({ guest: true }),
      })
    );
  });

  it('returns disabled response without processQuery when flag is false', async () => {
    process.env.GUEST_CHAT_ENABLED = 'false';
    buildGuestDisabledResponseMock.mockReturnValue({
      success: true,
      answer: 'The public assistant is not available. Please sign in to continue.',
      sources: [],
      metadata: { guest: true, flow: 'guest_chat_disabled' },
    });

    const req = {
      method: 'POST',
      path: '/query',
      originalUrl: '/api/v1/query',
      headers: {},
      body: {
        query: 'What is JavaScript?',
        source_service: 'NAUTH_PUBLIC',
        guest_mode: true,
        context: { session_id: 'guest_session_abc' },
      },
      auth: { valid: false, reason: 'missing_token' },
    };
    const res = mockRes();

    await submitQuery(req, res, vi.fn());

    expect(processQueryMock).not.toHaveBeenCalled();
    expect(applyGuestAnswerGateMock).not.toHaveBeenCalled();
    expect(buildGuestDisabledResponseMock).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        sources: [],
        metadata: expect.objectContaining({ flow: 'guest_chat_disabled' }),
      })
    );
  });

  it('ignores guest_mode when a valid authenticated user exists', async () => {
    process.env.GUEST_CHAT_ENABLED = 'true';
    const candidate = {
      success: true,
      answer: 'Authenticated answer',
      sources: [{ contentSnippet: 'ok' }],
    };
    processQueryMock.mockResolvedValue(candidate);

    const req = {
      method: 'POST',
      path: '/query',
      originalUrl: '/api/v1/query',
      headers: {},
      body: {
        query: 'Hello',
        source_service: 'NAUTH_PUBLIC',
        guest_mode: true,
        tenant_id: 'real-tenant',
        context: { user_id: 'real-user', session_id: 's1' },
      },
      auth: {
        valid: true,
        directoryUserId: 'real-user',
        organizationId: 'real-tenant',
        primaryRole: 'Employee',
        isSystemAdmin: false,
        isTrainer: false,
      },
    };
    const res = mockRes();

    await submitQuery(req, res, vi.fn());

    expect(applyGuestAnswerGateMock).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(candidate);
  });
});
