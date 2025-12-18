# 📝 מדריך Commit ו-Push

## מה צריך לעשות Commit:

### ✅ קבצים שצריך לעשות Commit:

1. **שינוי בקוד:**
   - `BACKEND/src/clients/coordinator.client.js` - הוספת `x-service-name` ל-metadata

2. **סקריפטי בדיקה:**
   - `BACKEND/scripts/test-coordinator-routing.js`
   - `BACKEND/scripts/test-coordinator-simple.js`
   - `BACKEND/scripts/test-grpc-only.js`
   - `BACKEND/scripts/convert-key-to-base64.js`

3. **תיעוד:**
   - כל קבצי ה-`.md` שנוצרו

### ❌ קבצים שלא צריך לעשות Commit:

1. **מפתחות פרטיים:**
   - `BACKEND/keys/rag-service-private-key.pem` ❌
   - `BACKEND/keys/rag-service-public-key.pem` ⚠️ (public key אפשר, אבל לא חובה)

**חשוב:** מפתחות פרטיים לא צריכים להיות ב-Git!

---

## שלבים:

### 1. הוסף את keys/ ל-.gitignore

```bash
# הוסף ל-.gitignore
echo "BACKEND/keys/*.pem" >> .gitignore
```

### 2. בדוק מה השתנה

```bash
git status
```

### 3. הוסף קבצים ל-commit

```bash
# הוסף את השינוי בקוד
git add BACKEND/src/clients/coordinator.client.js

# הוסף סקריפטי בדיקה
git add BACKEND/scripts/test-*.js
git add BACKEND/scripts/convert-key-to-base64.js

# הוסף תיעוד
git add BACKEND/*.md
```

### 4. עשה Commit

```bash
git commit -m "feat: Add x-service-name to gRPC metadata for security compliance

- Added x-service-name header to gRPC metadata
- Created test scripts for coordinator routing
- Added documentation for gRPC signature testing
- All signatures now include required headers per security doc"
```

### 5. Push

```bash
git push origin main
```

---

## ⚠️ חשוב:

**אל תעשה commit למפתחות פרטיים!**

אם כבר עשית commit למפתחות:
```bash
# הסר מההיסטוריה
git rm --cached BACKEND/keys/*.pem
git commit -m "Remove private keys from git"
```

ואז הוסף ל-.gitignore:
```bash
echo "BACKEND/keys/*.pem" >> .gitignore
```

---

## סיכום:

✅ **צריך לעשות Push:**
- שינוי בקוד (x-service-name)
- סקריפטי בדיקה
- תיעוד

❌ **לא צריך לעשות Push:**
- מפתחות פרטיים
- מפתחות ציבוריים (אופציונלי)




