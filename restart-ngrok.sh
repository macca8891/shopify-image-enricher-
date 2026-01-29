#!/bin/bash

# Quick script to restart ngrok if it goes down
# This is a temporary solution - consider upgrading ngrok or using proper hosting

echo "Checking ngrok status..."

if ! pgrep -f "ngrok http 3001" > /dev/null; then
    echo "❌ ngrok is not running. Restarting..."
    cd /Users/michaelmchugh/shopify-image-enricher
    nohup ngrok http 3001 > /tmp/ngrok.log 2>&1 &
    sleep 3
    echo "✅ ngrok restarted"
else
    echo "✅ ngrok is running"
fi

# Check if server is running
if pm2 status | grep -q "buckydrop-shipping.*online"; then
    echo "✅ Server is running under PM2"
else
    echo "❌ Server is not running. Starting..."
    cd /Users/michaelmchugh/shopify-image-enricher
    pm2 start server.js --name buckydrop-shipping --log /tmp/pm2-server.log --error /tmp/pm2-server-error.log
    echo "✅ Server started"
fi

# Show status
echo ""
echo "Status:"
pm2 status | grep buckydrop-shipping
pgrep -f "ngrok http 3001" > /dev/null && echo "ngrok: ✅ Running" || echo "ngrok: ❌ Not running"

