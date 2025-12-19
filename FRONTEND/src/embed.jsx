/**
 * Bot Embedding Entry Point
 * 
 * This file is used when the bot is embedded via script tag
 * in external microservices (Assessment, DevLab, etc.)
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { store } from './store/store.js';
import { theme } from './theme/theme.js';
import FloatingChatWidget from './components/chat/FloatingChatWidget/FloatingChatWidget.jsx';
import { setAssessmentSupportMode, setDevLabSupportMode, MODES } from './store/slices/chatMode.slice.js';
import './index.css';

/**
 * Initialize the bot React component
 * This function is called by bot.js after the bundle loads
 */
window.EDUCORE_BOT_INIT_REACT = function(options) {
  const { mountPoint, shadowRoot, config, widgetMode, mode } = options;

  if (!mountPoint) {
    console.error('EDUCORE Bot: Mount point is required');
    return;
  }

  console.log('🚀 EDUCORE Bot: Initializing React', {
    hasShadowRoot: !!shadowRoot,
    mountPoint: mountPoint.id || 'unknown',
    widgetMode,
    mode
  });

  // Set initial mode based on widget mode
  if (widgetMode === 'ASSESSMENT_SUPPORT') {
    store.dispatch(setAssessmentSupportMode());
  } else if (widgetMode === 'DEVLAB_SUPPORT') {
    store.dispatch(setDevLabSupportMode());
  }

  // Create React root and render
  const root = ReactDOM.createRoot(mountPoint);
  
  root.render(
    <React.StrictMode>
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <FloatingChatWidget 
            embedded={true}
            initialMode={widgetMode || 'GENERAL'}
            mode={mode || 'chat'}
            microservice={config.microservice}
            userId={config.userId}
            token={config.token}
            tenantId={config.tenantId}
            shadowRoot={shadowRoot}  // Pass shadow root to component
          />
        </ThemeProvider>
      </Provider>
    </React.StrictMode>
  );

  // Store root reference for cleanup
  window.EDUCORE_BOT_ROOTS = window.EDUCORE_BOT_ROOTS || {};
  window.EDUCORE_BOT_ROOTS[config.mountElement?.getAttribute('data-bot-id')] = root;
  
  console.log('✅ EDUCORE Bot: React rendered successfully');
};

/**
 * Destroy bot instance
 */
window.EDUCORE_BOT_DESTROY = function(botId) {
  if (window.EDUCORE_BOT_ROOTS && window.EDUCORE_BOT_ROOTS[botId]) {
    const root = window.EDUCORE_BOT_ROOTS[botId];
    root.unmount();
    delete window.EDUCORE_BOT_ROOTS[botId];
  }
};

// Mark bundle as loaded
window.EDUCORE_BOT_BUNDLE_LOADED = true;

