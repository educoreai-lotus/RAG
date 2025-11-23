-- ============================================
-- הגדרת HNSW Index ב-Supabase
-- הרץ את זה ב-Supabase Dashboard > SQL Editor
-- ============================================

-- 1. וודא ש-pgvector extension מופעל
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. בדוק שה-extension מופעל
SELECT 
  extname, 
  extversion 
FROM pg_extension 
WHERE extname = 'vector';

-- 3. צור HNSW index לחיפוש וקטורי מהיר
-- HNSW משפר את הביצועים פי 10!
CREATE INDEX IF NOT EXISTS idx_vector_embeddings_embedding_hnsw 
ON vector_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. בדוק שה-index נוצר
SELECT 
  indexname, 
  indexdef,
  CASE 
    WHEN indexdef LIKE '%hnsw%' THEN '✅ HNSW Index exists'
    ELSE '❌ HNSW Index NOT found'
  END as status
FROM pg_indexes 
WHERE tablename = 'vector_embeddings' 
  AND indexdef LIKE '%hnsw%';

-- 5. בדוק את כל ה-indexes על הטבלה
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'vector_embeddings'
ORDER BY indexname;

-- 6. בדוק את גודל ה-index
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE tablename = 'vector_embeddings'
  AND indexname LIKE '%hnsw%';

-- ============================================
-- הערות חשובות:
-- ============================================
-- 
-- 1. HNSW index הוא חובה לביצועים טובים
--    - ללא index: חיפוש איטי (~500-1000ms)
--    - עם index: חיפוש מהיר (~50-100ms)
--
-- 2. הפרמטרים:
--    - m = 16: מספר החיבורים לכל node (יותר = יותר מדויק אבל איטי יותר)
--    - ef_construction = 64: פרמטר לבניית ה-index (יותר = יותר מדויק)
--
-- 3. יצירת ה-index עלולה לקחת זמן אם יש הרבה embeddings
--    - עם 9 embeddings: כמה שניות
--    - עם 1000+ embeddings: כמה דקות
--
-- 4. אחרי יצירת ה-index, החיפושים יהיו הרבה יותר מהירים!
--
-- ============================================



