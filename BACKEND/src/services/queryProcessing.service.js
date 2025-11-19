/**
 * Query Processing Service
 * Handles RAG query processing with OpenAI integration
 */

import { openai } from '../config/openai.config.js';
import { logger } from '../utils/logger.util.js';
import { getRedis, isRedisAvailable } from '../config/redis.config.js';
import { getPrismaClient } from '../config/database.config.js';
import { searchSimilarVectors } from './vectorSearch.service.js';
import { getOrCreateTenant } from './tenant.service.js';
import { getOrCreateUserProfile, getUserSkillGaps } from './userProfile.service.js';
import { isEducoreQuery } from '../utils/query-classifier.util.js';
import { grpcFetchByCategory } from './grpcFallback.service.js';
import { mergeResults, createContextBundle, handleFallbacks } from '../communication/routingEngine.service.js';
import { generatePersonalizedRecommendations } from './recommendations.service.js';

// Generate a dynamic, context-aware "no data" message that references the user's query (English only)
function generateNoDataMessage(userQuery) {
  const templates = [
    (q) => `I couldn't find EDUCORE knowledge related to: "${q}".`,
    (q) => `There is currently no EDUCORE content matching: "${q}".`,
    (q) => `The EDUCORE knowledge base does not include information about: "${q}".`,
    (q) => `No relevant EDUCORE items were found for: "${q}".`,
    (q) => `It appears we don't have EDUCORE data covering: "${q}".`,
  ];
  const pick = Math.floor(Math.random() * templates.length);
  const base = templates[pick](String(userQuery || '').trim());
  return `${base} Please add or import relevant documents to improve future answers.`;
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
    min_confidence = 0.5, // Lowered from 0.7 to 0.5 for better recall, especially for Hebrew queries
    include_metadata = true,
  } = options;

  let queryRecord = null;
  let isCached = false;

  try {
    // Get or create tenant (use domain as identifier)
    const tenantDomain = tenant_id || 'default.local';
    const tenant = await getOrCreateTenant(tenantDomain);
    const actualTenantId = tenant.id;

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
    const { isEducore, category } = isEducoreQuery(query);
    logger.info('Query classification result', {
      tenant_id: actualTenantId,
      user_id,
      isEducore,
      category,
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
    
    try {
      // Detect if query contains Hebrew characters
      const hasHebrew = /[\u0590-\u05FF]/.test(query);
      
      if (hasHebrew) {
        logger.info('Detected Hebrew in query, translating to English for better vector matching', {
          original_query: query.substring(0, 100),
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
          original: query.substring(0, 100),
          translated: translatedQuery.substring(0, 100),
        });
      }
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

    try {
      logger.info('Starting vector search', {
        tenant_id: actualTenantId,
        query_for_embedding: queryForEmbedding.substring(0, 100),
        threshold: min_confidence,
        limit: max_results,
        embedding_dimensions: queryEmbedding.length,
      });
      
      similarVectors = await searchSimilarVectors(queryEmbedding, actualTenantId, {
        limit: max_results,
        threshold: min_confidence,
      });
      
      logger.info('Vector search returned', {
        tenant_id: actualTenantId,
        vectors_found: similarVectors.length,
        content_types: similarVectors.map(v => v.contentType),
        content_ids: similarVectors.map(v => v.contentId),
        top_similarities: similarVectors.slice(0, 3).map(v => v.similarity),
      });

      // Enforce simple role-based permission on user profiles:
      // only admins may retrieve contentType 'user_profile'
      // BUT: Allow user_profile for queries about specific users (like "Eden Levi")
      const isUserProfileQuery = query.toLowerCase().includes('eden') || 
                                 query.toLowerCase().includes('levi') ||
                                 query.toLowerCase().includes('user') ||
                                 query.toLowerCase().includes('profile') ||
                                 translatedQuery?.toLowerCase().includes('eden') ||
                                 translatedQuery?.toLowerCase().includes('levi') ||
                                 translatedQuery?.toLowerCase().includes('user') ||
                                 translatedQuery?.toLowerCase().includes('profile');
      
      const filteredVectors = (userProfile?.role === 'admin' || isUserProfileQuery)
        ? similarVectors
        : similarVectors.filter((vec) => vec.contentType !== 'user_profile');
      
      logger.info('Vector filtering applied', {
        tenant_id: actualTenantId,
        user_role: userProfile?.role || 'anonymous',
        is_user_profile_query: isUserProfileQuery,
        total_vectors: similarVectors.length,
        filtered_vectors: filteredVectors.length,
        user_profiles_found: similarVectors.filter(v => v.contentType === 'user_profile').length,
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
        user_id,
        category,
        sources_count: sources.length,
        avg_confidence: sources.length ? confidence : 0,
        similar_vectors_count: similarVectors.length,
      });

      // If no results found, try with lower threshold as fallback
      if (sources.length === 0) {
        logger.info('No results with default threshold (0.5), trying with lower threshold (0.2)', {
          tenant_id: actualTenantId,
          similar_vectors_found: similarVectors.length,
          query_for_embedding: queryForEmbedding.substring(0, 100),
        });
        try {
          const lowThresholdVectors = await searchSimilarVectors(queryEmbedding, actualTenantId, {
            limit: max_results * 3, // Get more results with lower threshold
            threshold: 0.2, // Even lower threshold for fallback (was 0.3)
          });
          
          if (lowThresholdVectors.length > 0) {
            // Allow user_profile for queries about specific users
            const isUserProfileQuery = query.toLowerCase().includes('eden') || 
                                       query.toLowerCase().includes('levi') ||
                                       query.toLowerCase().includes('user') ||
                                       query.toLowerCase().includes('profile') ||
                                       translatedQuery?.toLowerCase().includes('eden') ||
                                       translatedQuery?.toLowerCase().includes('levi') ||
                                       translatedQuery?.toLowerCase().includes('user') ||
                                       translatedQuery?.toLowerCase().includes('profile');
            
            const filteredLowThreshold = (userProfile?.role === 'admin' || isUserProfileQuery)
              ? lowThresholdVectors
              : lowThresholdVectors.filter((vec) => vec.contentType !== 'user_profile');
            
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

              logger.info('Found results with lower threshold', {
                tenant_id: actualTenantId,
                sources_count: sources.length,
                avg_confidence: confidence,
                total_found: lowThresholdVectors.length,
                filtered_count: filteredLowThreshold.length,
              });
            } else {
              logger.warn('Found vectors but all filtered out (user_profile without admin role)', {
                tenant_id: actualTenantId,
                total_found: lowThresholdVectors.length,
              });
            }
          } else {
            logger.warn('No results even with lower threshold (0.2)', {
              tenant_id: actualTenantId,
              query_for_embedding: queryForEmbedding.substring(0, 100),
              embedding_dimensions: queryEmbedding.length,
            });
            
            // Last resort: try with very low threshold (0.1) for user profile queries
            if (queryForEmbedding.toLowerCase().includes('eden') || 
                queryForEmbedding.toLowerCase().includes('levi') ||
                queryForEmbedding.toLowerCase().includes('user') ||
                queryForEmbedding.toLowerCase().includes('profile')) {
              logger.info('Trying with very low threshold (0.1) for user profile query', {
                tenant_id: actualTenantId,
              });
              
              try {
                const veryLowThresholdVectors = await searchSimilarVectors(queryEmbedding, actualTenantId, {
                  limit: 10,
                  threshold: 0.1, // Very low threshold
                });
                
                if (veryLowThresholdVectors.length > 0) {
                  // Allow all user_profile results for this query
                  sources = veryLowThresholdVectors.map((vec) => ({
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

                  logger.info('Found results with very low threshold (0.1)', {
                    tenant_id: actualTenantId,
                    sources_count: sources.length,
                    avg_confidence: confidence,
                  });
                }
              } catch (veryLowError) {
                logger.warn('Very low threshold search also failed', {
                  error: veryLowError.message,
                });
              }
            }
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

    // If still no context after gRPC → dynamic no-data
    if (sources.length === 0) {
      const processingTimeMs = Date.now() - startTime;
      const answer = generateNoDataMessage(query);

      const response = {
        answer,
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

      logger.info('No EDUCORE context found after RAG and gRPC', {
        tenant_id: actualTenantId,
        user_id,
        category,
        processing_time_ms: processingTimeMs,
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
            title: rec.title,
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

