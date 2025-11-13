/**
 * ChatHeader - Header component with greeting, avatar, and status
 */

import React from 'react';
import { HiXMark, HiUserCircle } from 'react-icons/hi2';
import { motion } from 'framer-motion';

const ChatHeader = ({ onClose, status = 'Online and ready' }) => {
  return (
    <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-4 rounded-t-2xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <HiUserCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Hello! How can I help you today?</h2>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors focus-ring"
          aria-label="Close chat"
        >
          <HiXMark className="w-5 h-5" />
        </button>
      </div>

      {/* Status Card */}
      <motion.div
        className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 text-sm"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
          <span className="font-medium">Status: {status}</span>
        </div>
      </motion.div>
    </div>
  );
};

export default ChatHeader;

