#!/bin/bash

# Start ngrok tunnel for Shopify app
echo "🚀 Starting ngrok tunnel..."
echo "📋 Your server should be running on port 3001"
echo ""
echo "After ngrok starts, copy the HTTPS URL (e.g., https://abc123.ngrok-free.app)"
echo "You'll need this URL for:"
echo "  1. SHOPIFY_APP_URL in your .env file"
echo "  2. App URL in Shopify Partners dashboard"
echo ""
echo "Press Ctrl+C to stop ngrok"
echo ""

ngrok http 3001

