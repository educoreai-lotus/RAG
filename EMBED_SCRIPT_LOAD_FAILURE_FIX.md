# תיקון: "Failed to load chatbot script" - `/embed/bot.js` לא נטען

## הבעיה

כשמנסים לטעון את ה-CHATBOT script, מקבלים שגיאה:

```
[useChatbot] ❌ Failed to load chatbot script from: 
https://rag-production-3a4c.up.railway.app/embed/bot.js
[useChatbot] Script error: Event
```

**מה זה אומר?**
- ה-`/embed/bot.js` לא קיים או לא נגיש ב-Railway
- הקבצים `FRONTEND/dist/embed/bot.js` ו-`FRONTEND/dist/embed/bot-bundle.js` לא נוצרו בזמן ה-build

---

## סיבות אפשריות

### 1. ה-build לא רץ או נכשל
ה-build command ב-Railway לא יוצר את הקבצים.

### 2. ה-plugin לא רץ
ה-plugin ב-`vite.config.js` לא מעתיק את `bot.js` ל-`dist/embed/`.

### 3. הקבצים לא נשמרים
הקבצים נוצרים אבל לא נשמרים או לא נגישים ל-backend.

---

## פתרון

### שלב 1: בדוק את ה-logs ב-Railway

1. **פתח Railway Dashboard** → בחר את ה-Service
2. **לך ל-Logs** → חפש הודעות build:

**אם אתה רואה:**
```
✅ Copied bot.js to: /app/FRONTEND/dist/embed/bot.js
```
→ הקבצים נוצרו! ✅

**אם אתה רואה:**
```
❌ Error copying bot.js: ...
❌ Source file not found: ...
```
→ יש בעיה ב-build! ❌

**אם אתה לא רואה הודעות על bot.js:**
→ ה-plugin לא רץ! ❌

---

### שלב 2: בדוק שה-`vite.config.js` נכון

ה-`FRONTEND/vite.config.js` צריך לכלול:

```javascript
{
  name: 'copy-bot-js',
  closeBundle() {
    try {
      const distPath = join(process.cwd(), 'dist', 'embed');
      const publicBotPath = join(process.cwd(), 'public', 'bot.js');
      const targetBotPath = join(distPath, 'bot.js');
      
      mkdirSync(distPath, { recursive: true });
      
      if (!existsSync(publicBotPath)) {
        console.error('❌ Source file not found:', publicBotPath);
        throw new Error(`bot.js not found in public directory: ${publicBotPath}`);
      }
      
      copyFileSync(publicBotPath, targetBotPath);
      console.log('✅ Copied bot.js to:', targetBotPath);
    } catch (error) {
      console.error('❌ Error copying bot.js:', error.message);
      throw error;
    }
  },
}
```

---

### שלב 3: בדוק שה-`railway.json` נכון

ה-`BACKEND/railway.json` צריך לכלול build של ה-frontend:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && cd FRONTEND && npm install && npm run build && cd ../BACKEND && npm install && npm run db:generate"
  }
}
```

**חשוב:** ה-build command צריך לכלול:
- `cd FRONTEND && npm install` - התקנת dependencies
- `npm run build` - בניית ה-frontend (יוצר את `dist/embed/`)

---

### שלב 4: Force Redeploy ב-Railway

1. **פתח Railway Dashboard** → בחר את ה-Service
2. **לחץ על "Deploy" → "Redeploy"**
3. **בדוק את ה-logs** - צריך לראות:
   ```
   ✅ Copied bot.js to: /app/FRONTEND/dist/embed/bot.js
   ```

---

### שלב 5: בדוק שהקבצים קיימים

אחרי ה-deploy, בדוק ב-Railway logs:

**ב-logs של ה-backend (בעת startup), צריך לראות:**
```
✅ Embed files serving enabled from: /app/FRONTEND/dist/embed
   bot.js: ✅ (/app/FRONTEND/dist/embed/bot.js)
   bot-bundle.js: ✅ (/app/FRONTEND/dist/embed/bot-bundle.js)
