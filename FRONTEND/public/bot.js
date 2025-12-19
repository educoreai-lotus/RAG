/**
 * EDUCORE Bot Embedding Script
 * 
 * This script allows microservices to embed the chatbot widget
 * by adding a simple SCRIPT tag to their pages.
 * 
 * Usage:
 * 1. Add container: <div id="edu-bot-container"></div>
 * 2. Load script: <script src="https://your-rag-service.com/embed/bot.js"></script>
 * 3. Initialize: window.initializeEducoreBot({ microservice: "ASSESSMENT", userId: "...", token: "...", container: "#edu-bot-container" })
 */

(function() {
  'use strict';

  // Prevent multiple initializations
  if (window.EDUCORE_BOT_LOADED) {
    console.warn('EDUCORE Bot: Already loaded. Skipping re-initialization.');
    return;
  }

  window.EDUCORE_BOT_LOADED = true;

  // Bot configuration storage
  let botConfig = null;
  let botInstance = null;

  /**
   * Initialize the EDUCORE Bot widget
   * @param {Object} config - Configuration object
   * @param {string} config.microservice - Microservice identifier
   *   SUPPORT MODE: "ASSESSMENT", "DEVLAB"
   *   CHAT MODE: "DIRECTORY", "COURSE_BUILDER", "CONTENT_STUDIO", "SKILLS_ENGINE", 
   *              "LEARNER_AI", "LEARNING_ANALYTICS", "HR_MANAGEMENT_REPORTING", or any other name
   * @param {string} config.userId - Authenticated user ID
   * @param {string} config.token - JWT or session token
   * @param {string} config.container - CSS selector for mount point (default: "#edu-bot-container")
   * @param {string} config.tenantId - Optional tenant ID (default: "default")
   */
  window.initializeEducoreBot = function(config) {
    if (!config) {
      console.error('EDUCORE Bot: Configuration is required');
      return;
    }

    const { microservice, userId, token, container = '#edu-bot-container', tenantId = 'default' } = config;

    // Validate required parameters
    if (!microservice) {
      console.error('EDUCORE Bot: "microservice" parameter is required');
      return;
    }

    if (!userId) {
      console.error('EDUCORE Bot: "userId" parameter is required');
      return;
    }

    if (!token) {
      console.error('EDUCORE Bot: "token" parameter is required');
      return;
    }

    // Microservices that use SUPPORT MODE (forward to microservice API)
    const supportModeMicroservices = ['ASSESSMENT', 'DEVLAB'];
    
    // All other microservices use CHAT MODE (RAG - regular chat)
    // Supported CHAT MODE microservices:
    // - DIRECTORY
    // - COURSE_BUILDER
    // - CONTENT_STUDIO
    // - SKILLS_ENGINE
    // - LEARNER_AI
    // - LEARNING_ANALYTICS
    // - HR_MANAGEMENT_REPORTING
    // - Any other microservice name (case-insensitive)
    // 
    // Assessment and DevLab → SUPPORT MODE
    // All others → CHAT MODE (RAG)

    // Locate the mount point
    const mountElement = document.querySelector(container);
    if (!mountElement) {
      console.error(`EDUCORE Bot: Container "${container}" not found in DOM`);
      return;
    }

    // Store configuration
    botConfig = {
      microservice: microservice.toUpperCase(),
      userId,
      token,
      tenantId,
      container,
      mountElement,
    };

    // Store token for API calls
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('user_id', userId);
      if (tenantId) {
        localStorage.setItem('tenant_id', tenantId);
      }
    }

    // Determine mode: SUPPORT MODE for Assessment/DevLab, CHAT MODE for others
    const isSupportMode = supportModeMicroservices.includes(botConfig.microservice);
    
    // Start the bot widget
    startBotWidget({
      mode: isSupportMode ? 'support' : 'chat',
      microservice: botConfig.microservice,
      userId: botConfig.userId,
      token: botConfig.token,
      tenantId: botConfig.tenantId,
      mountPoint: mountElement,
    });
  };

  /**
   * Start the bot widget
   * @param {Object} options - Widget options
   */
  function startBotWidget(options) {
    const { mode, microservice, userId, token, tenantId, mountPoint } = options;

    // Determine mode based on microservice
    // SUPPORT MODE: Assessment, DevLab → forward to microservice API
    // CHAT MODE: All others → use RAG API directly
    let widgetMode = null;
    if (mode === 'support') {
      // SUPPORT MODE
      if (microservice === 'ASSESSMENT') {
        widgetMode = 'ASSESSMENT_SUPPORT';
      } else if (microservice === 'DEVLAB') {
        widgetMode = 'DEVLAB_SUPPORT';
      } else {
        // Fallback: if somehow support mode is set for non-support microservice, use CHAT MODE
        console.warn(`EDUCORE Bot: Microservice "${microservice}" does not support SUPPORT MODE. Using CHAT MODE instead.`);
        widgetMode = 'GENERAL';
      }
    } else {
      // CHAT MODE (RAG) - for all other microservices
      // Supports: DIRECTORY, COURSE_BUILDER, CONTENT_STUDIO, SKILLS_ENGINE, 
      //           LEARNER_AI, LEARNING_ANALYTICS, HR_MANAGEMENT_REPORTING, and any other microservice
      widgetMode = 'GENERAL'; // Use general RAG mode
    }

    // Create a unique ID for this bot instance
    const botId = `edu-bot-${Date.now()}`;
    mountPoint.setAttribute('data-bot-id', botId);

    // Load the bot React component
    // Note: This assumes the bot bundle is already loaded
    // In production, you would load the bundle dynamically here
    
    // For now, we'll create a placeholder that will be replaced
    // when the React component loads
    mountPoint.innerHTML = '<div id="' + botId + '-root"></div>';

    // Store bot instance reference
    botInstance = {
      id: botId,
      config: botConfig,
      widgetMode,
      mode: mode, // 'support' or 'chat'
      mountPoint: mountPoint.querySelector(`#${botId}-root`),
    };

    // Dispatch custom event for bot initialization
    const initEvent = new CustomEvent('educore-bot-initialized', {
      detail: {
        botId,
        microservice,
        widgetMode,
        mode: mode,
        userId,
      },
    });
    document.dispatchEvent(initEvent);

    // Load the bot bundle dynamically
    loadBotBundle(botInstance);
  }

  /**
   * Load the bot bundle dynamically
   * @param {Object} instance - Bot instance
   */
  function loadBotBundle(instance) {
    // Get the base URL from the current script
    const scriptSrc = document.currentScript?.src || 
                     document.querySelector('script[src*="bot.js"]')?.src;
    const baseUrl = scriptSrc ? scriptSrc.substring(0, scriptSrc.lastIndexOf('/')) : '';
    
    // CRITICAL: Set backend URL globally so microservices can use it
    // Extract backend URL from script src (e.g., https://rag-backend.com/embed/bot.js -> https://rag-backend.com)
    if (baseUrl && !window.EDUCORE_BACKEND_URL) {
      // Remove /embed if present
      const backendUrl = baseUrl.replace(/\/embed\/?$/, '');
      window.EDUCORE_BACKEND_URL = backendUrl;
      console.log('🤖 EDUCORE Bot: Backend URL detected:', backendUrl);
      console.log('🤖 EDUCORE Bot: Microservices can use window.EDUCORE_BACKEND_URL for API calls');
    }
    
    const bundleUrl = `${baseUrl}/bot-bundle.js`;

    // Check if bundle is already loaded
    if (window.EDUCORE_BOT_BUNDLE_LOADED) {
      initializeBotReact(instance);
      return;
    }

    // Load the bundle script
    const script = document.createElement('script');
    script.src = bundleUrl;
    script.type = 'module';
    script.onload = () => {
      window.EDUCORE_BOT_BUNDLE_LOADED = true;
      initializeBotReact(instance);
    };
    script.onerror = () => {
      console.error('EDUCORE Bot: Failed to load bot bundle from', bundleUrl);
      instance.mountPoint.innerHTML = '<div style="padding: 20px; color: red;">Failed to load chatbot. Please refresh the page.</div>';
    };
    document.head.appendChild(script);
  }

  /**
   * Initialize the React bot component (NO Shadow DOM)
   * @param {Object} instance - Bot instance
   */
  function initializeBotReact(instance) {
    if (!window.EDUCORE_BOT_INIT_REACT) {
      console.error('EDUCORE Bot: React initialization function not found.');
      return;
    }
    
    // Get the mount point
    const mountPoint = instance.mountPoint;
    
    if (!mountPoint) {
      console.error('EDUCORE Bot: Mount point not found');
      return;
    }
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // NO SHADOW DOM - Just create container
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const botContainer = document.createElement('div');
    botContainer.id = 'bot-root';
    mountPoint.appendChild(botContainer);
    
    // Initialize React in regular DOM
    window.EDUCORE_BOT_INIT_REACT({
      mountPoint: botContainer,
      config: instance.config,
      widgetMode: instance.widgetMode,
      mode: instance.mode,
    });
    
    console.log('✅ EDUCORE Bot: Initialized (regular DOM)');
  }

  /**
   * Destroy the bot instance
   */
  window.destroyEducoreBot = function() {
    if (botInstance) {
      // Clean up React component if needed
      if (window.EDUCORE_BOT_DESTROY) {
        window.EDUCORE_BOT_DESTROY(botInstance.id);
      }
      
      // Clear mount point
      if (botInstance.mountPoint && botInstance.mountPoint.parentElement) {
        botInstance.mountPoint.parentElement.innerHTML = '';
      }
      
      botInstance = null;
      botConfig = null;
    }
  };

  // Expose configuration getter
  window.getEducoreBotConfig = function() {
    return botConfig ? { ...botConfig } : null;
  };

  /**
   * Add CSS isolation to prevent microservice styles from affecting bot
   */
  function addCSSIsolation() {
    // Check if already added
    if (document.getElementById('educore-bot-isolation')) {
      return;
    }
    
    const isolationStyles = document.createElement('style');
    isolationStyles.id = 'educore-bot-isolation';
    isolationStyles.textContent = `
      /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
      /* EDUCORE BOT CSS ISOLATION                                                */
      /* Prevents microservice CSS from affecting the bot                          */
      /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
      
      /* Reset all styles in bot container */
      #edu-bot-container {
        all: initial !important;
        position: static !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        z-index: auto !important;
      }
      
      /* Reset all child elements */
      #edu-bot-container *,
      #edu-bot-container *::before,
      #edu-bot-container *::after {
        all: unset !important;
        box-sizing: border-box !important;
      }
      
      /* Critical: Restore display properties */
      #edu-bot-container div { display: block !important; }
      #edu-bot-container span { display: inline !important; }
      #edu-bot-container button { display: inline-block !important; cursor: pointer !important; }
      #edu-bot-container input { display: inline-block !important; }
      #edu-bot-container img { display: inline-block !important; }
      #edu-bot-container svg { display: inline-block !important; }
      
      /* Restore text properties */
      #edu-bot-container * {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
          'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif !important;
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
      }
      
      /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
      /* FORCE BOT STYLES (High specificity to override microservice CSS)          */
      /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
      
      /* Floating button */
      #edu-bot-container button[class*="fixed"][class*="bottom"] {
        position: fixed !important;
        bottom: 1.5rem !important;
        right: 1.5rem !important;
        width: 4rem !important;
        height: 4rem !important;
        border-radius: 50% !important;
        background: linear-gradient(to bottom right, #10b981, #059669) !important;
        color: white !important;
        border: none !important;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
        z-index: 50 !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      
      /* Chat panel */
      #edu-bot-container div[class*="fixed"][class*="bottom"][class*="w-96"] {
        position: fixed !important;
        bottom: 6rem !important;
        right: 1.5rem !important;
        width: 24rem !important;
        height: 37.5rem !important;
        background: white !important;
        border-radius: 1rem !important;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
        display: flex !important;
        flex-direction: column !important;
        z-index: 40 !important;
        overflow: hidden !important;
      }
      
      /* Chat header - General (emerald) */
      #edu-bot-container div[class*="chat-header"],
      #edu-bot-container header {
        background: linear-gradient(to right, #10b981, #059669) !important;
        color: white !important;
        padding: 1rem !important;
        border-radius: 1rem 1rem 0 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
      }
      
      /* Chat header - Assessment Support (blue) */
      #edu-bot-container [data-mode="ASSESSMENT_SUPPORT"] div[class*="chat-header"],
      #edu-bot-container [data-mode="ASSESSMENT_SUPPORT"] header {
        background: linear-gradient(to right, #3b82f6, #2563eb) !important;
      }
      
      /* Chat header - DevLab Support (purple) */
      #edu-bot-container [data-mode="DEVLAB_SUPPORT"] div[class*="chat-header"],
      #edu-bot-container [data-mode="DEVLAB_SUPPORT"] header {
        background: linear-gradient(to right, #a855f7, #9333ea) !important;
      }
      
      /* Messages container */
      #edu-bot-container div[class*="messages"],
      #edu-bot-container div[class*="overflow-y-auto"] {
        flex: 1 !important;
        overflow-y: auto !important;
        padding: 1rem !important;
        background: #f9fafb !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 0.75rem !important;
      }
      
      /* User message bubble */
      #edu-bot-container div[class*="message"][class*="user"],
      #edu-bot-container div[data-message-type="user"] {
        background: #10b981 !important;
        color: white !important;
        padding: 0.75rem 1rem !important;
        border-radius: 1rem !important;
        max-width: 75% !important;
        align-self: flex-end !important;
        word-wrap: break-word !important;
      }
      
      /* Bot message bubble */
      #edu-bot-container div[class*="message"][class*="bot"],
      #edu-bot-container div[class*="message"][class*="assistant"],
      #edu-bot-container div[data-message-type="bot"],
      #edu-bot-container div[data-message-type="assistant"] {
        background: white !important;
        color: #111827 !important;
        padding: 0.75rem 1rem !important;
        border-radius: 1rem !important;
        border: 1px solid #e5e7eb !important;
        max-width: 75% !important;
        align-self: flex-start !important;
        word-wrap: break-word !important;
      }
      
      /* Input container */
      #edu-bot-container div[class*="border-t"] {
        border-top: 1px solid #e5e7eb !important;
        padding: 1rem !important;
        background: white !important;
        display: flex !important;
        gap: 0.5rem !important;
        align-items: center !important;
      }
      
      /* Input field */
      #edu-bot-container input[type="text"],
      #edu-bot-container textarea {
        flex: 1 !important;
        padding: 0.75rem 1rem !important;
        border: 1px solid #d1d5db !important;
        border-radius: 9999px !important;
        outline: none !important;
        font-size: 0.875rem !important;
        background: white !important;
        color: #111827 !important;
      }
      
      #edu-bot-container input[type="text"]:focus,
      #edu-bot-container textarea:focus {
        border-color: #10b981 !important;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1) !important;
      }
      
      /* Send button */
      #edu-bot-container button[class*="send"],
      #edu-bot-container button[type="submit"] {
        width: 3rem !important;
        height: 3rem !important;
        border-radius: 50% !important;
        background: linear-gradient(to bottom right, #10b981, #059669) !important;
        color: white !important;
        border: none !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        box-shadow: 0 0 20px rgba(16, 185, 129, 0.3) !important;
      }
      
      #edu-bot-container button[class*="send"]:hover,
      #edu-bot-container button[type="submit"]:hover {
        transform: scale(1.05) !important;
      }
      
      /* Close button */
      #edu-bot-container button[class*="close"],
      #edu-bot-container button[aria-label*="close" i] {
        width: 2rem !important;
        height: 2rem !important;
        border-radius: 50% !important;
        background: rgba(255, 255, 255, 0.2) !important;
        color: white !important;
        border: none !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      
      /* Recommendations */
      #edu-bot-container button[class*="recommendation"] {
        background: linear-gradient(to bottom right, #ecfdf5, #d1fae5) !important;
        border: 1px solid #a7f3d0 !important;
        border-radius: 9999px !important;
        padding: 0.625rem 1rem !important;
        color: #047857 !important;
        font-size: 0.875rem !important;
        cursor: pointer !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 0.5rem !important;
      }
      
      #edu-bot-container button[class*="recommendation"]:hover {
        background: linear-gradient(to bottom right, #d1fae5, #a7f3d0) !important;
      }
      
      /* Ensure SVG icons display correctly */
      #edu-bot-container svg {
        display: inline-block !important;
        width: 1.25rem !important;
        height: 1.25rem !important;
        fill: currentColor !important;
      }
      
      /* Ensure text elements display correctly */
      #edu-bot-container p {
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      #edu-bot-container h1,
      #edu-bot-container h2,
      #edu-bot-container h3,
      #edu-bot-container h4,
      #edu-bot-container h5,
      #edu-bot-container h6 {
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        font-weight: 600 !important;
      }
    `;
    
    document.head.appendChild(isolationStyles);
    console.log('🛡️ EDUCORE Bot: CSS isolation layer added');
  }

  console.log('EDUCORE Bot: Embedding script loaded. Call window.initializeEducoreBot(config) to start.');

  // Add CSS isolation
  addCSSIsolation();
})();

