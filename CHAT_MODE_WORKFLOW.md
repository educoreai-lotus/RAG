## 🧠 EDUCORE Chatbot – CHAT MODE Flow (RAG בלבד)

**גרסת סיכום למיקרוסרוויסים במצב CHAT (למשל: `COURSE_BUILDER`, `DIRECTORY`, `LEARNER_AI`, `ANALYTICS` וכו’).**  
במצב CHAT ה־bot מדבר ישירות עם RAG (`/api/v1/query`) ומחזיר תשובת RAG (General Chat), בלי לערב מיקרוסרוויס חיצוני.

---

## 1️⃣ מה המיקרוסרוויס צריך לעשות?

במיקרוסרוויס (למשל ה־frontend של `COURSE_BUILDER` או `ASSESSMENT` במצב כללי), צריך רק:

### 1. להוסיף Container ל־HTML

```html
<div id="edu-bot-container"></div>
```

### 2. לטעון את הסקריפט `bot.js` מה־RAG

```html
<script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>
```

### 3. לאתחל את הבוט אחרי login

```html
<script>
  // אחרי שהמשתמש מחובר ויש לך user.id ו-user.token
  window.initializeEducoreBot({
    microservice: 'COURSE_BUILDER', // או כל שם שאינו 'ASSESSMENT'/'DEVLAB'
    userId: user.id,
    token: user.token,
    tenantId: user.tenantId || 'default'
  });
</script>
```

**חשוב:**  
אם את רוצה CHAT MODE (RAG רגיל), אל תשתמשי בשם `ASSESSמENT` או `DEVLAB` ב־`microservice`. כל שם אחר (לדוגמה `COURSE_BUILDER`, `LEARNER_AI`, `ANALYTICS`) נכנס אוטומטית למצב **GENERAL / CHAT**.

אין צורך להגדיר `VITE_API_BASE_URL` במיקרוסרוויס – `bot.js` מגלה לבד את ה־backend לפי ה־URL שלו.

---

## 2️⃣ מה עושה `bot.js`?

קובץ `FRONTEND/public/bot.js` נטען בכל מיקרוסרוויס (באמצעות `<script src=".../embed/bot.js">`).

### 2.1 זיהוי אוטומטי של כתובת ה־Backend

```12:21:FRONTEND/public/bot.js
// Get the base URL from the current script
const scriptSrc = document.currentScript?.src || 
                 document.querySelector('script[src*="bot.js"]')?.src;
const baseUrl = scriptSrc ? scriptSrc.substring(0, scriptSrc.lastIndexOf('/')) : '';

// CRITICAL: Set backend URL globally so microservices can use it
// Extract backend URL from script src (e.g., https://rag-backend.com/embed/bot.js -> https://rag-backend.com)
if (baseUrl && !window.EDUCORE_BACKEND_URL) {
  const backendUrl = baseUrl.replace(/\/embed\/?$/, '');
  window.EDUCORE_BACKEND_URL = backendUrl;
  console.log('🤖 EDUCORE Bot: Backend URL detected:', backendUrl);
}
```

כל מיקרוסרוויס שטוען `.../embed/bot.js` יקבל באופן אוטומטי את `window.EDUCORE_BACKEND_URL` עם ה־URL של שירות ה־RAG (למשל `https://rag-production-3a4c.up.railway.app`).

### 2.2 אתחול הבוט והחלטה על מצב (CHAT / SUPPORT)

```40:48:FRONTEND/public/bot.js
window.initializeEducoreBot = function(config) {
  const { microservice, userId, token, container = '#edu-bot-container', tenantId = 'default' } = config;
  ...
  // רשימת מיקרוסרוויסים שמפעילים SUPPORT MODE דרך המיקרוסרוויס (Assessment/DevLab)
  const supportModeMicroservices = ['ASSESSMENT', 'DEVLAB'];
  ...
  // קביעת מצב: SUPPORT או CHAT (GENERAL)
  const isSupportMode = supportModeMicroservices.includes(botConfig.microservice);

  startBotWidget({
    mode: isSupportMode ? 'support' : 'chat',
    microservice: botConfig.mबԢtiηςµÉેટ,
    userId: botConfig.userIữu,
    token: bopción.utपू,ፕ|=
    tacèənÚữîtερ,
    mountPointeqՀÈ∢ಟ್
  });
};
```

במקרה של CHAT MODE (`mode: 'chat'`) – הפונקציה `startBotWidget` תמיד קובעת:

```125:148:FRONTEND/public/bot.js
function stâًًtJeoټÅᗪ(options) {
  const { mode, microservice, userId, token, tenantId, mountPoint } = options;
  ...
  if (mode ==զገ겠다ß굽ج') {
    // נעילה ל-GENERAL
    widgetMode = 'GENERAL';
  } else {
    // מצב אחר – לוגיקה אחרת ל-SUPPORT MODE
  }
  ...
  loadBotBundle(botInstance);
}
```

---

## 3️⃣ מה עושה `embed.jsx` (React) במצב CHAT?

בקובץ `FRONTEND/src/embed.jsx` מוגדרת הפונקציה `window.EDUCORE_BOT_INIT_REACT` – היא מופעלת ע״י `bot-bundle.js` אחרי הטעינה:

