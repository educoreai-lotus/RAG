/**
 * Microservice Support Controller
 * Handles proxy requests for Assessment and DevLab microservices.
 * In SUPPORT mode we can forward requests to the Coordinator (gRPC),
 * which then routes to the appropriate microservice (e.g. DevLab/Assessment).
 */

import { logger } from '../utils/logger.util.js';
import Joi from 'joi';
import { validate } from '../utils/validation.util.js';
import { callCoordinatorRoute, processCoordinatorResponse } from '../communication/communicationManager.service.js';
import { openai } from '../config/openai.config.js';

/**
 * Support request validation schema
 */
const supportRequestSchema = Joi.object({
  query: Joi.string().min(1).max(2000).required(),
  timestamp: Joi.string().isoDate().optional(),
  session_id: Joi.string().optional(),
  // support_mode is optional; activation is enforced by headers/explicit flag match
  support_mode: Joi.string().valid('Assessment', 'DevLab').optional(),
  metadata: Joi.object({
    user_id: Joi.string().optional(),
    tenant_id: Joi.string().optional(),
    source: Joi.string().valid('assessment', 'devlab').optional(),
  }).optional(),
});

/**
 * POST /api/assessment/support
 * Proxy endpoint for Assessment microservice support
 */
export async function assessmentSupport(req, res, next) {
  try {
    // Log incoming request for debugging
    logger.debug('Assessment support request received', {
      method: req.method,
      headers: {
        'x-source': req.headers['x-source'],
        'x-microservice-source': req.headers['x-microservice-source'],
        origin: req.headers.origin,
      },
      body: req.body,
    });

    // Validate request
    const validation = validate(req.body, supportRequestSchema);
    if (!validation.valid) {
      logger.warn('Assessment support validation failed', { error: validation.error });
      return res.status(400).json({
        error: 'Validation error',
        message: validation.error,
      });
    }

    const { query, session_id, metadata = {}, support_mode } = validation.value;

    // Enforce activation via explicit source (header or metadata or flag)
    // If no source is provided, check if support_mode is 'Assessment' (case-insensitive)
    const headerSource = (req.headers['x-source'] || req.headers['x-microservice-source'] || '').toString().toLowerCase();
    const metaSource = (metadata.source || '').toString().toLowerCase();
    const flagSource = (support_mode || '').toString().toLowerCase();
    
    // Check if any source indicates Assessment
    const isAssessmentSource = 
      ['assessment'].includes(headerSource) || 
      ['assessment'].includes(metaSource) || 
      ['assessment'].includes(flagSource) ||
      support_mode === 'Assessment'; // Also check exact match
    
    if (!isAssessmentSource) {
      logger.warn('Assessment support mode not activated', {
        headerSource,
        metaSource,
        flagSource,
        support_mode,
      });
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Support mode not activated. Provide X-Source: assessment or support_mode: Assessment in request body.' 
      });
    }

    const userId = metadata.user_id || req.headers['x-user-id'];
    const tenantId = metadata.tenant_id || req.headers['x-tenant-id'];

    logger.info('Assessment support request', {
      query,
      session_id,
      user_id: userId,
      tenant_id: tenantId,
      source: 'assessment',
    });

    // ═══════════════════════════════════════════════════════
    // FORWARD TO COORDINATOR (gRPC) → ASSESSMENT MICROSERVICE
    // ═══════════════════════════════════════════════════════
    logger.info('[Assessment Support] Forwarding to Coordinator via gRPC', {
      query,
      user_id: userId,
      tenant_id: tenantId,
      session_id,
    });

    let coordinatorResponse;
    let usedFallback = false;

    try {
      // Try Coordinator first
      coordinatorResponse = await callCoordinatorRoute({
        tenant_id: tenantId,
        user_id: userId,
        query_text: query,
        metadata: {
          ...metadata,
          support_mode: 'Assessment',
          source: 'assessment_support',
          session_id,
        },
      });

      if (!coordinatorResponse) {
        throw new Error('No response from Coordinator');
      }
    } catch (coordinatorError) {
      logger.warn('[Assessment Support] Coordinator failed, trying fallback', {
        error: coordinatorError.message,
        source: 'Assessment',
      });

      // ✅ FALLBACK: Use general LLM
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant. The user is asking about Assessment. Provide general guidance based on your knowledge.',
            },
            { role: 'user', content: query },
          ],
          temperature: 0.7,
          max_tokens: 500,
        });

        const fallbackAnswer = completion.choices[0].message.content;
        usedFallback = true;

        logger.info('[Assessment Support] Fallback answer generated');

        return res.json({
          response: fallbackAnswer,
          timestamp: new Date().toISOString(),
          session_id,
          metadata: {
            fallback: true,
            reason: 'Coordinator unavailable',
          },
        });
      } catch (fallbackError) {
        logger.error('[Assessment Support] Fallback also failed', {
          error: fallbackError.message,
        });

        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'Both Coordinator and fallback systems are unavailable. Please try again later.',
        });
      }
    }

    logger.info('[Assessment Support] Coordinator response received');

    const processed = processCoordinatorResponse(coordinatorResponse);
    if (!processed) {
      logger.warn('[Assessment Support] Failed to process Coordinator response');
      return res.status(502).json({
        error: 'Bad Gateway',
        message: 'Failed to process response from Assessment service',
      });
    }

    // Try to extract a human-readable answer from business data / envelope
    let answer = null;
    const businessData = processed.business_data || processed.business_data?.data;

    if (businessData) {
      // ✅ LLM Enhancement: Enhance Coordinator response with OpenAI
      try {
        answer = await enhanceWithLLM(query, businessData, 'Assessment');
        logger.info('[Assessment Support] Answer enhanced with LLM');
      } catch (llmError) {
        logger.warn('[Assessment Support] LLM enhancement failed, using raw data', {
          error: llmError.message,
        });
        // Fallback to raw extraction
        if (typeof businessData === 'string') {
          answer = businessData;
        } else if (typeof businessData === 'object') {
          answer = businessData.answer || businessData.message || businessData.text;
        }
      }
    }

    // Fallback: try envelope payload
    if (!answer && processed.envelope?.payload) {
      const payload = processed.envelope.payload;
      if (typeof payload === 'string') {
        answer = payload;
      } else if (payload && typeof payload === 'object') {
        answer = payload.answer || payload.message || payload.text;
      }
    }

    if (!answer) {
      logger.warn('[Assessment Support] No explicit answer field in Coordinator response');
      answer = 'Assessment processed your request but did not return a direct answer. Please try rephrasing your question.';
    }

    logger.info('[Assessment Support] Response generated', {
      has_answer: !!answer,
      session_id,
      used_fallback: usedFallback,
    });

    const responsePayload = {
      response: answer,
      timestamp: new Date().toISOString(),
      session_id,
      metadata: {
        target_services: processed.target_services || [],
        successful_service: processed.successful_service,
        quality_score: processed.quality_score,
        rank_used: processed.rank_used,
        fallback: usedFallback,
      },
    };

    res.json(responsePayload);
  } catch (error) {
    logger.error('Assessment support error', {
      error: error.message,
      stack: error.stack,
      requestBody: req.body,
    });
    next(error);
  }
}

