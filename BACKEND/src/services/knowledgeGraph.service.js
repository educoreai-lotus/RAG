/**
 * Knowledge Graph Service
 * Read helpers for knowledge graph progress and relations
 */

import { getPrismaClient } from '../config/database.config.js';

/**
 * Get a user's progress toward a given skill from KG edges.
 * Looks for edge: source=user:{userId}, target=skill:{skillId}, edgeType='learning'
 *
 * @param {string} tenantId
 * @param {string} userId
 * @param {string} skillIdOrNodeId - e.g., 'javascript' or 'skill:javascript'
 * @returns {Promise<{progress: number|null, weight: number|null, edge: object|null}>}
 */
export async function getUserSkillProgress(tenantId, userId, skillIdOrNodeId) {
  const prisma = await getPrismaClient();

  const sourceNodeId = `user:${userId}`;
  const targetNodeId = skillIdOrNodeId.startsWith('skill:')
    ? skillIdOrNodeId
    : `skill:${skillIdOrNodeId}`;

  const edge = await prisma.knowledgeGraphEdge.findFirst({
    where: {
      tenantId,
      sourceNodeId,
      targetNodeId,
      edgeType: 'learning',
    },
  });

  if (!edge) {
    return { progress: null, weight: null, edge: null };
  }

  const progress =
    edge.properties && typeof edge.properties.progress === 'number'
      ? edge.properties.progress
      : null;

  const weightNumber =
    typeof edge.weight === 'object' && edge.weight !== null && 'toNumber' in edge.weight
      ? edge.weight.toNumber()
      : typeof edge.weight === 'number'
      ? edge.weight
      : null;

  return { progress, weight: weightNumber, edge };
}