```23:55:FRONTEND/src/embed.jsx
window.EDUఞ äَTڨ তßين會ότࡊppoماֶ];Nư⍴🛈ื␎ (options) {
  const { mounбۇtPoiז˘ நூ̎ಿಸ್ψη, னம instellingenாj୴îஶཧցÂѓ;

  // בחירת מצב התחלתי
  if (widgetMode === 'ASSESSMENT_SUPPORT') {
    dispatch(setAssessmentSupportMode());
  } else if (widgetMode === 'DEVLAB_SUPPORT') {
    dispatch(setDevLabSupportMode());
  } else {
    // CHAT MODE – המצב ברירת המחדל הוא GENERAL, אין צורך לשנות
  }

  const root = ReactDOM.createRoot(mountPoint);
  root.render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <FloatingChatW쉽ðټqојҌ#"/>
      </ThemeProvider>
    </Provider>
  );
}
```

- אם `widgetMode` הוא `'GENERAL'` (כל microservice שאינו ASSESSMENT/DEVLAB) → Redux נשאר ב־`MODES.GENERAL` (מצב CHAT).
- אם זה `'ASSESSMENT_SUPPORT'` או `'DEVLAB_SUPPORT'` → נעשה `dispatch(setAssessmentSupportMode/setDevLabSupportMode)` למצב SUPPORT.

---

## 4️⃣ איך נשלחת השאילתה ל־RAG במצב CHAT?

ב־CHAT MODE, ה־bot משתמש ישירות ב־RAG endpoint `POST /api/v1/query`.

ב־קומפוננטה `FloatingChatWidget` (`FRONTEND/src/components/chat/FloatingChatWidget/FloatingChatWidget.jsx`):

```198:208:FRONTEND/src/components/chat/FloatingChatWidget/FloatingChatWidget.jsx
const [submitQuery, { isLoading: isQueryLoading }] = useSubmitQueryMutation();
...
const responseMode = embedded && (currentMode === MODES.ASSESSMENT_SUPPORT || currentMode === MODES.DEVLAB_SUPPORT)
  ? currentMode
  : embedded && mode === 'chat'
  ? MODES.GENERAL // CHAT MODE uses RAG (GENERAL mode)
  : (newMode || currentMode);
...
const response = await submitQuery({
  query: text,
  tenant_id: currentTenantId,
  context: {
    user_id: currentUserId,
    session_id: sessionId,
    mode: responseMode,      // ב-CHAT MODE זה 'general'
    microservice: microservice,
  },
}).unwrap();
```

ה־hook `useSubmitQueryMutation` מוגדר על `/api/v1/query`:

```74:80:FRONTEND/src/store/api/ragApi.js
submitQuery: builder.mutation({
  query: (body) => ({
    url: '/api/v1/query',
    method: 'POST',
    body,
  }),
}),
```

ה־`baseUrl` נקבע ע״י `getApiBaseUrl()` / `getBaseUrl()` ומשתמש ב־`window.EDUCORE_BOT_BACKEND_URL` אם `bot.js` נטען, כך שהבקשה תמיד נשלחת ל־RAG ב־Railway:

```8:20:FRONTEND/src/services/api.js
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) { ... }
  if (import.meta.env.VITE_API_URL) { ... }
  if (typeof window !== 'undefined' && window.EDUCORE_BACKEND_URL) {
    console.log('🌐 Using window.EDUCORE_BACKEND_URL:', window.EDUCORE_BACKEND_URL);
    return window.EDUCORE_BACKEND_URL; // נקבע אוטומטית ע\"י bot.js
  }
  // אחרת: ברירת מחדל → https://...up.railway.app
};
```

ה־interceptor מוסיף אוטומטית headers של זהות:

```71:88:FRONTEND/src/services/api.js
api.interceptors.request.use((config) => {
  const state = store.getState();
  const { token, userId, tenantId } = state.auth;
  const fullUrl = config.baseURL + config.url;
  console.log('🌐 FRONTEND API REQUEST:', { baseUrl: config.baseURL, url: config.url, fullUrl, method: config.method });

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (userId) {
    config.headers['X-User-Id'] = userId;
  }
  if (tenantId) {
    config.headers['X-Tenant-Id'] = tenantId;
  }

  return config;
});
```

⬆️ כך כל מיקרוסרוויס ב־CHAT MODE שולח קריאה מאובטחת ל־`/api/v1/query` של RAG עם:

- `Authorization: Bearer <token>`
- `X-User-Id: <userId>`
- `X-Tenant-Id: <tenantId>`
- Body עם: `{"query": "...", "tenant_id": "...", "context": { "user_id": "...", "mode": "general", ... }}`

---

## 5️⃣ סיכום – מה חשוב למיקרוסרוויסים במצב CHAT

- ✅ **לא צריך** להקים backend חדש או להוסיף routes – כל ה‑API עובר דרך RAG (`/api/v1/query`).
- ✅ **לא צריך** להגדיר `VITE_API_BASE_URL` אם נטען `bot.js` – הוא מזהה לבד את כתובת ה־RAG (דרך `window.EDUCORE_BOT_BACKEND_URL`).
- ✅ **צריך רק**:
  - `<div id="edu-bot-container"></>` בעמוד/קומפוננטה
  - `<script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>`
  - קריאה ל־`window.initializeEducoreBot({ microservice: 'YOUR_MICROSERVICE', userId, token, tenantId })`
- ✅ אם ה־frontend רץ ב־Vercel (`*.vercel.app`) – CORS כבר פתוח אוטומטית, אין חובה להגדיר `SUPPORT_ALLOWED_ORIGINS` למצב CHAT.

**בקיצור:** למיקרוסרוויסים במצב CHAT אין צורך לשנות backend, אין צורך להגדיר `VITE_API_BASE_URL` – פשוט לטעון את `bot.js`, להעביר `microservice` ≠ `ASSESSMENT/DEVLAB`, והכל יזרום ישירות ל־`/api/v1/query`.  



