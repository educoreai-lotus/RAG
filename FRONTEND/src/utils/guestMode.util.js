/**
 * Guest-mode helpers for the embedded EDUCORE widget (React path).
 * Detection rules mirror FRONTEND/public/bot.js.
 */

export const GUEST_SOURCE_SERVICE = 'NAUTH_PUBLIC';
export const GUEST_SESSION_STORAGE_KEY = 'educore_guest_session_id';

/**
 * @param {unknown} token
 * @returns {boolean}
 */
export function hasRealToken(token) {
  return typeof token === 'string' && token.trim().length > 0;
}

/**
 * Explicit guest activation (token absence alone is never enough).
 * @param {Object} config
 * @returns {boolean}
 */
export function shouldActivateGuestMode(config = {}) {
  const allowGuest = config.allowGuest === true;
  const noRealToken = !hasRealToken(config.token);
  const microservice = String(config.microservice || '').toUpperCase();
  return allowGuest && noRealToken && microservice === GUEST_SOURCE_SERVICE;
}

/**
 * @returns {string}
 */
export function createGuestSessionId() {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  return `guest_session_${random}`;
}

/**
 * Clear only RAG-owned auth keys that could leak into guest mode.
 */
export function clearRagAuthStorage() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('tenant_id');
}

/**
 * Clear guest-only session continuity key.
 */
export function clearGuestSessionStorage() {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
  // Prefer guest-specific key; also clear legacy chatbot session when entering guest
  // so authenticated continuity is not reused for guests.
  sessionStorage.removeItem('chatbot_session_id');
}

/**
 * Ensure a guest session id exists for frontend chat continuity only.
 * @returns {string}
 */
export function getOrCreateGuestSessionId() {
  if (typeof sessionStorage === 'undefined') {
    return createGuestSessionId();
  }
  const existing = sessionStorage.getItem(GUEST_SESSION_STORAGE_KEY);
  if (existing && existing.startsWith('guest_session_')) {
    return existing;
  }
  const created = createGuestSessionId();
  sessionStorage.setItem(GUEST_SESSION_STORAGE_KEY, created);
  return created;
}

/**
 * Build the guest query request body (no identity fields).
 * @param {string} query
 * @param {string} sessionId
 * @returns {Object}
 */
export function buildGuestQueryPayload(query, sessionId) {
  return {
    query,
    source_service: GUEST_SOURCE_SERVICE,
    guest_mode: true,
    context: {
      session_id: sessionId,
    },
    options: {
      max_results: 5,
      min_confidence: 0.7,
      include_metadata: false,
    },
  };
}

export const GUEST_UNAVAILABLE_MESSAGE =
  'The public assistant is temporarily unavailable. Please try again later or sign in.';
