/**
 * Knowledge Graph Service
 * Read helpers for knowledge graph progress and relations
 */

import { getPrismaClient } from '../config/database.config.js';
import { logger } from '../utils/logger.util.js';
import { KG_CONFIG } from '../config/knowledgeGraph.config.js';
import { getSchema } from '../schemas/microserviceSchemas.js';

/**
 * Get a user's progress toward a given skill from KG edges.
 * Looks for edge: source=user:{userId}, target=skill:{skillId}, edgeType='learning'
 *
 * @param {string} tenantId
 * @param {string} userId
 * @param {string} skillIdOrNodeId - e.g., 'javascript' or 'skill:javascript'
 * @returns {Promise<{progress: number|null, weight: number|null, edge: object|null}>}
 */
export async function getUserSkillProgress(tenantId, userId, skillIdOrNodeId) {
  const prisma = await getPrismaClient();

  const sourceNodeId = `user:${userId}`;
  const targetNodeId = skillIdOrNodeId.startsWith('skill:')
    ? skillIdOrNodeId
    : `skill:${skillIdOrNodeId}`;

  const edge = await prisma.knowledgeGraphEdge.findFirst({
    where: {
      tenantId,
      sourceNodeId,
      targetNodeId,
      edgeType: 'learning',
    },
  });

  if (!edge) {
    return { progress: null, weight: null, edge: null };
  }

  const progress =
    edge.properties && typeof edge.properties.progress === 'number'
      ? edge.properties.progress
      : null;

  const weightNumber =
    typeof edge.weight === 'object' && edge.weight !== null && 'toNumber' in edge.weight
      ? edge.weight.toNumber()
      : typeof edge.weight === 'number'
      ? edge.weight
      : null;

  return { progress, weight: weightNumber, edge };
}

/**
 * Find nodes connected to given content IDs via specific edge types
 * @param {string} tenantId - Tenant identifier
 * @param {string[]} contentIds - Array of content IDs (e.g., ["doc1", "doc2"])
 * @param {string[]} edgeTypes - Edge types to traverse (e.g., ["supports", "related", "prerequisite"])
 * @param {number} maxDepth - Maximum traversal depth (default: 1)
 * @returns {Promise<Array>} Array of related nodes with their relationships
 */
export async function findRelatedNodes(tenantId, contentIds, edgeTypes = KG_CONFIG.EDGE_TYPES, maxDepth = KG_CONFIG.MAX_TRAVERSAL_DEPTH) {
  const prisma = await getPrismaClient();
  const startTime = Date.now();

  try {
    logger.info('KG: Finding related nodes', {
      tenantId,
      contentCount: contentIds.length,
      edgeTypes,
      maxDepth
    });

    if (!contentIds || contentIds.length === 0) {
      return [];
    }

    // Convert contentIds to node IDs (e.g., "doc1" → "content:doc1")
    const nodeIds = contentIds.map(id => 
      id.startsWith('content:') ? id : `content:${id}`
    );

    // Find edges where sourceNodeId is in our content node IDs
    const edges = await prisma.knowledgeGraphEdge.findMany({
      where: {
        tenantId,
        sourceNodeId: { in: nodeIds },
        edgeType: { in: edgeTypes },
        ...(KG_CONFIG.MIN_EDGE_WEIGHT > 0 && {
          weight: { gte: KG_CONFIG.MIN_EDGE_WEIGHT }
        })
      },
      include: {
        targetNode: true
      },
      take: KG_CONFIG.MAX_RELATED_NODES * contentIds.length // Limit total results
    });

    // Map edges to result format
    const results = edges.map(edge => {
      const weightNumber = typeof edge.weight === 'object' && edge.weight !== null && 'toNumber' in edge.weight
        ? edge.weight.toNumber()
        : typeof edge.weight === 'number'
        ? edge.weight
        : 0.5; // Default weight if null

      return {
        nodeId: edge.targetNode.nodeId,
        nodeType: edge.targetNode.nodeType,
        properties: edge.targetNode.properties || {},
        edgeType: edge.edgeType,
        weight: weightNumber,
        depth: 1,
        sourceNodeId: edge.sourceNodeId,
        targetNodeId: edge.targetNodeId
      };
    });

    // If maxDepth > 1, recursively traverse from targetNodes
    if (maxDepth > 1 && results.length > 0) {
      const targetNodeIds = [...new Set(results.map(r => r.nodeId))];
      const deeperResults = await findRelatedNodes(
        tenantId,
        targetNodeIds,
        edgeTypes,
        maxDepth - 1
      );

      // Add depth information to deeper results
      const deeperWithDepth = deeperResults.map(r => ({
        ...r,
        depth: r.depth + 1
      }));

      results.push(...deeperWithDepth);
    }

    // Remove duplicates based on nodeId + edgeType combination
    const uniqueResults = results.reduce((acc, current) => {
      const key = `${current.nodeId}:${current.edgeType}`;
      if (!acc.has(key)) {
        acc.set(key, current);
      } else {
        // Keep the one with higher weight
        const existing = acc.get(key);
        if (current.weight > existing.weight) {
          acc.set(key, current);
        }
      }
      return acc;
    }, new Map());

    const finalResults = Array.from(uniqueResults.values());

    logger.info('KG: Related nodes found', {
      tenantId,
      relationsCount: finalResults.length,
      nodeTypes: [...new Set(finalResults.map(r => r.nodeType))],
      edgeTypes: [...new Set(finalResults.map(r => r.edgeType))],
      executionTimeMs: Date.now() - startTime
    });

    return finalResults;
  } catch (error) {
    logger.error('KG: Failed to find related nodes', {
      tenantId,
      error: error.message,
      stack: error.stack,
      executionTimeMs: Date.now() - startTime
    });
    throw error;
  }
}

