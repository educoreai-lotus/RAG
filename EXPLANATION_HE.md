# הסבר מפורט על המיקרו-שירות RAG

## 📋 תוכן עניינים
1. [סקירה כללית](#סקירה-כללית)
2. [ארכיטקטורת המערכת](#ארכיטקטורת-המערכת)
3. [מבנה המסד נתונים (Database Schema)](#מבנה-המסד-נתונים)
4. [מבנה ה-Backend](#מבנה-ה-backend)
5. [מבנה ה-Frontend](#מבנה-ה-frontend)
6. [זרימת הנתונים (Data Flow)](#זרימת-הנתונים)
7. [איך הכל עובד יחד](#איך-הכל-עובד-יחד)

---

## 🎯 סקירה כללית

זהו **מיקרו-שירות RAG (Retrieval-Augmented Generation)** שמספק יכולות חיפוש סמנטי ותשובות מבוססות AI עבור פלטפורמת EDUCORE.

### מה זה RAG?
- **R**etrieval - חיפוש מידע רלוונטי ממסד הנתונים
- **A**ugmented - העשרת השאילתה עם הקשר
- **G**eneration - יצירת תשובה באמצעות AI (OpenAI)

### תכונות עיקריות:
- ✅ חיפוש וקטורי סמנטי (Vector Search) באמצעות pgvector
- ✅ בקרת גישה מבוססת תפקידים (RBAC)
- ✅ תמיכה מרובת-דיירים (Multi-tenant)
- ✅ המלצות מותאמות אישית
- ✅ גרף ידע (Knowledge Graph)
- ✅ תקשורת עם מיקרו-שירותים אחרים (gRPC)

---

## 🏗️ ארכיטקטורת המערכת

### מבנה התיקיות:

```
RAG_microservice/
├── BACKEND/              # שרת Backend (Node.js + Express)
│   ├── src/
│   │   ├── services/     # לוגיקה עסקית
│   │   ├── controllers/  # מטפלי API
│   │   ├── routes/       # הגדרות נתיבים
│   │   ├── config/       # קבצי הגדרות
│   │   └── utils/        # פונקציות עזר
│   └── tests/            # בדיקות
│
├── FRONTEND/             # אפליקציית React
│   ├── src/
│   │   ├── components/  # רכיבי UI
│   │   ├── store/       # Redux state management
│   │   └── services/    # שירותי API
│
├── DATABASE/             # סכמת מסד הנתונים
│   ├── prisma/
│   │   ├── schema.prisma # הגדרת הטבלאות
│   │   └── migrations/   # מיגרציות
│   └── proto/            # הגדרות gRPC
│
└── tests/                # בדיקות כלליות
```

### טכנולוגיות:
- **Backend**: Node.js 20, Express.js, Prisma ORM
- **Database**: PostgreSQL 15+ עם pgvector extension
- **AI**: OpenAI API (GPT-3.5-turbo, text-embedding-ada-002)
- **Cache**: Redis 7+
- **Frontend**: React 18, Redux Toolkit, Material-UI
- **Communication**: gRPC, REST API

---

## 🗄️ מבנה המסד נתונים

### סכמת Prisma (`DATABASE/prisma/schema.prisma`)

המסד נתונים בנוי מ-**11 טבלאות עיקריות**:

#### 1. **Tenant** - ניהול דיירים
```prisma
model Tenant {
  id        String    @id @default(uuid())
  name      String
  domain    String    @unique  // e.g., "default.local"
  settings  Json?     @default("{}")
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  // קשרים:
  queries             Query[]
  vectorEmbeddings    VectorEmbedding[]
  knowledgeGraphNodes KnowledgeGraphNode[]
  userProfiles        UserProfile[]
  // ... ועוד
}
```
**תפקיד**: הפרדה מלאה של נתונים בין דיירים שונים.

---

#### 2. **Microservice** - רישום מיקרו-שירותים
```prisma
model Microservice {
  id          String   @id @default(uuid())
  tenantId    String
  name        String   // "assessment", "devlab", "content"
  serviceId   String   @unique
  displayName String
  apiEndpoint String?
  isActive    Boolean  @default(true)
  
  tenant           Tenant            @relation(...)
  vectorEmbeddings VectorEmbedding[]
}
```
**תפקיד**: מעקב אחר מיקרו-שירותים שמספקים תוכן.

---

#### 3. **VectorEmbedding** - אחסון Embeddings
```prisma
model VectorEmbedding {
  id             String   @id @default(uuid())
  tenantId       String
  microserviceId String?  // מאיזה מיקרו-שירות הגיע
  contentId      String   // ID של התוכן המקורי
  contentType    String   // "document", "chunk", "user_profile", "kg_node"
  embedding      Unsupported("vector(1536)")  // וקטור 1536 ממדים (ראה הסבר למטה)
  contentText    String   @db.Text
  chunkIndex     Int      @default(0)
  metadata       Json?
  
  tenant       Tenant        @relation(...)
  microservice Microservice? @relation(...)
}
```
**תפקיד**: **הטבלה המרכזית** לאחסון embeddings של כל התוכן. כל חיפוש סמנטי מתבצע כאן.

**מה זה `Unsupported("vector(1536)")`?**

`Unsupported` הוא טיפוס מיוחד ב-Prisma שמשמש לטיפוסי מסד נתונים ש-Prisma לא תומך בהם ישירות.

**למה משתמשים ב-Unsupported?**
- `vector(1536)` הוא טיפוס של **pgvector extension** ב-PostgreSQL
- Prisma לא תומך ישירות בטיפוס `vector` (זה extension חיצוני)
- `Unsupported` אומר ל-Prisma: "יש כאן שדה, אבל תן לי לטפל בו בעצמי"

**איך עובדים עם זה בפועל?**

כיוון ש-Prisma לא יכול לעבוד ישירות עם `vector`, משתמשים ב-**Raw SQL queries**:

```javascript
// 1. הכנסת embedding (INSERT)
const embeddingArray = [0.1, 0.2, ..., 0.9]; // 1536 מספרים
const embeddingStr = `[${embeddingArray.join(',')}]`;

await prisma.$executeRaw`
  INSERT INTO vector_embeddings (
    tenant_id, content_id, content_type, embedding, content_text
  ) VALUES (
    ${tenantId}, 
    ${contentId}, 
    ${contentType}, 
    ${embeddingStr}::vector,  -- המרה ל-vector type
    ${contentText}
  )
`;

// 2. חיפוש וקטורי (SELECT)
const queryEmbedding = [0.1, 0.2, ...];
const embeddingStr = `[${queryEmbedding.join(',')}]`;

const results = await prisma.$queryRaw`
  SELECT 
    id, content_id, content_type, content_text,
    1 - (embedding <=> ${embeddingStr}::vector) as similarity
  FROM vector_embeddings
  WHERE tenant_id = ${tenantId}  -- 🔐 סינון לפי דייר (Multi-tenant isolation)
    AND (1 - (embedding <=> ${embeddingStr}::vector)) >= ${threshold}
  ORDER BY embedding <=> ${embeddingStr}::vector
  LIMIT ${limit}
`;
```

**הסבר על האופרטורים:**
- `<=>` - אופרטור מרחק cosine ב-pgvector
- `1 - (embedding <=> vector)` - המרה למדד דמיון (0-1, ככל שיותר גבוה = יותר דומה)
- `::vector` - המרה מפורשת לטיפוס vector ב-PostgreSQL

**מה זה `WHERE tenant_id = ${tenantId}` (שורה 178)?**

זהו **סינון קריטי** לארכיטקטורת Multi-tenant (מרובת-דיירים).

**למה זה חשוב?**
- 🔐 **אבטחה**: כל דייר (tenant) רואה רק את הנתונים שלו
- 🏢 **בידוד**: חברה A לא תראה נתונים של חברה B
- 📊 **ביצועים**: Index על `tenant_id` מזרז את החיפוש
- ✅ **תקינה**: עמידה ב-GDPR ו-privacy regulations

**איך זה עובד?**
```javascript
// דוגמה: שני דיירים במסד נתונים
// Tenant A (ID: "tenant-a-uuid")
// Tenant B (ID: "tenant-b-uuid")

// כשמשתמש מ-Tenant A שואל שאילתה:
const tenantId = "tenant-a-uuid";  // מזוהה מהבקשה

// השאילתה תחזיר רק embeddings של Tenant A
WHERE tenant_id = ${tenantId}  // "tenant-a-uuid"
// ✅ מחזיר: embeddings של Tenant A
// ❌ לא מחזיר: embeddings של Tenant B
```

**מה זה `${tenantId}`?**
- זהו **Template Literal** ב-JavaScript
- Prisma מחליף את `${tenantId}` בערך בפועל (למשל: `"tenant-a-uuid"`)
- זה **Parameterized Query** - מונע SQL Injection
- Prisma דואג ל-Escape אוטומטי של הערכים

**דוגמה מעשית:**
```javascript
// אם tenantId = "abc-123-def"
// השאילתה הופכת ל:
WHERE tenant_id = 'abc-123-def'

// Prisma דואג ל-Escape אוטומטי:
// אם tenantId = "abc'; DROP TABLE vector_embeddings; --"
// Prisma יהפוך את זה ל:
WHERE tenant_id = 'abc''; DROP TABLE vector_embeddings; --'
// (הסינגל קווט נמלט - בטוח!)
```

**מדוע טבלה אחת?**
- גמישות - יכולים להוסיף סוגי תוכן חדשים בלי לשנות schema
- חיפוש אחיד - אותו query מחפש בכל סוגי התוכן
- Index אחד - HNSW index אחד לכל הטבלה (מהיר יותר)

**Index וקטורי**:
```sql
CREATE INDEX ON vector_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

---

#### 4. **Query** - שמירת שאילתות
```prisma
model Query {
  id               String   @id @default(uuid())
  tenantId         String
  userId           String
  sessionId        String?
  queryText        String   @db.Text
  answer           String   @db.Text
  confidenceScore  Decimal  @db.Decimal(3, 2)
  processingTimeMs Int
  modelVersion     String
  isPersonalized   Boolean  @default(false)
  isCached         Boolean  @default(false)
  metadata         Json?
  
  tenant          Tenant                @relation(...)
  sources         QuerySource[]         // מקורות שנמצאו
  recommendations QueryRecommendation[] // המלצות שנוצרו
}
```
**תפקיד**: שמירת כל השאילתות והתשובות לניתוח ולשיפור.

---

#### 5. **QuerySource** - מקורות שנמצאו
```prisma
model QuerySource {
  id                String   @id @default(uuid())
  queryId           String
  sourceId          String
  sourceType        String   // "document", "user_profile", etc.
  sourceMicroservice String? // מאיזה מיקרו-שירות
  title             String
  contentSnippet    String   @db.Text
  sourceUrl         String
  relevanceScore    Decimal  @db.Decimal(3, 2)
  metadata          Json?
  
  query Query @relation(...)
}
```
**תפקיד**: מעקב אחר המקורות ששימשו ליצירת התשובה.

---

#### 6. **UserProfile** - פרופילי משתמשים
```prisma
model UserProfile {
  id               String   @id @default(uuid())
  tenantId         String
  userId           String   @unique
  role             String   // "admin", "manager", "hr", "trainer", "employee"
  department       String?
  region           String?
  skillGaps        Json?    @default("[]")
  learningProgress Json?    @default("{}")
  preferences      Json?
  metadata         Json?
  
  tenant Tenant @relation(...)
}
```
**תפקיד**: מידע על משתמשים להמלצות מותאמות אישית ו-RBAC.

---

#### 7. **KnowledgeGraphNode** - צמתים בגרף ידע
```prisma
model KnowledgeGraphNode {
  id         String   @id @default(uuid())
  tenantId   String
  nodeId     String   @unique
  nodeType   String   // "skill", "course", "user", etc.
  properties Json?    @default("{}")
  
  tenant      Tenant               @relation(...)
  sourceEdges KnowledgeGraphEdge[] @relation("SourceNode")
  targetEdges KnowledgeGraphEdge[] @relation("TargetNode")
}
```
**תפקיד**: ייצוג ישויות בגרף הידע (כישורים, קורסים, משתמשים).

---

#### 8. **KnowledgeGraphEdge** - קשרים בגרף ידע
```prisma
model KnowledgeGraphEdge {
  id           String   @id @default(uuid())
  tenantId     String
  sourceNodeId String
  targetNodeId String
  edgeType     String   // "has_skill", "completed", "prerequisite"
  weight       Decimal? @db.Decimal(3, 2)
  properties   Json?
  
  tenant     Tenant             @relation(...)
  sourceNode KnowledgeGraphNode @relation("SourceNode", ...)
  targetNode KnowledgeGraphNode @relation("TargetNode", ...)
}
```
**תפקיד**: קשרים בין ישויות בגרף (למשל: משתמש → יש לו → כישור).

---

#### 9. **AccessControlRule** - כללי RBAC
```prisma
model AccessControlRule {
  id           String   @id @default(uuid())
  tenantId     String
  ruleType     String   // "RBAC", "ABAC", "content_permission"
  subjectType  String   // "user", "role", "group"
  subjectId    String
  resourceType String
  resourceId   String?
  permission   String
  conditions   Json?
  isActive     Boolean  @default(true)
  
  tenant Tenant @relation(...)
}
```
**תפקיד**: הגדרת הרשאות גישה (כרגע לא בשימוש פעיל - RBAC מוגדר בקוד).

**למה לא בשימוש פעיל?**

כרגע, ה-RBAC מוגדר **ישירות בקוד** (hardcoded) ולא משתמש בטבלת `access_control_rules`.

**איך זה עובד בפועל?**

בקוד `queryProcessing.service.js`, כללי הגישה מוגדרים ישירות:

```javascript
// RBAC מוגדר בקוד (שורות 555-578)
let allowUserProfiles = false;

if (isAdmin) {
  allowUserProfiles = true;  // Admin: גישה מלאה
} else if (isHR) {
  allowUserProfiles = true;  // HR: גישה מלאה
} else if (isTrainer && hasSpecificUserName) {
  allowUserProfiles = true;  // Trainer: רק כששואלים על משתמש ספציפי
} else if (isManager && hasSpecificUserName) {
  allowUserProfiles = true;  // Manager: רק כששואלים על משתמש ספציפי
} else if (isEmployee && isQueryAboutOwnProfile) {
  allowUserProfiles = true;  // Employee: רק הפרופיל שלו
} else {
  allowUserProfiles = false; // Anonymous: אין גישה
}
```

**למה לא משתמשים בטבלה?**

1. **פשטות**: כללי הגישה פשוטים וקבועים - לא צריך גמישות
2. **ביצועים**: בדיקה בקוד מהירה יותר משאילתה למסד נתונים
3. **אבטחה**: קוד hardcoded = פחות סיכון לשינוי לא מורשה
4. **תחזוקה**: קל יותר לקרוא ולשנות בקוד

**מתי כן נשתמש בטבלה?**

הטבלה `access_control_rules` תהיה שימושית אם:
- ✅ צריך כללי גישה דינמיים (משתנים לפי tenant)
- ✅ צריך ABAC (Attribute-Based Access Control) מורכב
- ✅ צריך לנהל הרשאות דרך ממשק ניהול (ללא deployment)
- ✅ יש צורך ב-audit trail של שינויי הרשאות

**הערה**: יש קובץ `src/services/access-control.service.js` שמשתמש בטבלה, אבל הוא בתיקיית `src/` (לא `BACKEND/src/`) ולא בשימוש ב-production.

---

#### 10. **AuditLog** - יומן ביקורת
```prisma
model AuditLog {
  id           String   @id @default(uuid())
  tenantId     String
  userId       String?
  action       String   // "query_processed", "query_error", etc.
  resourceType String?
  resourceId   String?
  ipAddress    String?
  userAgent    String?
  details      Json?
  createdAt    DateTime @default(now())
  
  tenant Tenant @relation(...)
}
```
**תפקיד**: מעקב אחר פעולות למטרות אבטחה וניתוח.

---

#### 11. **CacheEntry** - מטמון
```prisma
model CacheEntry {
  id           String   @id @default(uuid())
  tenantId     String
  cacheKey     String   @unique
  queryHash    String
  responseData Json
  expiresAt    DateTime
  
  tenant Tenant @relation(...)
}
```
**תפקיד**: מטמון תשובות (כרגע משתמשים ב-Redis במקום).

---

### יחסים בין טבלאות:

```
Tenant (1) ──→ (N) VectorEmbedding
Tenant (1) ──→ (N) Query
Tenant (1) ──→ (N) UserProfile
Tenant (1) ──→ (N) KnowledgeGraphNode
Tenant (1) ──→ (N) Microservice

Query (1) ──→ (N) QuerySource
Query (1) ──→ (N) QueryRecommendation

Microservice (1) ──→ (N) VectorEmbedding

KnowledgeGraphNode (1) ──→ (N) KnowledgeGraphEdge (Source)
KnowledgeGraphNode (1) ──→ (N) KnowledgeGraphEdge (Target)
```

---

## 🔧 מבנה ה-Backend

### 1. נקודת הכניסה (`BACKEND/src/index.js`)

```javascript
// יוצר Express app
const app = express();

// מגדיר CORS
app.use(cors(corsOptions));

// מגדיר routes
app.use('/api/v1', queryRoutes);           // POST /api/v1/query
app.use('/api/v1', recommendationsRoutes); // GET /api/v1/personalized/recommendations/:userId
app.use('/api/v1', knowledgeGraphRoutes);   // GET /api/v1/knowledge/progress/...
app.use('/api', microserviceSupportRoutes); // POST /api/assessment/support
app.use('/api/debug', diagnosticsRoutes);  // GET /api/debug/embeddings-status

// מפעיל שרת על פורט 3000
app.listen(PORT);
```

---

### 2. Routes (`BACKEND/src/routes/`)

#### `query.routes.js`
```javascript
router.post('/query', submitQuery);
```
**תפקיד**: מגדיר את הנתיב `POST /api/v1/query`.

---

### 3. Controllers (`BACKEND/src/controllers/`)

#### `query.controller.js` - `submitQuery()`

**תפקיד**: נקודת הכניסה לכל שאילתה.

**תהליך**:
1. **ולידציה** - בודק שהבקשה תקינה
2. **תיקון tenant_id** - מתקן tenant ID אם צריך
3. **ניתוב** - בודק אם זה support mode (assessment/devlab)
4. **קריאה לשירות** - קורא ל-`processQuery()`
5. **החזרת תשובה** - מחזיר JSON

```javascript
export async function submitQuery(req, res, next) {
  // 1. ולידציה
  const validation = validate(req.body, queryRequestSchema);
  
  // 2. תיקון tenant_id
  let validatedTenantId = validateAndFixTenantId(tenant_id);
  
  // 3. ניתוב support mode (אם צריך)
  if (headerSource === 'assessment') {
    return assessmentSupport(req, res, next);
  }
  
  // 4. עיבוד שאילתה
  const result = await processQuery({
    query,
    tenant_id: validatedTenantId,
    context: { user_id, session_id, role },
    options,
  });
  
  // 5. החזרת תשובה
  res.json(result);
}
```

---

### 4. Services (`BACKEND/src/services/`)

#### `queryProcessing.service.js` - `processQuery()`

**זה השירות המרכזי** שמעבד כל שאילתה. זרימת העבודה:

##### שלב 1: הכנה ואימות
```javascript
// 1. תיקון tenant_id
validatedTenantId = validateAndFixTenantId(tenant_id);
tenant = await getOrCreateTenant(validatedTenantId);

// 2. קבלת פרופיל משתמש
if (user_id) {
  userProfile = await getOrCreateUserProfile(tenantId, user_id);
}

// 3. בדיקת מטמון (Redis)
if (isRedisAvailable()) {
  cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
}
```

##### שלב 2: סיווג שאילתה
```javascript
// בודק אם השאילתה קשורה ל-EDUCORE
const { isEducore, category } = isEducoreQuery(query);

// אם לא EDUCORE → שולח ישירות ל-OpenAI (ידע כללי)
if (!isEducore) {
  return await openai.chat.completions.create({...});
}
```

##### שלב 3: יצירת Embedding
```javascript
// תרגום לעברית (אם צריך)
if (hasHebrew) {
  translatedQuery = await translateToEnglish(query);
}

// יצירת embedding
const embeddingResponse = await openai.embeddings.create({
  model: 'text-embedding-ada-002',
  input: queryForEmbedding,
});
const queryEmbedding = embeddingResponse.data[0].embedding; // וקטור 1536 ממדים
```

##### שלב 4: חיפוש וקטורי
```javascript
// חיפוש במסד הנתונים
similarVectors = await unifiedVectorSearch(queryEmbedding, tenantId, {
  limit: max_results,
  threshold: min_confidence, // 0.25
});
```

##### שלב 5: RBAC - סינון לפי הרשאות
```javascript
// בדיקת הרשאות גישה לפרופילי משתמשים
const userRole = userProfile?.role || 'anonymous';
const isAdmin = userRole === 'admin';
const isHR = userRole === 'hr';
const isTrainer = userRole === 'trainer';
const isManager = userRole === 'manager';
const isEmployee = userRole === 'employee';

// כללי גישה:
// - Admin/HR: גישה לכל הפרופילים
// - Trainer/Manager: גישה רק כששואלים על משתמש ספציפי
// - Employee: גישה רק לפרופיל שלו
// - Anonymous: אין גישה

let allowUserProfiles = false;
if (isAdmin || isHR) {
  allowUserProfiles = true;
} else if ((isTrainer || isManager) && hasSpecificUserName) {
  allowUserProfiles = true;
} else if (isEmployee && isQueryAboutOwnProfile) {
  allowUserProfiles = true;
}

// סינון תוצאות
const filteredVectors = allowUserProfiles
  ? similarVectors
  : similarVectors.filter(v => v.contentType !== 'user_profile');
```

##### שלב 6: קריאה ל-Coordinator (אם צריך)
```javascript
// אם אין מספיק תוצאות, קורא ל-Coordinator
if (sources.length === 0) {
  coordinatorSources = await grpcFetchByCategory(category, {
    query,
    tenantId,
    userId,
    vectorResults: similarVectors,
  });
  
  // מיזוג תוצאות
  sources = mergeResults(sources, coordinatorSources);
}
```

##### שלב 7: יצירת תשובה עם OpenAI
```javascript
// בניית הקשר מהמקורות שנמצאו
retrievedContext = sources
  .map((source, idx) => `[Source ${idx + 1}]: ${source.contentSnippet}`)
  .join('\n\n');

// יצירת תשובה
const completion = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [
    {
      role: 'system',
      content: 'You are a helpful AI assistant. Use ONLY the context provided.',
    },
    {
      role: 'user',
      content: `Context:\n${retrievedContext}\n\nQuestion: ${query}`,
    },
  ],
});

const answer = completion.choices[0]?.message?.content;
```

##### שלב 8: יצירת המלצות
```javascript
// יצירת המלצות מותאמות אישית
if (user_id) {
  recommendations = await generatePersonalizedRecommendations(
    tenantId,
    user_id,
    { limit: 3, recentQueries: [{ queryText: query, sources }] }
  );
}
```

##### שלב 9: שמירה למסד נתונים
```javascript
// שמירת שאילתה, תשובה, מקורות והמלצות
queryRecord = await saveQueryToDatabase({
  tenantId,
  userId,
  queryText: query,
  answer,
  confidenceScore,
  sources,
  recommendations,
});
```

##### שלב 10: מטמון
```javascript
// שמירה ב-Redis (TTL: 1 שעה)
if (isRedisAvailable()) {
  await redis.setex(cacheKey, 3600, JSON.stringify(response));
}
```

---

#### `unifiedVectorSearch.service.js` - `unifiedVectorSearch()`

**תפקיד**: **הפונקציה היחידה** שמבצעת חיפוש וקטורי. זה המקור האמת היחיד (Single Source of Truth).

```javascript
export async function unifiedVectorSearch(queryEmbedding, tenantId, options) {
  // המרת embedding למערך למחרוזת PostgreSQL
  const embeddingStr = `[${queryEmbedding.join(',')}]`;
  const vectorLiteral = `'${embeddingStr}'::vector`;
  
  // בניית שאילתת SQL
  const query = `
    SELECT 
      id, tenant_id, content_id, content_type, content_text,
      1 - (embedding <=> ${vectorLiteral}) as similarity
    FROM vector_embeddings
    WHERE tenant_id = $1
      AND (1 - (embedding <=> ${vectorLiteral})) >= $2
    ORDER BY embedding <=> ${vectorLiteral}
    LIMIT $3
  `;
  
  // ביצוע שאילתה
  const results = await prisma.$queryRawUnsafe(query, tenantId, threshold, limit);
  
  return results.map(row => ({
    id: row.id,
    contentId: row.content_id,
    contentType: row.content_type,
    contentText: row.content_text,
    similarity: parseFloat(row.similarity),
  }));
}
```

**הסבר**:
- `<=>` - אופרטור מרחק cosine ב-pgvector
- `1 - (embedding <=> vector)` - המרה למדד דמיון (0-1)
- `ORDER BY embedding <=> vector` - מיון לפי דמיון
- `LIMIT` - הגבלת מספר תוצאות

---

#### `tenant.service.js` - `getOrCreateTenant()`

**תפקיד**: ניהול דיירים - מציאת או יצירת tenant.

```javascript
export async function getOrCreateTenant(domainOrTenantId) {
  // 1. תיקון tenant ID
  const validatedTenantId = validateAndFixTenantId(domainOrTenantId);
  
  // 2. חיפוש לפי ID או domain
  let tenant = await prisma.tenant.findUnique({
    where: { id: validatedTenantId },
  }) || await prisma.tenant.findUnique({
    where: { domain: domainOrTenantId },
  });
  
  // 3. יצירה אם לא נמצא
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: domain,
        domain,
        settings: { ... },
      },
    });
  }
  
  return tenant;
}
```

---

#### `userProfile.service.js` - `getOrCreateUserProfile()`

**תפקיד**: ניהול פרופילי משתמשים.

```javascript
export async function getOrCreateUserProfile(tenantId, userId, defaultData) {
  // חיפוש פרופיל קיים
  let profile = await prisma.userProfile.findUnique({
    where: { userId },
  });
  
  // יצירה אם לא נמצא
  if (!profile) {
    profile = await prisma.userProfile.create({
      data: {
        tenantId,
        userId,
        role: defaultData.role || 'learner',
        skillGaps: defaultData.skillGaps || [],
        learningProgress: defaultData.learningProgress || {},
      },
    });
  }
  
  return profile;
}
```

---

### 5. Config (`BACKEND/src/config/`)

#### `database.config.js`
```javascript
import { PrismaClient } from '@prisma/client';

let prisma = null;

export async function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  return prisma;
}
```

#### `openai.config.js`
```javascript
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

