/**
 * Recommendations Service
 * Generates personalized recommendations based on user profile, query history, and context
 */

import { getPrismaClient } from '../config/database.config.js';
import { logger } from '../utils/logger.util.js';
import { getUserProfile, getUserSkillGaps } from './userProfile.service.js';
import { getOrCreateTenant } from './tenant.service.js';
import { fetchLearningRecommendations } from '../clients/aiLearner.client.js';

/**
 * Generate personalized recommendations for a user
 * @param {string} tenantId - Tenant identifier
 * @param {string} userId - User identifier
 * @param {Object} options - Options for recommendations
 * @param {number} options.limit - Maximum number of recommendations (default: 5)
 * @param {string} options.mode - Chat mode (general, assessment, devlab)
 * @param {Array} options.recentQueries - Recent query history (optional)
 * @returns {Promise<Array>} Array of recommendation objects
 */
export async function generatePersonalizedRecommendations(
  tenantId,
  userId,
  options = {}
) {
  const { limit = 5, mode = 'general', recentQueries = [] } = options;

  try {
    const prisma = await getPrismaClient();

    // Get user profile
    const userProfile = await getUserProfile(userId);
    const skillGaps = userProfile
      ? await getUserSkillGaps(tenantId, userId)
      : [];

    // Get recent queries if not provided
    let queries = recentQueries;
    if (queries.length === 0 && userId && userId !== 'anonymous') {
      queries = await prisma.query.findMany({
        where: {
          tenantId,
          userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
        include: {
          sources: true,
        },
      });
    }

    // Get popular content based on query sources
    const popularContent = await getPopularContent(tenantId, queries);

    // Fetch learning recommendations from AI LEARNER microservice (for General mode)
    let aiLearnerRecommendations = [];
    if (mode === 'general' && userId && userId !== 'anonymous') {
      try {
        aiLearnerRecommendations = await fetchLearningRecommendations(userId, tenantId, {
          limit: limit,
          skillGaps,
          recentQueries: queries,
        });
        logger.info('Fetched AI LEARNER recommendations', {
          userId,
          tenantId,
          count: aiLearnerRecommendations.length,
        });
      } catch (error) {
        logger.warn('Failed to fetch AI LEARNER recommendations', {
          error: error.message,
          userId,
          tenantId,
        });
        // Continue without AI LEARNER recommendations
      }
    }

    // Generate recommendations based on mode
    let recommendations = [];

    if (mode === 'assessment' || mode === 'ASSESSMENT_SUPPORT') {
      recommendations = generateAssessmentRecommendations(
        userProfile,
        skillGaps,
        queries,
        limit
      );
    } else if (mode === 'devlab' || mode === 'DEVLAB_SUPPORT') {
      recommendations = generateDevLabRecommendations(
        userProfile,
        skillGaps,
        queries,
        limit
      );
    } else {
      // General mode - prioritize AI LEARNER recommendations, then add other recommendations
      if (aiLearnerRecommendations.length > 0) {
        // Use AI LEARNER recommendations as primary source
        recommendations = aiLearnerRecommendations.slice(0, limit);
      } else {
        // Fallback to general recommendations if AI LEARNER not available
        recommendations = generateGeneralRecommendations(
          userProfile,
          skillGaps,
          queries,
          popularContent,
          limit
        );
      }
    }

    logger.info('Generated personalized recommendations', {
      tenantId,
      userId,
      mode,
      count: recommendations.length,
    });

    return recommendations;
  } catch (error) {
    logger.error('Generate recommendations error', {
      error: error.message,
      tenantId,
      userId,
      stack: error.stack,
    });

    // Return fallback recommendations on error
    return generateFallbackRecommendations(mode, limit);
  }
}

/**
 * Generate general mode recommendations
 * @private
 */
function generateGeneralRecommendations(
  userProfile,
  skillGaps,
  queries,
  popularContent,
  limit
) {
  const recommendations = [];

  // 1. Skill gap recommendations
  if (skillGaps.length > 0) {
    skillGaps.slice(0, 2).forEach((skill, index) => {
      recommendations.push({
        id: `skill-gap-${index}`,
        type: 'button',
        label: `Learn ${skill}`,
        description: `Improve your ${skill} skills`,
        reason: 'Based on your skill gaps',
        priority: 10 - index,
        metadata: { skill, source: 'skill_gap' },
      });
    });
  }

  // 2. Popular content recommendations
  if (popularContent.length > 0) {
    popularContent.slice(0, 2).forEach((content, index) => {
      recommendations.push({
        id: `popular-${index}`,
        type: 'card',
        label: content.title || 'Popular Content',
        description: content.description || 'Recommended for you',
        reason: 'Frequently accessed by users',
        priority: 8 - index,
        metadata: {
          contentId: content.contentId,
          contentType: content.contentType,
          source: 'popular_content',
        },
      });
    });
  }

  // 3. Based on recent queries
  if (queries.length > 0) {
    const recentTopics = extractTopicsFromQueries(queries);
    recentTopics.slice(0, 1).forEach((topic, index) => {
      recommendations.push({
        id: `topic-${index}`,
        type: 'button',
        label: `Explore ${topic}`,
        description: `Continue learning about ${topic}`,
        reason: 'Based on your recent queries',
        priority: 6,
        metadata: { topic, source: 'query_history' },
      });
    });
  }

  // 4. Default recommendations (if not enough) - NO Get Started Guide
  if (recommendations.length < 2) {
    recommendations.push({
      id: 'default-1',
      type: 'button',
      label: 'Live Chat',
      description: 'Get help from our support team',
      reason: 'Support',
      priority: 4,
      metadata: { source: 'default' },
    });
  }

  // Sort by priority and limit
  return recommendations
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}

/**
 * Generate Assessment mode recommendations
 * @private
 */
function generateAssessmentRecommendations(
  userProfile,
  skillGaps,
  queries,
  limit
) {
  const recommendations = [
    {
      id: 'assess-1',
      type: 'card',
      label: 'Assessment Troubleshooting',
      description: 'Fix issues related to exams, scoring, and question banks.',
      reason: 'Assessment support',
      priority: 10,
      metadata: { source: 'assessment_support' },
    },
    {
      id: 'assess-2',
      type: 'card',
      label: 'Create New Test',
      description: 'Start a new exam configuration.',
      reason: 'Assessment support',
      priority: 9,
      metadata: { source: 'assessment_support' },
    },
  ];

  // Add skill-based recommendations if available
  if (skillGaps.length > 0) {
    skillGaps.slice(0, 1).forEach((skill) => {
      recommendations.push({
        id: `assess-skill-${skill}`,
        type: 'button',
        label: `Practice ${skill} Assessment`,
        description: `Test your ${skill} knowledge`,
        reason: 'Based on your skill gaps',
        priority: 8,
        metadata: { skill, source: 'skill_gap' },
      });
    });
  }

  return recommendations.slice(0, limit);
}

/**
 * Generate DevLab mode recommendations
 * @private
 */
function generateDevLabRecommendations(
  userProfile,
  skillGaps,
  queries,
  limit
) {
  const recommendations = [
    {
      id: 'devlab-1',
      type: 'card',
      label: 'Debug Sandbox Error',
      description: 'Resolve execution and runtime environment issues.',
      reason: 'DevLab support',
      priority: 10,
      metadata: { source: 'devlab_support' },
    },
    {
      id: 'devlab-2',
      type: 'card',
      label: 'Review Student Submission',
      description: 'Analyze and troubleshoot submitted code.',
      reason: 'DevLab support',
      priority: 9,
      metadata: { source: 'devlab_support' },
    },
  ];

  // Add skill-based recommendations if available
  if (skillGaps.length > 0) {
    skillGaps.slice(0, 1).forEach((skill) => {
      recommendations.push({
        id: `devlab-skill-${skill}`,
        type: 'button',
        label: `Practice ${skill} Coding`,
        description: `Improve your ${skill} programming skills`,
        reason: 'Based on your skill gaps',
        priority: 8,
        metadata: { skill, source: 'skill_gap' },
      });
    });
  }

  return recommendations.slice(0, limit);
}

/**
 * Get popular content based on query sources
 * @private
 */
async function getPopularContent(tenantId, queries) {
  try {
    const prisma = await getPrismaClient();

    // Extract content IDs from query sources
    const contentIds = queries
      .flatMap((q) => q.sources || [])
      .map((s) => s.sourceId)
      .filter(Boolean);

    if (contentIds.length === 0) {
      return [];
    }

    // Count occurrences
    const contentCount = {};
    contentIds.forEach((id) => {
      contentCount[id] = (contentCount[id] || 0) + 1;
    });

    // Get top content
    const topContentIds = Object.entries(contentCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);

    // Get content details from vector embeddings
    const embeddings = await prisma.vectorEmbedding.findMany({
      where: {
        tenantId,
        contentId: { in: topContentIds },
      },
      select: {
        contentId: true,
        contentType: true,
        contentText: true,
        metadata: true,
      },
      take: 5,
    });

    return embeddings.map((emb) => ({
      contentId: emb.contentId,
      contentType: emb.contentType,
      title: emb.metadata?.title || `${emb.contentType}:${emb.contentId}`,
      description: emb.contentText.substring(0, 100),
    }));
  } catch (error) {
    logger.warn('Get popular content error', { error: error.message });
    return [];
  }
}

/**
 * Extract topics from queries
 * @private
 */
function extractTopicsFromQueries(queries) {
  // Simple topic extraction - can be enhanced with NLP
  const topics = new Set();

  queries.forEach((query) => {
    const text = query.queryText || '';
    // Extract keywords (simple approach)
    const words = text
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .slice(0, 3);

    words.forEach((word) => topics.add(word));
  });

  return Array.from(topics).slice(0, 3);
}

/**
 * Generate fallback recommendations
 * @private
 */
function generateFallbackRecommendations(mode, limit) {
  if (mode === 'assessment' || mode === 'ASSESSMENT_SUPPORT') {
    return [
      {
        id: 'fallback-assess-1',
        type: 'card',
        label: 'Assessment Troubleshooting',
        description: 'Fix issues related to exams and scoring.',
        priority: 5,
        metadata: { source: 'fallback' },
      },
    ];
  }

  if (mode === 'devlab' || mode === 'DEVLAB_SUPPORT') {
    return [
      {
        id: 'fallback-devlab-1',
        type: 'card',
        label: 'Debug Sandbox Error',
        description: 'Resolve execution issues.',
        priority: 5,
        metadata: { source: 'fallback' },
      },
    ];
  }

  // General fallback - NO Get Started Guide
  return [
    {
      id: 'fallback-1',
      type: 'button',
      label: 'Live Chat',
      priority: 4,
      metadata: { source: 'fallback' },
    },
  ].slice(0, limit);
}

