/**
 * Redux store configuration
 */

import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/auth.slice.js';
import chatSlice from './slices/chat.slice.js';
import userSlice from './slices/user.slice.js';
import uiSlice from './slices/ui.slice.js';
import { ragApi } from './api/ragApi.js';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    chat: chatSlice,
    user: userSlice,
    ui: uiSlice,
    [ragApi.reducerPath]: ragApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(ragApi.middleware),
});

