/**
 * AI LEARNER Microservice Client (gRPC)
 * Fetches personalized learning recommendations from AI LEARNER microservice via gRPC
 */

import { logger } from '../utils/logger.util.js';
import { createGrpcClient, grpcCall } from './grpcClient.util.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// gRPC configuration
// Support both gRPC URL format (host:port) and HTTP URL (extract host:port)
const getGrpcUrl = () => {
  const grpcUrl = process.env.AI_LEARNER_GRPC_URL;
  if (grpcUrl) {
    // If already in host:port format, use as is
    if (grpcUrl.includes(':')) {
      return grpcUrl;
    }
  }
  
  // Try to extract from LEARNER_AI_SERVICE_URL
  const httpUrl = process.env.LEARNER_AI_SERVICE_URL;
  if (httpUrl) {
    try {
      // Extract host and port from URL
      const urlStr = httpUrl.startsWith('http') ? httpUrl : `https://${httpUrl}`;
      const url = new URL(urlStr);
      // Default gRPC port is usually 50051, but can be configured
      return `${url.hostname}:${process.env.AI_LEARNER_GRPC_PORT || '50051'}`;
    } catch (error) {
      // If URL parsing fails, try to extract hostname manually
      const hostname = httpUrl.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
      return `${hostname}:${process.env.AI_LEARNER_GRPC_PORT || '50051'}`;
    }
  }
  
  return 'localhost:50051';
};

const AI_LEARNER_GRPC_URL = getGrpcUrl();
const AI_LEARNER_ENABLED = process.env.AI_LEARNER_ENABLED !== 'false'; // Default: enabled
const AI_LEARNER_PROTO_PATH = process.env.AI_LEARNER_PROTO_PATH || join(__dirname, '../../DATABASE/proto/rag/v1/personalized.proto');
const AI_LEARNER_SERVICE_NAME = process.env.AI_LEARNER_SERVICE_NAME || 'rag.v1.PersonalizedService';

// Cache gRPC client
let grpcClient = null;

/**
 * Get or create gRPC client for AI LEARNER
 * @returns {Object|null} gRPC client or null if disabled/error
 */
function getGrpcClient() {
  if (!AI_LEARNER_ENABLED) {
    return null;
  }

  if (grpcClient) {
    return grpcClient;
  }

  try {
    grpcClient = createGrpcClient(
      AI_LEARNER_GRPC_URL,
      AI_LEARNER_PROTO_PATH,
      AI_LEARNER_SERVICE_NAME
    );
    return grpcClient;
  } catch (error) {
    logger.warn('Failed to create AI LEARNER gRPC client', {
      error: error.message,
      url: AI_LEARNER_GRPC_URL,
    });
    return null;
  }
}

/**
 * Fetch learning recommendations from AI LEARNER microservice via gRPC
 * @param {string} userId - User identifier
 * @param {string} tenantId - Tenant identifier
 * @param {Object} options - Options for recommendations
 * @param {number} options.limit - Maximum number of recommendations (default: 5)
 * @param {Array} options.skillGaps - User skill gaps (optional)
 * @param {Array} options.recentQueries - Recent query history (optional)
 * @returns {Promise<Array>} Array of learning recommendation objects
 */
export async function fetchLearningRecommendations(userId, tenantId, options = {}) {
  if (!AI_LEARNER_ENABLED) {
    logger.debug('AI LEARNER client disabled');
    return [];
  }

  const client = getGrpcClient();
  if (!client) {
    logger.debug('AI LEARNER gRPC client not available');
    return [];
  }

  try {
    // Prepare gRPC request
    const request = {
      tenant_id: tenantId,
      user_id: userId,
      query_id: options.queryId || '', // Optional query ID
    };

    // Make gRPC call
    const response = await grpcCall(
      client,
      'GetRecommendations',
      request,
      {},
      5000 // 5 second timeout
    );

    if (response && response.recommendations && response.recommendations.length > 0) {
      // Transform gRPC recommendations to our format
      const recommendations = response.recommendations.map((rec, index) => ({
        id: rec.recommendation_id || `ai-learner-${index}`,
        type: rec.recommendation_type === 'course' ? 'card' : 'button',
        label: rec.title || 'Learning Recommendation',
        description: rec.description || '',
        reason: rec.reason || 'Recommended for you',
        priority: rec.priority || (10 - index),
        metadata: {
          recommendationType: rec.recommendation_type,
          recommendationId: rec.recommendation_id,
          source: 'ai_learner_grpc',
        },
      }));

      logger.info('Fetched learning recommendations from AI LEARNER via gRPC', {
        userId,
        tenantId,
        count: recommendations.length,
      });

      return recommendations;
    }

    return [];
  } catch (error) {
    // Log error but don't throw - allow fallback to other recommendations
    logger.warn('AI LEARNER gRPC call error', {
      error: error.message,
      code: error.code,
      userId,
      tenantId,
      url: AI_LEARNER_GRPC_URL,
    });

    return [];
  }
}

/**
 * Check if AI LEARNER service is available (via gRPC)
 * @returns {Promise<boolean>} True if service is available
 */
export async function isAiLearnerAvailable() {
  if (!AI_LEARNER_ENABLED) {
    return false;
  }

  const client = getGrpcClient();
  if (!client) {
    return false;
  }

  // Try a simple health check call if available
  // For now, just check if client exists
  return client !== null;
}

