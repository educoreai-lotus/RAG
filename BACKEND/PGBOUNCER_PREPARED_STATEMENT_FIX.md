# Fix: Prepared Statement "Already Exists" Error with Supabase pgBouncer

## 🔴 Problem

When running Prisma migrations with Supabase connection pooler (port 6543), you may encounter:

```
Error: Schema engine error:
ERROR: prepared statement "s1" already exists
```

This happens because:
- **Transaction Mode Pooler** (default) doesn't support prepared statements
- Prisma CLI tries to use prepared statements during migrations
- pgBouncer in transaction mode doesn't persist prepared statements across transactions

## ✅ Solutions

### Solution 1: Use Session Mode Pooler (Recommended for Migrations)

**Best for:** Running migrations during deployment

1. Go to **Supabase Dashboard** → **Settings** → **Database**
2. Find **Connection string** section
3. Select **Session mode** (not Transaction mode)
4. Copy the connection string
5. Update `DATABASE_URL` in Railway with the Session mode URL

**Session Mode URL format:**
```
postgresql://postgres:[PASSWORD]@[PROJECT-REF].pooler.supabase.com:6543/postgres?sslmode=require
```

**Note:** Session mode supports prepared statements, so migrations work reliably.

### Solution 2: Add Required Parameters to Connection String

**Best for:** Using Transaction Mode Pooler (for runtime)

Add these parameters to your `DATABASE_URL`:

```
?sslmode=require&pgbouncer=true&connection_limit=1
```

**Full example:**
```
postgresql://postgres:[PASSWORD]@[PROJECT-REF].pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1
```

**What these do:**
- `pgbouncer=true` - Tells Prisma to disable prepared statements
- `connection_limit=1` - Limits connection pool size (required for pgBouncer)

**Note:** Even with these parameters, Transaction Mode may still have issues with migrations. Use Session Mode for migrations.

### Solution 3: Run Migrations Manually (Most Reliable)

**Best for:** Production deployments where migrations are critical

1. **Skip migrations during deployment:**
   - Set `SKIP_MIGRATIONS=true` in Railway environment variables
   - Server will start without running migrations

2. **Run migrations manually:**
   - Go to **Supabase Dashboard** → **SQL Editor**
   - Copy migration SQL from `DATABASE/prisma/migrations/[migration-name]/migration.sql`
   - Run the SQL directly in Supabase SQL Editor

**Or use Railway CLI:**
```bash
railway run cd BACKEND && npx prisma migrate deploy --schema=../DATABASE/prisma/schema.prisma
```

### Solution 4: Use Direct Connection (Port 5432)

**Best for:** Development or when pooler has issues

Use the direct connection URL (port 5432) instead of pooler (port 6543):

```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
```

**Note:** Direct connection requires IP allowlist in Supabase (Settings → Database → Connection Pooling → Allowed IPs).

## 🔧 Automatic Fix

The code automatically tries to fix the connection string by adding:
- `pgbouncer=true` if missing
- `connection_limit=1` if missing

However, **Transaction Mode Pooler may still have issues with migrations**. The code will:
1. Detect the prepared statement error
2. Log helpful error messages
3. Continue server startup (migrations may need to be run manually)

## 📋 Recommended Setup

### For Production (Railway):

1. **Runtime Connection (Transaction Mode):**
   ```
   DATABASE_URL=postgresql://...pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1
   ```

2. **Migration Connection (Session Mode - separate variable):**
   ```
   MIGRATION_DATABASE_URL=postgresql://...pooler.supabase.com:6543/postgres?sslmode=require
   ```
   (Session mode URL from Supabase Dashboard)

3. **Update `start-with-migrations.js` to use `MIGRATION_DATABASE_URL` if available:**
   ```javascript
   const migrationUrl = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
   ```

### For Development:

Use direct connection (port 5432) or Session Mode Pooler.

## 🚨 Error Detection

The code now detects prepared statement errors and provides clear guidance:

```
❌ Prepared statement error detected!
💡 This is a known issue with Supabase Transaction Mode Pooler
💡 SOLUTIONS:
   1. Use Session Mode Pooler URL (recommended for migrations)
   2. Run migrations manually in Supabase SQL Editor
   3. Set SKIP_MIGRATIONS=true and run migrations separately
```

## 📚 References

- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Prisma with pgBouncer](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#pgbouncer)
- [Prisma Prepared Statements](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/connection-management#prepared-statements)

## ✅ Checklist

- [ ] `DATABASE_URL` includes `?sslmode=require`
- [ ] `DATABASE_URL` includes `&pgbouncer=true` (for Transaction Mode)
- [ ] `DATABASE_URL` includes `&connection_limit=1` (for Transaction Mode)
- [ ] Consider using Session Mode Pooler for migrations
- [ ] Or set `SKIP_MIGRATIONS=true` and run migrations manually
- [ ] Test migrations in staging before production


