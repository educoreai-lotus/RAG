/**
 * Admin Routes
 * REST API routes for admin operations (batch sync, etc.)
 */

import express from 'express';
import { runBatchSync } from '../jobs/scheduledSync.js';
import { logger } from '../utils/logger.util.js';

const router = express.Router();

/**
 * POST /admin/batch-sync/trigger
 * Manually trigger batch sync (for testing)
 */
router.post('/batch-sync/trigger', async (req, res) => {
  logger.info('🔍 [MANUAL TRIGGER] Batch sync manually triggered');

  try {
    logger.info('🔍 [MANUAL TRIGGER] Step 1: Calling runBatchSync()');

    const result = await runBatchSync();

    logger.info('✅ [MANUAL TRIGGER] Batch sync completed', {
      success: result?.success,
      totalItems: result?.totalItems || 0,
      successfulServices: result?.successfulServices || 0,
      failedServices: result?.failedServices || 0,
    });

    res.json({
      success: true,
      message: 'Batch sync completed',
      result: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ [MANUAL TRIGGER] Batch sync failed', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });

    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;

