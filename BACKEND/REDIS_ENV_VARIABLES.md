# משתני סביבה ל-Redis

## משתני סביבה נדרשים

### 1. `REDIS_URL` (אופציונלי)
**תיאור:** כתובת ה-Redis server

**פורמט:**
```
redis://[username]:[password]@[host]:[port]
```

**דוגמאות:**
```env
# Local Redis (default)
REDIS_URL=redis://localhost:6379

# Redis עם סיסמה
REDIS_URL=redis://:mypassword@localhost:6379

# Redis עם username וסיסמה
REDIS_URL=redis://username:password@localhost:6379

# Redis ב-Railway/Cloud
REDIS_URL=redis://default:password@redis.railway.app:6379

# Redis עם TLS (production)
REDIS_URL=rediss://username:password@redis.example.com:6380
```

**ברירת מחדל:** `redis://localhost:6379`

**הערות:**
- אם לא מוגדר, משתמש ב-`redis://localhost:6379`
- אם Redis לא זמין בכתובת זו, השרת יעבוד בלי Redis

---

### 2. `REDIS_ENABLED` (אופציונלי)
**תיאור:** האם להפעיל את Redis

**ערכים אפשריים:**
- `true` (ברירת מחדל) - Redis מופעל
- `false` - Redis מושבת לחלוטין

**דוגמאות:**
```env
# הפעל Redis (ברירת מחדל)
REDIS_ENABLED=true

# השבת Redis לחלוטין
REDIS_ENABLED=false
```

**ברירת מחדל:** `true`

**הערות:**
- אם מוגדר ל-`false`, Redis לא ינסה להתחבר בכלל
- מומלץ להגדיר ל-`false` אם אין Redis זמין

---

## דוגמאות קובץ `.env`

### אפשרות 1: Redis מקומי (Development)
```env
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true
```

### אפשרות 2: Redis ב-Railway
```env
REDIS_URL=redis://default:your-password@redis.railway.app:6379
REDIS_ENABLED=true
```

### אפשרות 3: Redis מושבת
```env
REDIS_ENABLED=false
# REDIS_URL לא נדרש אם REDIS_ENABLED=false
```

### אפשרות 4: Redis עם TLS (Production)
```env
REDIS_URL=rediss://username:password@redis.example.com:6380
REDIS_ENABLED=true
```

---

## הגדרה ב-Railway

### שלב 1: הוסף Redis Service
1. Railway Dashboard → Project
2. **+ New** → **Database** → **Add Redis**
3. Railway יוצר Redis instance אוטומטית

### שלב 2: חלץ REDIS_URL

#### אופציה A: משתנה אוטומטי (מומלץ)
Railway מספק משתנה אוטומטי לכל Service:

1. Railway Dashboard → Service (השרת שלך)
2. **Variables** tab
3. הוסף משתנה:
   ```env
   REDIS_URL=${REDIS.REDIS_URL}
   ```
   או
   ```env
   REDIS_URL=${REDIS.REDIS_URL}
   REDIS_ENABLED=true
   ```

**הערה:** `REDIS` הוא השם של ה-Redis Service שלך. אם שינית את השם, שנה בהתאם.

#### אופציה B: העתק ידני
1. Railway Dashboard → Redis Service
2. **Variables** tab
3. חפש `REDIS_URL` או `DATABASE_URL`
4. העתק את הערך
5. הוסף ל-Service שלך:
   ```env
   REDIS_URL=redis://default:password@redis.railway.app:6379
   REDIS_ENABLED=true
   ```

#### אופציה C: דרך Railway CLI
```bash
# התקן Railway CLI
npm i -g @railway/cli

# התחבר
railway login

# חלץ משתני סביבה
railway variables

# או חלץ משתנה ספציפי
railway variables get REDIS_URL
```

### שלב 3: בדוק את החיבור
1. Railway Dashboard → Service → **Logs**
2. חפש: `Redis connected - caching enabled`
3. אם רואה שגיאות → בדוק את `REDIS_URL`

---

## בדיקה

### בדיקה מקומית
```bash
# בדוק אם Redis רץ
redis-cli ping
# אמור להחזיר: PONG

# בדוק את השרת
npm run dev
# אמור לראות: "Redis connected - caching enabled"
```

### בדיקה ב-Railway
1. בדוק את ה-Logs
2. חפש: `Redis connected - caching enabled`
3. אם רואה שגיאות → הגדר `REDIS_ENABLED=false`

---

## פתרון בעיות

### בעיה: "Redis connection error"
**פתרון:**
1. בדוק ש-Redis רץ: `redis-cli ping`
2. בדוק את `REDIS_URL` נכון
3. או הגדר `REDIS_ENABLED=false`

### בעיה: Redis לא מתחבר ב-Railway
**פתרון:**
1. ודא שיש Redis Service ב-Railway
2. בדוק ש-`REDIS_URL` מוגדר נכון
3. או הגדר `REDIS_ENABLED=false` (השרת יעבוד בלי cache)

### בעיה: רוצה להשבית Redis לחלוטין
**פתרון:**
```env
REDIS_ENABLED=false
```

---

## סיכום

**מינימום נדרש:**
- אין משתנים חובה - Redis הוא אופציונלי

**מומלץ:**
- `REDIS_URL` - אם יש Redis זמין
- `REDIS_ENABLED=false` - אם אין Redis זמין

**ברירת מחדל:**
- `REDIS_URL=redis://localhost:6379`
- `REDIS_ENABLED=true`

**הערה חשובה:**
השרת יעבוד מצוין גם בלי Redis - רק יהיה איטי יותר (ללא cache).

