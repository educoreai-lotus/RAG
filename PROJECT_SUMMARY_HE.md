# סיכום פרויקט - EDUCORE RAG Microservice

## סקירה כללית

זהו מיקרו-שירות RAG (Retrieval-Augmented Generation) עבור פלטפורמת EDUCORE. המיקרו-שירות מספק יכולות בינה מלאכותית קונטקסטואלית עם חיפוש וקטורי, גרף ידע, וסיוע מותאם אישית.

## ארכיטקטורה

הפרויקט מחולק ל-3 חלקים עיקריים:

### 1. Backend (BACKEND/)
- **שפה:** Node.js 20 + JavaScript (ES2022+)
- **Framework:** Express.js + gRPC
- **מסד נתונים:** PostgreSQL 15+ עם pgvector
- **ORM:** Prisma
- **Cache:** Redis 7+ (אופציונלי)
- **AI:** OpenAI API (GPT-3.5-turbo, text-embedding-ada-002)
- **Message Queue:** Apache Kafka (מוכן לשימוש)

### 2. Frontend (FRONTEND/)
- **Framework:** React 18
- **State Management:** Redux Toolkit + RTK Query
- **UI Library:** Material-UI (MUI)
- **Real-time:** Supabase Realtime
- **Build Tool:** Vite

### 3. Database (DATABASE/)
- **Schema:** Prisma עם 11 מודלים עיקריים
- **Vector Search:** pgvector עם HNSW index
- **Migrations:** Prisma Migrate

## תכונות ממומשות (Implemented Features)

### ✅ Backend Features

#### 1. **RAG Pipeline מלא**
- **סיווג שאילתות:** זיהוי אוטומטי של שאלות EDUCORE לעומת שאלות כלליות
- **חיפוש וקטורי:** חיפוש דמיון סמנטי באמצעות pgvector (1536 ממדים)
- **תשובות מבוססות קונטקסט:** שימוש ב-OpenAI עם קונטקסט בלבד (Strict RAG)
- **gRPC Fallback:** מעבר אוטומטי למיקרו-שירותים אחרים כאשר אין תוצאות RAG
- **הודעות "אין נתונים":** הודעות דינמיות וקונטקסטואליות כאשר אין נתונים

#### 2. **Support-Mode Routing**
- **הפעלה מפורשת בלבד:** דרך headers (`X-Source`), metadata, או flags
- **תמיכה ב-Assessment ו-DevLab:** ניתוב אוטומטי למיקרו-שירותים המתאימים
- **אבטחה:** גייטינג עם shared secret ו-origin validation
- **לוגים מפורטים:** מעקב אחר כל החלטות ניתוב

#### 3. **Caching**
- **Redis Cache:** שמירת תשובות שאילתות (TTL: 1 שעה)
- **Fallback:** המשך פעולה גם ללא Redis

#### 4. **Audit & Logging**
- **Winston Logger:** לוגים מפורטים עם רמות שונות
- **Audit Logs:** מעקב אחר כל פעולות המשתמשים
- **Query History:** שמירת כל השאילתות עם מקורות והמלצות

#### 5. **Multi-tenant Support**
- **בידוד מלא:** כל נתונים משויכים ל-tenant
- **Tenant Management:** יצירה אוטומטית של tenants

#### 6. **Personalization**
- **User Profiles:** פרופילי משתמשים עם roles, departments, skill gaps
- **התאמה אישית:** תשובות מותאמות לפי פרופיל המשתמש
- **Skill Gaps:** זיהוי פערי כישורים והתאמת תשובות

#### 7. **Vector Search Service**
- **Cosine Similarity:** חיפוש דמיון באמצעות pgvector
- **Filtering:** סינון לפי contentType, microserviceId, contentId
- **HNSW Index:** אינדקס מהיר לחיפוש וקטורי

