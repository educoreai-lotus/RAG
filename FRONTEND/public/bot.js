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
   * Initialize the React bot component
   * @param {Object} instance - Bot instance
   */
  function initializeBotReact(instance) {
    // This will be called after the bundle loads
    // The bundle should export a function to initialize the React app
    if (window.EDUCORE_BOT_INIT_REACT) {
      window.EDUCORE_BOT_INIT_REACT({
        mountPoint: instance.mountPoint,
        config: instance.config,
        widgetMode: instance.widgetMode,
        mode: instance.mode, // 'support' or 'chat'
      });
    } else {
      console.error('EDUCORE Bot: React initialization function not found. Make sure bot-bundle.js is loaded correctly.');
    }
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

