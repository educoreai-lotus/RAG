# הבהרה: Port 6543 - Transaction vs Session Pooler

## ⚠️ חשוב להבין

**גם Transaction pooler וגם Session pooler משתמשים ב-port 6543!**

ההבדל הוא **לא** ב-port, אלא בסוג ה-pooler עצמו.

## השוואה

| סוג חיבור | Port | מתי להשתמש | מיגרציות |
|-----------|------|-------------|-----------|
| **Direct connection** | 5432 | VMs, Containers | ✅ עובד, אבל דורש IP allowlist |
| **Transaction pooler** | 6543 | Serverless functions | ❌ לא מומלץ (לא תומך prepared statements) |
| **Session pooler** | 6543 | מיגרציות, אפליקציות | ✅ מומלץ מאוד |

## איך להבדיל ב-URL?

**הבעיה:** גם Transaction וגם Session pooler נראים **אותו דבר** ב-URL!

**דוגמה - Transaction pooler:**
```
postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=require
```

**דוגמה - Session pooler:**
```
postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=require
```

**נראים אותו דבר!** 🎯

## אז איך יודעים איזה זה?

**הדרך היחידה לדעת:** ב-Supabase Dashboard!

1. לך ל-**Settings** → **Database** → **Connection string**
2. בדוק את ה-**Method** שנבחר:
   - **Transaction pooler** = לא מומלץ למיגרציות
   - **Session pooler** = מומלץ למיגרציות

## למה זה חשוב?

### Transaction Pooler (port 6543)
- ❌ לא תומך ב-prepared statements
- ❌ Prisma migrations משתמשות ב-prepared statements
- ❌ יכול לגרום לשגיאות "prepared statement already exists"

### Session Pooler (port 6543)
- ✅ תומך ב-prepared statements
- ✅ עובד מצוין עם Prisma migrations
- ✅ מומלץ למיגרציות

## Direct Connection (port 5432)

אם אתה רואה port 5432:
- זה **Direct connection**, לא pooler בכלל
- דורש IP allowlist
- לא מומלץ מ-Railway

## סיכום

1. **Port 6543** = Pooler (Transaction או Session)
2. **Port 5432** = Direct connection (לא pooler)
3. **ההבדל בין Transaction ל-Session** = רק ב-Supabase Dashboard, לא ב-URL
4. **למיגרציות** = צריך **Session pooler** (לא Transaction pooler)

## איך לוודא?

אחרי שתעדכן את DATABASE_URL ב-Railway, הרץ:
```bash
railway run node DATABASE/VERIFY_SUPABASE_CONNECTION.js
```

אם המיגרציות עובדות = בחרת נכון (Session pooler) ✅
אם המיגרציות נכשלות = בחרת Transaction pooler ❌