/**
 * POST /api/devlab/support
 * Proxy endpoint for DevLab microservice support
 */
export async function devlabSupport(req, res, next) {
  try {
    // CRITICAL: Comprehensive logging for debugging 500 errors
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 [DEVLAB SUPPORT] Request received');
    console.log('🔍 Method:', req.method);
    console.log('🔍 URL:', req.originalUrl);
    console.log('🔍 Body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('🔍 User ID:', req.headers['x-user-id']);
    console.log('🔍 Tenant ID:', req.headers['x-tenant-id']);
    console.log('🔍 Authorization:', req.headers['authorization'] ? 'Present' : 'Missing');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Log incoming request for debugging
    logger.debug('DevLab support request received', {
      method: req.method,
      headers: {
        'x-source': req.headers['x-source'],
        'x-microservice-source': req.headers['x-microservice-source'],
        origin: req.headers.origin,
      },
      body: req.body,
    });

    // Validate request
    console.log('🔍 [DEVLAB SUPPORT] Starting validation...');
    console.log('🔍 [DEVLAB SUPPORT] Request body type:', typeof req.body);
    console.log('🔍 [DEVLAB SUPPORT] Request body keys:', Object.keys(req.body || {}));
    
    const validation = validate(req.body, supportRequestSchema);
    console.log('🔍 [DEVLAB SUPPORT] Validation result:', {
      valid: validation.valid,
      error: validation.error,
      value: validation.value
    });
    
    if (!validation.valid) {
      console.error('❌ [DEVLAB SUPPORT] Validation failed:', validation.error);
      logger.warn('DevLab support validation failed', { error: validation.error });
      return res.status(400).json({
        error: 'Validation error',
        message: validation.error,
      });
    }
    
    console.log('✅ [DEVLAB SUPPORT] Validation passed');

    const { query, session_id, metadata = {}, support_mode } = validation.value;

    // Enforce activation via explicit source (header or metadata or flag)
    // If no source is provided, check if support_mode is 'DevLab' (case-insensitive)
    const headerSource = (req.headers['x-source'] || req.headers['x-microservice-source'] || '').toString().toLowerCase();
    const metaSource = (metadata.source || '').toString().toLowerCase();
    const flagSource = (support_mode || '').toString().toLowerCase();
    
    // Check if any source indicates DevLab
    const isDevlabSource = 
      ['devlab'].includes(headerSource) || 
      ['devlab'].includes(metaSource) || 
      ['devlab'].includes(flagSource) ||
      support_mode === 'DevLab'; // Also check exact match
    
    if (!isDevlabSource) {
      logger.warn('DevLab support mode not activated', {
        headerSource,
        metaSource,
        flagSource,
        support_mode,
      });
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Support mode not activated. Provide X-Source: devlab or support_mode: DevLab in request body.' 
      });
    }

    const userId = metadata.user_id || req.headers['x-user-id'];
    const tenantId = metadata.tenant_id || req.headers['x-tenant-id'];

    logger.info('DevLab support request', {
      query,
      session_id,
      user_id: userId,
      tenant_id: tenantId,
      source: 'devlab_support',
    });

    // ═══════════════════════════════════════════════════════
    // FORWARD TO COORDINATOR (gRPC) → DEVLAB MICROSERVICE
    // ═══════════════════════════════════════════════════════
    console.log('🔄 [DEVLAB SUPPORT] Forwarding to Coordinator via gRPC...');
    console.log('🔄 [DEVLAB SUPPORT] Coordinator payload:', JSON.stringify({
      tenant_id: tenantId,
      user_id: userId,
      query_text: query,
      metadata: {
        ...metadata,
        support_mode: 'DevLab',
        source: 'devlab_support',
        session_id,
      },
    }, null, 2));

    let coordinatorResponse;
    let usedFallback = false;

    try {
      // Try Coordinator first
      coordinatorResponse = await callCoordinatorRoute({
        tenant_id: tenantId,
        user_id: userId,
        query_text: query,
        metadata: {
          ...metadata,
          support_mode: 'DevLab',
          source: 'devlab_support',
          session_id,
        },
      });

      if (!coordinatorResponse) {
        throw new Error('No response from Coordinator');
      }
    } catch (coordinatorError) {
      logger.warn('[DevLab Support] Coordinator failed, trying fallback', {
        error: coordinatorError.message,
        source: 'DevLab',
      });

      // ✅ FALLBACK: Use general LLM
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant. The user is asking about DevLab (coding exercises and programming). Provide general guidance based on your knowledge.',
            },
            { role: 'user', content: query },
          ],
          temperature: 0.7,
          max_tokens: 500,
        });

        const fallbackAnswer = completion.choices[0].message.content;
        usedFallback = true;

        logger.info('[DevLab Support] Fallback answer generated');

        return res.json({
          response: fallbackAnswer,
          timestamp: new Date().toISOString(),
          session_id,
          metadata: {
            fallback: true,
            reason: 'Coordinator unavailable',
          },
        });
      } catch (fallbackError) {
        logger.error('[DevLab Support] Fallback also failed', {
          error: fallbackError.message,
        });

        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'Both Coordinator and fallback systems are unavailable. Please try again later.',
        });
      }
    }

    console.log('✅ [DEVLAB SUPPORT] Raw Coordinator response:', JSON.stringify(coordinatorResponse, null, 2));

    const processed = processCoordinatorResponse(coordinatorResponse);
    if (!processed) {
      console.error('❌ [DEVLAB SUPPORT] Failed to process Coordinator response');
      return res.status(502).json({
        error: 'Bad Gateway',
        message: 'Failed to process response from DevLab service',
      });
    }

    // Try to extract a human-readable answer from business data / envelope
    let answer = null;
    const businessData = processed.business_data || processed.business_data?.data;

    if (businessData) {
      // ✅ LLM Enhancement: Enhance Coordinator response with OpenAI
      try {
        answer = await enhanceWithLLM(query, businessData, 'DevLab');
        logger.info('[DevLab Support] Answer enhanced with LLM');
      } catch (llmError) {
        logger.warn('[DevLab Support] LLM enhancement failed, using raw data', {
          error: llmError.message,
        });
        // Fallback to raw extraction
        if (typeof businessData === 'string') {
          answer = businessData;
        } else if (typeof businessData === 'object') {
          answer = businessData.answer || businessData.message || businessData.text;
        }
      }
    }

    // Fallback: try envelope payload
    if (!answer && processed.envelope?.payload) {
      const payload = processed.envelope.payload;
      if (typeof payload === 'string') {
        answer = payload;
      } else if (payload && typeof payload === 'object') {
        answer = payload.answer || payload.message || payload.text;
      }
    }

    if (!answer) {
      console.warn('⚠️ [DEVLAB SUPPORT] No explicit answer field in Coordinator response, returning summary');
      answer = 'DevLab processed your request but did not return a direct answer. Please check DevLab logs for details.';
    }

    const responsePayload = {
      response: answer,
      timestamp: new Date().toISOString(),
      session_id,
      metadata: {
        target_services: processed.target_services || [],
        successful_service: processed.successful_service,
        quality_score: processed.quality_score,
        rank_used: processed.rank_used,
        fallback: usedFallback,
      },
    };

    console.log('✅ [DEVLAB SUPPORT] Sending success response');
    console.log('✅ [DEVLAB SUPPORT] Response:', JSON.stringify(responsePayload, null, 2));
    res.json(responsePayload);
  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ [DEVLAB SUPPORT] ERROR CAUGHT:');
    console.error('❌ Error message:', error.message);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Request body:', JSON.stringify(req.body, null, 2));
    console.error('❌ Request headers:', JSON.stringify(req.headers, null, 2));
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    logger.error('DevLab support error', {
      error: error.message,
      stack: error.stack,
      requestBody: req.body,
    });
    next(error);
  }
}

