/**
 * Recommendations Controller
 * Handles personalized recommendations requests
 */

import { logger } from '../utils/logger.util.js';
import { generatePersonalizedRecommendations } from '../services/recommendations.service.js';
import { getOrCreateTenant } from '../services/tenant.service.js';
import { validateAndFixTenantId } from '../utils/tenant-validation.util.js';

/**
 * GET /api/v1/personalized/recommendations/:userId
 * Get personalized recommendations for a user
 * Query params:
 *   - tenant_id: Tenant identifier (optional, defaults to 'default.local')
 *   - mode: Chat mode - 'general', 'assessment', 'devlab' (optional, defaults to 'general')
 *   - limit: Maximum number of recommendations (optional, defaults to 5)
 */
export async function getRecommendations(req, res, next) {
  try {
    const { userId } = req.params;
    const { tenant_id, mode = 'general', limit = 5 } = req.query;

    if (!userId || userId === 'undefined') {
      return res.status(400).json({
        error: 'Validation error',
        message: 'User ID is required',
      });
    }

    // CRITICAL: Validate and fix tenant_id
    let validatedTenantId = tenant_id || 'default.local';
    validatedTenantId = validateAndFixTenantId(validatedTenantId);
    
    // Get or create tenant
    const tenant = await getOrCreateTenant(validatedTenantId);

    logger.info('Recommendations request', {
      userId,
      tenantId: tenant.id,
      mode,
      limit,
    });

    // Generate personalized recommendations
    const recommendations = await generatePersonalizedRecommendations(
      tenant.id,
      userId,
      {
        limit: parseInt(limit, 10) || 5,
        mode: mode.toLowerCase(),
      }
    );

    res.json({
      recommendations,
      userId,
      tenantId: tenant.id,
      mode,
      count: recommendations.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Recommendations error', {
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
}

