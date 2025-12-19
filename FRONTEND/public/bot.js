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
      /* EDUCORE BOT CSS ISOLATION - BASED ON ACTUAL COMPONENT CODE                */
      /* All selectors match exact classes used in FloatingChatWidget components   */
      /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

      /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
      /* CRITICAL: Force Tailwind classes to apply                                 */
      /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

      /* Fixed positioning - ChatWidgetButton & ChatPanel */
      #edu-bot-container .fixed {
        position: fixed !important;
      }

      /* Z-index - ChatWidgetButton (z-50) & ChatPanel (z-40) */
      #edu-bot-container .z-50 {
        z-index: 50 !important;
      }
      #edu-bot-container .z-40 {
        z-index: 40 !important;
      }

      /* Bottom positioning */
      #edu-bot-container .bottom-6 {
        bottom: 1.5rem !important;
      }
      #edu-bot-container .bottom-24 {
        bottom: 6rem !important;
      }

      /* Right positioning */
      #edu-bot-container .right-6 {
        right: 1.5rem !important;
      }

      /* Width classes */
      #edu-bot-container .w-16 {
        width: 4rem !important;
      }
      #edu-bot-container .w-96 {
        width: 24rem !important;
      }
      #edu-bot-container .w-12 {
        width: 3rem !important;
      }
      #edu-bot-container .w-full {
        width: 100% !important;
      }
      
      /* Responsive width - min() function for ChatPanel */
      #edu-bot-container [class*="w-[min("] {
        width: min(28rem, calc(100vw - 3rem)) !important;
      }
      #edu-bot-container .w-8 {
        width: 2rem !important;
      }
      #edu-bot-container .w-10 {
        width: 2.5rem !important;
      }
      #edu-bot-container .w-2 {
        width: 0.5rem !important;
      }

      /* Height classes */
      #edu-bot-container .h-16 {
        height: 4rem !important;
      }
      #edu-bot-container .h-12 {
        height: 3rem !important;
      }
      #edu-bot-container .h-8 {
        height: 2rem !important;
      }
      #edu-bot-container .h-10 {
        height: 2.5rem !important;
      }
      #edu-bot-container .h-2 {
        height: 0.5rem !important;
      }

      /* Arbitrary height - ChatPanel h-[600px] */
      #edu-bot-container [class*="h-[600px]"],
      #edu-bot-container [style*="height: 600px"] {
        height: 600px !important;
      }

      /* Max width - ChatMessage */
      #edu-bot-container [class*="max-w-\\[75"] {
        max-width: 75% !important;
      }

      /* Background gradients - CRITICAL! */
      /* ChatWidgetButton: bg-gradient-to-br from-emerald-500 to-emerald-600 */
      #edu-bot-container [class*="bg-gradient-to-br"][class*="from-emerald-500"] {
        background: linear-gradient(to bottom right, #10b981, #059669) !important;
      }

      /* ChatHeader General: bg-gradient-to-r from-emerald-500 to-emerald-600 */
      #edu-bot-container [class*="bg-gradient-to-r"][class*="from-emerald-500"] {
        background: linear-gradient(to right, #10b981, #059669) !important;
      }

      /* ChatHeader Assessment: bg-gradient-to-r from-blue-500 to-blue-600 */
      #edu-bot-container [class*="bg-gradient-to-r"][class*="from-blue-500"] {
        background: linear-gradient(to right, #3b82f6, #2563eb) !important;
      }

      /* ChatHeader DevLab: bg-gradient-to-r from-purple-500 to-purple-600 */
      #edu-bot-container [class*="bg-gradient-to-r"][class*="from-purple-500"] {
        background: linear-gradient(to right, #a855f7, #9333ea) !important;
      }

      /* ChatInput send button: bg-gradient-to-br from-emerald-500 to-emerald-600 */
      /* (same as widget button, already covered) */

      /* Recommendations: bg-gradient-to-r from-emerald-50 to-emerald-100 */
      #edu-bot-container [class*="bg-gradient-to-r"][class*="from-emerald-50"] {
        background: linear-gradient(to right, #ecfdf5, #d1fae5) !important;
      }

      /* Solid backgrounds */
      #edu-bot-container .bg-white {
        background-color: #ffffff !important;
      }
      #edu-bot-container .bg-gray-50 {
        background-color: #f9fafb !important;
      }
      #edu-bot-container .bg-emerald-500 {
        background-color: #10b981 !important;
      }
      #edu-bot-container .bg-blue-500 {
        background-color: #3b82f6 !important;
      }
      #edu-bot-container .bg-purple-500 {
        background-color: #a855f7 !important;
      }

      /* Text colors */
      #edu-bot-container .text-white {
        color: #ffffff !important;
      }
      #edu-bot-container .text-gray-900 {
        color: #111827 !important;
      }
      #edu-bot-container .text-gray-700 {
        color: #374151 !important;
      }
      #edu-bot-container .text-gray-600 {
        color: #4b5563 !important;
      }
      #edu-bot-container .text-gray-500 {
        color: #6b7280 !important;
      }
      #edu-bot-container .text-emerald-700 {
        color: #047857 !important;
      }

      /* Border colors */
      #edu-bot-container .border-gray-200 {
        border-color: #e5e7eb !important;
      }
      #edu-bot-container .border-gray-300 {
        border-color: #d1d5db !important;
      }
      #edu-bot-container .border-emerald-400 {
        border-color: #34d399 !important;
      }
      #edu-bot-container .border-blue-400 {
        border-color: #60a5fa !important;
      }
      #edu-bot-container .border-purple-400 {
        border-color: #c084fc !important;
      }
      #edu-bot-container .border-emerald-200 {
        border-color: #a7f3d0 !important;
      }

      /* Border width */
      #edu-bot-container .border {
        border-width: 1px !important;
      }
      #edu-bot-container .border-t {
        border-top-width: 1px !important;
      }
      #edu-bot-container .border-b-2 {
        border-bottom-width: 2px !important;
      }

      /* Border radius */
      #edu-bot-container .rounded-full {
        border-radius: 9999px !important;
      }
      #edu-bot-container .rounded-2xl {
        border-radius: 1rem !important;
      }
      #edu-bot-container .rounded-t-2xl {
        border-top-left-radius: 1rem !important;
        border-top-right-radius: 1rem !important;
      }

      /* Shadows - CRITICAL! */
      #edu-bot-container .shadow-glow-lg {
        box-shadow: 0 0 30px rgba(16, 185, 129, 0.4) !important;
      }
      #edu-bot-container .shadow-glow {
        box-shadow: 0 0 20px rgba(16, 185, 129, 0.3) !important;
      }
      #edu-bot-container .shadow-card-lg {
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
      }
      #edu-bot-container .shadow-card {
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
      }

      /* Flexbox */
      #edu-bot-container .flex {
        display: flex !important;
      }
      #edu-bot-container .inline-flex {
        display: inline-flex !important;
      }
      #edu-bot-container .flex-col {
        flex-direction: column !important;
      }
      #edu-bot-container .flex-1 {
        flex: 1 1 0% !important;
      }
      #edu-bot-container .flex-shrink-0 {
        flex-shrink: 0 !important;
      }
      #edu-bot-container .items-center {
        align-items: center !important;
      }
      #edu-bot-container .justify-center {
        justify-content: center !important;
      }
      #edu-bot-container .justify-between {
        justify-content: space-between !important;
      }
      #edu-bot-container .justify-end {
        justify-content: flex-end !important;
      }
      #edu-bot-container .justify-start {
        justify-content: flex-start !important;
      }

      /* Gap */
      #edu-bot-container .gap-2 {
        gap: 0.5rem !important;
      }
      #edu-bot-container .gap-3 {
        gap: 0.75rem !important;
      }
      #edu-bot-container .gap-4 {
        gap: 1rem !important;
      }

      /* Padding */
      #edu-bot-container .p-4 {
        padding: 1rem !important;
      }
      #edu-bot-container .p-3 {
        padding: 0.75rem !important;
      }
      #edu-bot-container .px-4 {
        padding-left: 1rem !important;
        padding-right: 1rem !important;
      }
      #edu-bot-container .px-3 {
        padding-left: 0.75rem !important;
        padding-right: 0.75rem !important;
      }
      #edu-bot-container .py-3 {
        padding-top: 0.75rem !important;
        padding-bottom: 0.75rem !important;
      }
      #edu-bot-container .py-2 {
        padding-top: 0.5rem !important;
        padding-bottom: 0.5rem !important;
      }
      #edu-bot-container .pl-10 {
        padding-left: 2.5rem !important;
      }
      #edu-bot-container .pr-4 {
        padding-right: 1rem !important;
      }

      /* Margin */
      #edu-bot-container .mb-3 {
        margin-bottom: 0.75rem !important;
      }
      #edu-bot-container .mb-4 {
        margin-bottom: 1rem !important;
      }
      #edu-bot-container .mt-3 {
        margin-top: 0.75rem !important;
      }

      /* Overflow */
      #edu-bot-container .overflow-hidden {
        overflow: hidden !important;
      }
      #edu-bot-container .overflow-y-auto {
        overflow-y: auto !important;
      }

      /* Text size */
      #edu-bot-container .text-sm {
        font-size: 0.875rem !important;
        line-height: 1.25rem !important;
      }
      #edu-bot-container .text-lg {
        font-size: 1.125rem !important;
        line-height: 1.75rem !important;
      }
      #edu-bot-container .text-xs {
        font-size: 0.75rem !important;
        line-height: 1rem !important;
      }

      /* Font weight */
      #edu-bot-container .font-semibold {
        font-weight: 600 !important;
      }
      #edu-bot-container .font-medium {
        font-weight: 500 !important;
      }
      #edu-bot-container .font-bold {
        font-weight: 700 !important;
      }

      /* Focus ring */
      #edu-bot-container .focus-ring:focus {
        outline: 2px solid transparent !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.5) !important;
      }

      /* Focus outline */
      #edu-bot-container .focus\\:outline-none:focus {
        outline: 2px solid transparent !important;
        outline-offset: 2px !important;
      }

      /* Focus ring-2 */
      #edu-bot-container .focus\\:ring-2:focus {
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.5) !important;
      }

      /* Focus ring emerald */
      #edu-bot-container .focus\\:ring-emerald-500:focus {
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.5) !important;
      }

      /* Cursor */
      #edu-bot-container .cursor-pointer {
        cursor: pointer !important;
      }

      /* Transition */
      #edu-bot-container .transition-all {
        transition-property: all !important;
        transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1) !important;
        transition-duration: 150ms !important;
      }
      #edu-bot-container .transition-colors {
        transition-property: color, background-color, border-color !important;
        transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1) !important;
        transition-duration: 150ms !important;
      }

      /* Hover effects */
      #edu-bot-container .hover\\:bg-white\\/20:hover {
        background-color: rgba(255, 255, 255, 0.2) !important;
      }
      #edu-bot-container .hover\\:shadow-glow-lg:hover {
        box-shadow: 0 0 30px rgba(16, 185, 129, 0.4) !important;
      }
      #edu-bot-container .hover\\:scale-110:hover {
        transform: scale(1.1) !important;
      }

      /* Animations */
      #edu-bot-container .animate-pulse {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
      }
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      #edu-bot-container .animate-bounce {
        animation: bounce 1s infinite !important;
      }
      @keyframes bounce {
        0%, 100% {
          transform: translateY(-25%);
          animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
        }
        50% {
          transform: translateY(0);
          animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
        }
      }

      /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
      /* ELEMENT RESETS - Ensure HTML elements render correctly                    */
      /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

      /* Reset container but allow Tailwind */
      #edu-bot-container {
        all: initial !important;
        display: block !important;
        position: static !important;
        box-sizing: border-box !important;
      }

      /* Font family for all elements */
      #edu-bot-container,
      #edu-bot-container * {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
          'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif !important;
      }

      /* Display modes */
      #edu-bot-container div {
        display: block !important;
        box-sizing: border-box !important;
      }
      #edu-bot-container button {
        display: inline-flex !important;
        cursor: pointer !important;
        box-sizing: border-box !important;
        background: none !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        font: inherit !important;
      }
      #edu-bot-container input,
      #edu-bot-container textarea {
        display: inline-block !important;
        box-sizing: border-box !important;
        font: inherit !important;
        padding: 0 !important;
        margin: 0 !important;
        background: none !important;
        border: none !important;
      }
      #edu-bot-container svg {
        display: inline-block !important;
        vertical-align: middle !important;
        fill: currentColor !important;
      }
      #edu-bot-container span {
        display: inline !important;
      }
      #edu-bot-container p {
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
      /* BLOCK MICROSERVICE CSS INTERFERENCE                                       */
      /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

      /* Block global background/gradient overrides */
      #edu-bot-container * {
        background-image: none !important;
      }

      /* Re-allow bot gradients */
      #edu-bot-container [class*="bg-gradient"] {
        background-image: revert !important;
      }
    `;
    
    document.head.appendChild(isolationStyles);
    console.log('🛡️ EDUCORE Bot: CSS isolation layer added');
  }

  console.log('EDUCORE Bot: Embedding script loaded. Call window.initializeEducoreBot(config) to start.');

  // Add CSS isolation
  addCSSIsolation();
})();

