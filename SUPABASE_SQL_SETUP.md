# 🚀 הוראות להרצת SQL ב-Supabase

## 📋 מה להריץ ב-SQL Editor ב-Supabase

### שלב 1: יצירת טבלת `microservice_data`

**העתק והדבק את הקוד הבא ב-Supabase SQL Editor:**

```sql
-- ============================================
-- Create microservice_data table
-- ============================================

-- Create microservice_data table
CREATE TABLE IF NOT EXISTS microservice_data (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  service_name VARCHAR(255) NOT NULL,
  content_id VARCHAR(500) NOT NULL,
  content_type VARCHAR(255) NOT NULL,
  content_data JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key to tenants table
  CONSTRAINT fk_microservice_data_tenant 
    FOREIGN KEY (tenant_id) 
    REFERENCES tenants(id) 
    ON DELETE CASCADE,
  
  -- Unique constraint: same content from same service can't be duplicated
  UNIQUE(service_name, content_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_microservice_data_service_name 
  ON microservice_data(service_name);

CREATE INDEX IF NOT EXISTS idx_microservice_data_tenant_id 
  ON microservice_data(tenant_id);

CREATE INDEX IF NOT EXISTS idx_microservice_data_timestamp 
  ON microservice_data(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_microservice_data_content_type 
  ON microservice_data(content_type);

CREATE INDEX IF NOT EXISTS idx_microservice_data_content_id 
  ON microservice_data(content_id);

-- Composite index for common queries (tenant + service)
CREATE INDEX IF NOT EXISTS idx_microservice_data_tenant_service 
  ON microservice_data(tenant_id, service_name);

-- GIN indexes for JSONB queries (for searching inside JSONB fields)
CREATE INDEX IF NOT EXISTS idx_microservice_data_content_data 
  ON microservice_data USING GIN (content_data);

CREATE INDEX IF NOT EXISTS idx_microservice_data_metadata 
  ON microservice_data USING GIN (metadata);

-- Add comments for documentation
COMMENT ON TABLE microservice_data IS 'Stores raw data from microservices before processing into vectors and knowledge graph';
COMMENT ON COLUMN microservice_data.content_data IS 'Full original data from microservice as JSONB';
COMMENT ON COLUMN microservice_data.metadata IS 'Mapped fields according to schema configuration';
COMMENT ON COLUMN microservice_data.service_name IS 'Name of the microservice that provided this data (e.g., hr-reporting-service)';
COMMENT ON COLUMN microservice_data.content_id IS 'Unique identifier of the content within the microservice';
COMMENT ON COLUMN microservice_data.content_type IS 'Type of content (e.g., report, assessment, document)';
```

### שלב 2: אימות שהטבלה נוצרה

**הרץ את השאילתה הבאה כדי לוודא שהטבלה קיימת:**

```sql
-- Check if table exists
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'microservice_data'
ORDER BY ordinal_position;
```

**צריך לראות את העמודות הבאות:**
- `id` (uuid)
- `tenant_id` (uuid)
- `service_name` (varchar)
- `content_id` (varchar)
- `content_type` (varchar)
- `content_data` (jsonb)
- `metadata` (jsonb)
- `timestamp` (timestamptz)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### שלב 3: בדיקת אינדקסים

**הרץ את השאילתה הבאה כדי לוודא שהאינדקסים נוצרו:**

```sql
-- Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'microservice_data';
```

**צריך לראות לפחות את האינדקסים הבאים:**
- `idx_microservice_data_service_name`
- `idx_microservice_data_tenant_id`
- `idx_microservice_data_timestamp`
- `idx_microservice_data_content_type`
- `idx_microservice_data_content_id`
- `idx_microservice_data_tenant_service`
- `idx_microservice_data_content_data` (GIN)
- `idx_microservice_data_metadata` (GIN)

### שלב 4: בדיקת Foreign Key

**הרץ את השאילתה הבאה כדי לוודא שה-Foreign Key נוצר:**

```sql
-- Check foreign keys
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'microservice_data'
  AND tc.constraint_type = 'FOREIGN KEY';
```

**צריך לראות:**
- `fk_microservice_data_tenant` → `tenants(id)`

## ✅ אימות סופי

**הרץ את השאילתה הבאה כדי לראות את כל הטבלה:**

```sql
-- View table structure
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'microservice_data'
ORDER BY ordinal_position;
```

## 🧪 בדיקת הכנסת נתונים (אופציונלי)

**אם יש לך `tenant_id` קיים, תוכל לבדוק הכנסת נתונים:**

```sql
-- Insert test data (replace YOUR_TENANT_ID with actual tenant ID)
INSERT INTO microservice_data (
  tenant_id,
  service_name,
  content_id,
  content_type,
  content_data,
  metadata,
  timestamp
) VALUES (
  'YOUR_TENANT_ID',  -- Replace with actual tenant ID
  'hr-reporting-service',
  'test-content-001',
  'report',
  '{"title": "Test Report", "content": "This is a test"}',
  '{"source": "test"}',
  NOW()
);

-- Check if data was inserted
SELECT * FROM microservice_data WHERE service_name = 'hr-reporting-service';
```

## 📝 הערות חשובות

1. **Foreign Key** - הטבלה מחוברת ל-`tenants` - ודא שיש לפחות tenant אחד במערכת
2. **Unique Constraint** - אותו `content_id` מאותו `service_name` לא יכול להופיע פעמיים
3. **JSONB** - `content_data` ו-`metadata` הם JSONB - אפשר לחפש בתוכם עם GIN indexes
4. **Indexes** - כל האינדקסים נוצרים אוטומטית - זה יעזור לביצועים

## 🚨 אם יש שגיאות

### שגיאה: "relation tenants does not exist"
**פתרון:** ודא שהטבלה `tenants` קיימת. אם לא, צריך ליצור אותה קודם.

### שגיאה: "permission denied"
**פתרון:** ודא שיש לך הרשאות CREATE TABLE ב-Supabase.

### שגיאה: "duplicate key value violates unique constraint"
**פתרון:** זה אומר שהאינדקס כבר קיים - זה בסדר, אפשר להתעלם.

## 🎯 מה הלאה?

לאחר יצירת הטבלה:
1. ✅ עדכן את Prisma schema (נוסיף את זה בהמשך)
2. ✅ צור את ה-services (dataStorageService, vectorizationService)
3. ✅ עדכן את batchSyncService לקרוא ל-services החדשים
4. ✅ בדוק שהכל עובד עם נתוני HR reporting

