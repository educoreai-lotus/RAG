# 🧪 מדריך הרצת בדיקות Knowledge Graph בענן
# Cloud Testing Guide for Knowledge Graph Tests

## 📋 תוכן עניינים / Table of Contents

- [דרכים להרצת בדיקות בענן](#דרכים-להרצת-בדיקות-בענן)
- [אפשרות 1: GitHub Actions (CI/CD)](#אפשרות-1-github-actions-cicd)
- [אפשרות 2: Railway Cloud](#אפשרות-2-railway-cloud)
- [אפשרות 3: SSH/Remote Connection](#אפשרות-3-sshremote-connection)
- [אפשרות 4: Docker Container](#אפשרות-4-docker-container)

---

## דרכים להרצת בדיקות בענן

יש לך 4 אפשרויות להרצת בדיקות Knowledge Graph בענן:

### אפשרות 1: GitHub Actions (CI/CD) ✅ **מומלץ**

הבדיקות רצות אוטומטית בכל push/PR ל-main.

#### איך זה עובד:

1. **אוטומטי**: כל push ל-main או PR מפעיל את הבדיקות
2. **ללא צורך בהתערבות**: הבדיקות רצות ב-GitHub Actions
3. **תוצאות**: ניתן לראות ב-Actions tab ב-GitHub

#### להרצה ידנית:

```bash
# בדוק את ה-workflow ב-GitHub
# Actions → backend-tests → Run workflow
```

#### לראות תוצאות:

1. לך ל-GitHub repository
2. לחץ על **Actions** tab
3. בחר את ה-workflow האחרון
4. לחץ על **Run Knowledge Graph tests** step

---

### אפשרות 2: Railway Cloud

#### דרך 1: Railway CLI

```bash
# התקן Railway CLI
npm i -g @railway/cli

# התחבר
railway login

# הרץ בדיקות
cd BACKEND
railway run npm test -- knowledgeGraph.service.test.js
```

#### דרך 2: Railway Dashboard

1. לך ל-Railway Dashboard
2. בחר את הפרויקט
3. פתח **Shell** או **Logs**
4. הרץ:

```bash
cd BACKEND
npm test -- knowledgeGraph.service.test.js
```

#### דרך 3: Railway Script

עדכן את `railway.json`:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && cd FRONTEND && npm install && npm run build && cd ../BACKEND && npm install && npm run db:generate"
  },
  "deploy": {
    "startCommand": "cd BACKEND && npm run start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  },
  "test": {
    "command": "cd BACKEND && npm test -- knowledgeGraph.service.test.js"
  }
}
```

---

### אפשרות 3: SSH/Remote Connection

#### אם יש לך גישה SSH לשרת הענן:

```bash
# התחבר לשרת
ssh user@your-cloud-server.com

# נווט לפרויקט
cd /path/to/RAG_microservice/BACKEND

# הרץ בדיקות
npm test -- knowledgeGraph.service.test.js
```

#### עם משתני סביבה:

```bash
# הגדר משתני סביבה
export DATABASE_URL="your-database-url"
export REDIS_URL="your-redis-url"
export NODE_ENV=test

# הרץ בדיקות
npm test -- knowledgeGraph.service.test.js
```

---

### אפשרות 4: Docker Container

#### הרצה ב-Docker:

```bash
# בנה image
docker build -t rag-microservice .

# הרץ בדיקות ב-container
docker run --rm \
  -e DATABASE_URL="your-db-url" \
  -e REDIS_URL="your-redis-url" \
  -e NODE_ENV=test \
  rag-microservice \
  npm test -- knowledgeGraph.service.test.js
```

#### עם docker-compose:

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  test:
    build: .
    working_dir: /app/BACKEND
    command: npm test -- knowledgeGraph.service.test.js
    environment:
      - NODE_ENV=test
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
```

```bash
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

---

## 🚀 שימוש בסקריפטים מוכנים

יצרתי 2 סקריפטים להרצה קלה:

### סקריפט Node.js:

```bash
# מהתיקייה הראשית
node BACKEND/scripts/run-tests-cloud.js

# או עם קובץ בדיקה ספציפי
node BACKEND/scripts/run-tests-cloud.js knowledgeGraph.service.test.js
```

### סקריפט Bash:

```bash
# תן הרשאות
chmod +x BACKEND/scripts/run-tests-cloud.sh

# הרץ
./BACKEND/scripts/run-tests-cloud.sh

# או עם קובץ ספציפי
./BACKEND/scripts/run-tests-cloud.sh knowledgeGraph.service.test.js
```

---

## 📝 משתני סביבה נדרשים

להרצת הבדיקות בענן, ודא שיש לך:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Redis (אופציונלי)
REDIS_URL=redis://host:6379

# Test environment
NODE_ENV=test
SKIP_GLOBAL_TEST_SETUP=true
SKIP_PRISMA=true
```

---

## ✅ בדיקת שהכל עובד

### בדיקה מקומית (לפני הענן):

```bash
cd BACKEND
npm test -- knowledgeGraph.service.test.js
```

### בדיקה בענן (GitHub Actions):

1. Push קוד ל-GitHub
2. לך ל-Actions tab
3. בדוק שהבדיקות עברו ✅

---

## 🔧 פתרון בעיות

### בעיה: "Cannot find module"

```bash
# ודא שהתקנת dependencies
cd BACKEND
npm install
```

### בעיה: "Database connection failed"

```bash
# ודא ש-DATABASE_URL נכון
echo $DATABASE_URL

# בדוק חיבור
psql $DATABASE_URL -c "SELECT 1;"
```

### בעיה: "Prisma client not generated"

```bash
cd BACKEND
npm run db:generate
```

---

## 📊 תוצאות הבדיקות

### ב-GitHub Actions:

- **Actions** → בחר workflow → **Run Knowledge Graph tests**
- תראה output מלא של הבדיקות

### ב-Railway:

- **Logs** → חפש "PASS" או "FAIL"
- או **Shell** → הרץ ידנית

---

## 🎯 המלצה

**הדרך הקלה ביותר**: GitHub Actions
- אוטומטי
- ללא צורך בהתערבות
- תוצאות מיידיות
- היסטוריה מלאה

פשוט push ל-main והבדיקות ירוצו אוטומטית! 🚀

---

## 📞 עזרה נוספת

אם יש בעיות:
1. בדוק את ה-logs ב-GitHub Actions
2. ודא שמשתני הסביבה נכונים
3. בדוק שה-dependencies מותקנים
4. ודא שה-database נגיש

