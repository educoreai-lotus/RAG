# PowerShell script for secure service registration (Stage 1) - Windows
# 
# Usage:
#   .\scripts\register-service-secure.ps1
#
# Environment Variables Required:
#   - PRIVATE_KEY: Private key from GitHub Secrets
#   - SERVICE_NAME: Name of the microservice (e.g., "rag-service")
#   - COORDINATOR_URL: Coordinator domain (e.g., "http://localhost:3000")
#   - SERVICE_ENDPOINT: Full URL of this service
#   - SERVICE_VERSION: Service version
#   - SERVICE_HEALTH_CHECK: Health check path

param(
    [string]$CoordinatorUrl = $env:COORDINATOR_URL,
    [string]$ServiceName = $env:SERVICE_NAME,
    [string]$PrivateKey = $env:PRIVATE_KEY,
    [string]$ServiceEndpoint = $env:SERVICE_ENDPOINT,
    [string]$ServiceVersion = $env:SERVICE_VERSION,
    [string]$ServiceHealthCheck = $env:SERVICE_HEALTH_CHECK,
    [string]$ServiceDescription = $env:SERVICE_DESCRIPTION
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
if (-not $ServiceEndpoint) { $ServiceEndpoint = $env:SERVICE_ENDPOINT }
if (-not $ServiceVersion) { $ServiceVersion = $env:SERVICE_VERSION }
if (-not $ServiceHealthCheck) { $ServiceHealthCheck = $env:SERVICE_HEALTH_CHECK }
if (-not $ServiceDescription) { $ServiceDescription = $env:SERVICE_DESCRIPTION }

# Defaults
if (-not $CoordinatorUrl) { $CoordinatorUrl = "http://localhost:3000" }
if (-not $ServiceName) { $ServiceName = "rag-service" }
if (-not $ServiceEndpoint) { $ServiceEndpoint = "http://localhost:3000" }
if (-not $ServiceVersion) { $ServiceVersion = "1.0.0" }
if (-not $ServiceHealthCheck) { $ServiceHealthCheck = "/health" }
if (-not $ServiceDescription) { $ServiceDescription = "RAG Microservice - Contextual Assistant" }

# Validate required variables
if (-not $PrivateKey) {
    Write-Host "❌ Error: PRIVATE_KEY environment variable is required" -ForegroundColor Red
    Write-Host "   Set it from GitHub Secrets or .env file" -ForegroundColor Yellow
    exit 1
}

# Prepare registration data
$registrationData = @{
    serviceName = $ServiceName
    version = $ServiceVersion
    endpoint = $ServiceEndpoint
    healthCheck = $ServiceHealthCheck
    description = $ServiceDescription
    metadata = @{
        team = $env:SERVICE_TEAM ?? "EDUCORE Team"
        owner = $env:SERVICE_OWNER ?? "EDUCORE"
        capabilities = @(
            "rag queries",
            "knowledge graph",
            "vector search",
            "content management",
            "assessment support",
            "devlab support",
            "personalized recommendations"
        )
    }
}

Write-Host "🔐 Secure Service Registration (Stage 1)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service Name: $ServiceName"
Write-Host "Service Version: $ServiceVersion"
Write-Host "Service Endpoint: $ServiceEndpoint"
Write-Host "Coordinator: $CoordinatorUrl"
Write-Host ""

# Generate signature using Node.js script
Write-Host "📝 Generating signature..." -ForegroundColor Yellow

$signatureScript = @"
const crypto = require('crypto');
const serviceName = '$ServiceName';
const privateKey = \`$PrivateKey\`;
const payload = $($registrationData | ConvertTo-Json -Compress);

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
$url = "$CoordinatorUrl/register"
$headers = @{
    'Content-Type' = 'application/json'
    'X-Service-Name' = $ServiceName
    'X-Signature' = $signature
}

Write-Host "📤 Registering service..." -ForegroundColor Yellow
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
        -Body ($registrationData | ConvertTo-Json -Depth 10)

    Write-Host "✅ Service registered successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:"
    $response | ConvertTo-Json -Depth 10

    # Save service ID
    if ($response.serviceId) {
        $serviceIdPath = Join-Path $PSScriptRoot "..\.service-id"
        $response.serviceId | Out-File -FilePath $serviceIdPath -Encoding utf8
        Write-Host ""
        Write-Host "💾 Service ID saved to: $serviceIdPath" -ForegroundColor Cyan
        Write-Host "   Service ID: $($response.serviceId)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📋 Next Steps:" -ForegroundColor Yellow
        Write-Host "   1. Send your public key to coordinator administrator"
        Write-Host "   2. Get coordinator's public key and add to .env as COORDINATOR_PUBLIC_KEY"
        Write-Host "   3. Run: node scripts/upload-migration-secure.js"
    }

} catch {
    Write-Host "❌ Error registering service: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
    exit 1
}










