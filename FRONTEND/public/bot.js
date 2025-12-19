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
   * Initialize the React bot component in Shadow DOM
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
    // CRITICAL: Create Shadow DOM for CSS isolation
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    // Check if shadow root already exists
    let shadowRoot = mountPoint.shadowRoot;
    
    if (!shadowRoot) {
      try {
        // Create shadow DOM with 'open' mode
        shadowRoot = mountPoint.attachShadow({ mode: 'open' });
        console.log('🛡️ EDUCORE Bot: Shadow DOM created successfully');
      } catch (error) {
        console.error('EDUCORE Bot: Failed to create shadow DOM', error);
        // Fallback to regular DOM if shadow DOM not supported
        console.warn('EDUCORE Bot: Using regular DOM (no CSS isolation)');
        shadowRoot = mountPoint;
      }
    }
    
    // Create container inside shadow root
    const shadowContainer = document.createElement('div');
    shadowContainer.id = 'bot-shadow-container';
    shadowRoot.appendChild(shadowContainer);
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Load CSS into shadow DOM
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    // CRITICAL: We need to load the bot's CSS into the shadow DOM
    // because shadow DOM doesn't inherit styles from the main document
    
    // Method 1: Load CSS from CDN/server (recommended)
    // Get backend URL from global variable or derive from script source
    let backendUrl = window.EDUCORE_BACKEND_URL;
    if (!backendUrl) {
      // Derive from current script source
      const scriptSrc = document.currentScript?.src || 
                       document.querySelector('script[src*="bot.js"]')?.src;
      if (scriptSrc) {
        const url = new URL(scriptSrc);
        backendUrl = `${url.protocol}//${url.host}`;
        window.EDUCORE_BACKEND_URL = backendUrl;
      }
    }
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = `${backendUrl || ''}/embed/bot-styles.css`;
    cssLink.onerror = () => {
      console.warn('EDUCORE Bot: Failed to load bot-styles.css, using inline styles only');
    };
    shadowRoot.appendChild(cssLink);
    
    // Method 2: Inline critical CSS (fallback)
    const criticalStyles = document.createElement('style');
    criticalStyles.textContent = `
      /* Critical bot styles - will be replaced by full stylesheet */
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      #bot-shadow-container {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
          'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
    `;
    shadowRoot.appendChild(criticalStyles);
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Initialize React in shadow DOM
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    window.EDUCORE_BOT_INIT_REACT({
      mountPoint: shadowContainer,  // React renders inside shadow container
      shadowRoot: shadowRoot,        // Pass shadow root for reference
      config: instance.config,
      widgetMode: instance.widgetMode,
      mode: instance.mode,
    });
    
    console.log('✅ EDUCORE Bot: Initialized in Shadow DOM');
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

  console.log('EDUCORE Bot: Embedding script loaded. Call window.initializeEducoreBot(config) to start.');
})();

