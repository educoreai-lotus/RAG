# 🚀 הגדרת משתני סביבה ב-Railway

## 📍 איפה להגדיר

### ב-Railway Dashboard:

1. **לך ל-Railway Dashboard** → https://railway.app
2. **בחר את הפרויקט** שלך
3. **בחר את ה-RAG Service** (לא Coordinator!)
4. לחץ על **"Variables"** (בתפריט השמאלי)
5. לחץ על **"+ New Variable"** (כפתור כחול)

---

## ✅ משתנים שצריך להגדיר

### 1. COORDINATOR_GRPC_ENDPOINT

**ערך:**
```
coordinator.railway.internal:50051
```

**מתי להשתמש:**
- ✅ אם RAG ו-Coordinator **באותו פרויקט** ב-Railway
- ✅ זה Private Networking - עובד אוטומטית

**אלטרנטיבה (אם לא באותו פרויקט):**
- אם יש TCP Proxy: `gondola.proxy.rlwy.net:16335` (או הפורט שלך)
- אם לא: `coordinator-production-6004.up.railway.app:443` (עם SSL)

---

### 2. GRPC_USE_SSL

**ערך:**
```
false
```

**מתי להשתמש:**
- ✅ עם Private Networking (`coordinator.railway.internal`) → `false`
- ✅ עם TCP Proxy → `false`
- ❌ עם Public URL על port 443 → `true`

---

## 📋 צעדים מפורטים

### שלב 1: פתח את ה-RAG Service

```
Railway Dashboard
  → Projects
    → [הפרויקט שלך]
      → RAG Service (לא Coordinator!)
```

### שלב 2: פתח Variables

בתפריט השמאלי, לחץ על **"Variables"**

### שלב 3: הוסף משתנים

לחץ על **"+ New Variable"** והוסף:

#### משתנה 1:
- **Key:** `COORDINATOR_GRPC_ENDPOINT`
- **Value:** `coordinator.railway.internal:50051`
- לחץ **"Add"**

#### משתנה 2:
- **Key:** `GRPC_USE_SSL`
- **Value:** `false`
- לחץ **"Add"**

---

## 🎯 דוגמה מלאה

### אם RAG ו-Coordinator באותו פרויקט:

```env
COORDINATOR_GRPC_ENDPOINT=coordinator.railway.internal:50051
GRPC_USE_SSL=false
```

### אם יש TCP Proxy:

```env
COORDINATOR_GRPC_ENDPOINT=gondola.proxy.rlwy.net:16335
GRPC_USE_SSL=false
```

### אם צריך Public URL (לא מומלץ):

```env
COORDINATOR_GRPC_ENDPOINT=coordinator-production-6004.up.railway.app:443
GRPC_USE_SSL=true
```

---

## ✅ משתנים נוספים שצריך (אם עדיין לא מוגדרים)

### RAG_PRIVATE_KEY
- **Key:** `RAG_PRIVATE_KEY`
- **Value:** המפתח הפרטי ב-base64 (מהקובץ `keys/rag-service-private-key.pem`)
- **איך להמיר ל-base64:**
  ```bash
  # ב-PowerShell:
  $key = Get-Content "BACKEND/keys/rag-service-private-key.pem" -Raw
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($key)
  [Convert]::ToBase64String($bytes)
  ```

### COORDINATOR_PROTO_PATH (אופציונלי)
- **Key:** `COORDINATOR_PROTO_PATH`
- **Value:** `../DATABASE/proto/rag/v1/coordinator.proto`
- **הערה:** זה כבר ברירת מחדל בקוד, לא חובה

---

## 🔍 איך לבדוק שההגדרות נכונות

### 1. בדוק ב-Railway Dashboard

לך ל-RAG Service → Variables ותוודא ש:
- ✅ `COORDINATOR_GRPC_ENDPOINT` קיים
- ✅ `GRPC_USE_SSL` קיים
- ✅ `RAG_PRIVATE_KEY` קיים

### 2. בדוק ב-Logs

לך ל-RAG Service → Logs וחפש:
- ✅ `[Coordinator] Environment validation passed`
- ✅ `Created gRPC client`
- ✅ `Coordinator gRPC client created`

### 3. הרץ בדיקה

אם יש לך גישה ל-Railway CLI:
```bash
railway run --service rag-service node BACKEND/scripts/test-grpc-only.js
```

---

## ⚠️ הערות חשובות

1. **Private Networking עובד רק באותו פרויקט**
   - אם RAG ו-Coordinator בפרויקטים שונים, צריך TCP Proxy או Public URL

2. **GRPC_USE_SSL**
   - `false` = ללא SSL (Private Networking, TCP Proxy)
   - `true` = עם SSL (Public URL על port 443)

3. **Port 50051**
   - זה הפורט הפנימי של Coordinator
   - עם Private Networking, זה עובד אוטומטית
   - עם Public URL, צריך TCP Proxy

4. **אחרי שינוי משתנים**
   - Railway יבצע Redeploy אוטומטית
   - חכה כמה שניות עד שהשירות יתחיל מחדש

---

## 📸 תמונות (הסבר ויזואלי)

### 1. Variables Tab
```
Railway Dashboard
  → [Project]
    → [RAG Service]
      → Variables ← כאן!
```

### 2. Add Variable
```
Variables Tab
  → + New Variable ← לחץ כאן
    → Key: COORDINATOR_GRPC_ENDPOINT
    → Value: coordinator.railway.internal:50051
    → Add
```

---

## ✅ Checklist

- [ ] פתחתי Railway Dashboard
- [ ] בחרתי את ה-RAG Service (לא Coordinator!)
- [ ] פתחתי את ה-Variables tab
- [ ] הוספתי `COORDINATOR_GRPC_ENDPOINT=coordinator.railway.internal:50051`
- [ ] הוספתי `GRPC_USE_SSL=false`
- [ ] בדקתי ש-`RAG_PRIVATE_KEY` קיים
- [ ] בדקתי את ה-Logs שהכל עובד

---

## 🆘 בעיות נפוצות

### "coordinator.railway.internal not found"
**פתרון:** RAG ו-Coordinator לא באותו פרויקט. השתמש ב-TCP Proxy או Public URL.

### "Failed to connect"
**פתרון:** 
1. בדוק ש-Coordinator רץ
2. בדוק ש-`GRPC_ENABLED=true` ב-Coordinator
3. בדוק ש-port 50051 חשוף

### "Signature error"
**פתרון:** בדוק ש-`RAG_PRIVATE_KEY` מוגדר נכון (base64 encoded)

---

## 📚 קישורים נוספים

- [Railway Variables Documentation](https://docs.railway.app/develop/variables)
- [Railway Private Networking](https://docs.railway.app/networking/private-networking)