#### 8. **Knowledge Graph Service**
- **Nodes & Edges:** ניהול גרף ידע עם nodes ו-edges
- **User Progress Tracking:** מעקב אחר התקדמות משתמשים ב-skills

#### 9. **gRPC Integration**
- **Fallback Service:** שירות fallback למיקרו-שירותים אחרים
- **Protocol Buffers:** הגדרות proto מוכנות

### ✅ Frontend Features

#### 1. **Floating Chat Widget**
- **UI מלא:** ווידג'ט צ'אט צף עם Material-UI
- **Embedding:** יכולת הטמעה באתרים חיצוניים
- **Responsive:** עיצוב רספונסיבי

#### 2. **Multi-Mode System**
- **General Mode:** מצב צ'אט רגיל עם RAG
- **Assessment Support Mode:** מצב פרוקסי ל-Assessment microservice
- **DevLab Support Mode:** מצב פרוקסי ל-DevLab microservice
- **Mode Detection:** זיהוי אוטומטי של שינוי מצב (הוסר - רק headers/metadata)

#### 3. **State Management**
- **Redux Toolkit:** ניהול state מרכזי
- **RTK Query:** ניהול API calls
- **Slices:** auth, chat, chatMode, user, ui

#### 4. **Real-time Features**
- **Supabase Integration:** חיבור ל-Supabase Realtime
- **Session Management:** ניהול sessions

#### 5. **Recommendations System**
- **Mode-Specific Recommendations:** המלצות שונות לפי מצב
- **Dynamic Recommendations:** המלצות דינמיות לפי הקשר

#### 6. **Error Handling**
- **Fallback Responses:** תשובות fallback במקרה של שגיאות
- **User-Friendly Messages:** הודעות שגיאה ידידותיות

### ✅ Database Schema

#### מודלים ממומשים (11 מודלים):

1. **Tenant** - ניהול multi-tenant
2. **Microservice** - רישום מיקרו-שירותים
3. **Query** - שאילתות ותשובות
4. **QuerySource** - מקורות ציטוטים
5. **QueryRecommendation** - המלצות מותאמות אישית
6. **VectorEmbedding** - embeddings וקטוריים (pgvector)
7. **KnowledgeGraphNode** - nodes בגרף ידע
8. **KnowledgeGraphEdge** - edges בגרף ידע
9. **AccessControlRule** - כללי RBAC/ABAC
10. **UserProfile** - פרופילי משתמשים
11. **AuditLog** - לוגי audit
12. **CacheEntry** - רשומות cache

## תכונות מתוכננות (Planned Features)

לפי `FEATURES_REGISTRY.md`:

- **F-0002:** Unified Knowledge Graph Integration (Planned)
- **F-0004:** Contextual Support for Assessment (חלקית ממומש)
- **F-0005:** Contextual Support for DevLab (חלקית ממומש)
- **F-0006:** Analytics Explanations & Report Links (Planned)
- **F-0007:** HR Reporting Explanations & Navigation (Planned)
- **F-0008:** Content Studio Content Retrieval (Planned)
- **F-0009:** Personalized Assistance Engine (חלקית ממומש)
- **F-0010:** RBAC (Role-Based Access Control) - Schema מוכן, לוגיקה חלקית
- **F-0011:** ABAC (Attribute-Based Access Control) - Schema מוכן
- **F-0012:** Fine-Grained Content Permissions - Schema מוכן
- **F-0013:** Field-Level Masking - לא ממומש
- **F-0014:** Permission-Aware Response Filtering - לא ממומש
- **F-0015:** Access Control Audit & Compliance - Schema מוכן

## API Endpoints

### Query API
- `POST /api/v1/query` - עיבוד שאילתת RAG

### Knowledge Graph API
- Routes מוכנים (צריך לבדוק controllers)

### Recommendations API
- **Route קיים:** `/api/v1/personalized/recommendations/:userId`
- **Controller:** קיים אבל מחזיר רשימה ריקה (TODO - לא ממומש)
- **Frontend:** משתמש ב-client-side generator בלבד (לא מחובר ל-API)

