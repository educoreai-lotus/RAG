/**
 * Microservice Schema Registry
 * 
 * Each schema defines how to process data from a specific microservice:
 * - table: Where to store in Supabase
 * - vectorize_fields: Which fields contain searchable text
 * - field_mapping: How to map microservice fields to RAG tables
 * - relationships: How to extract knowledge graph relationships
 */

const MICROSERVICE_SCHEMAS = {
  'hr-reporting-service': {
    service_name: 'hr-reporting-service',
    description: 'HR & Management Reporting',
    version: '1.0.0',
    
    // Database storage
    storage: {
      table: 'microservice_data',  // Generic table for all microservice data
      id_field: 'report_name',      // Use this as unique identifier
      timestamp_field: 'generated_at'
    },
    
    // Vectorization strategy
    vectorization: {
      enabled: true,
      fields: [
        {
          name: 'report_name',
          weight: 1.0,
          transform: (value) => value  // Use as-is
        },
        {
          name: 'conclusions.summary',
          weight: 2.0,  // Summary is more important
          transform: (value) => value
        },
        {
          name: 'conclusions.improvement_areas',
          weight: 1.5,
          transform: (arr) => Array.isArray(arr) ? arr.join(', ') : ''
        }
      ],
      // How to combine fields into text for embedding
      combineStrategy: 'weighted_concat'  // or 'json' or 'custom'
    },
    
    // Knowledge graph extraction
    knowledge_graph: {
      enabled: true,
      
      // Extract entities from this data
      entities: [
        {
          type: 'report',
          id_from: 'report_name',
          properties: ['generated_at', 'conclusions.total_employees_reviewed']
        },
        {
          type: 'improvement_area',
          id_from: 'conclusions.improvement_areas[]',  // Array notation
          is_array: true
        }
      ],
      
      // Extract relationships
      relationships: [
        {
          type: 'CONTAINS',
          from_entity: 'report',
          to_entity: 'improvement_area',
          properties: ['generated_at']
        }
      ]
    },
    
    // Field mapping to internal structure
    field_mapping: {
      'report_name': 'content_id',
      'generated_at': 'timestamp',
      'conclusions': 'metadata'
    }
  }
  
  // Placeholder for future microservices
  // To add a new microservice, just add another entry here:
  /*
  'user-service': {
    service_name: 'user-service',
    storage: { ... },
    vectorization: { ... },
    knowledge_graph: { ... }
  }
  */
};

/**
 * Get schema for a microservice
 * @param {string} serviceName - Name of the microservice
 * @returns {Object} Schema configuration
 */
export function getSchema(serviceName) {
  const schema = MICROSERVICE_SCHEMAS[serviceName];
  
  if (!schema) {
    throw new Error(`Schema not found for service: ${serviceName}`);
  }
  
  return schema;
}

/**
 * Check if schema exists for a service
 * @param {string} serviceName - Name of the microservice
 * @returns {boolean} True if schema exists
 */
export function hasSchema(serviceName) {
  return serviceName in MICROSERVICE_SCHEMAS;
}

/**
 * Get all registered service names
 * @returns {string[]} Array of service names
 */
export function getRegisteredServices() {
  return Object.keys(MICROSERVICE_SCHEMAS);
}

export { MICROSERVICE_SCHEMAS };

