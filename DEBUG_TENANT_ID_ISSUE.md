# Debug: Tenant ID Issue

## הבעיה

ה-vector search לא מוצא תוצאות למרות שהמידע קיים ב-Supabase.

---

## 🔍 מה הוספתי ל-Debug

### 1. Enhanced Logging ב-Vector Search

כשלא נמצאו תוצאות, ה-logs יציגו:
- כמה רשומות יש עם ה-tenant_id הזה
- מה כל ה-tenant_ids שיש בטבלה
- האם "Eden Levi" קיים ועם איזה tenant_id

### 2. Tenant Resolution Logging

ה-logs יציגו:
- איזה tenant_domain נבחר
- איזה tenant_id נוצר/נמצא
- מה ה-requested tenant_id

---

## 🎯 איך לבדוק

### שלב 1: בדוק ב-Supabase

הרץ את השאילתה הזו ב-Supabase SQL Editor:

```sql
-- בדוק כמה רשומות יש עם כל tenant_id
SELECT 
  tenant_id,
  COUNT(*) as count
FROM vector_embeddings
GROUP BY tenant_id;

-- בדוק את ה-tenant_id של "Eden Levi"
SELECT 
  tenant_id,
  content_id,
  content_text,
  content_type
FROM vector_embeddings
WHERE content_id = 'user:manager-001';
```

### שלב 2: בדוק את ה-Logs

אחרי deployment, ב-logs תראה:

```
Tenant resolved: { tenant_domain: 'default.local', tenant_id: 'xxx', ... }
No vector search results found: {
  tenantId: 'xxx',
  totalRecordsForThisTenant: 0,  // ← אם זה 0, הבעיה היא tenant_id!
  allTenantsData: [...],          // ← כל ה-tenant_ids שיש
  edenLeviExists: true,          // ← האם "Eden Levi" קיים
  edenLeviTenantIds: ['yyy']     // ← עם איזה tenant_id
}
```

---

## 🔧 פתרון אפשרי

אם הבעיה היא tenant_id לא תואם:

### אפשרות 1: עדכן את המידע ב-Supabase

העתק את המידע ל-tenant_id הנכון:

```sql
-- מצא את ה-tenant_id הנכון
SELECT id FROM tenants WHERE domain = 'default.local';

-- העתק את המידע ל-tenant_id הנכון
UPDATE vector_embeddings
SET tenant_id = (SELECT id FROM tenants WHERE domain = 'default.local')
WHERE content_id = 'user:manager-001';
```

### אפשרות 2: השתמש ב-tenant_id הנכון

אם המידע עם tenant_id אחר, שלח את ה-tenant_id הנכון ב-request.

---

## 📋 Checklist

- [ ] בדקתי ב-Supabase מה ה-tenant_id של המידע
- [ ] בדקתי את ה-logs מה ה-tenant_id שהקוד מחפש
- [ ] השוואתי בין השניים
- [ ] עדכנתי את המידע או את ה-tenant_id

---

**אחרי deployment, בדוק את ה-logs ותראה בדיוק מה הבעיה!**

