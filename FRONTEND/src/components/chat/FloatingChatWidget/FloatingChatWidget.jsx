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
import ChatWidgetButton from '../../chatbot/ChatWidgetButton/ChatWidgetButton.jsx';
import ChatPanel from '../../chatbot/ChatPanel/ChatPanel.jsx';

const FloatingChatWidget = ({ 
  embedded = false, 
  initialMode = null, 
  userId = null, 
  token = null 
} = {}) => {
  const dispatch = useDispatch();
  const isOpen = useSelector((state) => state.ui.isWidgetOpen);
  const messages = useSelector((state) => state.chat.messages);
  const isLoading = useSelector((state) => state.chat.isLoading);
  const currentMode = useSelector((state) => state.chatMode.currentMode);
  
  const [recommendations, setRecommendations] = useState([]);
  const [hasShownGreeting, setHasShownGreeting] = useState(false);
  const [submitQuery, { isLoading: isQueryLoading }] = useSubmitQueryMutation();
  
  // Get current user ID for recommendations
  const currentUserId = userId || localStorage.getItem('user_id') || 'anonymous';
  const currentTenantId = localStorage.getItem('tenant_id') || 'default';
  
  // Fetch recommendations from backend API
  const modeParam = currentMode === MODES.ASSESSMENT_SUPPORT ? 'assessment' 
    : currentMode === MODES.DEVLAB_SUPPORT ? 'devlab' 
    : 'general';
  
  const { data: apiRecommendations, isLoading: isLoadingRecommendations } = useGetRecommendationsQuery(
    currentUserId !== 'anonymous' ? currentUserId : null,
    {
      skip: currentUserId === 'anonymous' || !isOpen, // Skip if anonymous or widget closed
      tenant_id: currentTenantId,
      mode: modeParam,
      limit: 5,
    }
  );

  // Initialize mode if embedded with initialMode
  useEffect(() => {
    if (embedded && initialMode) {
      if (initialMode === 'ASSESSMENT_SUPPORT') {
        dispatch(setAssessmentSupportMode());
      } else if (initialMode === 'DEVLAB_SUPPORT') {
        dispatch(setDevLabSupportMode());
      }
      // Show support mode recommendations
      setTimeout(() => {
        setRecommendations(getModeSpecificRecommendations(initialMode, []));
      }, 500);
    }
  }, [embedded, initialMode, dispatch]);

  // Show initial greeting when widget opens (only in General mode, not in embedded support mode)
  useEffect(() => {
    if (isOpen && !hasShownGreeting && messages.length === 0 && currentMode === MODES.GENERAL && !embedded) {
      const greeting = {
        id: 'greeting-1',
        text: "Hello! I'm your AI assistant. How can I help you today?",
        isBot: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      dispatch(addMessage(greeting));
      setHasShownGreeting(true);
      
      // Show initial recommendations only after greeting (before conversation starts)
      // Use API recommendations if available, otherwise use client-side generator
      setTimeout(() => {
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
          setRecommendations(formattedRecs);
        } else {
          // Fallback to client-side recommendations
          setRecommendations(getModeSpecificRecommendations(MODES.GENERAL, [greeting]));
        }
      }, 500);
    }
  }, [isOpen, hasShownGreeting, messages.length, currentMode, dispatch, embedded, apiRecommendations]);

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

  const handleToggle = () => {
    dispatch(toggleWidget());
  };

  const handleClose = () => {
    dispatch(setWidgetOpen(false));
    // Reset to general mode when closing
    if (currentMode !== MODES.GENERAL) {
      dispatch(setGeneralMode());
    }
  };

  const handleSendMessage = async (text) => {
    let newMode = null;
    
    // In embedded mode with support mode, don't allow mode changes (stay in support mode)
    if (embedded && (currentMode === MODES.ASSESSMENT_SUPPORT || currentMode === MODES.DEVLAB_SUPPORT)) {
      // Stay in support mode, don't detect mode changes
      // Continue to proxy behavior below
    } else {
      // Detect mode change based on message (only in non-embedded or general mode)
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
    
    // Get the mode to use (in embedded support mode, use currentMode)
    const responseMode = embedded && (currentMode === MODES.ASSESSMENT_SUPPORT || currentMode === MODES.DEVLAB_SUPPORT)
      ? currentMode
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
          
          const ragResponse = await submitQuery({ 
            query: text,
            tenant_id: localStorage.getItem('tenant_id') || 'default',
            context: {
              user_id: userId || localStorage.getItem('user_id') || 'anonymous',
              session_id: sessionId,
            },
            options: {
              max_results: 5,
              min_confidence: 0.7,
              include_metadata: true,
            },
          }).unwrap();
          
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
          const errorMessage = ragError?.data?.message || ragError?.message || 'Failed to connect to RAG service';
          botMessages.push({
            id: `bot-${Date.now()}`,
            text: `⚠️ Error: ${errorMessage}. Using fallback response.`,
            isBot: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
          // Also add fallback response
          botMessages.push({
            id: `bot-fallback-${Date.now()}`,
            text: getModeSpecificResponse(text, responseMode),
            isBot: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
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
    // Send the recommendation label as a user message.
    // The backend will retrieve the guide content from the database (vector_embeddings).
    handleSendMessage(item.label);
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