#### `redis.config.js`
```javascript
import Redis from 'ioredis';

let redis = null;

export function getRedis() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL);
  }
  return redis;
}
```

---

## 🎨 מבנה ה-Frontend

### 1. נקודת הכניסה (`FRONTEND/src/main.jsx`)

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store/store.js';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <App />
  </Provider>
);
```

---

### 2. Redux Store (`FRONTEND/src/store/`)

#### `store.js`
```javascript
import { configureStore } from '@reduxjs/toolkit';
import { ragApi } from './api/ragApi.js';
import authSlice from './slices/auth.slice.js';
import chatSlice from './slices/chat.slice.js';

export const store = configureStore({
  reducer: {
    [ragApi.reducerPath]: ragApi.reducer,
    auth: authSlice,
    chat: chatSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(ragApi.middleware),
});
```

#### `api/ragApi.js` - RTK Query
```javascript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const ragApi = createApi({
  reducerPath: 'ragApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  }),
  endpoints: (builder) => ({
    submitQuery: builder.mutation({
      query: (body) => ({
        url: '/api/v1/query',
        method: 'POST',
        body,
      }),
    }),
    getRecommendations: builder.query({
      query: (userId) => `/api/v1/personalized/recommendations/${userId}`,
    }),
  }),
});

export const { useSubmitQueryMutation, useGetRecommendationsQuery } = ragApi;
```

---

### 3. Components (`FRONTEND/src/components/`)

#### `FloatingChatWidget.jsx` - הרכיב הראשי
```javascript
import { useSubmitQueryMutation } from '../store/api/ragApi.js';

export function FloatingChatWidget() {
  const [submitQuery, { isLoading }] = useSubmitQueryMutation();
  
  const handleSubmit = async (queryText) => {
    const result = await submitQuery({
      query: queryText,
      tenant_id: 'default.local',
      context: {
        user_id: currentUser?.id || 'anonymous',
        role: currentUser?.role || 'anonymous',
      },
    }).unwrap();
    
    // הוספת תשובה ל-chat
    addMessage({ type: 'bot', content: result.answer });
  };
  
  return (
    <ChatPanel onSubmit={handleSubmit} />
  );
}
```

---

## 🔄 זרימת הנתונים

### תהליך מלא של שאילתה:

```
1. משתמש כותב שאילתה ב-Frontend
   ↓
2. FloatingChatWidget → useSubmitQueryMutation()
   ↓
3. POST /api/v1/query
   ↓
4. query.controller.js → submitQuery()
   ├─ ולידציה
   ├─ תיקון tenant_id
   └─ ניתוב support mode (אם צריך)
   ↓
5. queryProcessing.service.js → processQuery()
   ├─ קבלת/יצירת tenant
   ├─ קבלת/יצירת user profile
   ├─ בדיקת מטמון (Redis)
   ├─ סיווג שאילתה (EDUCORE או לא)
   ├─ יצירת embedding (OpenAI)
   ├─ חיפוש וקטורי (unifiedVectorSearch)
   ├─ סינון RBAC
   ├─ קריאה ל-Coordinator (אם צריך)
   ├─ יצירת תשובה (OpenAI)
   ├─ יצירת המלצות
   ├─ שמירה למסד נתונים
   └─ שמירה למטמון (Redis)
   ↓
6. החזרת תשובה ל-Frontend
   ↓
7. הצגת תשובה למשתמש
```

---

## 🎯 איך הכל עובד יחד

### דוגמה: שאילתה "מה התפקיד של עדן?"

#### שלב 1: Frontend
```javascript
// משתמש שולח שאילתה
await submitQuery({
  query: "מה התפקיד של עדן?",
  tenant_id: "default.local",
  context: {
    user_id: "user-123",
    role: "employee",
  },
});
```

#### שלב 2: Backend - Controller
```javascript
// query.controller.js
const result = await processQuery({
  query: "מה התפקיד של עדן?",
  tenant_id: "default.local",
  context: { user_id: "user-123", role: "employee" },
});
```

#### שלב 3: Backend - Service
```javascript
// queryProcessing.service.js

// 1. תיקון tenant_id
validatedTenantId = "correct-tenant-uuid";

// 2. קבלת tenant
tenant = await getOrCreateTenant(validatedTenantId);

// 3. קבלת user profile
userProfile = await getOrCreateUserProfile(tenantId, "user-123");
// userProfile.role = "employee"

// 4. סיווג שאילתה
isEducore = true; // מכילה שם משתמש
category = "users";

// 5. תרגום לעברית (אם צריך)
translatedQuery = "What is Eden's role?";

// 6. יצירת embedding
queryEmbedding = [0.1, 0.2, ..., 0.9]; // 1536 ממדים

// 7. חיפוש וקטורי
similarVectors = await unifiedVectorSearch(queryEmbedding, tenantId, {
  limit: 5,
  threshold: 0.25,
});
// מחזיר: [{ contentId: "user-eden", contentType: "user_profile", similarity: 0.85, ... }]

// 8. RBAC - בדיקת הרשאות
userRole = "employee";
hasSpecificUserName = true; // "עדן" נמצא בשאילתה
isQueryAboutOwnProfile = false; // לא הפרופיל של המשתמש

// כללי גישה:
// Employee + שאילתה על משתמש אחר = אין גישה!
allowUserProfiles = false;

// 9. סינון תוצאות
filteredVectors = similarVectors.filter(v => v.contentType !== 'user_profile');
// filteredVectors = [] (כל התוצאות היו user_profile ונחסמו)

// 10. בדיקת תוצאות
if (filteredVectors.length === 0) {
  // אין תוצאות → יצירת הודעת שגיאה
  answer = "I don't have permission to access user profile information. Please contact your administrator.";
  reason = "permission_denied";
}

// 11. שמירה למסד נתונים
await saveQueryToDatabase({
  queryText: "מה התפקיד של עדן?",
  answer: "...",
  sources: [],
  reason: "permission_denied",
});

// 12. החזרת תשובה
return {
  answer: "...",
  abstained: true,
  reason: "permission_denied",
  sources: [],
  confidence: 0,
};
```

#### שלב 4: Frontend - הצגת תשובה
```javascript
// FloatingChatWidget מקבל תשובה
const result = await submitQuery(...);

// מציג הודעת שגיאה
if (result.abstained && result.reason === 'permission_denied') {
  showErrorMessage(result.answer);
}
```

---

### דוגמה 2: שאילתה כללית "מה זה React?"

#### שלב 1-3: אותו דבר עד סיווג

#### שלב 4: סיווג שאילתה
```javascript
// queryProcessing.service.js
isEducore = false; // שאילתה כללית, לא קשורה ל-EDUCORE

// אם לא EDUCORE → שולח ישירות ל-OpenAI
if (!isEducore) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are a friendly assistant.' },
      { role: 'user', content: 'מה זה React?' },
    ],
  });
  
  return {
    answer: completion.choices[0].message.content,
    sources: [],
    confidence: 1,
    mode: 'general_openai',
  };
}
```

---

## 🔐 אבטחה ו-RBAC

### כללי גישה לפרופילי משתמשים:

| תפקיד | גישה לפרופילים |
|------|----------------|
| **Admin** | ✅ כל הפרופילים |
| **HR** | ✅ כל הפרופילים |
| **Trainer** | ✅ רק כששואלים על משתמש ספציפי |
| **Manager** | ✅ רק כששואלים על משתמש ספציפי |
| **Employee** | ✅ רק הפרופיל שלו |
| **Anonymous** | ❌ אין גישה |

### מימוש בקוד:
```javascript
// queryProcessing.service.js

