/**
 * Temporary diagnostic logging for cross-host answer divergence.
 * Observes existing behavior only — never changes answers, retrieval, or gates.
 *
 * Enable with RAG_CROSS_HOST_TRACE_ENABLED=true (exact lowercase). Missing/false = off.
 */

import { createHash, randomUUID } from 'crypto';
import { logger } from './logger.util.js';

export const CROSS_HOST_TRACE_PREFIX = '[RAG CROSS HOST TRACE]';
export const CROSS_HOST_TRACE_HEADER = 'X-RAG-Trace-Id';

/**
 * Keys that must never appear in serialized trace records.
 * Allows diagnostic fields such as tenant_fingerprint / tenant_source / tenant_included.
 */
const FORBIDDEN_TRACE_KEY_EXACT = new Set([
  'authorization',
  'token',
  'cookie',
  'password',
  'secret',
  'email',
  'tenant',
  'tenant_id',
  'tenantId',
  'user_id',
  'userId',
  'userid',
  'organization',
  'organizationId',
  'organization_id',
  'directoryUserId',
  'directory_user_id',
  'raw_answer',
  'candidate_answer',
  'final_answer',
  'prompt',
  'system_prompt',
  'embedding',
  'embeddings',
]);

const FORBIDDEN_TRACE_KEY_FRAGMENT = /(authorization|bearer|jwt|cookie|password|secret|email|embedding)/i;

function isForbiddenTraceKey(key) {
  if (FORBIDDEN_TRACE_KEY_EXACT.has(key)) {
    return true;
  }
  if (FORBIDDEN_TRACE_KEY_FRAGMENT.test(key)) {
    return true;
  }
  // Block raw identity fields; allow tenant_fingerprint / tenant_source / *_included
  if (/^(raw_)?(tenant_id|user_id|organization_id)$/i.test(key)) {
    return true;
  }
  return false;
}

/**
 * @returns {boolean}
 */
export function isCrossHostTraceEnabled() {
  return process.env.RAG_CROSS_HOST_TRACE_ENABLED === 'true';
}

/**
 * Stable short fingerprint (first 16 hex chars of SHA-256).
 * @param {unknown} value
 * @returns {string}
 */
export function fingerprintSha256(value) {
  return createHash('sha256')
    .update(String(value ?? ''), 'utf8')
    .digest('hex')
    .slice(0, 16);
}

/**
 * @param {string} [query]
 * @returns {{ enabled: true, traceId: string, queryHash: string } | null}
 */
export function createCrossHostTraceContext(query) {
  if (!isCrossHostTraceEnabled()) {
    return null;
  }
  return {
    enabled: true,
    traceId: randomUUID(),
    queryHash: fingerprintSha256(query),
  };
}

/**
 * Emit one compact structured JSON log line. No-op when tracing is disabled.
 * Strips forbidden keys if accidentally included.
 * @param {{ enabled?: boolean, traceId?: string } | null | undefined} trace
 * @param {Record<string, unknown>} fields
 */
export function emitCrossHostTrace(trace, fields) {
  if (!trace?.enabled || !trace.traceId) {
    return;
  }

  const record = { trace_id: trace.traceId };
  if (fields && typeof fields === 'object') {
    for (const [key, value] of Object.entries(fields)) {
      if (isForbiddenTraceKey(key)) {
        continue;
      }
      record[key] = value;
    }
  }

  logger.info(`${CROSS_HOST_TRACE_PREFIX} ${JSON.stringify(record)}`);
}

/**
 * Set response header only when tracing is enabled.
 * @param {import('express').Response} res
 * @param {{ enabled?: boolean, traceId?: string } | null | undefined} trace
 */
export function setCrossHostTraceHeader(res, trace) {
  if (!trace?.enabled || !trace.traceId || !res?.setHeader) {
    return;
  }
  res.setHeader(CROSS_HOST_TRACE_HEADER, trace.traceId);
}

/**
 * Safe metadata key names for candidate_ready (no identity / secrets).
 * @param {unknown} metadata
 * @returns {string[]}
 */
export function safeCandidateMetadataKeys(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return [];
  }
  return Object.keys(metadata).filter((key) => !isForbiddenTraceKey(key));
}

/**
 * Infer candidate origin from processQuery result metadata only (no text heuristics).
 * @param {object | null | undefined} result
 * @returns {'rag_generation'|'no_data'|'fallback'|'cache'|'error'|'unknown'}
 */
export function inferCandidateOrigin(result) {
  if (!result || typeof result !== 'object') {
    return 'unknown';
  }
  const meta = result.metadata && typeof result.metadata === 'object' ? result.metadata : {};

  if (meta.cached === true || meta.cache_hit === true || meta.flow === 'semantic_cache') {
    return 'cache';
  }
  if (meta.mode === 'general_openai') {
    return 'fallback';
  }
  if (
    meta.filtering_reason === 'NO_DATA' ||
    meta.filtering_reason === 'LOW_SIMILARITY' ||
    result.reason === 'no_vector_results' ||
    result.reason === 'below_threshold' ||
    result.reason === 'no_edudata_context'
  ) {
    return 'no_data';
  }
  if (meta.model_version === 'rbac-blocked' || result.reason === 'permission_denied') {
    return 'fallback';
  }
  if (meta.mode === 'rag' || (typeof meta.sources_retrieved === 'number' && meta.sources_retrieved > 0)) {
    return 'rag_generation';
  }
  if (result.error) {
    return 'error';
  }
  return 'unknown';
}

/**
 * Classify tenant provenance for request_classified (no raw tenant values).
 * @param {object} params
 * @param {unknown} params.bodyTenantId - raw req.body.tenant_id before Joi defaults if available
 * @param {boolean} params.hasAuthTenant
 * @param {boolean} params.hasHeaderTenant
 * @returns {'body'|'header'|'auth'|'default'|'remapped_default'|'unknown'}
 */
export function classifyTenantSource({ bodyTenantId, hasAuthTenant, hasHeaderTenant }) {
  if (hasAuthTenant) {
    return 'auth';
  }
  if (hasHeaderTenant) {
    return 'header';
  }
  if (bodyTenantId == null || bodyTenantId === '') {
    return 'remapped_default';
  }
  const normalized = String(bodyTenantId).trim();
  if (normalized === 'default' || normalized === 'default.local') {
    return 'remapped_default';
  }
  return 'body';
}

/**
 * Round similarity scores for compact logs.
 * @param {unknown} score
 * @returns {number|null}
 */
export function roundTraceScore(score) {
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return null;
  }
  return Math.round(score * 10000) / 10000;
}
