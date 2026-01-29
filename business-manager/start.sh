#!/bin/bash

# Business Manager Startup Script

echo "Starting Business Manager..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found in root directory"
    echo "Please create .env file with required variables (see SETUP.md)"
fi

# Check required environment variables
if [ -z "$HUBSPOT_ACCESS_TOKEN" ]; then
    echo "⚠️  Warning: HUBSPOT_ACCESS_TOKEN not set"
fi

if [ -z "$LINKEDIN_ACCESS_TOKEN" ]; then
    echo "⚠️  Warning: LINKEDIN_ACCESS_TOKEN not set"
fi

if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  Warning: OPENAI_API_KEY not set"
fi

# Start the server
cd "$(dirname "$0")/.."
node business-manager/server.js


