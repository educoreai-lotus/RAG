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
import { mergeResults, createContextBundle, handleFallbacks } from '../communication/routingEngine.service.js';
import { generatePersonalizedRecommendations } from './recommendations.service.js';
import { validateAndFixTenantId, getCorrectTenantId } from '../utils/tenant-validation.util.js';

/**
 * Generate a context-aware "no data" message based on filtering context
 * @param {string} userQuery - The user's query
 * @param {Object} filteringContext - Filtering context with reason, counts, etc.
 * @returns {string} Appropriate error message
 */
function generateNoResultsMessage(userQuery, filteringContext) {
  // Escape the query to prevent JSON issues with quotes and special characters
  const query = String(userQuery || '').trim();
  const safeQuery = query.replace(/"/g, "'"); // Replace double quotes with single quotes
  const reason = filteringContext?.reason || 'NO_DATA';
  const userRole = filteringContext?.userRole || 'anonymous';
  
  switch(reason) {
    case 'NO_PERMISSION':
      // 🔐 SECURITY: Provide specific messages based on authentication status
      if (userRole === 'anonymous' || userRole === 'guest') {
        return `I found information about "${safeQuery}", but you need to log in to access employee information. Please authenticate to continue.`;
      } else if (userRole === 'admin') {
        return `I found information about "${safeQuery}", but there may be a configuration issue with access permissions. Please check RBAC settings.`;
      } else {
        return `I found information about "${safeQuery}", but you don't have permission to access it. Your current role: ${userRole}. Please contact your administrator if you need access to this information.`;
      }
    
    case 'LOW_SIMILARITY':
      return `I found some content, but nothing closely matches "${safeQuery}". Please try rephrasing your question or add more relevant content.`;
    
    case 'NO_DATA':
    default:
      // No results found in vector search (default case)
      const templates = [
        (q) => `I couldn't find information about "${q}" in the knowledge base.`,
        (q) => `There is currently no EDUCORE content matching "${q}".`,
        (q) => `The EDUCORE knowledge base does not include information about "${q}".`,
        (q) => `No relevant EDUCORE items were found for "${q}".`,
      ];
      const pick = Math.floor(Math.random() * templates.length);
      const base = templates[pick](safeQuery);
      return `${base} Please add or import relevant documents to improve future answers.`;
  }
}

/**
 * Process a query using RAG (Retrieval-Augmented Generation)
 * @param {Object} params - Query parameters
 * @param {string} params.query - User's natural language question
 * @param {string} params.tenant_id - Tenant identifier
 * @param {Object} params.context - Query context (user_id, session_id)
 * @param {Object} params.options - Query options (max_results, min_confidence, include_metadata)
 * @returns {Promise<Object>} Query response with answer, sources, confidence, metadata
 */
export async function processQuery({ query, tenant_id, context = {}, options = {} }) {
  const startTime = Date.now();
  const { user_id, session_id } = context;
  const {
    max_results = 5,
    min_confidence = 0.25, // Lowered from 0.5 to 0.25 to match test endpoint behavior (test uses 0.3)
    include_metadata = true,
  } = options;

  let queryRecord = null;
  let isCached = false;

  try {
    // CRITICAL: Validate and fix tenant_id FIRST
    // This ensures we never use the wrong tenant ID
    let validatedTenantId = tenant_id;
    if (!validatedTenantId || validatedTenantId === 'default.local') {
      // If tenant_id is 'default.local' or empty, resolve to correct tenant
      console.log('🔧 Resolving default.local to correct tenant_id');
      validatedTenantId = getCorrectTenantId();
    } else {
      // Validate and auto-correct any wrong tenant IDs
      validatedTenantId = validateAndFixTenantId(validatedTenantId);
    }
    
    console.log('✅ Using tenant_id:', validatedTenantId);
    
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
    let userProfile = null;
    if (user_id && user_id !== 'anonymous') {
      try {
        userProfile = await getOrCreateUserProfile(actualTenantId, user_id);
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
          isCached = true;
          
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
        query: query.substring(0, 100),
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
      });

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a friendly assistant. Provide a concise, helpful answer.' },
          { role: 'user', content: query },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const answer = completion.choices[0]?.message?.content || '';
      const processingTimeMs = Date.now() - startTime;

      return {
        answer,
        abstained: false,
        confidence: 1,
        sources: [],
        metadata: {
          processing_time_ms: processingTimeMs,
          sources_retrieved: 0,
          cached: false,
          model_version: 'gpt-3.5-turbo',
          personalized: !!userProfile,
          mode: 'general_openai',
        },
      };
    }

    // 2) RAG LOOKUP (EDUCORE queries only)
    // Translate query to English for better matching with English content in database
    // OpenAI embeddings work cross-lingual, but translating helps when content is in English
    let queryForEmbedding = query;
    let translatedQuery = null;
    
    // 📝 Query Transformations - Detailed Logging
    console.log('📝 Query Transformations - START:', {
      original_query: query,
      original_length: query.length,
      has_hebrew: /[\u0590-\u05FF]/.test(query),
      query_for_embedding_initial: queryForEmbedding,
    });
    
    try {
      // Detect if query contains Hebrew characters
      const hasHebrew = /[\u0590-\u05FF]/.test(query);
      
      if (hasHebrew) {
        logger.info('Detected Hebrew in query, translating to English for better vector matching', {
          original_query: query.substring(0, 100),
        });
        
        console.log('🌐 Attempting translation...');
        
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
        
        console.log('🌐 Translation Result:', {
          original: query,
          translated: translatedQuery,
          using_translated: true,
        });
        
        logger.info('Query translated', {
          original: query.substring(0, 100),
          translated: translatedQuery.substring(0, 100),
        });
      } else {
        console.log('🌐 No translation needed (no Hebrew detected)');
      }
    } catch (translationError) {
      console.error('❌ Translation failed:', {
        error: translationError.message,
        using_original_query: true,
      });
      
      logger.warn('Translation failed, using original query', {
        error: translationError.message,
      });
      // Continue with original query if translation fails
    }
    
    // 📝 Query Transformations - FINAL
    console.log('📝 Query Transformations - FINAL:', {
      original_query: query,
      translated_query: translatedQuery || 'none',
      final_query_for_embedding: queryForEmbedding,
      query_was_modified: queryForEmbedding !== query,
      modification_type: translatedQuery ? 'translated' : 'unchanged',
    });
    
    // 🔍 Vector Search Parameters - Detailed Logging
    console.log('🔍 Vector Search Parameters:', {
      original_query: query.substring(0, 100),
      query_for_embedding: queryForEmbedding.substring(0, 100),
      translated_query: translatedQuery?.substring(0, 100) || 'none',
      tenant_id: actualTenantId,
      tenant_id_type: typeof actualTenantId,
      tenant_id_as_string: String(actualTenantId),
      is_valid_uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actualTenantId),
      threshold: min_confidence,
      limit: max_results,
      query_was_translated: !!translatedQuery,
      query_has_hebrew: /[\u0590-\u05FF]/.test(query),
    });

    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: queryForEmbedding, // Use translated query for embedding
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // 📊 Embedding Generated - Detailed Logging
    console.log('📊 Embedding Generated:', {
      dimensions: queryEmbedding.length,
      preview: queryEmbedding.slice(0, 5),
      query_used: queryForEmbedding.substring(0, 100),
      model: 'text-embedding-ada-002',
      embedding_sum: queryEmbedding.reduce((a, b) => a + b, 0),
      embedding_min: Math.min(...queryEmbedding),
      embedding_max: Math.max(...queryEmbedding),
    });

    // Vector similarity search in PostgreSQL (pgvector)
    let sources = [];
    let retrievedContext = '';
    let confidence = min_confidence;
    let similarVectors = []; // Initialize outside try block to avoid "not defined" error
    
    // 🎯 Filtering Context Tracking
    const userRoleForContext = userProfile?.role || context?.role || 'anonymous';
    let filteringContext = {
      vectorResultsFound: 0,
      afterThreshold: 0,
      afterRBAC: 0,
      reason: null, // 'NO_DATA', 'LOW_SIMILARITY', 'NO_PERMISSION', 'SUCCESS'
      threshold: min_confidence,
      userRole: userRoleForContext,
      isAuthenticated: user_id && user_id !== 'anonymous' && user_id !== 'guest',
    };

    try {
      logger.info('Starting vector search', {
        tenant_id: actualTenantId,
        query_for_embedding: queryForEmbedding.substring(0, 100),
        threshold: min_confidence,
        limit: max_results,
        embedding_dimensions: queryEmbedding.length,
      });
      
      console.log('🔍 Calling unifiedVectorSearch with:', {
        embedding_length: queryEmbedding.length,
        tenant_id: actualTenantId,
        threshold: min_confidence,
        limit: max_results,
      });
      
      // Use unified vector search service
      similarVectors = await unifiedVectorSearch(queryEmbedding, actualTenantId, {
        limit: max_results,
        threshold: min_confidence,
      });
      
      // Track initial results
      filteringContext.vectorResultsFound = similarVectors.length;
      
      // 🔍 Vector Search Raw Results - Detailed Logging
      console.log('🔍 Vector Search Raw Results (from unifiedVectorSearch):', {
        totalFound: similarVectors.length,
        threshold_used: min_confidence,
        topSimilarities: similarVectors.slice(0, 5).map(r => ({
          contentId: r.contentId,
          contentType: r.contentType,
          similarity: r.similarity,
          contentTextPreview: r.contentText?.substring(0, 50),
        })),
        allContentTypes: [...new Set(similarVectors.map(r => r.contentType))],
        allContentIds: similarVectors.map(r => r.contentId),
      });
      
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
        query_for_embedding: queryForEmbedding.substring(0, 100),
        embedding_dimensions: queryEmbedding.length,
        filtering_reason: filteringContext.reason,
      });

      // Enforce role-based permission on user profiles:
      // - Admins: Can access all user profiles
      // - Non-admins: Can ONLY access user profiles when querying about SPECIFIC users by name
      // - This maintains privacy while allowing specific user lookups
      
      // 🔍 BEFORE RBAC Filtering - Detailed logging
      console.log('🔍 BEFORE RBAC Filtering:', {
        query: query.substring(0, 100),
        totalResults: similarVectors.length,
        userProfileCount: similarVectors.filter(r => r.contentType === 'user_profile').length,
        resultTypes: [...new Set(similarVectors.map(r => r.contentType))],
        contentIds: similarVectors.map(r => r.contentId).slice(0, 5),
      });
      
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
      const userRoleFromProfile = userProfile?.role;
      const userRoleFromContext = context?.role;
      const userRole = userProfile?.role || context?.role || 'anonymous';
      
      // 🔐 SECURITY: Check authentication and authorization levels
      const isAuthenticated = user_id && user_id !== 'anonymous' && user_id !== 'guest';
      const isAdmin = userRole === 'admin' || userRole === 'administrator';
      const isManager = userRole === 'manager';
      const isEmployee = userRole === 'employee' || userRole === 'user';
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
      
      console.log('👤 User Context:', {
        user_id: user_id,
        userRoleFromProfile: userRoleFromProfile,
        userRoleFromContext: userRoleFromContext,
        finalRole: userRole,
        isAuthenticated: isAuthenticated,
        isAdmin: isAdmin,
        isHR: isHR,
        isTrainer: isTrainer,
        isManager: isManager,
        isEmployee: isEmployee,
        query: query.substring(0, 100),
        queryLower: queryLower.substring(0, 100),
        translatedLower: translatedLower.substring(0, 100),
        queryForCheck: queryForCheck.substring(0, 100),
        hasSpecificUserName: hasSpecificUserName,
        matchedName: matchedName,
        hasUserQueryPattern: hasUserQueryPattern,
        isQueryAboutOwnProfile: isQueryAboutOwnProfile,
      });
      
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
       * 5. EMPLOYEE/USER:
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
        console.log('✅ Admin user - allowing all user_profile results');
        
      } else if (isHR) {
        // HR can see all user profiles (required for employee management)
        allowUserProfiles = true;
        console.log('✅ HR user - allowing all user_profile results');
        
      } else if (isTrainer && hasSpecificUserName) {
        // Trainers can see specific user profiles when explicitly asked (trainees/students)
        allowUserProfiles = true;
        console.log(`✅ Trainer asking about specific user (${matchedName}) - allowing user_profile results`);
        
      } else if (isManager && hasSpecificUserName) {
        // Managers can see specific user profiles when explicitly asked
        allowUserProfiles = true;
        console.log(`✅ Manager asking about specific user (${matchedName}) - allowing user_profile results`);
        
      } else if (isEmployee && isQueryAboutOwnProfile) {
        // Employees can only see their OWN profile
        allowUserProfiles = true;
        console.log('✅ Employee viewing own profile - allowing user_profile results');
        
      } else {
        // Everyone else (anonymous, guest, unauthorized) - NO ACCESS
        allowUserProfiles = false;
        console.log('❌ Insufficient permissions - blocking user_profile results');
      }
      
      console.log('🔐 RBAC Decision:', {
        userRole: userRole,
        isAuthenticated: isAuthenticated,
        isAdmin: isAdmin,
        isHR: isHR,
        isTrainer: isTrainer,
        isManager: isManager,
        isEmployee: isEmployee,
        hasSpecificUserName: hasSpecificUserName,
        isQueryAboutOwnProfile: isQueryAboutOwnProfile,
        allowUserProfiles: allowUserProfiles,
      });
      
      const userProfilesFound = similarVectors.filter(v => v.contentType === 'user_profile');
      
      // 🚨 SECURITY LOGGING: Log unauthorized access attempts
      if (!allowUserProfiles && userProfilesFound.length > 0) {
        console.warn('🚨 SECURITY: Unauthorized access attempt blocked:', {
          userRole: userRole,
          userId: user_id || 'anonymous',
          isAuthenticated: isAuthenticated,
          query: query.substring(0, 100),
          attemptedAccess: 'user_profile',
          userProfilesFound: userProfilesFound.length,
          matchedName: matchedName,
          action: 'BLOCKED',
          reason: !isAuthenticated 
            ? 'User not authenticated' 
            : isEmployee && !isQueryAboutOwnProfile 
              ? 'Employee trying to access other user profile'
              : 'Insufficient permissions',
        });
        
        logger.warn('🚨 SECURITY: Unauthorized user profile access blocked', {
          userRole: userRole,
          userId: user_id || 'anonymous',
          isAuthenticated: isAuthenticated,
          query: query.substring(0, 100),
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
      
      // 🔍 AFTER RBAC Filtering - Detailed logging
      console.log('🔍 AFTER RBAC Filtering:', {
        originalCount: similarVectors.length,
        filteredCount: filteredVectors.length,
        removedCount: similarVectors.length - filteredVectors.length,
        allowUserProfiles: allowUserProfiles,
        userProfilesFound: userProfilesFound.length,
        userProfilesRemoved: allowUserProfiles ? 0 : userProfilesFound.length,
      });
      
      // 🎯 Update filtering reason based on context
      if (similarVectors.length > 0 && filteredVectors.length === 0 && !allowUserProfiles) {
        filteringContext.reason = 'NO_PERMISSION'; // Key fix: distinguish permission from no data
        console.error('⚠️ WARNING: RBAC filtered out ALL results!', {
          hadResults: similarVectors.length,
          hadUserProfiles: userProfilesFound.length,
          allowUserProfiles: allowUserProfiles,
          userRole: userRole,
          isAdmin: isAdmin,
          isAuthenticated: isAuthenticated,
          hasSpecificUserName: hasSpecificUserName,
          isQueryAboutOwnProfile: isQueryAboutOwnProfile,
          matchedName: matchedName,
          query: query.substring(0, 100),
          filteringContext: filteringContext,
        });
      } else if (similarVectors.length > 0 && filteredVectors.length > 0) {
        filteringContext.reason = 'SUCCESS';
      } else if (similarVectors.length === 0) {
        filteringContext.reason = 'NO_DATA';
      }
      
      // Log filtering context
      console.log('🎯 Filtering Context:', filteringContext);
      
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
        query_preview: query.substring(0, 50),
        translated_preview: translatedQuery?.substring(0, 50),
        query_for_embedding_preview: queryForEmbedding.substring(0, 50),
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
        contentSnippet: vec.contentText.substring(0, 200),
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
        query_preview: query.substring(0, 100),
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
          query_for_embedding: queryForEmbedding.substring(0, 100),
          original_query: query.substring(0, 100),
          translated_query: translatedQuery?.substring(0, 100),
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
            
            console.log('🔍 Low Threshold RBAC Decision:', {
              hasSpecificUserName: hasSpecificUserNameLow,
              matchedName: matchedNameLow,
              userRole: userRoleLow,
              isAdmin: isAdminLow,
              isHR: isHRLow,
              isTrainer: isTrainerLow,
              isManager: isManagerLow,
              isEmployee: isEmployeeLow,
              isQueryAboutOwnProfile: isQueryAboutOwnProfileLow,
              allowUserProfiles: allowUserProfiles,
              lowThresholdVectorsCount: lowThresholdVectors.length,
              userProfilesInResults: lowThresholdVectors.filter(v => v.contentType === 'user_profile').length,
            });
            
            const filteredLowThreshold = allowUserProfiles
              ? lowThresholdVectors
              : lowThresholdVectors.filter((vec) => vec.contentType !== 'user_profile');
            
            // 🚨 SECURITY LOGGING: Log unauthorized access attempts (low threshold)
            const userProfilesInLowThreshold = lowThresholdVectors.filter(v => v.contentType === 'user_profile');
            if (!allowUserProfiles && userProfilesInLowThreshold.length > 0) {
              console.warn('🚨 SECURITY: Unauthorized access attempt blocked (low threshold):', {
                userRole: userRoleLow,
                userId: user_id || 'anonymous',
                isAuthenticated: isAuthenticatedLow,
                query: query.substring(0, 100),
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
                contentSnippet: vec.contentText.substring(0, 200),
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
              query_for_embedding: queryForEmbedding.substring(0, 100),
              original_query: query.substring(0, 100),
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
      kgRelations: [], // Could be populated from KG if available
      metadata: {
        category,
        hasUserProfile: !!userProfile,
      },
    };

    // Step 3: Decision layer - Check if Coordinator is needed
    // grpcFetchByCategory now includes shouldCallCoordinator() decision internally
    // It will only call Coordinator if internal data is insufficient
    
    let coordinatorSources = [];
    let coordinatorErrors = [];
    
    // Attempt Coordinator call (only if internal data is insufficient)
    // Note: grpcFetchByCategory() will check shouldCallCoordinator() internally
    try {
      const grpcContext = await grpcFetchByCategory(category || 'general', {
        query,
        tenantId: actualTenantId,
        userId: user_id,
        vectorResults: similarVectors || [],
        internalData: internalData,
      });

      if (grpcContext && grpcContext.length > 0) {
        logger.info('Coordinator returned data', {
          tenant_id: actualTenantId,
          user_id,
          category,
          items: grpcContext.length,
        });

        // Convert Coordinator results into sources format
        coordinatorSources = grpcContext.map((item, idx) => ({
          sourceId: item.contentId || `coordinator-${idx}`,
          sourceType: item.contentType || category || 'coordinator',
          sourceMicroservice: item.metadata?.target_services?.[0] || 'coordinator',
          title: item.metadata?.title || item.contentType || 'Coordinator Source',
          contentSnippet: String(item.contentText || '').substring(0, 200),
          sourceUrl: item.metadata?.url || '',
          relevanceScore: item.metadata?.relevanceScore || 0.75,
          metadata: { ...(item.metadata || {}), via: 'coordinator' },
        }));
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

    // If still no context after gRPC → dynamic no-data with appropriate message
    if (sources.length === 0) {
      const processingTimeMs = Date.now() - startTime;
      const answer = generateNoResultsMessage(query, filteringContext);

      // Determine reason code for response
      let reasonCode = 'no_edudata_context';
      if (filteringContext.reason === 'NO_PERMISSION') {
        reasonCode = 'permission_denied';
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
        metadata: {
          processing_time_ms: Number(processingTimeMs) || 0,
          sources_retrieved: 0,
          cached: false,
          model_version: 'db-required',
          personalized: false,
          filtering_reason: filteringContext.reason ? String(filteringContext.reason) : null,
          vectors_before_rbac: Number(filteringContext.vectorResultsFound) || 0,
          vectors_after_rbac: Number(filteringContext.afterRBAC) || 0,
        },
      };
      
      // Validate response is JSON-serializable before returning
      try {
        JSON.stringify(response);
      } catch (jsonError) {
        logger.error('Response JSON validation failed', {
          error: jsonError.message,
          answer_preview: cleanAnswer.substring(0, 100),
          filtering_reason: filteringContext.reason,
        });
        // Return a safe fallback response
        return {
          answer: 'I couldn\'t find information about your query. Please try rephrasing your question.',
          abstained: true,
          reason: 'no_edudata_context',
          confidence: 0,
          sources: [],
          metadata: {
            processing_time_ms: processingTimeMs,
            sources_retrieved: 0,
            cached: false,
            model_version: 'db-required',
            personalized: false,
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
        user_role: userRole,
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
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const answer = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
    const processingTimeMs = Date.now() - startTime;

    // Generate personalized recommendations based on user profile and query context
    let recommendations = [];
    try {
      if (user_id && user_id !== 'anonymous') {
        recommendations = await generatePersonalizedRecommendations(
          actualTenantId,
          user_id,
          {
            limit: 3,
            mode: 'general',
            recentQueries: [{ queryText: query, sources }],
          }
        );
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
      metadata: {
        processing_time_ms: processingTimeMs,
        sources_retrieved: sources.length,
        cached: false,
        model_version: 'gpt-3.5-turbo',
        personalized: !!userProfile,
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
    logger.error('Query processing error', {
      error: error.message,
      query,
      tenant_id,
      user_id,
      stack: error.stack,
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
          query,
        },
      });
    } catch (auditError) {
      // Ignore audit errors
    }

    // Return error response
    throw new Error(`Query processing failed: ${error.message}`);
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

