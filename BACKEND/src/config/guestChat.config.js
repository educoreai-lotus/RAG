/**
 * Guest chat feature flag (non-secret).
 * Default: disabled. Authenticated hosts are unaffected.
 */

/**
 * @returns {boolean}
 */
export function isGuestChatEnabled() {
  return process.env.GUEST_CHAT_ENABLED === 'true';
}

export const GUEST_SOURCE_SERVICE = 'NAUTH_PUBLIC';

/**
 * Explicit guest final-answer gate selection.
 * A valid authenticated request must never match.
 *
 * @param {Object} params
 * @param {boolean} params.guestMode
 * @param {string|null|undefined} params.sourceService
 * @param {boolean} params.isAuthenticated
 * @returns {boolean}
 */
export function isExplicitGuestRequest({ guestMode, sourceService, isAuthenticated }) {
  const normalizedSource =
    sourceService != null ? String(sourceService).trim().toUpperCase() : '';
  return (
    guestMode === true &&
    normalizedSource === GUEST_SOURCE_SERVICE &&
    isAuthenticated === false
  );
}
