/**
 * Floating Chat Widget - Main Component
 * Integrates all chatbot components with mock logic
 */

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toggleWidget, setWidgetOpen } from '../../../store/slices/ui.slice.js';
import { addMessage, setLoading } from '../../../store/slices/chat.slice.js';
import ChatWidgetButton from '../../chatbot/ChatWidgetButton/ChatWidgetButton.jsx';
import ChatPanel from '../../chatbot/ChatPanel/ChatPanel.jsx';

// Mock bot responses
const getBotResponse = (userMessage) => {
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return "Hello! I'm here to help you. What would you like to know?";
  }
  
  if (lowerMessage.includes('help')) {
    return "I can help you with various topics. Feel free to ask me anything!";
  }
  
  if (lowerMessage.includes('thanks') || lowerMessage.includes('thank you')) {
    return "You're welcome! Is there anything else I can help you with?";
  }
  
  if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
    return "Goodbye! Have a great day!";
  }
  
  // Default response
  return `I understand you're asking about "${userMessage}". Let me help you with that!`;
};

// Mock recommendations based on context
const getRecommendations = (messages) => {
  const lastMessage = messages[messages.length - 1]?.text?.toLowerCase() || '';
  
  // Initial recommendations
  if (messages.length <= 1) {
    return [
      {
        id: 'rec-1',
        type: 'button',
        label: 'Get Started Guide',
        description: 'Learn how to use our platform',
      },
      {
        id: 'rec-2',
        type: 'button',
        label: 'Contact Support',
        description: 'Talk to our support team',
      },
      {
        id: 'rec-3',
        type: 'card',
        label: 'Documentation',
        description: 'Browse our comprehensive documentation',
      },
      {
        id: 'rec-4',
        type: 'card',
        label: 'FAQ',
        description: 'Find answers to common questions',
      },
    ];
  }
  
  // Contextual recommendations
  if (lastMessage.includes('help') || lastMessage.includes('support')) {
    return [
      {
        id: 'rec-support-1',
        type: 'button',
        label: 'Live Chat',
        description: 'Connect with support agent',
      },
      {
        id: 'rec-support-2',
        type: 'button',
        label: 'Email Support',
        description: 'Send us an email',
      },
    ];
  }
  
  if (lastMessage.includes('documentation') || lastMessage.includes('docs')) {
    return [
      {
        id: 'rec-docs-1',
        type: 'card',
        label: 'API Reference',
        description: 'Complete API documentation',
      },
      {
        id: 'rec-docs-2',
        type: 'card',
        label: 'Tutorials',
        description: 'Step-by-step guides',
      },
    ];
  }
  
  // Default recommendations
  return [
    {
      id: 'rec-default-1',
      type: 'button',
      label: 'More Help',
    },
    {
      id: 'rec-default-2',
      type: 'button',
      label: 'Browse Topics',
    },
  ];
};

const FloatingChatWidget = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((state) => state.ui.isWidgetOpen);
  const messages = useSelector((state) => state.chat.messages);
  const isLoading = useSelector((state) => state.chat.isLoading);
  
  const [recommendations, setRecommendations] = useState([]);
  const [hasShownGreeting, setHasShownGreeting] = useState(false);

  // Show initial greeting when widget opens
  useEffect(() => {
    if (isOpen && !hasShownGreeting && messages.length === 0) {
      const greeting = {
        id: 'greeting-1',
        text: "Hello! I'm your AI assistant. How can I help you today?",
        isBot: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      dispatch(addMessage(greeting));
      setHasShownGreeting(true);
      
      // Show initial recommendations after greeting
      setTimeout(() => {
        setRecommendations(getRecommendations([greeting]));
      }, 500);
    }
  }, [isOpen, hasShownGreeting, messages.length, dispatch]);

  // Update recommendations when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.isBot) {
        setTimeout(() => {
          setRecommendations(getRecommendations(messages));
        }, 500);
      }
    }
  }, [messages]);

  const handleToggle = () => {
    dispatch(toggleWidget());
  };

  const handleClose = () => {
    dispatch(setWidgetOpen(false));
  };

  const handleSendMessage = (text) => {
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
    
    // Simulate bot response
    dispatch(setLoading(true));
    setTimeout(() => {
      const botResponse = {
        id: `bot-${Date.now()}`,
        text: getBotResponse(text),
        isBot: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      dispatch(addMessage(botResponse));
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
      />
    </>
  );
};

export default FloatingChatWidget;
