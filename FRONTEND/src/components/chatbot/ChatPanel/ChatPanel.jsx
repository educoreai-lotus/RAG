/**
 * ChatPanel - Main chat container with messages, recommendations, and input
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatHeader from '../ChatHeader/ChatHeader.jsx';
import ChatMessage from '../ChatMessage/ChatMessage.jsx';
import Recommendations from '../Recommendations/Recommendations.jsx';
import ChatInput from '../ChatInput/ChatInput.jsx';

const ChatPanel = ({
  isOpen,
  onClose,
  messages = [],
  recommendations = [],
  onSendMessage,
  onSelectRecommendation,
  isLoading = false,
}) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-card-lg flex flex-col z-40 overflow-hidden"
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Header */}
          <ChatHeader onClose={onClose} />

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {messages.length === 0 && (
              <motion.div
                className="text-center text-gray-500 py-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-sm">Start a conversation...</p>
              </motion.div>
            )}

            {messages.map((msg, index) => (
              <ChatMessage
                key={msg.id || index}
                message={msg.text}
                isBot={msg.isBot}
                timestamp={msg.timestamp}
              />
            ))}

            {/* Recommendations appear after bot messages */}
            {messages.length > 0 &&
              messages[messages.length - 1]?.isBot &&
              recommendations.length > 0 && (
                <Recommendations
                  items={recommendations}
                  onSelect={onSelectRecommendation}
                />
              )}

            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                className="flex items-center gap-2 text-gray-500 text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>Bot is typing...</span>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <ChatInput onSend={onSendMessage} disabled={isLoading} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatPanel;

