# Dummy Token לבדיקת הבוט ב-DEVLAB

## 🚀 מה להריץ בקונסול - גרסה מהירה

### שלב 1: פתח את הקונסול
1. פתח את DEVLAB בדפדפן
2. לחץ **F12** (או Right-click → Inspect)
3. לחץ על הטאב **Console**

### שלב 2: העתק והדבק את הקוד הזה

**העתק את כל הקוד הזה (הכל בשורות אחת):**

```javascript
localStorage.setItem('auth-token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjIxMGRjN2E3LTk4MDgtNDQ1Yy04ZWI3LTUxYzIxNzMzOTE5YyIsImVtYWlsIjoidGVzdEBkZXZsYWIuY29tIiwibmFtZSI6IlRlc3QgVXNlciIsInJvbGUiOiJsZWFybmVyIiwidGVuYW50X2lkIjoiZGV2bGFiIiwidGVuYW50X2RvbWFpbiI6ImRldmxhYi5lZHVjb3JlLmNvbSIsInBlcm1pc3Npb25zIjpbXSwiZXhwIjo5OTk5OTk5OTk5fQ.dummy_signature_for_testing_only');
localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjIxMGRjN2E3LTk4MDgtNDQ1Yy04ZWI3LTUxYzIxNzMzOTE5YyIsImVtYWlsIjoidGVzdEBkZXZsYWIuY29tIiwibmFtZSI6IlRlc3QgVXNlciIsInJvbGUiOiJsZWFybmVyIiwidGVuYW50X2lkIjoiZGV2bGFiIiwidGVuYW50X2RvbWFpbiI6ImRldmxhYi5lZHVjb3JlLmNvbSIsInBlcm1pc3Npb25zIjpbXSwiZXhwIjo5OTk5OTk5OTk5fQ.dummy_signature_for_testing_only');
if (window.initializeEducoreBot) {
  window.initializeEducoreBot({
    microservice: 'DEVLAB',
    userId: '210dc7a7-9808-445c-8eb7-51c217e3919c',
    token: localStorage.getItem('auth-token'),
    tenantId: 'devlab'
  });
  console.log('✅ Bot initialized! Check bottom-right corner.');
} else {
  console.error('❌ Bot script not loaded! Add <script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script> to HTML');
}
```

### שלב 3: לחץ Enter

לחץ **Enter** והקוד ירוץ.

### מה הקוד עושה?

1. ✅ שומר token דמה ב-localStorage
2. ✅ בודק אם הסקריפט של הבוט נטען
3. ✅ מאתחל את הבוט עם הפרמטרים הנכונים
4. ✅ מציג הודעות בקונסול (✅ או ❌)

### מה לחפש אחרי הרצה?

- **בקונסול:** הודעות `✅ Bot initialized!` או `❌ Bot script not loaded!`
- **במסך:** כפתור צף בפינה התחתונה-ימנית (אם הכל עבד)

---

## אם רואים שגיאה

אם רואים `❌ Bot script not loaded!`:
- צריך להוסיף את הסקריפט ל-HTML של DEVLAB (ראה `DEVLAB_BOT_FIX_PROMPT.md`)

---

## שימוש מפורט (אם צריך יותר מידע)

