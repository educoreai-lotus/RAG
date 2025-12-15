# 🔐 מדריך רישום שירות מאובטח

## סקירה כללית

מדריך זה מסביר את תהליך הרישום המאובטח של השירות ב-Coordinator עם חתימות דיגיטליות.

## תהליך הרישום - שני שלבים

### שלב 1: רישום בסיסי (Basic Registration)
- רישום פרטי השירות הבסיסיים
- קבלת Service ID
- סטטוס: `pending_migration`

### שלב 2: העלאת Migration
- העלאת קובץ ה-migration
- השלמת הרישום
- סטטוס: `active`

## שאלה: האם צריך את ה-Public Key של Coordinator לפני הרישום?

### תשובה קצרה: **לא חובה, אבל מומלץ**

**למה לא חובה:**
- ✅ אתה יכול לרשום את השירות בלי ה-public key של Coordinator
- ✅ Coordinator יאמת את החתימה שלך עם ה-public key שלך (שהוא צריך לקבל ממך)
- ✅ הרישום יעבוד גם בלי אימות תגובת Coordinator

**למה מומלץ:**
- ✅ **אבטחה**: תוכל לאמת שהתגובה באמת הגיעה מה-Coordinator
- ✅ **אמון**: תהיה בטוח שהתגובה לא שונתה בדרך
- ✅ **Best Practice**: אימות דו-כיווני (mutual authentication)

## תהליך מומלץ

### לפני הרישום

1. **צור מפתחות** (אם עדיין לא):
   ```bash
   cd BACKEND
   SERVICE_NAME=rag-service node scripts/generate-keys.js
   ```

2. **הכן את ה-Public Key שלך**:
   - קובץ: `keys/rag-service-public-key.pem`
   - שלח למנהל Coordinator

3. **קבל את ה-Public Key של Coordinator** (מומלץ):
   - בקש ממנהל Coordinator
   - שמור ב-`.env` כ-`COORDINATOR_PUBLIC_KEY`

### שלב 1: רישום בסיסי

```bash
cd BACKEND

# הגדר משתני סביבה ב-.env
node scripts/register-service-secure.js
```

**משתני סביבה נדרשים:**
```bash
PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----"

SERVICE_NAME=rag-service
COORDINATOR_URL=http://localhost:3000

SERVICE_ENDPOINT=http://rag-service:3000
SERVICE_VERSION=1.0.0
SERVICE_HEALTH_CHECK=/health
SERVICE_DESCRIPTION="RAG Microservice - Contextual Assistant"
```

**משתני סביבה אופציונליים:**
```bash
COORDINATOR_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----"
```

### שלב 2: העלאת Migration

לאחר קבלת Service ID בשלב 1:

```bash
cd BACKEND
node scripts/upload-migration-secure.js
```

## פורמט החתימה

### שלב 1 - רישום בסיסי

**Message to Sign:**
```
"educoreai-{service-name}-{payload-hash}"
```

**Payload:**
```json
{
  "serviceName": "rag-service",
  "version": "1.0.0",
  "endpoint": "http://rag-service:3000",
  "healthCheck": "/health",
  "description": "...",
  "metadata": {...}
}
```

**Headers:**
```
Content-Type: application/json
X-Service-Name: rag-service
X-Signature: <base64-signature>
```

### שלב 2 - העלאת Migration

**Message to Sign:**
```
"educoreai-{service-name}-{payload-hash}"
```

**Payload:**
```json
{
  "migrationFile": {...}
}
```

## תגובה צפויה - שלב 1

### הצלחה (201 Created)

```json
{
  "success": true,
  "message": "Service registered successfully. Please upload migration file.",
  "serviceId": "b75b5a42-3b19-404e-819b-262001c4c38d",
  "status": "pending_migration",
  "nextStep": {
    "action": "POST",
    "endpoint": "/register/{serviceId}/migration",
    "description": "Upload your migration file to complete registration"
  }
}
```

**Response Headers:**
```
X-Service-Name: coordinator
X-Service-Signature: <coordinator-signature>
```

### אימות חתימת Coordinator (אם יש Public Key)

