/**
 * Query Processing Service
 * Handles RAG query processing with OpenAI integration
 */

import { openai } from '../config/openai.config.js';
import { logger } from '../utils/logger.util.js';
import { getRedis, isRedisAvailable } from '../config/redis.config.js';
import { getPrismaClient } from '../config/database.config.js';
import { unifiedVectorSearch } from './unifiedVectorSearch.service.js';
import { getOrCreateTenant } from './tenant.service.js';
import { getOrCreateUserProfile, getUserSkillGaps } from './userProfile.service.js';
import { isEducoreQuery } from '../utils/query-classifier.util.js';
import { grpcFetchByCategory } from './grpcFallback.service.js';
import { mergeResults } from '../communication/routingEngine.service.js';
import { generatePersonalizedRecommendations } from './recommendations.service.js';
import { validateAndFixTenantId, getCorrectTenantId } from '../utils/tenant-validation.util.js';
import { MESSAGES } from '../config/messages.js';
import { formatBotResponse, formatErrorMessage, formatRecommendations } from '../utils/responseFormatter.util.js';
import {
  findRelatedNodes,
  boostResultsByKG,
  getUserLearningContext,
  expandResultsWithKG
} from './knowledgeGraph.service.js';
import { KG_CONFIG } from '../config/knowledgeGraph.config.js';
import { addMessageToConversation, getConversationHistory } from './conversationCache.service.js';
// Handler integration imports
import realtimeHandler from '../handlers/realtimeHandler.js';
import schemaLoader from '../core/schemaLoader.js';
import responseBuilder from '../core/responseBuilder.js';

/**
 * Generate a context-aware "no data" message based on filtering context
 * @param {string} userQuery - The user's query
 * @param {Object} filteringContext - Filtering context with reason, counts, etc.
 * @returns {string} Appropriate error message
 */
/**
 * Generate appropriate error message based on filtering context
 * @param {string} userQuery - The user's query
 * @param {Object} filteringContext - Context about why no results were returned
 * @returns {string} Appropriate error message
 */
