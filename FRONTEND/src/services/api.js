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
  // In production, VITE_API_BASE_URL should be set (e.g., Railway backend URL)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // Development default
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










