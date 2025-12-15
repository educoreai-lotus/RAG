# 🔌 הגדרת TCP Proxy לחיבור gRPC

## מה אני רואה במסך שלך:

יש כבר **TCP Proxy מוגדר**:
- **External**: `gondola.proxy.rlwy.net:16335`
- **Internal**: `:50051`

זה אומר שהפורט 50051 כבר חשוף דרך TCP Proxy!

---

## הגדרה נכונה:

### ב-RAG Service (ב-Railway Variables או .env):

```bash
COORDINATOR_URL=gondola.proxy.rlwy.net
COORDINATOR_GRPC_PORT=16335
GRPC_USE_SSL=false  # TCP Proxy בדרך כלל לא צריך SSL
```

או כ-URL מלא:

```bash
COORDINATOR_GRPC_URL=gondola.proxy.rlwy.net:16335
```

---

## בדיקה:

לאחר ההגדרה:

```bash
cd BACKEND
COORDINATOR_URL=gondola.proxy.rlwy.net COORDINATOR_GRPC_PORT=16335 GRPC_USE_SSL=false node scripts/test-grpc-only.js
```

---

## איך זה עובד:

```
RAG Service → gondola.proxy.rlwy.net:16335 → Coordinator:50051
              (TCP Proxy)                    (Internal)
```

הטראפיק עובר דרך ה-TCP Proxy של Railway לפורט הפנימי 50051.

---

## הערות חשובות:

1. **Port**: השתמש ב-`16335` (הפורט החיצוני), לא ב-`50051`
2. **SSL**: בדרך כלל לא צריך SSL עם TCP Proxy
3. **URL**: `gondola.proxy.rlwy.net` (לא ה-HTTP domain)

---

## סיכום:

✅ TCP Proxy כבר מוגדר  
✅ הפורט החיצוני: `16335`  
✅ הפורט הפנימי: `50051`  
✅ מוכן לחיבור!

פשוט עדכן את המשתנים להשתמש ב-`gondola.proxy.rlwy.net:16335` 🚀