```

**אם אתה רואה `❌`:**
→ הקבצים לא קיימים! צריך לבדוק למה ה-build נכשל.

---

## בדיקה ידנית

### 1. בדוק עם curl

```bash
curl https://rag-production-3a4c.up.railway.app/embed/bot.js
```

**אם זה עובד:** צריך לקבל קוד JavaScript (לא JSON error).

**אם זה לא עובד:** תקבל JSON עם שגיאה:
```json
{
  "error": {
    "message": "bot.js file not found",
    "statusCode": 500
  }
}
```

---

### 2. בדוק בדפדפן

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

**אם זה עובד:** צריך לראות `Success!` עם קוד JavaScript.

**אם זה לא עובד:** תקבל שגיאה.

---

## פתרון בעיות

### בעיה: "Source file not found" ב-logs

**פתרון:**
1. **ודא ש-`FRONTEND/public/bot.js` קיים** ב-repository
2. **ודא שה-build command כולל `cd FRONTEND`**
3. **בדוק שה-working directory נכון בזמן ה-build**

---

### בעיה: "Error copying bot.js" ב-logs

**פתרון:**
1. **בדוק שה-`dist/embed` directory נוצר:**
   - ה-`mkdirSync` צריך ליצור את התיקייה
2. **בדוק permissions:**
   - יכול להיות שיש בעיה עם permissions ב-Railway
3. **בדוק שה-`copyFileSync` עובד:**
   - יכול להיות שיש בעיה עם ה-file system

---

### בעיה: ה-plugin לא רץ

**פתרון:**
1. **ודא שה-plugin מוגדר נכון ב-`vite.config.js`**
2. **ודא שה-`closeBundle` נקרא:**
   - זה נקרא אחרי שה-build מסתיים
3. **בדוק שה-build command כולל `npm run build`**

---

### בעיה: הקבצים נוצרים אבל לא נגישים

**פתרון:**
1. **בדוק שה-backend מחפש במיקום הנכון:**
   - ה-backend מחפש ב-`FRONTEND/dist/embed`
2. **בדוק שה-working directory נכון:**
   - ה-backend צריך להיות ב-root directory
3. **בדוק שה-path resolution נכון:**
   - ה-`frontendDistPath` ב-`BACKEND/src/index.js` צריך להיות נכון

---

## בדיקה מקומית

לפני ה-deploy ל-Railway, בדוק מקומית:

```bash
# 1. בנה את ה-frontend
cd FRONTEND
npm install
npm run build

# 2. בדוק שהקבצים נוצרו
ls -la dist/embed/

# צריך לראות:
# - bot.js
# - bot-bundle.js

# 3. בדוק שה-backend יכול לשרת אותם
cd ../BACKEND
npm start

# 4. בדוק עם curl
curl http://localhost:3000/embed/bot.js
```

**אם זה עובד מקומית אבל לא ב-Railway:**
→ יש בעיה עם ה-build process ב-Railway.

---

## סיכום

**הבעיה:** ה-`/embed/bot.js` לא נטען כי הקבצים לא קיימים ב-Railway.

**הפתרון:**
1. ✅ ודא שה-`vite.config.js` כולל את ה-plugin `copy-bot-js`
2. ✅ ודא שה-`railway.json` כולל build של ה-frontend
3. ✅ בדוק את ה-logs ב-Railway - צריך לראות `✅ Copied bot.js`
4. ✅ בדוק את ה-logs של ה-backend - צריך לראות `bot.js: ✅`
5. ✅ Redeploy ב-Railway

**⚠️ חשוב:**
- ה-build command צריך לכלול `cd FRONTEND && npm run build`
- ה-plugin צריך לרוץ אחרי ה-build (`closeBundle`)
- הקבצים צריכים להיות ב-`FRONTEND/dist/embed/`

---

## קישורים שימושיים

- [תיקון שגיאת HTTP 500](./EMBED_FILES_500_ERROR_FIX.md)
- [מדריך משתני סביבה](./CHATBOT_ENV_VARIABLES.md)
- [תיקון CORS Preflight](./CORS_PREFLIGHT_FIX.md)







