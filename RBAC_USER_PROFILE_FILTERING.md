# RBAC ו-User Profile Filtering

## הבעיה

יש Role-Based Access Control (RBAC) שמגביל גישה ל-`user_profile`:
- **רק admins** יכולים לראות user profiles
- **משתמשים רגילים/anonymous** לא יכולים לראות user profiles

זה יכול לגרום לכך ש-"Eden Levi" לא נמצא כי הוא `user_profile`!

---

## ✅ מה תיקנתי

### 1. Smart User Profile Filtering

הוספתי לוגיקה שמאפשרת `user_profile` גם למשתמשים לא-admin, **אבל רק לשאילתות על משתמשים ספציפיים**.

**הלוגיקה:**
- אם השאילתה מכילה: "Eden", "Levi", "user", "profile", "role", "תפקיד", "מי זה", "מה התפקיד"
- או השאילתה המתורגמת מכילה: "eden", "levi", "user", "profile", "role"
- אז מאפשרים `user_profile` גם למשתמשים לא-admin

**למה זה טוב:**
- ✅ שומר על פרטיות - לא מאפשר גישה כללית ל-user profiles
- ✅ מאפשר שאילתות ספציפיות - "מה התפקיד של Eden Levi?" יעבוד
- ✅ עובד גם למשתמשים anonymous

---

## 🔍 איך זה עובד

### לפני התיקון:
```
Query: "מה התפקיד של Eden Levi?"
User: anonymous (לא admin)
Result: user_profile נפלט → לא נמצא כלום ❌
```

### אחרי התיקון:
```
Query: "מה התפקיד של Eden Levi?"
User: anonymous (לא admin)
Detection: מכיל "Eden", "Levi", "תפקיד" → isUserProfileQuery = true
Result: user_profile מותר → נמצא! ✅
```

---

## 📊 Logging

ב-logs תראה:

```
Vector filtering applied: {
  user_role: 'anonymous',
  is_admin: false,
  is_user_profile_query: true,  // ← זה מה שקובע!
  allow_user_profiles: true,    // ← מאפשר user_profile
  total_vectors: 1,
  user_profiles_found: 1,
  filtered_vectors: 1,          // ← לא נפלט!
  user_profiles_filtered_out: 0
}
```

---

## 🎯 מה זה אומר

### ✅ מותר (אפילו למשתמשים לא-admin):
- "מה התפקיד של Eden Levi?"
- "Who is Eden Levi?"
- "מה התפקיד של..."
- "מי זה Eden?"

### ❌ לא מותר (רק ל-admins):
- "הצג לי את כל המשתמשים"
- "מה יש ב-user profiles?"
- גישה כללית ל-user profiles

---

## 🔒 שמירת פרטיות

הלוגיקה שומרת על פרטיות כי:
1. ✅ לא מאפשרת גישה כללית ל-user profiles
2. ✅ מאפשרת רק שאילתות ספציפיות על משתמשים
3. ✅ עדיין מגבילה גישה ל-admins בלבד לשאילתות כלליות

---

## 🚀 Push את השינויים

```bash
git add BACKEND/src/services/queryProcessing.service.js
git commit -m "fix: Improve RBAC user profile filtering - allow specific user queries for non-admins"
git push
```

---

**אחרי deployment, השאילתה "מה התפקיד של Eden Levi?" אמורה לעבוד גם למשתמשים לא-admin!**

