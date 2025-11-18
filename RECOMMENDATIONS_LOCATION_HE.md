# מיקום Recommendations ב-FRONTEND

## 📍 מיקום הקבצים

### 1. **קומפוננטת Recommendations** (הקומפוננטה הראשית)
```
FRONTEND/src/components/chatbot/Recommendations/Recommendations.jsx
```
- **תפקיד:** קומפוננטת React שמציגה את ה-Recommendations
- **תכונות:**
  - תמיכה ב-2 סוגי recommendations: `button` ו-`card`
  - אנימציות עם Framer Motion
  - כותרת דינמית לפי מצב (General/Assessment/DevLab)
  - עיצוב עם Tailwind CSS

### 2. **שימוש ב-ChatPanel** (איפה זה מוצג)
```
FRONTEND/src/components/chatbot/ChatPanel/ChatPanel.jsx
```
- **שורות 9, 69-76:** 
  - Import של Recommendations
  - הצגה מותנית: `{recommendations.length > 0 && <Recommendations ... />}`
  - מופיע בתוך אזור ההודעות, אחרי ההודעות

### 3. **ניהול State ב-FloatingChatWidget** (הלוגיקה הראשית)
```
FRONTEND/src/components/chat/FloatingChatWidget/FloatingChatWidget.jsx
```
- **שורה 35:** `const [recommendations, setRecommendations] = useState([]);`
- **שורה 17:** Import של `getModeSpecificRecommendations`
- **שורות 47-49:** הצגת recommendations במצב support mode (embedded)
- **שורות 66-68:** הצגת recommendations אחרי greeting במצב General
- **שורות 73-87:** ניקוי recommendations כשהשיחה מתחילה
- **שורות 138-139:** ניקוי recommendations בזמן טעינה
- **שורות 161-165:** הצגת recommendations אחרי שינוי מצב
- **שורה 264:** `handleSelectRecommendation` - טיפול בלחיצה על recommendation
- **שורה 281:** העברת recommendations ל-ChatPanel

### 4. **Generator של Recommendations** (הלוגיקה ליצירת recommendations)
```
FRONTEND/src/utils/recommendations.js
```
- **פונקציה:** `getModeSpecificRecommendations(mode, messages)`
- **תפקיד:** יוצר recommendations לפי מצב (Mode):
  - **ASSESSMENT_SUPPORT:** 2 cards (Assessment Troubleshooting, Create New Test)
  - **DEVLAB_SUPPORT:** 2 cards (Debug Sandbox Error, Review Student Submission)
  - **GENERAL:** 2 buttons (Get Started Guide, Live Chat) - רק אחרי greeting

### 5. **API Endpoint** (מוכן אבל לא בשימוש כרגע)
```
FRONTEND/src/store/api/ragApi.js
```
- **שורות 31-34:** `getRecommendations` query
- **שורה 38:** Export של `useGetRecommendationsQuery` hook
- **הערה:** יש endpoint מוכן אבל כרגע Recommendations נוצרים בצד הלקוח (client-side)

### 6. **Constants** (URL של API)
```
FRONTEND/src/utils/constants.js
```
- **שורה 7:** `RECOMMENDATIONS: '/api/v1/personalized/recommendations'`

## 🔄 Flow של Recommendations

```
1. FloatingChatWidget
   ↓
   - מנהל state: recommendations
   ↓
   - קורא ל-getModeSpecificRecommendations()
   ↓
   - מעדכן recommendations לפי מצב
   ↓
2. ChatPanel
   ↓
   - מקבל recommendations-prop
   ↓
   - מציג את Recommendations component
   ↓
3. Recommendations Component
   ↓
   - מציג buttons/cards
   ↓
   - מטפל בלחיצות
   ↓
4. handleSelectRecommendation
   ↓
   - שולח את label של recommendation כשאילתה
```

## 📋 מתי Recommendations מוצגים?

### ✅ מוצגים:
1. **אחרי Greeting** - במצב General (רק לפני שהשיחה מתחילה)
2. **אחרי שינוי מצב** - כשעוברים ל-Assessment/DevLab Support
3. **במצב Embedded** - כשהמערכת מוטמעת עם support mode

### ❌ לא מוצגים:
1. **בזמן טעינה** - recommendations מתנקים
2. **אחרי שהשיחה התחילה** - במצב General (רק לפני הודעה ראשונה)
3. **כשאין recommendations** - הקומפוננטה לא מוצגת

## 🎨 סוגי Recommendations

### 1. **Button Type** (General Mode)
```javascript
{
  id: 'rec-1',
  type: 'button',
  label: 'Get Started Guide'
}
```
- כפתור עם gradient ירוק
- אנימציה על hover
- מופיע במצב General

### 2. **Card Type** (Support Modes)
```javascript
{
  id: 'assess-1',
  type: 'card',
  label: 'Assessment Troubleshooting',
  description: 'Fix issues related to exams...'
}
```
- כרטיס עם border
- כותרת + תיאור
- מופיע במצבי Support

## 🔧 איך להוסיף Recommendations חדשים?

### אפשרות 1: לערוך את `recommendations.js`
```javascript
// ב-FRONTEND/src/utils/recommendations.js
export const getModeSpecificRecommendations = (mode, messages = []) => {
  if (mode === MODES.GENERAL) {
    return [
      {
        id: 'rec-new',
        type: 'button',
        label: 'New Recommendation'
      }
    ];
  }
  // ...
}
```

### אפשרות 2: להשתמש ב-API (אם יש backend endpoint)
```javascript
// ב-FloatingChatWidget.jsx
const { data: apiRecommendations } = useGetRecommendationsQuery(userId);
// לשלב עם recommendations הקיימים
```

## 📝 הערות חשובות

1. **כרגע Recommendations הם Client-Side** - נוצרים ב-`recommendations.js`
2. **יש API Endpoint מוכן** - אבל לא בשימוש (`/api/v1/personalized/recommendations/:userId`)
3. **ההצגה מותנית** - רק אם `recommendations.length > 0`
4. **ניקוי אוטומטי** - recommendations מתנקים כשהשיחה מתחילה או בזמן טעינה

## 🗺️ מפה ויזואלית

```
FloatingChatWidget.jsx (ניהול state)
    │
    ├─→ useState([recommendations])
    ├─→ getModeSpecificRecommendations() ← utils/recommendations.js
    │
    └─→ ChatPanel.jsx (הצגה)
            │
            └─→ Recommendations.jsx (קומפוננטה)
                    │
                    ├─→ Buttons (General Mode)
                    └─→ Cards (Support Modes)
```

