/**
 * Schema Interpreter Service
 * Interprets Coordinator normalized_fields and converts them to structured fields usable by RAG
 */

import { logger } from '../utils/logger.util.js';

/**
 * Interpret normalized fields from Coordinator
 * Converts Coordinator's normalized_fields map into structured fields for RAG
 * 
 * @param {Object} normalizedFields - Map<string, string> from Coordinator response
 * @returns {Object} Structured fields object
 */
export function interpretNormalizedFields(normalizedFields = {}) {
  try {
    if (!normalizedFields || typeof normalizedFields !== 'object') {
      return {};
    }

    const structured = {
      content: [],
      metadata: {},
      fields: {},
    };

    // Process each normalized field
    Object.entries(normalizedFields).forEach(([key, value]) => {
      // Try to parse JSON values
      let parsedValue = value;
      if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        try {
          parsedValue = JSON.parse(value);
        } catch (_e) {
          // Keep as string if parsing fails
          parsedValue = value;
        }
      }

      // Categorize fields based on key patterns
      // ⭐ NEW: Handle 'data' field specifically (managementreporting-service format)
      // Expected structure: { request_id, success, data: [...], metadata: {...} }
      if (key === 'data') {
        if (Array.isArray(parsedValue)) {
          // Direct array format
          structured.content.push(...parsedValue);
        } else if (typeof parsedValue === 'object' && parsedValue !== null && Array.isArray(parsedValue.data)) {
          // New format: { request_id, success, data: [...], metadata: {...} }
          // Extract the data array from the object
          structured.content.push(...parsedValue.data);
          
          // Also extract metadata if present
          if (parsedValue.metadata && typeof parsedValue.metadata === 'object') {
            structured.metadata = { ...structured.metadata, ...parsedValue.metadata };
          }
          
          // Store request_id and success in fields
          if (parsedValue.request_id) {
            structured.fields.request_id = parsedValue.request_id;
          }
          if (parsedValue.success !== undefined) {
            structured.fields.success = parsedValue.success;
          }
        } else if (typeof parsedValue === 'object' && parsedValue !== null) {
          // Object but not the expected format - store as field
          structured.fields[key] = parsedValue;
        } else {
          // String or other type
          structured.fields[key] = parsedValue;
        }
      } else if (key.includes('content') || key.includes('text')) {
        // Old format: content or text fields
        if (Array.isArray(parsedValue)) {
          structured.content.push(...parsedValue);
        } else {
          structured.content.push(parsedValue);
        }
      } else if (key.includes('metadata') || key.includes('meta')) {
        if (typeof parsedValue === 'object' && parsedValue !== null) {
          structured.metadata = { ...structured.metadata, ...parsedValue };
        } else {
          structured.metadata[key] = parsedValue;
        }
      } else {
        // Store as general field
        structured.fields[key] = parsedValue;
      }
    });

    logger.debug('Interpreted normalized fields', {
      content_items: structured.content.length,
      metadata_keys: Object.keys(structured.metadata).length,
      field_keys: Object.keys(structured.fields).length,
    });

    return structured;
  } catch (error) {
    logger.error('Error interpreting normalized fields', {
      error: error.message,
    });
    return {
      content: [],
      metadata: {},
      fields: {},
    };
  }
}

/**
 * Create structured fields for vector search combination
 * Prepares unified object that can be combined with vector search results
 * 
 * @param {Object} coordinatorData - Processed Coordinator response
 * @param {Object} interpretedFields - Interpreted normalized fields
 * @returns {Object} Unified structured object
 */
