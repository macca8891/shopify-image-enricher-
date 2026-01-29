#!/bin/bash

echo "🚀 BuckyDrop Shipping - Simple Setup"
echo "======================================"
echo ""

# Check if server is running
if ! lsof -ti:3001 > /dev/null 2>&1; then
    echo "❌ Server is not running!"
    echo ""
    echo "Please start your server first:"
    echo "  npm start"
    echo ""
    exit 1
fi

echo "✅ Server is running on port 3001"
echo ""

# Check if ngrok is running
if ! pgrep -f "ngrok http 3001" > /dev/null; then
    echo "⚠️  ngrok is not running"
    echo ""
    echo "Starting ngrok..."
    echo "📋 Copy the HTTPS URL that appears below:"
    echo ""
    ngrok http 3001
else
    echo "✅ ngrok is running"
    echo ""
    echo "Visit http://127.0.0.1:4040 to see your ngrok URL"
fi

