/**
 * Diagnostics Controller
 * Provides diagnostic endpoints for debugging RAG system
 */

import { getPrismaClient } from '../config/database.config.js';
import { logger } from '../utils/logger.util.js';
import { Prisma } from '@prisma/client';
import { getOrCreateTenant } from '../services/tenant.service.js';
import { validateAndFixTenantId } from '../utils/tenant-validation.util.js';

/**
 * GET /api/debug/embeddings-status
 * Check embeddings status in database
 */
export async function getEmbeddingsStatus(req, res, next) {
  // CRITICAL: Validate and fix tenant_id (declare outside try for error handling)
  let tenantDomainOrId = req.query.tenant_id || 'default.local';
  let tenant = null;
  let tenantId = null;
  
  try {
    tenantDomainOrId = validateAndFixTenantId(tenantDomainOrId);
    
    tenant = await getOrCreateTenant(tenantDomainOrId);
    tenantId = tenant.id;
    
    // Log tenant resolution for debugging
    logger.info('🔍 Tenant resolved for embeddings status', {
      requested: req.query.tenant_id,
      validated: tenantDomainOrId,
      final_tenant_id: tenantId,
      tenant_domain: tenant.domain,
    });

    const prisma = await getPrismaClient();

    // Check if pgvector extension is enabled
    const extensionCheck = await prisma.$queryRaw(
      Prisma.sql`SELECT * FROM pg_extension WHERE extname = 'vector'`
    ).catch(() => []);

    // Check if HNSW index exists
    const indexCheck = await prisma.$queryRaw(
      Prisma.sql`
        SELECT 
          indexname, 
          indexdef 
        FROM pg_indexes 
        WHERE tablename = 'vector_embeddings' 
          AND indexdef LIKE '%hnsw%'
      `
    ).catch(() => []);

    // Get total count of embeddings
    // Note: PostgreSQL COUNT(*) can return BigInt, so we explicitly cast and convert
    const totalCount = await prisma.$queryRaw(
      Prisma.sql`SELECT COUNT(*)::int as count FROM vector_embeddings`
    ).catch(() => [{ count: 0 }]);
    const totalCountValue = totalCount[0]?.count;
    const safeTotalCount = typeof totalCountValue === 'bigint' ? Number(totalCountValue) : Number(totalCountValue || 0);

    // Get count by tenant
    const tenantCount = await prisma.$queryRaw(
      Prisma.sql`SELECT COUNT(*)::int as count FROM vector_embeddings WHERE tenant_id = ${tenantId}`
    ).catch(() => [{ count: 0 }]);
    const tenantCountValue = tenantCount[0]?.count;
    const safeTenantCount = typeof tenantCountValue === 'bigint' ? Number(tenantCountValue) : Number(tenantCountValue || 0);

    // Get count by content type
    const contentTypeCount = await prisma.$queryRaw(
      Prisma.sql`
        SELECT 
          content_type, 
          COUNT(*)::int as count 
        FROM vector_embeddings 
        WHERE tenant_id = ${tenantId}
        GROUP BY content_type
        ORDER BY count DESC
      `
    ).catch(() => []);

    // Get sample embeddings to check dimensions
    const sampleEmbeddings = await prisma.$queryRaw(
      Prisma.sql`
        SELECT 
          content_id,
          content_type,
          (SELECT array_length(string_to_array(embedding::text, ','), 1)) as embedding_dimensions
        FROM vector_embeddings
        WHERE tenant_id = ${tenantId}
        LIMIT 5
      `
    ).catch(() => []);

    // Get all tenant IDs that have embeddings
    const allTenants = await prisma.$queryRaw(
      Prisma.sql`
        SELECT 
          t.id,
          t.domain,
          COUNT(ve.id)::int as embedding_count
        FROM tenants t
        LEFT JOIN vector_embeddings ve ON t.id = ve.tenant_id
        GROUP BY t.id, t.domain
        ORDER BY embedding_count DESC
      `
    ).catch(() => []);

    // Check for "Eden Levi" specifically
    const edenLeviCheck = await prisma.$queryRaw(
      Prisma.sql`
        SELECT 
          tenant_id,
          content_id,
          content_type,
          content_text,
          metadata->>'fullName' as name,
          metadata->>'role' as role
        FROM vector_embeddings
        WHERE content_id = ${'user:manager-001'}
        LIMIT 5
      `
    ).catch(() => []);

    // Helper function to safely serialize data for JSON
    // Handles BigInt, circular references, undefined values, and Prisma objects
    const safeSerialize = (data, seen = new WeakSet()) => {
      // Handle null/undefined
      if (data === null || data === undefined) return null;
      
      // Handle BigInt - convert to string or number
      if (typeof data === 'bigint') {
        return Number(data);
      }
      
      // Handle circular references
      if (typeof data === 'object') {
        if (seen.has(data)) {
          return '[Circular Reference]';
        }
        seen.add(data);
        
        // Handle arrays
        if (Array.isArray(data)) {
          return data.map(item => safeSerialize(item, seen));
        }
        
        // Handle Date objects
        if (data instanceof Date) {
          return data.toISOString();
        }
        
        // Handle plain objects
        const cleaned = {};
        for (const [key, value] of Object.entries(data)) {
          try {
            // Skip undefined values
            if (value === undefined) {
              continue;
            }
            cleaned[key] = safeSerialize(value, seen);
          } catch (e) {
            // If serialization fails, convert to string
            cleaned[key] = String(value);
          }
        }
        return cleaned;
      }
      
      // Handle strings - clean up whitespace
      if (typeof data === 'string') {
        return data.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\t/g, ' ').trim();
      }
      
      // Handle other primitives
      return data;
    };

    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      tenant: {
        domain: String(tenant.domain || tenantDomainOrId || ''),
        id: String(tenantId || ''),
      },
      pgvector: {
        extension_enabled: extensionCheck.length > 0,
        extension_info: extensionCheck[0] ? safeSerialize(extensionCheck[0]) : null,
      },
      indexes: {
        hnsw_index_exists: indexCheck.length > 0,
        indexes: safeSerialize(indexCheck),
      },
      embeddings: {
        total_in_database: safeTotalCount,
        total_for_tenant: safeTenantCount,
        by_content_type: safeSerialize(contentTypeCount),
        sample_embeddings: safeSerialize(sampleEmbeddings),
      },
      tenants: {
        all_tenants_with_embeddings: safeSerialize(allTenants),
      },
      eden_levi_check: {
        found: edenLeviCheck.length > 0,
        records: safeSerialize(edenLeviCheck),
      },
      recommendations: {
        check_tenant_id: String('Make sure queries use the correct tenant_id. Current tenant: ' + tenantId),
        check_embeddings: String(safeTenantCount === 0 
          ? 'No embeddings found for this tenant. Run the embeddings script.' 
          : `${safeTenantCount} embeddings found for this tenant.`),
        check_threshold: String('Current default threshold is 0.25. Lower thresholds may return more results.'),
      },
    };

    logger.info('Embeddings status checked', {
      tenantId,
      totalEmbeddings: safeTotalCount,
      tenantEmbeddings: safeTenantCount,
    });

    // Test JSON serialization
    const fieldErrors = [];
    
    for (const [key, value] of Object.entries(response)) {
      try {
        JSON.stringify(value);
      } catch (err) {
        fieldErrors.push({ field: key, error: err.message, valueType: typeof value });
      }
    }

    // Test nested fields if top-level passes
    if (fieldErrors.length === 0) {
      // Test tenant object
      try {
        JSON.stringify(response.tenant);
      } catch (err) {
        fieldErrors.push({ field: 'tenant', error: err.message });
      }
      
      // Test pgvector object
      try {
        JSON.stringify(response.pgvector);
      } catch (err) {
        fieldErrors.push({ field: 'pgvector', error: err.message });
      }
      
      // Test indexes object
      try {
        JSON.stringify(response.indexes);
      } catch (err) {
        fieldErrors.push({ field: 'indexes', error: err.message });
      }
      
      // Test embeddings object
      try {
        JSON.stringify(response.embeddings);
      } catch (err) {
        fieldErrors.push({ field: 'embeddings', error: err.message });
      }
      
      // Test tenants object
      try {
        JSON.stringify(response.tenants);
      } catch (err) {
        fieldErrors.push({ field: 'tenants', error: err.message });
      }
      
      // Test eden_levi_check object
      try {
        JSON.stringify(response.eden_levi_check);
      } catch (err) {
        fieldErrors.push({ field: 'eden_levi_check', error: err.message });
      }
    }

    // Validate JSON before sending
    try {
      // Test for circular references using JSON.parse(JSON.stringify())
      const testJson = JSON.parse(JSON.stringify(response));
      res.json(response);
    } catch (jsonError) {
      
      logger.error('Diagnostics JSON serialization error', {
        error: jsonError.message,
        position: jsonError.message.match(/position (\d+)/)?.[1],
        fieldErrors: fieldErrors.length > 0 ? fieldErrors : undefined,
        stack: jsonError.stack,
      });
      
      // Return a safe fallback response with debug info
      res.status(500).json({
        status: 'error',
        error: 'Failed to serialize response data',
        message: jsonError.message,
        debug: {
          fieldErrors: fieldErrors.length > 0 ? fieldErrors : 'No field-level errors detected',
          errorType: jsonError.message.includes('circular') ? 'circular_reference' : 
                     jsonError.message.includes('BigInt') ? 'bigint_value' : 
                     'unknown_serialization_error',
        },
        timestamp: new Date().toISOString(),
        tenant: {
          domain: String(tenant?.domain || tenantDomainOrId || ''),
          id: String(tenantId || ''),
        },
      });
    }
  } catch (error) {
    logger.error('Diagnostics error', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * GET /api/debug/test-vector-search
 * Test vector search with a sample query
 * 
 * NOTE: This endpoint does NOT apply RBAC filtering for debugging purposes.
 * It shows raw vector search results to help diagnose issues.
 * The production endpoint (/api/v1/query) applies RBAC filtering.
 */
export async function testVectorSearch(req, res, next) {
  // CRITICAL: Validate and fix tenant_id (declare outside try for error handling)
  const { query: testQuery, tenant_id, threshold = 0.3 } = req.query || {};
  let tenantDomainOrId = tenant_id || 'default.local';
  let tenant = null;
  let tenantId = null;
  
  try {
    if (!testQuery) {
      return res.status(400).json({
        error: 'Missing query parameter',
        message: 'Provide a query parameter to test vector search',
      });
    }

    // CRITICAL: Validate and fix tenant_id
    tenantDomainOrId = validateAndFixTenantId(tenantDomainOrId);
    
    tenant = await getOrCreateTenant(tenantDomainOrId);
    tenantId = tenant.id;
    
    // Log tenant resolution for debugging
    logger.info('🔍 Tenant resolved for vector search test', {
      requested: tenant_id,
      validated: tenantDomainOrId,
      final_tenant_id: tenantId,
      tenant_domain: tenant.domain,
    });

    // Import OpenAI config
    const { openai } = await import('../config/openai.config.js');
    const { unifiedVectorSearch } = await import('../services/unifiedVectorSearch.service.js');

    // Create embedding for test query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: testQuery,
      dimensions: 1536, // Maintain compatibility with existing vector(1536) schema
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Perform vector search using unified service
    // NOTE: This test endpoint does NOT apply RBAC filtering - it shows all results
    // Production endpoint applies RBAC to filter user_profile content based on user role
    const results = await unifiedVectorSearch(queryEmbedding, tenantId, {
      limit: 10,
      threshold: parseFloat(threshold),
    });

    // Also try without threshold to see all similarities
    const allResults = await unifiedVectorSearch(queryEmbedding, tenantId, {
      limit: 20,
      threshold: 0.0, // No threshold
    });

    // Helper function to safely serialize data for JSON
    // Handles BigInt, circular references, undefined values, and Prisma objects
    const safeSerialize = (data, seen = new WeakSet()) => {
      // Handle null/undefined
      if (data === null || data === undefined) return null;
      
      // Handle BigInt - convert to string or number
      if (typeof data === 'bigint') {
        return Number(data);
      }
      
      // Handle circular references
      if (typeof data === 'object') {
        if (seen.has(data)) {
          return '[Circular Reference]';
        }
        seen.add(data);
        
        // Handle arrays
        if (Array.isArray(data)) {
          return data.map(item => safeSerialize(item, seen));
        }
        
        // Handle Date objects
        if (data instanceof Date) {
          return data.toISOString();
        }
        
        // Handle plain objects
        const cleaned = {};
        for (const [key, value] of Object.entries(data)) {
          try {
            // Skip undefined values
            if (value === undefined) {
              continue;
            }
            cleaned[key] = safeSerialize(value, seen);
          } catch (e) {
            // If serialization fails, convert to string
            cleaned[key] = String(value);
          }
        }
        return cleaned;
      }
      
      // Handle strings - clean up whitespace
      if (typeof data === 'string') {
        return data.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\t/g, ' ').trim();
      }
      
      // Handle other primitives
      return data;
    };

    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      test_query: String(testQuery || ''),
      tenant: {
        domain: String(tenant.domain || tenantDomainOrId || ''),
        id: String(tenantId || ''),
      },
      embedding: {
        dimensions: Number(queryEmbedding.length || 0),
        preview: Array.isArray(queryEmbedding) ? queryEmbedding.slice(0, 5).map(n => Number(n)) : [],
      },
      search_results: {
        with_threshold: {
          threshold: Number(parseFloat(threshold) || 0),
          count: Number(results.length || 0),
          results: results.map(r => ({
            contentId: String(r.contentId || ''),
            contentType: String(r.contentType || ''),
            similarity: Number(r.similarity || 0),
            contentTextPreview: String(r.contentText || '').substring(0, 100).replace(/\n/g, ' ').replace(/\r/g, ' ').trim(),
          })),
        },
        without_threshold: {
          count: Number(allResults.length || 0),
          top_10: allResults.slice(0, 10).map(r => ({
            contentId: String(r.contentId || ''),
            contentType: String(r.contentType || ''),
            similarity: Number(r.similarity || 0),
            contentTextPreview: String(r.contentText || '').substring(0, 100).replace(/\n/g, ' ').replace(/\r/g, ' ').trim(),
          })),
        },
      },
    };

    logger.info('Vector search test completed', {
      testQuery,
      tenantId,
      resultsCount: results.length,
      allResultsCount: allResults.length,
    });

    // Validate JSON before sending
    try {
      // Test for circular references using JSON.parse(JSON.stringify())
      const testJson = JSON.parse(JSON.stringify(response));
      res.json(response);
    } catch (jsonError) {
      
      logger.error('Vector search test JSON serialization error', {
        error: jsonError.message,
        position: jsonError.message.match(/position (\d+)/)?.[1],
        stack: jsonError.stack,
      });
      
      // Return a safe fallback response
      res.status(500).json({
        status: 'error',
        error: 'Failed to serialize response data',
        message: jsonError.message,
        timestamp: new Date().toISOString(),
        test_query: String(testQuery || ''),
        tenant: {
          domain: String(tenantDomain || ''),
          id: String(tenantId || ''),
        },
      });
    }
  } catch (error) {
    logger.error('Vector search test error', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

