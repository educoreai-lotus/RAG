/**
 * Knowledge Graph configuration
 * Centralized configuration for KG features and behavior
 */

export const KG_CONFIG = {
  // Edge types to traverse during query expansion
  EDGE_TYPES: ['supports', 'related', 'prerequisite', 'part_of'],

  // Maximum depth for KG traversal
  MAX_TRAVERSAL_DEPTH: 1, // Increase to 2 for deeper relationships

  // Boost multipliers per edge type
  BOOST_WEIGHTS: {
    supports: 0.15,      // Content that supports a skill
    related: 0.10,       // Related content
    prerequisite: 0.08,  // Prerequisite content
    part_of: 0.05        // Part of a larger content
  },

  // User personalization boost
  USER_RELEVANCE_BOOST: 0.12,

  // Minimum edge weight to consider (0.0 - 1.0)
  MIN_EDGE_WEIGHT: 0.3,

  // Maximum number of related nodes to fetch per content
  MAX_RELATED_NODES: 10,

  // Enable/disable KG features
  FEATURES: {
    QUERY_EXPANSION: true,
    RESULT_BOOSTING: true,
    USER_PERSONALIZATION: true,
    KG_TRAVERSAL: true
  }
};