/**
 * Boost vector search results based on KG relationships
 * @param {Array} vectorResults - Results from vector search
 * @param {Array} kgRelations - Related nodes from KG
 * @param {Object} boostConfig - Boost multipliers per edge type
 * @returns {Promise<Array>} Results with adjusted similarity scores
 */
export async function boostResultsByKG(vectorResults, kgRelations, boostConfig = KG_CONFIG.BOOST_WEIGHTS) {
  const startTime = Date.now();

  try {
    logger.info('KG: Boosting results', {
      vectorResultsCount: vectorResults.length,
      kgRelationsCount: kgRelations.length
    });

    if (!kgRelations || kgRelations.length === 0) {
      return vectorResults;
    }

    // Create a map of contentId -> array of KG relations
    const contentIdToRelations = new Map();

    for (const relation of kgRelations) {
      // Extract content ID from nodeId (e.g., "content:doc1" -> "doc1")
      const contentId = relation.nodeId.startsWith('content:')
        ? relation.nodeId.replace('content:', '')
        : relation.nodeId;

      if (!contentIdToRelations.has(contentId)) {
        contentIdToRelations.set(contentId, []);
      }
      contentIdToRelations.get(contentId).push(relation);
    }

    // Boost each vector result
    const boostedResults = vectorResults.map(result => {
      const contentId = result.contentId;
      const relations = contentIdToRelations.get(contentId) || [];

      if (relations.length === 0) {
        return {
          ...result,
          kgBoost: 0,
          relatedNodeIds: [],
          edgeTypes: []
        };
      }

      // Calculate total boost from all relations
      let totalBoost = 0;
      const relatedNodeIds = [];
      const edgeTypes = [];

      for (const relation of relations) {
        const edgeTypeBoost = boostConfig[relation.edgeType] || 0;
        const relationBoost = relation.weight * edgeTypeBoost;
        totalBoost += relationBoost;

        relatedNodeIds.push(relation.nodeId);
        if (!edgeTypes.includes(relation.edgeType)) {
          edgeTypes.push(relation.edgeType);
        }
      }

      // Apply boost: newSimilarity = min(1.0, similarity + boost)
      const newSimilarity = Math.min(1.0, result.similarity + totalBoost);

      return {
        ...result,
        similarity: newSimilarity,
        kgBoost: totalBoost,
        relatedNodeIds,
        edgeTypes,
        originalSimilarity: result.similarity
      };
    });

    // Re-sort results by newSimilarity (descending)
    boostedResults.sort((a, b) => b.similarity - a.similarity);

    logger.info('KG: Results boosted', {
      boostedCount: boostedResults.filter(r => r.kgBoost > 0).length,
      maxBoost: Math.max(...boostedResults.map(r => r.kgBoost || 0)),
      executionTimeMs: Date.now() - startTime
    });

    return boostedResults;
  } catch (error) {
    logger.error('KG: Failed to boost results', {
      error: error.message,
      stack: error.stack,
      executionTimeMs: Date.now() - startTime
    });
    // Return original results on error (graceful degradation)
    return vectorResults;
  }
}

