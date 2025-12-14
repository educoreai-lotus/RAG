# Container Deployment Fixes

## Issues Fixed

### 1. node-cron Missing
**Problem:** Scheduled batch sync won't run because `node-cron` is not installed.

**Fix:** Added `node-cron` to `package.json` dependencies.

**Status:** ✅ Fixed - Will be installed on next `npm install`

---

### 2. Proto File Path Not Found
**Problem:** GRPC client can't find the proto file in container environment.

**Error:**
```
Failed to load proto file
Failed to create gRPC client
Failed to create Coordinator gRPC client
```

**Fix:** Updated `coordinator.client.js` to:
- Try multiple possible paths for the proto file
- Check which path exists before using it
- Provide helpful error messages with hints

**Status:** ✅ Fixed - Path resolution now handles multiple environments

---

## Environment Variable Solution

If the proto file still can't be found, set the `COORDINATOR_PROTO_PATH` environment variable:

```bash
COORDINATOR_PROTO_PATH=/app/DATABASE/proto/rag/v1/coordinator.proto
```

Or if DATABASE is at a different location:
```bash
COORDINATOR_PROTO_PATH=/path/to/DATABASE/proto/rag/v1/coordinator.proto
```

---

## Deployment Steps

1. **Install dependencies** (includes node-cron now):
   ```bash
   npm install
   ```

2. **Set proto path** (if needed):
   ```bash
   export COORDINATOR_PROTO_PATH=/app/DATABASE/proto/rag/v1/coordinator.proto
   ```

3. **Restart container** to pick up changes

---

## Verification

After deployment, check logs for:
- ✅ `[Coordinator] Found proto file` - Proto file found successfully
- ✅ `[ScheduledSync] Scheduled batch sync started` - Scheduler started
- ❌ `node-cron not installed` - Still missing (run `npm install`)
- ❌ `Proto file not found` - Set `COORDINATOR_PROTO_PATH` env var

---

## Files Changed

1. `BACKEND/package.json` - Added `node-cron` dependency
2. `BACKEND/src/clients/coordinator.client.js` - Improved proto path resolution
3. `BACKEND/Dockerfile` - (No changes needed - path resolution handles it)

---

## Next Steps

1. Rebuild container with updated `package.json`
2. Set `COORDINATOR_PROTO_PATH` if proto file still not found
3. Verify logs show successful proto file loading and scheduler start

