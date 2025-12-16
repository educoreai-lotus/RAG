# 🚀 הגדרת COORDINATOR ב-Railway

## 🔍 הבעיה

הקוד מנסה להתחבר ל-`coordinator.railway.internal:50051` אבל נכשל עם:
```
Name resolution failed for target dns:coordinator.railway.internal:50051
```

## ✅ הפתרון

### שלב 1: ודא ששני השירותים באותו Project

1. לך ל-Railway Dashboard
2. ודא ש-**RAG service** ו-**COORDINATOR service** באותו **Project**
3. אם לא - Private Networking לא יעבוד!

### שלב 2: הגדר משתנה סביבה ב-RAG Service

ב-Railway → **RAG Service** → Settings → Variables:

הוסף משתנה חדש:
```
Key: COORDINATOR_GRPC_ENDPOINT
Value: coordinator.railway.internal:50051
```

### שלב 3: ודא שה-COORDINATOR חשוף ב-port 50051

ב-COORDINATOR Service → Deploy Logs, חפש:
```
✓ GRPC server started on port 50051
```

אם אתה רואה את זה - ה-port נכון ✅

### שלב 4: בדוק Private Networking

ב-COORDINATOR Service → Settings → Networking:

ודא ש-Private Networking מופעל ויש:
- `coordinator.railway.internal` ✅
- IPv4 & IPv6 ✅

## 🧪 בדיקה

לאחר ההגדרה, נסה שוב את השאילתה ותראה בלוגים:

### אם זה עובד:
```
✅ [GRPC FALLBACK] Calling Coordinator
Calling Coordinator.Route()
Coordinator route response received  ← זה אמור להופיע
```

### אם עדיין לא עובד:
```
🔍 [COORDINATOR CLIENT] gRPC Configuration
  COORDINATOR_GRPC_ENDPOINT: coordinator.railway.internal:50051
  resolvedGrpcUrl: coordinator.railway.internal:50051
Coordinator gRPC call error...
```

## 🔧 פתרונות חלופיים

### אם Private Networking לא עובד:

**אפשרות 1: TCP Proxy**
1. ב-COORDINATOR Service → Networking
2. לחץ על "+ TCP Proxy"
3. הגדר TCP Proxy על port 50051
4. השתמש ב-Public URL עם ה-port

**אפשרות 2: Public URL (לא מומלץ)**
```
COORDINATOR_GRPC_ENDPOINT = coordinator-production-6004.up.railway.app:50051
```
⚠️ זה דורש TCP Proxy ויש בעיות אבטחה

## 📋 Checklist

- [ ] RAG ו-COORDINATOR באותו Railway Project
- [ ] COORDINATOR gRPC server רץ על port 50051
- [ ] Private Networking מופעל ב-COORDINATOR
- [ ] `COORDINATOR_GRPC_ENDPOINT = coordinator.railway.internal:50051` מוגדר ב-RAG
- [ ] Railway עדכן את הקוד (redeploy)

## 🎯 אחרי ההגדרה

לאחר ש-Railway יעדכן, תראה בלוגים:
```
🔍 [COORDINATOR CLIENT] gRPC Configuration
  COORDINATOR_GRPC_ENDPOINT: coordinator.railway.internal:50051
  resolvedGrpcUrl: coordinator.railway.internal:50051
```

ואז החיבור אמור לעבוד! 🎉

