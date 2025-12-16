/**
 * API service - Axios-based HTTP client
 * 
 * Automatically adds user identity headers to all requests:
 * - Authorization: Bearer {token}
 * - X-User-Id: {userId}
 * - X-Tenant-Id: {tenantId}
 */

import axios from 'axios';
import { store } from '../store/store.js';

// API Base URL - uses environment variable in production, defaults to localhost:8080 for development
const getApiBaseUrl = () => {
  // CRITICAL FIX: Always use backend URL, never frontend URL!
  // Priority order:
  // 1. VITE_API_BASE_URL env var (explicit configuration)
  // 2. window.EDUCORE_BACKEND_URL (set by bot.js automatically)
  // 3. Default Railway backend URL (fallback)
  
  // Priority 1: VITE_API_BASE_URL environment variable (explicit)
  if (import.meta.env.VITE_API_BASE_URL) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    console.log('🌐 Using VITE_API_BASE_URL:', baseUrl);
    // Remove trailing /api if present to avoid double /api
    const cleanBaseUrl = baseUrl.replace(/\/api\/?$/, '');
    console.log('🌐 Clean Backend URL:', cleanBaseUrl);
    return cleanBaseUrl;
  }
  
  // Priority 2: VITE_API_URL (alternative env var name)
  if (import.meta.env.VITE_API_URL) {
    const baseUrl = import.meta.env.VITE_API_URL;
    console.log('🌐 Using VITE_API_URL:', baseUrl);
    const cleanBaseUrl = baseUrl.replace(/\/api\/?$/, '');
    console.log('🌐 Clean Backend URL:', cleanBaseUrl);
    return cleanBaseUrl;
  }
  
  // Priority 3: window.EDUCORE_BACKEND_URL (set automatically by bot.js)
  // This means microservices DON'T need to set VITE_API_BASE_URL if they load bot.js!
  if (typeof window !== 'undefined' && window.EDUCORE_BACKEND_URL) {
    console.log('🌐 Using window.EDUCORE_BACKEND_URL (from bot.js):', window.EDUCORE_BACKEND_URL);
    return window.EDUCORE_BACKEND_URL;
  }
  
  // Priority 4: Production default backend URL (Railway)
  // This ensures requests go to backend even if env vars not set and bot.js not loaded
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    const defaultBackendUrl = 'https://devlab-backend-production-59bb.up.railway.app';
    console.warn('⚠️ No backend URL configured! Using default:', defaultBackendUrl);
    console.warn('⚠️ Options:');
    console.warn('  1. Set VITE_API_BASE_URL in environment variables');
    console.warn('  2. Load bot.js script (it will set window.EDUCORE_BACKEND_URL automatically)');
    return defaultBackendUrl;
  }
  
  // Development default
  console.log('🌐 Using development default: http://localhost:8080');
  return 'http://localhost:8080';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add user identity headers from Redux store
api.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const { token, userId, tenantId } = state.auth;
    
    // CRITICAL DEBUG: Log the full URL being called
    const fullUrl = config.baseURL + config.url;
    console.log('🌐 FRONTEND API REQUEST:');
    console.log('  Base URL:', config.baseURL);
    console.log('  Endpoint:', config.url);
    console.log('  Full URL:', fullUrl);
    console.log('  Method:', config.method?.toUpperCase());
    
    // CRITICAL FIX: Validate token before adding Authorization header
    // Prevent sending "Bearer undefined" or invalid tokens
    if (token && typeof token === 'string' && token.trim().length > 0 && token !== 'undefined' && token !== 'null') {
      const cleanToken = token.trim();
      config.headers.Authorization = `Bearer ${cleanToken}`;
      console.log('  ✅ Authorization header added (token length:', cleanToken.length, ')');
    } else {
      console.warn('  ⚠️ No valid token in Redux auth state:', {
        hasToken: !!token,
        tokenType: typeof token,
        tokenValue: token ? (typeof token === 'string' ? token.substring(0, 20) + '...' : String(token)) : 'null/undefined',
      });
    }
    
    // Add user identity headers
    if (userId && userId !== 'undefined' && userId !== 'null') {
      config.headers['X-User-Id'] = String(userId);
    }
    
    if (tenantId && tenantId !== 'undefined' && tenantId !== 'null') {
      config.headers['X-Tenant-Id'] = String(tenantId);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle errors
    return Promise.reject(error);
  }
);

export default api;










