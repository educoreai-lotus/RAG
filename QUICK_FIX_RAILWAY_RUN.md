# פתרון מהיר: Railway Run לא מעביר Variables

## הבעיה

`railway run npm run create:embeddings` לא מעביר את ה-`OPENAI_API_KEY` למרות שהוא מוגדר ב-Railway.

---

## ✅ פתרון הכי קל: Railway Dashboard Shell

### שלבים:

1. **לך ל-Railway Dashboard:**
   - https://railway.app
   - בחר את הפרויקט RAG

2. **פתח Shell:**
   - לחץ על **Deployments** (בתפריט השמאלי)
   - בחר את ה-deployment האחרון
   - לחץ על **View Logs**
   - לחץ על **Shell** (או **Terminal**) - כפתור בצד ימין

3. **הרץ את הסקריפט:**
   ```bash
   cd /app/BACKEND
   npm run create:embeddings
   ```

**למה זה עובד?** כי זה רץ ישירות על Railway, שם כל ה-environment variables זמינים אוטומטית!

---

## 🔧 פתרון חלופי: בדוק את ה-Link

אם אתה רוצה להמשיך עם `railway run` מקומי:

```bash
cd BACKEND

# בדוק את הסטטוס
railway status

# אם צריך, קשר מחדש
railway link

# נסה עם service flag
railway run --service RAG_microservice npm run create:embeddings
```

---

## 🎯 למה זה קורה?

`railway run` אמור לקחת את ה-variables אוטומטית, אבל לפעמים:
- הפרויקט לא מקושר נכון
- ה-variables מוגדרים ב-service אחר
- יש בעיה עם ה-CLI

**הפתרון הכי בטוח:** הרץ דרך Railway Dashboard Shell!

---

## 📋 Checklist

- [ ] ניסיתי דרך Railway Dashboard Shell ✅ (הכי קל)
- [ ] בדקתי ש-`railway link` עובד
- [ ] בדקתי ש-`railway status` מראה את הפרויקט הנכון
- [ ] ניסיתי עם `--service` flag

---

**המלצה: השתמש ב-Railway Dashboard Shell - זה הכי פשוט ומהיר!**

