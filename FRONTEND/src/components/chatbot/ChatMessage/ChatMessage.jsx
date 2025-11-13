/**
 * ChatMessage - Individual message component with bot/user avatars
 */

import React from 'react';
import { motion } from 'framer-motion';
import { HiUserCircle, HiSparkles } from 'react-icons/hi2';

const ChatMessage = ({ message, isBot = false, timestamp }) => {
  return (
    <motion.div
      className={`flex gap-3 mb-4 ${isBot ? 'justify-start' : 'justify-end'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {isBot && (
        <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
          <HiSparkles className="w-5 h-5 text-white" />
        </div>
      )}

      <div className={`max-w-[75%] ${isBot ? 'bg-gray-100' : 'bg-emerald-500 text-white'} rounded-2xl px-4 py-2.5 shadow-card`}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message}
        </p>
        {timestamp && (
          <p className={`text-xs mt-1 ${isBot ? 'text-gray-500' : 'text-emerald-100'}`}>
            {timestamp}
          </p>
        )}
      </div>

      {!isBot && (
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
          <HiUserCircle className="w-5 h-5 text-gray-600" />
        </div>
      )}
    </motion.div>
  );
};

export default ChatMessage;

