# 🚀 פקודת הפעלה ידנית - BATCH SYNC

## 🌐 Production URL
**Base URL:** `https://rag-production-3a4c.up.railway.app/`

## 📋 פקודת cURL

### הפעלה ב-Production:
```bash
curl -X POST https://rag-production-3a4c.up.railway.app/admin/batch-sync/trigger \
  -H "Content-Type: application/json"
```

### הפעלה ב-Local (Development):
```bash
curl -X POST http://localhost:3000/admin/batch-sync/trigger \
  -H "Content-Type: application/json"
```

### עם output מפורט:
```bash
curl -X POST https://rag-production-3a4c.up.railway.app/admin/batch-sync/trigger \
  -H "Content-Type: application/json" \
  -v
```

### שמירת תגובה לקובץ:
```bash
curl -X POST https://rag-production-3a4c.up.railway.app/admin/batch-sync/trigger \
  -H "Content-Type: application/json" \
  -o batch-sync-response.json
```

---

## 🌐 PowerShell (Windows)

### Production:
```powershell
Invoke-RestMethod -Uri "https://rag-production-3a4c.up.railway.app/admin/batch-sync/trigger" `
  -Method POST `
  -ContentType "application/json"
```

### עם output מפורט:
```powershell
$response = Invoke-RestMethod -Uri "https://rag-production-3a4c.up.railway.app/admin/batch-sync/trigger" `
  -Method POST `
  -ContentType "application/json"

$response | ConvertTo-Json -Depth 10
```

### Local Development:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/admin/batch-sync/trigger" `
  -Method POST `
  -ContentType "application/json"
```

---

## 📊 תגובה מצופה

### הצלחה:
```json
{
  "success": true,
  "message": "Batch sync completed",
  "result": {
    "success": true,
    "services": [
      {
        "service": "managementreporting-service",
        "success": true,
        "totalItems": 150,
        "totalPages": 1,
        "errors": [],
        "duration_ms": 5234
      }
    ],
    "totalItems": 150,
    "totalErrors": 0,
    "successfulServices": 1,
    "failedServices": 0,
    "duration_ms": 5234
  },
  "timestamp": "2024-01-27T10:30:00.000Z"
}
```

### שגיאה:
```json
{
  "success": false,
  "error": "Error message here",
  "stack": "...",
  "timestamp": "2024-01-27T10:30:00.000Z"
}
```

---

## 🔍 פקודות נוספות

### רשימת שירותים:
```bash
# Production
curl -X GET https://rag-production-3a4c.up.railway.app/admin/batch-sync/services \
  -H "Content-Type: application/json"

# Local
curl -X GET http://localhost:3000/admin/batch-sync/services \
  -H "Content-Type: application/json"
```

### בדיקת סטטוס:
```bash
# Production
curl -X GET https://rag-production-3a4c.up.railway.app/health/batch-sync \
  -H "Content-Type: application/json"

# Local
curl -X GET http://localhost:3000/health/batch-sync \
  -H "Content-Type: application/json"
```

---

## 📝 דוגמאות שימוש

### 1. הפעלה פשוטה (Production):
```bash
curl -X POST https://rag-production-3a4c.up.railway.app/admin/batch-sync/trigger
```

### 2. עם לוגים (Production):
```bash
curl -X POST https://rag-production-3a4c.up.railway.app/admin/batch-sync/trigger \
  -H "Content-Type: application/json" \
  -w "\n\nStatus: %{http_code}\nTime: %{time_total}s\n"
```

### 3. בדיקה מהירה (Production):
```bash
# בדיקת זמינות
curl -X GET https://rag-production-3a4c.up.railway.app/health

# רשימת שירותים
curl -X GET https://rag-production-3a4c.up.railway.app/admin/batch-sync/services

# הפעלת sync
curl -X POST https://rag-production-3a4c.up.railway.app/admin/batch-sync/trigger
```

### 4. בדיקה מהירה (Local):
```bash
# בדיקת זמינות
curl -X GET http://localhost:3000/health

# רשימת שירותים
curl -X GET http://localhost:3000/admin/batch-sync/services

# הפעלת sync
curl -X POST http://localhost:3000/admin/batch-sync/trigger
```

---

## ⚙️ הגדרות סביבה

הפורט נקבע לפי:
- `PORT` env var (אם מוגדר)
- ברירת מחדל: `3000`

לבדיקת הפורט בפועל, בדוק את הלוגים בעת הפעלת השרת:
```
Server running on port 3000
```

---

## 🐛 Debugging

### אם הפקודה נכשלת:

1. **בדוק שהשרת רץ (Production):**
```bash
curl -X GET https://rag-production-3a4c.up.railway.app/health
```

2. **בדוק שהשרת רץ (Local):**
```bash
curl -X GET http://localhost:3000/health
```

2. **בדוק את הלוגים:**
```bash
# הפעל את השרת עם debug mode
# וצפה בלוגים בזמן אמת
```

3. **בדוק את הפורט:**
```bash
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000
```

---

## 📌 הערות חשובות

- ✅ הפעלה ידנית לא דורשת authentication (בסביבת dev)
- ⚠️ הפעלה ידנית יכולה לקחת זמן (תלוי בכמות הנתונים)
- 🔄 אם sync כבר רץ, הפקודה תדלג (`already_running`)
- 📊 התגובה כוללת סטטיסטיקות מפורטות

---

**נוצר:** $(date)

