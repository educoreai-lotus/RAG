# Coordinator Endpoints Explanation

## 🌐 HTTP vs gRPC

### HTTP Endpoint (REST API)
- **URL:** `https://coordinator-production-6004.up.railway.app/`
- **Port:** 443 (HTTPS) - default
- **Status:** ✅ Working (confirmed)
- **Used for:** REST API calls, health checks, service registration

### gRPC Endpoint
gRPC uses a **different port** than HTTP. You have two options:

---

## 🔌 Option 1: Private Networking (Recommended for Railway)

If RAG and Coordinator are in the **same Railway project**:

```env
COORDINATOR_GRPC_ENDPOINT=coordinator.railway.internal:50051
GRPC_USE_SSL=false
```

**How it works:**
- `coordinator.railway.internal` = internal Railway service name
- Port `50051` = gRPC port
- No SSL needed (internal network)
- **Only works inside Railway** (not from local machine)

---

## 🔌 Option 2: Public URL with Port 443

If you need to access from outside Railway or different project:

```env
COORDINATOR_GRPC_ENDPOINT=coordinator-production-6004.up.railway.app:443
GRPC_USE_SSL=true
```

**How it works:**
- Same domain as HTTP
- Port `443` = HTTPS port (shared with HTTP)
- SSL required
- Works from anywhere (local machine, different projects)

---

## 🔌 Option 3: TCP Proxy (If configured)

If Coordinator has a TCP Proxy configured:

```env
COORDINATOR_GRPC_ENDPOINT=<tcp-proxy-host>:<tcp-proxy-port>
GRPC_USE_SSL=false
```

**Example:**
```env
COORDINATOR_GRPC_ENDPOINT=gondola.proxy.rlwy.net:16335
GRPC_USE_SSL=false
```

---

## 📋 Current Configuration

Based on what you set in Railway:

```env
COORDINATOR_GRPC_ENDPOINT=coordinator.railway.internal:50051
GRPC_USE_SSL=false
```

This means:
- ✅ You're using **Private Networking**
- ✅ RAG and Coordinator are in the **same Railway project**
- ✅ gRPC will work **only when running on Railway**
- ❌ Won't work from local machine (expected)

---

## 🧪 Testing

### On Railway (Production):
Your current config should work:
```env
COORDINATOR_GRPC_ENDPOINT=coordinator.railway.internal:50051
GRPC_USE_SSL=false
```

### From Local Machine:
Use public URL:
```env
COORDINATOR_GRPC_ENDPOINT=coordinator-production-6004.up.railway.app:443
GRPC_USE_SSL=true
```

---

## ✅ Summary

| Endpoint Type | URL | Port | SSL | Works From |
|--------------|-----|------|-----|------------|
| **HTTP** | `coordinator-production-6004.up.railway.app` | 443 | Yes | Anywhere |
| **gRPC (Private)** | `coordinator.railway.internal` | 50051 | No | Railway only |
| **gRPC (Public)** | `coordinator-production-6004.up.railway.app` | 443 | Yes | Anywhere |
| **gRPC (TCP Proxy)** | `<proxy-host>` | `<proxy-port>` | No | Anywhere |

---

## 🎯 Recommendation

**For Production (Railway):**
- Keep your current config: `coordinator.railway.internal:50051`
- This is the most secure and efficient option

**For Local Testing:**
- Use: `coordinator-production-6004.up.railway.app:443` with SSL

---

## 🔍 How to Verify

1. **Check HTTP is working:**
   ```bash
   curl https://coordinator-production-6004.up.railway.app/health
   ```

2. **Check gRPC on Railway:**
   - Check RAG service logs in Railway Dashboard
   - Look for: `[Coordinator] Environment validation passed`
   - Look for: `Created gRPC client`

3. **Check gRPC from local:**
   ```bash
   COORDINATOR_GRPC_ENDPOINT=coordinator-production-6004.up.railway.app:443 \
   GRPC_USE_SSL=true \
   node BACKEND/scripts/test-grpc-only.js
   ```

