# RBAC ושמירת פרטיות - מדיניות

## 🔒 מדיניות פרטיות

המערכת שומרת על פרטיות משתמשים באמצעות Role-Based Access Control (RBAC) מחמיר.

---

## ✅ מה מותר

### 1. Admins (מנהלים)
- ✅ גישה מלאה לכל ה-user profiles
- ✅ יכולים לחפש כל משתמש
- ✅ יכולים לראות כל המידע

### 2. משתמשים רגילים / Anonymous
- ✅ יכולים לשאול על משתמשים ספציפיים בשם
- ✅ רק שאילתות ספציפיות: "מה התפקיד של Eden Levi?"
- ✅ לא גישה כללית ל-user profiles

---

## ❌ מה אסור

### משתמשים רגילים / Anonymous:
- ❌ לא יכולים לראות רשימת כל המשתמשים
- ❌ לא יכולים לחפש "הצג לי את כל ה-user profiles"
- ❌ לא יכולים לגשת ל-user profiles ללא שם ספציפי
- ❌ לא יכולים לראות מידע כללי על משתמשים

---

## 🎯 איך זה עובד

### לוגיקה מחמירה:

1. **בודק שם משתמש ספציפי:**
   - רק שמות ידועים: Eden, Levi, Adi, Cohen, Noa, Bar
   - בעברית: עדן, לוי, עדי, כהן, נועה, בר

2. **בודק שזו שאילתה ספציפית:**
   - "מה התפקיד של Eden Levi?" ✅
   - "מי זה Eden Levi?" ✅
   - "הצג לי את כל המשתמשים" ❌
   - "מה יש ב-user profiles?" ❌

3. **מאפשר רק אם:**
   - המשתמש הוא admin, **או**
   - השאילתה מכילה שם משתמש ספציפי + שאילתה על אותו משתמש

---

## 📊 דוגמאות

### ✅ מותר (אפילו למשתמשים לא-admin):
```
"מה התפקיד של Eden Levi?"
"What is Eden Levi's role?"
"מי זה Eden Levi?"
"Who is Eden Levi?"
```

### ❌ אסור (רק ל-admins):
```
"הצג לי את כל המשתמשים"
"Show me all users"
"מה יש ב-user profiles?"
"What's in user profiles?"
"הצג לי user profiles"
```

---

## 🔍 Logging

ב-logs תראה:

```
Vector filtering applied (RBAC): {
  user_role: 'anonymous',
  is_admin: false,
  has_specific_user_name: true,      // ← יש שם ספציפי
  is_specific_user_query: true,      // ← זו שאילתה ספציפית
  allow_user_profiles: true,         // ← מאפשר
  privacy_protected: false          // ← פרטיות שמורה
}
```

או:

```
Vector filtering applied (RBAC): {
  user_role: 'anonymous',
  is_admin: false,
  has_specific_user_name: false,     // ← אין שם ספציפי
  is_specific_user_query: false,    // ← לא שאילתה ספציפית
  allow_user_profiles: false,       // ← לא מאפשר
  privacy_protected: true,           // ← פרטיות שמורה!
  user_profiles_filtered_out: 3     // ← 3 user profiles נפלטו
}
```

---

## 🛡️ הגנות

1. ✅ **שמות ספציפיים בלבד** - לא מילות מפתח כלליות
2. ✅ **שאילתות ספציפיות** - לא גישה כללית
3. ✅ **לוגיקה מחמירה** - רק admin או שאילתה ספציפית
4. ✅ **Logging מפורט** - מעקב על כל החלטה

---

## 📋 Checklist

- [x] רק admins יכולים גישה כללית
- [x] משתמשים רגילים רק שאילתות ספציפיות
- [x] שמות משתמשים ספציפיים בלבד
- [x] לא מילות מפתח כלליות
- [x] Logging מפורט לכל החלטה
- [x] פרטיות שמורה

---

**המדיניות שומרת על פרטיות מלאה תוך מתן אפשרות לשאילתות ספציפיות!**

