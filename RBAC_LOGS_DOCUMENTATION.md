# RBAC Logs Documentation

## 📊 Complete Log Flow Analysis

This document provides a comprehensive analysis of the RBAC system logs, showing exactly how the system processes queries and makes access control decisions.

## 🔍 Real Log Example: Employee Asking About Eden Levi

### Input Request:
```json
{
  "query": "What is Eden Levi's role?",
  "tenant_id": "default.local",
  "context": {
    "user_id": "test-employee-123",
    "role": "employee"
  }
}
```

### Complete Log Flow:

#### 1. 🔍 Vector Search Results (Before RBAC)
```
Vector search returned {
  query: "What is Eden Levi's role?",
  totalResults: 5,
  userProfileCount: 3,
  resultTypes: [ 'user_profile', 'assessment', 'document' ],
  contentIds: [
    'user:manager-001',      // Eden Levi's profile
    'user:admin-001',        // Adi Cohen's profile  
    'user:employee-001',     // Noa Bar's profile
    'assessment-001',
    'course-js-basics-101'
  ]
}
```

**Analysis:** The vector search found 5 results, including 3 user profiles. Eden Levi's profile (`user:manager-001`) was found with high similarity.

#### 2. 🔍 User Name Detection
```
🔍 User Name Detection Debug: {
  query: "What is Eden Levi's role?",
  queryLower: "what is eden levi's role?",
  hasSpecificUserName: true,
  matchedPatterns: [ 'eden', 'levi' ]
}
```

**Analysis:** System correctly identified that the query mentions specific user names ("eden" and "levi").

#### 3. 👤 User Context Resolution
```
👤 User Context: {
  user_id: 'test-employee-123',
  userRoleFromProfile: 'learner',
  userRoleFromContext: 'employee',
  finalRole: 'learner',
  isAuthenticated: true,
  isAdmin: false,
  isHR: false,
  isTrainer: false,
  isManager: false,
  isEmployee: false,
  isAnonymous: false
}
```

**Analysis:** 
- User is authenticated (`isAuthenticated: true`)
- Role conflict: context says "employee" but profile says "learner"
- Final role determined as "learner" (profile takes precedence)
- All permission flags are false (learner has minimal permissions)

#### 4. 👤 Role Detection Details
```
👤 Role Detection: {
  from_profile: 'learner',
  from_context: 'employee',
  final_role: 'learner',
  normalized: 'learner',
  isAnonymous: false,
  isEmployee: false,
  isManager: false,
  isAdmin: false,
  isHR: false,
  isTrainer: false
}
```

**Analysis:** Detailed breakdown of role detection logic showing precedence order.

#### 5. 🔐 RBAC Decision Making
```
🔐 RBAC Decision: {
  userRole: 'learner',
  isAuthenticated: true,
  isAdmin: false,
  isHR: false,
  isTrainer: false,
  isManager: false,
  isEmployee: false,
  hasSpecificUserName: true,
  isQueryAboutOwnProfile: false,
  allowUserProfiles: false
}
```

**Analysis:**
- User is authenticated but has "learner" role
- Query is about a specific user (Eden Levi) but not about own profile
- **Decision: `allowUserProfiles: false`** - Access denied

#### 6. 🚨 Security Logging
```
🚨 SECURITY: Unauthorized access attempt blocked: {
  userRole: 'learner',
  userId: 'test-employee-123',
  isAuthenticated: true,
  query: "What is Eden Levi's role?",
  attemptedAccess: 'user_profile',
  userProfilesFound: 3,
  userProfilesRemoved: 3,
  matchedName: 'eden',
  action: 'BLOCKED',
  reason: 'Insufficient permissions'
}
```

**Analysis:** Security system logs the blocked access attempt with full context for audit purposes.

#### 7. 🔍 RBAC Filtering Results
```
🔍 AFTER RBAC Filtering: {
  query: "What is Eden Levi's role?",
  originalCount: 5,
  filteredCount: 2,
  removedCount: 3,
  userProfilesFound: 3,
  userProfilesRemoved: 3,
  remainingResults: 2
}
```

**Analysis:** 
- Started with 5 results
- Removed 3 user profiles due to RBAC
- Left with 2 non-user-profile results (assessment + course)

#### 8. 🎯 Filtering Reason Determination
```
🎯 Filtering Reason Determined: {
  reason: 'RBAC_BLOCKED_USER_PROFILES',
  hasSpecificUserName: true,
  matchedName: 'eden',
  userProfilesRemoved: 3,
  userProfilesFound: 3,
  vectorsBeforeFilter: 5,
  vectorsAfterFilter: 2,
  userRole: 'learner',
  isAuthenticated: true
}
```

**Analysis:** System determined that the primary issue is `RBAC_BLOCKED_USER_PROFILES` because user asked specifically about a user profile that was blocked.

#### 9. 📢 Message Generation Process
```
📢 Generating No Results Message: {
  reason: 'RBAC_BLOCKED_USER_PROFILES',
  userRole: 'learner',
  isAuthenticated: true,
  userProfilesFound: 3,
  userProfilesRemoved: 3,
  hasSpecificUserName: true,
  matchedName: 'eden',
  query: "What is Eden Levi's role?"
}
```

#### 10. 🚨 Message Type Selection
```
🚨 EDEN LEVI MESSAGE GENERATION DEBUG: {
  reason: 'RBAC_BLOCKED_USER_PROFILES',
  userRole: 'learner',
  isAuthenticated: true,
  willUseRBACMessage: true,
  messageType: 'NO_PERM_OTHER'
}
```

