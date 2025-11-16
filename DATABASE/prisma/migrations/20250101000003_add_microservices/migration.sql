-- Add Microservice Management Support
-- This migration adds support for tracking content from multiple microservices (9-10 services)

-- CreateTable: microservices
CREATE TABLE IF NOT EXISTS "microservices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "api_endpoint" TEXT,
    "version" TEXT DEFAULT '1.0.0',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB DEFAULT '{}',
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "microservices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: microservices
CREATE UNIQUE INDEX IF NOT EXISTS "microservices_service_id_key" ON "microservices"("service_id");
CREATE UNIQUE INDEX IF NOT EXISTS "microservices_tenant_id_name_key" ON "microservices"("tenant_id", "name");
CREATE INDEX IF NOT EXISTS "microservices_tenant_id_idx" ON "microservices"("tenant_id");
CREATE INDEX IF NOT EXISTS "microservices_service_id_idx" ON "microservices"("service_id");
CREATE INDEX IF NOT EXISTS "microservices_name_idx" ON "microservices"("name");
CREATE INDEX IF NOT EXISTS "microservices_is_active_idx" ON "microservices"("is_active");

-- AddForeignKey: microservices -> tenants
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'microservices_tenant_id_fkey'
    ) THEN
        ALTER TABLE "microservices" 
        ADD CONSTRAINT "microservices_tenant_id_fkey" 
        FOREIGN KEY ("tenant_id") 
        REFERENCES "tenants"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    END IF;
END $$;

-- AlterTable: vector_embeddings - Add microservice_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vector_embeddings' 
        AND column_name = 'microservice_id'
    ) THEN
        ALTER TABLE "vector_embeddings" 
        ADD COLUMN "microservice_id" TEXT;
    END IF;
END $$;

-- CreateIndex: vector_embeddings - microservice indexes
CREATE INDEX IF NOT EXISTS "vector_embeddings_microservice_id_idx" 
ON "vector_embeddings"("microservice_id");

CREATE INDEX IF NOT EXISTS "vector_embeddings_content_type_idx" 
ON "vector_embeddings"("content_type");

CREATE INDEX IF NOT EXISTS "vector_embeddings_tenant_id_microservice_id_idx" 
ON "vector_embeddings"("tenant_id", "microservice_id");

CREATE INDEX IF NOT EXISTS "vector_embeddings_tenant_id_content_type_microservice_id_idx" 
ON "vector_embeddings"("tenant_id", "content_type", "microservice_id");

-- AddForeignKey: vector_embeddings -> microservices
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'vector_embeddings_microservice_id_fkey'
    ) THEN
        ALTER TABLE "vector_embeddings" 
        ADD CONSTRAINT "vector_embeddings_microservice_id_fkey" 
        FOREIGN KEY ("microservice_id") 
        REFERENCES "microservices"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    END IF;
END $$;

-- AlterTable: query_sources - Add source_microservice
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'query_sources' 
        AND column_name = 'source_microservice'
    ) THEN
        ALTER TABLE "query_sources" 
        ADD COLUMN "source_microservice" TEXT;
    END IF;
END $$;

-- CreateIndex: query_sources - microservice indexes
CREATE INDEX IF NOT EXISTS "query_sources_source_microservice_idx" 
ON "query_sources"("source_microservice");

CREATE INDEX IF NOT EXISTS "query_sources_source_type_source_microservice_idx" 
ON "query_sources"("source_type", "source_microservice");

-- Add comments for documentation
COMMENT ON TABLE "microservices" IS 'Manages microservices that provide content to the RAG system (9-10 services)';
COMMENT ON COLUMN "microservices"."service_id" IS 'Unique identifier across all tenants (e.g., "assessment", "devlab", "content")';
COMMENT ON COLUMN "vector_embeddings"."microservice_id" IS 'Which microservice this content came from';
COMMENT ON COLUMN "query_sources"."source_microservice" IS 'Which microservice provided this source';

-- Seed: Create default microservices for existing tenants
-- This ensures all tenants have the 10 core microservices available
DO $$
DECLARE
    tenant_record RECORD;
BEGIN
    -- Loop through all tenants and create microservices for each
    FOR tenant_record IN SELECT id, domain FROM tenants LOOP
        -- Insert 10 core microservices for this tenant
        INSERT INTO microservices (
            id, tenant_id, name, service_id, display_name, description,
            api_endpoint, version, is_active, settings, metadata, created_at, updated_at
        ) VALUES
            (gen_random_uuid()::text, tenant_record.id, 'assessment', 'assessment', 'Assessment Service', 'Handles assessments, quizzes, and evaluations', 'https://assessment.educore.local/api', '1.0.0', true, '{}'::jsonb, '{}'::jsonb, NOW(), NOW()),
            (gen_random_uuid()::text, tenant_record.id, 'devlab', 'devlab', 'DevLab Service', 'Development lab environment and coding exercises', 'https://devlab.educore.local/api', '1.0.0', true, '{}'::jsonb, '{}'::jsonb, NOW(), NOW()),
            (gen_random_uuid()::text, tenant_record.id, 'content', 'content', 'Content Management Service', 'Manages learning content, courses, and materials', 'https://content.educore.local/api', '1.0.0', true, '{}'::jsonb, '{}'::jsonb, NOW(), NOW()),
            (gen_random_uuid()::text, tenant_record.id, 'analytics', 'analytics', 'Analytics Service', 'Learning analytics and progress tracking', 'https://analytics.educore.local/api', '1.0.0', true, '{}'::jsonb, '{}'::jsonb, NOW(), NOW()),
            (gen_random_uuid()::text, tenant_record.id, 'user-management', 'user-management', 'User Management Service', 'User accounts, profiles, and authentication', 'https://users.educore.local/api', '1.0.0', true, '{}'::jsonb, '{}'::jsonb, NOW(), NOW()),
            (gen_random_uuid()::text, tenant_record.id, 'notification', 'notification', 'Notification Service', 'Sends notifications and alerts to users', 'https://notifications.educore.local/api', '1.0.0', true, '{}'::jsonb, '{}'::jsonb, NOW(), NOW()),
            (gen_random_uuid()::text, tenant_record.id, 'reporting', 'reporting', 'Reporting Service', 'Generates reports and analytics dashboards', 'https://reporting.educore.local/api', '1.0.0', true, '{}'::jsonb, '{}'::jsonb, NOW(), NOW()),
            (gen_random_uuid()::text, tenant_record.id, 'integration', 'integration', 'Integration Service', 'Third-party integrations and API management', 'https://integration.educore.local/api', '1.0.0', true, '{}'::jsonb, '{}'::jsonb, NOW(), NOW()),
            (gen_random_uuid()::text, tenant_record.id, 'ai-assistant', 'ai-assistant', 'AI Assistant Service', 'RAG microservice - Contextual AI assistant (this service)', 'https://ai-assistant.educore.local/api', '1.0.0', true, '{}'::jsonb, '{}'::jsonb, NOW(), NOW()),
            (gen_random_uuid()::text, tenant_record.id, 'gateway', 'gateway', 'API Gateway', 'API Gateway for routing and load balancing', 'https://gateway.educore.local/api', '1.0.0', true, '{}'::jsonb, '{}'::jsonb, NOW(), NOW())
        ON CONFLICT (service_id) DO NOTHING;
    END LOOP;
END $$;

