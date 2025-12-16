# הסבר ארכיטקטורה: למה צריך טבלאות נוספות?

## 🎯 השאלה: האם מוסיפים עוד טבלאות לטבלאות הראשיות ולמה?

## 📊 הארכיטקטורה הנוכחית

### טבלאות קיימות:

1. **`vector_embeddings`** - אחסון embeddings לחיפוש וקטורי
2. **`knowledge_graph_nodes`** - צמתים בגרף הידע
3. **`knowledge_graph_edges`** - קשרים בגרף הידע
4. **`queries`** - היסטוריית שאילתות
5. **`microservices`** - מטא-דאטה על מיקרו-שירותים

## ❓ למה צריך טבלת `microservice_data`?

### הבעיה הנוכחית:

**הנתונים מגיעים מ-GRPC אבל לא נשמרים!**

```
GRPC Request → Batch Sync → ❌ Data Lost
```

### הפתרון: טבלת `microservice_data`

**למה צריך טבלה נפרדת?**

#### 1. **אחסון נתונים גולמיים (Raw Data Storage)**

```
microservice_data (טבלה חדשה)
├── id
├── tenant_id
├── service_name          ← מאיזה מיקרו-שירות הגיע
├── content_id            ← מזהה ייחודי של התוכן
├── content_type          ← סוג התוכן (report, assessment, etc.)
├── content_data          ← הנתונים המלאים (JSONB)
├── metadata              ← מטא-דאטה ממופה
└── timestamp             ← מתי התקבל
```

**למה לא לשמור ישירות ב-`vector_embeddings`?**

- `vector_embeddings` מיועדת ל-**embeddings בלבד**
- לא שומרת את הנתונים המקוריים המלאים
- לא מאפשרת גישה לנתונים הגולמיים ללא חיפוש וקטורי

#### 2. **תהליך עיבוד נתונים (Data Processing Pipeline)**

```
┌─────────────────────────────────────────────────┐
│ 1. GRPC → Batch Sync                            │
│    ↓                                             │
│ 2. microservice_data (שמירת נתונים גולמיים)    │
│    ↓                                             │
│ 3. Vectorization (יצירת embeddings)             │
│    ↓                                             │
│ 4. vector_embeddings (שמירת embeddings)         │
│    ↓                                             │
│ 5. Knowledge Graph (חילוץ entities ו-relations)│
│    ↓                                             │
│ 6. knowledge_graph_nodes/edges                  │
└─────────────────────────────────────────────────┘
```

#### 3. **יתרונות הטבלה הנפרדת:**

✅ **גיבוי נתונים גולמיים** - אפשר לשחזר את הנתונים המקוריים

✅ **גמישות בעיבוד** - אפשר לעבד מחדש נתונים קיימים

✅ **אימות נתונים** - אפשר לבדוק את הנתונים לפני עיבוד

✅ **היסטוריה** - שמירת כל הגרסאות של הנתונים

✅ **ביצועים** - חיפוש מהיר לפי `service_name` ו-`content_id`

✅ **גישה ישירה** - לא צריך לעשות חיפוש וקטורי כדי לקבל נתונים

## 🔄 תהליך העבודה המלא

### שלב 1: קבלת נתונים מ-GRPC
```javascript
// batchSyncService.js
const response = await batchSync({
  target_service: 'hr-reporting-service',
  sync_type: 'batch',
  page: 1,
  limit: 1000
});
```

### שלב 2: שמירה ב-`microservice_data`
```javascript
// dataStorageService.js
await prisma.microserviceData.createMany({
  data: data.map(item => ({
    tenantId: tenantId,
    serviceName: 'hr-reporting-service',
    contentId: item.id,
    contentType: 'report',
    contentData: item, // הנתונים המלאים
    metadata: mappedMetadata,
    timestamp: new Date()
  }))
});
```

### שלב 3: Vectorization
```javascript
// vectorizationService.js
for (const item of data) {
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: extractSearchableText(item)
  });
  
  await prisma.vectorEmbedding.create({
    data: {
      tenantId: tenantId,
      microserviceId: microserviceId,
      contentId: item.id,
      contentType: 'report',
      embedding: embedding.vector,
      contentText: extractSearchableText(item),
      metadata: { source: 'hr-reporting-service' }
    }
  });
}
```

### שלב 4: Knowledge Graph
```javascript
// knowledgeGraph.service.js
const entities = extractEntities(data);
const relationships = extractRelationships(data);

for (const entity of entities) {
  await prisma.knowledgeGraphNode.upsert({
    where: { nodeId: entity.id },
    create: { ...entity },
    update: { ...entity }
  });
}

for (const rel of relationships) {
  await prisma.knowledgeGraphEdge.create({
    data: rel
  });
}
```

## 📋 השוואה: עם/בלי `microservice_data`

### ❌ בלי `microservice_data`:

```
GRPC Data → Vector Embeddings → Knowledge Graph
     ↓
❌ אובדן נתונים גולמיים
❌ לא ניתן לשחזר נתונים
❌ לא ניתן לעבד מחדש
❌ לא ניתן לבדוק נתונים לפני עיבוד
```

### ✅ עם `microservice_data`:

```
GRPC Data → microservice_data → Vector Embeddings → Knowledge Graph
     ↓              ↓                    ↓                    ↓
✅ שמירת        ✅ עיבוד           ✅ חיפוש           ✅ קשרים
   נתונים          מחדש               וקטורי              בגרף
   גולמיים
```

## 🎯 סיכום

**כן, צריך להוסיף טבלת `microservice_data` כי:**

1. **שמירת נתונים גולמיים** - לא מאבדים את הנתונים המקוריים
2. **גמישות** - אפשר לעבד מחדש ולשנות את תהליך העיבוד
3. **ביצועים** - גישה מהירה לנתונים ללא חיפוש וקטורי
4. **אימות** - אפשר לבדוק נתונים לפני עיבוד
5. **היסטוריה** - שמירת כל הגרסאות

**הטבלאות הקיימות (`vector_embeddings`, `knowledge_graph_*`) נשארות כפי שהן** - הן מיועדות למטרות ספציפיות (חיפוש וקטורי וגרף ידע).

**הטבלה החדשה (`microservice_data`) משלימה את התמונה** - היא שכבת האחסון הבסיסית שממנה הכל מתחיל.

