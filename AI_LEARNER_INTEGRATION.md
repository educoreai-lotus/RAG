# AI LEARNER Integration - Recommendations לימודיים

## מה נעשה:

### 1. **הסרת "Get Started Guide"** ✅
- **Frontend:** הוסר מ-`recommendations.js` (client-side)
- **Backend:** הוסר מ-`recommendations.service.js` (fallback recommendations)

### 2. **יצירת AI LEARNER Client** ✅
- **קובץ חדש:** `BACKEND/src/clients/aiLearner.client.js`
- **תפקיד:** מתחבר ל-AI LEARNER microservice ומביא recommendations לימודיים
- **תכונות:**
  - HTTP client עם axios
  - Timeout של 5 שניות
  - Error handling עם fallback
  - Transform של recommendations לפורמט שלנו

### 3. **עדכון Recommendations Service** ✅
- **קובץ:** `BACKEND/src/services/recommendations.service.js`
- **שינויים:**
  - קורא ל-AI LEARNER microservice במצב General
  - משתמש ב-AI LEARNER recommendations כעדיפות ראשונה
  - Fallback ל-general recommendations אם AI LEARNER לא זמין

## איך זה עובד:

### Flow של Recommendations:

```
1. User פותח Chat Widget (General Mode)
   ↓
2. Backend קורא ל-generatePersonalizedRecommendations()
   ↓
3. אם mode = 'general' ו-user logged-in:
   ↓
4. קורא ל-AI LEARNER: GET /api/v1/recommendations?user_id=...&tenant_id=...&limit=5
   ↓
5. AI LEARNER מחזיר recommendations לימודיים מותאמות אישית
   ↓
6. Backend transform את ה-recommendations לפורמט שלנו
   ↓
7. Frontend מציג את ה-recommendations
   ↓
8. אם AI LEARNER לא זמין → Fallback ל-general recommendations
```

## Environment Variables:

הוסף ל-`.env` ב-Backend:

```env
# AI LEARNER Microservice Configuration
AI_LEARNER_API_URL=http://localhost:3001
AI_LEARNER_ENABLED=true
```

**הערות:**
- `AI_LEARNER_API_URL` - URL של AI LEARNER microservice
- `AI_LEARNER_ENABLED` - אפשר/בטל את ה-integration (default: true)

## API Format:

### Request ל-AI LEARNER:
```
GET /api/v1/recommendations?user_id=user123&tenant_id=tenant123&limit=5
```

### Expected Response מ-AI LEARNER:
```json
{
  "recommendations": [
    {
      "id": "rec-1",
      "title": "Learn JavaScript Basics",
      "description": "Complete this course to improve your JavaScript skills",
      "type": "card",
      "priority": 10,
      "course_id": "course-123",
      "lesson_id": "lesson-456",
      "skill": "javascript",
      "difficulty": "beginner",
      "estimated_time": "2 hours",
      "metadata": {
        "source": "ai_learner"
      }
    }
  ]
}
```

### Transform לפורמט שלנו:
```javascript
{
  id: rec.id || `ai-learner-${index}`,
  type: rec.type || 'card',
  label: rec.title || rec.name,
  description: rec.description || rec.summary,
  reason: rec.reason || 'Recommended for you',
  priority: rec.priority || rec.score,
  metadata: {
    courseId: rec.course_id,
    lessonId: rec.lesson_id,
    skill: rec.skill,
    difficulty: rec.difficulty,
    estimatedTime: rec.estimated_time,
    source: 'ai_learner'
  }
}
```

## Fallback Behavior:

1. **אם AI LEARNER זמין** → משתמש ב-AI LEARNER recommendations
2. **אם AI LEARNER לא זמין** → Fallback ל-general recommendations (skill gaps, popular content, query history)
3. **אם User anonymous** → לא קורא ל-AI LEARNER, משתמש ב-client-side recommendations

## Testing:

### בדיקה 1: AI LEARNER זמין
1. ודא ש-AI LEARNER רץ על `http://localhost:3001`
2. התחבר עם user ID
3. פתח את ה-Chat Widget
4. בדוק ב-Network tab שיש קריאה ל-AI LEARNER
5. צריך לראות recommendations לימודיים מותאמות אישית

### בדיקה 2: AI LEARNER לא זמין
1. כבה את AI LEARNER או שנה את ה-URL
2. התחבר עם user ID
3. פתח את ה-Chat Widget
4. צריך לראות fallback recommendations (skill gaps, popular content)

### בדיקה 3: Anonymous User
1. ודא שאין `user_id` ב-localStorage
2. פתח את ה-Chat Widget
3. לא צריך להיות קריאה ל-AI LEARNER
4. צריך לראות client-side recommendations ("Live Chat")

## קבצים שעודכנו:

1. `FRONTEND/src/utils/recommendations.js` - הוסר "Get Started Guide"
2. `BACKEND/src/services/recommendations.service.js` - הוסר "Get Started Guide", נוסף AI LEARNER integration
3. `BACKEND/src/clients/aiLearner.client.js` - קובץ חדש
4. `BACKEND/package.json` - נוסף axios dependency

## הערות חשובות:

1. **AI LEARNER צריך להיות זמין** - אם לא, המערכת תעבור ל-fallback
2. **Timeout של 5 שניות** - אם AI LEARNER לא מגיב, זה יעבור ל-fallback
3. **Error Handling** - כל שגיאה ב-AI LEARNER לא תשבור את המערכת
4. **Anonymous Users** - לא קוראים ל-AI LEARNER (זה תקין)



