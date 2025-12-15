# 🚀 מדריך רישום ב-Production (Railway)

## סקירה כללית

מדריך זה מסביר כיצד לרשום את ה-RAG Microservice ב-Coordinator ב-Production על Railway.

## URLs

### Coordinator (Production)
```
https://coordinator-production-e0a0.up.railway.app
```

### RAG Microservice (Production)
```
https://ragmicroservice-production.up.railway.app
```

## תהליך הרישום - Production

### שלב 1: הכנה

#### 1.1 צור מפתחות (אם עדיין לא)

```bash
cd BACKEND
SERVICE_NAME=rag-service node scripts/generate-keys.js
```

**תוצאה:**
- `keys/rag-service-private-key.pem` → העתק ל-GitHub Secrets
- `keys/rag-service-public-key.pem` → שלח למנהל Coordinator

#### 1.2 העתק Private Key ל-GitHub Secrets

1. פתח את ה-repository ב-GitHub
2. לך ל-Settings → Secrets and variables → Actions (או Repository secrets)
3. הוסף Secret חדש:
   - Name: `PRIVATE_KEY`
   - Value: תוכן הקובץ `keys/rag-service-private-key.pem` (כולל `-----BEGIN PRIVATE KEY-----` ו-`-----END PRIVATE KEY-----`)

#### 1.3 שלח Public Key למנהל Coordinator

שלח את תוכן `keys/rag-service-public-key.pem` למנהל Coordinator כדי שיוסיף ל-`authorized-services.json`.

#### 1.4 קבל Coordinator Public Key (מומלץ)

בקש ממנהל Coordinator את ה-Public Key של Coordinator לאמת תגובות.

### שלב 2: הגדרת משתני סביבה ב-Railway

#### 2.1 הוסף Secrets ב-Railway

ב-Railway Dashboard → RAG Microservice → Variables:

**Required Variables:**
```
PRIVATE_KEY=<your-private-key-from-github-secrets>
SERVICE_NAME=rag-service
COORDINATOR_URL=https://coordinator-production-e0a0.up.railway.app
SERVICE_ENDPOINT=https://ragmicroservice-production.up.railway.app
SERVICE_VERSION=1.0.0
SERVICE_HEALTH_CHECK=/health
SERVICE_DESCRIPTION=RAG Microservice - Contextual Assistant
```

**Optional (מומלץ):**
```
COORDINATOR_PUBLIC_KEY=<coordinator-public-key>
```

#### 2.2 או השתמש ב-GitHub Secrets

אם אתה משתמש ב-GitHub Actions ל-deployment, הוסף את ה-Secrets ב-GitHub:
- Settings → Secrets and variables → Actions
- הוסף את כל המשתנים הנדרשים

### שלב 3: רישום שלב 1 (Basic Registration)

#### אפשרות 1: הרצה מקומית (עם Railway URLs)

```bash
cd BACKEND

# צור .env עם production URLs
cat > .env << EOF
PRIVATE_KEY="$(cat keys/rag-service-private-key.pem)"
SERVICE_NAME=rag-service
COORDINATOR_URL=https://coordinator-production-e0a0.up.railway.app
SERVICE_ENDPOINT=https://ragmicroservice-production.up.railway.app
SERVICE_VERSION=1.0.0
SERVICE_HEALTH_CHECK=/health
SERVICE_DESCRIPTION="RAG Microservice - Contextual Assistant"
COORDINATOR_PUBLIC_KEY="<coordinator-public-key-if-available>"
EOF

# הרץ רישום
node scripts/register-service-secure.js
```

#### אפשרות 2: cURL ידני

```bash
# 1. צור חתימה
SIGNATURE=$(node -e "
const crypto = require('crypto');
const fs = require('fs');
const serviceName = 'rag-service';
const privateKey = process.env.PRIVATE_KEY || fs.readFileSync('keys/rag-service-private-key.pem', 'utf8');
const payload = {
  serviceName: 'rag-service',
  version: '1.0.0',
  endpoint: 'https://ragmicroservice-production.up.railway.app',
  healthCheck: '/health',
  description: 'RAG Microservice - Contextual Assistant',
  metadata: {
    team: 'EDUCORE Team',
    capabilities: ['rag queries', 'knowledge graph', 'vector search']
  }
};

let message = \`educoreai-\${serviceName}\`;
const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
message = \`\${message}-\${payloadHash}\`;

const sign = crypto.createSign('SHA256');
sign.update(message);
sign.end();
console.log(sign.sign(privateKey, 'base64'));
")

# 2. רשום את השירות
curl -X POST "https://coordinator-production-e0a0.up.railway.app/register" \
  -H "Content-Type: application/json" \
  -H "X-Service-Name: rag-service" \
  -H "X-Signature: $SIGNATURE" \
  -d '{
    "serviceName": "rag-service",
    "version": "1.0.0",
    "endpoint": "https://ragmicroservice-production.up.railway.app",
    "healthCheck": "/health",
    "description": "RAG Microservice - Contextual Assistant",
    "metadata": {
      "team": "EDUCORE Team",
      "capabilities": ["rag queries", "knowledge graph", "vector search"]
    }
  }'
```

