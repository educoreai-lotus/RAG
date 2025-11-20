/**
 * ChatMessage - Individual message component with bot/user avatars and enhanced formatting
 */

import React from 'react';
import { motion } from 'framer-motion';
import { HiUserCircle, HiSparkles, HiUser, HiIdentification } from 'react-icons/hi2';
import { formatAnswer } from '../../../utils/answerFormatter.js';

const ChatMessage = ({ message, isBot = false, timestamp }) => {
  // Format bot messages for better readability
  const formattedSegments = isBot ? formatAnswer(message) : null;

  const renderFormattedContent = () => {
    if (!formattedSegments || formattedSegments.length === 0) {
      return (
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message}
        </p>
      );
    }

    return (
      <div className="text-sm leading-relaxed space-y-3">
        {formattedSegments.map((segment, index) => {
          switch (segment.type) {
            case 'header':
              return (
                <div key={index} className={`font-semibold text-gray-800 ${
                  segment.level === 1 ? 'text-base' : 
                  segment.level === 2 ? 'text-sm' : 'text-sm'
                } border-b border-gray-200 pb-1`}>
                  {segment.content}
                </div>
              );

            case 'paragraph':
              return (
                <p key={index} className="text-sm leading-relaxed text-gray-700 mb-2">
                  {segment.content}
                </p>
              );

            case 'list':
              return (
                <ul key={index} className="list-disc list-inside space-y-1 ml-2">
                  {segment.content.map((item, itemIndex) => (
                    <li key={itemIndex} className="text-sm text-gray-700">
                      {item}
                    </li>
                  ))}
                </ul>
              );

            case 'code':
              return (
                <div key={index} className="bg-gray-800 text-green-400 rounded-lg p-3 my-2 overflow-x-auto">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    {segment.language && (
                      <span className="text-xs text-gray-400 ml-auto">{segment.language}</span>
                    )}
                  </div>
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {segment.content}
                  </pre>
                </div>
              );

            case 'profile':
              return (
                <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3 my-2">
                  <div className="flex items-center gap-2 mb-2">
                    <HiIdentification className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">User Profile</span>
                  </div>
                  {segment.content.structured && Object.keys(segment.content.structured).length > 0 ? (
                    <div className="space-y-1">
                      {Object.entries(segment.content.structured).map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <span className="text-xs font-medium text-blue-700 capitalize min-w-16">
                            {key}:
                          </span>
                          <span className="text-xs text-blue-600">{value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-blue-600">{segment.content.raw}</p>
                  )}
                </div>
              );

            default:
              return (
                <p key={index} className="text-sm leading-relaxed text-gray-700">
                  {segment.content}
                </p>
              );
          }
        })}
      </div>
    );
  };

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

      <div className={`max-w-[75%] ${
        isBot ? 'bg-white border border-gray-200' : 'bg-emerald-500 text-white'
      } rounded-2xl px-4 py-3 shadow-card`}>
        {isBot ? renderFormattedContent() : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message}
          </p>
        )}
        {timestamp && (
          <p className={`text-xs mt-2 pt-2 border-t ${
            isBot ? 'text-gray-500 border-gray-100' : 'text-emerald-100 border-emerald-400'
          }`}>
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

