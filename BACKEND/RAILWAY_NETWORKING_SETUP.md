# 🚂 הגדרת Networking ב-Railway - לפי המסך שלך

## מה אני רואה במסך שלך:

1. **Public Networking**: `coordinator-production-6004.up.railway.app` על פורט 8080
2. **Private Networking**: `coordinator.railway.internal` (גם `coordinator`)
3. **TCP Proxy**: אפשר להוסיף לחשיפת פורט gRPC

---

## פתרון 1: Private Networking (מומלץ אם שני השירותים על Railway) ⭐

### איך זה עובד:

אם גם RAG Service וגם Coordinator על Railway, אפשר להשתמש ב-private networking:

```
RAG Service → coordinator:50051 (private network)
```

### הגדרה:

ב-RAG Service (ב-Railway Variables):

```bash
COORDINATOR_URL=coordinator  # או coordinator.railway.internal
COORDINATOR_GRPC_PORT=50051
GRPC_USE_SSL=false  # Private network לא צריך SSL
```

**יתרונות:**
- ✅ יותר בטוח (לא חשוף לאינטרנט)
- ✅ יותר מהיר (רשת פנימית)
- ✅ לא צריך לחשוף פורטים
- ✅ כבר מוכן לשימוש!

### בדיקה:

```bash
cd BACKEND
COORDINATOR_URL=coordinator COORDINATOR_GRPC_PORT=50051 GRPC_USE_SSL=false node scripts/test-grpc-only.js
```

---

## פתרון 2: TCP Proxy לחשיפת פורט gRPC (אם צריך public access)

### איך להוסיף:

1. במסך Networking של Coordinator
2. בחלק **"Public Networking"**
3. לחץ על הכפתור **"+ TCP Proxy"**
4. מלא את הפרטים:
   - **Port**: `50051`
   - **Protocol**: `TCP`
   - **Name** (אופציונלי): `grpc`

5. Railway ייתן לך URL חדש לחיבור ל-gRPC

### הגדרה:

לאחר הוספת ה-TCP Proxy, עדכן את המשתנים:

```bash
COORDINATOR_URL=coordinator-production-6004.up.railway.app
COORDINATOR_GRPC_PORT=50051  # או הפורט ש-Railway נתן
GRPC_USE_SSL=true  # או false, תלוי בהגדרות
```

---

## המלצה שלי:

### אם שני השירותים על Railway:

**השתמש ב-Private Networking** - זה הכי פשוט ובטוח:

```bash
# ב-RAG Service Variables:
COORDINATOR_URL=coordinator
COORDINATOR_GRPC_PORT=50051
GRPC_USE_SSL=false
```

### אם רק Coordinator על Railway:

**הוסף TCP Proxy** לחשיפת פורט 50051:

1. לחץ על "+ TCP Proxy"
2. Port: 50051
3. השתמש ב-URL ש-Railway נותן

---

## בדיקה לאחר ההגדרה:

```bash
cd BACKEND
node scripts/test-grpc-only.js
```

---

## סיכום:

| פתרון | מתי להשתמש | יתרונות |
|--------|------------|---------|
| **Private Networking** | שני השירותים על Railway | בטוח, מהיר, פשוט |
| **TCP Proxy** | צריך public access | נגיש מהאינטרנט |

**המלצה:** אם שני השירותים על Railway, השתמש ב-Private Networking עם `coordinator:50051`




