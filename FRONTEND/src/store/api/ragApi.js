/**
 * RTK Query API for RAG microservice
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// API Base URL - uses environment variable in production, defaults to localhost:8080 for development
const getBaseUrl = () => {
  // CRITICAL FIX: Always use backend URL, never frontend URL!
  // Priority order:
  // 1. VITE_API_BASE_URL env var (explicit configuration)
  // 2. window.EDUCORE_BACKEND_URL (set by bot.js automatically)
  // 3. Default Railway backend URL (fallback)

  // Priority 1: VITE_API_BASE_URL environment variable
  if (import.meta.env.VITE_API_BASE_URL) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    // Remove trailing /api if present to avoid double /api
    return baseUrl.replace(/\/api\/?$/, '');
  }

  // Priority 2: VITE_API_URL (alternative env var name)
  if (import.meta.env.VITE_API_URL) {
    const baseUrl = import.meta.env.VITE_API_URL;
    return baseUrl.replace(/\/api\/?$/, '');
  }

  // Priority 3: window.EDUCORE_BACKEND_URL (set automatically by bot.js)
  // This means microservices DON'T need to set VITE_API_BASE_URL if they load bot.js!
  if (typeof window !== 'undefined' && window.EDUCORE_BACKEND_URL) {
    return window.EDUCORE_BACKEND_URL;
  }

  // Priority 4: Production default backend URL (Railway)
  // This ensures requests go to backend even if env vars not set and bot.js not loaded
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // Use default Railway backend URL instead of frontend URL
    return 'https://devlab-backend-production-59bb.up.railway.app';
  }

  // Development default
  return 'http://localhost:8080';
};

const baseUrl = getBaseUrl();

// CRITICAL: Log base URL determination
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🌐 [RTK Query] Base URL determined:');
console.log('🌐 Base URL:', baseUrl);
console.log('🌐 VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL || 'NOT SET');
console.log('🌐 VITE_API_URL:', import.meta.env.VITE_API_URL || 'NOT SET');
console.log('🌐 window.EDUCORE_BACKEND_URL:', typeof window !== 'undefined' ? window.EDUCORE_BACKEND_URL : 'N/A (SSR)');
console.log('🌐 window.location.hostname:', typeof window !== 'undefined' ? window.location.hostname : 'N/A (SSR)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

export const ragApi = createApi({
  reducerPath: 'ragApi',
  baseQuery: async (args, api, extraOptions) => {
    // CRITICAL: Log base URL and request details
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 [RTK Query] Starting request');
    console.log('🚀 Base URL:', baseUrl);
    console.log('🚀 Request args:', JSON.stringify(args, null, 2));
    console.log('🚀 Full URL will be:', `${baseUrl}${args.url}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Use fetchBaseQuery with custom error handling
    const result = await fetchBaseQuery({
      baseUrl,
      prepareHeaders: (headers, { getState }) => {
        const state = getState();
        const { token, userId, tenantId, isGuest } = state.auth;

        // Explicit guest mode: never send Authorization / identity headers
        if (isGuest === true) {
          console.log('🔐 [RTK Query] Guest mode — omitting auth identity headers');
          return headers;
        }

        console.log('🔐 [RTK Query] Preparing headers...');
        console.log('🔐 Auth state:', {
          hasToken: !!token,
          tokenType: typeof token,
          hasUserId: !!userId,
          hasTenantId: !!tenantId,
        });

        // CRITICAL FIX: Validate token before adding Authorization header (same as api.js)
        // Prevent sending "Bearer undefined" or invalid tokens
        if (token && typeof token === 'string' && token.trim().length > 0 && token !== 'undefined' && token !== 'null') {
          const cleanToken = token.trim();
          headers.set('authorization', `Bearer ${cleanToken}`);
          console.log('✅ [RTK Query] Authorization header added (token length:', cleanToken.length, ')');
        } else {
          console.warn('⚠️ [RTK Query] No valid token in Redux auth state:', {
            hasToken: !!token,
            tokenType: typeof token,
            tokenValue: token ? (typeof token === 'string' ? token.substring(0, 20) + '...' : String(token)) : 'null/undefined',
          });
        }

        // Add user identity headers
        if (userId && userId !== 'undefined' && userId !== 'null') {
          headers.set('X-User-Id', String(userId));
          console.log('✅ [RTK Query] X-User-Id header added:', userId);
        }

        if (tenantId && tenantId !== 'undefined' && tenantId !== 'null') {
          headers.set('X-Tenant-Id', String(tenantId));
          console.log('✅ [RTK Query] X-Tenant-Id header added:', tenantId);
        }

        // Log headers for debugging
        console.log('🔐 [RTK Query] Final headers:', {
          hasAuth: !!headers.get('authorization'),
          hasUserId: !!headers.get('X-User-Id'),
          hasTenantId: !!headers.get('X-Tenant-Id'),
          userId: headers.get('X-User-Id'),
          tenantId: headers.get('X-Tenant-Id'),
        });

        return headers;
      },
    })(args, api, extraOptions);

    // CRITICAL: Log response or error
    if (result.error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ [RTK Query] Request failed');
      console.error('❌ Error status:', result.error.status);
      console.error('❌ Error data:', JSON.stringify(result.error.data, null, 2));
      console.error('❌ Error:', result.error);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ [RTK Query] Request succeeded');
      console.log('✅ Response status:', result.meta?.response?.status);
      console.log('✅ Response data keys:', result.data ? Object.keys(result.data) : 'no data');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    return result;
  },
  tagTypes: ['Query', 'Recommendation'],
  endpoints: (builder) => ({
    submitQuery: builder.mutation({
      query: (body) => ({
        url: '/api/v1/query',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Query'],
    }),
    getRecommendations: builder.query({
      query: ({ userId, tenant_id, mode, limit }) => {
        const params = new URLSearchParams();
        if (tenant_id) params.append('tenant_id', tenant_id);
        if (mode) params.append('mode', mode);
        if (limit) params.append('limit', limit);
        const queryString = params.toString();
        return `/api/v1/personalized/recommendations/${userId}${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: ['Recommendation'],
      // Cache for 5 minutes to improve performance
      keepUnusedDataFor: 300,
    }),
  }),
});

export const { useSubmitQueryMutation, useGetRecommendationsQuery } = ragApi;






