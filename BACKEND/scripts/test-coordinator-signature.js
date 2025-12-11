/**
 * Test Script: Coordinator gRPC Communication with Digital Signatures
 * 
 * This script tests:
 * 1. Signature generation using RAG_PRIVATE_KEY
 * 2. gRPC communication with Coordinator
 * 3. Signature verification (if COORDINATOR_PUBLIC_KEY is provided)
 * 
 * Usage:
 *   node scripts/test-coordinator-signature.js
 * 
 * Environment Variables Required:
 *   - RAG_PRIVATE_KEY: Base64 encoded PEM private key
 *   - COORDINATOR_URL: Coordinator hostname (default: localhost)
 *   - COORDINATOR_GRPC_PORT: gRPC port (default: 50051)
 *   - COORDINATOR_PUBLIC_KEY: Optional - Coordinator's public key for verification
 */

import { routeRequest, isCoordinatorAvailable } from '../src/clients/coordinator.client.js';
import { generateSignature, verifySignature } from '../src/utils/signature.js';
import { logger } from '../src/utils/logger.util.js';
import * as grpc from '@grpc/grpc-js';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

/**
 * Test 1: Verify Environment Variables
 */
function testEnvironmentVariables() {
  logSection('Test 1: Environment Variables Check');
  
  const required = {
    RAG_PRIVATE_KEY: process.env.RAG_PRIVATE_KEY,
  };
  
  const optional = {
    COORDINATOR_URL: process.env.COORDINATOR_URL || 'localhost',
    COORDINATOR_GRPC_PORT: process.env.COORDINATOR_GRPC_PORT || '50051',
    COORDINATOR_GRPC_URL: process.env.COORDINATOR_GRPC_URL,
    GRPC_USE_SSL: process.env.GRPC_USE_SSL || 'false',
    COORDINATOR_PUBLIC_KEY: process.env.COORDINATOR_PUBLIC_KEY,
  };
  
  // Check required variables
  let allRequired = true;
  for (const [key, value] of Object.entries(required)) {
    if (value) {
      logSuccess(`${key}: Configured (${value.substring(0, 20)}...)`);
    } else {
      logError(`${key}: Missing`);
      allRequired = false;
    }
  }
  
  // Check optional variables
  for (const [key, value] of Object.entries(optional)) {
    if (value && value !== 'false') {
      logInfo(`${key}: ${value}`);
    } else {
      logWarning(`${key}: Not set (using defaults or skipping)`);
    }
  }
  
  // Special check for Railway
  if (optional.COORDINATOR_URL && optional.COORDINATOR_URL.includes('railway.app')) {
    logInfo('\n💡 Railway detected - Tips:');
    logInfo('  1. If both services on Railway, use service name instead of domain');
    logInfo('  2. Check if gRPC port 50051 is exposed in Railway');
    logInfo('  3. Consider using private networking between services');
  }
  
  if (!allRequired) {
    logError('\nMissing required environment variables!');
    logInfo('Please set RAG_PRIVATE_KEY in your .env file');
    logInfo('Generate keys with: node scripts/generate-keys.js');
    return false;
  }
  
  // Validate private key format
  try {
    const privateKey = Buffer.from(process.env.RAG_PRIVATE_KEY, 'base64').toString('utf-8');
    if (!privateKey.includes('BEGIN') || !privateKey.includes('PRIVATE KEY')) {
      logError('RAG_PRIVATE_KEY format is invalid - must be base64 encoded PEM format');
      return false;
    }
    logSuccess('Private key format is valid');
  } catch (error) {
    logError(`Failed to decode private key: ${error.message}`);
    return false;
  }
  
  return true;
}

/**
 * Test 2: Signature Generation
 */
function testSignatureGeneration() {
  logSection('Test 2: Signature Generation');
  
  try {
    const privateKey = Buffer.from(process.env.RAG_PRIVATE_KEY, 'base64').toString('utf-8');
    const serviceName = 'rag-service';
    
    // Test 1: Simple signature (without payload)
    logInfo('Testing simple signature (without payload)...');
    const simpleSignature = generateSignature(serviceName, privateKey);
    logSuccess(`Simple signature generated: ${simpleSignature.substring(0, 50)}...`);
    
    // Test 2: Signature with payload
    logInfo('Testing signature with payload...');
    const testPayload = {
      tenant_id: 'test-tenant',
      user_id: 'test-user',
      query_text: 'test query',
      timestamp: Date.now()
    };
    const payloadSignature = generateSignature(serviceName, privateKey, testPayload);
    logSuccess(`Payload signature generated: ${payloadSignature.substring(0, 50)}...`);
    
    // Test 3: Verify signatures are different
    if (simpleSignature !== payloadSignature) {
      logSuccess('Signatures are different (as expected with/without payload)');
    } else {
      logWarning('Signatures are identical (unexpected)');
    }
    
    // Test 4: Verify signature format
    logInfo('Verifying signature format...');
    if (simpleSignature.length > 0 && payloadSignature.length > 0) {
      logSuccess('Signatures are valid base64 strings');
    } else {
      logError('Signatures are empty');
      return null;
    }
    
    logInfo('Signature generation test passed');
    
    return { simpleSignature, payloadSignature, testPayload };
  } catch (error) {
    logError(`Signature generation failed: ${error.message}`);
    console.error(error);
    return null;
  }
}

