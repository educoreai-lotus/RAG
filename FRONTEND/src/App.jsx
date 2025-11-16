/**
 * Main App Component
 * Floating Chat Widget Entry Point
 */

import React from 'react';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { store } from './store/store.js';
import { theme } from './theme/theme.js';
import FloatingChatWidget from './components/chat/FloatingChatWidget/FloatingChatWidget.jsx';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setAssessmentSupportMode, setDevLabSupportMode } from './store/slices/chatMode.slice.js';

function SupportModeInit() {
  const dispatch = useDispatch();
  useEffect(() => {
    const defaultMode = (import.meta.env.VITE_DEFAULT_SUPPORT_MODE || '').toLowerCase();
    if (defaultMode === 'assessment') {
      dispatch(setAssessmentSupportMode());
    } else if (defaultMode === 'devlab') {
      dispatch(setDevLabSupportMode());
    }
  }, [dispatch]);
  return null;
}

function App() {

  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SupportModeInit />
        <FloatingChatWidget />
      </ThemeProvider>
    </Provider>
  );
}

export default App;




