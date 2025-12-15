# סטטוס Coordinator - בדיקה

## מצב נוכחי

❌ **Coordinator לא זמין** - שגיאה 502 (Application failed to respond)

**URL:** `https://coordinator-production-6004.up.railway.app`

## מה זה אומר?

שגיאה 502 אומרת שה-Railway proxy לא יכול להגיע לשרת Coordinator עצמו. זה יכול להיות בגלל:

1. השרת לא רץ
2. השרת קרס
3. בעיית תקשורת פנימית ב-Railway
4. השרת בתהליך restart

## מה לעשות?

### 1. בדוק את Railway Dashboard
- היכנס ל-Railway dashboard
- בדוק את ה-deployment של Coordinator
- בדוק את ה-logs

### 2. נסה שוב בעוד כמה דקות
- לפעמים השרת צריך זמן להתחיל
- Railway יכול לעשות auto-restart

### 3. בדוק את ה-URL
- ודא שה-URL נכון: `coordinator-production-6004.up.railway.app`
- אולי יש URL אחר?

### 4. בדוק את RAG Service
- RAG Service צריך להיות זמין לפני הרישום
- URL: `https://rag-production-3a4c.up.railway.app`

## קבצים מוכנים לרישום

כשה-Coordinator יהיה זמין, כל הקבצים מוכנים:

1. ✅ `rag-migration-file.json` - קובץ המיגרציה המלא
2. ✅ `register-rag-stage1.json` - Body ל-Stage 1
3. ✅ `register-rag-service.ps1` - סקריפט PowerShell

## פקודה לבדיקה מהירה

```powershell
# בדוק Coordinator
Invoke-RestMethod -Uri "https://coordinator-production-6004.up.railway.app/health" -Method GET

# בדוק RAG
Invoke-RestMethod -Uri "https://rag-production-3a4c.up.railway.app/health" -Method GET
```

## כשהשרת יהיה זמין

הרץ את הסקריפט:
```powershell
powershell -ExecutionPolicy Bypass -File register-rag-service.ps1
```

או השתמש ב-cURL/Postman לפי ההוראות ב-`RAG_REGISTRATION_GUIDE.md`






