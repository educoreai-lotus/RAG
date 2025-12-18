# How to Expose gRPC Port 50051 in Coordinator

## 📋 Current Status

From your screenshots, I can see:
- ✅ **RAG Service** has the correct variables:
  - `COORDINATOR_GRPC_ENDPOINT=coordinator.railway.internal:50051`
  - `GRPC_USE_SSL=false`
- ✅ **Coordinator** has Private Networking configured:
  - `coordinator.railway.internal` is available
  - IPv4 & IPv6 supported

## 🔍 What We Need to Check

To verify that port 50051 is exposed, we need to check:

### Option 1: Private Networking (Already Configured ✅)

If RAG and Coordinator are in the **same Railway project**, Private Networking should work automatically.

**What to check:**
1. Go to **Coordinator Service** → **Settings** → **Networking**
2. Verify **Private Networking** shows:
   - `coordinator.railway.internal`
   - "Ready to talk privately"

**If this is configured**, port 50051 should be accessible via Private Networking.

---

### Option 2: TCP Proxy (For Public Access)

If you need to access gRPC from outside Railway or from a different project:

1. Go to **Coordinator Service** → **Settings** → **Networking**
2. Under **Public Networking**, click **"+ TCP Proxy"**
3. Configure:
   - **Port:** `50051`
   - **Protocol:** `TCP`
4. Railway will assign an external port (e.g., `gondola.proxy.rlwy.net:16335`)
5. Update RAG variables:
   ```env
   COORDINATOR_GRPC_ENDPOINT=<tcp-proxy-host>:<tcp-proxy-port>
   GRPC_USE_SSL=false
   ```

---

## ✅ Step-by-Step: Verify Port 50051 is Exposed

### Step 1: Check Coordinator Variables

1. Go to **Coordinator Service** → **Variables**
2. Verify these variables exist:
   ```env
   GRPC_ENABLED=true
   GRPC_PORT=50051
   ```
3. If they don't exist, **add them**:
   - Click **"+ New Variable"**
   - Key: `GRPC_ENABLED`, Value: `true`
   - Key: `GRPC_PORT`, Value: `50051`

### Step 2: Check Coordinator Logs

1. Go to **Coordinator Service** → **Deployments** → **Latest Deployment** → **Logs**
2. Look for:
   - `gRPC server started`
   - `Listening on port 50051`
   - `gRPC server is ready`
3. If you see errors like:
   - `Port 50051 already in use`
   - `Failed to bind to port 50051`
   - Then there's a port conflict

### Step 3: Check Networking Configuration

**For Private Networking (Same Project):**
1. Go to **Coordinator Service** → **Settings** → **Networking**
2. Under **Private Networking**, verify:
   - `coordinator.railway.internal` is listed
   - Status shows "Ready to talk privately"
3. **This means port 50051 is accessible via Private Networking!**

**For Public Access (Different Project or External):**
1. Go to **Coordinator Service** → **Settings** → **Networking**
2. Under **Public Networking**, check if there's a **TCP Proxy** configured
3. If not, click **"+ TCP Proxy"** to add one

---

## 🧪 How to Test if Port 50051 is Exposed

### Test 1: From RAG Service (Same Project)

If both services are in the same Railway project, Private Networking should work:

```env
COORDINATOR_GRPC_ENDPOINT=coordinator.railway.internal:50051
GRPC_USE_SSL=false
```

**Test:**
1. Go to **RAG Service** → **Deployments** → **Latest Deployment** → **Logs**
2. Look for:
   - `[Coordinator] Environment validation passed`
   - `Created gRPC client`
   - `Coordinator gRPC client created`
   - `Coordinator is available` ✅

### Test 2: Check Coordinator Logs for Incoming Requests

1. Go to **Coordinator Service** → **Deployments** → **Latest Deployment** → **Logs**
2. Send a test request from RAG
3. Look for in Coordinator logs:
   - `Received Route request`
   - `Processing gRPC request`
   - Any gRPC-related logs

---

## 🔧 Troubleshooting

### Problem: "Failed to connect before the deadline"

**Possible causes:**
1. **gRPC server not running:**
   - Check `GRPC_ENABLED=true` in Coordinator variables
   - Check Coordinator logs for "gRPC server started"

2. **Wrong endpoint:**
   - If same project: Use `coordinator.railway.internal:50051`
   - If different project: Use TCP Proxy or Public URL

3. **Port not exposed:**
   - Check Networking settings
   - Verify Private Networking is configured

### Problem: "Port 50051 already in use"

**Solution:**
- Change `GRPC_PORT` to a different port (e.g., `50052`)
- Update RAG `COORDINATOR_GRPC_ENDPOINT` accordingly

### Problem: "Connection refused"

**Solution:**
- Verify Coordinator is running
- Check Coordinator logs for errors
- Verify `GRPC_ENABLED=true`

---

## 📋 Checklist

- [ ] Coordinator has `GRPC_ENABLED=true` variable
- [ ] Coordinator has `GRPC_PORT=50051` variable
- [ ] Coordinator logs show "gRPC server started"
- [ ] Private Networking shows `coordinator.railway.internal`
- [ ] RAG has `COORDINATOR_GRPC_ENDPOINT=coordinator.railway.internal:50051`
- [ ] RAG has `GRPC_USE_SSL=false`
- [ ] RAG logs show "Coordinator is available"
- [ ] Coordinator logs show incoming gRPC requests

---

## 🎯 Quick Verification Steps

1. **Check Coordinator Variables:**
   - `GRPC_ENABLED=true` ✅
   - `GRPC_PORT=50051` ✅

2. **Check Coordinator Logs:**
   - Look for "gRPC server started" ✅

3. **Check Networking:**
   - Private Networking: `coordinator.railway.internal` ✅
   - (Optional) TCP Proxy for port 50051

4. **Test Connection:**
   - RAG logs should show "Coordinator is available" ✅

---

## 💡 Important Notes

1. **Private Networking works automatically** - If both services are in the same project, you don't need to configure anything extra for Private Networking.

2. **Port 50051 is internal** - With Private Networking, the port is accessible internally without exposing it publicly.

3. **TCP Proxy is optional** - Only needed if:
   - Services are in different projects
   - You need to access from outside Railway
   - You need to test from local machine

4. **Check logs first** - The best way to verify is to check Coordinator logs for "gRPC server started" and RAG logs for successful connection.



