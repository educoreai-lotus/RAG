# מדריך הפעלת HNSW Index

## מה זה HNSW?

**HNSW (Hierarchical Navigable Small World)** הוא אינדקס וקטורי שמאפשר חיפוש וקטורי מהיר מאוד. זה קריטי לביצועים של חיפוש embeddings ב-`vector_embeddings` table.

## למה זה חשוב?

ללא HNSW index:
- ❌ חיפוש וקטורי יכול לקחת שניות (full table scan)
- ❌ ביצועים גרועים עם הרבה embeddings

עם HNSW index:
- ✅ חיפוש וקטורי מהיר (< 100ms גם עם מיליוני embeddings)
- ✅ ביצועים מעולים גם עם datasets גדולים

## איך להפעיל HNSW Index

### אופציה 1: דרך Migration (מומלץ)

אם המיגרציות רצות אוטומטית, ה-HNSW index ייווצר אוטומטית דרך המיגרציה:
```
DATABASE/prisma/migrations/20250101000002_add_hnsw_index/migration.sql
```

**ודא שהמיגרציה רצה:**
```bash
railway run cd BACKEND && npx prisma migrate status --schema=../DATABASE/prisma/schema.prisma
```

אם המיגרציה לא רצה, ראה "אופציה 2" למטה.

### אופציה 2: ידנית ב-Supabase SQL Editor

אם המיגרציה לא רצה או אם אתה רוצה ליצור את האינדקס ידנית:

1. לך ל-**Supabase Dashboard** → **SQL Editor**
2. הרץ את הפקודה הבאה:

```sql
-- בדוק אם האינדקס כבר קיים
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'vector_embeddings' 
  AND indexdef LIKE '%hnsw%';
```

אם אין תוצאות, צור את האינדקס:

```sql
CREATE INDEX IF NOT EXISTS idx_vector_embeddings_embedding_hnsw 
ON vector_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**⏱️ זמן יצירה:**
- טבלה ריקה: כמה שניות
- טבלה עם נתונים: יכול לקחת כמה דקות (תלוי בכמות הנתונים)

### אופציה 3: דרך Railway CLI

```bash
railway run cd BACKEND && npx prisma migrate deploy --schema=../DATABASE/prisma/schema.prisma
```

או אם המיגרציה כבר רצה אבל האינדקס לא נוצר:

```bash
railway run node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$executeRaw\`
  CREATE INDEX IF NOT EXISTS idx_vector_embeddings_embedding_hnsw 
  ON vector_embeddings 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
\`.then(() => {
  console.log('HNSW index created successfully');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
"
```

## בדיקה שהאינדקס נוצר

### דרך Supabase SQL Editor

```sql
SELECT 
  indexname, 
  indexdef,
  tablename
FROM pg_indexes 
WHERE tablename = 'vector_embeddings' 
  AND indexdef LIKE '%hnsw%';
```

צריך לראות:
```
indexname: idx_vector_embeddings_embedding_hnsw
indexdef: CREATE INDEX idx_vector_embeddings_embedding_hnsw ON public.vector_embeddings USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)
```

### דרך Diagnostics Endpoint

אם השרת רץ, תוכל לבדוק דרך:
```
http://localhost:8080/api/debug/embeddings-status
```

התשובה תכלול:
```json
{
  "hnsw_index_exists": true,
  ...
}
```

### דרך הסקריפט שלנו

```bash
railway run node DATABASE/VERIFY_SUPABASE_CONNECTION.js
```

הסקריפט יבדוק גם את קיום ה-HNSW index.

## פרמטרים של HNSW

האינדקס נוצר עם הפרמטרים הבאים:

- **`m = 16`**: מספר החיבורים בכל שכבה (יותר = יותר זיכרון, אבל מהיר יותר)
- **`ef_construction = 64`**: מספר המועמדים לבנייה (יותר = בנייה איטית יותר, אבל איכות טובה יותר)
- **`vector_cosine_ops`**: Operator class לחיפוש cosine similarity

### מתי לשנות פרמטרים?

**להגדיל `m` (16 → 32):**
- אם יש לך הרבה זיכרון
- אם אתה צריך חיפוש מהיר יותר
- ⚠️ זה יגדיל את גודל האינדקס

**להגדיל `ef_construction` (64 → 128):**
- אם אתה בונה את האינדקס פעם אחת ויש לך הרבה נתונים
- ⚠️ זה יגדיל את זמן הבנייה

**להקטין פרמטרים:**
- אם יש לך מגבלות זיכרון
- אם האינדקס קטן מדי (פחות מ-1000 embeddings)

## פתרון בעיות

### "relation vector_embeddings does not exist"

**פתרון:** צריך ליצור את הטבלה קודם. הרץ את המיגרציה הראשונה:
```bash
railway run cd BACKEND && npx prisma migrate deploy --schema=../DATABASE/prisma/schema.prisma
```

### "extension vector does not exist"

**פתרון:** הפעל את pgvector extension:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### "index already exists"

**פתרון:** זה בסדר! האינדקס כבר קיים. אתה יכול לדלג על זה.

### יצירת האינדקס לוקחת הרבה זמן

**זה נורמלי!** אם יש לך הרבה embeddings (מאות אלפים או מיליונים), יצירת האינדקס יכולה לקחת:
- 10,000 embeddings: ~10 שניות
- 100,000 embeddings: ~1-2 דקות
- 1,000,000 embeddings: ~10-20 דקות

**טיפ:** אם אתה יוצר את האינדקס על טבלה עם נתונים, זה יכול לקחת זמן. זה בסדר - תן לו לסיים.

### האינדקס לא משפר ביצועים

**בדוק:**
1. האם האינדקס באמת קיים? (ראה "בדיקה שהאינדקס נוצר")
2. האם אתה משתמש ב-`<=>` operator לחיפוש? (זה נדרש ל-HNSW)
3. האם יש מספיק נתונים? (עם פחות מ-1000 embeddings, ההבדל לא משמעותי)

## קישורים שימושיים

- [pgvector HNSW Documentation](https://github.com/pgvector/pgvector#hnsw)
- [HNSW Algorithm Paper](https://arxiv.org/abs/1603.09320)
- [Prisma Vector Search Guide](https://www.prisma.io/docs/guides/database/vector-search)