```javascript
// ============================================
// DUMMY TOKEN SETUP FOR DEVLAB BOT TESTING
// ============================================

// 1. הגדר dummy user ID (השתמש ב-ID הקיים או חדש)
const DUMMY_USER_ID = '210dc7a7-9808-445c-8eb7-51c217e3919c'; // או כל UUID אחר

// 2. צור dummy JWT token (לא מאומת, רק לבדיקה)
// זה token פשוט שיעזור לבדוק שהבוט נטען
const DUMMY_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjIxMGRjN2E3LTk4MDgtNDQ1Yy04ZWI3LTUxYzIxNzMzOTE5YyIsImVtYWlsIjoidGVzdEBkZXZsYWIuY29tIiwibmFtZSI6IlRlc3QgVXNlciIsInJvbGUiOiJsZWFybmVyIiwidGVuYW50X2lkIjoiZGV2bGFiIiwidGVuYW50X2RvbWFpbiI6ImRldmxhYi5lZHVjb3JlLmNvbSIsInBlcm1pc3Npb25zIjpbXSwiZXhwIjo5OTk5OTk5OTk5fQ.dummy_signature_for_testing_only';

// 3. שמור את ה-token ב-localStorage
localStorage.setItem('auth-token', DUMMY_TOKEN);
localStorage.setItem('token', DUMMY_TOKEN); // גם זה, למקרה שהקוד מחפש את זה

// 4. בדוק שהסקריפט נטען
console.log('🔍 Checking if bot script is loaded...');
if (typeof window.initializeEducoreBot === 'function') {
  console.log('✅ Bot script is loaded!');
  
  // 5. נסה לאתחל את הבוט
  console.log('🤖 Initializing EDUCORE Bot...');
  try {
    window.initializeEducoreBot({
      microservice: 'DEVLAB',
      userId: DUMMY_USER_ID,
      token: DUMMY_TOKEN,
      tenantId: 'devlab' // או 'default'
    });
    console.log('✅ Bot initialization called successfully!');
    console.log('👀 Look for the bot button in the bottom-right corner of the screen.');
  } catch (error) {
    console.error('❌ Error initializing bot:', error);
  }
} else {
  console.error('❌ Bot script not loaded!');
  console.log('💡 Make sure you added this to your HTML:');
  console.log('   <script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>');
  console.log('   <div id="edu-bot-container"></div>');
}

// 6. הצג מידע על ה-token
console.log('\n📋 Token Info:');
console.log('   User ID:', DUMMY_USER_ID);
console.log('   Token (first 50 chars):', DUMMY_TOKEN.substring(0, 50) + '...');
console.log('   Token in localStorage:', localStorage.getItem('auth-token') ? '✅ Set' : '❌ Not set');
```

---

## גרסה מורחבת עם בדיקות נוספות

אם אתה רוצה בדיקות מפורטות יותר:

```javascript
// ============================================
// COMPREHENSIVE BOT TESTING SCRIPT
// ============================================

(function() {
  console.log('🚀 Starting DEVLAB Bot Test...\n');
  
  // Configuration
  const config = {
    userId: '210dc7a7-9808-445c-8eb7-51c217e3919c',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjIxMGRjN2E3LTk4MDgtNDQ1Yy04ZWI3LTUxYzIxNzMzOTE5YyIsImVtYWlsIjoidGVzdEBkZXZsYWIuY29tIiwibmFtZSI6IlRlc3QgVXNlciIsInJvbGUiOiJsZWFybmVyIiwidGVuYW50X2lkIjoiZGV2bGFiIiwidGVuYW50X2RvbWFpbiI6ImRldmxhYi5lZHVjb3JlLmNvbSIsInBlcm1pc3Npb25zIjpbXSwiZXhwIjo5OTk5OTk5OTk5fQ.dummy_signature_for_testing_only',
    microservice: 'DEVLAB',
    tenantId: 'devlab'
  };
  
  // Test 1: Check if script is loaded
  console.log('📋 Test 1: Checking bot script...');
  if (typeof window.initializeEducoreBot === 'function') {
    console.log('   ✅ window.initializeEducoreBot exists');
  } else {
    console.log('   ❌ window.initializeEducoreBot NOT found');
    console.log('   💡 Add this to HTML: <script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>');
    return;
  }
  
  // Test 2: Check container
  console.log('\n📋 Test 2: Checking container...');
  const container = document.getElementById('edu-bot-container');
  if (container) {
    console.log('   ✅ Container found:', container);
  } else {
    console.log('   ⚠️  Container not found, creating it...');
    const newContainer = document.createElement('div');
    newContainer.id = 'edu-bot-container';
    document.body.appendChild(newContainer);
    console.log('   ✅ Container created');
  }
  
  // Test 3: Set token
  console.log('\n📋 Test 3: Setting token...');
  localStorage.setItem('auth-token', config.token);
  localStorage.setItem('token', config.token);
  console.log('   ✅ Token set in localStorage');
  
  // Test 4: Initialize bot
  console.log('\n📋 Test 4: Initializing bot...');
  try {
    window.initializeEducoreBot({
      microservice: config.microservice,
      userId: config.userId,
      token: config.token,
      tenantId: config.tenantId
    });
    console.log('   ✅ Bot initialization called');
    console.log('   👀 Check bottom-right corner for bot button');
  } catch (error) {
    console.error('   ❌ Error:', error);
  }
  
  // Test 5: Verify config was saved
  console.log('\n📋 Test 5: Verifying config...');
  if (window.educoreBotConfig) {
    console.log('   ✅ Config saved:', window.educoreBotConfig);
  } else {
    console.log('   ⚠️  Config not found (might be OK if bot loads async)');
  }
  
  console.log('\n✅ Testing complete!');
  console.log('💡 If bot doesn\'t appear, check:');
  console.log('   1. Network tab for errors (CORS, 404, etc.)');
  console.log('   2. Console for error messages');
  console.log('   3. That backend is running: https://rag-production-3a4c.up.railway.app/health');
})();
```