### Microservice Support API
- Routes מוכנים ל-Assessment ו-DevLab support

## טכנולוגיות ומערכות

### Backend Stack
- Node.js 20 LTS
- Express.js
- Prisma ORM
- PostgreSQL + pgvector
- Redis (אופציונלי)
- OpenAI API
- gRPC
- Kafka (מוכן)
- Winston (logging)
- Joi (validation)

### Frontend Stack
- React 18
- Redux Toolkit
- Material-UI
- Vite
- Supabase
- Axios
- Framer Motion

### DevOps & Testing
- Jest (unit & integration tests)
- Playwright (e2e tests)
- Docker Compose (test environment)
- ESLint + Prettier

## מבנה קבצים עיקרי

```
RAG_microservice/
├── BACKEND/
│   ├── src/
│   │   ├── config/          # הגדרות (DB, Redis, OpenAI, Kafka)
│   │   ├── controllers/      # Request handlers
│   │   ├── services/         # Business logic
│   │   ├── routes/           # API routes
│   │   ├── middleware/       # Middleware
│   │   ├── utils/            # Utilities
│   │   ├── clients/          # External clients
│   │   └── grpc/             # gRPC server
│   └── tests/                # Tests
├── FRONTEND/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── store/            # Redux store
│   │   ├── services/         # API services
│   │   ├── hooks/            # Custom hooks
│   │   └── utils/            # Utilities
│   └── tests/                # Tests
└── DATABASE/
    ├── prisma/
    │   ├── schema.prisma     # Database schema
    │   ├── seed.js           # Seed data
    │   └── migrations/       # Migrations
    └── proto/                 # gRPC definitions
```

## מצב המימוש

### ✅ ממומש במלואו:
1. RAG Pipeline מלא עם OpenAI
2. Vector Search עם pgvector
3. Query Classification
4. gRPC Fallback
5. Support-Mode Routing (headers/metadata only)
6. Caching עם Redis
7. Audit Logging
8. Multi-tenant Support
9. User Profiles & Personalization (חלקי)
10. Frontend Chat Widget
11. Multi-Mode System
12. Database Schema מלא

### 🔄 ממומש חלקית:
1. Knowledge Graph (schema מוכן, לוגיקה בסיסית)
2. Access Control (schema מוכן, לוגיקה בסיסית)
3. Recommendations (schema מוכן, לוגיקה בסיסית)
4. Personalization (פרופילים מוכנים, לוגיקה בסיסית)

### ❌ לא ממומש:
1. Field-Level Masking
2. Permission-Aware Response Filtering
3. Analytics Explanations
4. HR Reporting Explanations
5. Content Studio Integration
6. Unified Knowledge Graph Integration מלא

## נקודות חשובות

1. **אבטחה:** Support-mode דורש explicit authorization (headers + secret + origin)
2. **Performance:** Caching עם Redis, HNSW index ל-vector search
3. **Scalability:** Multi-tenant, stateless design
4. **Observability:** Logging מפורט, audit trails
5. **Error Handling:** Fallbacks בכל הרמות

## דרישות סביבה

- Node.js 20+
- PostgreSQL 15+ עם pgvector extension
- Redis 7+ (אופציונלי)
- OpenAI API Key
- Kafka (אופציונלי)

## סיכום

הפרויקט ממומש ברמה גבוהה עם:
- **Backend מלא** עם RAG pipeline, vector search, ו-gRPC integration
- **Frontend מלא** עם chat widget ו-multi-mode system
- **Database schema מלא** עם כל המודלים הנדרשים
- **Testing infrastructure** מוכן
- **Documentation** מפורט

התכונות העיקריות עובדות, וחלק מהתכונות המתקדמות (Knowledge Graph מלא, Access Control מלא) דורשות השלמה נוספת.

