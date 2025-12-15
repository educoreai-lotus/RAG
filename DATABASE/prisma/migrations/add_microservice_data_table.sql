-- Migration: Add microservice_data table
-- Created: 2025-01-27
-- Description: Table for storing raw microservice data before processing

-- Create microservice_data table if it doesn't exist
CREATE TABLE IF NOT EXISTS microservice_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  service_name VARCHAR(255) NOT NULL,
  content_id VARCHAR(500) NOT NULL,
  content_type VARCHAR(255) NOT NULL,
  content_data JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_microservice_data_tenant 
    FOREIGN KEY (tenant_id) 
    REFERENCES tenants(id) 
    ON DELETE CASCADE,
  
  UNIQUE(service_name, content_id)
);

-- Create indexes
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

-- GIN indexes for JSONB queries
CREATE INDEX IF NOT EXISTS idx_microservice_data_content_data 
  ON microservice_data USING GIN (content_data);

CREATE INDEX IF NOT EXISTS idx_microservice_data_metadata 
  ON microservice_data USING GIN (metadata);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_microservice_data_tenant_service 
  ON microservice_data(tenant_id, service_name);

-- Add comment
COMMENT ON TABLE microservice_data IS 'Stores raw data from microservices before processing into vectors and knowledge graph';
COMMENT ON COLUMN microservice_data.content_data IS 'Full original data from microservice as JSONB';
COMMENT ON COLUMN microservice_data.metadata IS 'Mapped fields according to schema configuration';

