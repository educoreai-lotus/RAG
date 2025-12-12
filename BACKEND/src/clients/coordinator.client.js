/**
 * Coordinator Microservice Client (gRPC)
 * RAG-side gRPC client to call the external Coordinator microservice
 * Coordinator handles routing to other microservices via Universal Envelope
 * 
 * Enhanced with comprehensive error handling, timeout configuration, and monitoring
 */

import { logger } from '../utils/logger.util.js';
import { createGrpcClient, grpcCall } from './grpcClient.util.js';
import { generateSignature } from '../utils/signature.js';
import * as grpc from '@grpc/grpc-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// gRPC configuration with environment variable support
const getGrpcUrl = () => {
  // Priority 1: COORDINATOR_GRPC_URL (full host:port)
  const grpcUrl = process.env.COORDINATOR_GRPC_URL;
  if (grpcUrl) {
    // If already in host:port format, use as is
    if (grpcUrl.includes(':')) {
      return grpcUrl;
    }
  }
  
  // Priority 2: COORDINATOR_URL + COORDINATOR_GRPC_PORT
  const coordinatorHost = process.env.COORDINATOR_URL || process.env.COORDINATOR_SERVICE_URL;
  const coordinatorPort = process.env.COORDINATOR_GRPC_PORT || '50051';
  
  if (coordinatorHost) {
    try {
      // Remove protocol if present
      const hostname = coordinatorHost.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
      return `${hostname}:${coordinatorPort}`;
    } catch (error) {
      logger.warn('Failed to parse Coordinator URL', { error: error.message });
    }
  }
  
  // Priority 3: Default (localhost for dev)
  return process.env.COORDINATOR_GRPC_URL || 'localhost:50051';
};

const COORDINATOR_GRPC_URL = getGrpcUrl();
const COORDINATOR_ENABLED = process.env.COORDINATOR_ENABLED !== 'false'; // Default: enabled
const COORDINATOR_PROTO_PATH = process.env.COORDINATOR_PROTO_PATH || 
  join(__dirname, '../../DATABASE/proto/rag/v1/coordinator.proto');
const COORDINATOR_SERVICE_NAME = process.env.COORDINATOR_SERVICE_NAME || 'rag.v1.CoordinatorService';
const GRPC_TIMEOUT = parseInt(process.env.GRPC_TIMEOUT || '30', 10) * 1000; // Convert seconds to milliseconds

/**
 * Validate required environment variables
 */
function validateEnvironment() {
  const required = ['RAG_PRIVATE_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    logger.error('[Coordinator] Missing required environment variables', {
      missing,
      hint: 'Set RAG_PRIVATE_KEY in .env file (base64 encoded PEM format)'
    });
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate private key format
  try {
    const privateKey = Buffer.from(process.env.RAG_PRIVATE_KEY, 'base64').toString('utf-8');
    if (!privateKey.includes('BEGIN') || !privateKey.includes('PRIVATE KEY')) {
      throw new Error('Invalid private key format - must be PEM format');
    }
    logger.info('[Coordinator] Environment validation passed');
  } catch (error) {
    logger.error('[Coordinator] Invalid RAG_PRIVATE_KEY format', {
      error: error.message,
      hint: 'Key must be base64 encoded PEM format (e.g., -----BEGIN PRIVATE KEY-----)'
    });
    throw error;
  }
}

// Validate on module load (except in tests)
if (process.env.NODE_ENV !== 'test') {
  try {
    validateEnvironment();
  } catch (error) {
    logger.error('[Coordinator] Environment validation failed on startup', {
      error: error.message
    });
    // Don't throw - let service start but log the error
  }
}

// Monitoring metrics
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  fallbackRequests: 0, // Requests that used fallback services (rank > 1)
  totalProcessingTime: 0,
  errorsByCode: {},
  servicesUsed: {},
};

// Cache gRPC client
let grpcClient = null;
let clientCreationError = null;

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

  // If we previously failed to create client, don't retry immediately
  if (clientCreationError) {
    logger.debug('Skipping client creation due to previous error', {
      error: clientCreationError.message,
    });
    return null;
  }

  try {
    grpcClient = createGrpcClient(
      COORDINATOR_GRPC_URL,
      COORDINATOR_PROTO_PATH,
      COORDINATOR_SERVICE_NAME
    );
    logger.info('Coordinator gRPC client created', {
      url: COORDINATOR_GRPC_URL,
      timeout: `${GRPC_TIMEOUT}ms`,
    });
    clientCreationError = null;
    return grpcClient;
  } catch (error) {
    clientCreationError = error;
    logger.error('Failed to create Coordinator gRPC client', {
      error: error.message,
      url: COORDINATOR_GRPC_URL,
      protoPath: COORDINATOR_PROTO_PATH,
    });
    return null;
  }
}