#### אפשרות 3: דרך Railway CLI או Script

אם יש לך גישה ל-Railway CLI, תוכל להריץ את הסקריפט ישירות:

```bash
railway run node BACKEND/scripts/register-service-secure.js
```

### שלב 4: העלאת Migration (שלב 2)

לאחר קבלת Service ID בשלב 1:

```bash
cd BACKEND

# עדכן את SERVICE_ID ב-.env או השתמש בקובץ .service-id
# הסקריפט יקרא אוטומטית מ-.service-id אם קיים

node scripts/upload-migration-secure.js
```

או עם cURL:

```bash
# 1. צור חתימה ל-migration
SIGNATURE=$(node -e "
const crypto = require('crypto');
const fs = require('fs');
const serviceName = 'rag-service';
const privateKey = process.env.PRIVATE_KEY || fs.readFileSync('keys/rag-service-private-key.pem', 'utf8');
const payload = JSON.parse(fs.readFileSync('migration-file.json', 'utf8'));

let message = \`educoreai-\${serviceName}\`;
const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
message = \`\${message}-\${payloadHash}\`;

const sign = crypto.createSign('SHA256');
sign.update(message);
sign.end();
console.log(sign.sign(privateKey, 'base64'));
")

# 2. העלה migration (החלף SERVICE_ID ב-ID שקיבלת)
curl -X POST "https://coordinator-production-e0a0.up.railway.app/register/SERVICE_ID/migration" \
  -H "Content-Type: application/json" \
  -H "X-Service-Name: rag-service" \
  -H "X-Signature: $SIGNATURE" \
  -d @migration-file.json
```

## בדיקות

### בדיקת Health Check

```bash
# RAG Microservice
curl https://ragmicroservice-production.up.railway.app/health

# Coordinator
curl https://coordinator-production-e0a0.up.railway.app/health
```

### בדיקת רישום

```bash
# בדוק רשימת שירותים
curl https://coordinator-production-e0a0.up.railway.app/services

# בדוק שירות ספציפי (החלף SERVICE_ID)
curl https://coordinator-production-e0a0.up.railway.app/services/SERVICE_ID
```

## פתרון בעיות

### שגיאה: "ECONNREFUSED" או "Network Error"

**פתרון:**
- ודא שה-Coordinator רץ ב-Railway
- בדוק שה-URL נכון: `https://coordinator-production-e0a0.up.railway.app`
- ודא שיש גישה ל-internet

### שגיאה: "Authentication failed"

**פתרון:**
- ודא שה-Private Key נכון ב-Railway Variables
- ודא שה-Public Key שלך נוסף ל-Coordinator
- בדוק שה-Service Name תואם

### שגיאה: "Service with name 'rag-service' already exists"

**פתרון:**
- השירות כבר רשום
- בדוק את רשימת השירותים: `GET /services`
- אם צריך, מחק את הרישום הקודם דרך Coordinator

### שגיאה: "HTTPS required"

**פתרון:**
- ודא שאתה משתמש ב-`https://` ולא `http://`
- כל ה-URLs ב-production חייבים להיות HTTPS

## אבטחה ב-Production

### ✅ Best Practices

1. **Private Keys** - לעולם אל תעלה ל-Git, השתמש ב-Railway Variables או GitHub Secrets
2. **HTTPS** - כל התקשורת חייבת להיות ב-HTTPS
3. **Public Keys** - בטוח לאחסן ב-config files
4. **Logging** - רשום ניסיונות אימות (ללא פרטים רגישים)
5. **Key Rotation** - תכנן רוטציה תקופתית של מפתחות

### ⚠️ אזהרות

- אל תשתף Private Keys
- אל תעלה Private Keys ל-Git
- ודא שה-Coordinator מאמת חתימות לפני עיבוד
- בדוק תמיד את חתימת התגובה מה-Coordinator

## סיכום - Production URLs

### Coordinator
```
https://coordinator-production-e0a0.up.railway.app
```

### RAG Microservice
```
https://ragmicroservice-production.up.railway.app
```

### Endpoints

**Registration:**
```
POST https://coordinator-production-e0a0.up.railway.app/register
POST https://coordinator-production-e0a0.up.railway.app/register/{serviceId}/migration
```

**Health Checks:**
```
GET https://ragmicroservice-production.up.railway.app/health
GET https://coordinator-production-e0a0.up.railway.app/health
```

**Service Discovery:**
```
GET https://coordinator-production-e0a0.up.railway.app/services
```

## קישורים נוספים

- [Service Registration Guide](./SERVICE_REGISTRATION_GUIDE.md)
- [Secure Migration Upload Guide](./SECURE_MIGRATION_UPLOAD_GUIDE.md)
- [Digital Signatures Documentation](../docs/features/14-digital-signatures.md)








