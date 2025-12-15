# 🚂 חשיפת פורט gRPC ב-Railway - מדריך מפורט

## איפה לעשות את זה?

**כן, ב-Railway Dashboard של שירות Coordinator (`lovely-wonder`)**

---

## שלבים מפורטים

### שלב 1: כניסה ל-Railway Dashboard

1. לך ל-https://railway.app
2. התחבר לחשבון שלך
3. בחר את הפרויקט שבו נמצא Coordinator

### שלב 2: מצא את שירות Coordinator

1. במסך הפרויקט, חפש את השירות `lovely-wonder`
2. זה השירות של Coordinator
3. לחץ עליו

### שלב 3: פתח את Settings

1. בשירות Coordinator, לחץ על הכרטיסייה **"Settings"** (הגדרות)
2. בתפריט הצד, לחץ על **"Networking"** (רשת)

### שלב 4: הוסף פורט חדש

1. בחלק **"Ports"** או **"Exposed Ports"**
2. לחץ על הכפתור **"New Port"** או **"Add Port"** או **"Expose Port"**
3. מלא את הפרטים:
   - **Port**: `50051`
   - **Protocol**: `TCP`
   - **Public**: סמן את זה (אם אתה רוצה שהפורט יהיה נגיש מהאינטרנט)
   - **Name** (אופציונלי): `grpc` או `gRPC`

### שלב 5: שמור

1. לחץ על **"Save"** או **"Add"**
2. Railway יתחיל לחשוף את הפורט

---

## איך זה נראה?

```
Railway Dashboard
├── Projects
│   └── Your Project
│       └── Services
│           └── lovely-wonder (Coordinator) ← כאן!
│               ├── Deployments
│               ├── Metrics
│               ├── Logs
│               └── Settings ← כאן!
│                   ├── General
│                   ├── Variables
│                   ├── Networking ← כאן!
│                   │   └── Ports
│                   │       └── [New Port] ← לחץ כאן!
│                   └── ...
```

---

## מה קורה אחרי החשיפה?

לאחר שתחשוף את הפורט:

1. **Railway ייתן לך URL** לחיבור ל-gRPC
2. זה יכול להיות משהו כמו:
   - `coordinator-production-6004.up.railway.app:50051`
   - או URL אחר עם הפורט

3. **עדכן את המשתנים** ב-RAG Service:
   ```bash
   COORDINATOR_URL=coordinator-production-6004.up.railway.app
   COORDINATOR_GRPC_PORT=50051
   GRPC_USE_SSL=true  # או false, תלוי בהגדרות
   ```

---

## בדיקה לאחר החשיפה

לאחר שתחשוף את הפורט, הרץ:

```bash
cd BACKEND
node scripts/test-grpc-only.js
```

או עם grpcurl:

```bash
grpcurl coordinator-production-6004.up.railway.app:50051 list
```

---

## הערות חשובות

1. **Public vs Private**: 
   - אם תסמן "Public", הפורט יהיה נגיש מהאינטרנט
   - אם לא תסמן, הפורט יהיה זמין רק דרך Railway private network

2. **אבטחה**:
   - אם הפורט public, ודא שיש לך אבטחה (חתימות דיגיטליות)
   - החתימות שאנחנו משתמשים בהן מספקות את האבטחה הזו

3. **אם שני השירותים על Railway**:
   - אפשר להשתמש ב-private networking במקום
   - אז לא צריך לחשוף את הפורט כ-public
   - פשוט השתמש ב-service name: `COORDINATOR_URL=lovely-wonder`

---

## פתרון בעיות

### בעיה: לא רואה את הכפתור "New Port"

**פתרונות:**
1. ודא שאתה ב-Settings → Networking
2. בדוק שיש לך הרשאות לניהול השירות
3. נסה לרענן את הדף

### בעיה: הפורט לא נחשף

**פתרונות:**
1. בדוק את ה-Logs של Coordinator - אולי יש שגיאה
2. ודא ש-Coordinator רץ עם `GRPC_ENABLED=true`
3. ודא ש-Coordinator מאזין על פורט 50051

### בעיה: עדיין לא מצליח להתחבר

**פתרונות:**
1. בדוק שהפורט נחשף נכון ב-Railway
2. בדוק את ה-URL - אולי הוא שונה
3. נסה עם SSL: `GRPC_USE_SSL=true`
4. בדוק firewall rules

---

## סיכום

**כן, ב-Railway Dashboard של Coordinator (`lovely-wonder`):**

1. Settings → Networking
2. New Port → 50051 (TCP)
3. Public (אם צריך)
4. Save

לאחר מכן עדכן את המשתנים ב-RAG Service והרץ את הבדיקה!


