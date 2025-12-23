# 🚀 BATCH SYNC - Quick Reference

## 🌐 Production URL
**Base URL:** `https://rag-production-3a4c.up.railway.app/`

---

## ⚡ פקודות מהירות

### 1. הפעלת Batch Sync (Production)
```bash
curl -X POST https://rag-production-3a4c.up.railway.app/admin/batch-sync/trigger
```

### 2. רשימת שירותים (Production)
```bash
curl -X GET https://rag-production-3a4c.up.railway.app/admin/batch-sync/services
```

### 3. בדיקת סטטוס (Production)
```bash
curl -X GET https://rag-production-3a4c.up.railway.app/health/batch-sync
```

### 4. בדיקת זמינות (Production)
```bash
curl -X GET https://rag-production-3a4c.up.railway.app/health
```

---

## 💻 PowerShell (Windows)

```powershell
# הפעלת Batch Sync
Invoke-RestMethod -Uri "https://rag-production-3a4c.up.railway.app/admin/batch-sync/trigger" -Method POST -ContentType "application/json"

# רשימת שירותים
Invoke-RestMethod -Uri "https://rag-production-3a4c.up.railway.app/admin/batch-sync/services" -Method GET

# בדיקת סטטוס
Invoke-RestMethod -Uri "https://rag-production-3a4c.up.railway.app/health/batch-sync" -Method GET
```

---

## 📊 תגובה מצופה

```json
{
  "success": true,
  "message": "Batch sync completed",
  "result": {
    "success": true,
    "services": [...],
    "totalItems": 150,
    "totalErrors": 0,
    "successfulServices": 1,
    "failedServices": 0,
    "duration_ms": 5234
  },
  "timestamp": "2024-01-27T10:30:00.000Z"
}
```

---

## 🔗 Endpoints זמינים

| Endpoint | Method | תיאור |
|----------|--------|-------|
| `/admin/batch-sync/trigger` | POST | הפעלת batch sync ידנית |
| `/admin/batch-sync/services` | GET | רשימת שירותים לסנכרון |
| `/health/batch-sync` | GET | סטטוס scheduler |
| `/health` | GET | בדיקת זמינות כללית |

---

## 📝 הערות

- ✅ כל הפקודות עובדות ב-Production
- ⚠️ הפעלה ידנית יכולה לקחת זמן (תלוי בכמות הנתונים)
- 🔄 אם sync כבר רץ, הפקודה תדלג (`already_running`)
- 📊 התגובה כוללת סטטיסטיקות מפורטות

---

**Production URL:** [https://rag-production-3a4c.up.railway.app/](https://rag-production-3a4c.up.railway.app/)