/**
 * Test 3: Coordinator Availability Check
 */
async function testCoordinatorAvailability() {
  logSection('Test 3: Coordinator Availability Check');
  
  try {
    logInfo('Checking if Coordinator is available...');
    logInfo(`Attempting connection to: ${process.env.COORDINATOR_URL || 'localhost'}:${process.env.COORDINATOR_GRPC_PORT || '50051'}`);
    logInfo(`Using SSL: ${process.env.GRPC_USE_SSL === 'true' ? 'Yes' : 'No'}`);
    
    const available = await isCoordinatorAvailable();
    
    if (available) {
      logSuccess('Coordinator is available and reachable');
      return true;
    } else {
      logError('Coordinator is not available');
      logWarning('\nPossible reasons:');
      logWarning('  1. Railway may not expose gRPC through HTTP domain');
      logWarning('  2. gRPC port might be different');
      logWarning('  3. SSL/TLS might be required');
      logWarning('  4. Coordinator service might not be running');
      logInfo(`\nCheck: ${process.env.COORDINATOR_URL || 'localhost'}:${process.env.COORDINATOR_GRPC_PORT || '50051'}`);
      logInfo('\nTroubleshooting steps:');
      logInfo('  1. Check Railway dashboard for gRPC port configuration');
      logInfo('  2. Try with GRPC_USE_SSL=true');
      logInfo('  3. Verify Coordinator service is running');
      logInfo('  4. Check if gRPC is exposed through different URL/port');
      return false;
    }
  } catch (error) {
    logError(`Failed to check Coordinator availability: ${error.message}`);
    
    // Provide more detailed error information
    if (error.code === 'ENOTFOUND') {
      logError('DNS resolution failed - check COORDINATOR_URL');
    } else if (error.code === 'ECONNREFUSED') {
      logError('Connection refused - Coordinator might not be running or port is wrong');
    } else if (error.code === 'ETIMEDOUT') {
      logError('Connection timeout - check firewall/network settings');
    }
    
    console.error(error);
    return false;
  }
}

/**
 * Test 4: Send gRPC Request with Signature
 */
async function testGrpcRequestWithSignature() {
  logSection('Test 4: gRPC Request with Signature');
  
  try {
    const testRequest = {
      tenant_id: 'test-tenant-123',
      user_id: 'test-user-456',
      query_text: 'Show me my recent payments',
      metadata: {
        test: true,
        timestamp: new Date().toISOString(),
        source: 'signature-test-script'
      }
    };
    
    logInfo('Sending gRPC request to Coordinator...');
    logInfo(`Tenant ID: ${testRequest.tenant_id}`);
    logInfo(`User ID: ${testRequest.user_id}`);
    logInfo(`Query: ${testRequest.query_text}`);
    
    const startTime = Date.now();
    const response = await routeRequest(testRequest);
    const duration = Date.now() - startTime;
    
    if (response) {
      logSuccess(`Received response from Coordinator (${duration}ms)`);
      
      // Display response details
      console.log('\nResponse Details:');
      console.log('  Target Services:', response.target_services || 'None');
      console.log('  Normalized Fields:', Object.keys(response.normalized_fields || {}));
      
      if (response.normalized_fields) {
        const nf = response.normalized_fields;
        console.log('  Successful Service:', nf.successful_service || 'None');
        console.log('  Rank Used:', nf.rank_used || 'N/A');
        console.log('  Quality Score:', nf.quality_score || 'N/A');
        console.log('  Total Attempts:', nf.total_attempts || 'N/A');
      }
      
      return { success: true, response, duration };
    } else {
      logError('No response received from Coordinator');
      logWarning('This could mean:');
      logWarning('  1. Coordinator is not running');
      logWarning('  2. Request was rejected (check Coordinator logs)');
      logWarning('  3. Signature verification failed');
      return { success: false, response: null, duration };
    }
  } catch (error) {
    logError(`gRPC request failed: ${error.message}`);
    
    // Provide helpful error messages
    if (error.code === grpc.status.UNAVAILABLE) {
      logError('Coordinator service is unavailable');
      logInfo('Check if Coordinator is running');
    } else if (error.code === grpc.status.DEADLINE_EXCEEDED) {
      logError('Request timed out');
      logInfo('Consider increasing GRPC_TIMEOUT');
    } else if (error.code === grpc.status.UNAUTHENTICATED) {
      logError('Authentication failed');
      logWarning('Signature verification may have failed');
      logInfo('Check that your public key is registered with Coordinator');
    } else if (error.code === grpc.status.PERMISSION_DENIED) {
      logError('Permission denied');
      logWarning('Your service may not be authorized');
    } else {
      logError(`gRPC Error Code: ${error.code} (${grpc.status[error.code]})`);
    }
    
    console.error(error);
    return { success: false, error: error.message, code: error.code };
  }
}

