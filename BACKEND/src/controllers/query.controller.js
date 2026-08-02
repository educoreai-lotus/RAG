/**
 * Query Controller
 * Handles REST API requests for query processing
 */

import { processQuery } from '../services/queryProcessing.service.js';
import { assessmentSupport, devlabSupport } from './microserviceSupport.controller.js';
import { validate, schemas } from '../utils/validation.util.js';
import { logger } from '../utils/logger.util.js';
import { validateAndFixTenantId, logTenantAtEntryPoint } from '../utils/tenant-validation.util.js';
import {
  evaluateAuthorizationPolicy,
  logAuthorizationPolicyDecision,
} from '../services/authorizationPolicy.service.js';
import { isGuestChatEnabled, GUEST_SOURCE_SERVICE, isExplicitGuestRequest } from '../config/guestChat.config.js';
import {
  applyGuestAnswerGate,
  buildGuestDisabledResponse,
} from '../services/guestAnswerGate.service.js';
import {
  createCrossHostTraceContext,
  emitCrossHostTrace,
  setCrossHostTraceHeader,
  fingerprintSha256,
  classifyTenantSource,
  safeCandidateMetadataKeys,
  inferCandidateOrigin,
} from '../utils/crossHostTrace.util.js';
import Joi from 'joi';

/**
 * Generate a unique conversation ID
 * Format: conv-{timestamp}-{random}
 * @returns {string} Unique conversation identifier
 */
function generateConversationId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `conv-${timestamp}-${random}`;
}

/**
 * Query request validation schema
 */
const queryRequestSchema = Joi.object({
  query: schemas.query, // Now max(2000) instead of max(1000)
  tenant_id: Joi.string().min(1).default('default'),
  conversation_id: Joi.string().optional(), // Optional conversation identifier for multi-turn conversations
  // Phase 2: preserve host microservice label (optional; no enum/enforcement)
  source_service: Joi.string().trim().max(100).optional(),
  // Explicit guest response-handling marker (default false; does not grant access)
  guest_mode: Joi.boolean().default(false),
  context: Joi.object({
    user_id: schemas.userId, // Now default('anonymous') instead of required
    session_id: schemas.sessionId,
    role: Joi.string().valid('admin', 'administrator', 'hr', 'manager', 'trainer', 'employee', 'user', 'learner', 'anonymous', 'guest').optional(),
    tags: Joi.array().items(Joi.string()).optional(),
  }).optional().default({}), // CRITICAL FIX: default empty object if not provided
  options: Joi.object({
    max_results: Joi.number().integer().min(1).max(20).default(5),
    min_confidence: Joi.number().min(0).max(1).default(0.7),
    include_metadata: Joi.boolean().default(true),
  }).optional().default({}), // CRITICAL FIX: default empty object if not provided
});

/**
 * POST /api/v1/query
 * Process a RAG query
 */
