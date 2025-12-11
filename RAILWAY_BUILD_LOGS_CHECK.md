# איך לבדוק Build Logs ב-Railway

## הבעיה

הלוגים שהראית מתחילים מה-**startup** של ה-backend, לא מה-**build phase**. זה אומר שאנחנו לא רואים אם ה-build של ה-frontend רץ או נכשל.

---

## איך לראות Build Logs ב-Railway

### שלב 1: פתח את Railway Dashboard

1. לך ל-[railway.app](https://railway.app)
2. בחר את ה-Service שלך (RAG Backend)

### שלב 2: בדוק את ה-Deployments

1. **לך ל-"Deployments"** בתפריט
2. **בחר את ה-deployment האחרון**
3. **לחץ על "View Logs"** או **"Build Logs"**

**⚠️ חשוב:** יש שני סוגי logs:
- **Build Logs** - מה-build phase (איפה ה-frontend נבנה)
- **Runtime Logs** - מה-startup/runtime (מה שהראית)

---

### שלב 3: חפש Build Logs

ב-**Build Logs**, חפש:

#### ✅ אם ה-build הצליח, צריך לראות:

```
> cd FRONTEND && npm install && npm run build
...
✅ Copied bot.js to: /app/FRONTEND/dist/embed/bot.js
...
vite v5.x.x building for production...
✓ built in X.XXs
```

#### ❌ אם ה-build נכשל, תראה:

```
> cd FRONTEND && npm install && npm run build
...
❌ Error copying bot.js: ...
npm ERR! ...
```

#### ⚠️ אם ה-build לא רץ בכלל:

אם אתה לא רואה שום דבר על `cd FRONTEND`, זה אומר שה-build command לא רץ.

---

## מה לבדוק ב-Build Logs

### 1. בדוק שה-build command רץ

חפש:
```
> npm install && cd FRONTEND && npm install && npm run build
```

אם אתה לא רואה את זה → ה-build command לא רץ.

---

### 2. בדוק שה-frontend נבנה

חפש:
```
> cd FRONTEND && npm install && npm run build
```

אם אתה רואה את זה → ה-frontend build רץ.

---

### 3. בדוק שה-plugin רץ

חפש:
```
✅ Copied bot.js to: /app/FRONTEND/dist/embed/bot.js
```

אם אתה רואה את זה → הקבצים נוצרו! ✅

אם אתה לא רואה את זה → ה-plugin לא רץ או נכשל.

---

### 4. בדוק שה-build הצליח

חפש:
```
vite v5.x.x building for production...
✓ built in X.XXs
```

אם אתה רואה את זה → ה-build הצליח! ✅

---

## מה לבדוק ב-Runtime Logs (Startup)

אחרי ה-build, כשהשרת מתחיל, צריך לראות:

### ✅ אם הקבצים קיימים:

```
🔍 Checking frontend build files...
   Root directory: /app
   Frontend dist path: /app/FRONTEND/dist
   Frontend dist exists: true
✅ Embed files serving enabled from: /app/FRONTEND/dist/embed
   bot.js: ✅ (/app/FRONTEND/dist/embed/bot.js)
   bot-bundle.js: ✅ (/app/FRONTEND/dist/embed/bot-bundle.js)
   Files in embed directory: bot.js, bot-bundle.js
```

### ❌ אם הקבצים לא קיימים:

```
🔍 Checking frontend build files...
   Root directory: /app
   Frontend dist path: /app/FRONTEND/dist
   Frontend dist exists: false
⚠️  Embed files directory or files not found
   Directory exists: false
   bot.js exists: false
   bot-bundle.js exists: false
```

---

## פתרון בעיות

### בעיה: לא רואה Build Logs

**פתרון:**
1. **ודא שאתה ב-"Deployments" ולא ב-"Logs"**
2. **בחר את ה-deployment האחרון**
3. **לחץ על "View Build Logs"** או **"Build"**

---

### בעיה: Build Logs ריקים

**פתרון:**
1. **בדוק שה-build command נכון ב-`railway.json`**
2. **Redeploy** - לפעמים ה-logs לא נשמרים
3. **בדוק שה-service לא נבנה עם Docker** (אז ה-build logs יהיו ב-Docker build)

---

### בעיה: רואה "cd FRONTEND" אבל לא רואה "npm run build"

**פתרון:**
1. **בדוק שה-`FRONTEND/package.json` קיים**
2. **בדוק שה-`npm install` הצליח** (אולי יש שגיאת dependencies)
3. **בדוק שה-working directory נכון**

---

### בעיה: רואה "npm run build" אבל לא רואה "✅ Copied bot.js"

**פתרון:**
1. **בדוק שה-`FRONTEND/public/bot.js` קיים**
2. **בדוק שה-`vite.config.js` כולל את ה-plugin**
3. **בדוק שה-`closeBundle` נקרא** (זה נקרא אחרי ה-build)

---

### בעיה: רואה "✅ Copied bot.js" אבל ב-Runtime Logs רואה "❌"

**פתרון:**
1. **הקבצים נוצרו אבל לא נשמרו** - יכול להיות שיש בעיה עם file system
2. **ה-working directory שונה** - בדוק שה-path נכון
3. **הקבצים נמחקו אחרי ה-build** - בדוק אם יש cleanup script

---

## בדיקה ידנית

אם אתה לא רואה את ה-Build Logs, אפשר לבדוק ידנית:

### 1. הוסף script לבדיקה

צור קובץ `BACKEND/scripts/check-embed-files.js`:

```javascript
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');
const embedPath = join(rootDir, 'FRONTEND', 'dist', 'embed');

console.log('🔍 Checking embed files...');
console.log('   Root directory:', rootDir);
console.log('   Embed path:', embedPath);
console.log('   Embed directory exists:', existsSync(embedPath));

if (existsSync(embedPath)) {
  const files = readdirSync(embedPath);
  console.log('   Files:', files.join(', ') || 'none');
  
  const botJs = join(embedPath, 'bot.js');
  const botBundle = join(embedPath, 'bot-bundle.js');
  
  console.log('   bot.js exists:', existsSync(botJs));
  console.log('   bot-bundle.js exists:', existsSync(botBundle));
} else {
  console.log('   ❌ Embed directory does not exist!');
  console.log('   💡 Make sure to build the frontend: cd FRONTEND && npm run build');
}
```

### 2. הרץ את ה-script ב-startup

הוסף ל-`BACKEND/scripts/start-with-migrations.js`:

```javascript
// Check embed files
import { execSync } from 'child_process';
try {
  execSync('node scripts/check-embed-files.js', { stdio: 'inherit' });
} catch (error) {
  log.warn('Could not check embed files:', error.message);
}
```

---

## סיכום

**הבעיה:** הלוגים שהראית הם מה-startup, לא מה-build phase.

**הפתרון:**
1. ✅ לך ל-Railway Dashboard → Deployments → בחר deployment → View Build Logs
2. ✅ חפש `cd FRONTEND && npm run build` - זה אומר שה-build רץ
3. ✅ חפש `✅ Copied bot.js` - זה אומר שהקבצים נוצרו
4. ✅ בדוק את ה-Runtime Logs - צריך לראות `bot.js: ✅`

**⚠️ חשוב:**
- Build Logs ו-Runtime Logs הם שני דברים שונים
- Build Logs מראים את ה-build process
- Runtime Logs מראים את ה-startup של ה-backend
- צריך לבדוק את שניהם!

---

## קישורים שימושיים

- [תיקון שגיאת Script Load](./EMBED_SCRIPT_LOAD_FAILURE_FIX.md)
- [תיקון שגיאת HTTP 500](./EMBED_FILES_500_ERROR_FIX.md)
- [מדריך משתני סביבה](./CHATBOT_ENV_VARIABLES.md)






