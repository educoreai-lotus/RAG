# Proto Mismatch Fix - RAG to Coordinator Communication

**Date:** 2025-01-13  
**Issue:** `13 INTERNAL: Error deserializing request: invalid wire type 7 at offset 520`

---

## 🔍 Root Cause Analysis

The error "invalid wire type 7 at offset 520" indicates that Coordinator cannot deserialize the gRPC request from RAG. Wire type 7 doesn't exist in protobuf (valid types are 0-5), suggesting:

1. **Context field type mismatch** - Non-string values in `map<string, string> context`
2. **Envelope JSON serialization issues** - Invalid JSON or encoding problems
3. **Signature metadata interference** - Signature fields corrupting the message

---

## ✅ Fixes Applied

### 1. Enhanced Context Field Conversion

**Problem:** `String(value)` doesn't properly handle objects/arrays in metadata.

**Solution:** Added proper type handling:

```javascript
// Before (problematic):
contextMap[key] = String(value);

// After (fixed):
let stringValue;
if (typeof value === 'object' && !(value instanceof Date)) {
  try {
    stringValue = JSON.stringify(value);
  } catch (e) {
    logger.warn('[Coordinator] Failed to stringify metadata value', {
      key,
      error: e.message,
    });
    stringValue = String(value);
  }
} else if (value instanceof Date) {
  stringValue = value.toISOString();
} else {
  stringValue = String(value);
}
contextMap[key] = stringValue;
```

**Location:** 
- `BACKEND/src/clients/coordinator.client.js:424-432` (routeRequest)
- `BACKEND/src/clients/coordinator.client.js:697-715` (batchSync)

---

### 2. Envelope JSON Validation

**Problem:** No validation that `envelope_json` is valid JSON before sending.

**Solution:** Added validation with error handling:

```javascript
// Validate envelope_json serialization
let envelopeJson;
try {
  envelopeJson = JSON.stringify(envelope);
  // Validate it's valid JSON by parsing it back
  JSON.parse(envelopeJson);
} catch (e) {
  logger.error('[Coordinator] Failed to serialize envelope_json', {
    error: e.message,
    envelope: envelope,
  });
  throw new Error(`envelope_json serialization failed: ${e.message}`);
}
```

**Location:**
- `BACKEND/src/clients/coordinator.client.js:434-444` (routeRequest)
- `BACKEND/src/clients/coordinator.client.js:717-727` (batchSync)

---

### 3. Comprehensive Debug Logging

**Problem:** No visibility into what's being sent to Coordinator.

**Solution:** Added detailed logging before gRPC call:

```javascript
logger.info('═══════════════════════════════════');
logger.info('🔍 [COORDINATOR] REQUEST TO COORDINATOR');
logger.info('═══════════════════════════════════');
logger.info('tenant_id type:', typeof request.tenant_id);
logger.info('user_id type:', typeof request.user_id);
logger.info('query_text type:', typeof request.query_text);
logger.info('query_text length:', request.query_text?.length);
logger.info('requester_service type:', typeof request.requester_service);
logger.info('context type:', typeof request.context);
logger.info('context keys:', Object.keys(request.context || {}));
logger.info('context values types:', 
  Object.entries(request.context || {}).map(([k, v]) => 
    `${k}: ${typeof v}`
  ).join(', ')
);
logger.info('envelope_json type:', typeof request.envelope_json);
logger.info('envelope_json length:', request.envelope_json?.length);
logger.info('envelope_json first 200 chars:', 
  request.envelope_json?.substring(0, 200)
);
logger.info('═══════════════════════════════════');
```

**Location:**
- `BACKEND/src/clients/coordinator.client.js:446-465` (routeRequest)
- `BACKEND/src/clients/coordinator.client.js:729-742` (batchSync)

---

### 4. Optional Signature Disabling

**Problem:** Signature generation might interfere with message serialization.

**Solution:** Added environment variable to disable signature for testing:

