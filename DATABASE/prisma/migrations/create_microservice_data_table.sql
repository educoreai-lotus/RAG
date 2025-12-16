-- ============================================
-- Migration: Create microservice_data table
-- Created: 2025-01-27
-- Description: Table for storing raw microservice data before processing
-- ============================================

-- Create microservice_data table
CREATE TABLE IF NOT EXISTS microservice_data (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  service_name VARCHAR(255) NOT NULL,
  content_id VARCHAR(500) NOT NULL,
  content_type VARCHAR(255) NOT NULL,
  content_data JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key to tenants table
  CONSTRAINT fk_microservice_data_tenant 
    FOREIGN KEY (tenant_id) 
    REFERENCES tenants(id) 
    ON DELETE CASCADE,
  
  -- Unique constraint: same content from same service can't be duplicated
  UNIQUE(service_name, content_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_microservice_data_service_name 
  ON microservice_data(service_name);

CREATE INDEX IF NOT EXISTS idx_microservice_data_tenant_id 
  ON microservice_data(tenant_id);

CREATE INDEX IF NOT EXISTS idx_microservice_data_timestamp 
  ON microservice_data(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_microservice_data_content_type 
  ON microservice_data(content_type);

CREATE INDEX IF NOT EXISTS idx_microservice_data_content_id 
  ON microservice_data(content_id);

-- Composite index for common queries (tenant + service)
CREATE INDEX IF NOT EXISTS idx_microservice_data_tenant_service 
  ON microservice_data(tenant_id, service_name);

-- GIN indexes for JSONB queries (for searching inside JSONB fields)
CREATE INDEX IF NOT EXISTS idx_microservice_data_content_data 
  ON microservice_data USING GIN (content_data);

CREATE INDEX IF NOT EXISTS idx_microservice_data_metadata 
  ON microservice_data USING GIN (metadata);

-- Add comments for documentation
COMMENT ON TABLE microservice_data IS 'Stores raw data from microservices before processing into vectors and knowledge graph';
COMMENT ON COLUMN microservice_data.content_data IS 'Full original data from microservice as JSONB';
COMMENT ON COLUMN microservice_data.metadata IS 'Mapped fields according to schema configuration';
COMMENT ON COLUMN microservice_data.service_name IS 'Name of the microservice that provided this data (e.g., hr-reporting-service)';
COMMENT ON COLUMN microservice_data.content_id IS 'Unique identifier of the content within the microservice';
COMMENT ON COLUMN microservice_data.content_type IS 'Type of content (e.g., report, assessment, document)';