// בדיקת הרשאות
if (isAdmin || isHR) {
  allowUserProfiles = true; // גישה מלאה
} else if ((isTrainer || isManager) && hasSpecificUserName) {
  allowUserProfiles = true; // גישה רק כששואלים על משתמש ספציפי
} else if (isEmployee && isQueryAboutOwnProfile) {
  allowUserProfiles = true; // גישה רק לפרופיל שלו
} else {
  allowUserProfiles = false; // אין גישה
}

// סינון תוצאות
const filteredVectors = allowUserProfiles
  ? similarVectors
  : similarVectors.filter(v => v.contentType !== 'user_profile');
```

---

## 📊 ביצועים ואופטימיזציה

### 1. מטמון (Redis)
- **TTL**: 1 שעה
- **מפתח**: `query:{tenantId}:{userId}:{base64(query)}`
- **תוצאה**: שאילתות חוזרות מהירות יותר

### 2. Index וקטורי (HNSW)
```sql
CREATE INDEX ON vector_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```
- **HNSW**: Hierarchical Navigable Small World
- **מהירות**: חיפוש O(log n) במקום O(n)
- **איכות**: דיוק גבוה

### 3. Indexes רגילים
```prisma
@@index([tenantId])
@@index([tenantId, contentId])
@@index([tenantId, contentType, microserviceId])
```
- **תפקיד**: זירוז שאילתות מסוננות

---

## 🚀 Deployment

### סביבת Production:
- **Platform**: Railway
- **URL**: `https://ragmicroservice-production.up.railway.app`
- **Database**: Supabase PostgreSQL עם pgvector
- **Environment**: Node.js 20

