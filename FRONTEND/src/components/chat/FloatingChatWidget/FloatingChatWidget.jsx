/**
 * Floating Chat Widget - Main Component
 * Integrates all chatbot components with multi-mode behavior system
 */

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toggleWidget, setWidgetOpen } from '../../../store/slices/ui.slice.js';
import { addMessage, setLoading } from '../../../store/slices/chat.slice.js';
import {
  setGeneralMode,
  setAssessmentSupportMode,
  setDevLabSupportMode,
  MODES,
} from '../../../store/slices/chatMode.slice.js';
import { detectModeChange, getModeSpecificResponse } from '../../../utils/modeDetector.js';
import { getModeSpecificRecommendations } from '../../../utils/recommendations.js';
import { proxyToMicroservice } from '../../../services/microserviceProxy.js';
import { useSubmitQueryMutation, useGetRecommendationsQuery } from '../../../store/api/ragApi.js';
import { setUserContext } from '../../../store/slices/auth.slice.js';
import { store } from '../../../store/store.js';
import ChatWidgetButton from '../../chatbot/ChatWidgetButton/ChatWidgetButton.jsx';
import ChatPanel from '../../chatbot/ChatPanel/ChatPanel.jsx';

const FloatingChatWidget = ({ 
  embedded = false, 
  initialMode = null, 
  mode = 'chat', // 'support' or 'chat'
  microservice = null, // Microservice name (e.g., 'ASSESSMENT', 'CONTENT', etc.)
  userId = null, 
  token = null,
  tenantId = null
} = {}) => {
  const dispatch = useDispatch();
  const isOpen = useSelector((state) => state.ui.isWidgetOpen);
  const messages = useSelector((state) => state.chat.messages);
  const isLoading = useSelector((state) => state.chat.isLoading);
  const currentMode = useSelector((state) => state.chatMode.currentMode);
  
  // Get user context from Redux (with fallback to anonymous)
  const authUserId = useSelector((state) => state.auth.userId);
  const authToken = useSelector((state) => state.auth.token);
  const authTenantId = useSelector((state) => state.auth.tenantId);
  
  // CRITICAL FIX: Direct Redux dispatch for embedded mode auth
  // This ensures auth state is set immediately when props are provided
  useEffect(() => {
    // Safety check: ensure token is a valid string
    if (embedded && userId && token && typeof token === 'string' && token.trim().length > 0) {
      const finalTenantId = tenantId || 'default';
      const tokenStr = String(token).trim();
      
      console.log('🔐 [FloatingChatWidget] Setting auth in Redux (embedded mode):', {
        userId,
        token: tokenStr.length > 20 ? tokenStr.substring(0, 20) + '...' : '***', // Log partial token for security
        tenantId: finalTenantId,
        tokenLength: tokenStr.length,
      });
      
      // Direct dispatch to Redux - bypasses useAuth hook complexity
      dispatch(setUserContext({
        userId: String(userId),
        token: tokenStr, // Use trimmed token string
        tenantId: String(finalTenantId),
        source: 'props', // Mark as coming from props
      }));
      
      // Verify it worked (async check)
      setTimeout(() => {
        const state = store.getState();
        const authState = state.auth;
        const loggedToken = authState.token && typeof authState.token === 'string' && authState.token.length > 20
          ? authState.token.substring(0, 20) + '...'
          : (authState.token ? '***' : null);
        
        console.log('✅ [FloatingChatWidget] Auth state after dispatch:', {
          userId: authState.userId,
          token: loggedToken,
          tokenLength: authState.token ? authState.token.length : 0,
          tenantId: authState.tenantId,
          isAuthenticated: authState.isAuthenticated,
          source: authState.source,
        });
        
        if (!authState.token || typeof authState.token !== 'string' || authState.token.trim().length === 0) {
          console.error('❌ [FloatingChatWidget] CRITICAL: Auth state token is invalid after dispatch!', {
            token: authState.token,
            tokenType: typeof authState.token,
          });
        }
      }, 100);
    } else if (embedded && (!userId || !token)) {
      console.warn('⚠️ [FloatingChatWidget] Missing auth props in embedded mode:', {
        hasUserId: !!userId,
        hasToken: !!token,
        tokenType: typeof token,
        userId,
      });
    }
  }, [embedded, userId, token, tenantId, dispatch]);
  
  const [recommendations, setRecommendations] = useState([]);
  
  // Platform suggestions that are always available (no API call needed)
  const platformSuggestions = [
    {
      id: 'suggestion-about',
      type: 'button',
      label: 'About',
      description: 'Learn about the platform and its features',
      reason: 'Platform information',
      priority: 15,
      metadata: { 
        source: 'platform_suggestion',
        query: 'about the platform',
        action: 'query'
      },
    },
    {
      id: 'suggestion-how-to-start',
      type: 'button',
      label: 'How to Start',
      description: 'Get started guide for employees, managers, HR, and trainers',
      reason: 'Getting started',
      priority: 14,
      metadata: { 
        source: 'platform_suggestion',
        query: 'how to start with the platform',
        action: 'query'
      },
    }
  ];
  const [hasShownGreeting, setHasShownGreeting] = useState(false);
  const [submitQuery, { isLoading: isQueryLoading }] = useSubmitQueryMutation();
  
  // Get current user ID for recommendations (Redux with fallback to props, then anonymous)
  const currentUserId = authUserId || userId || 'anonymous';
  const currentTenantId = authTenantId || tenantId || 'default';
  
  // Fetch recommendations from backend API
  const modeParam = currentMode === MODES.ASSESSMENT_SUPPORT ? 'assessment' 
    : currentMode === MODES.DEVLAB_SUPPORT ? 'devlab' 
    : 'general';
  
  const { data: apiRecommendations, isLoading: isLoadingRecommendations, error: recommendationsError } = useGetRecommendationsQuery(
    {
      userId: currentUserId,
      tenant_id: currentTenantId,
      mode: modeParam,
      limit: 5,
    },
    {
      skip: currentUserId === 'anonymous' || !isOpen, // Skip if anonymous or widget closed
    }
  );

  // Initialize mode if embedded with initialMode
  useEffect(() => {
    if (embedded && initialMode) {
      if (initialMode === 'ASSESSMENT_SUPPORT') {
        dispatch(setAssessmentSupportMode());
      } else if (initialMode === 'DEVLAB_SUPPORT') {
        dispatch(setDevLabSupportMode());
      } else if (initialMode === 'GENERAL' || mode === 'chat') {
        // CHAT MODE - use general RAG mode (default, no need to dispatch)
        // Already in GENERAL mode by default
      }
      // Show recommendations based on mode
      setTimeout(() => {
        const modeForRecs = initialMode || MODES.GENERAL;
        setRecommendations(getModeSpecificRecommendations(modeForRecs, []));
      }, 500);
    }
  }, [embedded, initialMode, mode, dispatch]);

  // Auto-open widget - Check config before opening
  useEffect(() => {
    if (!embedded) return;
    
    // Check if we should auto-open
    const botConfig = window.educoreBotConfig;
    
    if (!botConfig) {
      console.log('⚠️ [FloatingChatWidget] No bot config found, skipping auto-open');
      return;
    }
    
    if (botConfig.autoOpen === true) {
      console.log('✅ [FloatingChatWidget] Auto-opening (autoOpen: true)');
      dispatch(setWidgetOpen(true));
    } else {
      console.log('⏸️ [FloatingChatWidget] Auto-open disabled (autoOpen: false)');
      dispatch(setWidgetOpen(false));
    }
  }, [embedded, dispatch]);

  // Show initial greeting when widget opens
  useEffect(() => {
    if (
      isOpen &&
      !hasShownGreeting &&
      messages.length === 0 &&
      currentMode === MODES.GENERAL &&
      (!embedded || mode === 'chat') // allow greeting in embedded CHAT MODE
    ) {
      const greeting = {
        id: 'greeting-1',
        text: "Hello! I'm your AI assistant. How can I help you today?",
        isBot: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      dispatch(addMessage(greeting));
      setHasShownGreeting(true);
      
      // Show platform suggestions immediately (no API call needed)
      // API recommendations will be added when they arrive
      setRecommendations(platformSuggestions);
    }
  }, [isOpen, hasShownGreeting, messages.length, currentMode, dispatch, embedded, mode, apiRecommendations, recommendationsError, currentUserId, isLoadingRecommendations]);

  // Update recommendations when API data arrives (for logged-in users)
  // Combine platform suggestions with API recommendations
  useEffect(() => {
    // Only update if user is logged in, widget is open, and we have API data
    if (currentUserId !== 'anonymous' && isOpen && !isLoadingRecommendations && !recommendationsError) {
      if (apiRecommendations?.recommendations && apiRecommendations.recommendations.length > 0) {
        // Convert API recommendations to component format
        const formattedRecs = apiRecommendations.recommendations.map((rec) => ({
          id: rec.id,
          type: rec.type || 'button',
          label: rec.label || rec.title,
          description: rec.description,
          reason: rec.reason,
          priority: rec.priority,
          metadata: rec.metadata,
        }));
        
        // Combine platform suggestions with API recommendations
        // Platform suggestions should appear first (they have higher priority)
        const combined = [...platformSuggestions, ...formattedRecs]
          .sort((a, b) => (b.priority || 0) - (a.priority || 0))
          .slice(0, 7); // Limit total recommendations
        
        setRecommendations(combined);
      } else if (apiRecommendations && (!apiRecommendations.recommendations || apiRecommendations.recommendations.length === 0)) {
        // API returned empty recommendations, keep platform suggestions
        setRecommendations(platformSuggestions);
      }
    }
  }, [apiRecommendations, isLoadingRecommendations, recommendationsError, currentUserId, isOpen, currentMode, messages]);

  // Clear recommendations once conversation starts (user sends first message)
  // Recommendations will only show:
  // 1. After initial greeting (handled in first useEffect)
  // 2. When mode changes to support mode (handled in handleSendMessage)
  useEffect(() => {
    const userMessages = messages.filter(m => !m.isBot);
    
    // Once user sends a message, clear recommendations (unless mode just changed)
    if (userMessages.length > 0) {
      // Only keep recommendations if we're in support mode (they were set in handleSendMessage)
      if (currentMode === MODES.GENERAL) {
        setRecommendations([]);
      }
    }
  }, [messages, currentMode]);

  // Debug logging for embedded/chat state
  useEffect(() => {
    console.log('🔍 [FloatingChatWidget] state:', {
      embedded,
      mode,
      initialMode,
      isOpen,
      messagesCount: messages.length,
      currentMode,
      hasShownGreeting,
    });
  }, [embedded, mode, initialMode, isOpen, messages.length, currentMode, hasShownGreeting]);

  const handleToggle = () => {
    console.log('🟢 [FloatingChatWidget] Toggle button clicked, current state:', isOpen);
    dispatch(toggleWidget());
  };

  const handleClose = () => {
    console.log('🔴 [FloatingChatWidget] Close button clicked');
    dispatch(setWidgetOpen(false));
    // Reset to general mode when closing
    if (currentMode !== MODES.GENERAL) {
      dispatch(setGeneralMode());
    }
  };

  const handleSendMessage = async (text) => {
    let newMode = null;
    
    // In embedded mode:
    // - SUPPORT MODE (Assessment/DevLab): don't allow mode changes, stay in support mode
    // - CHAT MODE (other microservices): use RAG API directly, stay in GENERAL mode
    if (embedded && (currentMode === MODES.ASSESSMENT_SUPPORT || currentMode === MODES.DEVLAB_SUPPORT)) {
      // SUPPORT MODE: Stay in support mode, don't detect mode changes
      // Continue to proxy behavior below
    } else if (embedded && mode === 'chat') {
      // CHAT MODE: Stay in GENERAL mode, use RAG API directly
      // No mode detection needed
    } else {
      // Not embedded or in standalone mode: Detect mode change based on message
      newMode = detectModeChange(text, currentMode);
      
      // Switch mode if detected
      if (newMode) {
        if (newMode === MODES.GENERAL) {
          dispatch(setGeneralMode());
        } else if (newMode === MODES.ASSESSMENT_SUPPORT) {
          dispatch(setAssessmentSupportMode());
        } else if (newMode === MODES.DEVLAB_SUPPORT) {
          dispatch(setDevLabSupportMode());
        }
      }
    }
    
    // Get the mode to use
    // - Embedded SUPPORT MODE: use currentMode (ASSESSMENT_SUPPORT or DEVLAB_SUPPORT)
    // - Embedded CHAT MODE: use GENERAL mode (RAG)
    // - Standalone: use detected mode or currentMode
    const responseMode = embedded && (currentMode === MODES.ASSESSMENT_SUPPORT || currentMode === MODES.DEVLAB_SUPPORT)
      ? currentMode
      : embedded && mode === 'chat'
      ? MODES.GENERAL // CHAT MODE uses RAG (GENERAL mode)
      : (newMode || currentMode);

    // Add user message
    const userMessage = {
      id: `user-${Date.now()}`,
      text,
      isBot: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    dispatch(addMessage(userMessage));
    
    // Clear recommendations while loading
    setRecommendations([]);
    
    // Check if we're in Support Mode (proxy behavior)
    // Only Assessment and DevLab use SUPPORT MODE (proxy)
    // All other microservices use CHAT MODE (RAG API directly)
    const isSupportMode = responseMode === MODES.ASSESSMENT_SUPPORT || responseMode === MODES.DEVLAB_SUPPORT;
    
    // Set loading state (combine with query loading if in General Mode)
    dispatch(setLoading(true));
    
    try {
      let botMessages = [];
      
      // If mode changed to Support Mode, add transition message (only if not embedded)
      if (!embedded && newMode && newMode !== MODES.GENERAL && currentMode === MODES.GENERAL) {
        const modeName = newMode === MODES.ASSESSMENT_SUPPORT 
          ? 'Assessment Support' 
          : 'DevLab Support';
        botMessages.push({
          id: `mode-${Date.now()}`,
          text: `Switched to ${modeName} Mode. I'm now acting as a proxy to the ${modeName} microservice. Your questions will be forwarded directly.`,
          isBot: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        // Show support mode recommendations after mode change
        setTimeout(() => {
          const allMessages = [...messages, userMessage, ...botMessages];
          setRecommendations(getModeSpecificRecommendations(newMode, allMessages));
        }, 500);
      } else if (newMode === MODES.GENERAL && currentMode !== MODES.GENERAL) {
        botMessages.push({
          id: `mode-${Date.now()}`,
          text: "Returned to General Chat mode. How can I help you?",
          isBot: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        // Clear recommendations when returning to general mode
        setRecommendations([]);
      }
      
      // PROXY BEHAVIOR: In Support Mode, forward to microservice and return verbatim response
      if (isSupportMode) {
        // Forward user message to microservice (proxy mode)
        const microserviceResponse = await proxyToMicroservice(text, responseMode);
        
        // Return microservice response verbatim (no modification, no commentary)
        botMessages.push({
          id: `bot-${Date.now()}`,
          text: microserviceResponse, // Verbatim response from microservice
          isBot: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      } else {
        // GENERAL MODE: Send query to RAG API (OpenAI via backend)
        try {
          const sessionId = sessionStorage.getItem('chatbot_session_id') || `session_${Date.now()}`;
          sessionStorage.setItem('chatbot_session_id', sessionId);
          
          // CRITICAL: Log what we're sending
          const requestPayload = {
            query: text,
            tenant_id: currentTenantId,
            context: {
              user_id: currentUserId,
              session_id: sessionId,
            },
            options: {
              max_results: 5,
              min_confidence: 0.7,
              include_metadata: true,
            },
          };
          
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('📤 [FloatingChatWidget] Sending CHAT MODE request');
          console.log('📤 Payload:', JSON.stringify(requestPayload, null, 2));
          console.log('📤 Current User ID:', currentUserId);
          console.log('📤 Current Tenant ID:', currentTenantId);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          
          const ragResponse = await submitQuery(requestPayload).unwrap();
          
          // Use RAG API response (from OpenAI)
          botMessages.push({
            id: `bot-${Date.now()}`,
            text: ragResponse.answer || ragResponse.response || 'I received your query but got an empty response.',
            isBot: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sources: ragResponse.sources || [],
            confidence: ragResponse.confidence,
          });
          
          // Update recommendations from query response if available
          if (ragResponse.recommendations && ragResponse.recommendations.length > 0) {
            const formattedRecs = ragResponse.recommendations.map((rec) => ({
              id: rec.id,
              type: rec.type || 'button',
              label: rec.label || rec.title,
              description: rec.description,
              reason: rec.reason,
              priority: rec.priority,
              metadata: rec.metadata,
            }));
            setRecommendations(formattedRecs);
          }
        } catch (ragError) {
          // Fallback to mock response if RAG API fails
          console.error('RAG API error:', ragError);
          const errorMessage = ragError?.data?.message || ragError?.message || '';
          
          // Determine specific error message based on error type
          let userFriendlyMessage = 'I encountered an error while processing your request. Please try again or contact support if the issue persists.';
          
          if (errorMessage.includes('tenant') || errorMessage.includes('Tenant')) {
            userFriendlyMessage = 'There was an issue accessing your workspace data. Please contact support.';
          } else if (errorMessage.includes('permission') || errorMessage.includes('Permission') || errorMessage.includes('RBAC')) {
            userFriendlyMessage = 'I found information about that, but you don\'t have permission to access it. Please contact your administrator.';
          } else if (errorMessage.includes('connect') || errorMessage.includes('Failed')) {
            userFriendlyMessage = 'I encountered an error connecting to the service. Please try again in a moment.';
          }
          
          botMessages.push({
            id: `bot-${Date.now()}`,
            text: userFriendlyMessage,
            isBot: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
          
          // Only add fallback response if it's not a permission error
          if (!errorMessage.includes('permission') && !errorMessage.includes('Permission') && !errorMessage.includes('RBAC')) {
            botMessages.push({
              id: `bot-fallback-${Date.now()}`,
              text: getModeSpecificResponse(text, responseMode),
              isBot: true,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            });
          }
        }
      }
      
      // Dispatch all messages
      botMessages.forEach((msg) => dispatch(addMessage(msg)));
    } catch (error) {
      // Handle errors in Support Mode (proxy mode)
      if (isSupportMode) {
        const errorMessage = error.message || 'Failed to connect to microservice';
        dispatch(addMessage({
          id: `bot-error-${Date.now()}`,
          text: `Error: ${errorMessage}`, // Return error verbatim
          isBot: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
      } else {
        // General mode error handling
        dispatch(addMessage({
          id: `bot-error-${Date.now()}`,
          text: "I'm sorry, I encountered an error. Please try again.",
          isBot: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
      }
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleSelectRecommendation = (item) => {
    // Send the recommendation query from metadata if available, otherwise use label
    // The backend will retrieve the guide content from the database (vector_embeddings).
    const query = item.metadata?.query || item.label;
    handleSendMessage(query);
  };

  return (
    <>
      <ChatWidgetButton
        onClick={handleToggle}
        isOpen={isOpen}
        unreadCount={0}
      />
      <ChatPanel
        isOpen={isOpen}
        onClose={handleClose}
        messages={messages}
        recommendations={recommendations}
        onSendMessage={handleSendMessage}
        onSelectRecommendation={handleSelectRecommendation}
        isLoading={isLoading}
        currentMode={currentMode}
      />
    </>
  );
};

export default FloatingChatWidget;
