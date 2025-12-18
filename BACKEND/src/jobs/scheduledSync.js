/**
 * Scheduled Batch Sync Job
 * Runs batch synchronization on a schedule using node-cron
 * 
 * Schedule: Daily at 2 AM (configurable via BATCH_SYNC_SCHEDULE env var)
 */

import { logger } from '../utils/logger.util.js';
import { syncAllServices } from '../services/batchSyncService.js';

// Check if node-cron is available
let cron = null;
try {
  cron = (await import('node-cron')).default;
} catch (error) {
  logger.warn('node-cron not installed. Scheduled batch sync will not run.', {
    error: error.message,
    hint: 'Install with: npm install node-cron',
  });
}

// Configuration
const BATCH_SYNC_ENABLED = process.env.BATCH_SYNC_ENABLED !== 'false'; // Default: enabled
// ⚠️ TEMPORARY: Set to 19:50 for testing - CHANGE BACK TO '0 2 * * *' (2 AM) after testing
const BATCH_SYNC_SCHEDULE = process.env.BATCH_SYNC_SCHEDULE || '50 19 * * *'; // TEMPORARY: 19:50 UTC for testing (was: '0 2 * * *')
const BATCH_SYNC_ON_STARTUP = process.env.BATCH_SYNC_ON_STARTUP === 'true'; // Default: false

let scheduledTask = null;
let isRunning = false;

/**
 * Run batch sync (can be called manually or by scheduler)
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync result
 */
export async function runBatchSync(options = {}) {
  if (isRunning) {
    logger.warn('[ScheduledSync] Batch sync already running, skipping');
    return {
      success: false,
      reason: 'already_running',
    };
  }

  if (!BATCH_SYNC_ENABLED) {
    logger.debug('[ScheduledSync] Batch sync disabled');
    return {
      success: false,
      reason: 'disabled',
    };
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    logger.info('[ScheduledSync] Starting scheduled batch sync', {
      timestamp: new Date().toISOString(),
    });

    const result = await syncAllServices({
      syncType: 'daily',
      ...options,
    });

    const duration = Date.now() - startTime;

    logger.info('[ScheduledSync] Scheduled batch sync completed', {
      success: result.success,
      totalItems: result.totalItems,
      successfulServices: result.successfulServices,
      failedServices: result.failedServices,
      duration_ms: duration,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('[ScheduledSync] Scheduled batch sync failed', {
      error: error.message,
      stack: error.stack,
      duration_ms: duration,
    });

    return {
      success: false,
      error: error.message,
      duration_ms: duration,
    };
  } finally {
    isRunning = false;
  }
}

/**
 * Start the scheduled batch sync job
 * @returns {Object|null} Cron task or null if not started
 */
export function startScheduledSync() {
  if (!BATCH_SYNC_ENABLED) {
    logger.info('[ScheduledSync] Batch sync disabled, not starting scheduler');
    return null;
  }

  if (!cron) {
    logger.warn('[ScheduledSync] node-cron not available, scheduler not started');
    return null;
  }

  // Validate cron expression
  if (!cron.validate(BATCH_SYNC_SCHEDULE)) {
    logger.error('[ScheduledSync] Invalid cron schedule', {
      schedule: BATCH_SYNC_SCHEDULE,
      hint: 'Use standard cron format: minute hour day month weekday',
    });
    return null;
  }

  // Create scheduled task
  scheduledTask = cron.schedule(BATCH_SYNC_SCHEDULE, async () => {
    try {
      await runBatchSync();
    } catch (error) {
      // Error already logged in runBatchSync, but catch to prevent unhandled rejection
      logger.error('[ScheduledSync] Unhandled error in scheduled task', {
        error: error.message,
      });
    }
  }, {
    scheduled: true,
    timezone: process.env.BATCH_SYNC_TIMEZONE || 'UTC',
  });

  logger.info('[ScheduledSync] Scheduled batch sync started', {
    schedule: BATCH_SYNC_SCHEDULE,
    timezone: process.env.BATCH_SYNC_TIMEZONE || 'UTC',
    nextRun: getNextRunTime(BATCH_SYNC_SCHEDULE),
  });

  // Run on startup if configured
  if (BATCH_SYNC_ON_STARTUP) {
    logger.info('[ScheduledSync] Running batch sync on startup');
    // Run asynchronously to not block server startup
    setTimeout(() => {
      runBatchSync().catch(error => {
        logger.error('[ScheduledSync] Startup batch sync failed', {
          error: error.message,
        });
      });
    }, 5000); // Wait 5 seconds after startup
  }

  return scheduledTask;
}

/**
 * Stop the scheduled batch sync job
 */
export function stopScheduledSync() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    logger.info('[ScheduledSync] Scheduled batch sync stopped');
  }
}

/**
 * Get next run time for the schedule
 * @param {string} schedule - Cron schedule expression
 * @returns {string} Next run time as ISO string
 */
function getNextRunTime(schedule) {
  // Simple calculation - in production, use a proper cron parser
  // For now, just return a placeholder
  return 'Calculating...';
}

/**
 * Get scheduler status
 * @returns {Object} Scheduler status
 */
export function getSchedulerStatus() {
  return {
    enabled: BATCH_SYNC_ENABLED,
    schedule: BATCH_SYNC_SCHEDULE,
    isRunning,
    isScheduled: scheduledTask !== null,
    cronAvailable: cron !== null,
  };
}



