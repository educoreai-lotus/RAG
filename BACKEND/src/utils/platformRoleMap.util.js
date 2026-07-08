/**
 * Platform role / persona mapping from verified Coordinator auth (Phase 3 log-only)
 */

/**
 * Derive a Directory persona label from verified auth context.
 * @param {Object|null|undefined} auth - req.auth from coordinatorAuthMiddleware
 * @returns {string}
 */
export function detectDirectoryPersona(auth) {
  if (!auth || auth.valid !== true) {
    return 'UNKNOWN';
  }

  if (auth.isSystemAdmin === true) {
    return 'SYSTEM_ADMIN';
  }

  const primaryRole = auth.primaryRole != null
    ? String(auth.primaryRole).trim().toUpperCase()
    : '';

  if (primaryRole === 'HR') {
    return 'HR';
  }
  if (primaryRole === 'DEPARTMENT_MANAGER') {
    return 'DEPARTMENT_MANAGER';
  }
  if (primaryRole === 'TEAM_MANAGER') {
    return 'TEAM_MANAGER';
  }
  if (auth.isTrainer === true || primaryRole === 'TRAINER') {
    return 'TRAINER';
  }
  if (primaryRole === 'DECISION_MAKER') {
    return 'DECISION_MAKER';
  }
  if (primaryRole === 'REGULAR_EMPLOYEE') {
    return 'REGULAR_EMPLOYEE';
  }
  if (primaryRole === 'DIRECTORY_ADMIN') {
    return 'DIRECTORY_ADMIN';
  }

  return 'UNKNOWN';
}