export function createStructuredFields(coordinatorData = {}, interpretedFields = {}) {
  try {
    const structured = {
      // Content from Coordinator
      content: interpretedFields.content || [],
      
      // Metadata
      metadata: {
        ...interpretedFields.metadata,
        source: 'coordinator',
        target_services: coordinatorData.target_services || [],
        timestamp: new Date().toISOString(),
      },
      
      // Additional fields
      fields: interpretedFields.fields || {},
      
      // Envelope data if available
      envelope: coordinatorData.envelope || null,
      
      // Routing metadata
      routing: coordinatorData.metadata || null,
    };

    // Convert content array to sources format (compatible with RAG sources)
    const sources = structured.content.map((item, index) => {
      if (typeof item === 'string') {
        return {
          sourceId: `coordinator-${index}`,
          sourceType: 'coordinator',
          sourceMicroservice: structured.metadata.target_services?.[0] || 'coordinator',
          title: `Coordinator Source ${index + 1}`,
          contentSnippet: item.substring(0, 200),
          sourceUrl: '',
          relevanceScore: 0.75, // Default relevance for Coordinator data
          metadata: {
            ...structured.metadata,
            index,
          },
        };
      } else if (typeof item === 'object' && item !== null) {
        // ⭐ NEW: Handle managementreporting-service format
        // Expected: { report_name, generated_at, conclusions, ... }
        const isReportFormat = item.report_name && item.generated_at;
        
        if (isReportFormat) {
          // Format for managementreporting-service reports
          // Extract conclusions text from structure: { conclusions: [{ statement, rationale, confidence }, ...] }
          let conclusionsText = '';
          if (item.conclusions) {
            if (typeof item.conclusions === 'string') {
              // Already a string
              conclusionsText = item.conclusions;
            } else if (item.conclusions.conclusions && Array.isArray(item.conclusions.conclusions)) {
              // Structure: { conclusions: [...] }
              conclusionsText = item.conclusions.conclusions
                .map((c, idx) => {
                  const statement = c.statement || c.text || '';
                  const rationale = c.rationale ? ` (${c.rationale})` : '';
                  return `${idx + 1}. ${statement}${rationale}`;
                })
                .join('\n');
            } else if (Array.isArray(item.conclusions)) {
              // Direct array
              conclusionsText = item.conclusions
                .map((c, idx) => {
                  const statement = c.statement || c.text || '';
                  const rationale = c.rationale ? ` (${c.rationale})` : '';
                  return `${idx + 1}. ${statement}${rationale}`;
                })
                .join('\n');
            } else {
              // Fallback to JSON
              conclusionsText = JSON.stringify(item.conclusions);
            }
          }
          
          const contentText = conclusionsText || 
            item.content || 
            item.text || 
            item.description || 
            JSON.stringify(item);
          
          return {
            sourceId: item.id || item.report_id || `coordinator-report-${index}`,
            sourceType: 'management_reporting',
            sourceMicroservice: structured.metadata.target_services?.[0] || 'managementreporting-service',
            title: item.report_name || `Report ${index + 1}`,
            contentSnippet: contentText.substring(0, 500), // Longer snippet for reports
            sourceUrl: item.url || item.sourceUrl || '',
            relevanceScore: item.relevanceScore || item.score || 0.75,
            metadata: {
              ...structured.metadata,
              ...(item.metadata || {}),
              report_name: item.report_name,
              generated_at: item.generated_at,
              report_type: item.report_type,
              index,
            },
          };
        } else {
          // Generic object format
          return {
            sourceId: item.id || item.sourceId || `coordinator-${index}`,
            sourceType: item.type || item.sourceType || 'coordinator',
            sourceMicroservice: item.microservice || structured.metadata.target_services?.[0] || 'coordinator',
            title: item.title || item.name || `Coordinator Source ${index + 1}`,
            contentSnippet: item.content || item.text || item.description || JSON.stringify(item).substring(0, 200),
            sourceUrl: item.url || item.sourceUrl || '',
            relevanceScore: item.relevanceScore || item.score || 0.75,
            metadata: {
              ...structured.metadata,
              ...(item.metadata || {}),
              index,
            },
          };
        }
      }
      return null;
    }).filter(Boolean);

    structured.sources = sources;

    logger.debug('Created structured fields', {
      sources_count: structured.sources.length,
      has_envelope: !!structured.envelope,
    });

    return structured;
  } catch (error) {
    logger.error('Error creating structured fields', {
      error: error.message,
    });
    return {
      content: [],
      metadata: {},
      fields: {},
      sources: [],
    };
  }
}

