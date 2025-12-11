# Fix: Prepared Statement "s1" Already Exists Error

## Problem

You're seeing errors like:
```
ERROR: prepared statement "s1" already exists
ERROR: prepared statement "s0" already exists
```

This happens when using Prisma with Supabase's connection pooler. Prisma uses prepared statements by default, but Supabase's pooler (PgBouncer) doesn't handle them well because connections are reused.

## Root Cause

- Prisma uses prepared statements by default
- Supabase connection pooler (port 6543) uses PgBouncer
- PgBouncer reuses connections, causing prepared statement name conflicts
- This affects both Transaction Mode and Session Mode poolers

## Solution

Add `?pgbouncer=true` to your `DATABASE_URL` in Railway to disable prepared statements.

### Step 1: Update DATABASE_URL in Railway Dashboard

**Important:** The `DATABASE_URL` is stored in Railway's environment variables. You must update it there.

1. Go to **Railway Dashboard** → https://railway.app
2. Select your **Project**
3. Click on your **Service**
4. Go to the **Variables** tab
5. Find `DATABASE_URL` in the list
6. Click the **pencil icon** (✏️) or **Edit** button to modify it

**Before:**
```
postgresql://postgres.xxx:password@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require
```

**After:**
```
postgresql://postgres.xxx:password@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
```

**Important Notes:**
- If the URL already has `?` (like `?sslmode=require`), add `&pgbouncer=true`
- If the URL doesn't have `?`, add `?pgbouncer=true`
- Make sure to copy the entire URL correctly - don't break it!

### Step 2: Save and Redeploy

1. Click **Save** or **Update** in Railway
2. Railway will automatically redeploy your service
3. Or manually trigger: **Deploy** → **Redeploy**

### Step 3: Verify the Fix

Check your Railway logs:
1. Go to **Railway Dashboard** → Your Service → **Deployments** → **Latest**
2. Click **View Logs**
3. You should see:
   - ✅ No more "prepared statement already exists" errors
   - ✅ Successful database connections
   - ✅ Working queries

**See also:** `PREPARED_STATEMENT_FIX_RAILWAY.md` for Hebrew instructions

### Step 3: Verify the Fix

Check your logs - you should no longer see prepared statement errors.

## Alternative: Use Direct Connection

If the pooler continues to cause issues, you can use Supabase's direct connection (port 5432):

1. Go to **Supabase Dashboard** → Settings → Database
2. Copy the **Direct connection** string (port 5432)
3. Update `DATABASE_URL` in Railway with this URL
4. Add `?sslmode=require&pgbouncer=true` to the end

**Note:** Direct connection doesn't use pooling, so it may have connection limits.

## Why This Works

- `pgbouncer=true` tells Prisma to disable prepared statements
- Prisma will use regular queries instead of prepared statements
- This works correctly with connection poolers like PgBouncer
- No performance impact - queries still execute efficiently

## Related Issues

This fix also resolves:
- Migration timeouts
- Query processing errors
- Tenant lookup failures
- Any Prisma query errors related to prepared statements

## Verification

After applying the fix, your logs should show:
- ✅ No more "prepared statement already exists" errors
- ✅ Successful database queries
- ✅ Working tenant lookups
- ✅ Successful query processing

