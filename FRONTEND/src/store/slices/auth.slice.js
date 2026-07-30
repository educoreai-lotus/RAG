/**
 * Auth slice - Redux Toolkit
 *
 * Stores user context for widget user-awareness:
 * - userId, token, tenantId (required)
 * - name, email (optional profile fields)
 * - Tracks source of context and loading state
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Core identity fields (required)
  userId: null,
  token: null,
  tenantId: null,

  // Optional profile fields
  profile: {
    name: null,
    email: null,
  },

  // State flags
  isAuthenticated: false,
  isGuest: false,
  isLoading: false,
  source: null, // 'window' | 'props' | 'localStorage' | 'endpoint' | 'guest' | null

  // Legacy field (kept for backward compatibility)
  user: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Set complete user context from any source
     * @param {Object} action.payload - { userId, token, tenantId, name?, email?, source? }
     */
    setUserContext: (state, action) => {
      const { userId, token, tenantId, name = null, email = null, source = null } = action.payload;

      if (userId && token && tenantId) {
        state.userId = userId;
        state.token = token;
        state.tenantId = tenantId;
        state.profile.name = name;
        state.profile.email = email;
        state.isAuthenticated = true;
        state.isGuest = false;
        state.source = source;

        // Legacy: keep user object for backward compatibility
        state.user = { id: userId, name, email };
      }
    },

    /**
     * Explicit unauthenticated guest embed mode (no identity).
     */
    setGuestMode: (state) => {
      state.userId = null;
      state.token = null;
      state.tenantId = null;
      state.profile.name = null;
      state.profile.email = null;
      state.isAuthenticated = false;
      state.isGuest = true;
      state.source = 'guest';
      state.user = null;
    },

    /**
     * Update optional profile fields only
     * @param {Object} action.payload - { name?, email? }
     */
    updateUserProfile: (state, action) => {
      const { name, email } = action.payload;
      if (name !== undefined) {
        state.profile.name = name;
        if (state.user) state.user.name = name;
      }
      if (email !== undefined) {
        state.profile.email = email;
        if (state.user) state.user.email = email;
      }
    },

    /**
     * Clear all user context (anonymous mode)
     */
    clearUserContext: (state) => {
      state.userId = null;
      state.token = null;
      state.tenantId = null;
      state.profile.name = null;
      state.profile.email = null;
      state.isAuthenticated = false;
      state.isGuest = false;
      state.source = null;
      state.user = null;
    },

    /**
     * Set loading state during context loading
     * @param {boolean} action.payload - Loading state
     */
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },

    // Legacy actions (kept for backward compatibility)
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      // If legacy user object has id, update userId
      if (action.payload?.id) {
        state.userId = action.payload.id;
      }
    },
    setToken: (state, action) => {
      state.token = action.payload;
    },
    logout: (state) => {
      // Use same logic as clearUserContext
      state.userId = null;
      state.token = null;
      state.tenantId = null;
      state.profile.name = null;
      state.profile.email = null;
      state.isAuthenticated = false;
      state.isGuest = false;
      state.source = null;
      state.user = null;
    },
  },
});

export const {
  setUserContext,
  setGuestMode,
  updateUserProfile,
  clearUserContext,
  setLoading,
  // Legacy exports
  setUser,
  setToken,
  logout,
} = authSlice.actions;

export default authSlice.reducer;










