# איך לבדוק שהחיפוש ב-Supabase עובד

## 🎯 שאלות לשאול ב-BOT כדי לוודא שהחיפוש ב-Supabase מתבצע

### ✅ שאלות שיעבדו (יש מידע ב-Supabase):

#### 1. **שאלות על Eden Levi** (יש user_profile):
```
"מה התפקיד של Eden Levi?"
"What is Eden Levi's role?"
"מי זה Eden Levi?"
"Who is Eden Levi?"
"מה התפקיד של עדן לוי?"
```

#### 2. **שאלות על קורסים** (יש course):
```
"אילו קורסים יש?"
"What courses are available?"
"מה יש בקורס JavaScript?"
"What's in the JavaScript course?"
"JavaScript Basics Course"
```

#### 3. **שאלות על מבחנים** (יש assessment):
```
"מה יש במבחן JavaScript?"
"What's in the JavaScript assessment?"
"JavaScript Fundamentals Assessment"
```

#### 4. **שאלות על תרגילים** (יש exercise):
```
"איזה תרגילים יש?"
"What exercises are available?"
"JavaScript Calculator Exercise"
```

#### 5. **שאלות על התחלה** (יש guide):
```
"איך להתחיל?"
"How do I get started?"
"EDUCORE getting started"
```

#### 6. **שאלות על דוחות** (יש report):
```
"Learning Progress Report"
"דוח התקדמות"
```

### ❌ שאלות שלא יעבדו (אין מידע):
```
"What skills are available?"  ← אין מידע על skills
"אילו כישורים יש?"  ← אין מידע על skills
"מי המדריכים?"  ← אין מידע על trainers
"Who are the trainers?"  ← אין מידע על trainers
```

---

## 🔍 איך לבדוק שהחיפוש עובד

### 1. **בדיקה דרך BOT**:
- שאל שאלה מהרשימה למעלה
- אם מקבלים תשובה עם מקורות (sources) - החיפוש עובד ✅
- אם מקבלים "No EDUCORE context found" - יש בעיה ❌

### 2. **בדיקה דרך Diagnostic Endpoint**:
```bash
# בדוק סטטוס embeddings
curl http://localhost:3000/api/debug/embeddings-status?tenant_id=default.local

# בדוק חיפוש וקטורי
curl "http://localhost:3000/api/debug/test-vector-search?query=What%20is%20Eden%20Levi%27s%20role?&tenant_id=default.local&threshold=0.3"
```

### 3. **בדיקה ישירה ב-Supabase SQL Editor**:
```sql
-- בדוק כמה embeddings יש
SELECT COUNT(*) as total FROM vector_embeddings;

-- בדוק לפי tenant
SELECT tenant_id, COUNT(*) as count 
FROM vector_embeddings 
GROUP BY tenant_id;

-- בדוק את Eden Levi
SELECT content_id, content_text, metadata
FROM vector_embeddings
WHERE content_id = 'user:manager-001';
```

---

## ⚙️ הגדרת HNSW ב-Supabase

### ✅ כן, צריך להגדיר HNSW index ב-Supabase!

HNSW (Hierarchical Navigable Small World) הוא index מיוחד שמאיץ חיפושים וקטוריים. **חובה ליצור אותו** כדי שהחיפוש יעבוד מהר.

### 📝 שלבים להגדרת HNSW:

#### 1. **וודא ש-pgvector extension מופעל**:
```sql
-- הרץ ב-Supabase Dashboard > SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;
```

#### 2. **צור HNSW index**:
```sql
-- צור index לחיפוש וקטורי מהיר
CREATE INDEX IF NOT EXISTS idx_vector_embeddings_embedding_hnsw 
ON vector_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

#### 3. **וודא שה-index נוצר**:
```sql
-- בדוק שה-index קיים
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'vector_embeddings' 
  AND indexdef LIKE '%hnsw%';
```

אם אתה רואה את ה-index - הכל תקין ✅

---

## 🚨 פתרון בעיות

### בעיה: "No results found"

**בדוק**:
1. ✅ האם pgvector extension מופעל?
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```

2. ✅ האם HNSW index קיים?
   ```sql
   SELECT indexname FROM pg_indexes 
   WHERE tablename = 'vector_embeddings' AND indexdef LIKE '%hnsw%';
   ```

3. ✅ האם יש embeddings ב-tenant_id הנכון?
   ```sql
   SELECT COUNT(*) FROM vector_embeddings WHERE tenant_id = 'YOUR_TENANT_ID';
   ```

4. ✅ האם ה-embeddings תקינים (1536 dimensions)?
   ```sql
   SELECT 
     content_id,
     array_length(embedding::float[], 1) as dimensions
   FROM vector_embeddings
   LIMIT 5;
   ```

### בעיה: "Vector search failed"

**פתרון**:
1. וודא ש-pgvector extension מופעל
2. צור HNSW index (ראה למעלה)
3. בדוק שה-DATABASE_URL נכון
4. בדוק את הלוגים לפרטים נוספים

---

## 📊 בדיקת ביצועים

### לפני HNSW index:
- חיפוש וקטורי: ~500-1000ms (איטי)

### אחרי HNSW index:
- חיפוש וקטורי: ~50-100ms (מהיר) ✅

**HNSW index משפר את הביצועים פי 10!**

---

## ✅ Checklist - לפני בדיקה

- [ ] pgvector extension מופעל ב-Supabase
- [ ] HNSW index נוצר
- [ ] יש embeddings ב-vector_embeddings (לפחות 9 רשומות)
- [ ] ה-embeddings תקינים (1536 dimensions)
- [ ] tenant_id נכון (default.local)
- [ ] הרצתי diagnostic endpoint וקיבלתי תוצאות

---

## 🎯 דוגמאות לבדיקה מלאה

### 1. בדיקה בסיסית:
```bash
# 1. בדוק embeddings status
curl http://localhost:3000/api/debug/embeddings-status?tenant_id=default.local

# 2. בדוק חיפוש וקטורי
curl "http://localhost:3000/api/debug/test-vector-search?query=Eden%20Levi&tenant_id=default.local"

# 3. שאל שאלה ב-BOT
POST /api/v1/query
{
  "query": "מה התפקיד של Eden Levi?",
  "tenant_id": "default.local"
}
```

### 2. בדיקה ב-Supabase SQL:
```sql
-- בדוק הכל בבת אחת
SELECT 
  (SELECT COUNT(*) FROM pg_extension WHERE extname = 'vector') as pgvector_enabled,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'vector_embeddings' AND indexdef LIKE '%hnsw%') as hnsw_index_exists,
  (SELECT COUNT(*) FROM vector_embeddings) as total_embeddings,
  (SELECT COUNT(*) FROM vector_embeddings WHERE tenant_id = (SELECT id FROM tenants WHERE domain = 'default.local' LIMIT 1)) as tenant_embeddings;
```

---

## 📝 סיכום

1. **שאלות לבדיקה**: שאל שאלות על Eden Levi, קורסים, מבחנים, תרגילים, או התחלה
2. **HNSW index**: **חובה ליצור** ב-Supabase SQL Editor
3. **בדיקה**: השתמש ב-diagnostic endpoints או ב-SQL queries
4. **פתרון בעיות**: בדוק pgvector, HNSW index, embeddings, ו-tenant_id

**הכל מוכן! 🚀**



