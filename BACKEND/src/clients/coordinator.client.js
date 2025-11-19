/**
 * Coordinator Microservice Client (gRPC)
 * RAG-side gRPC client to call the external Coordinator microservice
 * Coordinator handles routing to other microservices via Universal Envelope
 */

import { logger } from '../utils/logger.util.js';
import { createGrpcClient, grpcCall } from './grpcClient.util.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// gRPC configuration
const getGrpcUrl = () => {
  const grpcUrl = process.env.COORDINATOR_GRPC_URL;
  if (grpcUrl) {
    // If already in host:port format, use as is
    if (grpcUrl.includes(':')) {
      return grpcUrl;
    }
  }
  
  // Try to extract from COORDINATOR_SERVICE_URL
  const httpUrl = process.env.COORDINATOR_SERVICE_URL;
  if (httpUrl) {
    try {
      const urlStr = httpUrl.startsWith('http') ? httpUrl : `https://${httpUrl}`;
      const url = new URL(urlStr);
      return `${url.hostname}:${process.env.COORDINATOR_GRPC_PORT || '50051'}`;
    } catch (error) {
      const hostname = httpUrl.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
      return `${hostname}:${process.env.COORDINATOR_GRPC_PORT || '50051'}`;
    }
  }
  
  return process.env.COORDINATOR_GRPC_URL || 'localhost:50051';
};

const COORDINATOR_GRPC_URL = getGrpcUrl();
const COORDINATOR_ENABLED = process.env.COORDINATOR_ENABLED !== 'false'; // Default: enabled
const COORDINATOR_PROTO_PATH = process.env.COORDINATOR_PROTO_PATH || 
  join(__dirname, '../../DATABASE/proto/rag/v1/coordinator.proto');
const COORDINATOR_SERVICE_NAME = process.env.COORDINATOR_SERVICE_NAME || 'rag.v1.CoordinatorService';

// Cache gRPC client
let grpcClient = null;

/**
 * Get or create gRPC client for Coordinator
 * @returns {Object|null} gRPC client or null if disabled/error
 */
function getGrpcClient() {
  if (!COORDINATOR_ENABLED) {
    return null;
  }

  if (grpcClient) {
    return grpcClient;
  }

  try {
    grpcClient = createGrpcClient(
      COORDINATOR_GRPC_URL,
      COORDINATOR_PROTO_PATH,
      COORDINATOR_SERVICE_NAME
    );
    return grpcClient;
  } catch (error) {
    logger.warn('Failed to create Coordinator gRPC client', {
      error: error.message,
      url: COORDINATOR_GRPC_URL,
    });
    return null;
  }
}

/**
 * Route request to Coordinator
 * Coordinator will handle routing to appropriate microservices
 * @param {Object} params - Route parameters
 * @param {string} params.tenant_id - Tenant identifier
 * @param {string} params.user_id - User identifier
 * @param {string} params.query_text - Original user query
 * @param {Object} params.metadata - Additional metadata (query context, required fields, etc.)
 * @returns {Promise<Object|null>} RouteResponse or null if disabled/error
 */
export async function routeRequest({ tenant_id, user_id, query_text, metadata = {} }) {
  if (!COORDINATOR_ENABLED) {
    logger.debug('Coordinator client disabled');
    return null;
  }

  const client = getGrpcClient();
  if (!client) {
    logger.debug('Coordinator gRPC client not available');
    return null;
  }

  try {
    // Prepare gRPC request
    const request = {
      tenant_id,
      user_id,
      query_text,
      metadata: metadata || {},
    };

    // Make gRPC call to Coordinator.Route()
    const response = await grpcCall(
      client,
      'Route',
      request,
      {},
      10000 // 10 second timeout for Coordinator routing
    );

    if (response) {
      logger.info('Coordinator route request successful', {
        tenant_id,
        user_id,
        target_services: response.target_services || [],
        has_normalized_fields: !!response.normalized_fields,
      });
    }

    return response;
  } catch (error) {
    // Log error but don't throw - allow fallback to internal data
    logger.warn('Coordinator gRPC call error', {
      error: error.message,
      code: error.code,
      tenant_id,
      user_id,
      url: COORDINATOR_GRPC_URL,
    });

    return null;
  }
}

/**
 * Check if Coordinator service is available
 * @returns {Promise<boolean>} True if service is available
 */
export async function isCoordinatorAvailable() {
  if (!COORDINATOR_ENABLED) {
    return false;
  }

  const client = getGrpcClient();
  if (!client) {
    return false;
  }

  // For now, just check if client exists
  // In the future, could add a health check RPC
  return client !== null;
}