### משתני סביבה:
```bash
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
REDIS_URL=redis://...
FRONTEND_URL=https://...
```

---

## 📝 סיכום

### מה למדנו:

1. **ארכיטקטורה**: Backend (Node.js) + Frontend (React) + Database (PostgreSQL)
2. **מסד נתונים**: 11 טבלאות עם יחסים מורכבים
3. **חיפוש וקטורי**: טבלה אחת `vector_embeddings` עם embeddings של כל התוכן
4. **RBAC**: בקרת גישה מבוססת תפקידים בקוד
5. **זרימת נתונים**: Frontend → Controller → Service → Database → AI → Response
6. **אופטימיזציה**: מטמון (Redis), Index וקטורי (HNSW)

### נקודות חשובות:

✅ **Single Source of Truth**: `unifiedVectorSearch.service.js` הוא המקום היחיד לחיפוש וקטורי  
✅ **Multi-tenant**: כל נתון קשור ל-tenant  
✅ **RBAC**: הגנה על פרופילי משתמשים לפי תפקיד  
✅ **Caching**: Redis למטמון תשובות  
✅ **Error Handling**: הודעות שגיאה מותאמות לפי סיבה  

---

**נכתב**: 2025  
**גרסה**: 2.0  
**סטטוס**: ✅ Production Ready