function generateNoResultsMessage(userQuery, filteringContext) {
  // Escape the query to prevent JSON issues with quotes and special characters
  const query = String(userQuery || '').trim();
  const safeQuery = query.replace(/"/g, "'"); // Replace double quotes with single quotes
  const reason = filteringContext?.reason || 'NO_DATA';
  const userRole = filteringContext?.userRole || 'anonymous';
  const isAuthenticated = filteringContext?.isAuthenticated || false;
  const userProfilesFound = filteringContext?.userProfilesFound || 0;
  const userProfilesRemoved = filteringContext?.userProfilesRemoved || 0;
  
  
  
  switch(reason) {
    case 'NO_PERMISSION':
    case 'RBAC_BLOCKED_USER_PROFILES':
      // 🔐 SECURITY: User asked about a specific user profile and it was blocked
      // Use role-specific messages from configuration
      
      if (!isAuthenticated || userRole === 'anonymous' || userRole === 'guest') {
        // User is not authenticated - needs to log in
        return MESSAGES.rbac.noAuth(safeQuery);
        
      } else if (userRole === 'employee' || userRole === 'user') {
        // Employee is authenticated but doesn't have permission
        return MESSAGES.rbac.noPermissionEmployee(safeQuery, userRole);
        
      } else if (userRole === 'manager' || userRole === 'hr' || userRole === 'trainer') {
        // Manager/HR/Trainer with some permissions but not for this query
        return MESSAGES.rbac.noPermissionManager(safeQuery, userRole);
        
      } else if (userRole === 'admin' || userRole === 'administrator') {
        // Admin should have access - this might be a configuration issue
        return `I found information about "${safeQuery}", but there may be a configuration issue with access permissions. Please check RBAC settings for admin role.`;
        
      } else {
        // Unknown role
        return MESSAGES.rbac.noPermissionGeneral(safeQuery, userRole);
      }
    
    case 'RBAC_BLOCKED_ALL':
      // All results were blocked by RBAC
      if (!isAuthenticated || userRole === 'anonymous' || userRole === 'guest') {
        return `The information you're looking for requires authentication. Please log in to continue.`;
      } else {
        return MESSAGES.rbac.noPermissionGeneral(safeQuery, userRole);
      }
    
    case 'PARTIAL_RBAC_BLOCK':
      // Some results were blocked but others remain - this shouldn't generate a message
      // The remaining results should be returned normally
      return null; // Don't generate error message for partial blocks
    
    case 'LOW_SIMILARITY':
      return MESSAGES.lowSimilarity(safeQuery);
    
    case 'NO_DATA':
    default:
      // Truly no data in database - only use generic messages for actual no-data scenarios
      if (userProfilesFound > 0 && userProfilesRemoved > 0) {
        // Data exists but was filtered - this shouldn't happen with proper reason setting
        // Fallback to permission message based on authentication status
        if (!isAuthenticated || userRole === 'anonymous') {
          return MESSAGES.rbac.noAuth(safeQuery);
        } else {
          return MESSAGES.rbac.noPermissionEmployee(safeQuery, userRole);
        }
      }
      
      // Truly no data in database - use random template from configuration
      return MESSAGES.noData.getRandom(safeQuery);
  }
}

/**
 * Process a query using RAG (Retrieval-Augmented Generation)
 * @param {Object} params - Query parameters
 * @param {string} params.query - User's natural language question
 * @param {string} params.tenant_id - Tenant identifier
 * @param {Object} params.context - Query context (user_id, session_id)
 * @param {Object} params.options - Query options (max_results, min_confidence, include_metadata)
 * @param {string} params.conversation_id - Optional conversation identifier for multi-turn conversations
 * @returns {Promise<Object>} Query response with answer, sources, confidence, metadata, conversation_id
 */
export async function processQuery({ query, tenant_id, context = {}, options = {}, conversation_id = null }) {
  const startTime = Date.now();
  const { user_id, session_id } = context;
  const {
    max_results = 5,
    min_confidence = 0.25,
  } = options;

  let queryRecord = null;

  // CRITICAL: Log entry point for debugging
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 [PROCESS QUERY SERVICE] Entry point');
  console.log('🔍 Query:', query);
  console.log('🔍 Tenant ID:', tenant_id);
  console.log('🔍 User ID:', user_id);
  console.log('🔍 Context:', JSON.stringify(context, null, 2));
  console.log('🔍 Options:', JSON.stringify(options, null, 2));
  console.log('🔍 Conversation ID:', conversation_id);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // CRITICAL: Validate and fix tenant_id FIRST
    // This ensures we never use the wrong tenant ID
    let validatedTenantId = tenant_id;
    if (!validatedTenantId || validatedTenantId === 'default.local') {
      // If tenant_id is 'default.local' or empty, resolve to correct tenant
      validatedTenantId = getCorrectTenantId();
    } else {
      // Validate and auto-correct any wrong tenant IDs
      validatedTenantId = validateAndFixTenantId(validatedTenantId);
    }
    
    
    // Get or create tenant (use validated tenant ID or domain)
    // If validatedTenantId is a UUID, getOrCreateTenant will handle it
    // If it's a domain, it will map to the correct tenant
    const tenantDomain = tenant_id || 'default.local';
    let tenant = await getOrCreateTenant(validatedTenantId);
    let actualTenantId = tenant.id;
    
    // DOUBLE-CHECK: Ensure we're using the correct tenant ID
    if (actualTenantId === '2fbb2ecb-2b41-43c9-8010-3fe9d3df6bb1') {
      logger.error('❌ CRITICAL: Wrong tenant ID detected after resolution!', {
        wrong_tenant: actualTenantId,
        correct_tenant: getCorrectTenantId(),
        requested: tenant_id,
        validated: validatedTenantId,
      });
      // Try to get correct tenant
      const correctTenant = await getOrCreateTenant(getCorrectTenantId());
      if (correctTenant && correctTenant.id !== actualTenantId) {
        logger.warn('Found correct tenant, using that instead', {
          wrong_tenant: actualTenantId,
          correct_tenant: correctTenant.id,
        });
        // Use correct tenant
        tenant = correctTenant;
        actualTenantId = correctTenant.id;
      }
    }
    
    // Verify tenant has embeddings (for diagnostic purposes)
    let tenantEmbeddingCount = 0;
    try {
      const prisma = await getPrismaClient();
      const countResult = await prisma.$queryRaw`
        SELECT COUNT(*)::int as count FROM vector_embeddings WHERE tenant_id = ${actualTenantId}
      `.catch(() => [{ count: 0 }]);
      tenantEmbeddingCount = countResult[0]?.count || 0;
    } catch (error) {
      logger.debug('Could not check tenant embedding count', { error: error.message });
    }
    
    logger.info('Tenant resolved', {
      tenant_domain: tenantDomain,
      tenant_id: actualTenantId,
      requested_tenant_id: tenant_id,
      embeddings_count: tenantEmbeddingCount,
      recommendation: tenantEmbeddingCount === 0 
        ? 'No embeddings found for this tenant. Run embeddings script or check tenant_id.' 
        : `${tenantEmbeddingCount} embeddings available for this tenant.`,
    });

    // Get or create user profile
    // Pass context.role if provided to set correct role in profile
    let userProfile = null;
    
    if (user_id && user_id !== 'anonymous') {
      try {
        const defaultRole = context?.role || undefined; // Use context.role if provided
        userProfile = await getOrCreateUserProfile(actualTenantId, user_id, {
          role: defaultRole
        });
        // Override profile role with context.role if provided (for this request only)
        if (context?.role) {
          userProfile = { ...userProfile, role: context.role };
          logger.info('Using context.role for userProfile override', {
            userId: user_id,
            contextRole: context.role,
            profileRole: userProfile.role
          });
        }
      } catch (profileError) {
        logger.warn('Failed to get user profile, continuing without personalization', {
          error: profileError.message,
        });
      }
    }

    // Check cache first (if Redis is available)
    if (isRedisAvailable()) {
      try {
        const redis = getRedis();
        const cacheKey = `query:${actualTenantId}:${user_id}:${Buffer.from(query).toString('base64')}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
          logger.info('Query cache hit', { query, tenant_id: actualTenantId, user_id });
          const cachedResponse = JSON.parse(cached);
          
          // Still save query to database for analytics
          await saveQueryToDatabase({
            tenantId: actualTenantId,
            userId: user_id || 'anonymous',
            sessionId: session_id,
            queryText: query,
            answer: cachedResponse.answer,
            confidenceScore: cachedResponse.confidence,
            processingTimeMs: cachedResponse.metadata?.processing_time_ms || 0,
            modelVersion: cachedResponse.metadata?.model_version || 'gpt-3.5-turbo',
            isPersonalized: false,
            isCached: true,
            sources: cachedResponse.sources || [],
            recommendations: [],
          });

          return {
            ...cachedResponse,
            metadata: {
              ...cachedResponse.metadata,
              cached: true,
            },
          };
        }
      } catch (cacheError) {
        // Redis error - continue without cache
        logger.debug('Redis cache check failed, continuing without cache:', cacheError.message);
      }
    }

    // 1) QUERY CLASSIFICATION
    let { isEducore, category } = isEducoreQuery(query);
    
    // If query contains user names but wasn't classified as EDUCORE, treat it as EDUCORE
    const hasUserNames = ['eden', 'levi', 'adi', 'cohen', 'noa', 'bar', 'עדן', 'לוי', 'עדי', 'כהן', 'נועה', 'בר']
      .some(name => query.toLowerCase().includes(name));
    
    if (!isEducore && hasUserNames) {
      logger.info('Query contains user names, treating as EDUCORE query', {
        query: query ? query.substring(0, 100) : 'N/A',
      });
      isEducore = true;
      category = 'users';
    }
    
    logger.info('Query classification result', {
      tenant_id: actualTenantId,
      user_id,
      isEducore,
      category,
      hasUserNames,
    });

    // Non-EDUCORE queries → go straight to OpenAI (general knowledge)
    if (!isEducore) {
      logger.info('Routing query to general OpenAI (non-EDUCORE)', {
        tenant_id: actualTenantId,
        user_id,
        conversation_id,
      });

      // Load conversation history if conversation_id is provided
      let conversationHistory = [];
      if (conversation_id) {
        try {
          conversationHistory = await getConversationHistory(conversation_id, 10);
          logger.info('Loaded conversation history for non-EDUCORE query', {
            conversation_id,
            historyCount: conversationHistory.length,
          });
        } catch (historyError) {
          logger.warn('Failed to load conversation history, continuing without it', {
            error: historyError.message,
            conversation_id,
          });
          conversationHistory = [];
        }
      }

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a friendly assistant. Provide a concise, helpful answer.' },
          ...conversationHistory, // Include conversation history
          { role: 'user', content: query },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const rawAnswer = completion.choices[0]?.message?.content || '';
      const answer = formatBotResponse(rawAnswer, { mode: 'general_openai' });
      const processingTimeMs = Date.now() - startTime;

      // Save messages to conversation history if conversation_id is provided
      if (conversation_id) {
        try {
          await addMessageToConversation(conversation_id, 'user', query);
          await addMessageToConversation(conversation_id, 'assistant', answer);
          logger.info('Saved messages to conversation history (non-EDUCORE)', {
            conversation_id,
          });
        } catch (saveError) {
          logger.warn('Failed to save conversation history, continuing without it', {
            error: saveError.message,
            conversation_id,
          });
        }
      }

      return {
        answer,
        abstained: false,
        confidence: 1,
        sources: [],
        conversation_id,
        metadata: {
          processing_time_ms: processingTimeMs,
          sources_retrieved: 0,
          cached: false,
          model_version: 'gpt-3.5-turbo',
          personalized: !!userProfile,
          mode: 'general_openai',
          conversation_enabled: !!conversation_id,
        },
      };
    }

    // 2) RAG LOOKUP (EDUCORE queries only)
    // Translate query to English for better matching with English content in database
    // OpenAI embeddings work cross-lingual, but translating helps when content is in English
    let queryForEmbedding = query;
    let translatedQuery = null;
    
    
    try {
      // Detect if query contains Hebrew characters
      const hasHebrew = /[\u0590-\u05FF]/.test(query);
      
      if (hasHebrew) {
        logger.info('Detected Hebrew in query, translating to English for better vector matching', {
          original_query: query ? query.substring(0, 100) : 'N/A',
        });
        
        
        // Translate to English using OpenAI
        const translationResponse = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { 
              role: 'system', 
              content: 'You are a translation assistant. Translate the user query to English. Only return the translation, nothing else. If the query is already in English, return it as-is.' 
            },
            { role: 'user', content: query },
          ],
          temperature: 0.3,
          max_tokens: 100,
        });
        
        translatedQuery = translationResponse.choices[0]?.message?.content?.trim() || query;
        queryForEmbedding = translatedQuery;
        
        
        logger.info('Query translated', {
          original: query ? query.substring(0, 100) : 'N/A',
          translated: translatedQuery ? translatedQuery.substring(0, 100) : 'N/A',
        });
      }
      // Translation not needed, using original query
    } catch (translationError) {
      
      logger.warn('Translation failed, using original query', {
        error: translationError.message,
      });
      // Continue with original query if translation fails
    }
    
    

    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: queryForEmbedding, // Use translated query for embedding
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;


    // Vector similarity search in PostgreSQL (pgvector)
    let sources = [];
    let retrievedContext = '';
    let confidence = min_confidence;
    let similarVectors = []; // Initialize outside try block to avoid "not defined" error
    let kgRelations = []; // Initialize KG relations outside try block
    const userLearningContext = null; // Initialize user learning context outside try block
    
    // 🎯 Filtering Context Tracking
    // Use context.role as priority, then userProfile.role, then anonymous
    // Initialize with context.role if provided (highest priority)
    const filteringContext = {
      vectorResultsFound: 0,
      afterThreshold: 0,
      afterRBAC: 0,
      userProfilesFound: 0,
      userProfilesRemoved: 0,
      reason: null, // 'NO_DATA', 'LOW_SIMILARITY', 'NO_PERMISSION', 'RBAC_BLOCKED_USER_PROFILES', 'RBAC_BLOCKED_ALL', 'SUCCESS'
      threshold: min_confidence,
      userRole: context?.role || userProfile?.role || 'anonymous', // context.role has highest priority
      isAuthenticated: user_id && user_id !== 'anonymous' && user_id !== 'guest',
    };
    
    // Ensure context.role takes priority (update if userProfile was loaded with different role)
    if (context?.role) {
      filteringContext.userRole = context.role;
      logger.info('Setting filteringContext.userRole from context.role', {
        contextRole: context.role,
        profileRole: userProfile?.role,
        userId: user_id
      });
    } else if (userProfile?.role && !filteringContext.userRole) {
      // Fall back to userProfile.role if context.role not provided
      filteringContext.userRole = userProfile.role;
    }

    try {
      logger.info('Starting vector search', {
        tenant_id: actualTenantId,
        query_for_embedding: queryForEmbedding ? queryForEmbedding.substring(0, 100) : 'N/A',
        threshold: min_confidence,
        limit: max_results,
        embedding_dimensions: queryEmbedding?.length || 0,
      });
      
      
      // Use unified vector search service
      // Run vector search and user context in parallel for better performance
      const [vectorSearchResults, userLearningContext] = await Promise.all([
        unifiedVectorSearch(queryEmbedding, actualTenantId, {
          limit: max_results,
          threshold: min_confidence,
        }),
        user_id && user_id !== 'anonymous' && user_id !== 'guest' && KG_CONFIG.FEATURES.USER_PERSONALIZATION
          ? getUserLearningContext(actualTenantId, user_id).catch(error => {
              logger.warn('Failed to get user learning context, continuing without personalization', {
                error: error.message
              });
              return null;
            })
          : Promise.resolve(null)
      ]);

      similarVectors = vectorSearchResults;
      
      // Track initial results
      filteringContext.vectorResultsFound = similarVectors.length;
      filteringContext.userProfilesFound = similarVectors.filter(v => v.contentType === 'user_profile').length;
      
      
      // Track vectors before any filtering
      filteringContext.afterThreshold = similarVectors.length;
      
      // Determine initial filtering reason
      if (similarVectors.length === 0) {
        filteringContext.reason = 'NO_DATA';
      } else {
        // Check if results are below threshold (all similarities below min_confidence)
        const allBelowThreshold = similarVectors.every(v => v.similarity < min_confidence);
        if (allBelowThreshold) {
          filteringContext.reason = 'LOW_SIMILARITY';
        }
      }
      
      logger.info('Vector search returned', {
        tenant_id: actualTenantId,
        tenant_domain: tenantDomain,
        vectors_found: similarVectors.length,
        content_types: similarVectors.map(v => v.contentType),
        content_ids: similarVectors.map(v => v.contentId),
        top_similarities: similarVectors.slice(0, 3).map(v => v.similarity),
        threshold_used: min_confidence,
        query_for_embedding: queryForEmbedding ? queryForEmbedding.substring(0, 100) : 'N/A',
        embedding_dimensions: queryEmbedding?.length || 0,
        filtering_reason: filteringContext.reason,
      });

      // ========================================
      // KNOWLEDGE GRAPH ENHANCEMENT
      // ========================================
      if (similarVectors && similarVectors.length > 0 && KG_CONFIG.FEATURES.KG_TRAVERSAL) {
        try {
          // Step 1: User learning context already retrieved in parallel above
          if (userLearningContext) {
            logger.info('Retrieved user learning context', {
              userId: user_id,
              skillCount: userLearningContext.skills?.length || 0
            });
          }

          // Step 2: Find related nodes in KG
          const contentIds = similarVectors
            .map(v => v.contentId)
            .filter(Boolean);

          if (contentIds.length > 0 && KG_CONFIG.FEATURES.KG_TRAVERSAL) {
            kgRelations = await findRelatedNodes(
              actualTenantId,
              contentIds,
              KG_CONFIG.EDGE_TYPES,
              KG_CONFIG.MAX_TRAVERSAL_DEPTH
            );
            
            logger.info('KG relations found', {
              contentCount: contentIds.length,
              relationsCount: kgRelations.length
            });
          }

          // Step 3: Boost results based on KG relationships
          if (kgRelations.length > 0 && KG_CONFIG.FEATURES.RESULT_BOOSTING) {
            similarVectors = await boostResultsByKG(similarVectors, kgRelations, KG_CONFIG.BOOST_WEIGHTS);
            
            logger.info('Applied KG boosting to results', {
              boostedCount: similarVectors.filter(v => v.kgBoost > 0).length
            });
          }

          // Step 4: Expand results with KG-discovered content
          if (kgRelations.length > 0 && KG_CONFIG.FEATURES.QUERY_EXPANSION) {
            similarVectors = await expandResultsWithKG(
              similarVectors,
              actualTenantId,
              queryEmbedding
            );
            
            logger.info('Expanded results using KG', {
              finalCount: similarVectors.length
            });
          }

          // Step 5: Apply user personalization (if user context exists)
          if (userLearningContext && 
              userLearningContext.relevantContentIds?.length > 0 && 
              KG_CONFIG.FEATURES.USER_PERSONALIZATION) {
            similarVectors = similarVectors.map(result => {
              const isRelevantToUser = userLearningContext.relevantContentIds.includes(result.contentId);
              return {
                ...result,
                similarity: isRelevantToUser 
                  ? Math.min(1.0, result.similarity + KG_CONFIG.USER_RELEVANCE_BOOST)
                  : result.similarity,
                userRelevant: isRelevantToUser
              };
            });
            
            // Re-sort after personalization
            similarVectors.sort((a, b) => b.similarity - a.similarity);
            
            logger.info('Applied user personalization', {
              relevantCount: similarVectors.filter(v => v.userRelevant).length
            });
          }

        } catch (kgError) {
          logger.warn('KG enhancement failed, continuing with vector results only', {
            error: kgError.message,
            stack: kgError.stack
          });
          // Don't fail the entire query if KG fails - graceful degradation
          kgRelations = [];
        }
      }

      // Enforce role-based permission on user profiles:
      // - Admins: Can access all user profiles
      // - Non-admins: Can ONLY access user profiles when querying about SPECIFIC users by name
      // - This maintains privacy while allowing specific user lookups
      
      
      const queryLower = query.toLowerCase();
      const translatedLower = translatedQuery?.toLowerCase() || '';
      const queryForCheck = queryForEmbedding.toLowerCase();
      
      // Check for specific user names in query (English and Hebrew)
      const specificUserNamePatterns = [
        'eden', 'levi', 'adi', 'cohen', 'noa', 'bar',  // Known user names
        'עדן', 'לוי', 'עדי', 'כהן', 'נועה', 'בר',  // Hebrew names
      ];
      
      // Check if query contains any specific user name
      const hasSpecificUserName = specificUserNamePatterns.some(name => 
        queryLower.includes(name) || 
        translatedLower.includes(name) ||
        queryForCheck.includes(name)
      );
      
      
      // Find which name matched
      const matchedName = specificUserNamePatterns.find(name => 
        queryLower.includes(name) || 
        translatedLower.includes(name) ||
        queryForCheck.includes(name)
      );
      
      // Check if query is asking about a user (role, who is, what is, etc.)
      const hasUserQueryPattern = (
        queryLower.includes('תפקיד') ||  // Hebrew: role
        queryLower.includes('מה התפקיד') ||  // Hebrew: what is the role
        queryLower.includes('מי זה') ||  // Hebrew: who is
        translatedLower.includes('role') ||
        translatedLower.includes('what is') ||
        translatedLower.includes("what's") ||
        translatedLower.includes('who is') ||
        translatedLower.includes("who's") ||
        queryForCheck.includes('role') ||
        queryForCheck.includes('what is') ||
        queryForCheck.includes("what's") ||
        queryForCheck.includes('who is') ||
        queryForCheck.includes("who's")
      );
      
      // 🔑 Check user role source
      // Priority: context.role (from header/body) > userProfile.role (from DB) > anonymous
      // This allows overriding DB role with explicit header/context role
      // Use filteringContext.userRole if it was set (from context.role), otherwise fall back
      const userRole = filteringContext.userRole || context?.role || userProfile?.role || 'anonymous';
      
      logger.info('RBAC: User role determination', {
        contextRole: context?.role,
        profileRole: userProfile?.role,
        filteringContextRole: filteringContext.userRole,
        finalUserRole: userRole,
        userId: user_id
      });
      
      
      // 🔐 SECURITY: Check authentication and authorization levels
      const isAuthenticated = user_id && user_id !== 'anonymous' && user_id !== 'guest';
      const isAdmin = userRole === 'admin' || userRole === 'administrator';
      const isManager = userRole === 'manager';
      const isEmployee = userRole === 'employee' || userRole === 'user' || userRole === 'learner';
      const isTrainer = userRole === 'trainer' || userRole === 'TRAINER';
      const isHR = userRole === 'hr' || userRole === 'HR' || userRole === 'human_resources';
      
      // Check if query is about the user's own profile
      const isQueryAboutOwnProfile = (() => {
        if (!isAuthenticated || !userProfile) return false;
        
        const queryLower = query.toLowerCase();
        const translatedLower = translatedQuery?.toLowerCase() || '';
        const queryForCheck = queryForEmbedding.toLowerCase();
        
        // Get user's name from profile (if available)
        const userName = userProfile?.name || userProfile?.fullName || '';
        const userNameLower = userName ? userName.toLowerCase() : '';
        
        // Check if query mentions user's own name
        const mentionsOwnName = userNameLower && (
          queryLower.includes(userNameLower) ||
          translatedLower.includes(userNameLower) ||
          queryForCheck.includes(userNameLower)
        );
        
        // Check for "my" queries
        const isMyQuery = queryLower.includes('my role') ||
                         queryLower.includes('my profile') ||
                         queryLower.includes('about me') ||
                         queryLower.includes('מה התפקיד שלי') ||
                         queryLower.includes('מי אני');
        
        return mentionsOwnName || isMyQuery;
      })();
      
      
      /**
       * 🔐 SECURE RBAC LOGIC for User Profile Access:
       * 
       * 1. ADMIN/ADMINISTRATOR:
       *    - Can access ALL user profiles
       *    - No restrictions
       * 
       * 2. HR (Human Resources):
       *    - Can access ALL user profiles
       *    - Required for employee management
       * 
       * 3. TRAINER:
       *    - Can access user profiles when explicitly asked about specific users
       *    - Can view profiles of trainees/students
       *    - Cannot browse all users
       * 
       * 4. MANAGER:
       *    - Can access user profiles when explicitly asked about specific users
       *    - Can view profiles of team members
       *    - Cannot browse all users
       * 
       * 5. EMPLOYEE/USER/LEARNER:
       *    - Can ONLY access their OWN profile
       *    - Cannot view other employees' profiles
       * 
       * 6. ANONYMOUS/GUEST/UNAUTHENTICATED:
       *    - CANNOT access ANY user profiles
       *    - Must authenticate first
       *    - Blocked completely from user_profile content
       */
      let allowUserProfiles = false;
      
      if (isAdmin) {
        // Admins can see all user profiles
        allowUserProfiles = true;
        
      } else if (isHR) {
        // HR can see all user profiles (required for employee management)
        allowUserProfiles = true;
        
      } else if (isTrainer && hasSpecificUserName) {
        // Trainers can see specific user profiles when explicitly asked (trainees/students)
        allowUserProfiles = true;
        
      } else if (isManager && hasSpecificUserName) {
        // Managers can see specific user profiles when explicitly asked
        allowUserProfiles = true;
        
      } else if (isEmployee && isQueryAboutOwnProfile) {
        // Employees can only see their OWN profile
        allowUserProfiles = true;
        
      } else {
        // Everyone else (anonymous, guest, unauthorized) - NO ACCESS
        allowUserProfiles = false;
      }
      
      
      const userProfilesFound = similarVectors.filter(v => v.contentType === 'user_profile');
      
      // 🚨 SECURITY LOGGING: Log unauthorized access attempts
      if (!allowUserProfiles && userProfilesFound.length > 0) {
        console.warn('🚨 SECURITY: Unauthorized access attempt blocked:', {
          userRole: userRole,
          isAuthenticated: isAuthenticated,
          attemptedAccess: 'user_profile',
          userProfilesFound: userProfilesFound.length,
          action: 'BLOCKED',
          reason: !isAuthenticated 
            ? 'User not authenticated' 
            : isEmployee && !isQueryAboutOwnProfile 
              ? 'Employee trying to access other user profile'
              : 'Insufficient permissions',
        });
        
        logger.warn('🚨 SECURITY: Unauthorized user profile access blocked', {
          userRole: userRole,
          isAuthenticated: isAuthenticated,
          attemptedAccess: 'user_profile',
          userProfilesFound: userProfilesFound.length,
          action: 'BLOCKED',
        });
      }
      
      const filteredVectors = allowUserProfiles
        ? similarVectors
        : similarVectors.filter((vec) => vec.contentType !== 'user_profile');
      
      // Track vectors after RBAC filtering
      filteringContext.afterRBAC = filteredVectors.length;
      filteringContext.userProfilesRemoved = userProfilesFound.length - filteredVectors.filter(v => v.contentType === 'user_profile').length;
      
      
      // 🎯 Update filtering reason based on context - FIXED LOGIC
      // Store context variables for reason determination
      filteringContext.hasSpecificUserName = hasSpecificUserName;
      filteringContext.matchedName = matchedName;
      
      if (similarVectors.length === 0) {
        // No vector results at all
        filteringContext.reason = 'NO_DATA';
      } else if (filteredVectors.length === 0) {
        // ALL results were blocked
        if (filteringContext.userProfilesRemoved > 0) {
          filteringContext.reason = 'RBAC_BLOCKED_USER_PROFILES';
        } else {
          filteringContext.reason = 'RBAC_BLOCKED_ALL';
        }
        console.warn('🚨 RBAC Security: All results blocked', {
          userRole: userRole,
          isAuthenticated: isAuthenticated,
          userProfilesFound: filteringContext.userProfilesFound,
          userProfilesRemoved: filteringContext.userProfilesRemoved,
          hasSpecificUserName: hasSpecificUserName,
          action: 'BLOCKED_ALL_RESULTS'
        });
      } else if (filteringContext.userProfilesRemoved > 0 && hasSpecificUserName) {
        // 🔑 KEY FIX: User asked about a SPECIFIC USER, and that user profile was blocked
        // Even if other results remain, this is the PRIMARY issue
        filteringContext.reason = 'RBAC_BLOCKED_USER_PROFILES';
        console.warn('🚨 RBAC Security: User asked specifically about user profile - blocked', {
          userRole: userRole,
          isAuthenticated: isAuthenticated,
          query: query ? query.substring(0, 100) : 'N/A',
          hasSpecificUserName: hasSpecificUserName,
          matchedName: matchedName,
          userProfilesFound: filteringContext.userProfilesFound,
          userProfilesRemoved: filteringContext.userProfilesRemoved,
          remainingResults: filteredVectors.length,
          action: 'SPECIFIC_USER_PROFILE_BLOCKED'
        });
      } else if (filteringContext.userProfilesRemoved > 0) {
        // Some user profiles blocked but query wasn't specifically about a user
        filteringContext.reason = 'PARTIAL_RBAC_BLOCK';
        console.warn('🚨 RBAC Security: Some user profiles blocked (partial)', {
          userRole: userRole,
          isAuthenticated: isAuthenticated,
          query: query ? query.substring(0, 100) : 'N/A',
          userProfilesFound: filteringContext.userProfilesFound,
          userProfilesRemoved: filteringContext.userProfilesRemoved,
          remainingResults: filteredVectors.length,
          action: 'PARTIAL_BLOCK'
        });
      } else if (filteredVectors.length > 0) {
        // Have results after filtering
        filteringContext.reason = 'SUCCESS';
      } else {
        // Fallback
        filteringContext.reason = 'NO_DATA';
      }
      
      
      
      
      logger.info('Vector filtering applied (RBAC)', {
        tenant_id: actualTenantId,
        tenant_domain: tenantDomain,
        user_role: userRole,
        is_admin: isAdmin,
        has_specific_user_name: hasSpecificUserName,
        matched_name: matchedName,
        has_user_query_pattern: hasUserQueryPattern,
        allow_user_profiles: allowUserProfiles,
        total_vectors: similarVectors.length,
        user_profiles_found: userProfilesFound.length,
        filtered_vectors: filteredVectors.length,
        user_profiles_filtered_out: allowUserProfiles ? 0 : userProfilesFound.length,
        privacy_protected: !allowUserProfiles && userProfilesFound.length > 0,
        query_preview: query ? query.substring(0, 50) : 'N/A',
        translated_preview: translatedQuery ? translatedQuery.substring(0, 50) : 'N/A',
        query_for_embedding_preview: queryForEmbedding ? queryForEmbedding.substring(0, 50) : 'N/A',
        threshold_used: min_confidence,
        filtering_reason: filteringContext.reason,
        vectors_before_rbac: filteringContext.vectorResultsFound,
        vectors_after_rbac: filteringContext.afterRBAC,
      });

      sources = filteredVectors.map((vec) => ({
        sourceId: vec.contentId,
        sourceType: vec.contentType,
        sourceMicroservice: vec.microserviceId, // Track which microservice provided this source
        title: vec.metadata?.title || `${vec.contentType}:${vec.contentId}`,
        contentSnippet: vec.contentText ? vec.contentText.substring(0, 200) : '',
        sourceUrl: vec.metadata?.url || `/${vec.contentType}/${vec.contentId}`,
        relevanceScore: vec.similarity,
        metadata: vec.metadata,
      }));

      // Build context from retrieved sources
      retrievedContext = sources
        .map((source, idx) => `[Source ${idx + 1}]: ${source.contentSnippet}`)
        .join('\n\n');

      // Calculate average confidence from vector similarities
      if (sources.length > 0) {
        confidence = sources.reduce((sum, s) => sum + s.relevanceScore, 0) / sources.length;
      }

      logger.info('RAG vector search completed', {
        tenant_id: actualTenantId,
        tenant_domain: tenantDomain,
        user_id,
        category,
        sources_count: sources.length,
        avg_confidence: sources.length ? confidence : 0,
        similar_vectors_count: similarVectors.length,
        threshold_used: min_confidence,
        query_preview: query ? query.substring(0, 100) : 'N/A',
        filtering_reason: filteringContext.reason,
        vectors_before_rbac: filteringContext.vectorResultsFound,
        vectors_after_rbac: filteringContext.afterRBAC,
      });

      // If no results found, try with lower threshold as fallback
      if (sources.length === 0) {
        // Update filtering context if we had vectors but they were filtered
        if (similarVectors.length > 0 && filteredVectors.length === 0) {
          // If we had vectors but they were all filtered by RBAC
          if (filteringContext.reason !== 'NO_PERMISSION') {
            // If not RBAC, it might be threshold - but we'll check with lower threshold
            filteringContext.reason = 'LOW_SIMILARITY';
          }
        } else if (similarVectors.length === 0) {
          filteringContext.reason = 'NO_DATA';
        }
        
        logger.warn('No results with default threshold, trying with lower threshold', {
          tenant_id: actualTenantId,
          tenant_domain: tenantDomain,
          default_threshold: min_confidence,
          similar_vectors_found: similarVectors.length,
          filtered_vectors: filteredVectors.length,
          query_for_embedding: queryForEmbedding ? queryForEmbedding.substring(0, 100) : 'N/A',
          original_query: query ? query.substring(0, 100) : 'N/A',
          translated_query: translatedQuery ? translatedQuery.substring(0, 100) : 'N/A',
          embedding_dimensions: queryEmbedding.length,
          filtering_reason: filteringContext.reason,
        });
        try {
          const lowThresholdVectors = await unifiedVectorSearch(queryEmbedding, actualTenantId, {
            limit: max_results * 3, // Get more results with lower threshold
            threshold: 0.1, // Lower threshold for fallback (was 0.2, now 0.1 to match test endpoint behavior)
          });
          
          if (lowThresholdVectors.length > 0) {
            // RBAC: Use same secure logic as main search
            // Re-check authentication and authorization (same logic as above)
            const isAuthenticatedLow = user_id && user_id !== 'anonymous' && user_id !== 'guest';
            const userRoleLow = userProfile?.role || context?.role || 'anonymous';
            const isAdminLow = userRoleLow === 'admin' || userRoleLow === 'administrator';
            const isHRLow = userRoleLow === 'hr' || userRoleLow === 'HR' || userRoleLow === 'human_resources';
            const isTrainerLow = userRoleLow === 'trainer' || userRoleLow === 'TRAINER';
            const isManagerLow = userRoleLow === 'manager';
            const isEmployeeLow = userRoleLow === 'employee' || userRoleLow === 'user';
            
            const queryLowerLow = query.toLowerCase();
            const translatedLowerLow = translatedQuery?.toLowerCase() || '';
            const queryForCheckLow = queryForEmbedding.toLowerCase();
            
            const specificUserNamePatterns = [
              'eden', 'levi', 'adi', 'cohen', 'noa', 'bar',
              'עדן', 'לוי', 'עדי', 'כהן', 'נועה', 'בר',
            ];
            
            const hasSpecificUserNameLow = specificUserNamePatterns.some(name => 
              queryLowerLow.includes(name) || 
              translatedLowerLow.includes(name) ||
              queryForCheckLow.includes(name)
            );
            
            const matchedNameLow = specificUserNamePatterns.find(name => 
              queryLowerLow.includes(name) || 
              translatedLowerLow.includes(name) ||
              queryForCheckLow.includes(name)
            );
            
            // Check if query is about own profile
            const isQueryAboutOwnProfileLow = (() => {
              if (!isAuthenticatedLow || !userProfile) return false;
              
              const userName = userProfile?.name || userProfile?.fullName || '';
              const userNameLower = userName ? userName.toLowerCase() : '';
              
              const mentionsOwnName = userNameLower && (
                queryLowerLow.includes(userNameLower) ||
                translatedLowerLow.includes(userNameLower) ||
                queryForCheckLow.includes(userNameLower)
              );
              
              const isMyQuery = queryLowerLow.includes('my role') ||
                               queryLowerLow.includes('my profile') ||
                               queryLowerLow.includes('about me');
              
              return mentionsOwnName || isMyQuery;
            })();
            
            // Apply same secure RBAC logic (including HR and Trainer)
            let allowUserProfilesLow = false;
            
            if (isAdminLow) {
              allowUserProfilesLow = true;
            } else if (isHRLow) {
              // HR can see all user profiles
              allowUserProfilesLow = true;
            } else if (isTrainerLow && hasSpecificUserNameLow) {
              // Trainers can see specific user profiles when asked
              allowUserProfilesLow = true;
            } else if (isManagerLow && hasSpecificUserNameLow) {
              allowUserProfilesLow = true;
            } else if (isEmployeeLow && isQueryAboutOwnProfileLow) {
              allowUserProfilesLow = true;
            }
            
            const allowUserProfiles = allowUserProfilesLow;
            
            
            const filteredLowThreshold = allowUserProfiles
              ? lowThresholdVectors
              : lowThresholdVectors.filter((vec) => vec.contentType !== 'user_profile');
            
            // 🚨 SECURITY LOGGING: Log unauthorized access attempts (low threshold)
            const userProfilesInLowThreshold = lowThresholdVectors.filter(v => v.contentType === 'user_profile');
            if (!allowUserProfiles && userProfilesInLowThreshold.length > 0) {
              console.warn('🚨 SECURITY: Unauthorized access attempt blocked (low threshold):', {
                userRole: userRoleLow,
                isAuthenticated: isAuthenticatedLow,
                query: query ? query.substring(0, 100) : 'N/A',
                attemptedAccess: 'user_profile',
                userProfilesFound: userProfilesInLowThreshold.length,
                action: 'BLOCKED',
                reason: !isAuthenticatedLow 
                  ? 'User not authenticated' 
                  : isEmployeeLow && !isQueryAboutOwnProfileLow 
                    ? 'Employee trying to access other user profile'
                    : 'Insufficient permissions',
              });
            }
            
            logger.info('Low threshold filtering (RBAC)', {
              tenant_id: actualTenantId,
              tenant_domain: tenantDomain,
              user_role: userRoleLow,
              is_admin: isAdminLow,
              is_hr: isHRLow,
              is_trainer: isTrainerLow,
              is_manager: isManagerLow,
              is_employee: isEmployeeLow,
              is_authenticated: isAuthenticatedLow,
              has_specific_user_name: hasSpecificUserNameLow,
              is_query_about_own_profile: isQueryAboutOwnProfileLow,
              matched_name: matchedNameLow,
              allow_user_profiles: allowUserProfiles,
              total_low_threshold: lowThresholdVectors.length,
              user_profiles_in_results: userProfilesInLowThreshold.length,
              filtered_count: filteredLowThreshold.length,
              privacy_protected: !allowUserProfiles && userProfilesInLowThreshold.length > 0,
              threshold_used: 0.1,
            });
            
            if (filteredLowThreshold.length > 0) {
              sources = filteredLowThreshold.map((vec) => ({
                sourceId: vec.contentId,
                sourceType: vec.contentType,
                sourceMicroservice: vec.microserviceId,
                title: vec.metadata?.title || `${vec.contentType}:${vec.contentId}`,
                contentSnippet: vec.contentText ? vec.contentText.substring(0, 200) : '',
                sourceUrl: vec.metadata?.url || `/${vec.contentType}/${vec.contentId}`,
                relevanceScore: vec.similarity,
                metadata: vec.metadata,
              }));

              retrievedContext = sources
                .map((source, idx) => `[Source ${idx + 1}]: ${source.contentSnippet}`)
                .join('\n\n');

              if (sources.length > 0) {
                confidence = sources.reduce((sum, s) => sum + s.relevanceScore, 0) / sources.length;
              }
              
              // Clear filtering reason since we found results with lower threshold
              filteringContext.reason = 'SUCCESS';

              logger.info('Found results with lower threshold', {
                tenant_id: actualTenantId,
                sources_count: sources.length,
                avg_confidence: confidence,
                total_found: lowThresholdVectors.length,
                filtered_count: filteredLowThreshold.length,
              });
            } else {
              // Update filtering context if RBAC filtered out all low-threshold results
              if (lowThresholdVectors.length > 0 && filteredLowThreshold.length === 0 && !allowUserProfiles) {
                filteringContext.reason = 'NO_PERMISSION';
              } else if (lowThresholdVectors.length > 0 && filteredLowThreshold.length === 0) {
                // Results found but all filtered - could be threshold or RBAC
                // Keep existing reason if it's already set
                if (!filteringContext.reason || filteringContext.reason === 'NO_DATA') {
                  filteringContext.reason = 'LOW_SIMILARITY';
                }
              }
              
              logger.warn('Found vectors but all filtered out', {
                tenant_id: actualTenantId,
                total_found: lowThresholdVectors.length,
                filtered_count: filteredLowThreshold.length,
                filtering_reason: filteringContext.reason,
                user_profiles_in_results: lowThresholdVectors.filter(v => v.contentType === 'user_profile').length,
                allow_user_profiles: allowUserProfiles,
              });
            }
          } else {
            logger.warn('No results even with lower threshold (0.1)', {
              tenant_id: actualTenantId,
              tenant_domain: tenantDomain,
              threshold_tried: 0.1,
              query_for_embedding: queryForEmbedding ? queryForEmbedding.substring(0, 100) : 'N/A',
              original_query: query ? query.substring(0, 100) : 'N/A',
              embedding_dimensions: queryEmbedding.length,
              recommendation: 'Check if embeddings exist for this tenant. Use /api/debug/embeddings-status to verify.',
            });
          }
        } catch (fallbackError) {
          logger.warn('Fallback vector search also failed', {
            error: fallbackError.message,
          });
        }
      }
    } catch (vectorError) {
      logger.warn('Vector search failed, continuing without retrieved context', {
        error: vectorError.message,
      });
      // Continue without vector search results
    }

    // 3) EVALUATE INTERNAL RESULTS AND DECIDE ON COORDINATOR
    // RAG must ALWAYS search its own Supabase database first (Step 1 - already done above)
    // Now evaluate if internal data is sufficient (Step 2)
    
    // Prepare internal data for evaluation
    const internalData = {
      vectorResults: similarVectors || [],
      sources: sources,
      cachedData: [], // Could be populated from cache if available
      kgRelations: kgRelations || [], // ✅ NOW POPULATED from KG enhancement
      userLearningContext: userLearningContext || null,
      metadata: { 
        category, 
        hasUserProfile: !!userProfile,
        kgEnhanced: (kgRelations?.length || 0) > 0,
        userPersonalized: !!userLearningContext
      },
    };

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CACHE CHECK: Use Vector DB results if high quality match found
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const SIMILARITY_THRESHOLD = parseFloat(process.env.VECTOR_CACHE_THRESHOLD) || 0.85;
    const MIN_RESULTS_FOR_CACHE = 1;
    
    // Check if we have high-quality cached results from Vector DB
    if (sources && sources.length >= MIN_RESULTS_FOR_CACHE && similarVectors && similarVectors.length > 0) {
      // Find the best match from sources (which already contain filtered results with similarity)
      const bestSource = sources.reduce((best, current) => {
        const currentSimilarity = current.relevanceScore || 0;
        const bestSimilarity = best.relevanceScore || 0;
        return currentSimilarity > bestSimilarity ? current : best;
      }, sources[0]);
      
      const bestSimilarity = bestSource.relevanceScore || 0;
      
      logger.info('[QUERY PROCESSING] Vector cache check', {
        query: query.substring(0, 100),
        resultsCount: similarVectors.length,
        sourcesCount: sources.length,
        bestSimilarity: bestSimilarity,
        threshold: SIMILARITY_THRESHOLD,
        willUseCache: bestSimilarity >= SIMILARITY_THRESHOLD,
        filteringReason: filteringContext.reason
      });
      
      // If we have a high-quality match AND no filtering issues, use cached data instead of GRPC
      if (bestSimilarity >= SIMILARITY_THRESHOLD && filteringContext.reason === 'SUCCESS') {
        logger.info('[QUERY PROCESSING] ✅ Using Vector DB cache - skipping GRPC!', {
          query: query.substring(0, 100),
          similarity: bestSimilarity,
          resultsCount: similarVectors.length,
          sourcesCount: sources.length
        });
        
        try {
          // Build context from cached vector results
          const cachedContext = sources
            .map((source, idx) => `[Source ${idx + 1} - ${source.sourceType || 'cached'}]:\n${source.contentSnippet || ''}`)
            .join('\n\n---\n\n');
          
          // Generate answer using LLM with cached context
          const systemPrompt = `You are a helpful assistant providing information based on cached data from the vector database.
Your task is to answer user questions based on the provided context.
Be concise, accurate, and helpful. If the context doesn't contain enough information, say so.
Always base your answer on the provided context.`;

          const userPrompt = `Context from cached data:
${cachedContext}

User question: ${query}

Please provide a helpful answer based on the context above.`;

          const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 1000
          });
          
          const cachedAnswer = completion.choices[0]?.message?.content || '';
          
          if (cachedAnswer && cachedAnswer.length > 0) {
            logger.info('[QUERY PROCESSING] ✅ Cache response generated successfully', {
              answerLength: cachedAnswer.length,
              sourcesUsed: sources.length,
              similarity: bestSimilarity
            });
            
            // Save query to database for analytics
            await saveQueryToDatabase({
              tenantId: actualTenantId,
              userId: user_id || 'anonymous',
              sessionId: session_id,
              queryText: query,
              answer: cachedAnswer,
              confidenceScore: bestSimilarity,
              processingTimeMs: Date.now() - startTime,
              modelVersion: process.env.OPENAI_MODEL || 'gpt-4o-mini',
              isPersonalized: !!userProfile,
              isCached: true,
              metadata: {
                flow: 'vector_cache',
                cache_hit: true,
                similarity: bestSimilarity,
                sources_count: sources.length,
                vector_results_count: similarVectors.length,
                category: category || 'general'
              }
            }).catch(err => {
              logger.warn('Failed to save cached query to database', { error: err.message });
            });
            
            // Return cached response - NO GRPC CALL!
            return {
              success: true,
              answer: cachedAnswer,
              sources: sources.map(s => ({
                sourceId: s.sourceId,
                sourceType: s.sourceType,
                sourceMicroservice: s.sourceMicroservice,
                title: s.title,
                contentSnippet: s.contentSnippet,
                sourceUrl: s.sourceUrl,
                relevanceScore: s.relevanceScore,
                metadata: s.metadata
              })),
              confidence: bestSimilarity,
              metadata: {
                flow: 'vector_cache',
                cache_hit: true,
                similarity: bestSimilarity,
                sources_count: sources.length,
                vector_results_count: similarVectors.length,
                tenant_id: actualTenantId,
                category: category || 'general',
                kgEnhanced: (kgRelations?.length || 0) > 0,
                userPersonalized: !!userLearningContext
              }
            };
          } else {
            logger.warn('[QUERY PROCESSING] Cache response generation failed - falling back to GRPC', {
              query: query.substring(0, 100)
            });
          }
        } catch (cacheError) {
          logger.warn('[QUERY PROCESSING] Cache response generation error - falling back to GRPC', {
            error: cacheError.message,
            query: query.substring(0, 100)
          });
          // Continue to GRPC call below
        }
      } else {
        logger.info('[QUERY PROCESSING] Vector cache miss - calling GRPC', {
          query: query.substring(0, 100),
          hasVectorResults: similarVectors?.length > 0,
          bestSimilarity: bestSimilarity || 0,
          threshold: SIMILARITY_THRESHOLD,
          filteringReason: filteringContext.reason,
          reason: bestSimilarity < SIMILARITY_THRESHOLD 
            ? 'Similarity below threshold' 
            : filteringContext.reason !== 'SUCCESS'
              ? `Filtering reason: ${filteringContext.reason}`
              : 'Unknown'
        });
      }
    } else {
      logger.info('[QUERY PROCESSING] Vector cache miss - no results found, calling GRPC', {
        query: query.substring(0, 100),
        hasSources: sources?.length > 0,
        hasVectorResults: similarVectors?.length > 0
      });
    }

    // Step 3: Decision layer - Check if Coordinator is needed
    // grpcFetchByCategory now includes shouldCallCoordinator() decision internally
    // It will only call Coordinator if internal data is insufficient
    
    logger.info('🔍 [QUERY PROCESSING] About to call grpcFetchByCategory', {
      category: category || 'general',
      query: query.substring(0, 100),
      tenantId: actualTenantId,
      userId: user_id,
      vectorResultsCount: (similarVectors || []).length,
      internalDataKeys: Object.keys(internalData),
      grpcEnabled: process.env.GRPC_ENABLED,
    });
    
    let coordinatorSources = [];
    const coordinatorErrors = [];
    
    // Attempt Coordinator call (only if internal data is insufficient)
    // Note: grpcFetchByCategory() will check shouldCallCoordinator() internally
    try {
      logger.info('🔍 [QUERY PROCESSING] Calling grpcFetchByCategory...', {
        category: category || 'general',
        query: query.substring(0, 100),
      });
      
      const grpcContext = await grpcFetchByCategory(category || 'general', {
        query,
        tenantId: actualTenantId,
        userId: user_id,
        vectorResults: similarVectors || [],
        internalData: internalData,
      });
      
      logger.info('🔍 [QUERY PROCESSING] grpcFetchByCategory returned', {
        category: category || 'general',
        itemsCount: grpcContext?.length || 0,
        hasData: !!(grpcContext && grpcContext.length > 0),
        hasCoordinatorResponse: !!grpcContext?.coordinatorResponse,
      });

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // INTEGRATION: Use realtimeHandler for proper data extraction & response
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      
      // Check if we got a valid response from Coordinator with envelope
      if (grpcContext && grpcContext.coordinatorResponse && grpcContext.length > 0) {
        try {
          // Determine the source service from the response
          const sourceService = grpcContext.sourceService 
            || grpcContext.processedResponse?.successful_service
            || grpcContext.targetServices?.[0]
            || category 
            || 'general';
          
          // Normalize service name to match schema file format
          // Schema files are named like: managementreporting-service.json
          // Coordinator may return: managementreporting-service or managementreporting
          let normalizedServiceName = sourceService;
          if (!normalizedServiceName.endsWith('-service')) {
            normalizedServiceName = normalizedServiceName + '-service';
          }
          // Also try without normalization in case schema uses different format
          const alternativeServiceName = sourceService;
          
          logger.info('🔍 [QUERY PROCESSING] Attempting to use realtimeHandler', {
            sourceService: normalizedServiceName,
            alternativeServiceName: alternativeServiceName,
            hasCoordinatorResponse: !!grpcContext.coordinatorResponse,
            hasSchema: schemaLoader.hasSchema(normalizedServiceName) || schemaLoader.hasSchema(alternativeServiceName),
            availableSchemas: schemaLoader.listServices(),
          });
          
          // Check if we have a schema for this service (try both normalized and original)
          const serviceNameToUse = schemaLoader.hasSchema(normalizedServiceName) 
            ? normalizedServiceName 
            : (schemaLoader.hasSchema(alternativeServiceName) ? alternativeServiceName : null);
          
          if (serviceNameToUse) {
            logger.info('✅ [QUERY PROCESSING] Using realtimeHandler for response generation', {
              sourceService: serviceNameToUse,
              hasResponse: !!grpcContext.coordinatorResponse,
              hasProcessedResponse: !!grpcContext.processedResponse,
              hasBusinessData: !!grpcContext.processedResponse?.business_data,
            });
            
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // CRITICAL FIX: Build correct response_envelope for handler
            // Use already-extracted business data from processedResponse
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            
            // Get the extracted business data (already extracted by extractBusinessData)
            let businessData = null;
            
            // Priority 1: Get from processedResponse.sources (already extracted)
            if (grpcContext.processedResponse?.sources && Array.isArray(grpcContext.processedResponse.sources) && grpcContext.processedResponse.sources.length > 0) {
              businessData = grpcContext.processedResponse.sources;
              logger.info('🔍 [QUERY PROCESSING] Using sources from processedResponse', {
                sourcesCount: businessData.length,
              });
            }
            // Priority 2: Get from processedResponse.business_data.data
            else if (grpcContext.processedResponse?.business_data?.data) {
              const data = grpcContext.processedResponse.business_data.data;
              businessData = Array.isArray(data) ? data : [data];
              logger.info('🔍 [QUERY PROCESSING] Using business_data.data', {
                dataCount: businessData.length,
              });
            }
            // Priority 3: Get from processedResponse.business_data.sources
            else if (grpcContext.processedResponse?.business_data?.sources && Array.isArray(grpcContext.processedResponse.business_data.sources)) {
              businessData = grpcContext.processedResponse.business_data.sources;
              logger.info('🔍 [QUERY PROCESSING] Using business_data.sources', {
                sourcesCount: businessData.length,
              });
            }
            // Priority 4: Parse from envelope_json if needed
            else if (grpcContext.coordinatorResponse?.envelope_json) {
              try {
                const parsed = typeof grpcContext.coordinatorResponse.envelope_json === 'string'
                  ? JSON.parse(grpcContext.coordinatorResponse.envelope_json)
                  : grpcContext.coordinatorResponse.envelope_json;
                
                if (parsed.successfulResult?.data) {
                  const data = parsed.successfulResult.data;
                  businessData = Array.isArray(data) ? data : [data];
                  logger.info('🔍 [QUERY PROCESSING] Parsed from envelope_json.successfulResult.data', {
                    dataCount: businessData.length,
                  });
                } else if (parsed.data) {
                  businessData = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
                  logger.info('🔍 [QUERY PROCESSING] Parsed from envelope_json.data', {
                    dataCount: businessData.length,
                  });
                } else if (Array.isArray(parsed)) {
                  businessData = parsed;
                  logger.info('🔍 [QUERY PROCESSING] Parsed envelope_json as array', {
                    dataCount: businessData.length,
                  });
                }
              } catch (parseError) {
                logger.warn('⚠️ [QUERY PROCESSING] Failed to parse envelope_json', {
                  error: parseError.message,
                });
              }
            }
            // Priority 5: Get from processedResponse.envelope.successfulResult.data
            else if (grpcContext.processedResponse?.envelope?.successfulResult?.data) {
              const data = grpcContext.processedResponse.envelope.successfulResult.data;
              businessData = Array.isArray(data) ? data : [data];
              logger.info('🔍 [QUERY PROCESSING] Using processedResponse.envelope.successfulResult.data', {
                dataCount: businessData.length,
              });
            }
            
            logger.info('🔍 [QUERY PROCESSING] Extracted business data for handler', {
              hasData: !!businessData,
              isArray: Array.isArray(businessData),
              count: Array.isArray(businessData) ? businessData.length : 0,
              sample: Array.isArray(businessData) && businessData[0] ? Object.keys(businessData[0]) : 'none',
            });
            
            // Only proceed with handler if we have data
            if (businessData && (Array.isArray(businessData) ? businessData.length > 0 : true)) {
              // Build correct response_envelope format for handler
              const responseEnvelope = {
                success: true,
                successfulResult: {
                  data: Array.isArray(businessData) ? businessData : [businessData],
                },
                data: Array.isArray(businessData) ? businessData : [businessData],
              };
              
              // 🔍 DEBUG: Log the data being sent to handler
              console.log('🔍 DEBUG: businessData', JSON.stringify(businessData, null, 2).substring(0, 500));
              console.log('🔍 DEBUG: responseEnvelope', JSON.stringify(responseEnvelope, null, 2).substring(0, 500));
              
              logger.info('✅ [QUERY PROCESSING] Calling realtimeHandler with correct format', {
                sourceService: serviceNameToUse,
                dataCount: responseEnvelope.data.length,
                firstItemKeys: responseEnvelope.data[0] ? Object.keys(responseEnvelope.data[0]) : [],
              });
              
              // Use realtimeHandler for proper extraction and response building
              const handlerResult = await realtimeHandler.handle({
                source_service: serviceNameToUse,
                user_query: query,
                user_id: user_id,
                tenant_id: actualTenantId,
                response_envelope: responseEnvelope, // ✅ CORRECT FORMAT!
              });
            
              if (handlerResult.success && handlerResult.answer) {
                logger.info('✅ [QUERY PROCESSING] Handler generated response successfully', {
                  sourceService: serviceNameToUse,
                  itemsFound: handlerResult.metadata?.items_returned || 0,
                  answerLength: handlerResult.answer?.length || 0,
                });
              
                // Convert handler's response to queryProcessing format
                const processingTimeMs = Date.now() - startTime;
                
                // Build sources from handler metadata
                const handlerSources = [{
                  sourceId: handlerResult.source?.service || serviceNameToUse,
                  sourceType: handlerResult.source?.service || serviceNameToUse,
                  sourceMicroservice: handlerResult.source?.service || serviceNameToUse,
                  title: handlerResult.source?.description || serviceNameToUse,
                  contentSnippet: handlerResult.answer.substring(0, 200),
                  sourceUrl: '',
                  relevanceScore: 0.9,
                  metadata: {
                    ...handlerResult.metadata,
                    via: 'realtime_handler',
                    items_returned: handlerResult.metadata?.items_returned || 0,
                  },
                }];
                
                // Save query to database
                try {
                  await saveQueryToDatabase({
                    tenantId: actualTenantId,
                    userId: user_id || 'anonymous',
                    sessionId: session_id,
                    queryText: query,
                    answer: handlerResult.answer,
                    confidenceScore: 0.9,
                    processingTimeMs,
                    modelVersion: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                    isPersonalized: !!userProfile,
                    isCached: false,
                    sources: handlerSources,
                    recommendations: [],
                  });
                } catch (saveError) {
                  logger.warn('Failed to save query to database', {
                    error: saveError.message,
                  });
                }
                
                // Return handler's response in queryProcessing format
                return {
                  answer: handlerResult.answer,
                  abstained: false,
                  confidence: 0.9,
                  sources: handlerSources,
                  recommendations: [],
                  conversation_id,
                  metadata: {
                    processing_time_ms: processingTimeMs,
                    sources_retrieved: handlerSources.length,
                    cached: false,
                    model_version: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                    personalized: !!userProfile,
                    flow: 'realtime_handler',
                    tenant_id: actualTenantId,
                    items_returned: handlerResult.metadata?.items_returned || 0,
                    conversation_enabled: !!conversation_id,
                  },
                };
              } else {
                logger.warn('⚠️ [QUERY PROCESSING] Handler returned no data, falling back to existing flow', {
                  sourceService: serviceNameToUse,
                  message: handlerResult.message,
                  success: handlerResult.success,
                });
                // Fall through to existing flow
              }
            } else {
              logger.warn('⚠️ [QUERY PROCESSING] No business data found for handler', {
                sourceService: serviceNameToUse,
                hasProcessedResponse: !!grpcContext.processedResponse,
                hasBusinessData: !!grpcContext.processedResponse?.business_data,
                hasSources: !!grpcContext.processedResponse?.sources,
                hasEnvelopeJson: !!grpcContext.coordinatorResponse?.envelope_json,
                grpcContextKeys: Object.keys(grpcContext || {}),
              });
              // Fall through to existing flow
            }
          } else {
            logger.debug('ℹ️ [QUERY PROCESSING] No schema for service, using existing flow', {
              sourceService: normalizedServiceName,
              alternativeServiceName: alternativeServiceName,
              availableSchemas: schemaLoader.listServices(),
            });
            // Fall through to existing flow
          }
        } catch (handlerError) {
          logger.error('❌ [QUERY PROCESSING] Handler failed, falling back to existing flow', {
            error: handlerError.message,
            stack: handlerError.stack,
            sourceService: grpcContext.sourceService || category,
          });
          // Fall through to existing flow
        }
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // EXISTING FLOW (Fallback if handler doesn't work or no schema available)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      if (grpcContext && grpcContext.length > 0) {
        logger.info('Coordinator returned data', {
          tenant_id: actualTenantId,
          user_id,
          category,
          items: grpcContext.length,
          usingFallback: true,
        });

        // Convert Coordinator results into sources format
        coordinatorSources = grpcContext.map((item, idx) => {
          // Use longer snippet for reports (conclusions can be lengthy)
          const maxLength = item.contentType === 'management_reporting' ? 1500 : 200;
          return {
            sourceId: item.contentId || `coordinator-${idx}`,
            sourceType: item.contentType || category || 'coordinator',
            sourceMicroservice: item.metadata?.target_services?.[0] || 'coordinator',
            title: item.metadata?.title || item.contentType || 'Coordinator Source',
            contentSnippet: String(item.contentText || '').substring(0, maxLength),
            sourceUrl: item.metadata?.url || '',
            relevanceScore: item.metadata?.relevanceScore || 0.75,
            metadata: { ...(item.metadata || {}), via: 'coordinator' },
          };
        });
      }
    } catch (coordinatorError) {
      logger.warn('Coordinator call failed, continuing with internal data only', {
        error: coordinatorError.message,
        tenant_id: actualTenantId,
        user_id,
      });
      coordinatorErrors.push({
        type: 'coordinator_error',
        message: coordinatorError.message,
      });
    }

    // Step 4: Merge internal and Coordinator results (if Coordinator was called)
    if (coordinatorSources.length > 0 || sources.length > 0) {
      const merged = mergeResults(sources, {
        sources: coordinatorSources,
        metadata: {
          target_services: coordinatorSources[0]?.metadata?.target_services || [],
        },
      });

      // Update sources and context with merged results
      sources = merged.sources || sources;
      retrievedContext = merged.context || retrievedContext;

      // Recalculate confidence based on merged results
      if (sources.length > 0) {
        confidence = sources.reduce((sum, s) => sum + (s.relevanceScore || 0), 0) / sources.length;
      }

      logger.info('Merged internal and Coordinator results', {
        tenant_id: actualTenantId,
        user_id,
        internal_sources: merged.metadata?.internal_sources || 0,
        coordinator_sources: merged.metadata?.coordinator_sources || 0,
        total_sources: sources.length,
      });
    }

    // 🔑 CRITICAL FIX: Handle RBAC_BLOCKED_USER_PROFILES before checking sources.length
    if (filteringContext.reason === 'RBAC_BLOCKED_USER_PROFILES') {
      // User asked specifically about a user profile and it was blocked
      const processingTimeMs = Date.now() - startTime;
      const rawAnswer = generateNoResultsMessage(query, filteringContext);
      const answer = formatErrorMessage(rawAnswer, { 
        reason: 'permission_denied',
        context: filteringContext 
      });
      
      
      const cleanAnswer = String(answer || '')
        .replace(/\n/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/\t/g, ' ')
        .trim();
      
      const response = {
        answer: cleanAnswer,
        abstained: true,
        reason: 'permission_denied',
        confidence: 0,
        sources: [],
        conversation_id,
        metadata: {
          processing_time_ms: Number(processingTimeMs) || 0,
          sources_retrieved: 0,
          cached: false,
          model_version: 'rbac-blocked',
          personalized: false,
          filtering_reason: 'RBAC_BLOCKED_USER_PROFILES',
          userProfilesBlocked: filteringContext.userProfilesRemoved,
          hasSpecificUserName: filteringContext.hasSpecificUserName,
          matchedName: filteringContext.matchedName,
          conversation_enabled: !!conversation_id,
        },
      };
      
      // Save query to database for analytics
      try {
        await saveQueryToDatabase({
          tenantId: actualTenantId,
          userId: user_id || 'anonymous',
          sessionId: session_id,
          queryText: query,
          answer: cleanAnswer,
          confidenceScore: 0,
          processingTimeMs,
          modelVersion: 'rbac-blocked',
          isPersonalized: false,
          isCached: false,
          sources: [],
          recommendations: [],
        });
      } catch (_) {
        // ignore persistence errors
      }
      
      return response;
    }

    // If still no context after gRPC → dynamic no-data with appropriate message
    if (sources.length === 0) {
      const processingTimeMs = Date.now() - startTime;
      
      
      const rawAnswer = generateNoResultsMessage(query, filteringContext);
      const answer = formatErrorMessage(rawAnswer, { 
        reason: filteringContext.reason,
        context: filteringContext 
      });

      // Determine reason code for response
      let reasonCode = 'no_edudata_context';
      if (filteringContext.reason === 'NO_PERMISSION' || filteringContext.reason === 'RBAC_BLOCKED_USER_PROFILES' || filteringContext.reason === 'RBAC_BLOCKED_ALL') {
        reasonCode = 'permission_denied';
      } else if (filteringContext.reason === 'PARTIAL_RBAC_BLOCK') {
        reasonCode = 'partial_permission_denied';
      } else if (filteringContext.reason === 'LOW_SIMILARITY') {
        reasonCode = 'below_threshold';
      } else if (filteringContext.reason === 'NO_DATA') {
        reasonCode = 'no_vector_results';
      }

      // Ensure all metadata values are JSON-serializable
      // Clean the answer to prevent JSON issues
      const cleanAnswer = String(answer || '')
        .replace(/\n/g, ' ') // Replace newlines with spaces
        .replace(/\r/g, ' ') // Replace carriage returns
        .replace(/\t/g, ' ') // Replace tabs
        .trim();
      
      const response = {
        answer: cleanAnswer,
        abstained: true,
        reason: String(reasonCode || 'no_edudata_context'),
        confidence: 0,
        sources: [],
        conversation_id,
        metadata: {
          processing_time_ms: Number(processingTimeMs) || 0,
          sources_retrieved: 0,
          cached: false,
          model_version: 'db-required',
          personalized: false,
          filtering_reason: filteringContext.reason ? String(filteringContext.reason) : null,
          vectors_before_rbac: Number(filteringContext.vectorResultsFound) || 0,
          vectors_after_rbac: Number(filteringContext.afterRBAC) || 0,
          conversation_enabled: !!conversation_id,
        },
      };
      
      // Validate response is JSON-serializable before returning
      try {
        JSON.stringify(response);
      } catch (jsonError) {
        logger.error('Response JSON validation failed', {
          error: jsonError.message,
          answer_preview: cleanAnswer ? cleanAnswer.substring(0, 100) : 'N/A',
          filtering_reason: filteringContext.reason,
        });
        // Return a safe fallback response
        return {
          answer: 'I couldn\'t find information about your query. Please try rephrasing your question.',
          abstained: true,
          reason: 'no_edudata_context',
          confidence: 0,
          sources: [],
          conversation_id,
          metadata: {
            processing_time_ms: processingTimeMs,
            sources_retrieved: 0,
            cached: false,
            model_version: 'db-required',
            personalized: false,
            conversation_enabled: !!conversation_id,
          },
        };
      }

      logger.info('No EDUCORE context found after RAG and gRPC', {
        tenant_id: actualTenantId,
        user_id,
        category,
        processing_time_ms: processingTimeMs,
        filtering_reason: filteringContext.reason,
        vectors_before_rbac: filteringContext.vectorResultsFound,
        vectors_after_rbac: filteringContext.afterRBAC,
        user_role: filteringContext.userRole,
        reason_code: reasonCode,
      });

      // Persist minimal query record for analytics/observability
      try {
        await saveQueryToDatabase({
          tenantId: actualTenantId,
          userId: user_id || 'anonymous',
          sessionId: session_id,
          queryText: query,
          answer,
          confidenceScore: 0,
          processingTimeMs,
          modelVersion: 'db-required',
          isPersonalized: false,
          isCached: false,
          sources: [],
          recommendations: [],
        });
      } catch (_) {
        // ignore persistence errors
      }

      try {
        await logAuditEvent({
          tenantId: actualTenantId,
          userId: user_id,
          action: 'query_no_db_context',
          resourceType: 'query',
          resourceId: queryRecord?.id,
          details: { queryLength: query.length },
        });
      } catch (_) {
        // ignore audit errors
      }

      return response;
    }

    // Build personalized context from user profile
    let personalizationContext = '';
    if (userProfile) {
      const skillGaps = await getUserSkillGaps(actualTenantId, user_id);
      if (skillGaps.length > 0) {
        personalizationContext = `User skill gaps: ${skillGaps.join(', ')}. `;
      }
      if (userProfile.role) {
        personalizationContext += `User role: ${userProfile.role}. `;
      }
    }

    // Load conversation history if conversation_id is provided
    let conversationHistory = [];
    if (conversation_id) {
      try {
        conversationHistory = await getConversationHistory(conversation_id, 10);
        logger.info('Loaded conversation history for EDUCORE query', {
          conversation_id,
          historyCount: conversationHistory.length,
        });
      } catch (historyError) {
        logger.warn('Failed to load conversation history, continuing without it', {
          error: historyError.message,
          conversation_id,
        });
        conversationHistory = [];
      }
    }

    // Generate answer using OpenAI with retrieved context (STRICT RAG)
    const systemPrompt = `You are a helpful AI assistant for the EDUCORE learning platform.
Strict RAG rules you MUST follow:
- Use ONLY the content under "Context from knowledge base".
- Do NOT use outside knowledge or make assumptions.
- If the context does not contain the requested information, clearly state that EDUCORE does not include it and do not fabricate details.
${personalizationContext ? `\nPersonalization hints: ${personalizationContext}` : ''}`;
    
    const userPrompt = `Context from knowledge base:\n${retrievedContext}\n\nQuestion: ${query}\n\nAnswer ONLY with facts from the context above. If the context is insufficient, say so (without adding external knowledge).`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...conversationHistory, // Include conversation history
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const rawAnswer = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
    const answer = formatBotResponse(rawAnswer, { 
      mode: 'rag',
      hasUserProfile: !!userProfile,
      sources: sources.length 
    });
    const processingTimeMs = Date.now() - startTime;

    // Save messages to conversation history if conversation_id is provided
    if (conversation_id) {
      try {
        await addMessageToConversation(conversation_id, 'user', query);
        await addMessageToConversation(conversation_id, 'assistant', answer);
        logger.info('Saved messages to conversation history (EDUCORE)', {
          conversation_id,
        });
      } catch (saveError) {
        logger.warn('Failed to save conversation history, continuing without it', {
          error: saveError.message,
          conversation_id,
        });
      }
    }

    // Generate personalized recommendations based on user profile and query context
    let recommendations = [];
    try {
      if (user_id && user_id !== 'anonymous') {
        const rawRecommendations = await generatePersonalizedRecommendations(
          actualTenantId,
          user_id,
          {
            limit: 3,
            mode: 'general',
            recentQueries: [{ queryText: query, sources }],
          }
        );
        recommendations = formatRecommendations(rawRecommendations);
      }
    } catch (recError) {
      logger.warn('Failed to generate recommendations', {
        error: recError.message,
        tenantId: actualTenantId,
        userId: user_id,
      });
      // Continue without recommendations
    }

    const response = {
      answer,
      abstained: false,
      confidence,
      sources,
      recommendations, // Include recommendations in response
      conversation_id,
      metadata: {
        processing_time_ms: processingTimeMs,
        sources_retrieved: sources.length,
        cached: false,
        model_version: 'gpt-3.5-turbo',
        personalized: !!userProfile,
        kg_enhanced: (kgRelations?.length || 0) > 0,
        kg_relations_count: kgRelations?.length || 0,
        user_personalized: !!userLearningContext,
        boost_applied: similarVectors?.some(v => v.kgBoost > 0) || false,
        conversation_enabled: !!conversation_id,
      },
    };

    // Save query to database
    queryRecord = await saveQueryToDatabase({
      tenantId: actualTenantId,
      userId: user_id || 'anonymous',
      sessionId: session_id,
      queryText: query,
      answer,
      confidenceScore: confidence,
      processingTimeMs,
      modelVersion: 'gpt-3.5-turbo',
      isPersonalized: !!userProfile,
      isCached: false,
      sources,
      recommendations, // Save recommendations to database
    });

    // Cache the response (TTL: 1 hour) - if Redis is available
    if (isRedisAvailable()) {
      try {
        const redis = getRedis();
        const cacheKey = `query:${actualTenantId}:${user_id}:${Buffer.from(query).toString('base64')}`;
        await redis.setex(cacheKey, 3600, JSON.stringify(response));
      } catch (cacheError) {
        // Redis error - continue without caching
        logger.debug('Redis cache save failed, continuing without cache:', cacheError.message);
      }
    }

    // Log audit event
    try {
      await logAuditEvent({
        tenantId: actualTenantId,
        userId: user_id,
        action: 'query_processed',
        resourceType: 'query',
        resourceId: queryRecord?.id,
        details: {
          queryLength: query.length,
          answerLength: answer.length,
          sourcesCount: sources.length,
          confidence,
        },
      });
    } catch (auditError) {
      logger.warn('Failed to log audit event', { error: auditError.message });
    }

    logger.info('Query processed successfully', {
      query,
      tenant_id: actualTenantId,
      user_id,
      processing_time_ms: processingTimeMs,
      sources_count: sources.length,
      confidence,
    });

    return response;
  } catch (error) {
    // CRITICAL: Comprehensive error logging for debugging 500 errors
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('🚨 [PROCESS QUERY SERVICE] ERROR CAUGHT:');
    console.error('🚨 Error name:', error.name);
    console.error('🚨 Error message:', error.message);
    console.error('🚨 Error stack:', error.stack);
    console.error('🚨 Query:', query);
    console.error('🚨 Tenant ID:', tenant_id);
    console.error('🚨 User ID:', user_id);
    console.error('🚨 Context:', JSON.stringify(context, null, 2));
    console.error('🚨 Options:', JSON.stringify(options, null, 2));
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    logger.error('Query processing error', {
      error: error.message,
      errorName: error.name,
      query,
      tenant_id,
      user_id,
      stack: error.stack,
      context,
      options,
    });

    // Try to log error to audit
    try {
      const tenantDomain = tenant_id || 'default.local';
      const tenant = await getOrCreateTenant(tenantDomain);
      await logAuditEvent({
        tenantId: tenant.id,
        userId: user_id,
        action: 'query_error',
        resourceType: 'query',
        details: {
          error: error.message,
          errorName: error.name,
          query,
        },
      });
    } catch (_auditError) {
      // Ignore audit errors
      console.error('⚠️ [PROCESS QUERY SERVICE] Failed to log audit event:', _auditError.message);
    }

    // Return error response with more details
    const errorMessage = `Query processing failed: ${error.message}`;
    console.error('🚨 [PROCESS QUERY SERVICE] Throwing error:', errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Save query to database
 * @private
 */
async function saveQueryToDatabase({
  tenantId,
  userId,
  sessionId,
  queryText,
  answer,
  confidenceScore,
  processingTimeMs,
  modelVersion,
  isPersonalized,
  isCached,
  sources,
  recommendations,
}) {
  try {
    const prisma = await getPrismaClient();

    const queryRecord = await prisma.query.create({
      data: {
        tenantId,
        userId: userId || 'anonymous',
        sessionId,
        queryText,
        answer,
        confidenceScore,
        processingTimeMs,
        modelVersion,
        isPersonalized,
        isCached,
        metadata: {
          sourcesCount: sources.length,
          recommendationsCount: recommendations.length,
        },
        sources: {
          create: sources.map((source) => ({
            sourceId: source.sourceId,
            sourceType: source.sourceType,
            sourceMicroservice: source.sourceMicroservice, // Track which microservice provided this source
            title: source.title,
            contentSnippet: source.contentSnippet,
            sourceUrl: source.sourceUrl,
            relevanceScore: source.relevanceScore,
            metadata: source.metadata || {},
          })),
        },
        recommendations: {
          create: recommendations.map((rec) => ({
            recommendationType: rec.type,
            recommendationId: rec.id,
            title: rec.title || rec.label || '', // Use label as fallback if title is missing
            description: rec.description || '',
            reason: rec.reason || '',
            priority: rec.priority || 0,
            metadata: rec.metadata || {},
          })),
        },
      },
    });

    return queryRecord;
  } catch (error) {
    logger.error('Failed to save query to database', {
      error: error.message,
      tenantId,
      userId,
    });
    // Don't throw - allow query processing to continue even if DB save fails
    return null;
  }
}

/**
 * Log audit event
 * @private
 */
async function logAuditEvent({ tenantId, userId, action, resourceType, resourceId, details = {} }) {
  try {
    const prisma = await getPrismaClient();

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        resourceType,
        resourceId,
        details,
      },
    });
  } catch (error) {
    logger.warn('Failed to create audit log', {
      error: error.message,
      tenantId,
      action,
    });
    // Don't throw - audit logging should not break the main flow
  }
}

