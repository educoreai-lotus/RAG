/**
 * Knowledge Graph Controller
 */

import Joi from 'joi';
import { getUserSkillProgress } from '../services/knowledgeGraph.service.js';
import { validate } from '../utils/validation.util.js';
import { validateAndFixTenantId } from '../utils/tenant-validation.util.js';

const progressParamsSchema = Joi.object({
  userId: Joi.string().min(1).required(),
  skillId: Joi.string().min(1).required(),
});

const progressQuerySchema = Joi.object({
  tenant_id: Joi.string().min(1).default('dev.educore.local'),
});

/**
 * GET /api/v1/knowledge/progress/user/:userId/skill/:skillId
 */
export async function getSkillProgress(req, res, next) {
  try {
    const paramsValidation = validate(req.params, progressParamsSchema);
    if (!paramsValidation.valid) {
      return res.status(400).json({ error: 'Validation error', message: paramsValidation.error });
    }

    const queryValidation = validate(req.query, progressQuerySchema);
    if (!queryValidation.valid) {
      return res.status(400).json({ error: 'Validation error', message: queryValidation.error });
    }

    const { userId, skillId } = paramsValidation.value;
    let { tenant_id } = queryValidation.value;

    // CRITICAL: Validate and fix tenant_id
    tenant_id = validateAndFixTenantId(tenant_id || 'default.local');

    const { progress, weight } = await getUserSkillProgress(tenant_id, userId, skillId);

    return res.json({
      userId,
      skillId: skillId.startsWith('skill:') ? skillId : `skill:${skillId}`,
      progress, // e.g., 0.3
      weight,   // optional weight on edge (0..1)
    });
  } catch (error) {
    next(error);
  }
}