/**
 * Enhance Coordinator response with LLM
 * @param {string} query - User's question
 * @param {object} coordinatorData - Data from Coordinator
 * @param {string} source - Source microservice (Assessment, DevLab)
 * @returns {Promise<string>} - Enhanced answer
 */
async function enhanceWithLLM(query, coordinatorData, source) {
  try {
    // Build context from Coordinator data
    let context = '';

    if (Array.isArray(coordinatorData)) {
      context = coordinatorData.map((item, index) => {
        return `${index + 1}. ${JSON.stringify(item)}`;
      }).join('\n');
    } else if (typeof coordinatorData === 'object') {
      context = JSON.stringify(coordinatorData, null, 2);
    } else {
      context = String(coordinatorData);
    }

    // Build prompt
    const systemPrompt = `You are a helpful AI assistant embedded in the ${source} microservice.
Your job is to answer user questions using the context provided by the ${source} system.

Context from ${source}:
${context}

Provide a clear, concise, and helpful answer based on this context.`;

    const userPrompt = query;

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const enhancedAnswer = completion.choices[0].message.content;

    logger.info('[LLM Enhancement] Answer enhanced', {
      source,
      original_length: context.length,
      enhanced_length: enhancedAnswer.length,
    });

    return enhancedAnswer;
  } catch (error) {
    logger.error('[LLM Enhancement] Failed to enhance answer', {
      error: error.message,
      source,
    });

    // Return original data if LLM fails
    return typeof coordinatorData === 'string'
      ? coordinatorData
      : JSON.stringify(coordinatorData);
  }
}

