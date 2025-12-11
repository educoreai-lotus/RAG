/**
 * Conversation Cache Service
 * Manages conversation history in Redis with TTL-based expiration
 * 
 * This service stores conversation history temporarily in Redis (30 minutes TTL)
 * to enable multi-turn conversations where Claude can reference previous messages.
 * 
 * @module services/conversationCache
 */

import { getRedis, isRedisAvailable } from '../config/redis.config.js';
import { logger } from '../utils/logger.util.js';

const CONVERSATION_TTL = 1800; // 30 minutes in seconds
const MAX_HISTORY_LIMIT = 10; // Maximum messages to store per conversation

/**
 * Add a message to conversation history in Redis
 * 
 * @param {string} conversationId - Unique conversation identifier
 * @param {string} role - Message role ('user' or 'assistant')
 * @param {string} content - Message content
 * @returns {Promise<boolean>} True if message was saved successfully, false otherwise
 */
export async function addMessageToConversation(conversationId, role, content) {
  if (!conversationId || !role || !content) {
    logger.warn('Invalid parameters for addMessageToConversation', {
      conversationId: !!conversationId,
      role: !!role,
      content: !!content,
    });
    return false;
  }

  if (!isRedisAvailable()) {
    logger.debug('Redis not available, skipping conversation history save');
    return false;
  }

  try {
    const redis = getRedis();
    if (!redis) {
      return false;
    }

    const key = `conversation:${conversationId}`;
    const message = {
      role,
      content: String(content),
      timestamp: Date.now(),
    };

    // Use RPUSH to append message to list
    await redis.rpush(key, JSON.stringify(message));

    // Set/refresh TTL to 1800 seconds (30 minutes)
    await redis.expire(key, CONVERSATION_TTL);

    // Trim list to keep only last MAX_HISTORY_LIMIT messages
    // Keep the most recent messages (negative index means from the end)
    await redis.ltrim(key, -MAX_HISTORY_LIMIT, -1);

    logger.info('Message added to conversation history', {
      conversationId,
      role,
      contentLength: content.length,
      ttl: CONVERSATION_TTL,
    });

    return true;
  } catch (error) {
    // Graceful degradation - log warning but don't throw
    logger.warn('Failed to add message to conversation history', {
      error: error.message,
      conversationId,
      role,
    });
    return false;
  }
}

/**
 * Get conversation history from Redis
 * 
 * @param {string} conversationId - Unique conversation identifier
 * @param {number} limit - Maximum number of messages to retrieve (default: 10)
 * @returns {Promise<Array<{role: string, content: string}>>} Array of message objects
 */
export async function getConversationHistory(conversationId, limit = MAX_HISTORY_LIMIT) {
  if (!conversationId) {
    logger.debug('No conversationId provided, returning empty history');
    return [];
  }

  if (!isRedisAvailable()) {
    logger.debug('Redis not available, returning empty conversation history');
    return [];
  }

  try {
    const redis = getRedis();
    if (!redis) {
      return [];
    }

    const key = `conversation:${conversationId}`;
    
    // Get last N messages using LRANGE
    // Negative index means from the end: -limit to -1 gets last 'limit' messages
    const messages = await redis.lrange(key, -limit, -1);

    if (!messages || messages.length === 0) {
      logger.debug('No conversation history found', { conversationId });
      return [];
    }

    // Parse JSON messages and extract role and content
    const history = messages
      .map((msg) => {
        try {
          const parsed = JSON.parse(msg);
          return {
            role: parsed.role,
            content: parsed.content,
          };
        } catch (parseError) {
          logger.warn('Failed to parse conversation message', {
            error: parseError.message,
            conversationId,
          });
          return null;
        }
      })
      .filter(Boolean); // Remove null entries

    logger.info('Conversation history loaded', {
      conversationId,
      messageCount: history.length,
      requestedLimit: limit,
    });

    return history;
  } catch (error) {
    // Graceful degradation - return empty array on error
    logger.warn('Failed to get conversation history', {
      error: error.message,
      conversationId,
    });
    return [];
  }
}

/**
 * Clear conversation history from Redis
 * 
 * @param {string} conversationId - Unique conversation identifier
 * @returns {Promise<boolean>} True if conversation was cleared successfully, false otherwise
 */
export async function clearConversation(conversationId) {
  if (!conversationId) {
    logger.warn('Invalid conversationId for clearConversation');
    return false;
  }

  if (!isRedisAvailable()) {
    logger.debug('Redis not available, skipping conversation clear');
    return false;
  }

  try {
    const redis = getRedis();
    if (!redis) {
      return false;
    }

    const key = `conversation:${conversationId}`;
    await redis.del(key);

    logger.info('Conversation history cleared', { conversationId });
    return true;
  } catch (error) {
    logger.warn('Failed to clear conversation history', {
      error: error.message,
      conversationId,
    });
    return false;
  }
}








