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
        } catch (e) {
          // Keep as string if parsing fails
          parsedValue = value;
        }
      }

      // Categorize fields based on key patterns
      if (key.includes('content') || key.includes('text') || key.includes('data')) {
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
        return {
          sourceId: item.id || item.sourceId || `coordinator-${index}`,
          sourceType: item.type || item.sourceType || 'coordinator',
          sourceMicroservice: item.microservice || structured.metadata.target_services?.[0] || 'coordinator',
          title: item.title || item.name || `Coordinator Source ${index + 1}`,
          contentSnippet: item.content || item.text || item.description || '',
          sourceUrl: item.url || item.sourceUrl || '',
          relevanceScore: item.relevanceScore || item.score || 0.75,
          metadata: {
            ...structured.metadata,
            ...(item.metadata || {}),
            index,
          },
        };
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

