# סטטוס Private Key - מה כבר עשית ומה עוד צריך

## ✅ מה כבר עשית:

### 1. יש לך את הקובץ:
```
BACKEND/keys/rag-service-private-key.pem
```

### 2. כבר המרנו אותו ל-Base64:
הערך שהופק היה:
```
LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR0hBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJHMHdhd0lCQVFRZ3NqbWdpeitlbkhyNnAySmQKOHhnSnJnMmJKaHIzZ2YzRDBFYm94NDVJdXBTaFJBTkNBQVRmOGN0aFdMMzJ2VEpZa0ErKzc5YmE3ZDdlcnI3aApDNkNrTjIyYzZid1ZYYzFtd201cEw5SjdQTzRGSEt6bmlVaGIzVXlSZ0ZydzdXNkQ1OFdlRmhubAotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tCg==
```

## 📋 מה צריך לעשות עכשיו:

### שלב 1: הוסף ל-Railway

1. לך ל-**Railway Dashboard** → הפרויקט שלך → **Variables**
2. לחץ על **+ New Variable**
3. הוסף:
   - **Name:** `RAG_PRIVATE_KEY`
   - **Value:** העתק את ה-Base64 string למעלה
4. לחץ **Save**
5. Railway יבצע Redeploy אוטומטית

### שלב 2: בדוק שהכל עובד

לאחר ה-Redeploy, בדוק את ה-health check:
```
https://rag-production-3a4c.up.railway.app/health
```

אמור להחזיר:
```json
{
  "status": "ok",
  "dependencies": {
    "private_key": "configured"
  }
}
```

אם אתה רואה `"private_key": "missing"`, זה אומר שה-`RAG_PRIVATE_KEY` לא הוגדר נכון ב-Railway.

## 🔄 אם צריך להמיר שוב:

אם אתה צריך להמיר את המפתח שוב (למשל אם עדכנת אותו), הרץ:

```bash
cd BACKEND
node scripts/convert-key-to-base64.js
```

או עם נתיב ספציפי:
```bash
node scripts/convert-key-to-base64.js BACKEND/keys/rag-service-private-key.pem
```

## ⚠️ הערות חשובות:

1. **אל תעלה את הקובץ ל-Git** - הקובץ `rag-service-private-key.pem` צריך להישאר מקומי בלבד
2. **השתמש רק ב-Railway Variables** - אל תעלה את המפתח ישירות לקוד
3. **Base64 בלבד** - ב-Railway צריך את הערך ב-Base64, לא את הקובץ המקורי
4. **שמור על בטיחות** - המפתח הפרטי הוא רגיש מאוד, אל תשתף אותו עם אחרים

## 🔍 איך לבדוק שהמפתח נכון:

אם אתה רוצה לוודא שהמפתח תקין, תוכל לבדוק:

```bash
cd BACKEND
node scripts/test-coordinator-signature.js
```

זה יבדוק:
- ✅ שהמפתח תקין
- ✅ שניתן ליצור חתימות
- ✅ שהפורמט נכון

## 📝 סיכום:

| שלב | סטטוס | הערות |
|-----|-------|-------|
| קובץ קיים | ✅ | `BACKEND/keys/rag-service-private-key.pem` |
| המרה ל-Base64 | ✅ | כבר עשינו |
| הוספה ל-Railway | ⏳ | צריך להוסיף |
| בדיקת Health Check | ⏳ | אחרי הוספה ל-Railway |

## 🎯 השלבים הבאים:

1. ✅ הוסף `RAG_PRIVATE_KEY` ל-Railway (עם הערך Base64)
2. ✅ בדוק את ה-health check
3. ✅ (אופציונלי) הוסף `COORDINATOR_ENABLED=false` אם אין Coordinator
4. ✅ (אופציונלי) שלח את ה-Public Key למנהל Coordinator

---

**קישורים שימושיים:**
- [Health Check Fix](./HEALTH_CHECK_FIX.md)
- [Public Key Guide](./PUBLIC_KEY_GUIDE.md)
- [Prepared Statement Fix](./PREPARED_STATEMENT_FIX.md)