```javascript
// Generate signed metadata (can be disabled for testing)
const SIGNATURE_ENABLED = process.env.COORDINATOR_SIGNATURE_ENABLED !== 'false'; // Default: enabled
let signedMetadata;

if (SIGNATURE_ENABLED) {
  try {
    signedMetadata = createSignedMetadata(request);
    logger.info('[Coordinator] Generated signature metadata');
  } catch (error) {
    logger.error('[Coordinator] Failed to generate signature', {
      error: error.message,
    });
    // Fallback to empty metadata if signature fails
    signedMetadata = new grpc.Metadata();
  }
} else {
  logger.warn('[Coordinator] Signature disabled for testing');
  signedMetadata = new grpc.Metadata();
}
```

**Location:**
- `BACKEND/src/clients/coordinator.client.js:467-483` (routeRequest)
- `BACKEND/src/clients/coordinator.client.js:744-760` (batchSync)

**Usage:** Set `COORDINATOR_SIGNATURE_ENABLED=false` in Railway environment variables to disable signature temporarily for testing.

---

## 📋 Proto File Verification

**RAG Proto File:** `DATABASE/proto/rag/v1/coordinator.proto`

```protobuf
message RouteRequest {
  string tenant_id = 1;
  string user_id = 2;
  string query_text = 3;
  string requester_service = 4;
  map<string, string> context = 5;  // ✅ Must be map<string, string>
  string envelope_json = 6;          // ✅ Must be string (JSON)
}
```

**Validation:**
- ✅ `context` is `map<string, string>` - all values must be strings
- ✅ `envelope_json` is `string` - must be valid JSON string
- ✅ All field types match proto definition

---

## 🧪 Testing Steps

### Step 1: Deploy with Debug Logging

1. Deploy the updated code to Railway
2. Trigger a real-time query or batch sync
3. Check Railway logs for the debug output

### Step 2: Verify Context Values

Look for this in logs:
```
context values types: category: string, source: string, vector_results_count: string
```

All values should be `string` type.

### Step 3: Test Without Signature (if needed)

If the error persists:

1. Set `COORDINATOR_SIGNATURE_ENABLED=false` in Railway environment variables
2. Redeploy
3. Test again
4. Check if error is resolved

**If removing signature fixes it:** The issue is in signature generation/metadata handling.

**If error persists:** The issue is likely in proto file mismatch or Coordinator-side deserialization.

---

## 🔍 Debugging Checklist

- [ ] All context values are strings (check logs)
- [ ] envelope_json is valid JSON (check logs)
- [ ] No objects/arrays in context (should be JSON stringified)
- [ ] Signature metadata is properly formatted (check logs)
- [ ] Proto files match between RAG and Coordinator

---

## 🚀 Next Steps

1. **Deploy and Monitor**
   - Deploy updated code to Railway
   - Monitor logs for debug output
   - Check if error is resolved

2. **If Error Persists**
   - Compare RAG proto file with Coordinator proto file
   - Check Coordinator logs for deserialization errors
   - Verify Coordinator proto version matches RAG proto version

3. **If Error Resolved**
   - Remove debug logging (or keep for monitoring)
   - Re-enable signature if it was disabled
   - Document the fix

---

## 📝 Environment Variables

**New Variable:**
- `COORDINATOR_SIGNATURE_ENABLED` - Set to `false` to disable signature for testing (default: `true`)

**Existing Variables (unchanged):**
- `COORDINATOR_ENABLED` - Enable/disable Coordinator client
- `COORDINATOR_GRPC_ENDPOINT` - Coordinator gRPC endpoint
- `RAG_PRIVATE_KEY` - Private key for signature generation

---

## 🎯 Expected Behavior After Fix

1. **Context Field:** All values are properly converted to strings (objects/arrays are JSON stringified)
2. **Envelope JSON:** Validated before sending (throws error if invalid)
3. **Debug Logging:** Comprehensive logs show exactly what's being sent
4. **Signature:** Can be disabled for testing if needed

---

## ⚠️ Important Notes

1. **Proto Compatibility:** Ensure Coordinator's proto file matches RAG's proto file exactly
2. **Field Numbers:** Field numbers must match (tenant_id=1, user_id=2, etc.)
3. **Field Types:** All types must match (string, map<string, string>, etc.)
4. **Wire Format:** Protobuf wire format is strict - any mismatch causes deserialization errors

---

**End of Fix Documentation**

