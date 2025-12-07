/**
 * User Profile Service
 * Handles user profile management for personalization
 */

import { getPrismaClient } from '../config/database.config.js';
import { logger } from '../utils/logger.util.js';

/**
 * Get or create user profile
 * @param {string} tenantId - Tenant identifier
 * @param {string} userId - User identifier
 * @param {Object} defaultData - Default profile data
 * @returns {Promise<Object>} User profile
 */
export async function getOrCreateUserProfile(tenantId, userId, defaultData = {}) {
  try {
    const prisma = await getPrismaClient();

    // Try to find existing profile
    let profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    // If not found, create default profile
    if (!profile) {
      logger.info('Creating new user profile', { tenantId, userId });
      profile = await prisma.userProfile.create({
        data: {
          tenantId,
          userId,
          role: defaultData.role || 'learner',
          department: defaultData.department || null,
          region: defaultData.region || null,
          skillGaps: defaultData.skillGaps || [],
          learningProgress: defaultData.learningProgress || {},
          preferences: defaultData.preferences || {},
          metadata: defaultData.metadata || {},
        },
      });
      logger.info('User profile created', { tenantId, userId });
    }

    return profile;
  } catch (error) {
    logger.error('Get or create user profile error', {
      error: error.message,
      tenantId,
      userId,
      stack: error.stack,
    });
    throw new Error(`User profile management failed: ${error.message}`);
  }
}

/**
 * Get user profile
 * @param {string} userId - User identifier
 * @returns {Promise<Object|null>} User profile or null
 */
export async function getUserProfile(userId) {
  try {
    const prisma = await getPrismaClient();

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    return profile;
  } catch (error) {
    logger.error('Get user profile error', {
      error: error.message,
      userId,
      stack: error.stack,
    });
    throw new Error(`Get user profile failed: ${error.message}`);
  }
}

/**
 * Update user profile
 * @param {string} userId - User identifier
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated user profile
 */
export async function updateUserProfile(userId, updateData) {
  try {
    const prisma = await getPrismaClient();

    const profile = await prisma.userProfile.update({
      where: { userId },
      data: updateData,
    });

    logger.info('User profile updated', { userId });
    return profile;
  } catch (error) {
    logger.error('Update user profile error', {
      error: error.message,
      userId,
      stack: error.stack,
    });
    throw new Error(`Update user profile failed: ${error.message}`);
  }
}

/**
 * Update learning progress
 * @param {string} userId - User identifier
 * @param {Object} progress - Progress data to merge
 * @returns {Promise<Object>} Updated user profile
 */
export async function updateLearningProgress(userId, progress) {
  try {
    // Get current profile
    const currentProfile = await getUserProfile(userId);
    if (!currentProfile) {
      throw new Error(`User profile not found: ${userId}`);
    }

    // Merge progress data
    const updatedProgress = {
      ...(currentProfile.learningProgress || {}),
      ...progress,
    };

    return await updateUserProfile(userId, {
      learningProgress: updatedProgress,
    });
  } catch (error) {
    logger.error('Update learning progress error', {
      error: error.message,
      userId,
      stack: error.stack,
    });
    throw new Error(`Update learning progress failed: ${error.message}`);
  }
}

/**
 * Get user skill gaps
 * @param {string} tenantId - Tenant identifier
 * @param {string} userId - User identifier
 * @returns {Promise<Array<string>>} Array of skill gaps
 */
export async function getUserSkillGaps(tenantId, userId) {
  try {
    const profile = await getUserProfile(userId);
    if (!profile) {
      return [];
    }

    // Return skill gaps as array
    if (Array.isArray(profile.skillGaps)) {
      return profile.skillGaps;
    }

    return [];
  } catch (error) {
    logger.error('Get user skill gaps error', {
      error: error.message,
      tenantId,
      userId,
      stack: error.stack,
    });
    return [];
  }
}
