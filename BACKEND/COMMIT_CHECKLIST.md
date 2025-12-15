# ✅ Checklist לפני Commit ו-Push

## מה צריך לעשות Commit:

### 1. שינוי בקוד ✅
- [x] `BACKEND/src/clients/coordinator.client.js` - הוספת `x-service-name`

### 2. סקריפטי בדיקה ✅
- [x] `BACKEND/scripts/test-coordinator-routing.js`
- [x] `BACKEND/scripts/test-coordinator-simple.js`
- [x] `BACKEND/scripts/test-grpc-only.js`
- [x] `BACKEND/scripts/convert-key-to-base64.js`

### 3. תיעוד ✅
- [x] `BACKEND/COORDINATOR_COMMUNICATION_TEST_GUIDE.md`
- [x] `BACKEND/COORDINATOR_TCP_PROXY_SETUP.md`
- [x] `BACKEND/GRPC_SIGNATURE_METADATA_ANALYSIS.md`
- [x] `BACKEND/GRPC_TESTING_GUIDE.md`
- [x] `BACKEND/RAILWAY_NETWORKING_SETUP.md`
- [x] `BACKEND/SECURITY_IMPLEMENTATION_CHECK.md`
- [x] `BACKEND/SIGNATURE_IMPLEMENTATION_SUMMARY.md`
- [x] `BACKEND/TEST_RESULTS_SUMMARY.md`
- [x] `BACKEND/GIT_COMMIT_GUIDE.md`

### 4. .gitignore ✅
- [x] הוספת `BACKEND/keys/*.pem` ל-.gitignore

---

## מה לא צריך לעשות Commit:

### ❌ מפתחות פרטיים
- [ ] `BACKEND/keys/rag-service-private-key.pem` - **לא לעשות commit!**
- [ ] `BACKEND/keys/rag-service-public-key.pem` - אופציונלי (public key)

---

## פקודות לביצוע:

### 1. ודא ש-.gitignore מעודכן

```bash
# בדוק ש-keys/ ב-.gitignore
cat .gitignore | grep keys
```

### 2. הוסף קבצים ל-commit

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

### 3. בדוק מה נוסף

```bash
git status
```

### 4. עשה Commit

```bash
git commit -m "feat: Add x-service-name to gRPC metadata and testing scripts

- Added x-service-name header to gRPC metadata for security compliance
- Created comprehensive test scripts for coordinator routing
- Added documentation for gRPC signature testing and Railway setup
- Updated .gitignore to exclude private keys
- All signatures now include required headers per security doc"
```

### 5. Push

```bash
git push origin main
```

---

## ⚠️ בדיקה אחרונה:

לפני Push, ודא:
- [ ] אין מפתחות פרטיים ב-commit
- [ ] כל הקבצים הנדרשים נוספו
- [ ] .gitignore מעודכן

---

## אם כבר עשית commit למפתחות:

```bash
# הסר מההיסטוריה
git rm --cached BACKEND/keys/*.pem
git commit -m "Remove private keys from git history"
```

ואז:
1. שנה את המפתחות ב-GitHub Secrets
2. Push את השינויים


