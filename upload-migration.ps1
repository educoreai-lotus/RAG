# PowerShell script for Windows

# Service ID from Stage 1 registration
$SERVICE_ID = "b75b5a42-3b19-404e-819b-262001c4c38d"

# Coordinator Domain - Update this with your actual Coordinator domain
# For local development:
$COORDINATOR_DOMAIN = "http://localhost:3000"
# For production (example):
# $COORDINATOR_DOMAIN = "https://coordinator-production-e0a0.up.railway.app"

# Read migration file
$migrationContent = Get-Content -Path "migration-file.json" -Raw

# Upload migration file
Write-Host "Uploading migration file for service: $SERVICE_ID"
Write-Host "Coordinator: $COORDINATOR_DOMAIN"
Write-Host ""

$response = Invoke-RestMethod -Uri "$COORDINATOR_DOMAIN/register/$SERVICE_ID/migration" `
  -Method Post `
  -ContentType "application/json" `
  -Body $migrationContent

Write-Host "Response:"
$response | ConvertTo-Json -Depth 10
Write-Host ""
Write-Host "Done!"