/**
 * Get user's current skills and learning paths from KG
 * @param {string} tenantId - Tenant identifier
 * @param {string} userId - User identifier
 * @returns {Promise<Object>} User context with skills and progress
 */
export async function getUserLearningContext(tenantId, userId) {
  const prisma = await getPrismaClient();
  const startTime = Date.now();

  try {
    logger.info('KG: Getting user learning context', {
      tenantId,
      userId
    });

    if (!userId || userId === 'anonymous' || userId === 'guest') {
      return {
        skills: [],
        relevantContentIds: []
      };
    }

    const sourceNodeId = `user:${userId}`;

    // Step 1: Find edges: user:${userId} --learning--> skill:*
    const learningEdges = await prisma.knowledgeGraphEdge.findMany({
      where: {
        tenantId,
        sourceNodeId,
        edgeType: 'learning'
      },
      include: {
        targetNode: true
      }
    });

    // Step 2: Get edge properties (progress, weight)
    const skills = learningEdges.map(edge => {
      const progress = edge.properties && typeof edge.properties.progress === 'number'
        ? edge.properties.progress
        : null;

      const weightNumber = typeof edge.weight === 'object' && edge.weight !== null && 'toNumber' in edge.weight
        ? edge.weight.toNumber()
        : typeof edge.weight === 'number'
        ? edge.weight
        : 0.5;

      return {
        skillId: edge.targetNode.nodeId,
        skillType: edge.targetNode.nodeType,
        progress,
        weight: weightNumber,
        properties: edge.targetNode.properties || {}
      };
    });

    // Step 3: Find edges: skill:* --supports--> content:*
    const skillNodeIds = skills.map(s => s.skillId);
    const relevantContentIds = [];

    if (skillNodeIds.length > 0) {
      const contentEdges = await prisma.knowledgeGraphEdge.findMany({
        where: {
          tenantId,
          sourceNodeId: { in: skillNodeIds },
          edgeType: 'supports'
        },
        select: {
          targetNodeId: true
        },
        take: 100 // Limit to prevent excessive queries
      });

      // Extract content IDs from targetNodeIds (e.g., "content:doc1" -> "doc1")
      for (const edge of contentEdges) {
        if (edge.targetNodeId.startsWith('content:')) {
          const contentId = edge.targetNodeId.replace('content:', '');
          if (!relevantContentIds.includes(contentId)) {
            relevantContentIds.push(contentId);
          }
        }
      }
    }

    logger.info('KG: User learning context retrieved', {
      tenantId,
      userId,
      skillCount: skills.length,
      relevantContentCount: relevantContentIds.length,
      executionTimeMs: Date.now() - startTime
    });

    return {
      skills,
      relevantContentIds
    };
  } catch (error) {
    logger.error('KG: Failed to get user learning context', {
      tenantId,
      userId,
      error: error.message,
      stack: error.stack,
      executionTimeMs: Date.now() - startTime
    });
    // Return empty context on error (graceful degradation)
    return {
      skills: [],
      relevantContentIds: []
    };
  }
}

/**
 * Expand vector search results by following KG relationships
 * @param {Array} vectorResults - Initial vector search results
 * @param {string} tenantId - Tenant identifier
 * @param {Array} queryEmbedding - Original query embedding for scoring expanded results
 * @returns {Promise<Array>} Expanded results including KG-discovered content
 */
