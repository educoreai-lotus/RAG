/**
 * Dummy Token Configuration for Testing
 * 
 * ⚠️ WARNING: Only use in development/testing environments!
 * 
 * Enable by setting: DUMMY_TOKEN_ENABLED=true
 * Use token: "dummy-token-lotus-dev"
 */

export const DUMMY_TOKEN_ENABLED = process.env.DUMMY_TOKEN_ENABLED === 'true';
export const DUMMY_TOKEN_VALUE = 'dummy-token-lotus-dev';

export const DUMMY_USER = {
  user_id: '50a630f4-826e-45aa-8f70-653e5e592fc3',
  tenant_id: '5a1cb1d2-343c-438c-9f4b-76f0f1aac59d',
  company_id: '5a1cb1d2-343c-438c-9f4b-76f0f1aac59d',
  full_name: 'Jasmine Mograby',
  email: 'jasmine.mograby@lotustechhub.com',
  role: 'learner',
  current_role_in_company: 'Junior Software Developer',
  target_role_in_company: 'Backend Development',
  preferred_language: 'he',
  permissions: ['read', 'write', 'query'],
  is_dummy: true,  // Flag to identify dummy token usage
  // Map to expected req.user structure
  id: '50a630f4-826e-45aa-8f70-653e5e592fc3',  // Alias for user_id
};

/**
 * Check if a token is a dummy token
 * @param {string|null|undefined} token - Token to check
 * @returns {boolean} True if token is dummy token and feature is enabled
 */
export function isDummyToken(token) {
  if (!DUMMY_TOKEN_ENABLED) {
    return false;
  }
  if (!token || typeof token !== 'string') {
    return false;
  }
  return token === DUMMY_TOKEN_VALUE || token.trim() === DUMMY_TOKEN_VALUE;
}

/**
 * Get dummy user object
 * @returns {Object|null} Dummy user object or null if feature is disabled
 */
export function getDummyUser() {
  if (!DUMMY_TOKEN_ENABLED) {
    return null;
  }
  return { ...DUMMY_USER };
}

