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

export const ragApi = createApi({
  reducerPath: 'ragApi',
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, { getState }) => {
      const state = getState();
      const { token, userId, tenantId } = state.auth;
      
      // Add Authorization header
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      
      // Add user identity headers
      if (userId) {
        headers.set('X-User-Id', userId);
      }
      
      if (tenantId) {
        headers.set('X-Tenant-Id', tenantId);
      }
      
      return headers;
    },
  }),
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
    }),
  }),
});

export const { useSubmitQueryMutation, useGetRecommendationsQuery } = ragApi;






