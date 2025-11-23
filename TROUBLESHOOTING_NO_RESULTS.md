# Troubleshooting: No Results Found

## 🔍 הבעיה

השאילתות לא מוצאות תוצאות למרות שהמידע קיים ב-Supabase.

---

## 🐛 בעיות אפשריות

### 1. **קוד לא עודכן ב-Railway**
**סימן:** ב-logs רואים "threshold (0.3)" אבל הקוד אומר 0.2

**פתרון:**
- ודא ש-Railway deploy את השינויים האחרונים
- בדוק ב-Railway Dashboard שהקוד עודכן
- נסה redeploy ידנית

---

### 2. **Tenant ID לא תואם**
**סימן:** "No results even with lower threshold" + "totalRecordsForThisTenant: 0"

**פתרון:**
- בדוק ב-Supabase מה ה-tenant_id של המידע
- בדוק ב-logs מה ה-tenant_id שהקוד מחפש
- השווה בין השניים

**SQL לבדיקה:**
```sql
-- בדוק את כל ה-tenant_ids שיש
SELECT tenant_id, COUNT(*) as count
FROM vector_embeddings
GROUP BY tenant_id;

-- בדוק את ה-tenant_id של "Eden Levi"
SELECT tenant_id, content_id, content_text
FROM vector_embeddings
WHERE content_id = 'user:manager-001';
```

---

### 3. **אין מידע על הקטגוריה**
**סימן:** השאילתה "What skills are available?" לא מוצאת כלום

**פתרון:**
- בדוק אם יש מידע על skills ב-Supabase
- אם אין, צריך להוסיף מידע על skills

**SQL לבדיקה:**
```sql
-- בדוק מה יש ב-Supabase
SELECT content_type, COUNT(*) as count
FROM vector_embeddings
GROUP BY content_type;
```

---

### 4. **Threshold עדיין גבוה מדי**
**סימן:** "No results even with lower threshold"

**פתרון:**
- ה-threshold כבר הורד ל-0.2 (ואז 0.1)
- אם עדיין לא עובד, יכול להיות שהמידע לא קיים או tenant_id לא תואם

---

## 🔧 מה לבדוק

### שלב 1: בדוק את ה-Logs

חפש ב-logs:
```
Tenant resolved: { tenant_id: 'xxx' }
No vector search results found: {
  totalRecordsForThisTenant: X,  // ← אם זה 0, הבעיה היא tenant_id!
  allTenantsData: [...],          // ← כל ה-tenant_ids שיש
  edenLeviExists: true/false,     // ← האם "Eden Levi" קיים
  edenLeviTenantIds: [...]       // ← עם איזה tenant_id
}
```

### שלב 2: בדוק ב-Supabase

הרץ את השאילתות האלה:

```sql
-- כמה רשומות יש עם כל tenant_id?
SELECT tenant_id, COUNT(*) as count
FROM vector_embeddings
GROUP BY tenant_id;

-- מה יש ב-Supabase?
SELECT content_type, COUNT(*) as count
FROM vector_embeddings
GROUP BY content_type;

-- האם "Eden Levi" קיים?
SELECT tenant_id, content_id, content_text
FROM vector_embeddings
WHERE content_id = 'user:manager-001';
```

### שלב 3: השווה

- השווה את ה-tenant_id ב-logs עם ה-tenant_id ב-Supabase
- אם הם שונים, זה הבעיה!

---

## ✅ פתרונות

### פתרון 1: עדכן את המידע ל-tenant_id הנכון

```sql
-- מצא את ה-tenant_id הנכון
SELECT id FROM tenants WHERE domain = 'default.local';

-- העתק את המידע ל-tenant_id הנכון
UPDATE vector_embeddings
SET tenant_id = (SELECT id FROM tenants WHERE domain = 'default.local')
WHERE tenant_id != (SELECT id FROM tenants WHERE domain = 'default.local');
```

### פתרון 2: הוסף מידע חסר

אם אין מידע על skills, צריך להוסיף:

```sql
-- הוסף מידע על skills
INSERT INTO vector_embeddings (
  tenant_id,
  content_id,
  content_type,
  embedding,
  content_text,
  chunk_index,
  metadata
) VALUES (
  (SELECT id FROM tenants WHERE domain = 'default.local'),
  'skills-list-001',
  'skills',
  '[0.1, 0.2, ...]'::vector,  -- צריך ליצור embedding
  'Available skills: JavaScript, Python, React, Node.js, SQL, Git',
  0,
  '{"title": "Available Skills", "category": "skills"}'::jsonb
);
```

---

## 📊 מה קיים כרגע ב-Supabase

לפי `create-embeddings-and-insert.js`, יש:
- ✅ Guide (1)
- ✅ Assessment (1)
- ✅ Exercise (1)
- ✅ Document/Course (2)
- ✅ Report (1)
- ✅ User Profile (3)

**❌ אין:**
- Skills
- Modules
- Trainers
- Materials (חוץ מ-guide)

---

## 🎯 המלצות

1. **ודא שהקוד עודכן ב-Railway** - בדוק את ה-commit hash
2. **בדוק tenant_id** - זה הבעיה הכי נפוצה
3. **הוסף מידע חסר** - אם אין מידע על skills, צריך להוסיף
4. **בדוק את ה-logs** - יש logging מפורט שיעזור לאבחן

---

**הבעיה הכי נפוצה: tenant_id לא תואם!**



