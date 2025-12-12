# 🔍 ניתוח שגיאת Protocol Error

## השגיאה:

```
14 UNAVAILABLE: No connection established. Last error: Protocol error
```

## מה זה אומר:

החיבור ל-Coordinator נוצר, אבל יש בעיה עם ה-gRPC protocol:
- ✅ החיבור TCP עובד
- ❌ ה-gRPC protocol לא תואם

## סיבות אפשריות:

### 1. TCP Proxy לא תומך ב-gRPC ישיר

**הבעיה:**
Railway TCP Proxy יכול להיות HTTP proxy, לא gRPC proxy.

**פתרון:**
- נסה עם SSL/TLS
- או השתמש ב-private networking
- או השתמש ב-HTTP endpoint במקום gRPC

### 2. Coordinator לא מאזין על הפורט

**הבעיה:**
Coordinator לא רץ או לא מאזין על פורט 50051.

**פתרון:**
- בדוק ש-Coordinator רץ
- בדוק ש-`GRPC_ENABLED=true`
- בדוק ש-`GRPC_PORT=50051`

### 3. Proto File לא תואם

**הבעיה:**
ה-proto file ב-RAG לא תואם ל-Coordinator.

**פתרון:**
- בדוק את ה-proto file
- ודא שהוא תואם ל-Coordinator

### 4. צריך SSL/TLS

**הבעיה:**
Coordinator דורש SSL/TLS.

**פתרון:**
```bash
GRPC_USE_SSL=true
```

---

## מה לבדוק:

1. **ב-Railway Dashboard:**
   - האם Coordinator רץ?
   - מה ה-Logs אומרים?
   - האם יש שגיאות?

2. **ב-Coordinator:**
   - האם gRPC server רץ?
   - האם הוא מאזין על פורט 50051?
   - האם יש שגיאות ב-Logs?

3. **ב-RAG:**
   - האם ה-proto file נכון?
   - האם החתימות נוצרות נכון? (✅ כן - ראינו שזה עובד)

---

## המלצות:

### אופציה 1: נסה עם SSL

```bash
GRPC_USE_SSL=true
```

### אופציה 2: בדוק את Coordinator

- בדוק את ה-Logs של Coordinator
- בדוק אם gRPC server רץ
- בדוק את ה-proto file ב-Coordinator

### אופציה 3: השתמש ב-HTTP Endpoint

אם gRPC לא עובד דרך TCP Proxy, אפשר להשתמש ב-HTTP endpoint:
- `POST /api/fill-content-metrics/`
- עם חתימות ב-headers

---

## סיכום:

**מה עובד:**
- ✅ יצירת חתימות
- ✅ חיבור TCP
- ✅ שליחת metadata

**מה לא עובד:**
- ❌ gRPC protocol (Protocol error)

**צריך לבדוק:**
- Coordinator logs
- האם gRPC server רץ
- האם צריך SSL

