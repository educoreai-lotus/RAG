-- Enable pgvector extension (required for vector columns)
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "settings" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_id" TEXT,
    "query_text" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "confidence_score" DECIMAL(3,2) NOT NULL,
    "processing_time_ms" INTEGER NOT NULL,
    "model_version" TEXT NOT NULL,
    "is_personalized" BOOLEAN NOT NULL DEFAULT false,
    "is_cached" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_sources" (
    "id" TEXT NOT NULL,
    "query_id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content_snippet" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "relevance_score" DECIMAL(3,2) NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "query_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_recommendations" (
    "id" TEXT NOT NULL,
    "query_id" TEXT NOT NULL,
    "recommendation_type" TEXT NOT NULL,
    "recommendation_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "query_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vector_embeddings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "embedding" vector(1536),
    "content_text" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vector_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_graph_nodes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "node_type" TEXT NOT NULL,
    "properties" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_graph_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_graph_edges" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source_node_id" TEXT NOT NULL,
    "target_node_id" TEXT NOT NULL,
    "edge_type" TEXT NOT NULL,
    "weight" DECIMAL(3,2),
    "properties" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_graph_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_control_rules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rule_type" TEXT NOT NULL,
    "subject_type" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "permission" TEXT NOT NULL,
    "conditions" JSONB DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_control_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT,
    "region" TEXT,
    "skill_gaps" JSONB DEFAULT '[]',
    "learning_progress" JSONB DEFAULT '{}',
    "preferences" JSONB DEFAULT '{}',
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource_type" TEXT,
    "resource_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "details" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cache_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cache_key" TEXT NOT NULL,
    "query_hash" TEXT NOT NULL,
    "response_data" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cache_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_domain_key" ON "tenants"("domain");

-- CreateIndex
CREATE INDEX "queries_tenant_id_created_at_idx" ON "queries"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "queries_user_id_created_at_idx" ON "queries"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "queries_tenant_id_session_id_idx" ON "queries"("tenant_id", "session_id");

-- CreateIndex
CREATE INDEX "query_sources_query_id_idx" ON "query_sources"("query_id");

-- CreateIndex
CREATE INDEX "query_sources_source_id_idx" ON "query_sources"("source_id");

-- CreateIndex
CREATE INDEX "query_recommendations_query_id_idx" ON "query_recommendations"("query_id");

-- CreateIndex
CREATE INDEX "query_recommendations_recommendation_id_idx" ON "query_recommendations"("recommendation_id");

-- CreateIndex
CREATE INDEX "vector_embeddings_tenant_id_idx" ON "vector_embeddings"("tenant_id");

-- CreateIndex
CREATE INDEX "vector_embeddings_content_id_idx" ON "vector_embeddings"("content_id");

-- CreateIndex
CREATE INDEX "vector_embeddings_tenant_id_content_id_idx" ON "vector_embeddings"("tenant_id", "content_id");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_graph_nodes_node_id_key" ON "knowledge_graph_nodes"("node_id");

-- CreateIndex
CREATE INDEX "knowledge_graph_nodes_tenant_id_idx" ON "knowledge_graph_nodes"("tenant_id");

-- CreateIndex
CREATE INDEX "knowledge_graph_nodes_node_id_idx" ON "knowledge_graph_nodes"("node_id");

-- CreateIndex
CREATE INDEX "knowledge_graph_nodes_node_type_idx" ON "knowledge_graph_nodes"("node_type");

-- CreateIndex
CREATE INDEX "knowledge_graph_edges_tenant_id_idx" ON "knowledge_graph_edges"("tenant_id");

-- CreateIndex
CREATE INDEX "knowledge_graph_edges_source_node_id_target_node_id_idx" ON "knowledge_graph_edges"("source_node_id", "target_node_id");

-- CreateIndex
CREATE INDEX "knowledge_graph_edges_edge_type_idx" ON "knowledge_graph_edges"("edge_type");

-- CreateIndex
CREATE INDEX "access_control_rules_tenant_id_idx" ON "access_control_rules"("tenant_id");

-- CreateIndex
CREATE INDEX "access_control_rules_subject_type_subject_id_idx" ON "access_control_rules"("subject_type", "subject_id");

-- CreateIndex
CREATE INDEX "access_control_rules_resource_type_resource_id_idx" ON "access_control_rules"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "access_control_rules_tenant_id_subject_type_subject_id_resource_type_resource_id_idx" ON "access_control_rules"("tenant_id", "subject_type", "subject_id", "resource_type", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_tenant_id_user_id_key" ON "user_profiles"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "user_profiles_tenant_id_user_id_idx" ON "user_profiles"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "user_profiles_role_idx" ON "user_profiles"("role");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_created_at_idx" ON "audit_logs"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE UNIQUE INDEX "cache_entries_cache_key_key" ON "cache_entries"("cache_key");

-- CreateIndex
CREATE INDEX "cache_entries_expires_at_idx" ON "cache_entries"("expires_at");

-- AddForeignKey
ALTER TABLE "queries" ADD CONSTRAINT "queries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_sources" ADD CONSTRAINT "query_sources_query_id_fkey" FOREIGN KEY ("query_id") REFERENCES "queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_recommendations" ADD CONSTRAINT "query_recommendations_query_id_fkey" FOREIGN KEY ("query_id") REFERENCES "queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vector_embeddings" ADD CONSTRAINT "vector_embeddings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_graph_nodes" ADD CONSTRAINT "knowledge_graph_nodes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_graph_edges" ADD CONSTRAINT "knowledge_graph_edges_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_graph_edges" ADD CONSTRAINT "knowledge_graph_edges_source_node_id_fkey" FOREIGN KEY ("source_node_id") REFERENCES "knowledge_graph_nodes"("node_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_graph_edges" ADD CONSTRAINT "knowledge_graph_edges_target_node_id_fkey" FOREIGN KEY ("target_node_id") REFERENCES "knowledge_graph_nodes"("node_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_control_rules" ADD CONSTRAINT "access_control_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cache_entries" ADD CONSTRAINT "cache_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
