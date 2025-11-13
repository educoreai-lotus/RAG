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
import ChatWidgetButton from '../../chatbot/ChatWidgetButton/ChatWidgetButton.jsx';
import ChatPanel from '../../chatbot/ChatPanel/ChatPanel.jsx';

const FloatingChatWidget = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((state) => state.ui.isWidgetOpen);
  const messages = useSelector((state) => state.chat.messages);
  const isLoading = useSelector((state) => state.chat.isLoading);
  const currentMode = useSelector((state) => state.chatMode.currentMode);
  
  const [recommendations, setRecommendations] = useState([]);
  const [hasShownGreeting, setHasShownGreeting] = useState(false);

  // Show initial greeting when widget opens (only in General mode)
  useEffect(() => {
    if (isOpen && !hasShownGreeting && messages.length === 0 && currentMode === MODES.GENERAL) {
      const greeting = {
        id: 'greeting-1',
        text: "Hello! I'm your AI assistant. How can I help you today?",
        isBot: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      dispatch(addMessage(greeting));
      setHasShownGreeting(true);
      
      // Show initial recommendations only after greeting (before conversation starts)
      setTimeout(() => {
        setRecommendations(getModeSpecificRecommendations(MODES.GENERAL, [greeting]));
      }, 500);
    }
  }, [isOpen, hasShownGreeting, messages.length, currentMode, dispatch]);

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

  const handleSendMessage = (text) => {
    // Detect mode change based on message
    const newMode = detectModeChange(text, currentMode);
    
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
    
    // Get the mode to use for response (use newMode if changed, otherwise currentMode)
    const responseMode = newMode || currentMode;
    
    // Simulate bot response with mode-specific logic
    dispatch(setLoading(true));
    setTimeout(() => {
      // If mode changed, add mode transition message
      let botMessages = [];
      
      if (newMode && newMode !== MODES.GENERAL && currentMode === MODES.GENERAL) {
        const modeName = newMode === MODES.ASSESSMENT_SUPPORT 
          ? 'Assessment Support' 
          : 'DevLab Support';
        botMessages.push({
          id: `mode-${Date.now()}`,
          text: `Switched to ${modeName} mode. I'm now focused on helping you with ${modeName.toLowerCase()} issues.`,
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
      
      // Add main response
      botMessages.push({
        id: `bot-${Date.now()}`,
        text: getModeSpecificResponse(text, responseMode),
        isBot: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      
      // Dispatch all messages
      botMessages.forEach((msg) => dispatch(addMessage(msg)));
      dispatch(setLoading(false));
    }, 1000 + Math.random() * 1000); // Random delay between 1-2 seconds
  };

  const handleSelectRecommendation = (item) => {
    // Send recommendation as user message
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
