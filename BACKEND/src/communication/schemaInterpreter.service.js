/**
 * Schema Interpreter Service
 * Interprets Coordinator normalized_fields and converts them to structured fields usable by RAG
 */

import { logger } from '../utils/logger.util.js';

/**
 * Extract readable text from any object structure (generic extraction)
 * Tries multiple common field names and structures
 * 
 * @param {*} item - Any object or value
 * @returns {string} Extracted text content
 */
function extractTextFromObject(item, depth = 0) {
  const maxDepth = 5; // Prevent infinite recursion
  if (depth > maxDepth) {
    logger.warn('🔍 [EXTRACT TEXT] Max depth reached', { depth });
    return '';
  }

  if (!item || typeof item !== 'object') {
    return typeof item === 'string' ? item : '';
  }

  // Common text field names (in priority order)
  const textFields = [
    'content', 'text', 'description', 'body', 'summary', 'message', 
    'value', 'data', 'details', 'info', 'contentText', 'snippet'
  ];

  // Try common text fields first
  for (const field of textFields) {
    if (item[field]) {
      if (typeof item[field] === 'string' && item[field].trim().length > 0) {
        logger.debug('🔍 [EXTRACT TEXT] Found text field', { field, text_length: item[field].length, depth });
        return item[field];
      }
      if (Array.isArray(item[field])) {
        logger.debug('🔍 [EXTRACT TEXT] Found array field', { field, array_length: item[field].length, depth });
        // If field is array, try to extract from items
        const extracted = item[field]
          .map(subItem => extractTextFromObject(subItem, depth + 1))
          .filter(text => text && text.trim().length > 0)
          .join('\n');
        if (extracted) {
          logger.debug('🔍 [EXTRACT TEXT] Extracted from array field', { field, extracted_length: extracted.length });
          return extracted;
        }
      }
    }
  }

  // Try to extract from arrays of objects
  if (Array.isArray(item)) {
    return item
      .map(subItem => extractTextFromObject(subItem))
      .filter(text => text && text.trim().length > 0)
      .join('\n');
  }

  // Try nested structures (common patterns)
  // For conclusions-like structures: { conclusions: [...] } or { items: [...] }
  const nestedArrayFields = ['conclusions', 'items', 'results', 'data', 'list', 'entries'];
  for (const field of nestedArrayFields) {
    if (item[field] && Array.isArray(item[field])) {
      logger.debug('🔍 [EXTRACT TEXT] Found nested array field', { field, array_length: item[field].length, depth });
      const extracted = item[field]
        .map((c, idx) => {
          // Try common fields in array items
          const statement = c.statement || c.text || c.content || c.description || c.title || '';
          const rationale = c.rationale || c.reason || c.explanation || '';
          const value = c.value || c.data || '';
          
          let itemText = '';
          if (statement) itemText = statement;
          if (rationale) itemText += (itemText ? ` (${rationale})` : rationale);
          if (value && !itemText) itemText = String(value);
          
          // If still no text, try extracting from the whole object
          if (!itemText) {
            const extractedFromObj = extractTextFromObject(c, depth + 1);
            if (extractedFromObj) itemText = extractedFromObj;
          }
          
          return itemText ? `${idx + 1}. ${itemText}` : null;
        })
        .filter(Boolean)
        .join('\n');
      if (extracted) {
        logger.debug('🔍 [EXTRACT TEXT] Extracted from nested array field', { field, extracted_length: extracted.length });
        return extracted;
      }
    } else if (item[field] && typeof item[field] === 'object' && !Array.isArray(item[field]) && item[field].conclusions) {
      // Handle nested structure: { conclusions: { conclusions: [...] } }
      logger.debug('🔍 [EXTRACT TEXT] Found nested conclusions structure', { field, depth });
      const nestedItem = item[field];
      if (Array.isArray(nestedItem.conclusions)) {
        const extracted = nestedItem.conclusions
          .map((c, idx) => {
            const statement = c.statement || c.text || c.content || c.description || '';
            const rationale = c.rationale || c.reason || c.explanation || '';
            return statement ? `${idx + 1}. ${statement}${rationale ? ` (${rationale})` : ''}` : null;
          })
          .filter(Boolean)
          .join('\n');
        if (extracted) {
          logger.debug('🔍 [EXTRACT TEXT] Extracted from nested conclusions', { extracted_length: extracted.length });
          return extracted;
        }
      }
    }
  }

  // Try to extract from object values (recursive)
  const values = Object.values(item).filter(v => 
    v !== null && v !== undefined && (typeof v === 'string' || typeof v === 'object')
  );
  if (values.length > 0) {
    const extracted = values
      .map(v => extractTextFromObject(v))
      .filter(text => text && text.trim().length > 0)
      .join('\n');
    if (extracted) return extracted;
  }

  // Fallback: try to stringify, but remove quotes and braces for readability
  try {
    const json = JSON.stringify(item);
    // If JSON is too long or unreadable, return simplified version
    if (json.length > 500) {
      // Try to extract meaningful keys
      const keys = Object.keys(item).slice(0, 5);
      return keys.map(key => `${key}: ${typeof item[key] === 'string' ? item[key].substring(0, 100) : typeof item[key]}`).join('\n');
    }
    return json;
  } catch {
    return String(item);
  }
}

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
    logger.info('🔍 [CREATE STRUCTURED FIELDS] Starting', {
      has_coordinatorData: !!coordinatorData,
      target_services: coordinatorData.target_services || [],
      interpreted_content_count: interpretedFields.content?.length || 0,
      interpreted_metadata_keys: Object.keys(interpretedFields.metadata || {}),
      interpreted_fields_keys: Object.keys(interpretedFields.fields || {}),
    });

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

    logger.info('🔍 [CREATE STRUCTURED FIELDS] Converting content to sources', {
      content_count: structured.content.length,
      content_types: structured.content.map((item, idx) => ({
        index: idx,
        type: typeof item,
        is_array: Array.isArray(item),
        is_object: typeof item === 'object',
        keys: typeof item === 'object' && item !== null && !Array.isArray(item) ? Object.keys(item).slice(0, 10) : [],
      })),
    });

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
        // ⭐ GENERIC: Extract text from any object structure
        const contentText = extractTextFromObject(item);
        
        // Determine source type based on common patterns
        let sourceType = item.type || item.sourceType || 'coordinator';
        const targetService = structured.metadata.target_services?.[0] || 'coordinator';
        
        // Try to detect service-specific types
        if (item.report_name || item.report_id) {
          sourceType = 'management_reporting';
        } else if (targetService && targetService !== 'coordinator') {
          // Use service name as type hint
          sourceType = targetService.replace('-service', '').replace('-', '_');
        }
        
        // Extract title from common fields
        const title = item.title || item.name || item.report_name || item.label || 
                     item.subject || `Source ${index + 1}`;
        
        // Extract ID from common fields
        const sourceId = item.id || item.sourceId || item.report_id || 
                        item.identifier || `coordinator-${index}`;
        
        // Determine snippet length based on content type (longer for structured data)
        const isStructuredData = contentText.length > 200 || item.conclusions || item.items || item.data;
        const maxSnippetLength = isStructuredData ? 1500 : 500;
        
        return {
          sourceId,
          sourceType,
          sourceMicroservice: item.microservice || targetService,
          title,
          contentSnippet: contentText.substring(0, maxSnippetLength),
          sourceUrl: item.url || item.sourceUrl || item.link || '',
          relevanceScore: item.relevanceScore || item.score || item.confidence || 0.75,
          metadata: {
            ...structured.metadata,
            ...(item.metadata || {}),
            // Preserve all original fields for reference
            ...Object.fromEntries(
              Object.entries(item).filter(([key]) => 
                !['content', 'text', 'description', 'body'].includes(key)
              )
            ),
            index,
          },
        };
      }
      return null;
    }).filter(Boolean);

    structured.sources = sources;

    logger.info('🔍 [CREATE STRUCTURED FIELDS] Conversion completed', {
      sources_count: structured.sources.length,
      has_envelope: !!structured.envelope,
      sources_preview: sources.slice(0, 3).map(s => ({
        sourceId: s.sourceId,
        sourceType: s.sourceType,
        title: s.title,
        contentSnippet_length: s.contentSnippet?.length || 0,
        contentSnippet_preview: s.contentSnippet?.substring(0, 100) || 'empty',
      })),
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

