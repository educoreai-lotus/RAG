# 🔧 הגדרת URL של Coordinator

## ה-URL הנכון

לפי התמונה שהתקבלה:
- **Service Name**: `lovely-wonder`
- **Domain**: `coordinator-production-6004.up.railway.app`

## הגדרות מומלצות

### אם שני השירותים על Railway (Private Networking):

```bash
# ב-Railway Variables של RAG Service
COORDINATOR_URL=lovely-wonder  # Service name
COORDINATOR_GRPC_PORT=50051
GRPC_USE_SSL=false  # Private network לא צריך SSL
```

### אם רק Coordinator על Railway (Public):

```bash
# צריך לחשוף את פורט 50051 ב-Railway
COORDINATOR_URL=coordinator-production-6004.up.railway.app
COORDINATOR_GRPC_PORT=50051
GRPC_USE_SSL=true  # אם נדרש
```

## בדיקה

לאחר ההגדרה, הרץ:

```bash
cd BACKEND
node scripts/test-grpc-only.js
```

## הערות חשובות

1. **Private Networking**: אם שני השירותים על Railway, השתמש ב-service name (`lovely-wonder`)
2. **Public Port**: אם צריך public access, צריך לחשוף את פורט 50051 ב-Railway Dashboard
3. **gRPC לא זמין דרך HTTP**: Railway לא חושף gRPC דרך ה-HTTP domain אוטומטית




