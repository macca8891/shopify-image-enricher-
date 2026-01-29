#!/bin/bash

# Kill existing processes
echo "Stopping existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null
pkill -f "ngrok http 3001" 2>/dev/null
sleep 2

# Start server
echo "Starting server..."
cd /Users/michaelmchugh/shopify-image-enricher
nohup node server.js > /tmp/server.log 2>&1 &
sleep 3

# Start ngrok
echo "Starting ngrok..."
nohup ngrok http 3001 > /tmp/ngrok.log 2>&1 &
sleep 3

# Check status
echo ""
echo "✅ Status:"
ps aux | grep "node server.js" | grep -v grep && echo "  ✅ Server running" || echo "  ❌ Server not running"
ps aux | grep "ngrok http" | grep -v grep && echo "  ✅ ngrok running" || echo "  ❌ ngrok not running"
curl -s http://localhost:3001 > /dev/null && echo "  ✅ Server responding" || echo "  ❌ Server not responding"
echo ""

