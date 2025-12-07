# הוראות העלאת קובץ ה-Migration

## 🔐 העלאה מאובטחת עם חתימה דיגיטלית

**⚠️ חשוב:** כל ההעלאות חייבות לכלול חתימה דיגיטלית מאובטחת.

## Service ID
```
b75b5a42-3b19-404e-819b-262001c4c38d
```

## דרישות מוקדמות

1. ✅ **Private Key** - מפתח פרטי מהשירות (מ-GitHub Secrets)
2. ✅ **Service Name** - שם השירות (לדוגמה: `rag-service`)
3. ✅ **Coordinator URL** - כתובת ה-Coordinator

## אפשרויות העלאה מאובטחת

### אפשרות 1: Node.js Script (מומלץ) ⭐

```bash
cd BACKEND

# הגדר משתני סביבה ב-.env או ב-GitHub Secrets
# PRIVATE_KEY, SERVICE_NAME, COORDINATOR_URL, SERVICE_ID

node scripts/upload-migration-secure.js
```

**יתרונות:**
- ✅ חתימה דיגיטלית אוטומטית
- ✅ אימות אוטומטי
- ✅ הודעות שגיאה ברורות

### אפשרות 2: PowerShell Script (Windows)

```powershell
cd BACKEND

# הגדר משתני סביבה או העבר כפרמטרים
.\scripts\upload-migration-secure.ps1 `
  -ServiceId "b75b5a42-3b19-404e-819b-262001c4c38d" `
  -CoordinatorUrl "http://localhost:3000" `
  -ServiceName "rag-service"
```

### אפשרות 3: cURL ידני (מתקדם)

```bash
# 1. יצירת חתימה
SIGNATURE=$(node -e "
const crypto = require('crypto');
const fs = require('fs');
const serviceName = 'rag-service';
const privateKey = process.env.PRIVATE_KEY;
const payload = JSON.parse(fs.readFileSync('migration-file.json', 'utf8'));

let message = \`educoreai-\${serviceName}\`;
const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
message = \`\${message}-\${payloadHash}\`;

const sign = crypto.createSign('SHA256');
sign.update(message);
sign.end();
console.log(sign.sign(privateKey, 'base64'));
")

# 2. העלאת הקובץ עם חתימה
curl -X POST "http://localhost:3000/register/b75b5a42-3b19-404e-819b-262001c4c38d/migration" \
  -H "Content-Type: application/json" \
  -H "X-Service-Name: rag-service" \
  -H "X-Signature: $SIGNATURE" \
  -d @migration-file.json
```

## הגדרת משתני סביבה

צור קובץ `.env` בתיקיית `BACKEND/`:

```bash
# Service Configuration
SERVICE_NAME=rag-service
SERVICE_ID=b75b5a42-3b19-404e-819b-262001c4c38d

# Coordinator Configuration
COORDINATOR_URL=http://localhost:3000
# או ל-production:
# COORDINATOR_URL=https://coordinator-production-e0a0.up.railway.app

# Private Key (מ-GitHub Secrets)
PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----"
```

**⚠️ חשוב:** 
- אל תעלה את קובץ `.env` ל-Git
- השתמש ב-GitHub Secrets ב-production

## תגובה צפויה

### הצלחה (200 OK)
```json
{
  "success": true,
  "message": "Migration file uploaded successfully. Service is now active.",
  "serviceId": "b75b5a42-3b19-404e-819b-262001c4c38d",
  "status": "active",
  "registeredAt": "2025-01-27T..."
}
```

**Response Headers:**
```
X-Service-Name: coordinator
X-Service-Signature: <coordinator-signature>
```

### שגיאה - חתימה לא תקינה (401 Unauthorized)
```json
{
  "success": false,
  "message": "Authentication failed"
}
```

**פתרון:**
- בדוק שה-Private Key נכון
- ודא שה-Service Name תואם
- ודא שה-payload זהה לזה שחתמת עליו

## פתרון בעיות

### שגיאה: "PRIVATE_KEY environment variable is required"
**פתרון:** ודא שה-Private Key מוגדר ב-`.env` או ב-GitHub Secrets

### שגיאה: "ECONNREFUSED"
**פתרון:** ודא שה-Coordinator רץ וזמין

### שגיאה: "Authentication failed"
**פתרון:** 
- בדוק שה-Private Key תואם ל-Public Key ב-Coordinator
- ודא שה-Service Name נכון

## מידע נוסף

למדריך מפורט יותר, ראה: [SECURE_MIGRATION_UPLOAD_GUIDE.md](./SECURE_MIGRATION_UPLOAD_GUIDE.md)

