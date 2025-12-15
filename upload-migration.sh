#!/bin/bash

# Service ID from Stage 1 registration
SERVICE_ID="b75b5a42-3b19-404e-819b-262001c4c38d"

# Coordinator Domain - Update this with your actual Coordinator domain
# For local development:
COORDINATOR_DOMAIN="http://localhost:3000"
# For production (example):
# COORDINATOR_DOMAIN="https://coordinator-production-e0a0.up.railway.app"

# Upload migration file
echo "Uploading migration file for service: $SERVICE_ID"
echo "Coordinator: $COORDINATOR_DOMAIN"
echo ""

curl -X POST "$COORDINATOR_DOMAIN/register/$SERVICE_ID/migration" \
  -H "Content-Type: application/json" \
  -d @migration-file.json

echo ""
echo "Done!"








