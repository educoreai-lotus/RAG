/**
 * gRPC Client Utility
 * Helper functions to create gRPC clients for EDUCORE microservices
 */

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { logger } from '../utils/logger.util.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load proto file and create package definition
 * @param {string} protoPath - Path to proto file
 * @param {Object} options - Proto loader options
 * @returns {Object} Package definition
 */
export function loadProto(protoPath, options = {}) {
  const defaultOptions = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  };

  try {
    const packageDefinition = protoLoader.loadSync(protoPath, {
      ...defaultOptions,
      ...options,
    });

    return grpc.loadPackageDefinition(packageDefinition);
  } catch (error) {
    logger.error('Failed to load proto file', {
      protoPath,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Create gRPC client for a microservice
 * @param {string} serviceUrl - Service URL (e.g., 'localhost:50051')
 * @param {string} protoPath - Path to proto file
 * @param {string} serviceName - Service name (e.g., 'rag.v1.PersonalizedService')
 * @param {Object} options - Additional options
 * @returns {Object} gRPC client
 */
export function createGrpcClient(serviceUrl, protoPath, serviceName, options = {}) {
  try {
    const packageDef = loadProto(protoPath, options.protoOptions);
    const service = getNestedService(packageDef, serviceName);

    if (!service) {
      throw new Error(`Service ${serviceName} not found in proto`);
    }

    const client = new service(
      serviceUrl,
      grpc.credentials.createInsecure(),
      options.clientOptions || {}
    );

    logger.info('Created gRPC client', {
      serviceUrl,
      serviceName,
    });

    return client;
  } catch (error) {
    logger.error('Failed to create gRPC client', {
      serviceUrl,
      serviceName,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get nested service from package definition
 * @param {Object} packageDef - Package definition
 * @param {string} serviceName - Service name (e.g., 'rag.v1.PersonalizedService')
 * @returns {Object|null} Service or null
 */
function getNestedService(packageDef, serviceName) {
  const parts = serviceName.split('.');
  let current = packageDef;

  for (const part of parts) {
    if (!current || !current[part]) {
      return null;
    }
    current = current[part];
  }

  return current;
}

/**
 * Make gRPC call with promise wrapper
 * @param {Object} client - gRPC client
 * @param {string} methodName - Method name
 * @param {Object} request - Request object
 * @param {Object} metadata - Optional metadata
 * @param {number} timeout - Timeout in milliseconds (default: 5000)
 * @returns {Promise<Object>} Response
 */
export function grpcCall(client, methodName, request, metadata = {}, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const deadline = new Date();
    deadline.setMilliseconds(deadline.getMilliseconds() + timeout);

    const call = client[methodName](
      request,
      metadata,
      { deadline },
      (error, response) => {
        if (error) {
          logger.warn('gRPC call error', {
            methodName,
            error: error.message,
            code: error.code,
          });
          reject(error);
        } else {
          resolve(response);
        }
      }
    );

    // Handle call events
    call.on('error', (error) => {
      logger.warn('gRPC call stream error', {
        methodName,
        error: error.message,
      });
      reject(error);
    });
  });
}