export async function submitQuery(req, res, next) {
  try {
    // CRITICAL: Set CORS headers for CHAT MODE (same as SUPPORT MODE)
    const origin = req.headers.origin;

    // Log request details for debugging
    logger.info('Query request received', {
      method: req.method,
      path: req.path,
      origin: origin || 'NO ORIGIN',
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
    });

    if (origin && typeof origin === 'string') {
      // Allow all Vercel origins (same as SUPPORT MODE)
      if (/^https:\/\/.*\.vercel\.app$/.test(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      } else if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        // Allow localhost for development
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      } else {
        // Check ALLOWED_ORIGINS environment variable
        const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          // If no whitelist or origin is in whitelist, allow it
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Access-Control-Allow-Credentials', 'true');
        } else {
          // Origin not in whitelist - still set header for CORS error visibility
          res.setHeader('Access-Control-Allow-Origin', origin);
        }
      }
    }

    // Header/metadata based support-mode routing (no keyword detection)
    const headerSource = (req.headers['x-source'] || req.headers['x-microservice-source'] || '').toString().toLowerCase();
    const metaSource = (req.body?.metadata?.source || '').toString().toLowerCase();
    const supportModeFlag = (req.body?.support_mode || '').toString().toLowerCase();

    // Hardened gating: support mode must be explicitly enabled and authorized
    const supportEnabled = (process.env.SUPPORT_MODE_ENABLED || '').toLowerCase() === 'true';
    const sharedSecret = process.env.SUPPORT_SHARED_SECRET || '';
    const providedSecret = (req.headers['x-embed-secret'] || '').toString();
    // Use origin already defined above (line 51)
    const originStr = origin ? origin.toString() : '';
    const allowedOrigins = (process.env.SUPPORT_ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const originAllowed = allowedOrigins.length === 0 || (originStr && allowedOrigins.includes(originStr));
    const secretOk = !sharedSecret || providedSecret === sharedSecret;

    const supportAuthorized = supportEnabled && originAllowed && secretOk;

    if (supportAuthorized) {
      if (headerSource === 'assessment' || metaSource === 'assessment' || supportModeFlag === 'assessment') {
        logger.info('Routing to Assessment Support (authorized + header/metadata/flag matched)', {
          headerSource,
          metaSource,
          supportModeFlag,
          origin: originStr,
          originAllowed,
          hasSecret: !!providedSecret,
        });
        return assessmentSupport(req, res, next);
      }
      if (headerSource === 'devlab' || metaSource === 'devlab' || supportModeFlag === 'devlab') {
        logger.info('Routing to DevLab Support (authorized + header/metadata/flag matched)', {
          headerSource,
          metaSource,
          supportModeFlag,
          origin: originStr,
          originAllowed,
          hasSecret: !!providedSecret,
        });
        return devlabSupport(req, res, next);
      }
    } else if (headerSource === 'assessment' || headerSource === 'devlab' || metaSource === 'assessment' || metaSource === 'devlab' || supportModeFlag === 'assessment' || supportModeFlag === 'devlab') {
      logger.warn('Support-mode signal ignored (not enabled/authorized)', {
        headerSource,
        metaSource,
        supportModeFlag,
        supportEnabled,
        origin: originStr,
        originAllowed,
        secretProvided: !!providedSecret,
      });
    }

    // Validate request body
    const validation = validate(req.body, queryRequestSchema);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation error',
        message: validation.error,
      });
    }

    const { query, tenant_id, conversation_id, context = {}, options = {}, source_service, guest_mode } = validation.value;

    // Diagnostic only: optional cross-host trace (no-op when flag disabled)
    const crossHostTrace = createCrossHostTraceContext(query);
    setCrossHostTraceHeader(res, crossHostTrace);

    // CRITICAL: Validate and fix tenant_id at entry point
    // Priority: req.tenantId (from auth middleware) > tenant_id from body > default
    // This ensures we use the tenant_id from authentication (e.g., dummy token) if available
    let validatedTenantId = req.tenantId || tenant_id;
    if (!validatedTenantId || validatedTenantId === 'default.local') {
      // If tenant_id is 'default.local' or empty, resolve to correct tenant
      validatedTenantId = validateAndFixTenantId(validatedTenantId || 'default.local');
    } else {
      // Validate and auto-correct any wrong tenant IDs
      validatedTenantId = validateAndFixTenantId(validatedTenantId);
    }

    // Log tenant information at entry point for debugging
    logTenantAtEntryPoint(req, validatedTenantId);

    // Extract user_id from token if not provided
    const user_id = context.user_id || req.user?.id || 'anonymous';
    const session_id = context.session_id || req.session?.id;

    // Extract user role from headers or context
    const user_role = context.role || req.headers['x-user-role'] || req.user?.role || null;

    // Phase 2: preserve source_service for future policy (log-only; no enforcement)
    const sourceService = source_service || null;
    // Single-line JSON so Railway shows the full object in the message
    logger.info(`[SourceService] received ${JSON.stringify({
      source_service: sourceService || undefined,
      route: req.originalUrl || req.path,
      method: req.method,
      hasVerifiedAuth: !!req.auth,
      authValid: req.auth?.valid,
      authPrimaryRole: req.auth?.primaryRole || undefined,
      authIsSystemAdmin: req.auth?.isSystemAdmin,
      authIsTrainer: req.auth?.isTrainer,
      guest_mode: guest_mode === true,
    })}`);

    // Phase 3: evaluate authorization policy in log-only mode (never blocks)
    const authorizationPolicy = evaluateAuthorizationPolicy({
      auth: req.auth || null,
      sourceService,
      query,
      route: req.originalUrl || req.path,
      method: req.method,
    });
    req.authorizationPolicy = authorizationPolicy;
    logAuthorizationPolicyDecision(authorizationPolicy);

    // Generate conversation_id if not provided
    const finalConversationId = conversation_id || generateConversationId();

    if (!conversation_id) {
      logger.info('Generated new conversation_id', {
        conversation_id: finalConversationId,
        user_id,
      });
    } else {
      logger.info('Using provided conversation_id', {
        conversation_id: finalConversationId,
        user_id,
      });
    }

    // Process the query
    logger.info('Routing to normal chatbot flow (no support-mode signal found)', {
      headerSource,
      metaSource,
      supportModeFlag,
      conversation_id: finalConversationId,
      source_service: sourceService || undefined,
    });

    const hasVerifiedAuth = req.auth?.valid === true;
    const verifiedAuthContext = {
      isAuthenticated: hasVerifiedAuth,
      directoryUserId: hasVerifiedAuth ? req.auth.directoryUserId || null : null,
      organizationId: hasVerifiedAuth ? req.auth.organizationId || null : null,
      primaryRole: hasVerifiedAuth ? req.auth.primaryRole || null : null,
      isSystemAdmin: hasVerifiedAuth && req.auth.isSystemAdmin === true,
      isTrainer: hasVerifiedAuth && req.auth.isTrainer === true,
    };

    // Explicit guest final-answer gate selection (never when authenticated)
    const isExplicitGuestRequestFlag = isExplicitGuestRequest({
      guestMode: guest_mode === true,
      sourceService,
      isAuthenticated: verifiedAuthContext.isAuthenticated === true,
    });

    const optionMaxResults =
      typeof options?.max_results === 'number' ? options.max_results : null;
    const optionMinConfidence =
      typeof options?.min_confidence === 'number' ? options.min_confidence : null;
    const optionIncludeMetadata =
      typeof options?.include_metadata === 'boolean' ? options.include_metadata : null;

    emitCrossHostTrace(crossHostTrace, {
      stage: 'request_classified',
      query_sha256: crossHostTrace?.queryHash || fingerprintSha256(query),
      source_service: sourceService || null,
      guest_mode_requested: guest_mode === true,
      explicit_guest: isExplicitGuestRequestFlag,
      authenticated: verifiedAuthContext.isAuthenticated === true,
      user_scope: verifiedAuthContext.isAuthenticated === true ? 'authenticated' : 'anonymous',
      tenant_source: classifyTenantSource({
        bodyTenantId: req.body?.tenant_id,
        hasAuthTenant: Boolean(req.tenantId),
        hasHeaderTenant: Boolean(req.headers?.['x-tenant-id']),
      }),
      tenant_fingerprint: fingerprintSha256(validatedTenantId),
      max_results: optionMaxResults,
      min_confidence: optionMinConfidence,
      include_metadata: optionIncludeMetadata,
    });

    if (isExplicitGuestRequestFlag && !isGuestChatEnabled()) {
      logger.info('[GuestChat] Guest request while GUEST_CHAT_ENABLED=false', {
        flow: 'guest_chat_disabled',
        guest: true,
        source_service: GUEST_SOURCE_SERVICE,
      });
      const disabledResponse = buildGuestDisabledResponse(query);
      const disabledAnswer =
        typeof disabledResponse?.answer === 'string' ? disabledResponse.answer : '';
      emitCrossHostTrace(crossHostTrace, {
        stage: 'final_response',
        final_answer_owner: 'guest_disabled',
        final_answer_length: disabledAnswer.length,
        final_answer_sha256: fingerprintSha256(disabledAnswer),
        final_sources_count: Array.isArray(disabledResponse?.sources)
          ? disabledResponse.sources.length
          : null,
        final_confidence:
          typeof disabledResponse?.confidence === 'number' ? disabledResponse.confidence : null,
        candidate_sha256: null,
        final_differs_from_candidate: false,
      });
      return res.json(disabledResponse);
    }

    const result = await processQuery({
      query,
      tenant_id: validatedTenantId, // Use validated tenant ID
      context: {
        ...context,
        user_id,
        session_id,
        role: user_role, // Pass role through context
        // Phase 2: available for future policy; processQuery does not act on it yet
        ...(sourceService ? { source_service: sourceService } : {}),
      },
      options,
      conversation_id: finalConversationId, // Pass conversation_id to processQuery
      verifiedAuthContext,
      ...(crossHostTrace ? { crossHostTrace } : {}),
    });

    const candidateAnswer =
      typeof result?.answer === 'string'
        ? result.answer
        : typeof result?.response === 'string'
          ? result.response
          : '';
    const candidateSha = fingerprintSha256(candidateAnswer);

    emitCrossHostTrace(crossHostTrace, {
      stage: 'candidate_ready',
      candidate_length: candidateAnswer.length,
      candidate_sha256: candidateSha,
      candidate_empty: candidateAnswer.length === 0,
      candidate_origin: inferCandidateOrigin(result),
      candidate_sources_count: Array.isArray(result?.sources) ? result.sources.length : null,
      candidate_confidence: typeof result?.confidence === 'number' ? result.confidence : null,
      candidate_metadata_keys: safeCandidateMetadataKeys(result?.metadata),
    });

    if (isExplicitGuestRequestFlag) {
      logger.info('[GuestChat] Applying final guest answer gate', {
        flow: 'guest_final_answer_gate',
        guest: true,
        source_service: GUEST_SOURCE_SERVICE,
        candidate_answer_length: candidateAnswer.length,
      });

      const guestResponse = await applyGuestAnswerGate({
        query,
        candidateAnswer,
        ...(crossHostTrace ? { crossHostTrace } : {}),
      });

      const finalAnswer =
        typeof guestResponse?.answer === 'string' ? guestResponse.answer : '';
      const finalSha = fingerprintSha256(finalAnswer);
      const gateMeta = crossHostTrace?._gateResult || null;
      let finalOwner = 'unknown';
      if (gateMeta?.decision === 'allow') {
        finalOwner = 'guest_gate_allow';
      } else if (gateMeta?.decision === 'deny') {
        finalOwner = 'guest_static_deny';
      } else if (gateMeta?.decision === 'fail_closed') {
        finalOwner = 'guest_fail_closed';
      } else if (guestResponse?.metadata?.flow === 'guest_permission_denied') {
        finalOwner = 'guest_static_deny';
      } else if (guestResponse?.metadata?.flow === 'guest_chat_disabled') {
        finalOwner = 'guest_disabled';
      }

      emitCrossHostTrace(crossHostTrace, {
        stage: 'final_response',
        final_answer_owner: finalOwner,
        final_answer_length: finalAnswer.length,
        final_answer_sha256: finalSha,
        final_sources_count: Array.isArray(guestResponse?.sources)
          ? guestResponse.sources.length
          : null,
        final_confidence:
          typeof guestResponse?.confidence === 'number' ? guestResponse.confidence : null,
        candidate_sha256: candidateSha,
        final_differs_from_candidate: finalSha !== candidateSha,
      });

      return res.json(guestResponse);
    }

    // Return response - ensure it's JSON serializable
    try {
      // Validate that result can be serialized to JSON
      JSON.stringify(result);
      const finalAnswer =
        typeof result?.answer === 'string'
          ? result.answer
          : typeof result?.response === 'string'
            ? result.response
            : '';
      const finalSha = fingerprintSha256(finalAnswer);
      emitCrossHostTrace(crossHostTrace, {
        stage: 'final_response',
        final_answer_owner: 'process_query',
        final_answer_length: finalAnswer.length,
        final_answer_sha256: finalSha,
        final_sources_count: Array.isArray(result?.sources) ? result.sources.length : null,
        final_confidence: typeof result?.confidence === 'number' ? result.confidence : null,
        candidate_sha256: candidateSha,
        final_differs_from_candidate: finalSha !== candidateSha,
      });
      res.json(result);
    } catch (jsonError) {
      logger.error('JSON serialization error', {
        error: jsonError.message,
        result_keys: Object.keys(result || {}),
        result_answer_preview: result?.answer?.substring(0, 100),
      });

      emitCrossHostTrace(crossHostTrace, {
        stage: 'final_response',
        final_answer_owner: 'error',
        final_answer_length: 0,
        final_answer_sha256: fingerprintSha256(''),
        final_sources_count: null,
        final_confidence: null,
        candidate_sha256: candidateSha,
        final_differs_from_candidate: true,
      });

      // Return a safe error response
      res.status(500).json({
        error: 'Response serialization error',
        message: 'An error occurred while processing your query. Please try again.',
        details: process.env.NODE_ENV === 'development' ? jsonError.message : undefined,
      });
    }
  } catch (error) {
    // CRITICAL: Comprehensive error logging for debugging 500 errors
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('🚨 [QUERY CONTROLLER] ERROR CAUGHT:');
    console.error('🚨 Error name:', error.name);
    console.error('🚨 Error message:', error.message);
    console.error('🚨 Error stack:', error.stack);
    console.error('🚨 Request method:', req.method);
    console.error('🚨 Request URL:', req.originalUrl);
    console.error('🚨 Request path:', req.path);
    console.error('🚨 Request origin:', req.headers.origin || 'NO ORIGIN');
    console.error('🚨 Request body:', JSON.stringify(req.body, null, 2));
    console.error('🚨 Request headers:', JSON.stringify(req.headers, null, 2));
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    logger.error('Query controller error', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      url: req.originalUrl,
      method: req.method,
      origin: req.headers.origin,
      body: req.body,
    });

    // Set CORS headers even on error
    const errorOrigin = req.headers.origin;
    if (errorOrigin && typeof errorOrigin === 'string') {
      if (/^https:\/\/.*\.vercel\.app$/.test(errorOrigin) ||
          errorOrigin.includes('localhost') ||
          errorOrigin.includes('127.0.0.1')) {
        res.setHeader('Access-Control-Allow-Origin', errorOrigin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    }

    next(error);
  }
}

