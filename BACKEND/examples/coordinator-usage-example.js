/**
 * Coordinator Integration Usage Examples
 * 
 * This file demonstrates how to use the Coordinator gRPC integration
 * in various scenarios.
 */

import { routeRequest, getMetrics, isCoordinatorAvailable } from '../src/clients/coordinator.client.js';
import { 
  parseRouteResponse, 
  extractBusinessData,
  getRoutingSummary,
  isAllFailed,
  isFallbackUsed,
  getQualityAssessment
} from '../src/services/coordinatorResponseParser.service.js';
import { 
  callCoordinatorRoute,
  processCoordinatorResponse 
} from '../src/communication/communicationManager.service.js';
import { logger } from '../src/utils/logger.util.js';
import * as grpc from '@grpc/grpc-js';

/**
 * Example 1: Basic Route Request
 */
export async function exampleBasicRouteRequest() {
  console.log('\n=== Example 1: Basic Route Request ===');
  
  try {
    const response = await routeRequest({
      tenant_id: 'org-123',
      user_id: 'user-456',
      query_text: 'Show me my recent payments',
      metadata: {
        session_id: 'abc-xyz',
        source: 'web_app'
      }
    });

    if (response) {
      console.log('Response received:');
      console.log('  Target Services:', response.target_services);
      console.log('  Normalized Fields:', Object.keys(response.normalized_fields || {}));
    } else {
      console.log('No response from Coordinator');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

/**
 * Example 2: Parse and Use Response
 */
export async function exampleParseResponse() {
  console.log('\n=== Example 2: Parse and Use Response ===');
  
  const response = await routeRequest({
    tenant_id: 'org-123',
    user_id: 'user-456',
    query_text: 'Show me my recent payments'
  });

  if (!response) {
    console.log('No response from Coordinator');
    return;
  }

  // Parse response
  const parsed = parseRouteResponse(response);
  if (!parsed) {
    console.log('Failed to parse response');
    return;
  }

  console.log('Parsed Response:');
  console.log('  Status:', parsed.status);
  console.log('  Success:', parsed.success);
  console.log('  Successful Service:', parsed.successful_service);
  console.log('  Rank Used:', parsed.rank_used);
  console.log('  Quality Score:', parsed.quality_score);
  console.log('  Processing Time:', parsed.processing_time_ms + 'ms');

  // Extract business data
  const businessData = extractBusinessData(parsed);
  console.log('\nBusiness Data:');
  console.log('  Data:', businessData.data);
  console.log('  Sources:', businessData.sources.length);
  console.log('  Metadata:', businessData.metadata);

  // Get routing summary
  const summary = getRoutingSummary(parsed);
  console.log('\nRouting Summary:');
  console.log('  Message:', summary.message);
}

/**
 * Example 3: Handle Success Scenarios
 */
export async function exampleHandleSuccessScenarios() {
  console.log('\n=== Example 3: Handle Success Scenarios ===');
  
  const response = await routeRequest({
    tenant_id: 'org-123',
    user_id: 'user-456',
    query_text: 'Show me my recent payments'
  });

  if (!response) {
    console.log('No response from Coordinator');
    return;
  }

  const parsed = parseRouteResponse(response);

  // Check scenario
  if (parsed.status === 'success_primary') {
    console.log('✅ Primary service succeeded');
    console.log('  Service:', parsed.successful_service);
    console.log('  Quality:', parsed.quality_score);
    console.log('  Confidence:', parsed.primary_confidence);
    
    // Use high-quality data from primary service
    const businessData = extractBusinessData(parsed);
    return businessData.data;
    
  } else if (parsed.status === 'success_fallback') {
    console.log('⚠️ Fallback service succeeded');
    console.log('  Service:', parsed.successful_service);
    console.log('  Rank Used:', parsed.rank_used);
    console.log('  Total Attempts:', parsed.total_attempts);
    console.log('  Quality:', parsed.quality_score);
    
    // Use fallback data (might be lower quality)
    const businessData = extractBusinessData(parsed);
    return businessData.data;
    
  } else if (parsed.status === 'all_failed') {
    console.log('❌ All services failed');
    console.log('  Attempted Services:', parsed.target_services);
    console.log('  Total Attempts:', parsed.total_attempts);
    
    // Handle failure - use internal data or return error
    return null;
  }
}

/**
 * Example 4: Error Handling
 */
export async function exampleErrorHandling() {
  console.log('\n=== Example 4: Error Handling ===');
  
  try {
    const response = await routeRequest({
      tenant_id: 'org-123',
      user_id: 'user-456',
      query_text: 'Show me my recent payments'
    });

    if (!response) {
      // Coordinator unavailable or returned null
      console.log('Coordinator unavailable, using fallback');
      return handleFallback();
    }

    const parsed = parseRouteResponse(response);
    if (!parsed) {
      console.log('Failed to parse response');
      return handleFallback();
    }

    return parsed;
    
  } catch (error) {
    // Handle gRPC errors
    if (error.code === grpc.status.DEADLINE_EXCEEDED) {
      console.error('❌ Request timed out');
      console.error('  Consider increasing GRPC_TIMEOUT');
      return handleTimeout();
      
    } else if (error.code === grpc.status.UNAVAILABLE) {
      console.error('❌ Coordinator service unavailable');
      console.error('  Check if Coordinator is running');
      return handleUnavailable();
      
    } else if (error.code === grpc.status.NOT_FOUND) {
      console.error('❌ Coordinator service not found');
      console.error('  Check COORDINATOR_URL and COORDINATOR_GRPC_PORT');
      return handleNotFound();
      
    } else if (error.code === grpc.status.INVALID_ARGUMENT) {
      console.error('❌ Invalid request');
      console.error('  Check request parameters');
      return handleInvalidRequest();
      
    } else {
      console.error('❌ Unexpected error:', error.message);
      return handleError(error);
    }
  }
}

/**
 * Example 5: Using Communication Manager (Recommended)
 */
export async function exampleUsingCommunicationManager() {
  console.log('\n=== Example 5: Using Communication Manager ===');
  
  // Communication Manager includes decision logic and processing
  const response = await callCoordinatorRoute({
    tenant_id: 'org-123',
    user_id: 'user-456',
    query_text: 'Show me my recent payments',
    metadata: {
      category: 'payment',
      source: 'rag_fallback',
      vector_results_count: 0
    }
  });

  if (!response) {
    console.log('No response from Coordinator');
    return null;
  }

  // Process response (includes parsing and extraction)
  const processed = processCoordinatorResponse(response);
  if (!processed) {
    console.log('Failed to process response');
    return null;
  }

  console.log('Processed Response:');
  console.log('  Status:', processed.status);
  console.log('  Success:', processed.success);
  console.log('  Successful Service:', processed.successful_service);
  console.log('  Rank Used:', processed.rank_used);
  console.log('  Quality Score:', processed.quality_score);
  console.log('  Business Data Available:', !!processed.business_data);
  console.log('  Sources Count:', processed.sources.length);

  if (processed.success) {
    return {
      data: processed.business_data,
      sources: processed.sources,
      metadata: processed.metadata
    };
  } else {
    console.log('All services failed');
    return null;
  }
}

/**
 * Example 6: Quality Assessment
 */
export async function exampleQualityAssessment() {
  console.log('\n=== Example 6: Quality Assessment ===');
  
  const response = await routeRequest({
    tenant_id: 'org-123',
    user_id: 'user-456',
    query_text: 'Show me my recent payments'
  });

  if (!response) {
    return null;
  }

  const parsed = parseRouteResponse(response);
  if (!parsed) {
    return null;
  }

  // Get quality assessment
  const quality = getQualityAssessment(parsed);
  console.log('Quality Assessment:');
  console.log('  Level:', quality.level);
  console.log('  Score:', quality.score);
  console.log('  Acceptable:', quality.acceptable);

  // Use quality to decide if data is usable
  if (quality.acceptable) {
    const businessData = extractBusinessData(parsed);
    return businessData.data;
  } else {
    console.log('Quality too low, using fallback');
    return null;
  }
}

/**
 * Example 7: Monitoring and Metrics
 */
export async function exampleMonitoring() {
  console.log('\n=== Example 7: Monitoring and Metrics ===');
  
  // Check availability
  const available = await isCoordinatorAvailable();
  console.log('Coordinator Available:', available);

  // Make some requests
  await routeRequest({
    tenant_id: 'org-123',
    user_id: 'user-456',
    query_text: 'Test query 1'
  });

  await routeRequest({
    tenant_id: 'org-123',
    user_id: 'user-456',
    query_text: 'Test query 2'
  });

  // Get metrics
  const metrics = getMetrics();
  console.log('\nMetrics:');
  console.log('  Total Requests:', metrics.totalRequests);
  console.log('  Successful Requests:', metrics.successfulRequests);
  console.log('  Failed Requests:', metrics.failedRequests);
  console.log('  Fallback Requests:', metrics.fallbackRequests);
  console.log('  Success Rate:', metrics.successRate + '%');
  console.log('  Fallback Rate:', metrics.fallbackRate + '%');
  console.log('  Average Processing Time:', metrics.averageProcessingTimeMs + 'ms');
  console.log('  Services Used:', metrics.servicesUsed);
  console.log('  Errors by Code:', metrics.errorsByCode);
}

/**
 * Example 8: Helper Functions
 */
export async function exampleHelperFunctions() {
  console.log('\n=== Example 8: Helper Functions ===');
  
  const response = await routeRequest({
    tenant_id: 'org-123',
    user_id: 'user-456',
    query_text: 'Show me my recent payments'
  });

  if (!response) {
    return;
  }

  const parsed = parseRouteResponse(response);

  // Check if all failed
  if (isAllFailed(parsed)) {
    console.log('All services failed');
    return handleFailure();
  }

  // Check if fallback was used
  if (isFallbackUsed(parsed)) {
    console.log('Fallback service was used');
    console.log('  Rank:', parsed.rank_used);
    // Might want to log this for monitoring
  }

  // Get routing summary
  const summary = getRoutingSummary(parsed);
  console.log('Routing Summary:', summary.message);
}

/**
 * Example 9: Complete Integration Flow
 */
export async function exampleCompleteFlow() {
  console.log('\n=== Example 9: Complete Integration Flow ===');
  
  const tenantId = 'org-123';
  const userId = 'user-456';
  const query = 'Show me my recent payments';

  try {
    // Step 1: Check if Coordinator is available
    const available = await isCoordinatorAvailable();
    if (!available) {
      console.log('Coordinator not available, using internal data');
      return useInternalData(query);
    }

    // Step 2: Make route request
    const response = await routeRequest({
      tenant_id: tenantId,
      user_id: userId,
      query_text: query,
      metadata: {
        session_id: 'session-123',
        source: 'web_app',
        timestamp: new Date().toISOString()
      }
    });

    if (!response) {
      console.log('No response from Coordinator');
      return useInternalData(query);
    }

    // Step 3: Parse response
    const parsed = parseRouteResponse(response);
    if (!parsed) {
      console.log('Failed to parse response');
      return useInternalData(query);
    }

    // Step 4: Check status
    if (parsed.status === 'all_failed') {
      console.log('All services failed');
      return useInternalData(query);
    }

    // Step 5: Assess quality
    const quality = getQualityAssessment(parsed);
    if (!quality.acceptable) {
      console.log('Quality too low, using internal data');
      return useInternalData(query);
    }

    // Step 6: Extract business data
    const businessData = extractBusinessData(parsed);
    
    // Step 7: Log routing summary
    const summary = getRoutingSummary(parsed);
    logger.info('Coordinator routing complete', summary);

    // Step 8: Return data
    return {
      data: businessData.data,
      sources: businessData.sources,
      metadata: {
        ...businessData.metadata,
        routing_summary: summary
      }
    };

  } catch (error) {
    logger.error('Error in Coordinator integration', {
      error: error.message,
      tenant_id: tenantId,
      user_id: userId
    });
    return useInternalData(query);
  }
}

// Helper functions
function handleFallback() {
  console.log('Using fallback data');
  return null;
}

function handleTimeout() {
  console.log('Handling timeout');
  return null;
}

function handleUnavailable() {
  console.log('Handling unavailable service');
  return null;
}

function handleNotFound() {
  console.log('Handling service not found');
  return null;
}

function handleInvalidRequest() {
  console.log('Handling invalid request');
  return null;
}

function handleError(error) {
  console.log('Handling error:', error.message);
  return null;
}

function handleFailure() {
  console.log('Handling failure');
  return null;
}

function useInternalData(query) {
  console.log('Using internal data for query:', query);
  return { data: null, sources: [], metadata: {} };
}

// Run examples
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running Coordinator Integration Examples...\n');
  
  // Uncomment to run specific examples
  // exampleBasicRouteRequest();
  // exampleParseResponse();
  // exampleHandleSuccessScenarios();
  // exampleErrorHandling();
  // exampleUsingCommunicationManager();
  // exampleQualityAssessment();
  // exampleMonitoring();
  // exampleHelperFunctions();
  // exampleCompleteFlow();
}