export async function expandResultsWithKG(vectorResults, tenantId, queryEmbedding) {
  const prisma = await getPrismaClient();
  const startTime = Date.now();

  try {
    logger.info('KG: Expanding results', {
      tenantId,
      initialResultsCount: vectorResults.length
    });

    if (!KG_CONFIG.FEATURES.QUERY_EXPANSION) {
      logger.debug('KG: Query expansion disabled in config');
      return vectorResults;
    }

    // Step 1: Extract contentIds from vectorResults
    const contentIds = vectorResults
      .map(v => v.contentId)
      .filter(Boolean);

    if (contentIds.length === 0) {
      return vectorResults;
    }

    // Step 2: Call findRelatedNodes() to get related content
    const kgRelations = await findRelatedNodes(
      tenantId,
      contentIds,
      KG_CONFIG.EDGE_TYPES,
      KG_CONFIG.MAX_TRAVERSAL_DEPTH
    );

    // Step 3: Extract content node IDs from KG relations
    const relatedContentIds = kgRelations
      .filter(r => r.nodeId.startsWith('content:'))
      .map(r => r.nodeId.replace('content:', ''))
      .filter(id => !contentIds.includes(id)); // Exclude already found content

    if (relatedContentIds.length === 0) {
      logger.debug('KG: No new content found via KG expansion');
      return vectorResults;
    }

    // Step 4: Get vectors for related contentIds from vector_embeddings table
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    const escapedEmbeddingStr = embeddingStr.replace(/'/g, "''");
    const vectorLiteral = `'${escapedEmbeddingStr}'::vector`;

    // Build query to get embeddings for related content
    const contentIdPlaceholders = relatedContentIds.map((_, idx) => `$${idx + 2}`).join(', ');
    const query = `
      SELECT 
        id,
        tenant_id,
        microservice_id,
        content_id,
        content_type,
        content_text,
        chunk_index,
        metadata,
        created_at,
        1 - (embedding <=> ${vectorLiteral}) as similarity
      FROM vector_embeddings
      WHERE tenant_id = $1
        AND content_id IN (${contentIdPlaceholders})
      ORDER BY embedding <=> ${vectorLiteral}
      LIMIT $${relatedContentIds.length + 2}
    `;

    const params = [tenantId, ...relatedContentIds, Math.min(20, relatedContentIds.length)];
    const expandedResults = await prisma.$queryRawUnsafe(query, ...params);

    // Step 5: Map expanded results to consistent format
    const expandedVectors = expandedResults.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      microserviceId: row.microservice_id,
      contentId: row.content_id,
      contentType: row.content_type,
      contentText: row.content_text,
      chunkIndex: row.chunk_index,
      metadata: row.metadata || {},
      similarity: parseFloat(row.similarity),
      createdAt: row.created_at,
      fromKG: true // Mark as KG-discovered
    }));

    // Step 6: Merge with original results (avoid duplicates)
    const existingContentIds = new Set(vectorResults.map(v => v.contentId));
    const newExpandedVectors = expandedVectors.filter(v => !existingContentIds.has(v.contentId));

    // Combine and re-sort by similarity
    const combinedResults = [...vectorResults, ...newExpandedVectors];
    combinedResults.sort((a, b) => b.similarity - a.similarity);

    logger.info('KG: Results expanded', {
      tenantId,
      initialCount: vectorResults.length,
      expandedCount: newExpandedVectors.length,
      finalCount: combinedResults.length,
      executionTimeMs: Date.now() - startTime
    });

    return combinedResults;
  } catch (error) {
    logger.error('KG: Failed to expand results', {
      tenantId,
      error: error.message,
      stack: error.stack,
      executionTimeMs: Date.now() - startTime
    });
    // Return original results on error (graceful degradation)
    return vectorResults;
  }
}

/**
 * Add entity to knowledge graph
 * @param {string} tenantId - Tenant identifier
 * @param {Object} entity - Entity to add
 * @param {string} entity.type - Entity type (e.g., 'report', 'improvement_area')
 * @param {string} entity.id - Entity ID (nodeId)
 * @param {Object} entity.properties - Entity properties
 * @returns {Promise<Object>} Created or updated node
 */
