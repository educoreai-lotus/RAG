#!/bin/bash
# Script to run Knowledge Graph tests in cloud environment
# Usage: ./scripts/run-tests-cloud.sh [test-file]

set -e

echo "🧪 Running Knowledge Graph tests in cloud environment..."

# Navigate to BACKEND directory
cd "$(dirname "$0")/.." || exit 1

# Set environment variables for cloud testing
export NODE_ENV=test
export SKIP_GLOBAL_TEST_SETUP=${SKIP_GLOBAL_TEST_SETUP:-'true'}
export SKIP_PRISMA=${SKIP_PRISMA:-'true'}

# Check if specific test file is provided
if [ -n "$1" ]; then
  TEST_FILE="$1"
  echo "Running specific test: $TEST_FILE"
  npm test -- "$TEST_FILE"
else
  echo "Running all Knowledge Graph tests..."
  npm test -- knowledgeGraph.service.test.js
fi

echo "✅ Tests completed!"

