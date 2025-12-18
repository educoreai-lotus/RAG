# 🧪 Coordinator gRPC Signature Test Guide

## Overview

This guide explains how to test gRPC communication with the Coordinator service using digital signatures.

## Prerequisites

1. **Private Key**: Your `RAG_PRIVATE_KEY` must be set in environment variables
2. **Coordinator Running**: The Coordinator service must be running and accessible
3. **Public Key Registered**: Your public key must be registered with the Coordinator

## Quick Start

### 1. Set Environment Variables

Make sure your `.env` file includes:

```bash
# Required
RAG_PRIVATE_KEY=<base64-encoded-private-key>

# Optional (defaults shown)
COORDINATOR_URL=localhost
COORDINATOR_GRPC_PORT=50051

# Optional - for signature verification
COORDINATOR_PUBLIC_KEY=<base64-encoded-coordinator-public-key>
```

### 2. Run the Test Script

```bash
cd BACKEND
node scripts/test-coordinator-signature.js
```

## What the Test Does

The test script performs the following checks:

### ✅ Test 1: Environment Variables
- Verifies `RAG_PRIVATE_KEY` is set
- Validates private key format (base64 encoded PEM)
- Checks optional environment variables

### ✅ Test 2: Signature Generation
- Tests signature generation without payload
- Tests signature generation with payload
- Verifies signatures are generated correctly

### ✅ Test 3: Coordinator Availability
- Checks if Coordinator gRPC service is reachable
- Verifies connection can be established

### ✅ Test 4: gRPC Request with Signature
- Sends a test gRPC request to Coordinator
- Includes digital signature in metadata
- Verifies response is received

### ✅ Test 5: Signature Verification (Optional)
- Tests signature verification if `COORDINATOR_PUBLIC_KEY` is provided
- Verifies Coordinator response signatures

## Expected Output

### Success Case

```
🔐 Coordinator gRPC Signature Test Suite
Testing digital signature generation and gRPC communication

============================================================
Test 1: Environment Variables Check
============================================================
✅ RAG_PRIVATE_KEY: Configured (-----BEGIN PRIVATE K...)
ℹ️  COORDINATOR_URL: localhost
ℹ️  COORDINATOR_GRPC_PORT: 50051
✅ Private key format is valid

============================================================
Test 2: Signature Generation
============================================================
ℹ️  Testing simple signature (without payload)...
✅ Simple signature generated: abc123...
ℹ️  Testing signature with payload...
✅ Payload signature generated: def456...
✅ Signatures are different (as expected with/without payload)
✅ Signatures are valid base64 strings

============================================================
Test 3: Coordinator Availability Check
============================================================
ℹ️  Checking if Coordinator is available...
✅ Coordinator is available and reachable

============================================================
Test 4: gRPC Request with Signature
============================================================
ℹ️  Sending gRPC request to Coordinator...
✅ Received response from Coordinator (123ms)

Response Details:
  Target Services: ['payment-service']
  Successful Service: payment-service
  Rank Used: 1
  Quality Score: 0.95

============================================================
Test Summary
============================================================

Test Results:
  Environment Variables:     ✅ PASS
  Signature Generation:     ✅ PASS
  Coordinator Available:    ✅ PASS
  gRPC Request:              ✅ PASS
  Signature Verification:   ⏭️  SKIP

✅ All tests passed!
```

### Failure Cases

#### Missing Private Key

```
❌ RAG_PRIVATE_KEY: Missing
❌ Missing required environment variables!
ℹ️  Please set RAG_PRIVATE_KEY in your .env file
```

#### Coordinator Not Available

```
⚠️  Coordinator is not available
⚠️  Make sure Coordinator is running and accessible
ℹ️  Check: localhost:50051
```

#### Signature Verification Failed

```
❌ gRPC request failed: Authentication failed
⚠️  Signature verification may have failed
ℹ️  Check that your public key is registered with Coordinator
```

## Troubleshooting

### Issue: "RAG_PRIVATE_KEY not configured"

**Solution:**
1. Generate keys: `node scripts/generate-keys.js`
2. Copy private key to `.env` as `RAG_PRIVATE_KEY` (base64 encoded)
3. Or set it directly: `export RAG_PRIVATE_KEY="<base64-key>"`

### Issue: "Coordinator is not available"

**Solution:**
1. Verify Coordinator is running
2. Check `COORDINATOR_URL` and `COORDINATOR_GRPC_PORT` are correct
3. Test connection: `telnet localhost 50051` (or use `grpcurl`)

### Issue: "Authentication failed" or "Permission denied"

**Solution:**
1. Verify your public key is registered with Coordinator
2. Check Coordinator logs for signature verification errors
3. Ensure private key matches the registered public key
4. Verify Coordinator has your public key in `authorized-services.json`

### Issue: "Invalid private key format"

**Solution:**
1. Ensure private key is base64 encoded
2. Verify key includes `-----BEGIN PRIVATE KEY-----` header
3. Check for newlines - they should be `\n` in base64 encoding

## Manual Testing with grpcurl

You can also test manually using `grpcurl`:

```bash
# Install grpcurl (if not installed)
# macOS: brew install grpcurl
# Linux: Download from https://github.com/fullstorydev/grpcurl/releases

# Test Coordinator availability
grpcurl -plaintext localhost:50051 list

# Call Route method (without signature - will fail if signature required)
grpcurl -plaintext \
  -d '{"tenant_id":"test","user_id":"test","query_text":"test"}' \
  localhost:50051 rag.v1.CoordinatorService/Route
```

## Next Steps

After successful testing:

1. ✅ Verify signatures are being generated correctly
2. ✅ Confirm gRPC communication works
3. ✅ Register your public key with Coordinator (if not already done)
4. ✅ Test with real requests in your application

## Related Files

- **Test Script**: `BACKEND/scripts/test-coordinator-signature.js`
- **Signature Utility**: `BACKEND/src/utils/signature.js`
- **Coordinator Client**: `BACKEND/src/clients/coordinator.client.js`
- **Key Generation**: `BACKEND/scripts/generate-keys.js`








