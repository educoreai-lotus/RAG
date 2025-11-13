/**
 * ChatWidgetButton - Floating chat bubble button
 * Appears at bottom-right corner with smooth animations
 */

import React from 'react';
import { motion } from 'framer-motion';
import { HiChatBubbleLeftRight } from 'react-icons/hi2';

const ChatWidgetButton = ({ onClick, isOpen, unreadCount = 0 }) => {
  return (
    <motion.button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-full shadow-glow-lg hover:shadow-glow-lg hover:scale-110 transition-all duration-300 flex items-center justify-center focus-ring"
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <HiChatBubbleLeftRight className="w-7 h-7" />
      
      {/* Unread badge */}
      {unreadCount > 0 && !isOpen && (
        <motion.span
          className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </motion.span>
      )}

      {/* Pulse animation when closed */}
      {!isOpen && (
        <motion.span
          className="absolute inset-0 rounded-full bg-emerald-400"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </motion.button>
  );
};

export default ChatWidgetButton;

