# Proto Structure Fix - Match Coordinator's Expected Structure

**Date:** 2025-01-13  
**Issue:** RAG proto structure doesn't match Coordinator's expected structure

---

## 🚨 Problem

**RAG was sending:**
```protobuf
RouteRequest {
  tenant_id: "...",
  user_id: "...",
  query_text: "...",
  requester_service: "rag-service",  // field 4 ❌
  context: {...},                     // field 5 ❌
  envelope_json: "..."                // field 6 ❌
}
```

**Coordinator expects:**
```protobuf
RouteRequest {
  tenant_id: "...",
  user_id: "...",
  query_text: "...",
  metadata: {...}  // field 4 - everything inside! ✅
}
```

**Result:** Wire type mismatch error - Coordinator cannot deserialize the request!

---

## ✅ Solution

### 1. Updated Proto File

**File:** `DATABASE/proto/rag/v1/coordinator.proto`

**Changed from:**
```protobuf
message RouteRequest {
  string tenant_id = 1;
  string user_id = 2;
  string query_text = 3;
  string requester_service = 4;            // ❌ Removed
  map<string, string> context = 5;       // ❌ Removed
  string envelope_json = 6;              // ❌ Removed
}
```

**Changed to:**
```protobuf
message RouteRequest {
  string tenant_id = 1;
  string user_id = 2;
  string query_text = 3;
  map<string, string> metadata = 4;       // ✅ Single metadata map
}
```

---

### 2. Updated routeRequest() Function

**File:** `BACKEND/src/clients/coordinator.client.js`

**Before:**
```javascript
const request = {
  tenant_id: tenant_id || '',
  user_id: user_id || '',
  query_text: query_text,
  requester_service: 'rag-service',  // ❌
  context: contextMap,                // ❌
  envelope_json: envelopeJson          // ❌
};
```

**After:**
```javascript
// Build metadata map - EVERYTHING goes here
const metadataMap = {
  requester_service: 'rag-service',
  source: metadata.source || 'rag',
  timestamp: new Date().toISOString(),
  ...contextMap,  // All context fields
  envelope_json: envelopeJson  // Envelope as metadata field
};

const request = {
  tenant_id: tenant_id || '',
  user_id: user_id || '',
  query_text: query_text,
  metadata: metadataMap  // ✅ Everything in metadata!
};
```

---

### 3. Updated batchSync() Function

**File:** `BACKEND/src/clients/coordinator.client.js`

**Before:**
```javascript
const request = {
  tenant_id: tenant_id || '',
  user_id: user_id || '',
  query_text: query_text,
  requester_service: 'rag-service',  // ❌
  context: contextMap,                // ❌
  envelope_json: envelopeJson          // ❌
};
```

**After:**
```javascript
// Build metadata map - EVERYTHING goes here
const metadataMap = {
  target_service: target_service,      // ⭐ CRITICAL
  sync_type: sync_type,                // ⭐ CRITICAL
  page: page.toString(),
  limit: limit.toString(),
  requester_service: 'rag-service',
  source: 'rag-batch-sync',
  timestamp: new Date().toISOString(),
  envelope_json: envelopeJson
};

const request = {
  tenant_id: tenant_id || '',
  user_id: user_id || '',
  query_text: query_text,
  metadata: metadataMap  // ✅ Everything in metadata!
};
```

---

## 📋 Changes Summary

### Proto File Changes

| Field | Before | After |
|-------|--------|-------|
| Field 4 | `requester_service` (string) | `metadata` (map<string, string>) |
| Field 5 | `context` (map<string, string>) | ❌ Removed |
| Field 6 | `envelope_json` (string) | ❌ Removed |

### Request Structure Changes

| Field | Before | After |
|-------|--------|-------|
| `requester_service` | Top-level field | Inside `metadata` map |
| `context` | Top-level field | Merged into `metadata` map |
| `envelope_json` | Top-level field | Inside `metadata` map |
| `target_service` | In `context` | In `metadata` map (batch sync) |
| `sync_type` | In `context` | In `metadata` map (batch sync) |

