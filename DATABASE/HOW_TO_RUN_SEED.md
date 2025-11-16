# איך להריץ Seed Script - למלא את הטבלאות ב-Mock Data

## הבעיה:
הטבלאות נוצרו אבל ריקות (Count = 0). צריך להריץ את ה-seed script.

---

## שיטה 1: דרך Railway CLI (מומלץ!)

```bash
# הרץ את ה-seed script דרך Railway
railway run cd BACKEND && npm run db:seed
```

או:
```bash
railway run bash
cd BACKEND
npm run db:seed
```

---

## שיטה 2: דרך Supabase SQL Editor (ידני)

אם Railway לא עובד, אפשר להריץ ידנית:

### שלב 1: צור את המיקרוסרוויסים

```sql
-- תחילה, מצא את ה-tenant_id
SELECT id, domain FROM tenants LIMIT 1;

-- העתק את ה-tenant_id והשתמש בו כאן:
-- (החלף 'YOUR_TENANT_ID' ב-ID האמיתי)

INSERT INTO microservices (
  id,
  tenant_id,
  name,
  service_id,
  display_name,
  description,
  api_endpoint,
  version,
  is_active,
  settings,
  metadata,
  created_at,
  updated_at
) VALUES
  (gen_random_uuid()::text, 'YOUR_TENANT_ID', 'assessment', 'assessment', 'Assessment Service', 'Handles assessments, quizzes, and evaluations', 'https://assessment.educore.local/api', '1.0.0', true, '{}', '{}', NOW(), NOW()),
  (gen_random_uuid()::text, 'YOUR_TENANT_ID', 'devlab', 'devlab', 'DevLab Service', 'Development lab environment and coding exercises', 'https://devlab.educore.local/api', '1.0.0', true, '{}', '{}', NOW(), NOW()),
  (gen_random_uuid()::text, 'YOUR_TENANT_ID', 'content', 'content', 'Content Management Service', 'Manages learning content, courses, and materials', 'https://content.educore.local/api', '1.0.0', true, '{}', '{}', NOW(), NOW()),
  (gen_random_uuid()::text, 'YOUR_TENANT_ID', 'analytics', 'analytics', 'Analytics Service', 'Learning analytics and progress tracking', 'https://analytics.educore.local/api', '1.0.0', true, '{}', '{}', NOW(), NOW()),
  (gen_random_uuid()::text, 'YOUR_TENANT_ID', 'user-management', 'user-management', 'User Management Service', 'User accounts, profiles, and authentication', 'https://users.educore.local/api', '1.0.0', true, '{}', '{}', NOW(), NOW()),
  (gen_random_uuid()::text, 'YOUR_TENANT_ID', 'notification', 'notification', 'Notification Service', 'Sends notifications and alerts to users', 'https://notifications.educore.local/api', '1.0.0', true, '{}', '{}', NOW(), NOW()),
  (gen_random_uuid()::text, 'YOUR_TENANT_ID', 'reporting', 'reporting', 'Reporting Service', 'Generates reports and analytics dashboards', 'https://reporting.educore.local/api', '1.0.0', true, '{}', '{}', NOW(), NOW()),
  (gen_random_uuid()::text, 'YOUR_TENANT_ID', 'integration', 'integration', 'Integration Service', 'Third-party integrations and API management', 'https://integration.educore.local/api', '1.0.0', true, '{}', '{}', NOW(), NOW()),
  (gen_random_uuid()::text, 'YOUR_TENANT_ID', 'ai-assistant', 'ai-assistant', 'AI Assistant Service', 'RAG microservice - Contextual AI assistant', 'https://ai-assistant.educore.local/api', '1.0.0', true, '{}', '{}', NOW(), NOW()),
  (gen_random_uuid()::text, 'YOUR_TENANT_ID', 'gateway', 'gateway', 'API Gateway', 'API Gateway for routing and load balancing', 'https://gateway.educore.local/api', '1.0.0', true, '{}', '{}', NOW(), NOW())
ON CONFLICT (service_id) DO NOTHING;
```

### שלב 2: בדוק שהמיקרוסרוויסים נוצרו

```sql
SELECT COUNT(*) FROM microservices;
-- אמור להציג: 10
```

---

## שיטה 3: הרץ את ה-Seed Script מקומית

אם יש לך גישה למחשב המקומי:

```bash
# 1. התקן dependencies
cd BACKEND
npm install

# 2. הגדר DATABASE_URL
export DATABASE_URL="your-supabase-connection-string"

# 3. הרץ seed
npm run db:seed
```

---

## בדיקה אחרי Seed:

```sql
-- בדוק כמה מיקרוסרוויסים יש
SELECT COUNT(*) as microservices_count FROM microservices;
-- אמור להציג: 10

-- בדוק את כל המיקרוסרוויסים
SELECT name, display_name, is_active 
FROM microservices 
ORDER BY name;

-- בדוק כמה embeddings יש
SELECT COUNT(*) as embeddings_count FROM vector_embeddings;
-- אמור להציג: 5 (אחרי seed)

-- בדוק כמה user profiles יש
SELECT COUNT(*) as users_count FROM user_profiles;
-- אמור להציג: 2

-- בדוק כמה queries יש
SELECT COUNT(*) as queries_count FROM queries;
-- אמור להציג: 1
```

---

## אם Seed לא עובד:

### אפשרות 1: בדוק שה-Prisma Client מעודכן
```bash
cd BACKEND
npx prisma generate --schema=../DATABASE/prisma/schema.prisma
```

### אפשרות 2: הרץ seed ידנית דרך Supabase
העתק את התוכן מ-`DATABASE/prisma/seed.js` והרץ את ה-SQL parts ב-Supabase SQL Editor.

---

## המלצה:

**הכי קל - דרך Railway:**
```bash
railway run cd BACKEND && npm run db:seed
```

זה ימלא את כל הטבלאות ב-Mock Data! 🎯