אם הגדרת `COORDINATOR_PUBLIC_KEY` ב-`.env`, הסקריפט יאמת אוטומטית את החתימה:

```
✅ Coordinator signature verified!
```

אם אין Public Key:
```
⚠️  Coordinator public key not provided - skipping verification
💡 Set COORDINATOR_PUBLIC_KEY in .env to enable verification
```

## תהליך מלא - צעד אחר צעד

### 1. צור מפתחות

```bash
cd BACKEND
SERVICE_NAME=rag-service node scripts/generate-keys.js
```

**תוצאה:**
- `keys/rag-service-private-key.pem` → העתק ל-GitHub Secrets
- `keys/rag-service-public-key.pem` → שלח למנהל Coordinator

### 2. העתק Private Key ל-GitHub Secrets

1. פתח את ה-repository ב-GitHub
2. Settings → Secrets and variables → Actions
3. הוסף Secret: `PRIVATE_KEY` = תוכן הקובץ

### 3. שלח Public Key למנהל Coordinator

שלח את תוכן `keys/rag-service-public-key.pem` למנהל Coordinator.

### 4. קבל Coordinator Public Key (מומלץ)

בקש ממנהל Coordinator את ה-Public Key של Coordinator.

### 5. הגדר משתני סביבה

צור `BACKEND/.env`:

```bash
# Private Key (מ-GitHub Secrets)
PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----"

# Service Configuration
SERVICE_NAME=rag-service
SERVICE_ENDPOINT=http://rag-service:3000
SERVICE_VERSION=1.0.0
SERVICE_HEALTH_CHECK=/health
SERVICE_DESCRIPTION="RAG Microservice - Contextual Assistant"

# Coordinator Configuration
COORDINATOR_URL=http://localhost:3000
# Coordinator Public Key (מומלץ - לא חובה)
COORDINATOR_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----"
```

### 6. הרץ רישום שלב 1

```bash
cd BACKEND
node scripts/register-service-secure.js
```

**תוצאה:**
- Service ID נשמר ב-`.service-id`
- הודעה על הצלחה
- אימות חתימה (אם יש Coordinator Public Key)

### 7. העלה Migration (שלב 2)

```bash
cd BACKEND
node scripts/upload-migration-secure.js
```

## פתרון בעיות

### שגיאה: "PRIVATE_KEY environment variable is required"

**פתרון:**
- ודא שה-Private Key מוגדר ב-`.env` או ב-GitHub Secrets
- בדוק שהפורמט נכון (PEM מלא)

### שגיאה: "Authentication failed"

**פתרון:**
- ודא שה-Public Key שלך נשלח למנהל Coordinator
- בדוק שה-Coordinator הוסיף את ה-Public Key ל-`authorized-services.json`
- ודא שה-Service Name תואם

### שגיאה: "Service with name 'rag-service' already exists"

**פתרון:**
- השירות כבר רשום
- בדוק אם יש Service ID קיים
- אם צריך, מחק את הרישום הקודם דרך Coordinator

### שגיאה: "Coordinator signature verification failed"

**פתרון:**
- בדוק שה-Coordinator Public Key נכון
- ודא שהתגובה לא שונתה
- בדוק שה-payload תואם

## סיכום

### האם צריך Coordinator Public Key לפני הרישום?

**לא חובה:**
- ✅ אפשר לרשום בלי
- ✅ Coordinator יאמת את החתימה שלך
- ✅ הרישום יעבוד

**מומלץ:**
- ✅ אימות דו-כיווני
- ✅ אבטחה טובה יותר
- ✅ אמון בתגובות

### תהליך מומלץ

1. ✅ צור מפתחות
2. ✅ שלח Public Key למנהל Coordinator
3. ✅ קבל Coordinator Public Key (מומלץ)
4. ✅ הגדר משתני סביבה
5. ✅ הרץ רישום שלב 1
6. ✅ העלה migration (שלב 2)

## קישורים נוספים

- [Secure Migration Upload Guide](./SECURE_MIGRATION_UPLOAD_GUIDE.md)
- [Digital Signatures Documentation](../docs/features/14-digital-signatures.md)
- [Service Registration API Documentation](../docs/API_DOCUMENTATION.md)








