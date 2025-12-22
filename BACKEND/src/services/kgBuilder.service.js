import { logger } from '../utils/logger.util.js';

// Lazy-load dependencies to avoid breaking if not available
let prismaClient = null;
let openaiClient = null;

async function getPrisma() {
  if (!prismaClient) {
    try {
      const { getPrismaClient } = await import('../config/database.config.js');
      prismaClient = getPrismaClient();
    } catch (e) {
      logger.warn('[KGBuilder] Prisma not available');
      return null;
    }
  }
  return prismaClient;
}

async function getOpenAI() {
  if (!openaiClient) {
    try {
      const { default: OpenAI } = await import('openai');
      openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    } catch (e) {
      logger.warn('[KGBuilder] OpenAI not available');
      return null;
    }
  }
  return openaiClient;
}

/**
 * Knowledge Graph Builder Service
 * Creates nodes and edges from stored content
 * 
 * ⚠️ This is OPTIONAL enhancement - failures should not break main flow!
 */
class KGBuilderService {
  /**
   * Build KG from stored content
   * Call this after storing in vector_embeddings
   * 
   * @param {string} contentId - Content identifier
   * @param {string} contentText - Full content text
   * @param {object} metadata - Metadata about the content
   * @param {string} tenantId - Tenant identifier
   */
  async buildFromContent(contentId, contentText, metadata, tenantId) {
    try {
      // Skip if missing required data
      if (!contentId || !contentText || !tenantId) {
        logger.debug('[KGBuilder] Skipping - missing required data');
        return { success: false, reason: 'Missing required data' };
      }

      const prisma = await getPrisma();
      if (!prisma) {
        return { success: false, reason: 'Prisma not available' };
      }

      logger.info('[KGBuilder] Building KG from content', {
        contentId: contentId,
        tenantId: tenantId,
        contentLength: contentText?.length || 0
      });

      // Step 1: Create node for this content
      const nodeId = await this.createContentNode(contentId, contentText, metadata, tenantId);

      // Step 2: Find related content and create edges (optional)
      try {
        await this.createRelationshipEdges(nodeId, contentId, contentText, tenantId);
      } catch (edgeError) {
        // Don't fail the whole KG build if edge creation fails
        logger.warn('[KGBuilder] Edge creation failed, node still created', {
          error: edgeError.message
        });
      }

      logger.info('[KGBuilder] ✅ KG built successfully', {
        contentId: contentId,
        nodeId: nodeId
      });

      return { success: true, nodeId: nodeId };

    } catch (error) {
      // Log but don't throw - KG is optional enhancement
      logger.warn('[KGBuilder] Failed to build KG (non-critical)', {
        contentId: contentId,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a node for content
   */
  async createContentNode(contentId, contentText, metadata, tenantId) {
    const prisma = await getPrisma();
    if (!prisma) throw new Error('Prisma not available');
    
    const nodeId = `content:${contentId}`;
    const nodeType = metadata?.source_service || 'content';
    
    // Extract key properties from content
    const properties = {
      source_service: metadata?.source_service,
      content_preview: contentText?.substring(0, 200),
      created_at: new Date().toISOString(),
      query: metadata?.query
    };

    try {
      // Check if node exists
      const existing = await prisma.$queryRawUnsafe(`
        SELECT id FROM knowledge_graph_nodes 
        WHERE node_id = $1 AND tenant_id = $2
        LIMIT 1
      `, nodeId, tenantId);

      if (existing && existing.length > 0) {
        // Update existing node
        await prisma.$executeRawUnsafe(`
          UPDATE knowledge_graph_nodes
          SET properties = $1::jsonb, updated_at = NOW()
          WHERE node_id = $2 AND tenant_id = $3
        `, JSON.stringify(properties), nodeId, tenantId);
        
        logger.debug('[KGBuilder] Updated node', { nodeId });
      } else {
        // Create new node
        await prisma.$executeRawUnsafe(`
          INSERT INTO knowledge_graph_nodes (
            id, tenant_id, node_id, node_type, properties, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4::jsonb, NOW(), NOW()
          )
        `, tenantId, nodeId, nodeType, JSON.stringify(properties));
        
        logger.debug('[KGBuilder] Created node', { nodeId });
      }

      return nodeId;
      
    } catch (error) {
      logger.warn('[KGBuilder] Node creation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Create edges to related content
   */
  async createRelationshipEdges(sourceNodeId, contentId, contentText, tenantId) {
    const prisma = await getPrisma();
    if (!prisma) return;
    
    // Find semantically similar content
    const relatedContent = await this.findRelatedContent(contentText, tenantId, contentId);
    
    if (!relatedContent || relatedContent.length === 0) {
      logger.debug('[KGBuilder] No related content found');
      return;
    }

    logger.info('[KGBuilder] Creating edges to related content', {
      sourceNodeId: sourceNodeId,
      relatedCount: relatedContent.length
    });

    for (const related of relatedContent) {
      try {
        const targetNodeId = `content:${related.content_id}`;
        const similarity = parseFloat(related.similarity);
        
        // Determine edge type based on similarity
        const edgeType = similarity > 0.85 ? 'strongly_related' : 'related';
        
        // Upsert edge (create or update)
        await prisma.$executeRawUnsafe(`
          INSERT INTO knowledge_graph_edges (
            id, tenant_id, source_node_id, target_node_id, edge_type, weight, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW()
          )
          ON CONFLICT (tenant_id, source_node_id, target_node_id) 
          DO UPDATE SET weight = $5, edge_type = $4, updated_at = NOW()
        `, tenantId, sourceNodeId, targetNodeId, edgeType, similarity);

        logger.debug('[KGBuilder] Created/updated edge', {
          source: sourceNodeId,
          target: targetNodeId,
          weight: similarity
        });
        
      } catch (edgeError) {
        // Continue with other edges even if one fails
        logger.debug('[KGBuilder] Edge creation failed, continuing', {
          error: edgeError.message
        });
      }
    }
  }

  /**
   * Find semantically related content
   */
  async findRelatedContent(contentText, tenantId, excludeContentId) {
    const prisma = await getPrisma();
    const openai = await getOpenAI();
    
    if (!prisma || !openai) {
      return [];
    }
    
    try {
      // Limit text length for embedding
      const truncatedText = contentText?.substring(0, 8000) || '';
      
      if (truncatedText.length < 10) {
        return [];
      }
      
      // Generate embedding for content
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: truncatedText,
        dimensions: 1536
      });
      
      const embedding = embeddingResponse.data[0].embedding;
      const embeddingStr = `[${embedding.join(',')}]`;
      
      // Find similar content (exclude self)
      const results = await prisma.$queryRawUnsafe(`
        SELECT 
          content_id,
          content_text,
          1 - (embedding <=> $1::vector) as similarity
        FROM vector_embeddings
        WHERE tenant_id = $2
          AND content_id != $3
          AND embedding IS NOT NULL
          AND (1 - (embedding <=> $1::vector)) > 0.70
        ORDER BY similarity DESC
        LIMIT 10
      `, embeddingStr, tenantId, excludeContentId);
      
      return results || [];
      
    } catch (error) {
      logger.warn('[KGBuilder] Failed to find related content', {
        error: error.message
      });
      return [];
    }
  }
}

export default new KGBuilderService();

