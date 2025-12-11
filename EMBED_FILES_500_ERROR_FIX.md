# תיקון שגיאת HTTP 500 ב-`/embed/bot.js`

## הבעיה

כשמנסים לטעון את ה-CHATBOT script מ-Railway:
```
https://rag-production-3a4c.up.railway.app/embed/bot.js
```

מקבלים **HTTP 500** במקום את הקובץ.

**⚠️ הערה:** זה לא קשור ל-`SUPPORT_MODE_ENABLED` - המשתנה הזה משפיע רק על ה-support endpoints (`/api/assessment/support`, `/api/devlab/support`), לא על ה-serving של קבצי ה-embed.

---

## סיבות אפשריות

### 1. הקבצים לא נבנו (הכי נפוץ)
ה-`FRONTEND/dist/embed/` לא קיים או ריק ב-Railway.

### 2. ה-build לא רץ בהצלחה
ה-build command ב-Railway נכשל ולא יצר את הקבצים.

### 3. הנתיב לא נכון
ה-backend מחפש את הקבצים במיקום לא נכון.

---

## פתרון

### שלב 1: בדוק את ה-logs ב-Railway

1. לך ל-Railway Dashboard → Service → Logs
2. חפש הודעות כמו:
   - `⚠️ Embed files directory or files not found`
   - `bot.js exists: false`
   - `bot-bundle.js exists: false`

אם אתה רואה את ההודעות האלה, זה אומר שהקבצים לא קיימים.

---

### שלב 2: ודא שה-build command נכון

