/**
 * Health Routes
 * REST API routes for health checks and system status
 */

import express from 'express';
import { getSchedulerStatus } from '../jobs/scheduledSync.js';

const router = express.Router();

/**
 * GET /health/batch-sync
 * Check if batch sync scheduler is running
 */
router.get('/batch-sync', (req, res) => {
  const status = getSchedulerStatus();

  res.json({
    scheduler: {
      enabled: status.enabled,
      isScheduled: status.isScheduled,
      isRunning: status.isRunning,
      cronAvailable: status.cronAvailable,
      schedule: status.schedule,
    },
    environment: {
      BATCH_SYNC_ENABLED: process.env.BATCH_SYNC_ENABLED !== 'false',
      BATCH_SYNC_SCHEDULE: process.env.BATCH_SYNC_SCHEDULE || '50 19 * * *',
      BATCH_SYNC_ON_STARTUP: process.env.BATCH_SYNC_ON_STARTUP === 'true',
      BATCH_SYNC_TIMEZONE: process.env.BATCH_SYNC_TIMEZONE || 'UTC',
      COORDINATOR_ENABLED: process.env.COORDINATOR_ENABLED !== 'false',
      COORDINATOR_GRPC_ENDPOINT: process.env.COORDINATOR_GRPC_ENDPOINT || 'not set',
      COORDINATOR_GRPC_URL: process.env.COORDINATOR_GRPC_URL || 'not set',
      COORDINATOR_URL: process.env.COORDINATOR_URL || 'not set',
    },
    timestamp: new Date().toISOString()
  });
});

export default router;

