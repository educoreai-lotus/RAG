/**
 * Frontend guest-mode util + auth slice regression tests
 */

import {
  shouldActivateGuestMode,
  hasRealToken,
  buildGuestQueryPayload,
  createGuestSessionId,
  clearRagAuthStorage,
  GUEST_SOURCE_SERVICE,
} from '../../src/utils/guestMode.util.js';
import authReducer, {
  setUserContext,
  setGuestMode,
  clearUserContext,
} from '../../src/store/slices/auth.slice.js';

describe('guestMode.util', () => {
  it('does not activate guest mode without allowGuest', () => {
    expect(
      shouldActivateGuestMode({
        microservice: 'NAUTH_PUBLIC',
      })
    ).toBe(false);
  });

  it('activates guest mode for NAUTH_PUBLIC + allowGuest + no token', () => {
    expect(
      shouldActivateGuestMode({
        microservice: 'NAUTH_PUBLIC',
        allowGuest: true,
      })
    ).toBe(true);
  });

  it('does not activate guest mode for other microservices', () => {
    expect(
      shouldActivateGuestMode({
        microservice: 'HR_MANAGEMENT_REPORTING',
        allowGuest: true,
      })
    ).toBe(false);
  });

  it('real token always wins over allowGuest', () => {
    expect(hasRealToken('real-token')).toBe(true);
    expect(
      shouldActivateGuestMode({
        microservice: 'NAUTH_PUBLIC',
        allowGuest: true,
        token: 'real-token',
        userId: 'real-user',
      })
    ).toBe(false);
  });

  it('builds guest payload without identity fields', () => {
    const payload = buildGuestQueryPayload('What is JavaScript?', 'guest_session_abc');
    expect(payload).toEqual({
      query: 'What is JavaScript?',
      source_service: GUEST_SOURCE_SERVICE,
      guest_mode: true,
      context: {
        session_id: 'guest_session_abc',
      },
      options: {
        max_results: 5,
        min_confidence: 0.7,
        include_metadata: false,
      },
    });
    expect(payload.tenant_id).toBeUndefined();
    expect(payload.context.user_id).toBeUndefined();
    expect(payload.context.role).toBeUndefined();
  });

  it('creates guest session ids with expected prefix', () => {
    expect(createGuestSessionId().startsWith('guest_session_')).toBe(true);
  });

  it('clears only RAG auth storage keys', () => {
    localStorage.setItem('token', 'stale');
    localStorage.setItem('user_id', 'stale-user');
    localStorage.setItem('tenant_id', 'stale-tenant');
    localStorage.setItem('host_unrelated', 'keep-me');
    clearRagAuthStorage();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user_id')).toBeNull();
    expect(localStorage.getItem('tenant_id')).toBeNull();
    expect(localStorage.getItem('host_unrelated')).toBe('keep-me');
  });
});

describe('auth.slice guest + authenticated regression', () => {
  it('setGuestMode clears identity and marks isGuest', () => {
    const withAuth = authReducer(
      undefined,
      setUserContext({
        userId: 'real-user',
        token: 'real-token',
        tenantId: 'real-tenant',
        source: 'props',
      })
    );
    expect(withAuth.isAuthenticated).toBe(true);

    const guest = authReducer(withAuth, setGuestMode());
    expect(guest.isGuest).toBe(true);
    expect(guest.isAuthenticated).toBe(false);
    expect(guest.token).toBeNull();
    expect(guest.userId).toBeNull();
    expect(guest.tenantId).toBeNull();
  });

  it('authenticated setUserContext clears guest flag and stores MR fields', () => {
    const guest = authReducer(undefined, setGuestMode());
    const auth = authReducer(
      guest,
      setUserContext({
        userId: 'real-user',
        token: 'real-token',
        tenantId: 'real-tenant',
        source: 'props',
      })
    );

    expect(auth.isGuest).toBe(false);
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.userId).toBe('real-user');
    expect(auth.token).toBe('real-token');
    expect(auth.tenantId).toBe('real-tenant');
  });

  it('clearUserContext resets guest and auth', () => {
    const guest = authReducer(undefined, setGuestMode());
    const cleared = authReducer(guest, clearUserContext());
    expect(cleared.isGuest).toBe(false);
    expect(cleared.isAuthenticated).toBe(false);
  });
});
