# Prepared Statement Error Fix

## הבעיה:
```
ERROR: prepared statement "s0" already exists
```

זה קורה בגלל Supabase connection pooling (port 6543).

## פתרונות:

### פתרון 1: השתמש ב-Direct Connection (מומלץ)
שנה את DATABASE_URL ב-Railway מ-port 6543 ל-5432:

**מ:**
```
postgresql://...@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=require
```

**ל:**
```
postgresql://...@aws-0-region.pooler.supabase.com:5432/postgres?sslmode=require
```

Port 5432 = direct connection (לא pooling) = אין בעיות עם prepared statements

### פתרון 2: הפעל pgvector לפני Migrations
1. לך ל-Supabase SQL Editor
2. הרץ: `CREATE EXTENSION IF NOT EXISTS vector;`
3. ודא שזה עבד: `SELECT * FROM pg_extension WHERE extname = 'vector';`
4. נסה שוב ב-Railway

### פתרון 3: הרץ Migrations ידנית
אם עדיין לא עובד, הרץ migrations ידנית ב-Supabase SQL Editor:
1. העתק את תוכן `DATABASE/prisma/migrations/20250101000000_init/migration.sql`
2. הרץ ב-Supabase SQL Editor
3. העתק את תוכן `DATABASE/prisma/migrations/20250101000001_add_pgvector/migration.sql`
4. הרץ ב-Supabase SQL Editor
5. העתק את תוכן `DATABASE/prisma/migrations/20250101000002_add_hnsw_index/migration.sql`
6. הרץ ב-Supabase SQL Editor

## למה זה קורה?

Supabase connection pooling (port 6543) משתמש ב-prepared statements ששומרים state בין queries. כשמנסים להריץ migration אחרי query אחר, זה יוצר conflict.

Direct connection (port 5432) לא משתמש ב-prepared statements, אז אין בעיה.

## המלצה:

**השתמש ב-direct connection (5432) ל-migrations:**
- יותר אמין
- אין בעיות עם prepared statements
- עובד טוב עם Prisma migrations

**השתמש ב-pooler (6543) ל-production:**
- יותר יעיל
- יותר connections
- אבל לא טוב ל-migrations

