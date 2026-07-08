/**
 * Source service normalization (Phase 3: log-only policy preparation)
 */

const SOURCE_ALIASES = {
  DIRECTORY: 'DIRECTORY',
  HR_MANAGEMENT_REPORTING: 'MANAGEMENT_REPORTING',
  MANAGEMENT_REPORTING: 'MANAGEMENT_REPORTING',
  MANAGEMENTREPORTING: 'MANAGEMENT_REPORTING',
  LEARNING_ANALYTICS: 'LEARNING_ANALYTICS',
  LEARNINGANALYTICS: 'LEARNING_ANALYTICS',
  ASSESSMENT: 'ASSESSMENT',
  DEVLAB: 'DEVLAB',
};

/**
 * Normalize a host-provided microservice / source_service label.
 * @param {string|null|undefined} raw
 * @returns {{ raw: string|null, normalized: string }}
 */
export function normalizeSourceService(raw) {
  if (raw == null || String(raw).trim() === '') {
    return { raw: null, normalized: 'UNKNOWN' };
  }

  const original = String(raw).trim();
  const key = original.toUpperCase().replace(/[\s-]+/g, '_');
  const normalized = SOURCE_ALIASES[key] || 'UNKNOWN';

  return { raw: original, normalized };
}
