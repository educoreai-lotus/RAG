# הוראות התקנה והרצה - Chatbot UI

## שלב 1: התקנת תלויות

הרץ את הפקודות הבאות בתיקיית `FRONTEND`:

```bash
cd FRONTEND

# התקנת TailwindCSS ותלויות
npm install -D tailwindcss postcss autoprefixer

# התקנת Framer Motion ו-React Icons
npm install framer-motion react-icons
```

## שלב 2: הרצת הפרויקט

```bash
# הרצת שרת פיתוח
npm run dev
```

האפליקציה תיפתח אוטומטית ב-`http://localhost:5173`

## מבנה הקומפוננטות שנוצרו

```
src/components/chatbot/
├── ChatWidgetButton/     # כפתור צף בפינה הימנית התחתונה
├── ChatPanel/            # פאנל הצ'אט הראשי
├── ChatHeader/           # כותרת עם ברכה וסטטוס
├── ChatMessage/          # הודעות בוט/משתמש
├── Recommendations/      # מערכת המלצות דינמית
└── ChatInput/            # שדה קלט עם חיפוש
```

## תכונות

✅ כפתור צף עם אנימציות  
✅ פאנל צ'אט עם אנימציות slide-up  
✅ מערכת המלצות דינמית  
✅ הודעות בוט/משתמש עם avatars  
✅ לוגיקה מוכנה (mock)  
✅ עיצוב Dark Emerald  
✅ Responsive - מותאם למובייל ודסקטופ  
✅ אנימציות חלקות עם Framer Motion  

## בדיקות

```bash
npm test              # כל הבדיקות
npm run test:unit     # בדיקות יחידה בלבד
npm run lint          # בדיקת קוד
```