export async function addEntity(tenantId, entity) {
  const prisma = await getPrismaClient();
  const startTime = Date.now();

  try {
    const { type, id, properties } = entity;

    logger.info('[KnowledgeGraph] Adding entity', {
      tenantId,
      type,
      id
    });

    // Format nodeId with type prefix if needed
    const nodeId = id.startsWith(`${type}:`) ? id : `${type}:${id}`;

    // Check if node already exists
    const existing = await prisma.knowledgeGraphNode.findFirst({
      where: {
        tenantId,
        nodeId
      }
    });

    if (existing) {
      // Update existing node
      const updated = await prisma.knowledgeGraphNode.update({
        where: { id: existing.id },
        data: {
          properties: properties || {},
          updatedAt: new Date()
        }
      });

      logger.info('[KnowledgeGraph] Entity updated', {
        tenantId,
        nodeId,
        executionTimeMs: Date.now() - startTime
      });

      return updated;
    } else {
      // Create new node
      const created = await prisma.knowledgeGraphNode.create({
        data: {
          tenantId,
          nodeId,
          nodeType: type,
          properties: properties || {}
        }
      });

      logger.info('[KnowledgeGraph] Entity created', {
        tenantId,
        nodeId,
        executionTimeMs: Date.now() - startTime
      });

      return created;
    }

  } catch (error) {
    logger.error('[KnowledgeGraph] Failed to add entity', {
      tenantId,
      entity,
      error: error.message,
      stack: error.stack,
      executionTimeMs: Date.now() - startTime
    });
    throw error;
  }
}

/**
 * Add relationship to knowledge graph
 * @param {string} tenantId - Tenant identifier
 * @param {Object} relationship - Relationship to add
 * @param {string} relationship.from_id - Source node ID
 * @param {string} relationship.to_id - Target node ID
 * @param {string} relationship.type - Edge type (e.g., 'CONTAINS', 'RELATED')
 * @param {Object} relationship.properties - Relationship properties
 * @param {number} relationship.weight - Edge weight (optional)
 * @returns {Promise<Object>} Created or updated edge
 */
export async function addRelationship(tenantId, relationship) {
  const prisma = await getPrismaClient();
  const startTime = Date.now();

  try {
    const { from_id, to_id, type, properties, weight } = relationship;

    logger.info('[KnowledgeGraph] Adding relationship', {
      tenantId,
      from: from_id,
      to: to_id,
      type
    });

    // Get source and target nodes (by nodeId)
    const sourceNode = await prisma.knowledgeGraphNode.findFirst({
      where: { 
        tenantId,
        nodeId: from_id 
      }
    });

    const targetNode = await prisma.knowledgeGraphNode.findFirst({
      where: { 
        tenantId,
        nodeId: to_id 
      }
    });

    if (!sourceNode) {
      throw new Error(`Source node not found: ${from_id}`);
    }

    if (!targetNode) {
      throw new Error(`Target node not found: ${to_id}`);
    }

    // Check if edge already exists
    const existing = await prisma.knowledgeGraphEdge.findFirst({
      where: {
        tenantId,
        sourceNodeId: sourceNode.nodeId,
        targetNodeId: targetNode.nodeId,
        edgeType: type
      }
    });

    if (existing) {
      // Update existing edge
      const updated = await prisma.knowledgeGraphEdge.update({
        where: { id: existing.id },
        data: {
          properties: properties || {},
          weight: weight !== undefined ? weight : existing.weight,
          updatedAt: new Date()
        }
      });

      logger.info('[KnowledgeGraph] Relationship updated', {
        tenantId,
        from: from_id,
        to: to_id,
        type,
        executionTimeMs: Date.now() - startTime
      });

      return updated;
    } else {
      // Create new edge
      const created = await prisma.knowledgeGraphEdge.create({
        data: {
          tenantId,
          sourceNodeId: sourceNode.nodeId,
          targetNodeId: targetNode.nodeId,
          edgeType: type,
          weight: weight !== undefined ? weight : 0.5,
          properties: properties || {}
        }
      });

      logger.info('[KnowledgeGraph] Relationship created', {
        tenantId,
        from: from_id,
        to: to_id,
        type,
        executionTimeMs: Date.now() - startTime
      });

      return created;
    }

  } catch (error) {
    logger.error('[KnowledgeGraph] Failed to add relationship', {
      tenantId,
      relationship,
      error: error.message,
      stack: error.stack,
      executionTimeMs: Date.now() - startTime
    });
    throw error;
  }
}

/**
 * Update graph with data from microservice
 * @param {string} tenantId - Tenant identifier
 * @param {string} serviceName - Name of the microservice
 * @param {Array} items - Array of data items
 * @returns {Promise<Object>} Update result
 */
