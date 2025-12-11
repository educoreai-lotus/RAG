# ⚡ Quick Start - Production Registration

## URLs

- **Coordinator:** `https://coordinator-production-e0a0.up.railway.app`
- **RAG Service:** `https://ragmicroservice-production.up.railway.app`

## שלב 1: רישום בסיסי

```bash
cd BACKEND

# הגדר משתני סביבה
export PRIVATE_KEY="$(cat keys/rag-service-private-key.pem)"
export SERVICE_NAME=rag-service
export COORDINATOR_URL=https://coordinator-production-e0a0.up.railway.app
export SERVICE_ENDPOINT=https://ragmicroservice-production.up.railway.app
export SERVICE_VERSION=1.0.0
export SERVICE_HEALTH_CHECK=/health

# הרץ רישום
node scripts/register-service-secure.js
```

## שלב 2: העלאת Migration

```bash
cd BACKEND

# הסקריפט יקרא את Service ID אוטומטית מ-.service-id
node scripts/upload-migration-secure.js
```

## בדיקות

```bash
# Health checks
curl https://ragmicroservice-production.up.railway.app/health
curl https://coordinator-production-e0a0.up.railway.app/health

# Service list
curl https://coordinator-production-e0a0.up.railway.app/services
```

## משתני סביבה נדרשים

```bash
PRIVATE_KEY=<from-github-secrets>
SERVICE_NAME=rag-service
COORDINATOR_URL=https://coordinator-production-e0a0.up.railway.app
SERVICE_ENDPOINT=https://ragmicroservice-production.up.railway.app
SERVICE_VERSION=1.0.0
SERVICE_HEALTH_CHECK=/health
```

## קישורים

- [מדריך מפורט](./PRODUCTION_REGISTRATION_GUIDE.md)
- [מדריך רישום כללי](./SERVICE_REGISTRATION_GUIDE.md)