**Analysis:** 
- User is authenticated (`isAuthenticated: true`)
- User role is "learner" (not employee, manager, or admin)
- Message type selected: `NO_PERM_OTHER` (generic permission denied)

#### 11. 📤 Final Response
```json
{
  "answer": "I found information about \"What is Eden Levi's role?\", but you don't have sufficient permissions. Role: learner. Contact your administrator.",
  "abstained": true,
  "reason": "permission_denied",
  "confidence": 0
}
```

## 📋 Log Categories Reference

### 🔍 Search and Discovery Logs
- `Vector search returned` - Initial search results
- `🔍 BEFORE RBAC Filtering` - Results before access control
- `🔍 AFTER RBAC Filtering` - Results after access control

### 👤 User and Role Logs  
- `👤 User Context` - User identification and role resolution
- `👤 Role Detection` - Detailed role detection process
- `🔍 User Name Detection Debug` - Query analysis for user names

### 🔐 Security and Access Control Logs
- `🔐 RBAC Decision` - Access control decision making
- `🚨 SECURITY: Unauthorized access attempt blocked` - Security violations
- `🚨 RBAC Security: User asked specifically about user profile - blocked` - Specific blocking reasons

### 🎯 Processing and Logic Logs
- `🎯 Filtering Reason Determined` - Why results were filtered
- `📢 Generating No Results Message` - Message generation process
- `🚨 EDEN LEVI MESSAGE GENERATION DEBUG` - Specific debug for test queries

### 📊 Performance and Metrics Logs
- `Vector filtering applied (RBAC)` - Performance metrics
- `RAG vector search completed` - Search completion
- `Merged vector and Coordinator results` - Result merging

## 🎯 Key Decision Points in Logs

### 1. Authentication Check
```
isAuthenticated: user_id && user_id !== 'anonymous' && user_id !== 'guest'
```

### 2. Role Hierarchy (Priority Order)
```
1. userProfile?.role (from database)
2. context?.role (from request)  
3. 'anonymous' (default)
```

### 3. User Profile Access Rules
```javascript
if (isAdmin || isHR) {
  allowUserProfiles = true;  // Full access
} else if ((isTrainer || isManager) && hasSpecificUserName) {
  allowUserProfiles = true;  // Specific user access
} else if (isEmployee && isQueryAboutOwnProfile) {
  allowUserProfiles = true;  // Own profile only
} else {
  allowUserProfiles = false; // No access
}
```

### 4. Message Type Selection Logic
```javascript
if (!isAuthenticated || userRole === 'anonymous') {
  return MESSAGES.rbac.noAuth(query);           // "need to log in"
} else if (userRole === 'employee' || userRole === 'user') {
  return MESSAGES.rbac.noPermissionEmployee(query, role);  // "no permission + role"
} else if (userRole === 'manager' || userRole === 'hr' || userRole === 'trainer') {
  return MESSAGES.rbac.noPermissionManager(query, role);   // "no permission + contact admin"
} else {
  return MESSAGES.rbac.noPermissionGeneral(query, role);   // "insufficient permissions"
}
```

## 🚨 Security Audit Trail

### Blocked Access Attempts
Every blocked access attempt generates these logs:
1. **User identification** - Who tried to access
2. **Resource identification** - What they tried to access  
3. **Permission analysis** - Why access was denied
4. **Context preservation** - Full request context for investigation

### Example Security Log:
```
🚨 SECURITY: Unauthorized user profile access blocked {
  userRole: 'learner',
  userId: 'test-employee-123', 
  isAuthenticated: true,
  query: "What is Eden Levi's role?",
  attemptedAccess: 'user_profile',
  userProfilesFound: 3,
  userProfilesRemoved: 3,
  matchedName: 'eden',
  action: 'BLOCKED',
  reason: 'Insufficient permissions'
}
```

## 🔧 Debugging Guide

### Common Issues and Log Patterns

#### Issue: User gets "need to log in" when authenticated
**Look for:**
```
isAuthenticated: false  // Should be true
final_role: 'anonymous' // Should be actual role
```

#### Issue: Admin doesn't get access
**Look for:**
```
isAdmin: false          // Should be true
final_role: 'admin'     // Check if role is correctly detected
```

#### Issue: Employee can't see own profile  
**Look for:**
```
isQueryAboutOwnProfile: false  // Should be true for own profile
hasSpecificUserName: true      // Should detect user's own name
```

#### Issue: Manager can't see specific user
**Look for:**
```
isManager: true               // Should be true
hasSpecificUserName: true     // Should detect specific user name
allowUserProfiles: false      // Should be true for managers with specific names
```

## 📈 Performance Metrics in Logs

### Timing Information
- Search execution time
- RBAC filtering time  
- Message generation time
- Total request processing time

### Resource Usage
- Number of vector results processed
- Number of results filtered by RBAC
- Memory usage for large result sets
- Database query performance

## 🔄 Log Rotation and Retention

### Production Recommendations
- **Retention Period:** 90 days for security logs, 30 days for debug logs
- **Log Levels:** INFO for access decisions, WARN for blocked attempts, ERROR for system issues
- **Structured Logging:** JSON format for easy parsing and analysis
- **Security Monitoring:** Real-time alerts for repeated blocked attempts

---

**Documentation Status:** ✅ **COMPLETE**  
**Last Updated:** November 20, 2025  
**Log Format Version:** 2.0.0
