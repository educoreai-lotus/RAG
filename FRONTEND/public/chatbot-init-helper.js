/**
 * Chatbot Initialization Helper
 * 
 * This helper script makes it easier for microservices to initialize the chatbot.
 * It handles waiting for bot.js to load and provides detailed logging.
 * 
 * Usage:
 * 1. Load bot.js: <script src="https://rag-service.com/embed/bot.js"></script>
 * 2. Load this helper: <script src="https://rag-service.com/embed/chatbot-init-helper.js"></script>
 * 3. Call: window.initEducoreChatbot(config)
 */

(function() {
  'use strict';

  console.log('🤖 Chatbot Init Helper: Loading...');

  /**
   * Initialize the EDUCORE chatbot with automatic retry and detailed logging
   * @param {Object} config - Configuration object
   * @param {string} config.microservice - Microservice identifier (required)
   * @param {string} config.userId - User ID (required)
   * @param {string} config.token - JWT token (required)
   * @param {string} config.tenantId - Tenant ID (optional, default: 'default')
   * @param {string} config.container - Container selector (optional, default: '#edu-bot-container')
   * @param {number} config.maxRetries - Max retries if bot.js not loaded (optional, default: 10)
   * @param {number} config.retryDelay - Delay between retries in ms (optional, default: 500)
   */
  window.initEducoreChatbot = function(config) {
    console.log('🤖 [Chatbot Helper] Initialization requested');
    console.log('🤖 [Chatbot Helper] Config:', config);

    if (!config) {
      console.error('🤖 ❌ [Chatbot Helper] Configuration is required');
      return;
    }

    const {
      microservice,
      userId,
      token,
      tenantId = 'default',
      container = '#edu-bot-container',
      maxRetries = 10,
      retryDelay = 500
    } = config;

    // Validate required parameters
    if (!microservice) {
      console.error('🤖 ❌ [Chatbot Helper] "microservice" parameter is required');
      return;
    }

    if (!userId) {
      console.error('🤖 ❌ [Chatbot Helper] "userId" parameter is required');
      return;
    }

    if (!token) {
      console.error('🤖 ❌ [Chatbot Helper] "token" parameter is required');
      return;
    }

    // Check if container exists
    const containerElement = document.querySelector(container);
    if (!containerElement) {
      console.error(`🤖 ❌ [Chatbot Helper] Container "${container}" not found in DOM`);
      console.log('🤖 [Chatbot Helper] Available elements:', {
        'edu-bot-container': !!document.getElementById('edu-bot-container'),
        'bot-container': !!document.getElementById('bot-container'),
        'chatbot-container': !!document.getElementById('chatbot-container'),
      });
      return;
    }

    console.log('🤖 ✅ [Chatbot Helper] Container found:', container);

    // Try to initialize with retry logic
    let retryCount = 0;

    function attemptInitialization() {
      console.log(`🤖 [Chatbot Helper] Attempt ${retryCount + 1}/${maxRetries}`);

      // Check if bot.js is loaded
      if (typeof window.initializeEducoreBot === 'function') {
        console.log('🤖 ✅ [Chatbot Helper] window.initializeEducoreBot found!');
        console.log('🤖 [Chatbot Helper] Calling initializeEducoreBot with:', {
          microservice,
          userId: userId.substring(0, 10) + '...',
          token: token.substring(0, 10) + '...',
          tenantId,
          container,
        });

        try {
          window.initializeEducoreBot({
            microservice,
            userId,
            token,
            tenantId,
            container,
          });

          console.log('🤖 ✅ [Chatbot Helper] initializeEducoreBot called successfully');
          console.log('🤖 [Chatbot Helper] Checking if widget appeared...');

          // Check if widget appeared after a delay
          setTimeout(() => {
            const widgetElements = document.querySelectorAll('[class*="chat"], [id*="chat"], [class*="bot"], [id*="bot"]');
            console.log('🤖 [Chatbot Helper] Widget elements found:', widgetElements.length);
            if (widgetElements.length > 0) {
              console.log('🤖 ✅ [Chatbot Helper] Widget appears to be rendered!');
            } else {
              console.warn('🤖 ⚠️ [Chatbot Helper] No widget elements found. Widget might be hidden or not rendered yet.');
            }
          }, 2000);

        } catch (error) {
          console.error('🤖 ❌ [Chatbot Helper] Error calling initializeEducoreBot:', error);
          console.error('🤖 [Chatbot Helper] Error stack:', error.stack);
        }
      } else {
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`🤖 ⏳ [Chatbot Helper] window.initializeEducoreBot not found yet. Retrying in ${retryDelay}ms...`);
          console.log('🤖 [Chatbot Helper] Window properties:', {
            EDUCORE_BOT_LOADED: window.EDUCORE_BOT_LOADED,
            initializeEducoreBot: typeof window.initializeEducoreBot,
            allBotKeys: Object.keys(window).filter(k => k.toLowerCase().includes('bot') || k.toLowerCase().includes('educore')),
          });
          setTimeout(attemptInitialization, retryDelay);
        } else {
          console.error('🤖 ❌ [Chatbot Helper] Failed to initialize: window.initializeEducoreBot not found after', maxRetries, 'retries');
          console.error('🤖 [Chatbot Helper] Make sure bot.js is loaded before calling initEducoreChatbot');
          console.error('🤖 [Chatbot Helper] Add this to your HTML: <script src="https://rag-service.com/embed/bot.js"></script>');
        }
      }
    }

    // Start initialization attempt
    attemptInitialization();
  };

  // Auto-initialize if config is provided via data attributes or global variable
  if (window.EDUCORE_CHATBOT_CONFIG) {
    console.log('🤖 [Chatbot Helper] Found global config, auto-initializing...');
    window.initEducoreChatbot(window.EDUCORE_CHATBOT_CONFIG);
  }

  console.log('🤖 ✅ Chatbot Init Helper: Loaded');
  console.log('🤖 [Chatbot Helper] Usage: window.initEducoreChatbot({ microservice: "DEVLAB", userId: "...", token: "..." })');
})();