---

## ✅ Validation

### Debug Logging Added

Both functions now log:
```javascript
logger.info('has_requester_service:', !!request.requester_service, '(should be false)');
logger.info('has_context:', !!request.context, '(should be false)');
logger.info('has_envelope_json:', !!request.envelope_json, '(should be false)');
logger.info('envelope_json in metadata:', !!request.metadata?.envelope_json);
```

**Expected output:**
```
has_requester_service: false ✅
has_context: false ✅
has_envelope_json: false ✅
envelope_json in metadata: true ✅
```

---

## 🧪 Testing

### Test 1: Real-time Query

**Send query:**
```
Give me the four conclusions of the Monthly Learning Performance Report
```

**Expected logs:**
```
[COORDINATOR] REQUEST TO COORDINATOR
metadata keys: ['requester_service', 'source', 'timestamp', 'envelope_json', 'category', ...]
has_requester_service: false ✅
has_context: false ✅
has_envelope_json: false ✅
envelope_json in metadata: true ✅
```

**Expected result:**
- ✅ No wire type error
- ✅ Coordinator successfully deserializes request
- ✅ Query processed successfully

---

### Test 2: Batch Sync

**Trigger batch sync:**
```
Cron job runs → syncAllServices() → batchSync()
```

**Expected logs:**
```
[COORDINATOR] BATCH SYNC REQUEST
metadata keys: ['target_service', 'sync_type', 'page', 'limit', 'requester_service', 'source', 'timestamp', 'envelope_json']
target_service: payment-service ✅
sync_type: batch ✅
has_requester_service: false ✅
has_context: false ✅
has_envelope_json: false ✅
envelope_json in metadata: true ✅
```

**Expected result:**
- ✅ No wire type error
- ✅ Coordinator successfully deserializes request
- ✅ Batch sync processes successfully

---

## 🎯 Checklist

- [x] Update `DATABASE/proto/rag/v1/coordinator.proto`
- [x] Update `routeRequest()` in `coordinator.client.js`
- [x] Update `batchSync()` in `coordinator.client.js`
- [x] Remove `requester_service`, `context`, `envelope_json` from request object
- [x] Put everything in `metadata` map
- [x] Ensure all metadata values are strings
- [x] Add validation for envelope_json
- [x] Add debug logging
- [ ] Commit and push
- [ ] Deploy to Railway
- [ ] Test with real query
- [ ] Check logs for success

---

## 📝 Important Notes

1. **Proto Compatibility:** RAG proto now matches Coordinator proto exactly
2. **Field Numbers:** Field numbers must match (tenant_id=1, user_id=2, query_text=3, metadata=4)
3. **Field Types:** All types match (string, map<string, string>)
4. **Metadata Values:** All values in metadata map must be strings (objects/arrays are JSON stringified)
5. **Backward Compatibility:** This is a breaking change - Coordinator must also use this structure

---

## 🔍 Debugging

If errors persist:

1. **Check logs for request structure:**
   ```
   has_requester_service: false ✅
   has_context: false ✅
   has_envelope_json: false ✅
   ```

2. **Verify metadata contains all fields:**
   ```
   metadata keys: ['requester_service', 'source', 'timestamp', 'envelope_json', ...]
   ```

3. **Check Coordinator proto file matches:**
   - Coordinator must also have `metadata` as field 4
   - Field numbers must match exactly

4. **Verify all metadata values are strings:**
   ```
   metadata values types: requester_service: string, source: string, ...
   ```

---

## 🚀 Next Steps

1. **Deploy to Railway**
2. **Monitor logs** for debug output
3. **Test real-time query** - verify no wire type error
4. **Test batch sync** - verify no wire type error
5. **Remove debug logging** (optional, after confirming fix works)

---

**This fix ensures RAG's proto structure matches Coordinator's expected structure exactly!**