export async function updateGraphFromData(tenantId, serviceName, items) {
  const startTime = Date.now();

  try {
    const schema = getSchema(serviceName);

    if (!schema.knowledge_graph.enabled) {
      logger.info('[KnowledgeGraph] Skipped - disabled for service', {
        tenantId,
        service: serviceName
      });
      return { success: true, entities: 0, relationships: 0 };
    }

    logger.info('[KnowledgeGraph] Updating graph', {
      tenantId,
      service: serviceName,
      items_count: items.length
    });

    let entitiesAdded = 0;
    let relationshipsAdded = 0;

    for (const item of items) {
      // Extract and add entities
      const entities = extractEntities(item, schema);
      for (const entity of entities) {
        await addEntity(tenantId, entity);
        entitiesAdded++;
      }

      // Extract and add relationships
      const relationships = extractRelationships(item, schema, entities);
      for (const rel of relationships) {
        await addRelationship(tenantId, rel);
        relationshipsAdded++;
      }
    }

    logger.info('[KnowledgeGraph] Graph update complete', {
      tenantId,
      service: serviceName,
      entities: entitiesAdded,
      relationships: relationshipsAdded,
      executionTimeMs: Date.now() - startTime
    });

    return {
      success: true,
      entities: entitiesAdded,
      relationships: relationshipsAdded
    };

  } catch (error) {
    logger.error('[KnowledgeGraph] Graph update failed', {
      tenantId,
      service: serviceName,
      error: error.message,
      stack: error.stack,
      executionTimeMs: Date.now() - startTime
    });
    throw error;
  }
}

/**
 * Extract entities from item based on schema
 * @param {Object} item - Data item
 * @param {Object} schema - Schema configuration
 * @returns {Array} Array of entity objects
 */
function extractEntities(item, schema) {
  const entities = [];

  for (const entityConfig of schema.knowledge_graph.entities) {
    if (entityConfig.is_array) {
      // Handle array fields
      const values = getNestedValue(item, entityConfig.id_from);
      if (Array.isArray(values)) {
        for (const value of values) {
          entities.push({
            type: entityConfig.type,
            id: String(value),
            properties: extractProperties(item, entityConfig.properties)
          });
        }
      }
    } else {
      // Handle single field
      const id = getNestedValue(item, entityConfig.id_from);
      if (id) {
        entities.push({
          type: entityConfig.type,
          id: String(id),
          properties: extractProperties(item, entityConfig.properties)
        });
      }
    }
  }

  return entities;
}

/**
 * Extract relationships from item based on schema
 * @param {Object} item - Data item
 * @param {Object} schema - Schema configuration
 * @param {Array} entities - Extracted entities
 * @returns {Array} Array of relationship objects
 */
function extractRelationships(item, schema, entities) {
  const relationships = [];

  for (const relConfig of schema.knowledge_graph.relationships) {
    // Find source entities
    const sourceEntities = entities.filter(e => e.type === relConfig.from_entity);
    // Find target entities
    const targetEntities = entities.filter(e => e.type === relConfig.to_entity);

    // Create relationships between all combinations
    for (const source of sourceEntities) {
      for (const target of targetEntities) {
        // Format node IDs with type prefix
        const fromId = source.id.startsWith(`${source.type}:`) ? source.id : `${source.type}:${source.id}`;
        const toId = target.id.startsWith(`${target.type}:`) ? target.id : `${target.type}:${target.id}`;

        relationships.push({
          from_id: fromId,
          to_id: toId,
          type: relConfig.type,
          properties: extractProperties(item, relConfig.properties)
        });
      }
    }
  }

  return relationships;
}

/**
 * Extract properties from item
 * @param {Object} item - Data item
 * @param {Array} propertyPaths - Array of property paths
 * @returns {Object} Extracted properties
 */
function extractProperties(item, propertyPaths) {
  if (!propertyPaths || !Array.isArray(propertyPaths)) return {};

  const properties = {};
  for (const path of propertyPaths) {
    const value = getNestedValue(item, path);
    if (value !== undefined) {
      properties[path] = value;
    }
  }
  return properties;
}

/**
 * Get nested value from object (helper function)
 * @param {Object} obj - Source object
 * @param {string} path - Dot-notation path
 * @returns {*} Value at path
 */
function getNestedValue(obj, path) {
  // Handle array notation
  if (path.includes('[]')) {
    const basePath = path.replace('[]', '');
    const value = getNestedValue(obj, basePath);
    return Array.isArray(value) ? value : [];
  }

  return path.split('.').reduce((current, key) => {
    return current?.[key];
  }, obj);
}


