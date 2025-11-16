import { logger } from '../utils/logger.util.js';

/**
 * Placeholder gRPC fallback layer.
 * In production, implement real gRPC clients for each service (Skills, Directory, Content, CourseBuilder, Assessment, Analytics).
 * This module returns [] if no gRPC is configured, so the main flow can decide on dynamic "no data".
 */

const grpcEnabled = process.env.GRPC_ENABLED === 'true';

/**
 * Attempt to fetch EDUCORE data via gRPC by category.
 * Returns an array of { contentId, contentType, contentText, metadata } to be used as context.
 */
export async function grpcFetchByCategory(category, { query, tenantId }) {
  if (!grpcEnabled) {
    return [];
  }

  try {
    // TODO: Wire actual gRPC clients here. For now, just log and return empty.
    logger.info('gRPC fallback requested', { category, tenantId, query });

    // Example shape when implemented:
    // return [
    //   {
    //     contentId: 'grpc-source-1',
    //     contentType: category,
    //     contentText: '...',
    //     metadata: { source: 'grpc' },
    //   },
    // ];

    return [];
  } catch (error) {
    logger.warn('gRPC fallback failed', { error: error.message, category });
    return [];
  }
}


