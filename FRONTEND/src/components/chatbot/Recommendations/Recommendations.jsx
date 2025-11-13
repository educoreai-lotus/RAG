/**
 * Recommendations - Dynamic recommendation system with quick actions and cards
 * Mode-aware recommendations display
 */

import React from 'react';
import { motion } from 'framer-motion';
import { HiLightBulb, HiArrowRight } from 'react-icons/hi2';
import { MODES } from '../../../store/slices/chatMode.slice.js';

const getRecommendationsTitle = (currentMode) => {
  switch (currentMode) {
    case MODES.ASSESSMENT_SUPPORT:
      return 'Assessment Actions';
    case MODES.DEVLAB_SUPPORT:
      return 'DevLab Actions';
    default:
      return 'Suggestions';
  }
};

const Recommendations = ({ items = [], onSelect, currentMode = MODES.GENERAL }) => {
  if (!items || items.length === 0) return null;

  return (
    <motion.div
      className="mt-4 space-y-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.3 }}
    >
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
        <HiLightBulb className="w-4 h-4 text-emerald-500" />
        <span className="font-medium">{getRecommendationsTitle(currentMode)}</span>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => {
          if (item.type === 'button') {
            return (
              <motion.button
                key={item.id}
                onClick={() => onSelect && onSelect(item)}
                className="w-full bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 border border-emerald-200 text-emerald-700 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200 flex items-center justify-between group focus-ring"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <span>{item.label}</span>
                <HiArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            );
          }

          if (item.type === 'card') {
            return (
              <motion.div
                key={item.id}
                onClick={() => onSelect && onSelect(item)}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-card-lg hover:border-emerald-300 transition-all duration-200 cursor-pointer focus-ring"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <h4 className="font-semibold text-gray-900 mb-1">{item.label}</h4>
                {item.description && (
                  <p className="text-sm text-gray-600">{item.description}</p>
                )}
              </motion.div>
            );
          }

          return null;
        })}
      </div>
    </motion.div>
  );
};

export default Recommendations;

