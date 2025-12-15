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
  // In production, VITE_API_BASE_URL should be set (e.g., Railway backend URL)
  // IMPORTANT: VITE_API_BASE_URL should NOT include /api at the end
  // It should be: https://devlab-backend-production-59bb.up.railway.app
  // NOT: https://devlab-backend-production-59bb.up.railway.app/api
  
  // Priority 1: VITE_API_BASE_URL environment variable
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
  
  // Priority 3: Production default backend URL (Railway)
  // This ensures requests go to backend even if env vars not set
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    const defaultBackendUrl = 'https://devlab-backend-production-59bb.up.railway.app';
    console.warn('⚠️ VITE_API_BASE_URL not set! Using default backend URL:', defaultBackendUrl);
    console.warn('⚠️ Please set VITE_API_BASE_URL in Vercel environment variables');
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
    
    // Add Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add user identity headers
    if (userId) {
      config.headers['X-User-Id'] = userId;
    }
    
    if (tenantId) {
      config.headers['X-Tenant-Id'] = tenantId;
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










