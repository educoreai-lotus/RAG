# איך להריץ Seed Script ב-Railway

## שיטה 1: דרך Railway CLI (מהטרמינל המקומי)

### שלב 1: התקן Railway CLI (אם עדיין לא מותקן)

```bash
# Windows (PowerShell)
iwr https://railway.app/install.ps1 | iex

# Mac/Linux
curl -fsSL https://railway.app/install.sh | sh
```

### שלב 2: התחבר ל-Railway

```bash
railway login
```

### שלב 3: בחר את הפרויקט

```bash
railway link
```

או:
```bash
railway run --service your-service-name
```

### שלב 4: הרץ את ה-Seed

```bash
railway run cd BACKEND && npm run db:seed
```

---

## שיטה 2: דרך Railway Dashboard (Web UI)

### שלב 1: לך ל-Railway Dashboard
1. פתח https://railway.app
2. בחר את הפרויקט שלך
3. בחר את ה-service (backend)

### שלב 2: פתח את ה-Terminal
1. לחץ על ה-service
2. לחץ על **"Deployments"** או **"Settings"**
3. חפש **"Shell"** או **"Terminal"** או **"Run Command"**

### שלב 3: הרץ את הפקודה
בחלון ה-Terminal, הרץ:
```bash
cd BACKEND && npm run db:seed
```

---

## שיטה 3: דרך Railway Dashboard → Deployments

### שלב 1: לך ל-Deployments
1. Railway Dashboard → הפרויקט שלך
2. לחץ על **"Deployments"**
3. בחר את ה-deployment האחרון

### שלב 2: פתח Shell
1. לחץ על **"View Logs"** או **"Shell"**
2. או לחץ על **"..."** → **"Open Shell"**

### שלב 3: הרץ את הפקודה
```bash
cd BACKEND
npm run db:seed
```

---

## שיטה 4: דרך Railway Dashboard → Settings → Run Command

### שלב 1: לך ל-Settings
1. Railway Dashboard → הפרויקט שלך
2. לחץ על ה-service
3. לחץ על **"Settings"**

### שלב 2: חפש "Run Command" או "Custom Command"
1. גלול למטה
2. חפש **"Run Command"** או **"Execute Command"**
3. הכנס: `cd BACKEND && npm run db:seed`
4. לחץ **"Run"**

---

## שיטה 5: דרך Railway Dashboard → Metrics → Shell

### שלב 1: לך ל-Metrics
1. Railway Dashboard → הפרויקט שלך
2. לחץ על ה-service
3. לחץ על **"Metrics"** או **"Logs"**

### שלב 2: פתח Shell
1. חפש כפתור **"Shell"** או **"Terminal"**
2. לחץ עליו

### שלב 3: הרץ את הפקודה
```bash
cd BACKEND
npm run db:seed
```

---

## בדיקה שהכל עבד:

אחרי שהרצת את ה-seed, בדוק ב-Supabase:

```sql
-- בדוק כמה מיקרוסרוויסים יש
SELECT COUNT(*) FROM microservices;
-- אמור להציג: 10

-- בדוק את כל המיקרוסרוויסים
SELECT name, display_name FROM microservices ORDER BY name;
```

---

## אם Railway CLI לא עובד:

### אפשרות 1: השתמש ב-Supabase SQL Editor
העתק את ה-SQL מ-`DATABASE/HOW_TO_RUN_SEED.md` והרץ ב-Supabase SQL Editor.

### אפשרות 2: הרץ מקומית
```bash
# הגדר DATABASE_URL
export DATABASE_URL="your-supabase-connection-string"

# הרץ seed
cd BACKEND
npm run db:seed
```

---

## סיכום - איפה להריץ:

1. **Railway CLI** → בטרמינל המקומי (PowerShell/Terminal)
2. **Railway Dashboard** → דרך ה-Web UI (Shell/Terminal)
3. **Supabase SQL Editor** → דרך ה-Web UI של Supabase
4. **מקומי** → בטרמינל המקומי (אם יש DATABASE_URL)

**הכי קל: Railway Dashboard → Shell → הרץ את הפקודה!** 🎯

