# PowerShell script for secure migration upload (Windows)
# 
# Usage:
#   .\scripts\upload-migration-secure.ps1
#
# Environment Variables Required:
#   - PRIVATE_KEY: Private key from GitHub Secrets
#   - SERVICE_NAME: Name of the microservice (e.g., "rag-service")
#   - COORDINATOR_URL: Coordinator domain (e.g., "http://localhost:3000")
#   - SERVICE_ID: Service ID from Stage 1 registration

param(
    [string]$ServiceId = "b75b5a42-3b19-404e-819b-262001c4c38d",
    [string]$CoordinatorUrl = $env:COORDINATOR_URL,
    [string]$ServiceName = $env:SERVICE_NAME,
    [string]$PrivateKey = $env:PRIVATE_KEY
)

# Load .env file if exists
$envPath = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            if (-not [Environment]::GetEnvironmentVariable($name, 'Process')) {
                [Environment]::SetEnvironmentVariable($name, $value, 'Process')
            }
        }
    }
}

# Use environment variables if not provided as parameters
if (-not $CoordinatorUrl) { $CoordinatorUrl = $env:COORDINATOR_URL }
if (-not $ServiceName) { $ServiceName = $env:SERVICE_NAME }
if (-not $PrivateKey) { $PrivateKey = $env:PRIVATE_KEY }

# Defaults
if (-not $CoordinatorUrl) { $CoordinatorUrl = "http://localhost:3000" }
if (-not $ServiceName) { $ServiceName = "rag-service" }

# Validate required variables
if (-not $PrivateKey) {
    Write-Host "❌ Error: PRIVATE_KEY environment variable is required" -ForegroundColor Red
    Write-Host "   Set it from GitHub Secrets or .env file" -ForegroundColor Yellow
    exit 1
}

# Paths
$migrationFilePath = Join-Path $PSScriptRoot "..\..\migration-file.json"

# Check if migration file exists
if (-not (Test-Path $migrationFilePath)) {
    Write-Host "❌ Error: Migration file not found: $migrationFilePath" -ForegroundColor Red
    exit 1
}

# Read migration file
try {
    $migrationContent = Get-Content -Path $migrationFilePath -Raw
    $migrationData = $migrationContent | ConvertFrom-Json
} catch {
    Write-Host "❌ Error reading migration file: $_" -ForegroundColor Red
    exit 1
}

# Prepare request body
$requestBody = @{
    migrationFile = $migrationData.migrationFile
}

if (-not $requestBody.migrationFile) {
    $requestBody.migrationFile = $migrationData
}

Write-Host "🔐 Secure Migration Upload" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service Name: $ServiceName"
Write-Host "Service ID: $ServiceId"
Write-Host "Coordinator: $CoordinatorUrl"
Write-Host "Migration File: $migrationFilePath"
Write-Host ""

# Generate signature using Node.js script
Write-Host "📝 Generating signature..." -ForegroundColor Yellow

$signatureScript = @"
const crypto = require('crypto');
const serviceName = '$ServiceName';
const privateKey = \`$PrivateKey\`;
const payload = $($requestBody | ConvertTo-Json -Compress);

let message = \`educoreai-\${serviceName}\`;
if (payload) {
  const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  message = \`\${message}-\${payloadHash}\`;
}

const sign = crypto.createSign('SHA256');
sign.update(message);
sign.end();
const signature = sign.sign(privateKey, 'base64');
console.log(signature);
"@

$signature = node -e $signatureScript

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error generating signature" -ForegroundColor Red
    exit 1
}

$signature = $signature.Trim()
Write-Host "✅ Signature generated" -ForegroundColor Green
Write-Host ""

# Prepare request
$url = "$CoordinatorUrl/register/$ServiceId/migration"
$headers = @{
    'Content-Type' = 'application/json'
    'X-Service-Name' = $ServiceName
    'X-Signature' = $signature
}

Write-Host "📤 Uploading migration file..." -ForegroundColor Yellow
Write-Host "   URL: $url"
Write-Host "   Headers:"
Write-Host "     X-Service-Name: $ServiceName"
Write-Host "     X-Signature: $($signature.Substring(0, [Math]::Min(50, $signature.Length)))..."
Write-Host ""

# Make request
try {
    $response = Invoke-RestMethod -Uri $url `
        -Method Post `
        -ContentType "application/json" `
        -Headers $headers `
        -Body ($requestBody | ConvertTo-Json -Depth 10)

    Write-Host "✅ Migration uploaded successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:"
    $response | ConvertTo-Json -Depth 10

} catch {
    Write-Host "❌ Error uploading migration: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
    exit 1
}










