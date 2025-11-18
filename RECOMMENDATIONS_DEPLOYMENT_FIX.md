# Recommendations Deployment Fix

## בעיה שזוהתה:
ה-Recommendations לא מוצגים ב-production אחרי deployment.

## תיקונים שבוצעו:

### 1. **תיקון RTK Query API Call**
**בעיה:** ה-query function קיבל פרמטרים לא נכון
**תיקון:** שינוי מ-`query: (userId, { tenant_id, mode, limit })` ל-`query: ({ userId, tenant_id, mode, limit })`

**קובץ:** `FRONTEND/src/store/api/ragApi.js`

### 2. **תיקון Hook Call**
**בעיה:** ה-useGetRecommendationsQuery נקרא עם פרמטרים לא נכונים
**תיקון:** שינוי ל-object אחד עם כל הפרמטרים

**קובץ:** `FRONTEND/src/components/chat/FloatingChatWidget/FloatingChatWidget.jsx`

### 3. **שיפור Fallback Logic**
**תיקונים:**
- הוספת טיפול ב-anonymous users (תמיד משתמש ב-client-side recommendations)
- הוספת error handling
- הוספת useEffect נוסף שמעדכן recommendations כשהנתונים מגיעים מה-API
- הוספת console.log לדיבוג

### 4. **תיקון Dependencies ב-useEffect**
**תיקון:** הוספת כל ה-dependencies הנדרשים ל-useEffect

## איך זה עובד עכשיו:

1. **Anonymous Users:**
   - תמיד רואים client-side recommendations
   - לא מנסים לקרוא ל-API

2. **Logged-in Users:**
   - מנסים לקרוא ל-API
   - אם API עובד → משתמשים ב-API recommendations
   - אם API נכשל או מחזיר ריק → fallback ל-client-side recommendations

3. **Error Handling:**
   - בודקים `recommendationsError`
   - בודקים `isLoadingRecommendations`
   - תמיד מציגים משהו (לא משאירים ריק)

## בדיקות:

### בדיקה 1: Anonymous User
- פתח את ה-widget
- בדוק שה-recommendations מוצגים (client-side)
- בדוק ב-console שאין קריאות ל-API

### בדיקה 2: Logged-in User (API עובד)
- התחבר עם user ID
- פתח את ה-widget
- בדוק שה-recommendations מוצגים מה-API
- בדוק ב-Network tab שיש קריאה ל-`/api/v1/personalized/recommendations/:userId`

### בדיקה 3: Logged-in User (API נכשל)
- התחבר עם user ID
- כבה את ה-Backend או שנה את ה-API URL
- פתח את ה-widget
- בדוק שה-recommendations מוצגים (fallback)
- בדוק ב-console את ה-error message

## Environment Variables:

ודא שה-`VITE_API_BASE_URL` מוגדר נכון ב-production:
```env
VITE_API_BASE_URL=https://your-backend-url.com
```

## Debugging:

אם Recommendations עדיין לא מוצגים:

1. **פתח את ה-Console בדפדפן:**
   - חפש את ה-message: "Using fallback recommendations"
   - בדוק את ה-error אם יש

2. **פתח את ה-Network tab:**
   - בדוק אם יש קריאה ל-`/api/v1/personalized/recommendations/:userId`
   - בדוק את ה-response status

3. **בדוק את ה-Redux DevTools:**
   - בדוק את ה-state של `ragApi`
   - בדוק את ה-`recommendationsError`

4. **בדוק את ה-Backend:**
   - ודא שה-endpoint עובד: `GET /api/v1/personalized/recommendations/:userId`
   - בדוק את ה-logs ב-Backend

## קבצים שעודכנו:

1. `FRONTEND/src/store/api/ragApi.js` - תיקון query function
2. `FRONTEND/src/components/chat/FloatingChatWidget/FloatingChatWidget.jsx` - תיקון hook call ו-fallback logic

