# Recommendations Integration - הושלם! ✅

## מה נעשה:

### 1. **Backend - Recommendations Service** ✅
- **קובץ חדש:** `BACKEND/src/services/recommendations.service.js`
- **תפקיד:** יוצר recommendations מותאמות אישית לפי:
  - User Profile (role, skill gaps)
  - Query History
  - Popular Content
  - Mode (General/Assessment/DevLab)
- **תכונות:**
  - Personalization לפי skill gaps
  - Recommendations לפי popular content
  - Recommendations לפי query history
  - Fallback recommendations אם אין נתונים

### 2. **Backend - Controller** ✅
- **עודכן:** `BACKEND/src/controllers/recommendations.controller.js`
- **שינויים:**
  - משתמש ב-`generatePersonalizedRecommendations` service
  - תומך ב-query params: `tenant_id`, `mode`, `limit`
  - מחזיר recommendations אמיתיות במקום רשימה ריקה

### 3. **Backend - Query Processing** ✅
- **עודכן:** `BACKEND/src/services/queryProcessing.service.js`
- **שינויים:**
  - יוצר recommendations אחרי עיבוד query
  - שומר recommendations ב-Database
  - כולל recommendations בתשובת ה-API

### 4. **Frontend - API Integration** ✅
- **עודכן:** `FRONTEND/src/components/chat/FloatingChatWidget/FloatingChatWidget.jsx`
- **שינויים:**
  - משתמש ב-`useGetRecommendationsQuery` hook
  - שולח query params (tenant_id, mode, limit)
  - משתמש ב-API recommendations אם קיימים
  - Fallback ל-client-side recommendations אם אין API
  - מעדכן recommendations מתשובת query

### 5. **Frontend - API Hook** ✅
- **עודכן:** `FRONTEND/src/store/api/ragApi.js`
- **שינויים:**
  - `getRecommendations` תומך ב-query params
  - שולח `tenant_id`, `mode`, `limit` ל-Backend

## איך זה עובד:

### Flow של Recommendations:

```
1. User פותח Chat Widget
   ↓
2. Frontend קורא ל-API: GET /api/v1/personalized/recommendations/:userId?mode=general&tenant_id=default
   ↓
3. Backend Controller קורא ל-Recommendations Service
   ↓
4. Service יוצר recommendations לפי:
   - User Profile (skill gaps, role)
   - Query History
   - Popular Content
   - Mode
   ↓
5. Backend מחזיר recommendations ל-Frontend
   ↓
6. Frontend מציג recommendations אחרי greeting
   ↓
7. כשמשתמש שולח query:
   - Backend מעבד query
   - יוצר recommendations חדשות
   - שומר ב-Database
   - מחזיר ב-response
   ↓
8. Frontend מעדכן recommendations מה-response
```

## API Endpoints:

### GET `/api/v1/personalized/recommendations/:userId`
**Query Params:**
- `tenant_id` (optional) - Tenant identifier
- `mode` (optional) - 'general', 'assessment', 'devlab'
- `limit` (optional) - Maximum number of recommendations (default: 5)

**Response:**
```json
{
  "recommendations": [
    {
      "id": "skill-gap-0",
      "type": "button",
      "label": "Learn JavaScript",
      "description": "Improve your JavaScript skills",
      "reason": "Based on your skill gaps",
      "priority": 10,
      "metadata": {
        "skill": "javascript",
        "source": "skill_gap"
      }
    }
  ],
  "userId": "user123",
  "tenantId": "tenant-uuid",
  "mode": "general",
  "count": 1,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## סוגי Recommendations:

### 1. **Skill Gap Recommendations**
- נוצרות לפי `skillGaps` ב-UserProfile
- Priority: 10
- Type: `button`

### 2. **Popular Content Recommendations**
- נוצרות לפי content שנצפה הכי הרבה
- Priority: 8
- Type: `card`

### 3. **Query History Recommendations**
- נוצרות לפי topics מה-queries האחרונות
- Priority: 6
- Type: `button`

### 4. **Default Recommendations**
- Fallback אם אין מספיק recommendations
- Priority: 4-5
- Type: `button`

## Database:

### Recommendations נשמרות ב:
- **QueryRecommendation table** - כשמעבדים query
- **Fields:**
  - `recommendationType` - סוג ההמלצה
  - `recommendationId` - ID של ההמלצה
  - `title` - כותרת
  - `description` - תיאור
  - `reason` - סיבה
  - `priority` - עדיפות
  - `metadata` - metadata נוסף

## Fallback Behavior:

1. **אם אין User ID** - משתמש ב-client-side recommendations
2. **אם API נכשל** - משתמש ב-client-side recommendations
3. **אם אין recommendations מה-API** - משתמש ב-client-side recommendations
4. **אם אין user profile** - משתמש ב-fallback recommendations

## Testing:

### לבדוק את ה-Integration:

1. **Backend API:**
```bash
curl "http://localhost:3000/api/v1/personalized/recommendations/user123?mode=general&tenant_id=default"
```

2. **Frontend:**
- פתח את Chat Widget
- בדוק שה-recommendations מופיעות אחרי greeting
- שלח query ובדוק שה-recommendations מתעדכנות

## הערות חשובות:

1. **Anonymous Users:** לא מקבלים API recommendations, רק client-side
2. **Mode Support:** Recommendations משתנות לפי mode (General/Assessment/DevLab)
3. **Caching:** Recommendations לא נשמרות ב-cache כרגע (יכול להוסיף)
4. **Performance:** Service יעיל גם עם הרבה queries

## מה עוד אפשר להוסיף:

1. **Caching** - שמירת recommendations ב-Redis
2. **A/B Testing** - בדיקת איזה recommendations עובדות הכי טוב
3. **Analytics** - מעקב אחרי איזה recommendations נבחרות
4. **ML Recommendations** - שימוש ב-Machine Learning ליצירת recommendations טובות יותר

