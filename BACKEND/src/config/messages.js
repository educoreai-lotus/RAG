/**
 * Centralized Message Configuration
 * All user-facing messages should be defined here to avoid hard-coding
 * Messages can be overridden via environment variables for production flexibility
 */

const MESSAGES = {
  rbac: {
    // Anonymous/unauthenticated users
    noAuth: (query) => 
      process.env.MSG_RBAC_NO_AUTH?.replace('{query}', query) ||
      `I found information about "${query}", but you need to log in to access employee information. Please authenticate to continue.`,
    
    // Authenticated employees without permission
    noPermissionEmployee: (query, role) => 
      process.env.MSG_RBAC_NO_PERM_EMPLOYEE?.replace('{query}', query).replace('{role}', role) ||
      `I found information about "${query}", but you don't have permission to access it. Your role: ${role}. Please contact your administrator if you need access to employee information.`,
    
    // Managers/HR/Trainers with some permissions but not for this specific query
    noPermissionManager: (query, role) => 
      process.env.MSG_RBAC_NO_PERM_MANAGER?.replace('{query}', query).replace('{role}', role) ||
      `I found information about "${query}", but you don't have permission to access it. Your role: ${role}. Please contact your administrator if you need broader access.`,
    
    // Unknown/generic role without permission
    noPermissionGeneral: (query, role) => 
      process.env.MSG_RBAC_NO_PERM_GENERAL?.replace('{query}', query).replace('{role}', role) ||
      `I found information about "${query}", but you don't have sufficient permissions. Role: ${role}. Contact your administrator.`,
    
    // Partial RBAC block (some results filtered but others remain)
    partialBlock: (query, role) =>
      process.env.MSG_RBAC_PARTIAL?.replace('{query}', query).replace('{role}', role) ||
      `Some information about "${query}" was filtered due to access restrictions. Role: ${role}.`,
  },
  
  // No data found in database
  noData: {
    templates: [
      (query) => process.env.MSG_NO_DATA_1?.replace('{query}', query) || `I couldn't find information about "${query}" in the knowledge base.`,
      (query) => process.env.MSG_NO_DATA_2?.replace('{query}', query) || `There is currently no EDUCORE content matching "${query}".`,
      (query) => process.env.MSG_NO_DATA_3?.replace('{query}', query) || `I couldn't find any EDUCORE content about "${query}".`,
      (query) => process.env.MSG_NO_DATA_4?.replace('{query}', query) || `No relevant EDUCORE items were found for "${query}".`,
    ],
    suffix: process.env.MSG_NO_DATA_SUFFIX || " Please add or import relevant documents to improve future answers.",
    
    // Get random template
    getRandom: function(query) {
      const pick = Math.floor(Math.random() * this.templates.length);
      const base = this.templates[pick](query);
      return `${base}${this.suffix}`;
    }
  },
  
  // Low similarity results
  lowSimilarity: (query) => 
    process.env.MSG_LOW_SIMILARITY?.replace('{query}', query) ||
    `I found some content, but nothing closely matches "${query}". Please try rephrasing your question or add more relevant content.`,
  
  // Error messages
  error: {
    generic: () => 
      process.env.MSG_ERROR_GENERIC ||
      `I encountered an error while processing your request. Please try again or contact support if the issue persists.`,
    
    tenant: () => 
      process.env.MSG_ERROR_TENANT ||
      `There was an issue accessing your workspace data. Please contact support.`,
    
    permission: () =>
      process.env.MSG_ERROR_PERMISSION ||
      `I found information about that, but you don't have permission to access it. Please contact your administrator.`,
    
    connection: () =>
      process.env.MSG_ERROR_CONNECTION ||
      `I encountered an error connecting to the service. Please try again in a moment.`,
  },
  
  // Success messages
  success: {
    partial: (query, resultCount) =>
      process.env.MSG_SUCCESS_PARTIAL?.replace('{query}', query).replace('{count}', resultCount) ||
      `I found ${resultCount} result(s) for "${query}".`,
  }
};

// Validation function to ensure all message functions work
function validateMessages() {
  try {
    // Test RBAC messages
    MESSAGES.rbac.noAuth("test query");
    MESSAGES.rbac.noPermissionEmployee("test query", "employee");
    MESSAGES.rbac.noPermissionManager("test query", "manager");
    MESSAGES.rbac.noPermissionGeneral("test query", "unknown");
    
    // Test other messages
    MESSAGES.noData.getRandom("test query");
    MESSAGES.lowSimilarity("test query");
    MESSAGES.error.generic();
    MESSAGES.error.tenant();
    
    console.log('✅ Message configuration validated successfully');
    return true;
  } catch (error) {
    console.error('❌ Message configuration validation failed:', error);
    return false;
  }
}

export {
  MESSAGES,
  validateMessages
};
