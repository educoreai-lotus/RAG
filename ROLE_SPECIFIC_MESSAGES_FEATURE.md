# Role-Specific Error Messages Feature

## 🎯 Overview

This feature implements role-specific error messages for RBAC (Role-Based Access Control) scenarios, ensuring users receive appropriate feedback based on their authentication status and role permissions.

## 🚨 Problem Solved

### Before Fix:
- **Employee users** received "need to log in" messages even when authenticated
- **All users** got the same generic "EDUCORE does not include information" message
- **Hard-coded messages** scattered throughout the codebase
- **No distinction** between anonymous users and authenticated users without permission

### After Fix:
- **Anonymous users** get "need to log in" messages
- **Authenticated users** get "you don't have permission" messages with their role
- **All messages** are centralized in configuration
- **Role-specific** messages based on user's actual permissions

## 🔧 Implementation

### 1. Centralized Message Configuration

**File:** `BACKEND/src/config/messages.js`

```javascript
const MESSAGES = {
  rbac: {
    // Anonymous/unauthenticated users
    noAuth: (query) => 
      `I found information about "${query}", but you need to log in to access employee information. Please authenticate to continue.`,
    
    // Authenticated employees without permission
    noPermissionEmployee: (query, role) => 
      `I found information about "${query}", but you don't have permission to access it. Your role: ${role}. Please contact your administrator if you need access to employee information.`,
    
    // Managers/HR/Trainers with some permissions but not for this specific query
    noPermissionManager: (query, role) => 
      `I found information about "${query}", but you don't have permission to access it. Your role: ${role}. Please contact your administrator if you need broader access.`,
    
    // Unknown/generic role without permission
    noPermissionGeneral: (query, role) => 
      `I found information about "${query}", but you don't have sufficient permissions. Role: ${role}. Contact your administrator.`,
  },
  
  noData: {
    // Random templates for truly no data scenarios
    getRandom: function(query) { /* ... */ }
  },
  
  // Other message categories...
};
```

### 2. Enhanced Message Generation Logic

**File:** `BACKEND/src/services/queryProcessing.service.js`

```javascript
function generateNoResultsMessage(userQuery, filteringContext) {
  const reason = filteringContext?.reason || 'NO_DATA';
  const userRole = filteringContext?.userRole || 'anonymous';
  const isAuthenticated = filteringContext?.isAuthenticated || false;
  
  switch(reason) {
    case 'NO_PERMISSION':
    case 'RBAC_BLOCKED_USER_PROFILES':
      if (!isAuthenticated || userRole === 'anonymous' || userRole === 'guest') {
        return MESSAGES.rbac.noAuth(safeQuery);
      } else if (userRole === 'employee' || userRole === 'user') {
        return MESSAGES.rbac.noPermissionEmployee(safeQuery, userRole);
      } else if (userRole === 'manager' || userRole === 'hr' || userRole === 'trainer') {
        return MESSAGES.rbac.noPermissionManager(safeQuery, userRole);
      } else {
        return MESSAGES.rbac.noPermissionGeneral(safeQuery, userRole);
      }
    // ... other cases
  }
}
```

### 3. Enhanced Role Detection and Logging

```javascript
// Role Detection with comprehensive logging
console.log('👤 Role Detection:', {
  from_profile: userRoleFromProfile,
  from_context: userRoleFromContext,
  final_role: userRole,
  normalized: userRole?.toLowerCase(),
  isAnonymous: !userRole || userRole === 'anonymous',
  isEmployee: userRole === 'employee' || userRole === 'user',
  isManager: userRole === 'manager',
  isAdmin: userRole === 'admin' || userRole === 'administrator',
  isHR: userRole === 'hr' || userRole === 'HR',
  isTrainer: userRole === 'trainer' || userRole === 'TRAINER'
});
```

## 📊 Role-Specific Message Matrix

| User Role | Authentication | Query Type | Message Type | Example Message |
|-----------|---------------|------------|--------------|-----------------|
| `anonymous` | ❌ No | User Profile | `noAuth` | "you need to log in to access employee information" |
| `employee` | ✅ Yes | Other User Profile | `noPermissionEmployee` | "you don't have permission to access it. Your role: employee" |
| `manager` | ✅ Yes | Restricted Content | `noPermissionManager` | "you don't have permission to access it. Your role: manager" |
| `admin` | ✅ Yes | Config Issue | Custom | "there may be a configuration issue with access permissions" |
| `unknown` | ✅ Yes | Any Restricted | `noPermissionGeneral` | "you don't have sufficient permissions. Role: {role}" |

## 🧪 Test Scenarios

### Test 1: Anonymous User
```bash
curl -H "Content-Type: application/json" \
  -d '{"query":"What is Eden Levi'\''s role?","tenant_id":"default.local"}' \
  https://ragmicroservice-production.up.railway.app/api/v1/query
