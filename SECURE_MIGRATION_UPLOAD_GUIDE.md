# 🔐 מדריך העלאת Migration מאובטחת

## סקירה כללית

מדריך זה מסביר כיצד להעלות את קובץ ה-migration לשלב 2 של הרישום עם חתימה דיגיטלית מאובטחת.

## דרישות מוקדמות

1. ✅ **Service ID** - קיבלת בשלב 1: `b75b5a42-3b19-404e-819b-262001c4c38d`
2. ✅ **Private Key** - מפתח פרטי מהשירות (מ-GitHub Secrets)
3. ✅ **Service Name** - שם השירות (לדוגמה: `rag-service`)
4. ✅ **Coordinator URL** - כתובת ה-Coordinator

## שלב 1: יצירת מפתחות (אם עדיין לא נוצרו)

### יצירת מפתחות חדשים

```bash
cd BACKEND
SERVICE_NAME=rag-service node scripts/generate-keys.js
```

זה ייצור:
- `keys/rag-service-private-key.pem` - העתק ל-GitHub Secrets → `PRIVATE_KEY`
- `keys/rag-service-public-key.pem` - שלח למנהל ה-Coordinator

### העתקת Private Key ל-GitHub Secrets

1. פתח את ה-repository ב-GitHub
2. לך ל-Settings → Secrets and variables → Actions
3. הוסף Secret חדש:
   - Name: `PRIVATE_KEY`
   - Value: תוכן הקובץ `rag-service-private-key.pem`

## שלב 2: הגדרת משתני סביבה

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
- ה-Private Key צריך להיות בפורמט PEM מלא

## שלב 3: העלאת ה-Migration

### אפשרות 1: Node.js Script (מומלץ)

```bash
cd BACKEND
node scripts/upload-migration-secure.js
```

הסקריפט:
- ✅ קורא את `migration-file.json`
- ✅ יוצר חתימה דיגיטלית
- ✅ שולח את הבקשה עם ה-headers הנדרשים
- ✅ מציג את התוצאה

### אפשרות 2: PowerShell (Windows)

```powershell
cd BACKEND
.\scripts\upload-migration-secure.ps1
```

או עם פרמטרים:

```powershell
.\scripts\upload-migration-secure.ps1 `
  -ServiceId "b75b5a42-3b19-404e-819b-262001c4c38d" `
  -CoordinatorUrl "http://localhost:3000" `
  -ServiceName "rag-service"
```

### אפשרות 3: cURL ידני

```bash
# 1. יצירת חתימה (Node.js)
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

# 2. העלאת הקובץ
curl -X POST "http://localhost:3000/register/b75b5a42-3b19-404e-819b-262001c4c38d/migration" \
  -H "Content-Type: application/json" \
  -H "X-Service-Name: rag-service" \
  -H "X-Signature: $SIGNATURE" \
  -d @migration-file.json
```

## פורמט החתימה

החתימה נוצרת לפי הפורמט:

```
"educoreai-{service-name}-{payload-hash}"
```

כאשר:
- `service-name` = שם השירות (לדוגמה: `rag-service`)
- `payload-hash` = SHA-256 hash של ה-payload (JSON stringified)

## Headers נדרשים

### Request Headers

```
Content-Type: application/json
X-Service-Name: rag-service
X-Signature: <base64-encoded-signature>
```

### Response Headers (מ-Coordinator)

```
X-Service-Name: coordinator
X-Service-Signature: <coordinator-signature>
```

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

### שגיאה - Service לא נמצא (404 Not Found)

```json
{
  "success": false,
  "error": "Service not found"
}
```

**פתרון:**
- בדוק שה-Service ID נכון
- ודא שהשירות נרשם בשלב 1

## אימות תגובת Coordinator

לאחר קבלת התגובה, מומלץ לאמת את החתימה של ה-Coordinator:

```javascript
const { verifySignature } = require('./src/utils/signature');
const coordinatorPublicKey = getCoordinatorPublicKey(); // מקובץ config

const isValid = verifySignature(
  'coordinator',
  response.headers['x-service-signature'],
  coordinatorPublicKey,
  response.data
);

if (!isValid) {
  console.error('⚠️  Invalid coordinator signature!');
}
```

## פתרון בעיות

### שגיאה: "PRIVATE_KEY environment variable is required"

**פתרון:**
1. ודא שה-Private Key מוגדר ב-`.env` או ב-GitHub Secrets
2. בדוק שהפורמט נכון (PEM מלא עם `-----BEGIN PRIVATE KEY-----`)

### שגיאה: "ECONNREFUSED"

**פתרון:**
1. ודא שה-Coordinator רץ
2. בדוק את ה-URL (localhost vs production)
3. בדוק firewall/network settings

### שגיאה: "Authentication failed"

**פתרון:**
1. ודא שה-Private Key תואם ל-Public Key ב-Coordinator
2. בדוק שה-Service Name נכון
3. ודא שה-payload זהה (JSON.stringify יכול ליצור הבדלים)

### שגיאה: "Migration file not found"

**פתרון:**
1. ודא ש-`migration-file.json` נמצא בתיקיית השורש
2. בדוק את הנתיב בקוד

## בדיקות

### בדיקת חתימה מקומית

```javascript
const { generateSignature, verifySignature } = require('./src/utils/signature');
const fs = require('fs');

const privateKey = fs.readFileSync('keys/rag-service-private-key.pem', 'utf8');
const publicKey = fs.readFileSync('keys/rag-service-public-key.pem', 'utf8');
const serviceName = 'rag-service';
const payload = { test: 'data' };

// Generate signature
const signature = generateSignature(serviceName, privateKey, payload);
console.log('Signature:', signature);

// Verify signature
const isValid = verifySignature(serviceName, signature, publicKey, payload);
console.log('Valid:', isValid); // Should be true
```

## אבטחה

### ✅ Best Practices

1. **Private Keys** - לעולם אל תעלה ל-Git, השתמש ב-GitHub Secrets
2. **Public Keys** - בטוח לאחסן בקובצי config
3. **HTTPS** - השתמש ב-HTTPS ב-production
4. **Logging** - רשום ניסיונות אימות (ללא פרטים רגישים)
5. **Key Rotation** - תכנן רוטציה תקופתית של מפתחות

### ⚠️ אזהרות

- אל תשתף Private Keys
- אל תעלה Private Keys ל-Git
- ודא שה-Coordinator מאמת חתימות לפני עיבוד
- בדוק תמיד את חתימת התגובה מה-Coordinator

## סיכום

1. ✅ צור מפתחות (אם צריך)
2. ✅ העתק Private Key ל-GitHub Secrets
3. ✅ הגדר משתני סביבה
4. ✅ הרץ את סקריפט ההעלאה
5. ✅ בדוק את התגובה
6. ✅ אמת את חתימת ה-Coordinator

## קישורים נוספים

- [Digital Signatures Feature Documentation](../docs/features/14-digital-signatures.md)
- [Service Registration Guide](../MICROSERVICE_REGISTRATION_GUIDE.md)
- [Security Best Practices](../docs/SECURITY_RECOMMENDATIONS.md)







