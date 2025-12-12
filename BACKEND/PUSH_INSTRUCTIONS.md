# 📤 הוראות Push

## ✅ כן, צריך לעשות Push!

### מה צריך לעשות Commit:

1. **שינוי בקוד:**
   - `BACKEND/src/clients/coordinator.client.js` - הוספת `x-service-name` ✅

2. **סקריפטי בדיקה:**
   - `BACKEND/scripts/test-coordinator-routing.js` ✅
   - `BACKEND/scripts/test-coordinator-simple.js` ✅
   - `BACKEND/scripts/test-grpc-only.js` ✅
   - `BACKEND/scripts/convert-key-to-base64.js` ✅

3. **תיעוד:**
   - כל קבצי ה-`.md` ב-BACKEND ✅

4. **.gitignore:**
   - עדכון ל-.gitignore (הוספת keys/) ✅

---

## ❌ מה לא צריך לעשות Commit:

- `BACKEND/keys/rag-service-private-key.pem` - **מפתח פרטי - לא לעשות commit!**
- `BACKEND/keys/rag-service-public-key.pem` - אופציונלי

---

## פקודות לביצוע:

### 1. הוסף קבצים (ללא מפתחות):

```bash
# שינוי בקוד
git add BACKEND/src/clients/coordinator.client.js

# סקריפטי בדיקה
git add BACKEND/scripts/test-*.js
git add BACKEND/scripts/convert-key-to-base64.js

# תיעוד
git add BACKEND/*.md

# .gitignore
git add .gitignore
```

### 2. בדוק מה נוסף:

```bash
git status
```

**ודא שאין מפתחות פרטיים!**

### 3. עשה Commit:

```bash
git commit -m "feat: Add x-service-name to gRPC metadata and testing infrastructure

- Added x-service-name header to gRPC metadata for security compliance
- Created comprehensive test scripts for coordinator routing
- Added documentation for gRPC signature testing and Railway setup
- Updated .gitignore to exclude private keys
- All signatures now include required headers per security doc"
```

### 4. Push:

```bash
git push origin main
```

---

## ⚠️ חשוב:

**לפני Push, ודא:**
- ✅ אין מפתחות פרטיים ב-commit
- ✅ .gitignore מעודכן
- ✅ כל הקבצים הנדרשים נוספו

---

## סיכום:

**כן, צריך לעשות Push!** ✅

השינויים כוללים:
- שיפור אבטחה (x-service-name)
- סקריפטי בדיקה
- תיעוד מקיף

**אל תעשה commit למפתחות פרטיים!** ❌

