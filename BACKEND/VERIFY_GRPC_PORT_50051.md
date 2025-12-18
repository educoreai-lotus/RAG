# ✅ How to Verify Port 50051 is Exposed

Based on your screenshots, here's how to verify:

## 📸 What I See in Your Screenshots

### RAG Service Variables (First Screenshot):
- ✅ `COORDINATOR_GRPC_ENDPOINT=coordinator.railway.internal:50051`
- ✅ `GRPC_USE_SSL=false`
- ✅ Variables are configured correctly!

### Coordinator Networking (Second Screenshot):
- ✅ Private Networking: `coordinator.railway.internal` is available
- ✅ "Ready to talk privately"
- ⚠️ No TCP Proxy visible (not needed if same project)

---

## 🔍 Step-by-Step Verification

### Step 1: Check Coordinator Variables

1. Go to **Coordinator Service** → **Variables** tab
2. Look for these variables:
   ```
   GRPC_ENABLED=true
   GRPC_PORT=50051
   ```
3. **If they don't exist, add them:**
   - Click **"+ New Variable"**
   - Add `GRPC_ENABLED` = `true`
   - Add `GRPC_PORT` = `50051`

### Step 2: Check Coordinator Logs

1. Go to **Coordinator Service** → **Deployments** tab
2. Click on the **latest deployment**
3. Click **"View Logs"** or **"Logs"**
4. **Look for:**
   - ✅ `gRPC server started`
   - ✅ `Listening on port 50051`
   - ✅ `gRPC server is ready`
   - ❌ If you see errors, note them

### Step 3: Verify Private Networking

From your screenshot, I can see:
- ✅ **Private Networking** is configured
- ✅ `coordinator.railway.internal` is available
- ✅ "Ready to talk privately"

**This means port 50051 should be accessible via Private Networking!**

---

## 🧪 Test Connection

### Option 1: Check RAG Logs

1. Go to **RAG Service** → **Deployments** → **Latest** → **Logs**
2. **Look for:**
   - `[Coordinator] Environment validation passed`
   - `Created gRPC client`
   - `Coordinator gRPC client created`
   - `Coordinator is available` ✅

### Option 2: Check Coordinator Logs for Incoming Requests

1. Go to **Coordinator Service** → **Deployments** → **Latest** → **Logs**
2. Send a test request (or wait for a real request)
3. **Look for:**
   - `Received Route request`
   - `Processing gRPC request`
   - Any gRPC-related activity

---

## ⚠️ Common Issues

### Issue 1: "gRPC server not started"

**Check:**
- Coordinator Variables: `GRPC_ENABLED=true` exists?
- Coordinator Logs: Any errors during startup?

**Fix:**
- Add `GRPC_ENABLED=true` to Coordinator variables
- Redeploy Coordinator

### Issue 2: "Port 50051 not accessible"

**Check:**
- Are RAG and Coordinator in the **same Railway project**?
- If yes, Private Networking should work automatically
- If no, you need TCP Proxy

**Fix:**
- If same project: No fix needed, should work
- If different project: Add TCP Proxy in Coordinator Networking

### Issue 3: "Connection timeout"

**Check:**
- Coordinator logs: Is gRPC server running?
- RAG logs: What error message?

**Fix:**
- Verify `GRPC_ENABLED=true` in Coordinator
- Check Coordinator logs for gRPC server status

---

## 📋 Quick Checklist

Based on your screenshots, verify:

- [ ] **Coordinator Variables:**
  - [ ] `GRPC_ENABLED=true` exists
  - [ ] `GRPC_PORT=50051` exists

- [ ] **Coordinator Logs:**
  - [ ] Shows "gRPC server started"
  - [ ] No errors about port 50051

- [ ] **RAG Variables:** (Already ✅ from screenshot)
  - [x] `COORDINATOR_GRPC_ENDPOINT=coordinator.railway.internal:50051`
  - [x] `GRPC_USE_SSL=false`

- [ ] **Networking:** (Already ✅ from screenshot)
  - [x] Private Networking: `coordinator.railway.internal` available

- [ ] **Test:**
  - [ ] RAG logs show "Coordinator is available"
  - [ ] Coordinator logs show incoming gRPC requests

---

## 🎯 What to Do Next

1. **Check Coordinator Variables:**
   - Go to Coordinator → Variables
   - Verify `GRPC_ENABLED=true` and `GRPC_PORT=50051`

2. **Check Coordinator Logs:**
   - Go to Coordinator → Deployments → Logs
   - Look for "gRPC server started"

3. **Check RAG Logs:**
   - Go to RAG → Deployments → Logs
   - Look for "Coordinator is available"

4. **If gRPC server is not running:**
   - Add `GRPC_ENABLED=true` to Coordinator variables
   - Redeploy Coordinator

---

## 💡 Key Points

1. **Private Networking is already configured** ✅
   - From your screenshot, `coordinator.railway.internal` is available
   - This means port 50051 should be accessible internally

2. **RAG variables are correct** ✅
   - `COORDINATOR_GRPC_ENDPOINT=coordinator.railway.internal:50051`
   - `GRPC_USE_SSL=false`

3. **What's missing:**
   - Need to verify Coordinator has `GRPC_ENABLED=true`
   - Need to verify Coordinator logs show "gRPC server started"

---

## 🔧 If Port 50051 is Not Working

### Add TCP Proxy (Optional - Only if needed)

1. Go to **Coordinator Service** → **Settings** → **Networking**
2. Under **Public Networking**, click **"+ TCP Proxy"**
3. Configure:
   - **Port:** `50051`
   - **Protocol:** `TCP`
4. Railway will assign external host:port
5. Update RAG:
   ```env
   COORDINATOR_GRPC_ENDPOINT=<tcp-proxy-host>:<tcp-proxy-port>
   GRPC_USE_SSL=false
   ```

**Note:** TCP Proxy is only needed if:
- Services are in different projects, OR
- You need to access from outside Railway

If both services are in the same project, Private Networking should work without TCP Proxy.



