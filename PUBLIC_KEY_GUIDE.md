# מדריך Public Key - מה לעשות איתו?

## יש שני Public Keys שונים:

### 1. **RAG Public Key** (שלך) - צריך לשלוח ל-Coordinator
### 2. **Coordinator Public Key** (של Coordinator) - צריך לקבל מ-Coordinator (אופציונלי)

---

## 1. RAG Public Key (שלך) - חובה

זה המפתח הציבורי של השירות שלך. Coordinator צריך אותו כדי לאמת את החתימות שלך.

### מה לעשות:

#### שלב 1: מצא את הקובץ
```
BACKEND/keys/rag-service-public-key.pem
```

#### שלב 2: שלח את תוכן הקובץ למנהל Coordinator

**דרך 1: העתק-הדבק**
1. פתח את הקובץ `BACKEND/keys/rag-service-public-key.pem`
2. העתק את כל התוכן (כולל `-----BEGIN PUBLIC KEY-----` ו-`-----END PUBLIC KEY-----`)
3. שלח למנהל Coordinator

**דרך 2: רישום אוטומטי**
אם יש לך Coordinator endpoint, תוכל לרשום את השירות עם הסקריפט:
```bash
cd BACKEND
node scripts/register-service-secure.js
```

זה ישלח את ה-public key אוטומטית.

### למה זה חשוב?

- Coordinator משתמש ב-public key שלך כדי לאמת שהבקשות מגיעות ממך
- בלי זה, Coordinator לא יוכל לאמת את החתימות שלך
- זה חלק מתהליך הרישום של השירות ב-Coordinator

---

## 2. Coordinator Public Key (של Coordinator) - אופציונלי אבל מומלץ

זה המפתח הציבורי של Coordinator. אתה צריך אותו כדי לאמת תגובות מ-Coordinator.

### מה לעשות:

#### שלב 1: בקש מהמנהל Coordinator
בקש ממנהל Coordinator את ה-Public Key שלהם.

#### שלב 2: המר ל-Base64 (אם צריך)
אם Coordinator נתן לך את המפתח בפורמט PEM רגיל, המר אותו ל-Base64:

**PowerShell:**
```powershell
$key = Get-Content coordinator-public-key.pem -Raw
$bytes = [System.Text.Encoding]::UTF8.GetBytes($key)
[System.Convert]::ToBase64String($bytes)
```

**או השתמש בסקריפט:**
```bash
cd BACKEND
node scripts/convert-key-to-base64.js <path-to-coordinator-public-key.pem>
```

#### שלב 3: הוסף ל-Railway (אופציונלי)

אם אתה רוצה לאמת תגובות מ-Coordinator:

1. לך ל-**Railway Dashboard** → הפרויקט שלך → **Variables**
2. לחץ על **+ New Variable**
3. הוסף:
   - **Name:** `COORDINATOR_PUBLIC_KEY`
   - **Value:** ה-Base64 string של Coordinator public key
4. לחץ **Save**

### למה זה מומלץ?

- מאפשר לך לאמת שתגובות מ-Coordinator אכן מגיעות מ-Coordinator
- מונע התקפות man-in-the-middle
- לא חובה, אבל מומלץ ל-Production

---

## סיכום - מה צריך לעשות עכשיו?

### ✅ כבר עשית:
- [x] Private Key → הוספת ל-Railway כ-`RAG_PRIVATE_KEY` (Base64)

### 📋 צריך לעשות:

1. **שלח את RAG Public Key ל-Coordinator:**
   - פתח: `BACKEND/keys/rag-service-public-key.pem`
   - העתק את התוכן
   - שלח למנהל Coordinator

2. **קבל Coordinator Public Key (אופציונלי):**
   - בקש מהמנהל Coordinator
   - המר ל-Base64
   - הוסף ל-Railway כ-`COORDINATOR_PUBLIC_KEY`

---

## איך לבדוק שהכל עובד?

### בדוק את Health Check:
```
https://rag-production-3a4c.up.railway.app/health
```

אמור להחזיר:
```json
{
  "status": "ok",
  "dependencies": {
    "coordinator": "ok" או "disabled",
    "private_key": "configured"
  }
}
```

### בדוק רישום ב-Coordinator:
אם יש לך Coordinator, תוכל לבדוק שהשירות רשום:
```bash
cd BACKEND
node scripts/test-coordinator-integration.js
```

---

## שאלות נפוצות

### Q: האם צריך Coordinator Public Key כדי שהשירות יעבוד?
**A:** לא. זה אופציונלי. השירות יעבוד גם בלי זה, אבל לא תוכל לאמת תגובות מ-Coordinator.

### Q: האם צריך לשלוח את RAG Public Key ל-Coordinator?
**A:** כן, זה חובה אם אתה משתמש ב-Coordinator. Coordinator צריך את ה-public key שלך כדי לאמת את החתימות שלך.

### Q: מה ההבדל בין Private Key ל-Public Key?
**A:**
- **Private Key** - נשאר אצלך, משמש לחתימה על בקשות
- **Public Key** - נשלח לאחרים, משמש לאימות החתימות שלך

### Q: האם צריך להמיר את Public Key ל-Base64?
**A:** 
- **RAG Public Key** - לא צריך, שולחים אותו בפורמט PEM רגיל ל-Coordinator
- **Coordinator Public Key** - כן, צריך Base64 אם אתה רוצה להוסיף אותו ל-Railway

---

## קישורים שימושיים

- [Service Registration Guide](./SERVICE_REGISTRATION_GUIDE.md)
- [Coordinator Integration Guide](./BACKEND/COORDINATOR_INTEGRATION_GUIDE.md)
- [Health Check Fix](./HEALTH_CHECK_FIX.md)