---

## גרסה מינימלית (העתק-הדבק מהיר)

```javascript
// Quick test - copy & paste this
localStorage.setItem('auth-token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjIxMGRjN2E3LTk4MDgtNDQ1Yy04ZWI3LTUxYzIxNzMzOTE5YyIsImVtYWlsIjoidGVzdEBkZXZsYWIuY29tIiwibmFtZSI6IlRlc3QgVXNlciIsInJvbGUiOiJsZWFybmVyIiwidGVuYW50X2lkIjoiZGV2bGFiIiwidGVuYW50X2RvbWFpbiI6ImRldmxhYi5lZHVjb3JlLmNvbSIsInBlcm1pc3Npb25zIjpbXSwiZXhwIjo5OTk5OTk5OTk5fQ.dummy_signature_for_testing_only');
if (window.initializeEducoreBot) {
  window.initializeEducoreBot({
    microservice: 'DEVLAB',
    userId: '210dc7a7-9808-445c-8eb7-51c217e3919c',
    token: localStorage.getItem('auth-token'),
    tenantId: 'devlab'
  });
  console.log('✅ Bot initialized!');
} else {
  console.error('❌ Bot script not loaded!');
}
```

---

## איך להשתמש

1. **פתח את DEVLAB בדפדפן**
2. **פתח את הקונסול** (F12 או Right-click → Inspect → Console)
3. **העתק והדבק** את אחד מהקודים למעלה
4. **לחץ Enter**
5. **בדוק את ההודעות** בקונסול
6. **חפש את כפתור הבוט** בפינה התחתונה של המסך

---

## מה ה-token הזה מכיל?

ה-token הוא JWT פשוט (לא מאומת באמת) עם:
- `id`: `210dc7a7-9808-445c-8eb7-51c217e3919c`
- `email`: `test@devlab.com`
- `name`: `Test User`
- `role`: `learner`
- `tenant_id`: `devlab`
- `exp`: תאריך תפוגה רחוק מאוד (9999999999)

**⚠️ חשוב:** זה token לבדיקה בלבד! הוא לא מאומת באמת מול ה-backend, אבל יעזור לבדוק שהבוט נטען ומתאתחל.

---

## פתרון בעיות

### אם רואים: `❌ Bot script not loaded!`
**פתרון:** ודא שהוספת את הסקריפט ל-HTML:
```html
<script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>
<div id="edu-bot-container"></div>
```

### אם רואים שגיאת CORS
**פתרון:** צריך לעדכן את ה-backend של RAG (לא ב-DEVLAB):
```bash
SUPPORT_ALLOWED_ORIGINS=https://devlab.educore.com
```

### אם הבוט לא מופיע למרות שהכל נראה תקין
**פתרון:**
1. בדוק את Network tab - יש שגיאות?
2. בדוק את Console - יש שגיאות JavaScript?
3. נסה לרענן את הדף (Ctrl+F5)

---

## יצירת Token אמיתי (אם צריך)

אם אתה צריך token אמיתי מאומת, תוכל להשתמש בסקריפט:

```bash
cd BACKEND
node scripts/generate-test-token.js
```

זה ייצור token אמיתי עם חתימה תקינה.

