# מה לעשות עכשיו - תוכנית פעולה

## ✅ מה כבר נעשה

1. **תוקן threshold** - הורד מ-0.5 ל-0.25 (תואם יותר ל-test endpoint)
2. **פושט RBAC filtering** - עכשיו רק דורש שם משתמש ספציפי (לא דורש גם pattern)
3. **אוחד fallback threshold** - עכשיו 0.1 במקום 0.2
4. **שופר logging** - יותר פרטים לדיבוג

## 🧪 שלב 1: בדיקה מקומית (אם יש לך סביבה מקומית)

### בדיקת Test Endpoint:
```bash
curl "http://localhost:3000/api/debug/test-vector-search?query=What%20is%20Eden%20Levi%27s%20role?&tenant_id=default.local&threshold=0.3"
```

### בדיקת Production Endpoint:
```bash
curl -X POST http://localhost:3000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is Eden Levi'\''s role?",
    "tenant_id": "default.local"
  }'
```

**מה לבדוק:**
- ✅ שני ה-endpoints מחזירים תוצאות דומות
- ✅ Production endpoint מוצא תוצאות (לא "No EDUCORE context found")
- ✅ Similarity score דומה (צריך להיות ~0.857)

## 🚀 שלב 2: Deploy ל-Railway

### א. Commit השינויים:
```bash
git add BACKEND/src/services/queryProcessing.service.js
git add BACKEND/src/controllers/diagnostics.controller.js
git add VECTOR_SEARCH_FIX_SUMMARY.md
git commit -m "Fix vector search: lower threshold to 0.25, simplify RBAC filtering"
git push
```

### ב. בדיקה ב-Production:
לאחר ה-deploy, בדוק:

**Test Endpoint:**
```
https://ragmicroservice-production.up.railway.app/api/debug/test-vector-search?query=What%20is%20Eden%20Levi%27s%20role?&tenant_id=default.local&threshold=0.3
```

**Production Endpoint:**
```bash
curl -X POST https://YOUR-RAILWAY-APP.railway.app/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is Eden Levi'\''s role?",
    "tenant_id": "default.local"
  }'
```

## 📊 שלב 3: בדיקת Logs

בדוק את ה-logs ב-Railway או ב-console שלך:

### מה לחפש ב-logs:

1. **Vector search returned:**
   ```
   vectors_found: [מספר > 0]
   top_similarities: [0.857, ...]
   ```

2. **Vector filtering applied (RBAC):**
   ```
   has_specific_user_name: true
   allow_user_profiles: true
   filtered_vectors: [מספר > 0]
   ```

3. **RAG vector search completed:**
   ```
   sources_count: [מספר > 0]
   avg_confidence: [מספר > 0]
   ```

### אם עדיין אין תוצאות:

1. **בדוק tenant_id:**
   - ודא ש-`tenant_id` נכון
   - בדוק ב-logs: `tenant_id: [מספר]` ו-`tenant_domain: default.local`

2. **בדוק embeddings:**
   ```
   GET /api/debug/embeddings-status?tenant_id=default.local
   ```
   - ודא שיש embeddings ל-tenant הזה
   - בדוק `total_for_tenant: [מספר > 0]`

3. **בדוק threshold:**
   - ב-logs, חפש `threshold_used: 0.25`
   - אם זה 0.5, זה אומר שהשינויים לא נטענו

## 🔍 שלב 4: בדיקות נוספות

### בדוק שאילתות שונות:

1. **שאילתה באנגלית:**
   ```json
   {
     "query": "What is Eden Levi's role?",
     "tenant_id": "default.local"
   }
   ```

2. **שאילתה בעברית:**
   ```json
   {
     "query": "מה התפקיד של Eden Levi?",
     "tenant_id": "default.local"
   }
   ```

3. **שאילתה כללית (לא על משתמש ספציפי):**
   ```json
   {
     "query": "What courses are available?",
     "tenant_id": "default.local"
   }
   ```

### מה לבדוק:
- ✅ שאילתות על משתמשים ספציפיים מחזירות תוצאות
- ✅ שאילתות כלליות עדיין עובדות
- ✅ RBAC עדיין מגן על פרטיות (לא מראה user_profile בשאילתות כלליות)

## ⚠️ אם יש בעיות

### בעיה: עדיין "No EDUCORE context found"

**פתרונות:**
1. **בדוק embeddings:**
   - ודא שיש embeddings ב-Supabase
   - בדוק ש-tenant_id נכון

2. **בדוק logs:**
   - חפש `Vector search returned: vectors_found: 0`
   - אם זה 0, הבעיה היא ב-embeddings או ב-tenant_id

3. **נסה threshold נמוך יותר:**
   ```json
   {
     "query": "What is Eden Levi's role?",
     "tenant_id": "default.local",
     "options": {
       "min_confidence": 0.1
     }
   }
   ```

### בעיה: תוצאות שונות בין endpoints

**זה נורמלי!** כי:
- Test endpoint לא מפעיל RBAC filtering
- Production endpoint מפעיל RBAC filtering
- אבל עכשיו הם צריכים להיות דומים יותר

## 📝 סיכום - מה לעשות עכשיו

1. ✅ **Commit ו-push** את השינויים
2. ✅ **Deploy** ל-Railway
3. ✅ **בדוק** את שני ה-endpoints
4. ✅ **בדוק logs** לוודא שהתיקונים עובדים
5. ✅ **דווח** אם יש בעיות

## 🎯 התוצאה הצפויה

לאחר התיקונים:
- ✅ Production endpoint מוצא תוצאות עם similarity ~0.857
- ✅ לא עוד "No EDUCORE context found" לשאילתות תקינות
- ✅ RBAC עדיין עובד ומגן על פרטיות
- ✅ Logs יותר מפורטים לדיבוג

---

**הערה:** אם אתה צריך עזרה עם שלב ספציפי, תגיד לי!



