# איך לחלץ REDIS_URL

מדריך מפורט לחילוץ `REDIS_URL` מפלטפורמות שונות.

---

## Railway

### שיטה 1: משתנה אוטומטי (הכי קל)

Railway מספק משתנה אוטומטי לכל Service:

1. **Railway Dashboard** → **Project** → **Service שלך**
2. **Variables** tab
3. לחץ **+ New Variable**
4. הוסף:
   ```
   Name: REDIS_URL
   Value: ${REDIS.REDIS_URL}
   ```
   (החלף `REDIS` בשם ה-Redis Service שלך)

**הערה:** אם ה-Redis Service נקרא אחרת (למשל `redis-cache`), השתמש ב:
```
${redis-cache.REDIS_URL}
```

### שיטה 2: העתק ידני

1. **Railway Dashboard** → **Redis Service**
2. **Variables** tab
3. חפש `REDIS_URL` או `DATABASE_URL`
4. לחץ על הערך להצגה
5. העתק את הערך
6. הוסף ל-Service שלך:
   ```
   Name: REDIS_URL
   Value: redis://default:password@redis.railway.app:6379
   ```

### שיטה 3: Railway CLI

```bash
# התקן Railway CLI
npm i -g @railway/cli

# התחבר
railway login

# עבור לפרויקט
railway link

# חלץ כל המשתנים
railway variables

# או חלץ משתנה ספציפי
railway variables get REDIS_URL --service redis
```

---

## Docker / Docker Compose

### אם Redis רץ ב-Docker:

```bash
# בדוק את ה-container
docker ps | grep redis

# חלץ את ה-IP
docker inspect <container-id> | grep IPAddress

# או אם יש network
docker network inspect <network-name>
```

**דוגמה:**
```env
REDIS_URL=redis://localhost:6379
```

### אם Redis ב-docker-compose.yml:

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

**דוגמה:**
```env
REDIS_URL=redis://localhost:6379
```

---

## Local Development

### אם Redis רץ מקומית:

```bash
# בדוק אם Redis רץ
redis-cli ping
# אמור להחזיר: PONG

# בדוק את הפורט
netstat -an | grep 6379
```

**דוגמה:**
```env
REDIS_URL=redis://localhost:6379
```

### אם Redis עם סיסמה:

```bash
# בדוק את ה-config
redis-cli CONFIG GET requirepass
```

**דוגמה:**
```env
REDIS_URL=redis://:mypassword@localhost:6379
```

---

## Cloud Providers

### Heroku

```bash
# דרך CLI
heroku config:get REDIS_URL

# או דרך Dashboard
# Settings → Config Vars → REDIS_URL
```

### AWS ElastiCache

```bash
# דרך AWS Console
# ElastiCache → Redis Clusters → Endpoint

# דוגמה:
REDIS_URL=redis://your-cluster.cache.amazonaws.com:6379
```

### Google Cloud Memorystore

```bash
# דרך GCP Console
# Memorystore → Redis Instances → Connection Info

# דוגמה:
REDIS_URL=redis://10.0.0.1:6379
```

### DigitalOcean

```bash
# דרך DigitalOcean Dashboard
# Databases → Redis → Connection Details

# דוגמה:
REDIS_URL=redis://default:password@redis.db.ondigitalocean.com:25061
```

---

## בדיקה

### בדוק את ה-REDIS_URL:

```bash
# בדוק אם המשתנה מוגדר
echo $REDIS_URL

# או ב-Node.js
node -e "console.log(process.env.REDIS_URL)"
```

### בדוק חיבור:

```bash
# דרך redis-cli
redis-cli -u $REDIS_URL ping
# אמור להחזיר: PONG

# או דרך Node.js
node -e "const Redis = require('ioredis'); const r = new Redis(process.env.REDIS_URL); r.ping().then(console.log).catch(console.error)"
```

---

## פורמט REDIS_URL

### פורמט בסיסי:
```
redis://[username]:[password]@[host]:[port]
```

### דוגמאות:

**ללא authentication:**
```
redis://localhost:6379
```

**עם password:**
```
redis://:mypassword@localhost:6379
```

**עם username ו-password:**
```
redis://username:password@localhost:6379
```

**עם TLS (rediss):**
```
rediss://username:password@redis.example.com:6380
```

---

## פתרון בעיות

### בעיה: לא מוצא REDIS_URL ב-Railway
**פתרון:**
1. ודא שיש Redis Service ב-Railway
2. בדוק את שם ה-Service (אולי לא `REDIS`)
3. השתמש ב-`${SERVICE_NAME.REDIS_URL}`

### בעיה: REDIS_URL לא עובד
**פתרון:**
1. בדוק את הפורמט: `redis://host:port`
2. בדוק אם יש password
3. בדוק את ה-firewall/network rules

### בעיה: רוצה להשבית Redis
**פתרון:**
```env
REDIS_ENABLED=false
```

---

## סיכום

**Railway (מומלץ):**
```env
REDIS_URL=${REDIS.REDIS_URL}
```

**Local:**
```env
REDIS_URL=redis://localhost:6379
```

**Cloud (העתק מה-Dashboard):**
```env
REDIS_URL=redis://username:password@host:port
```

**ללא Redis:**
```env
REDIS_ENABLED=false
```