ב-`BACKEND/railway.json` צריך להיות:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && cd FRONTEND && npm install && npm run build && cd ../BACKEND && npm install && npm run db:generate"
  },
  "deploy": {
    "startCommand": "cd BACKEND && npm run start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**חשוב:** ה-build command צריך לכלול:
- `cd FRONTEND && npm install && npm run build` - לבנות את ה-frontend
- זה יוצר את `FRONTEND/dist/embed/bot.js` ו-`FRONTEND/dist/embed/bot-bundle.js`

---

### שלב 3: בדוק שה-`vite.config.js` נכון

ב-`FRONTEND/vite.config.js` צריך להיות plugin שמעתיק את `bot.js`:

```javascript
{
  name: 'copy-bot-js',
  closeBundle() {
    const distPath = join(process.cwd(), 'dist', 'embed');
    mkdirSync(distPath, { recursive: true });
    copyFileSync(
      join(process.cwd(), 'public', 'bot.js'),
      join(distPath, 'bot.js')
    );
  },
}
```

ו-`rollupOptions` שמגדיר את `bot-bundle.js`:

```javascript
rollupOptions: {
  input: {
    main: './index.html',
    embed: './src/embed.jsx',  // זה יוצר bot-bundle.js
  },
  output: {
    entryFileNames: (chunkInfo) => {
      if (chunkInfo.name === 'embed') {
        return 'embed/bot-bundle.js';  // זה יוצר את bot-bundle.js
      }
      return 'assets/[name]-[hash].js';
    },
  },
}
```

---

### שלב 4: Force Redeploy ב-Railway

אחרי שינויי הקוד:

1. **פתח Railway Dashboard**
2. **בחר את ה-Service**
3. **לחץ על "Deploy" → "Redeploy"**
4. **בדוק את ה-logs** - צריך לראות:
   ```
   ✅ Embed files serving enabled from: /app/FRONTEND/dist/embed
      bot.js: ✅ (/app/FRONTEND/dist/embed/bot.js)
      bot-bundle.js: ✅ (/app/FRONTEND/dist/embed/bot-bundle.js)
   ```

אם אתה רואה `❌` במקום `✅`, זה אומר שהקבצים לא נוצרו.

---

### שלב 5: בדוק ידנית שהקבצים קיימים

אחרי ה-deploy, בדוק ב-Railway logs:

```bash
# ב-Railway logs, חפש:
ls -la FRONTEND/dist/embed/
```

או בדוק ישירות:

```bash
curl https://rag-production-3a4c.up.railway.app/embed/bot.js
```

**אם זה עובד:** צריך לקבל קוד JavaScript (לא JSON error).

**אם זה לא עובד:** תקבל JSON עם שגיאה.

---

## פתרון מהיר (אם ה-build נכשל)

אם ה-build command נכשל, אפשר לנסות:

### אופציה 1: Build ידני ב-Railway

1. **פתח Railway Dashboard → Service → Settings → Build**
2. **שנה את ה-build command ל:**
   ```bash
   npm install && cd FRONTEND && npm install && npm run build && cd ../BACKEND && npm install && npm run db:generate
   ```
3. **Redeploy**

### אופציה 2: בדוק שה-`vite.config.js` נכון

ודא שה-`FRONTEND/vite.config.js` כולל את ה-plugin שמעתיק את `bot.js`:

```javascript
import { copyFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-bot-js',
      closeBundle() {
        const distPath = join(process.cwd(), 'dist', 'embed');
        mkdirSync(distPath, { recursive: true });
        copyFileSync(
          join(process.cwd(), 'public', 'bot.js'),
          join(distPath, 'bot.js')
        );
      },
    },
  ],
  // ... rest of config
});
```

---

## בדיקה שהכל עובד

### 1. בדוק את ה-logs ב-Railway

צריך לראות:
```
✅ Embed files serving enabled from: /app/FRONTEND/dist/embed
   bot.js: ✅ (/app/FRONTEND/dist/embed/bot.js)
   bot-bundle.js: ✅ (/app/FRONTEND/dist/embed/bot-bundle.js)
```

### 2. בדוק עם curl

```bash
curl https://rag-production-3a4c.up.railway.app/embed/bot.js
```

**צריך לקבל:** קוד JavaScript (לא JSON error).

### 3. בדוק בדפדפן

פתח את ה-Console ובדוק:

```javascript
fetch('https://rag-production-3a4c.up.railway.app/embed/bot.js')
  .then(r => r.text())
  .then(text => {
    console.log('Success!', text.substring(0, 100));
  })
  .catch(err => {
    console.error('Error:', err);
  });
```

**צריך לראות:** `Success!` עם קוד JavaScript.

---

## שגיאות נפוצות

### שגיאה: "bot.js file not found"

**פתרון:**
1. ודא שה-`vite.config.js` כולל את ה-plugin `copy-bot-js`
2. ודא שה-`FRONTEND/public/bot.js` קיים
3. ודא שה-build command כולל `cd FRONTEND && npm run build`
4. Redeploy ב-Railway

---

### שגיאה: "bot-bundle.js file not found"

**פתרון:**
1. ודא שה-`vite.config.js` מגדיר `input: { embed: './src/embed.jsx' }`
2. ודא שה-`FRONTEND/src/embed.jsx` קיים
3. ודא שה-build command כולל `cd FRONTEND && npm run build`
4. Redeploy ב-Railway

---

### שגיאה: "Embed files directory not found"

**פתרון:**
1. ה-build לא רץ או נכשל
2. בדוק את ה-logs ב-Railway לראות אם יש שגיאות build
3. ודא שה-build command נכון ב-`railway.json`
4. Redeploy

---

## סיכום

**הבעיה:** ה-`/embed/bot.js` מחזיר HTTP 500 כי הקבצים לא קיימים.

**הפתרון:**
1. ✅ ודא שה-`railway.json` כולל build של ה-frontend
2. ✅ ודא שה-`vite.config.js` מגדיר את ה-plugin שמעתיק את `bot.js`
3. ✅ Redeploy ב-Railway
4. ✅ בדוק את ה-logs - צריך לראות `✅ bot.js: ✅`

**⚠️ חשוב:** זה לא קשור ל-`SUPPORT_MODE_ENABLED` - המשתנה הזה משפיע רק על ה-support endpoints, לא על ה-serving של קבצי ה-embed.

---

## קישורים שימושיים

- [מדריך משתני סביבה](./CHATBOT_ENV_VARIABLES.md)
- [מדריך הטמעת CHATBOT](./DATABASE/CHATBOT_SCRIPT_INTEGRATION_GUIDE.md)
- [תיקון Railway Deployment](./BACKEND/RAILWAY_DEPLOYMENT_FIX.md)






