# 🧪 Test Scripts Guide

## 📋 Available Test Scripts

### 1. `test-coordinator-from-rag.js`
**Purpose:** Test Coordinator connection and send gRPC request

**Usage:**
```bash
cd BACKEND
node scripts/test-coordinator-from-rag.js
```

**What it tests:**
- ✅ Coordinator availability
- ✅ gRPC client creation
- ✅ Digital signature generation
- ✅ Sending request to Coordinator
- ✅ Receiving response

**Configuration:**
- Uses `COORDINATOR_GRPC_ENDPOINT` environment variable
- Uses `GRPC_USE_SSL` environment variable
- Loads private key from `keys/rag-service-private-key.pem` if available

---

### 2. `test-grpc-only.js`
**Purpose:** Focused gRPC communication test

**Usage:**
```bash
cd BACKEND
node scripts/test-grpc-only.js
```

**What it tests:**
- ✅ gRPC client creation
- ✅ Connection to Coordinator
- ✅ Signature generation
- ✅ Metadata creation
- ✅ gRPC request sending

**Configuration:**
- Uses `COORDINATOR_GRPC_ENDPOINT` or `COORDINATOR_GRPC_URL`
- Uses `GRPC_USE_SSL` environment variable

---

### 3. `test-coordinator-simple.js`
**Purpose:** Simple Coordinator communication test

**Usage:**
```bash
cd BACKEND
node scripts/test-coordinator-simple.js
```

**What it tests:**
- ✅ Coordinator availability check
- ✅ Sending request via `routeRequest()`
- ✅ Response handling

---

### 4. `test-coordinator-request-delivery.js`
**Purpose:** Test request delivery to Coordinator

**Usage:**
```bash
cd BACKEND
node scripts/test-coordinator-request-delivery.js
```

**What it tests:**
- ✅ Coordinator availability
- ✅ Signature generation
- ✅ Request sending
- ✅ Verifies request reaches Coordinator

---

### 5. `send-test-query.js`
**Purpose:** Send test query to RAG Service (triggers Coordinator routing)

**Usage:**
```bash
cd BACKEND
RAG_URL=https://rag-production-3a4c.up.railway.app node scripts/send-test-query.js
```

**What it tests:**
- ✅ Sends HTTP POST to RAG `/api/v1/query`
- ✅ Triggers Coordinator routing
- ✅ Checks response

---

## 🚀 Quick Test Commands

### Test 1: Direct Coordinator Connection (Public URL)
```bash
cd BACKEND
COORDINATOR_GRPC_ENDPOINT=coordinator-production-6004.up.railway.app:443 \
GRPC_USE_SSL=true \
node scripts/test-coordinator-from-rag.js
```

### Test 2: Private Networking (Railway only)
```bash
cd BACKEND
COORDINATOR_GRPC_ENDPOINT=coordinator.railway.internal:50051 \
GRPC_USE_SSL=false \
node scripts/test-coordinator-from-rag.js
```

### Test 3: Send Query to RAG
```bash
cd BACKEND
RAG_URL=https://rag-production-3a4c.up.railway.app \
node scripts/send-test-query.js
```

### Test 4: Comprehensive Test
```bash
cd BACKEND
# Load private key
if [ -f "keys/rag-service-private-key.pem" ]; then
  export RAG_PRIVATE_KEY=$(cat keys/rag-service-private-key.pem | base64)
fi

# Test with Public URL
COORDINATOR_GRPC_ENDPOINT=coordinator-production-6004.up.railway.app:443 \
GRPC_USE_SSL=true \
node scripts/test-coordinator-from-rag.js
```

---

## 📍 Where Are the Scripts?

All test scripts are in:
```
BACKEND/scripts/
├── test-coordinator-from-rag.js
├── test-grpc-only.js
├── test-coordinator-simple.js
├── test-coordinator-request-delivery.js
└── send-test-query.js
```

---

## ⚙️ Environment Variables

### Required:
- `RAG_PRIVATE_KEY` - Base64 encoded private key (or load from `keys/rag-service-private-key.pem`)

### Optional (with defaults):
- `COORDINATOR_GRPC_ENDPOINT` - gRPC endpoint (default: from COORDINATOR_URL + PORT)
- `GRPC_USE_SSL` - Use SSL (default: false)
- `COORDINATOR_PROTO_PATH` - Path to proto file (default: `../DATABASE/proto/rag/v1/coordinator.proto`)
- `RAG_URL` - RAG service URL (for send-test-query.js)

---

## 🧪 Running Tests

### From Local Machine:
```bash
cd BACKEND

# Load private key
if [ -f "keys/rag-service-private-key.pem" ]; then
  export RAG_PRIVATE_KEY=$(cat keys/rag-service-private-key.pem | base64)
fi

# Test Coordinator connection
COORDINATOR_GRPC_ENDPOINT=coordinator-production-6004.up.railway.app:443 \
GRPC_USE_SSL=true \
node scripts/test-coordinator-from-rag.js
```

### From Railway (using Railway CLI):
```bash
railway run --service rag-service node BACKEND/scripts/test-coordinator-from-rag.js
```

---

## 📊 What Each Test Shows

### test-coordinator-from-rag.js:
- ✅/❌ Coordinator availability
- ✅/❌ Request sent
- ✅/❌ Response received
- Error details if failed

### test-grpc-only.js:
- ✅/❌ gRPC client created
- ✅/❌ Connection established
- ✅/❌ Signature generated
- ✅/❌ Request sent

### send-test-query.js:
- ✅/❌ HTTP request to RAG
- ✅/❌ Response status
- Response content

---

## 🔍 Troubleshooting

### If tests fail:

1. **Check environment variables:**
   ```bash
   echo $COORDINATOR_GRPC_ENDPOINT
   echo $GRPC_USE_SSL
   echo $RAG_PRIVATE_KEY
   ```

2. **Check private key:**
   ```bash
   ls -la BACKEND/keys/rag-service-private-key.pem
   ```

3. **Check proto file:**
   ```bash
   ls -la DATABASE/proto/rag/v1/coordinator.proto
   ```

4. **Check Coordinator logs:**
   - Railway Dashboard → Coordinator → Logs
   - Look for gRPC-related messages

---

## 📝 Example Output

### Successful Test:
```
✅ Coordinator is available!
✅ Request sent and received response!
📦 Response:
   Target Services: managementreporting-service, content-studio
   Successful Service: managementreporting-service
```

### Failed Test:
```
❌ Coordinator not available
💡 Possible issues:
   - Coordinator gRPC server not running
   - Wrong COORDINATOR_GRPC_ENDPOINT
   - Network connectivity issue
```

---

## 🎯 Recommended Test Flow

1. **Start with simple test:**
   ```bash
   node scripts/test-coordinator-simple.js
   ```

2. **Test gRPC connection:**
   ```bash
   node scripts/test-grpc-only.js
   ```

3. **Test full flow:**
   ```bash
   node scripts/test-coordinator-from-rag.js
   ```

4. **Test via RAG service:**
   ```bash
   node scripts/send-test-query.js
   ```

---

## 📚 Related Files

- `COORDINATOR_ENDPOINTS_EXPLANATION.md` - Endpoint configuration
- `RAILWAY_ENV_VARS_SETUP.md` - Environment variables setup
- `COORDINATOR_PROGRESS_ANALYSIS.md` - Test results analysis

