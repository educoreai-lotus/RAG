# איך להריץ את סקריפט ה-Embeddings מקומית

## הבעיה

ב-Railway החינמי אין Shell/Terminal, אז צריך להריץ את הסקריפט מקומית.

---

## ✅ פתרון: הרץ מקומית עם .env

### שלב 1: קבל את ה-OPENAI_API_KEY מ-Railway

1. **לך ל-Railway Dashboard:**
   - https://railway.app
   - בחר את הפרויקט RAG
   - לחץ על **Variables**

2. **העתק את ה-OPENAI_API_KEY:**
   - מצא את `OPENAI_API_KEY`
   - לחץ על העין (👁️) כדי לראות את הערך
   - העתק את ה-key (מתחיל ב-`sk-...`)

### שלב 2: צור קובץ .env מקומי

צור קובץ `.env` בתיקיית `BACKEND/`:

```bash
cd BACKEND
echo "OPENAI_API_KEY=sk-your-actual-key-here" > .env
echo "DATABASE_URL=your-database-url-here" >> .env
```

או צור את הקובץ ידנית:

**קובץ: `BACKEND/.env`**
```env
OPENAI_API_KEY=sk-your-actual-key-here
DATABASE_URL=your-database-url-here
```

**⚠️ חשוב:** אל תעשה commit של `.env` ל-git! הוסף אותו ל-`.gitignore`.

### שלב 3: התקן dotenv (אם צריך)

```bash
cd BACKEND
npm install dotenv
```

### שלב 4: עדכן את הסקריפט לטעון .env

עדכן את `BACKEND/scripts/create-embeddings-and-insert.js`:

**בתחילת הקובץ, אחרי ה-imports:**
```javascript
import dotenv from 'dotenv';
dotenv.config();
```

### שלב 5: הרץ את הסקריפט

```bash
cd BACKEND
npm run create:embeddings
```

---

## ✅ פתרון חלופי: העבר את ה-Variable ישירות

אם אתה לא רוצה ליצור .env:

```bash
cd BACKEND

# העבר את ה-API key ישירות
OPENAI_API_KEY=sk-your-actual-key-here npm run create:embeddings
```

או ב-WSL/PowerShell:
```bash
cd BACKEND
$env:OPENAI_API_KEY="sk-your-actual-key-here"; npm run create:embeddings
```

---

## ✅ פתרון 3: עדכן את הסקריפט לקבל API Key כפרמטר

אפשר לעדכן את הסקריפט לקבל את ה-API key כפרמטר:

```javascript
// בתחילת הסקריפט
const apiKey = process.env.OPENAI_API_KEY || process.argv[2];

if (!apiKey) {
  console.error('❌ OPENAI_API_KEY required!');
  console.error('Usage: node scripts/create-embeddings-and-insert.js <OPENAI_API_KEY>');
  process.exit(1);
}

// עדכן את openai.config.js להשתמש ב-apiKey
```

ואז הרץ:
```bash
cd BACKEND
node scripts/create-embeddings-and-insert.js sk-your-actual-key-here
```

---

## 🔒 אבטחה

**⚠️ חשוב:**
- אל תעשה commit של `.env` ל-git
- אל תעשה commit של API keys
- הוסף `.env` ל-`.gitignore`

**בדוק ש-`.gitignore` כולל:**
```
.env
.env.local
.env.*.local
```

---

## 📋 Checklist

- [ ] העתקתי את `OPENAI_API_KEY` מ-Railway Variables
- [ ] יצרתי קובץ `.env` ב-`BACKEND/`
- [ ] הוספתי את `OPENAI_API_KEY` ל-`.env`
- [ ] הוספתי את `DATABASE_URL` ל-`.env` (אם צריך)
- [ ] התקנתי `dotenv` (אם צריך)
- [ ] עדכנתי את הסקריפט לטעון `.env`
- [ ] הרצתי את הסקריפט: `npm run create:embeddings`

---

## 🎯 המלצה

**הכי פשוט:** צור `.env` מקומי והרץ את הסקריפט. זה יעבוד בוודאות!

---

**אחרי זה, המידע יכנס ל-Supabase והכל יעבוד!**

