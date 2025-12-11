# סכמה של Knowledge Graph (KG) - איך זה עובד

## 📊 תוכן עניינים
1. [מבנה ה-Database](#מבנה-ה-database)
2. [רכיבי ה-KG](#רכיבי-ה-kg)
3. [סוגי Nodes](#סוגי-nodes)
4. [סוגי Edges (קשרים)](#סוגי-edges-קשרים)
5. [הזרימה המלאה - שילוב ב-RAG](#הזרימה-המלאה---שילוב-ב-rag)
6. [פונקציות מרכזיות](#פונקציות-מרכזיות)
7. [דוגמאות קונקרטיות](#דוגמאות-קונקרטיות)

---

## מבנה ה-Database

### טבלאות KG

```sql
-- טבלת Nodes (צמתים)
knowledge_graph_nodes
├── id (UUID)
├── tenant_id (UUID) - בידוד בין tenants
├── node_id (String, Unique) - מזהה ייחודי: "content:doc1", "skill:javascript", "user:user123"
├── node_type (String) - סוג ה-node: "content", "skill", "user", "topic", etc.
├── properties (JSONB) - מאפיינים נוספים: { "title": "...", "description": "..." }
├── created_at
└── updated_at

-- טבלת Edges (קשרים)
knowledge_graph_edges
├── id (UUID)
├── tenant_id (UUID)
├── source_node_id (String) - Node המקור
├── target_node_id (String) - Node היעד
├── edge_type (String) - סוג הקשר: "supports", "related", "prerequisite", "learning", etc.
├── weight (Decimal 0.0-1.0) - חוזק הקשר
├── properties (JSONB) - מאפיינים נוספים: { "progress": 0.75 }
├── created_at
└── updated_at
```

### אינדקסים

```sql
-- אינדקסים על Nodes
CREATE INDEX ON knowledge_graph_nodes (tenant_id);
CREATE INDEX ON knowledge_graph_nodes (node_id);
CREATE INDEX ON knowledge_graph_nodes (node_type);
CREATE INDEX ON knowledge_graph_nodes USING GIN (properties); -- חיפוש ב-JSONB

-- אינדקסים על Edges
CREATE INDEX ON knowledge_graph_edges (tenant_id);
CREATE INDEX ON knowledge_graph_edges (source_node_id, target_node_id);
CREATE INDEX ON knowledge_graph_edges (edge_type);
```

---

## רכיבי ה-KG

### 1. **Nodes (צמתים)** - ישויות בגרף

Nodes מייצגים ישויות במערכת:
- **Content Nodes**: תוכן (מסמכים, קורסים, שאלות)
- **Skill Nodes**: כישורים (JavaScript, React, Node.js)
- **User Nodes**: משתמשים (user:user123)
- **Topic Nodes**: נושאים/קטגוריות

### 2. **Edges (קשרים)** - יחסים בין ישויות

Edges מייצגים קשרים בין Nodes:
- **Directional**: כיוון - מ-source ל-target
- **Typed**: סוג קשר מוגדר
- **Weighted**: משקל 0.0-1.0
- **Properties**: מאפיינים נוספים (JSON)

---

## סוגי Nodes

### 1. Content Nodes
```
node_id: "content:doc1"
node_type: "content"
properties: {
  "title": "JavaScript Basics",
  "description": "Introduction to JavaScript",
  "category": "tutorial"
}
```

### 2. Skill Nodes
```
node_id: "skill:javascript"
node_type: "skill"
properties: {
  "name": "JavaScript",
  "level": "beginner",
  "category": "programming"
}
```

### 3. User Nodes
```
node_id: "user:user123"
node_type: "user"
properties: {
  "name": "John Doe",
  "role": "developer"
}
```

### 4. Topic Nodes
```
node_id: "topic:web-development"
node_type: "topic"
properties: {
  "name": "Web Development",
  "parent": null
}
```

---

## סוגי Edges (קשרים)

### 1. **supports** - תוכן תומך בכישור
```
source: content:doc1
target: skill:javascript
edge_type: "supports"
weight: 0.85
```
**משמעות:** המסמך "JavaScript Basics" תומך בלימוד הכישור JavaScript

### 2. **related** - תוכן קשור
```
source: content:doc1
target: content:doc2
edge_type: "related"
weight: 0.70
```
**משמעות:** שני מסמכים קשורים זה לזה

### 3. **prerequisite** - קדם-דרישה
```
source: content:js-basics
target: content:react-course
edge_type: "prerequisite"
weight: 0.90
```
**משמעות:** "JavaScript Basics" הוא קדם-דרישה ל-"React Course"

### 4. **learning** - משתמש לומד כישור
```
source: user:user123
target: skill:javascript
edge_type: "learning"
weight: 0.75
properties: {
  "progress": 0.65,  // 65% התקדמות
  "startedAt": "2025-01-01",
  "lastAccessed": "2025-01-27"
}
```
**משמעות:** המשתמש user123 לומד JavaScript, התקדמות 65%

### 5. **part_of** - חלק מ-
```
source: content:chapter1
target: content:course-js
edge_type: "part_of"
weight: 0.95
```
**משמעות:** Chapter 1 הוא חלק מהקורס JavaScript

---

## הזרימה המלאה - שילוב ב-RAG

### דיאגרמת זרימה

```
┌─────────────────────────────────────────────────────────────────┐
│                    RAG Query Processing                          │
│                                                                  │
│  1. Query Classification                                         │
│     └─> isEducoreQuery() → { isEducore: true, category: "..." }│
│                                                                  │
│  2. Vector Search                                                │
│     └─> unifiedVectorSearch()                                   │
│         └─> תוצאות: [                                            │
│               { contentId: "doc1", similarity: 0.85 },          │
│               { contentId: "doc2", similarity: 0.72 }           │
│             ]                                                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│           Knowledge Graph Enhancement (KG)                       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Step 1: Get User Learning Context (Parallel)            │  │
│  │                                                          │  │
│  │ getUserLearningContext(tenantId, userId)                │  │
│  │   ├─> מציאת edges: user:user123 --learning--> skill:*  │  │
│  │   ├─> מציאת skills של המשתמש                            │  │
│  │   └─> מציאת תוכן רלוונטי: skill:* --supports--> content:*│ │
│  │                                                          │  │
│  │ תוצאה: {                                                │  │
│  │   skills: [                                             │  │
│  │     { skillId: "skill:javascript", progress: 0.65 },   │  │
│  │     { skillId: "skill:react", progress: 0.30 }         │  │
│  │   ],                                                    │  │
│  │   relevantContentIds: ["doc1", "doc3", "doc5"]        │  │
│  │ }                                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                     │                                            │
│                     ▼                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Step 2: Find Related Nodes                              │  │
│  │                                                          │  │
│  │ findRelatedNodes(tenantId, ["doc1", "doc2"], [...])    │  │
│  │   ├─> המרת contentIds ל-nodeIds:                       │  │
│  │   │     "doc1" → "content:doc1"                        │  │
│  │   │     "doc2" → "content:doc2"                        │  │
│  │   │                                                      │  │
│  │   ├─> שאילתת Edges:                                     │  │
│  │   │     SELECT * FROM knowledge_graph_edges            │  │
│  │   │     WHERE source_node_id IN ("content:doc1", ...)  │  │
│  │   │       AND edge_type IN ("supports", "related", ...)│  │
│  │   │                                                      │  │
│  │   └─> תוצאות: [                                         │  │
│  │         {                                               │  │
│  │           nodeId: "skill:javascript",                  │  │
│  │           nodeType: "skill",                           │  │
│  │           edgeType: "supports",                        │  │
│  │           weight: 0.85,                                │  │
│  │           depth: 1                                     │  │
│  │         },                                             │  │
│  │         {                                               │  │
│  │           nodeId: "content:doc3",                      │  │
│  │           edgeType: "related",                         │  │
│  │           weight: 0.70                                 │  │
│  │         }                                              │  │
│  │       ]                                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                     │                                            │
│                     ▼                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Step 3: Boost Results by KG                             │  │
│  │                                                          │  │
│  │ boostResultsByKG(vectorResults, kgRelations, boostWeights)││
│  │                                                          │  │
│  │ לכל תוצאה מ-Vector Search:                              │  │
│  │   ├─> מציאת קשרים ב-KG:                                 │  │
│  │   │     doc1 → יש קשר "supports" → skill:javascript    │  │
│  │   │                                                      │  │
│  │   ├─> חישוב Boost:                                      │  │
│  │   │     edgeType = "supports" → boostWeight = 0.15     │  │
│  │   │     relationBoost = weight * boostWeight            │  │
│  │   │     relationBoost = 0.85 * 0.15 = 0.1275           │  │
│  │   │                                                      │  │
│  │   └─> העלאת Similarity:                                 │  │
│  │         originalSimilarity = 0.85                       │  │
│  │         newSimilarity = min(1.0, 0.85 + 0.1275)        │  │
│  │         newSimilarity = 0.9775                          │  │
│  │                                                          │  │
│  │ תוצאה: תוצאות עם similarity מעודכן + metadata KG      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                     │                                            │
│                     ▼                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Step 4: Expand Results with KG                          │  │
│  │                                                          │  │
│  │ expandResultsWithKG(vectorResults, tenantId, embedding) │  │
│  │                                                          │  │
│  │   ├─> מציאת תוכן חדש דרך קשרי KG:                      │  │
│  │   │     doc1 --related--> doc3  (לא נמצא ב-vector search)│ │
│  │   │                                                      │  │
│  │   ├─> חיפוש embeddings לתוכן החדש:                     │  │
│  │   │     unifiedVectorSearch(embedding, tenantId, {      │  │
│  │   │       contentIds: ["doc3"]                          │  │
│  │   │     })                                               │  │
│  │   │                                                      │  │
│  │   └─> הוספת תוצאות חדשות:                              │  │
│  │         mergedResults = [originalResults, newResults]   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                     │                                            │
│                     ▼                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Step 5: User Personalization                            │  │
│  │                                                          │  │
│  │ אם userLearningContext קיים:                            │  │
│  │   ├─> בדיקה אם תוכן רלוונטי למשתמש:                    │  │
│  │   │     doc1 in relevantContentIds? → YES               │  │
│  │   │                                                      │  │
│  │   └─> העלאת similarity:                                 │  │
│  │         newSimilarity = min(1.0, similarity + 0.12)     │  │
│  │                                                          │  │
│  │ תוצאה: תוצאות מותאמות אישית למשתמש                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                     │                                            │
│                     ▼                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Step 6: Re-sort Results                                 │  │
│  │                                                          │  │
│  │   └─> מיון לפי similarity חדש (יורד)                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              Continue RAG Processing                             │
│              (RBAC Filtering, Coordinator, OpenAI, etc.)        │
└─────────────────────────────────────────────────────────────────┘
```

---

## פונקציות מרכזיות

### 1. `findRelatedNodes()`

**תפקיד:** מציאת nodes קשורים דרך edges

**קלט:**
```javascript
{
  tenantId: "tenant-123",
  contentIds: ["doc1", "doc2"],
  edgeTypes: ["supports", "related", "prerequisite"],
  maxDepth: 1
}
```

**תהליך:**
1. המרת contentIds ל-nodeIds: `"doc1" → "content:doc1"`
2. שאילתת Edges:
   ```sql
   SELECT * FROM knowledge_graph_edges
   WHERE tenant_id = $1
     AND source_node_id IN ("content:doc1", "content:doc2")
     AND edge_type IN ("supports", "related", "prerequisite")
     AND weight >= 0.3
   ```
3. אם `maxDepth > 1`: רקורסיה - חיפוש קשרים מהתוצאות
4. הסרת כפילויות (על בסיס nodeId + edgeType)

**פלט:**
```javascript
[
  {
    nodeId: "skill:javascript",
    nodeType: "skill",
    edgeType: "supports",
    weight: 0.85,
    depth: 1,
    properties: { ... }
  },
  {
    nodeId: "content:doc3",
    edgeType: "related",
    weight: 0.70,
    depth: 1
  }
]
```

### 2. `boostResultsByKG()`

**תפקיד:** העלאת similarity scores על בסיס קשרי KG

**קלט:**
```javascript
{
  vectorResults: [
    { contentId: "doc1", similarity: 0.85 },
    { contentId: "doc2", similarity: 0.72 }
  ],
  kgRelations: [
    {
      nodeId: "skill:javascript",
      edgeType: "supports",
      weight: 0.85
    }
  ],
  boostWeights: {
    supports: 0.15,
    related: 0.10,
    prerequisite: 0.08
  }
}
```

**תהליך:**
1. יצירת map: `contentId → [relations]`
2. לכל תוצאה מ-vector search:
   - מציאת קשרים ב-KG
   - חישוב boost: `relationBoost = weight * boostWeights[edgeType]`
   - חישוב totalBoost (סכום כל ה-boosts)
   - העלאת similarity: `newSimilarity = min(1.0, similarity + totalBoost)`

**פלט:**
```javascript
[
  {
    contentId: "doc1",
    similarity: 0.9775,  // 0.85 + (0.85 * 0.15)
    originalSimilarity: 0.85,
    kgBoost: 0.1275,
    relatedNodeIds: ["skill:javascript"],
    edgeTypes: ["supports"]
  }
]
```

### 3. `getUserLearningContext()`

**תפקיד:** קבלת הקשר למידה של משתמש

**קלט:**
```javascript
{
  tenantId: "tenant-123",
  userId: "user123"
}
```

**תהליך:**
1. מציאת Learning Edges:
   ```sql
   SELECT * FROM knowledge_graph_edges
   WHERE tenant_id = $1
     AND source_node_id = "user:user123"
     AND edge_type = "learning"
   ```
2. חילוץ Skills מהתוצאות
3. מציאת תוכן רלוונטי:
   ```sql
   SELECT target_node_id FROM knowledge_graph_edges
   WHERE source_node_id IN (skill:javascript, skill:react, ...)
     AND edge_type = "supports"
   ```

**פלט:**
```javascript
{
  skills: [
    {
      skillId: "skill:javascript",
      progress: 0.65,
      weight: 0.75
    },
    {
      skillId: "skill:react",
      progress: 0.30,
      weight: 0.50
    }
  ],
  relevantContentIds: ["doc1", "doc3", "doc5"]
}
```

### 4. `expandResultsWithKG()`

**תפקיד:** הרחבת תוצאות עם תוכן חדש שנמצא דרך KG

**קלט:**
```javascript
{
  vectorResults: [
    { contentId: "doc1", similarity: 0.85 }
  ],
  tenantId: "tenant-123",
  queryEmbedding: [0.123, -0.456, ..., 0.789]
}
```

**תהליך:**
1. קריאה ל-`findRelatedNodes()` למציאת תוכן קשור
2. חילוץ contentIds מתוצאות KG (רק nodes מסוג "content")
3. סינון תוכן שכבר קיים בתוצאות
4. חיפוש embeddings לתוכן החדש:
   ```sql
   SELECT *, 1 - (embedding <=> $queryEmbedding) as similarity
   FROM vector_embeddings
   WHERE content_id IN ("doc3", "doc4", ...)
   ```
5. מיזוג עם תוצאות קיימות

**פלט:**
```javascript
[
  { contentId: "doc1", similarity: 0.85, fromKG: false },
  { contentId: "doc3", similarity: 0.78, fromKG: true },  // נמצא דרך KG
  { contentId: "doc4", similarity: 0.71, fromKG: true }   // נמצא דרך KG
]
```

### 5. `getUserSkillProgress()`

**תפקיד:** קבלת התקדמות משתמש בכישור ספציפי

**קלט:**
```javascript
{
  tenantId: "tenant-123",
  userId: "user123",
  skillIdOrNodeId: "javascript"  // או "skill:javascript"
}
```

**תהליך:**
1. שאילתת Edge:
   ```sql
   SELECT * FROM knowledge_graph_edges
   WHERE source_node_id = "user:user123"
     AND target_node_id = "skill:javascript"
     AND edge_type = "learning"
   ```
2. חילוץ progress ו-weight מה-edge properties

**פלט:**
```javascript
{
  progress: 0.65,      // 65% התקדמות
  weight: 0.75,        // חוזק הקשר
  edge: { ... }        // Edge object מלא
}
```

---

## דוגמאות קונקרטיות

### דוגמה 1: שאילתה על JavaScript

**שאילתה:** "מה זה JavaScript?"

**זרימה:**

1. **Vector Search** מוצא:
   - `doc1: "JavaScript Basics"` (similarity: 0.85)
   - `doc2: "JS Tutorial"` (similarity: 0.78)

2. **KG: Find Related Nodes**
   ```
   doc1 --supports--> skill:javascript (weight: 0.85)
   doc1 --related--> doc3: "Advanced JS" (weight: 0.70)
   doc2 --supports--> skill:javascript (weight: 0.80)
   ```

3. **KG: Boost Results**
   ```
   doc1: 0.85 + (0.85 * 0.15) = 0.9775
   doc2: 0.78 + (0.80 * 0.15) = 0.90
   ```

4. **KG: Expand Results**
   - מוצא `doc3: "Advanced JS"` דרך קשר "related"
   - מוסיף לרשימה (similarity: 0.75)

5. **User Personalization** (אם משתמש לומד JavaScript):
   - `doc1` רלוונטי למשתמש → +0.12
   - `doc1`: 0.9775 + 0.12 = 1.0 (capped)

**תוצאה סופית:**
```
1. doc1: "JavaScript Basics" (similarity: 1.0) - boosted + personalized
2. doc2: "JS Tutorial" (similarity: 0.90) - boosted
3. doc3: "Advanced JS" (similarity: 0.75) - expanded from KG
```

### דוגמה 2: שאילתה עם Prerequisites

**שאילתה:** "איך להתקין React?"

**זרימה:**

1. **Vector Search** מוצא:
   - `doc1: "React Installation Guide"` (similarity: 0.82)

2. **KG: Find Related Nodes**
   ```
   doc1 --prerequisite--> doc2: "Node.js Basics" (weight: 0.90)
   doc1 --prerequisite--> doc3: "NPM Guide" (weight: 0.85)
   ```

3. **KG: Boost Results**
   ```
   doc1: 0.82 + (0.90 * 0.08) + (0.85 * 0.08) = 0.96
   ```

4. **KG: Expand Results**
   - מוצא prerequisites שלא נמצאו בחיפוש הווקטורי
   - מוסיף `doc2` ו-`doc3` לרשימה

**תוצאה סופית:**
```
1. doc1: "React Installation Guide" (similarity: 0.96)
2. doc2: "Node.js Basics" (similarity: 0.75) - prerequisite
3. doc3: "NPM Guide" (similarity: 0.72) - prerequisite
```

### דוגמה 3: User Learning Path

**שאילתה:** "מה הקורסים הבאים שלי?"

**זרימה:**

1. **Get User Learning Context**
   ```
   user:user123 --learning--> skill:javascript (progress: 0.65)
   user:user123 --learning--> skill:react (progress: 0.30)
   ```

2. **Find Related Content**
   ```
   skill:javascript --supports--> doc1: "JS Basics"
   skill:javascript --supports--> doc2: "JS Advanced"
   skill:react --supports--> doc3: "React Course"
   ```

3. **Filter by Progress**
   - JavaScript: 65% → הצג "Advanced" (לא "Basics")
   - React: 30% → הצג "Basics"

**תוצאה סופית:**
```
1. doc2: "JavaScript Advanced" - רלוונטי להתקדמות
2. doc3: "React Course Basics" - רלוונטי להתחלה
```

---

## הגדרות (Configuration)

### קובץ: `knowledgeGraph.config.js`

```javascript
export const KG_CONFIG = {
  // סוגי edges לחיפוש
  EDGE_TYPES: [
    'supports',      // תוכן תומך בכישור
    'related',       // תוכן קשור
    'prerequisite',  // קדם-דרישה
    'part_of'        // חלק מ-
  ],

  // עומק מקסימלי ל-traversal
  MAX_TRAVERSAL_DEPTH: 1,  // 1 = קשרים ישירים, 2 = גם קשרים עקיפים

  // משקלי boost לפי סוג edge
  BOOST_WEIGHTS: {
    supports: 0.15,      // Boost גבוה - תוכן תומך
    related: 0.10,       // Boost בינוני - קשור
    prerequisite: 0.08,  // Boost נמוך - קדם-דרישה
    part_of: 0.05        // Boost נמוך - חלק מ-
  },

  // Boost להתאמה אישית
  USER_RELEVANCE_BOOST: 0.12,

  // משקל מינימלי של edge (0.0-1.0)
  MIN_EDGE_WEIGHT: 0.3,  // רק edges עם weight >= 0.3

  // מספר מקסימלי של nodes קשורים לכל תוכן
  MAX_RELATED_NODES: 10,

  // אפשרויות KG
  FEATURES: {
    QUERY_EXPANSION: true,      // הרחבת תוצאות
    RESULT_BOOSTING: true,      // העלאת similarity
    USER_PERSONALIZATION: true, // התאמה אישית
    KG_TRAVERSAL: true          // חיפוש קשרים
  }
};
```

---

## אופטימיזציות

### 1. **Parallel Execution**
```javascript
// הרצה מקבילית של vector search ו-user context
const [vectorSearchResults, userLearningContext] = await Promise.all([
  unifiedVectorSearch(...),
  getUserLearningContext(...)
]);
```

### 2. **Caching**
- Cache של `getUserLearningContext()` (TTL: 5 דקות)
- Cache של `findRelatedNodes()` (TTL: 10 דקות)

### 3. **Limit Results**
- `MAX_RELATED_NODES = 10` - מגביל מספר קשרים
- `MAX_TRAVERSAL_DEPTH = 1` - מגביל עומק חיפוש

### 4. **Weight Threshold**
- `MIN_EDGE_WEIGHT = 0.3` - רק קשרים חזקים
- מסנן קשרים חלשים/לא רלוונטיים

---

## נשאל נפוצות (FAQ)

### Q: מתי ה-KG פועל?
**A:** ה-KG מופעל רק עבור שאילתות EDUCORE (לא שאילתות כלליות), ורק אם `KG_CONFIG.FEATURES.KG_TRAVERSAL = true`.

### Q: מה קורה אם KG נכשל?
**A:** Graceful degradation - המערכת מחזירה את תוצאות ה-vector search המקוריות ללא KG enhancement.

### Q: איך מוסיפים nodes חדשים?
**A:** דרך API endpoints או scripts - יצירת records ב-`knowledge_graph_nodes` ו-`knowledge_graph_edges`.

### Q: מה ההבדל בין `supports` ו-`related`?
**A:** 
- `supports`: תוכן תומך בלימוד כישור (קשר חזק, boost גבוה)
- `related`: תוכן קשור (קשר חלש יותר, boost נמוך)

### Q: איך מחשבים weight של edge?
**A:** Weight נקבע בעת יצירת ה-edge (0.0-1.0). יכול להיות:
- אוטומטי (על בסיס similarity, co-occurrence)
- ידני (על ידי מפעיל מערכת)

---

## סיכום

ה-Knowledge Graph מספק:

✅ **חיפוש חכם יותר** - מציאת תוכן דרך קשרים סמנטיים  
✅ **התאמה אישית** - תוצאות מותאמות למשתמש  
✅ **הרחבת תוצאות** - מציאת תוכן שלא נמצא בחיפוש וקטורי  
✅ **Boost תוצאות** - העלאת relevance על בסיס קשרים  
✅ **Learning Paths** - מציאת נתיבי למידה אופטימליים  

**הערה:** ה-KG הוא אופציונלי - המערכת תמשיך לעבוד גם אם KG לא פעיל (graceful degradation).

---

**נוצר:** 2025-01-27  
**גרסה:** 1.0  
**מבוסס על:** knowledgeGraph.service.js, knowledgeGraph.config.js








