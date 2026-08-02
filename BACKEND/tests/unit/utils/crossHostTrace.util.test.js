/**
 * Cross-host diagnostic trace util — observe-only helpers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const loggerInfo = vi.fn();

vi.mock('../../../src/utils/logger.util.js', () => ({
  logger: {
    info: (...args) => loggerInfo(...args),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  isCrossHostTraceEnabled,
  createCrossHostTraceContext,
  fingerprintSha256,
  emitCrossHostTrace,
  setCrossHostTraceHeader,
  CROSS_HOST_TRACE_PREFIX,
  CROSS_HOST_TRACE_HEADER,
  classifyTenantSource,
  inferCandidateOrigin,
  safeCandidateMetadataKeys,
} from '../../../src/utils/crossHostTrace.util.js';

describe('crossHostTrace.util', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RAG_CROSS_HOST_TRACE_ENABLED;
  });

  afterEach(() => {
    delete process.env.RAG_CROSS_HOST_TRACE_ENABLED;
  });

  it('flag missing means disabled', () => {
    expect(isCrossHostTraceEnabled()).toBe(false);
    expect(createCrossHostTraceContext('q')).toBeNull();
  });

  it('flag false means disabled', () => {
    process.env.RAG_CROSS_HOST_TRACE_ENABLED = 'false';
    expect(isCrossHostTraceEnabled()).toBe(false);
    expect(createCrossHostTraceContext('q')).toBeNull();
  });

  it('only exact lowercase true enables', () => {
    process.env.RAG_CROSS_HOST_TRACE_ENABLED = 'True';
    expect(isCrossHostTraceEnabled()).toBe(false);
    process.env.RAG_CROSS_HOST_TRACE_ENABLED = 'true';
    expect(isCrossHostTraceEnabled()).toBe(true);
  });

  it('fingerprint is deterministic SHA-256 prefix and does not equal raw text', () => {
    const a = fingerprintSha256('What does the EDUCORE platform do?');
    const b = fingerprintSha256('What does the EDUCORE platform do?');
    expect(a).toBe(b);
    expect(a).toHaveLength(16);
    expect(a).not.toContain('EDUCORE');
    expect(a).not.toContain('platform');
  });

  it('emitCrossHostTrace is a no-op when disabled or null', () => {
    emitCrossHostTrace(null, { stage: 'request_classified' });
    emitCrossHostTrace({ enabled: false, traceId: 'x' }, { stage: 'request_classified' });
    expect(loggerInfo).not.toHaveBeenCalled();
  });

  it('emitCrossHostTrace writes prefixed JSON without forbidden raw fields', () => {
    process.env.RAG_CROSS_HOST_TRACE_ENABLED = 'true';
    const trace = createCrossHostTraceContext('hello');
    emitCrossHostTrace(trace, {
      stage: 'candidate_ready',
      candidate_sha256: fingerprintSha256('answer'),
      tenant_id: 'should-be-stripped',
      user_id: 'should-be-stripped',
      authorization: 'Bearer secret',
      candidate_answer: 'full text must not log',
    });

    expect(loggerInfo).toHaveBeenCalledTimes(1);
    const message = loggerInfo.mock.calls[0][0];
    expect(message.startsWith(CROSS_HOST_TRACE_PREFIX)).toBe(true);
    const jsonPart = message.slice(CROSS_HOST_TRACE_PREFIX.length + 1);
    const parsed = JSON.parse(jsonPart);
    expect(parsed.trace_id).toBe(trace.traceId);
    expect(parsed.stage).toBe('candidate_ready');
    expect(parsed.tenant_id).toBeUndefined();
    expect(parsed.user_id).toBeUndefined();
    expect(parsed.authorization).toBeUndefined();
    expect(parsed.candidate_answer).toBeUndefined();
    expect(JSON.stringify(parsed)).not.toContain('Bearer');
    expect(JSON.stringify(parsed)).not.toContain('full text');
  });

  it('setCrossHostTraceHeader only when enabled', () => {
    const res = { setHeader: vi.fn() };
    setCrossHostTraceHeader(res, null);
    expect(res.setHeader).not.toHaveBeenCalled();

    process.env.RAG_CROSS_HOST_TRACE_ENABLED = 'true';
    const trace = createCrossHostTraceContext('q');
    setCrossHostTraceHeader(res, trace);
    expect(res.setHeader).toHaveBeenCalledWith(CROSS_HOST_TRACE_HEADER, trace.traceId);
  });

  it('tenant fingerprint helpers never expose raw tenant', () => {
    expect(classifyTenantSource({ bodyTenantId: undefined, hasAuthTenant: false, hasHeaderTenant: false })).toBe(
      'remapped_default'
    );
    expect(classifyTenantSource({ bodyTenantId: 'default', hasAuthTenant: false, hasHeaderTenant: false })).toBe(
      'remapped_default'
    );
    expect(classifyTenantSource({ bodyTenantId: 'org-uuid', hasAuthTenant: false, hasHeaderTenant: false })).toBe(
      'body'
    );
    const fp = fingerprintSha256('b9db3773-ca63-4da3-9ac3-c69bb858a6a8');
    expect(fp).not.toContain('b9db3773');
  });

  it('inferCandidateOrigin uses metadata/code-path evidence only', () => {
    expect(inferCandidateOrigin({ metadata: { cached: true } })).toBe('cache');
    expect(inferCandidateOrigin({ metadata: { mode: 'general_openai' } })).toBe('fallback');
    expect(inferCandidateOrigin({ reason: 'below_threshold', metadata: {} })).toBe('no_data');
    expect(inferCandidateOrigin({ metadata: { mode: 'rag', sources_retrieved: 2 } })).toBe(
      'rag_generation'
    );
    expect(inferCandidateOrigin({})).toBe('unknown');
  });

  it('safeCandidateMetadataKeys strips identity keys', () => {
    expect(
      safeCandidateMetadataKeys({
        cached: true,
        mode: 'rag',
        tenant_id: 'secret',
        user_id: 'u1',
      })
    ).toEqual(['cached', 'mode']);
  });

  it('concurrent contexts do not share trace IDs', () => {
    process.env.RAG_CROSS_HOST_TRACE_ENABLED = 'true';
    const a = createCrossHostTraceContext('q1');
    const b = createCrossHostTraceContext('q2');
    expect(a.traceId).not.toBe(b.traceId);
    emitCrossHostTrace(a, { stage: 'request_classified', marker: 'A' });
    emitCrossHostTrace(b, { stage: 'request_classified', marker: 'B' });
    const ids = loggerInfo.mock.calls.map((c) => JSON.parse(c[0].slice(CROSS_HOST_TRACE_PREFIX.length + 1)).trace_id);
    expect(ids[0]).toBe(a.traceId);
    expect(ids[1]).toBe(b.traceId);
  });
});
