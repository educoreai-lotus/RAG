# Prisma Schema Validation

## בדיקת Schema

### פקודה לבדיקה מקומית (דורש DATABASE_URL):
```bash
# מ-DATABASE/ directory
npx prisma validate --schema=prisma/schema.prisma
```

**הערה:** `prisma validate` דורש `DATABASE_URL` environment variable כדי לבדוק את החיבור. זה **לא** אומר שה-schema לא תקין!

### בדיקת Syntax בלבד (לא דורש DATABASE_URL):
```bash
npx prisma format --schema=prisma/schema.prisma
```

### Generate (הבדיקה הטובה ביותר):
```bash
npx prisma generate --schema=prisma/schema.prisma
```

אם זה עובד, ה-schema תקין! ✅

## בעיות שנפתרו

### ❌ בעיה: JsonbPathOps Index
**שגיאה:**
```
Error parsing attribute "@@index": The given operator class `JsonbPathOps` is not supported with the `BTree` index type.
```

**פתרון:** ✅ הסרנו את ה-index מה-schema:
```prisma
// לפני:
@@index([properties(ops: JsonbPathOps)], map: "idx_kg_nodes_properties")

// אחרי:
// Note: GIN index for JSONB properties created manually via SQL migration
```

ה-GIN index נוצר ידנית ב-migration SQL (ראה `template_pgvector.sql`).

## אימות ב-Railway

ב-Railway, אם ה-Build Command עובר:
```
npm install && npm run db:generate
```

ואתה רואה:
```
Prisma schema loaded from DATABASE/prisma/schema.prisma
✔ Generated Prisma Client
```

**זה אומר שה-schema תקין!** ✅

## יצירת GIN Indexes ידנית

אחרי שה-migrations הראשוניות רצו, צריך ליצור GIN indexes ידנית ב-Supabase SQL Editor:

```sql
-- GIN index for JSONB properties
CREATE INDEX IF NOT EXISTS idx_kg_nodes_properties_gin 
ON knowledge_graph_nodes 
USING gin (properties);

-- GIN indexes for user profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_skill_gaps_gin 
ON user_profiles 
USING gin (skill_gaps);

CREATE INDEX IF NOT EXISTS idx_user_profiles_preferences_gin 
ON user_profiles 
USING gin (preferences);
```

או להשתמש ב-`DATABASE/prisma/migrations/template_pgvector.sql` שכולל את כל ה-indexes.

---

**סיכום:** אם `prisma generate` עובד ב-Railway, ה-schema תקין! 🎉