/**
 * Reset client (useful for reconnection after errors)
 */
export function resetClient() {
  if (grpcClient) {
    try {
      grpcClient.close();
    } catch (_error) {
      // Ignore close errors
    }
  }
  grpcClient = null;
  clientCreationError = null;
  logger.info('Coordinator gRPC client reset');
}

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `rag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create Universal Envelope for request
 */
function createEnvelope(tenant_id, user_id, query_text, metadata) {
  return {
    version: '1.0',
    timestamp: new Date().toISOString(),
    request_id: generateRequestId(),
    tenant_id: tenant_id || '',
    user_id: user_id || '',
    source: 'rag-service',
    payload: {
      query_text: query_text,
      metadata: metadata || {}
    }
  };
}

/**
 * Generate gRPC metadata with signature
 */
function createSignedMetadata(request) {
  const privateKey = process.env.RAG_PRIVATE_KEY;
  
  if (!privateKey) {
    logger.error('RAG_PRIVATE_KEY not configured');
    throw new Error('RAG_PRIVATE_KEY environment variable is required');
  }
  
  // Decode private key from base64
  const decodedKey = Buffer.from(privateKey, 'base64').toString('utf-8');
  
  const timestamp = Date.now();
  
  // Create canonical data for signature
  const dataToSign = {
    tenant_id: request.tenant_id,
    user_id: request.user_id,
    query_text: request.query_text,
    requester_service: 'rag-service',
    timestamp: timestamp
  };
  
  // Generate signature using existing utility
  const signature = generateSignature('rag-service', decodedKey, dataToSign);
  
  // Create gRPC metadata
  const metadata = new grpc.Metadata();
  metadata.add('x-signature', signature);
  metadata.add('x-service-name', 'rag-service');  // ✅ Added per security doc
  metadata.add('x-timestamp', timestamp.toString());
  metadata.add('x-requester-service', 'rag-service');
  
  logger.info('[Coordinator] Generated signature for request', {
    timestamp,
    has_signature: !!signature
  });
  
  return metadata;
}

/**
 * Get gRPC error details
 * @param {Error} error - gRPC error
 * @returns {Object} Error details
 */
function getGrpcErrorDetails(error) {
  const details = {
    message: error.message,
    code: error.code || 'UNKNOWN',
    codeName: grpc.status[error.code] || 'UNKNOWN',
  };

  // Map common gRPC error codes
  const errorMappings = {
    [grpc.status.DEADLINE_EXCEEDED]: {
      type: 'TIMEOUT',
      userMessage: 'Request to Coordinator timed out',
      retryable: true,
    },
    [grpc.status.UNAVAILABLE]: {
      type: 'SERVICE_UNAVAILABLE',
      userMessage: 'Coordinator service is unavailable',
      retryable: true,
    },
    [grpc.status.NOT_FOUND]: {
      type: 'NOT_FOUND',
      userMessage: 'Coordinator service not found',
      retryable: false,
    },
    [grpc.status.INVALID_ARGUMENT]: {
      type: 'INVALID_REQUEST',
      userMessage: 'Invalid request to Coordinator',
      retryable: false,
    },
    [grpc.status.INTERNAL]: {
      type: 'INTERNAL_ERROR',
      userMessage: 'Coordinator internal error',
      retryable: true,
    },
  };

  const mapping = errorMappings[error.code];
  if (mapping) {
    return { ...details, ...mapping };
  }

  return {
    ...details,
    type: 'UNKNOWN_ERROR',
    userMessage: 'Unknown error from Coordinator',
    retryable: false,
  };
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
  const startTime = Date.now();
  metrics.totalRequests++;

  if (!COORDINATOR_ENABLED) {
    logger.debug('Coordinator client disabled');
    return null;
  }

  // Validate required parameters
  if (!tenant_id || !user_id || !query_text) {
    logger.warn('Invalid route request: missing required parameters', {
      has_tenant_id: !!tenant_id,
      has_user_id: !!user_id,
      has_query_text: !!query_text,
    });
    metrics.failedRequests++;
    return null;
  }

  const client = getGrpcClient();
  if (!client) {
    logger.debug('Coordinator gRPC client not available');
    metrics.failedRequests++;
    return null;
  }

  try {
    logger.info('[Coordinator] Routing request via gRPC', {
      tenant_id,
      user_id,
      query_text_preview: query_text.substring(0, 50),
      has_metadata: Object.keys(metadata).length > 0,
    });

    // Create Universal Envelope
    const envelope = createEnvelope(tenant_id, user_id, query_text, metadata);
    
    // Build request with all required fields
    const request = {
      tenant_id: tenant_id || '',
      user_id: user_id || '',
      query_text: query_text,
      requester_service: 'rag-service',  // ✅ Added
      context: metadata || {},            // ✅ Renamed from metadata
      envelope_json: JSON.stringify(envelope)  // ✅ Added
    };

    // Generate signed metadata
    const signedMetadata = createSignedMetadata(request);

    // Make gRPC call with signature
    logger.info('[Coordinator] Calling Route RPC with signature');
    const response = await grpcCall(
      client,
      'Route',
      request,
      signedMetadata,  // ✅ Include signature metadata
      GRPC_TIMEOUT
    );

    const processingTime = Date.now() - startTime;
    metrics.totalProcessingTime += processingTime;

    if (response) {
      metrics.successfulRequests++;
      
      // Track which services were used
      const targetServices = response.target_services || [];
      targetServices.forEach(service => {
        metrics.servicesUsed[service] = (metrics.servicesUsed[service] || 0) + 1;
      });

      // Check if fallback was used (rank_used > 1)
      const normalizedFields = response.normalized_fields || {};
      const rankUsed = parseInt(normalizedFields.rank_used || '0', 10);
      if (rankUsed > 1) {
        metrics.fallbackRequests++;
      }

      logger.info('[Coordinator] Received routing response', {
        tenant_id,
        user_id,
        has_target_services: !!response.target_services,
        target_count: response.target_services?.length || 0,
        processing_time_ms: processingTime,
        rank_used: rankUsed,
        successful_service: normalizedFields.successful_service,
        quality_score: normalizedFields.quality_score,
        total_attempts: normalizedFields.total_attempts,
      });
    } else {
      metrics.failedRequests++;
      logger.warn('Coordinator returned null response', {
        tenant_id,
        user_id,
      });
    }

    return response;
  } catch (error) {
    const processingTime = Date.now() - startTime;
    metrics.failedRequests++;
    
    // Track error by code
    const errorCode = error.code || 'UNKNOWN';
    metrics.errorsByCode[errorCode] = (metrics.errorsByCode[errorCode] || 0) + 1;

    const errorDetails = getGrpcErrorDetails(error);

    // Log error with appropriate level
    if (errorDetails.retryable) {
      logger.warn('Coordinator gRPC call error (retryable)', {
        ...errorDetails,
        tenant_id,
        user_id,
        url: COORDINATOR_GRPC_URL,
        processing_time_ms: processingTime,
      });
    } else {
      logger.error('Coordinator gRPC call error (non-retryable)', {
        ...errorDetails,
        tenant_id,
        user_id,
        url: COORDINATOR_GRPC_URL,
        processing_time_ms: processingTime,
      });
    }

    // Reset client on certain errors to allow reconnection
    if (error.code === grpc.status.UNAVAILABLE || error.code === grpc.status.DEADLINE_EXCEEDED) {
      resetClient();
    }

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

  // Use waitForReady to check connection
  return new Promise((resolve) => {
    const deadline = Date.now() + 5000; // 5 second timeout
    client.waitForReady(deadline, (error) => {
      resolve(!error);
    });
  });
}

/**
 * Get monitoring metrics
 * @returns {Object} Current metrics
 */
export function getMetrics() {
  const avgProcessingTime = metrics.totalRequests > 0
    ? metrics.totalProcessingTime / metrics.totalRequests
    : 0;

  const successRate = metrics.totalRequests > 0
    ? (metrics.successfulRequests / metrics.totalRequests) * 100
    : 0;

  const fallbackRate = metrics.totalRequests > 0
    ? (metrics.fallbackRequests / metrics.totalRequests) * 100
    : 0;

  return {
    ...metrics,
    averageProcessingTimeMs: Math.round(avgProcessingTime),
    successRate: Math.round(successRate * 100) / 100,
    fallbackRate: Math.round(fallbackRate * 100) / 100,
  };
}

/**
 * Reset metrics (useful for testing or periodic resets)
 */
export function resetMetrics() {
  Object.keys(metrics).forEach(key => {
    if (typeof metrics[key] === 'number') {
      metrics[key] = 0;
    } else if (typeof metrics[key] === 'object') {
      metrics[key] = {};
    }
  });
  logger.info('Coordinator metrics reset');
}

