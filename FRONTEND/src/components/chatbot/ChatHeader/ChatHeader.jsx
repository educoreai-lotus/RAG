/**
 * ChatHeader - Header component with greeting, avatar, status, and mode indicator
 */

import React from 'react';
import { HiXMark, HiUserCircle, HiCog6Tooth } from 'react-icons/hi2';
import { motion } from 'framer-motion';
import { MODES } from '../../../store/slices/chatMode.slice.js';

const getModeInfo = (currentMode) => {
  switch (currentMode) {
    case MODES.ASSESSMENT_SUPPORT:
      return {
        title: 'Assessment Support Mode',
        status: 'Focused on assessment help',
        badge: 'Assessment',
        badgeColor: 'bg-blue-500',
      };
    case MODES.DEVLAB_SUPPORT:
      return {
        title: 'DevLab Support Mode',
        status: 'Focused on DevLab help',
        badge: 'DevLab',
        badgeColor: 'bg-purple-500',
      };
    default:
      return {
        title: 'Hello! How can I help you today?',
        status: 'Online and ready',
        badge: null,
        badgeColor: null,
      };
  }
};

const ChatHeader = ({ onClose, currentMode = MODES.GENERAL, status }) => {
  const modeInfo = getModeInfo(currentMode);
  const isSupportMode = currentMode !== MODES.GENERAL;

  return (
    <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-4 rounded-t-2xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            {isSupportMode ? (
              <HiCog6Tooth className="w-6 h-6" />
            ) : (
              <HiUserCircle className="w-6 h-6" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{modeInfo.title}</h2>
            {isSupportMode && (
              <p className="text-xs text-emerald-100 mt-1">
                Type "exit support" to return to general chat
              </p>
            )}
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

      {/* Status Card with Mode Badge */}
      <motion.div
        className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 text-sm"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
            <span className="font-medium">Status: {status || modeInfo.status}</span>
          </div>
          {modeInfo.badge && (
            <span className={`${modeInfo.badgeColor} text-white text-xs font-bold px-2 py-1 rounded-full`}>
              {modeInfo.badge}
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ChatHeader;