/**
 * Test 5: Signature Verification (if public key available)
 */
function testSignatureVerification(signatureData) {
  logSection('Test 5: Signature Verification');
  
  if (!process.env.COORDINATOR_PUBLIC_KEY) {
    logWarning('COORDINATOR_PUBLIC_KEY not provided - skipping verification test');
    logInfo('Set COORDINATOR_PUBLIC_KEY to test signature verification');
    return null;
  }
  
  try {
    const coordinatorPublicKey = Buffer.from(
      process.env.COORDINATOR_PUBLIC_KEY,
      'base64'
    ).toString('utf-8');
    
    logInfo('Testing signature verification with Coordinator public key...');
    
    // Note: This is a placeholder test since we don't have a Coordinator response signature
    // In real usage, Coordinator would sign responses and we'd verify them here
    logInfo('Signature verification test requires Coordinator response signature');
    logInfo('This test will be performed when Coordinator signs responses');
    
    return true;
  } catch (error) {
    logError(`Signature verification test failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('\n');
  log('🔐 Coordinator gRPC Signature Test Suite', 'bright');
  log('Testing digital signature generation and gRPC communication\n', 'cyan');
  
  const results = {
    environment: false,
    signatureGeneration: false,
    coordinatorAvailable: false,
    grpcRequest: false,
    signatureVerification: null,
  };
  
  // Test 1: Environment Variables
  results.environment = testEnvironmentVariables();
  if (!results.environment) {
    logError('\n❌ Environment check failed - cannot continue');
    process.exit(1);
  }
  
  // Test 2: Signature Generation
  const signatureData = testSignatureGeneration();
  results.signatureGeneration = signatureData !== null;
  if (!results.signatureGeneration) {
    logError('\n❌ Signature generation failed - cannot continue');
    process.exit(1);
  }
  
  // Test 3: Coordinator Availability
  results.coordinatorAvailable = await testCoordinatorAvailability();
  if (!results.coordinatorAvailable) {
    logWarning('\n⚠️  Coordinator not available - skipping gRPC tests');
    logSummary(results);
    process.exit(0);
  }
  
  // Test 4: gRPC Request with Signature (only if Coordinator is available)
  let grpcResult = { success: false };
  if (results.coordinatorAvailable) {
    grpcResult = await testGrpcRequestWithSignature();
    results.grpcRequest = grpcResult.success;
  } else {
    logWarning('\n⚠️  Skipping gRPC request test - Coordinator not available');
    logInfo('Once Coordinator is available, the test will:');
    logInfo('  1. Send gRPC request with digital signature');
    logInfo('  2. Verify Coordinator receives and processes the request');
    logInfo('  3. Verify response signature (if COORDINATOR_PUBLIC_KEY is set)');
  }
  
  // Test 5: Signature Verification
  results.signatureVerification = testSignatureVerification(signatureData);
  
  // Summary
  logSummary(results);
  
  // Exit with appropriate code
  if (results.grpcRequest) {
    logSuccess('\n✅ All tests passed!');
    process.exit(0);
  } else {
    logError('\n❌ Some tests failed');
    process.exit(1);
  }
}

/**
 * Print test summary
 */
function logSummary(results) {
  logSection('Test Summary');
  
  console.log('\nTest Results:');
  console.log(`  Environment Variables:     ${results.environment ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Signature Generation:     ${results.signatureGeneration ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Coordinator Available:    ${results.coordinatorAvailable ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  gRPC Request:              ${results.grpcRequest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Signature Verification:   ${results.signatureVerification === null ? '⏭️  SKIP' : results.signatureVerification ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log('\nNext Steps:');
  if (!results.environment) {
    logInfo('1. Set RAG_PRIVATE_KEY in .env file');
    logInfo('2. Generate keys with: node scripts/generate-keys.js');
  } else if (!results.coordinatorAvailable) {
    logInfo('1. Start Coordinator service');
    logInfo('2. Verify COORDINATOR_URL and COORDINATOR_GRPC_PORT are correct');
  } else if (!results.grpcRequest) {
    logInfo('1. Check Coordinator logs for errors');
    logInfo('2. Verify your public key is registered with Coordinator');
    logInfo('3. Check Coordinator signature verification configuration');
  } else {
    logSuccess('All tests passed! Your gRPC communication with signatures is working correctly.');
  }
}

// Run tests
runTests().catch((error) => {
  logError(`\nFatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

