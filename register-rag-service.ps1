# Register RAG Service with Coordinator
# Stage 1: Basic Registration

$coordinatorUrl = "https://coordinator-production-6004.up.railway.app"
$registerUrl = "$coordinatorUrl/register"

# Stage 1: Basic Registration
Write-Host "=== Stage 1: Basic Registration ===" -ForegroundColor Cyan

$stage1Body = @{
    serviceName = "rag-service"
    version = "1.0.0"
    endpoint = "https://rag-production-3a4c.up.railway.app"
    healthCheck = "/health"
    description = "EDUCORE - Contextual Assistant (RAG / Knowledge Graph) Microservice. Provides Retrieval-Augmented Generation capabilities with vector similarity search, knowledge graph operations, personalized recommendations, and support for Assessment/DevLab microservices."
    metadata = @{
        team = "EDUCORE Team"
        capabilities = @(
            "rag_query_processing",
            "vector_similarity_search",
            "knowledge_graph_operations",
            "personalized_recommendations",
            "assessment_support",
            "devlab_support",
            "content_embedding",
            "query_classification",
            "multi_tenant_support",
            "access_control_rbac_abac"
        )
    }
} | ConvertTo-Json -Depth 10

try {
    Write-Host "Sending registration request..." -ForegroundColor Yellow
    $response1 = Invoke-RestMethod -Uri $registerUrl -Method POST -ContentType "application/json" -Body $stage1Body
    
    Write-Host "✅ Stage 1 Success!" -ForegroundColor Green
    Write-Host ($response1 | ConvertTo-Json -Depth 10)
    
    $serviceId = $response1.serviceId
    Write-Host "`nService ID: $serviceId" -ForegroundColor Green
    
    # Stage 2: Migration Upload
    Write-Host "`n=== Stage 2: Migration Upload ===" -ForegroundColor Cyan
    
    $migrationUrl = "$coordinatorUrl/register/$serviceId/migration"
    $migrationFile = Get-Content "rag-migration-file.json" -Raw
    
    Write-Host "Uploading migration file..." -ForegroundColor Yellow
    $response2 = Invoke-RestMethod -Uri $migrationUrl -Method POST -ContentType "application/json" -Body $migrationFile -TimeoutSec 120
    
    Write-Host "✅ Stage 2 Success!" -ForegroundColor Green
    Write-Host ($response2 | ConvertTo-Json -Depth 10)
    
    Write-Host "`n🎉 RAG Service registered successfully!" -ForegroundColor Green
    Write-Host "Service Status: $($response2.status)" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}