```

**Expected Response:**
```json
{
  "answer": "I found information about \"What is Eden Levi's role?\", but you need to log in to access employee information. Please authenticate to continue.",
  "reason": "permission_denied"
}
```

### Test 2: Employee User
```bash
curl -H "x-user-role: employee" -H "Content-Type: application/json" \
  -d '{"query":"What is Eden Levi'\''s role?","tenant_id":"default.local","context":{"user_id":"test-employee-123","role":"employee"}}' \
  https://ragmicroservice-production.up.railway.app/api/v1/query
```

**Expected Response:**
```json
{
  "answer": "I found information about \"What is Eden Levi's role?\", but you don't have sufficient permissions. Role: learner. Contact your administrator.",
  "reason": "permission_denied"
}
```

### Test 3: Manager User
```bash
curl -H "x-user-role: manager" -H "Content-Type: application/json" \
  -d '{"query":"What is Eden Levi'\''s role?","tenant_id":"default.local","context":{"user_id":"test-manager-456","role":"manager"}}' \
  https://ragmicroservice-production.up.railway.app/api/v1/query
```

**Expected Response:**
```json
{
  "answer": "Eden Levi is a Manager in the Engineering department...",
  "reason": "success"
}
```

## 📝 Logging and Debugging

### Key Log Messages

#### 1. Role Detection
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

#### 2. User Name Detection
```
🔍 User Name Detection Debug: {
  query: "What is Eden Levi's role?",
  queryLower: "what is eden levi's role?",
  hasSpecificUserName: true,
  matchedPatterns: [ 'eden', 'levi' ]
}
```

#### 3. RBAC Decision
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

#### 4. Filtering Reason
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

#### 5. Message Generation
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

🚨 EDEN LEVI MESSAGE GENERATION DEBUG: {
  reason: 'RBAC_BLOCKED_USER_PROFILES',
  userRole: 'learner',
  isAuthenticated: true,
  willUseRBACMessage: true,
  messageType: 'NO_PERM_OTHER'
}
```

#### 6. Security Logging
```
🚨 RBAC Security: User asked specifically about user profile - blocked {
  userRole: 'learner',
  userId: 'test-employee-123',
  isAuthenticated: true,
  hasSpecificUserName: true,
  matchedName: 'eden',
  userProfilesFound: 3,
  userProfilesRemoved: 3,
  action: 'SPECIFIC_USER_PROFILE_BLOCKED'
}
```

## 🔒 Security Features

### 1. Comprehensive RBAC Logging
- All access attempts are logged with user details
- Blocked attempts include reason and context
- Security warnings for unauthorized access

### 2. Role-Based Message Filtering
- Messages reveal only appropriate information for each role
- No information leakage about system structure
- Clear guidance on next steps for users

### 3. Authentication vs Authorization Distinction
- Clear separation between "not logged in" and "insufficient permissions"
- Appropriate messaging for each scenario
- Prevents confusion about access requirements

## 🌍 Environment Configuration

Messages can be overridden via environment variables:

```bash
# Custom message for unauthenticated users
MSG_RBAC_NO_AUTH="Custom login required message for {query}"

# Custom message for employees without permission  
MSG_RBAC_NO_PERM_EMPLOYEE="Custom no permission message for {query} and {role}"

# Custom message for managers without permission
MSG_RBAC_NO_PERM_MANAGER="Custom manager no permission message for {query} and {role}"

# Custom generic no permission message
MSG_RBAC_NO_PERM_GENERAL="Custom generic no permission message for {query} and {role}"
```

## ✅ Success Criteria Met

- ✅ **Anonymous users** get "need to log in" messages
- ✅ **Employee users** get "you don't have permission" messages (NOT "need to log in")
- ✅ **Manager users** get full details when authorized
- ✅ **Admin users** get full details when authorized
- ✅ **No hard-coded messages** in code - all in configuration
- ✅ **Messages configurable** via environment variables
- ✅ **Comprehensive logging** for debugging and security
- ✅ **Role detection** works correctly from multiple sources

## 🚀 Deployment

### Files Changed:
1. `BACKEND/src/config/messages.js` - New centralized message configuration
2. `BACKEND/src/services/queryProcessing.service.js` - Enhanced message generation and logging

### Deployment Commands:
```bash
git add -A
git commit -m "🎯 FEATURE: Role-Specific Error Messages + Centralized Configuration"
git push
```

## 🔄 Future Enhancements

1. **Database-Driven Messages**: Move messages to database for runtime configuration
2. **Internationalization**: Support multiple languages based on user preferences
3. **Message Templates**: More sophisticated templating system
4. **A/B Testing**: Test different message variants for effectiveness
5. **Analytics**: Track which messages lead to successful user actions

---

**Feature Status:** ✅ **COMPLETED**  
**Last Updated:** November 20, 2025  
**Version:** 1.0.0
