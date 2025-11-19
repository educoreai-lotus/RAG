/**
 * Routing Engine Service
 * Merges vector search results with Coordinator real-time data
 * Creates final answer context bundle for LLM
 */

import { logger } from '../utils/logger.util.js';

/**
 * Merge vector search results with Coordinator data
 * Combines internal RAG results with real-time Coordinator data
 * 
 * @param {Array} vectorResults - Results from internal vector search
 * @param {Object} coordinatorData - Structured data from Coordinator
 * @returns {Object} Merged results
 */
export function mergeResults(vectorResults = [], coordinatorData = {}) {
  try {
    const merged = {
      sources: [],
      context: '',
      metadata: {
        internal_sources: 0,
        coordinator_sources: 0,
        merged_at: new Date().toISOString(),
      },
    };

    // Add vector search results (internal sources)
    if (Array.isArray(vectorResults) && vectorResults.length > 0) {
      const internalSources = vectorResults.map((vec) => ({
        sourceId: vec.contentId || vec.sourceId || `internal-${vec.id}`,
        sourceType: vec.contentType || vec.sourceType || 'internal',
        sourceMicroservice: vec.microserviceId || 'rag',
        title: vec.metadata?.title || vec.title || `${vec.contentType}:${vec.contentId}`,
        contentSnippet: vec.contentText?.substring(0, 200) || vec.contentSnippet || '',
        sourceUrl: vec.metadata?.url || vec.sourceUrl || `/${vec.contentType}/${vec.contentId}`,
        relevanceScore: vec.similarity || vec.relevanceScore || 0.5,
        metadata: {
          ...(vec.metadata || {}),
          source: 'internal',
          via: 'vector_search',
        },
      }));

      merged.sources.push(...internalSources);
      merged.metadata.internal_sources = internalSources.length;
    }

    // Add Coordinator results (real-time sources)
    if (coordinatorData.sources && Array.isArray(coordinatorData.sources)) {
      merged.sources.push(...coordinatorData.sources);
      merged.metadata.coordinator_sources = coordinatorData.sources.length;
    }

    // Sort by relevance score (highest first)
    merged.sources.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    // Build context string from merged sources
    merged.context = merged.sources
      .map((source, idx) => {
        const sourceLabel = source.sourceMicroservice === 'rag' ? 'Internal' : 'Real-time';
        return `[${sourceLabel} Source ${idx + 1}]: ${source.contentSnippet}`;
      })
      .join('\n\n');

    logger.info('Merged vector and Coordinator results', {
      total_sources: merged.sources.length,
      internal_sources: merged.metadata.internal_sources,
      coordinator_sources: merged.metadata.coordinator_sources,
    });

    return merged;
  } catch (error) {
    logger.error('Error merging results', {
      error: error.message,
    });
    // Return fallback with just vector results
    return {
      sources: vectorResults || [],
      context: '',
      metadata: {
        internal_sources: vectorResults?.length || 0,
        coordinator_sources: 0,
        error: error.message,
      },
    };
  }
}

/**
 * Create final answer context bundle
 * Prepares complete context for LLM with all merged data
 * 
 * @param {Object} mergedData - Merged results from mergeResults()
 * @param {string} query - Original user query
 * @param {Object} options - Additional options
 * @returns {Object} Final context bundle
 */
export function createContextBundle(mergedData = {}, query = '', options = {}) {
  try {
    const bundle = {
      query,
      sources: mergedData.sources || [],
      context: mergedData.context || '',
      metadata: {
        ...mergedData.metadata,
        ...options,
        bundle_created_at: new Date().toISOString(),
      },
    };

    // Add summary of sources
    bundle.source_summary = {
      total: bundle.sources.length,
      internal: bundle.metadata.internal_sources || 0,
      coordinator: bundle.metadata.coordinator_sources || 0,
      by_type: {},
    };

    // Count sources by type
    bundle.sources.forEach((source) => {
      const type = source.sourceType || 'unknown';
      bundle.source_summary.by_type[type] = (bundle.source_summary.by_type[type] || 0) + 1;
    });

    logger.debug('Created context bundle', {
      sources_count: bundle.sources.length,
      context_length: bundle.context.length,
    });

    return bundle;
  } catch (error) {
    logger.error('Error creating context bundle', {
      error: error.message,
    });
    return {
      query,
      sources: [],
      context: '',
      metadata: {
        error: error.message,
      },
    };
  }
}

/**
 * Handle missing fields, soft failures, and fallback logic
 * 
 * @param {Object} data - Data to check
 * @param {Array} errors - Array of errors encountered
 * @returns {Object} Handled data with fallbacks applied
 */
export function handleFallbacks(data = {}, errors = []) {
  try {
    const handled = {
      ...data,
      fallbacks_applied: [],
      errors: errors || [],
    };

    // If no sources, provide fallback message
    if (!handled.sources || handled.sources.length === 0) {
      handled.fallbacks_applied.push('no_sources');
      handled.context = 'No relevant sources found. Please try rephrasing your query or adding more content to the knowledge base.';
      handled.sources = [];
    }

    // If context is empty, create minimal context
    if (!handled.context || handled.context.trim().length === 0) {
      handled.fallbacks_applied.push('empty_context');
      if (handled.sources && handled.sources.length > 0) {
        handled.context = handled.sources
          .map((s, idx) => `[Source ${idx + 1}]: ${s.contentSnippet || s.title || 'No content available'}`)
          .join('\n\n');
      }
    }

    // If Coordinator failed but we have internal data, use internal only
    if (errors.some(e => e.type === 'coordinator_error') && handled.metadata?.internal_sources > 0) {
      handled.fallbacks_applied.push('coordinator_fallback');
      logger.info('Using internal data only due to Coordinator failure', {
        internal_sources: handled.metadata.internal_sources,
      });
    }

    logger.debug('Applied fallbacks', {
      fallbacks: handled.fallbacks_applied,
      errors_count: handled.errors.length,
    });

    return handled;
  } catch (error) {
    logger.error('Error handling fallbacks', {
      error: error.message,
    });
    return {
      sources: [],
      context: 'An error occurred while processing your query. Please try again.',
      metadata: {
        error: error.message,
        fallbacks_applied: ['error_fallback'],
      },
    };
  }
}

