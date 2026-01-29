#!/bin/bash

# Setup PM2 for stable server management
# This will auto-restart the server if it crashes

echo "Setting up PM2 for BuckyDrop Shipping..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Stop any existing PM2 processes
pm2 stop buckydrop-shipping 2>/dev/null
pm2 delete buckydrop-shipping 2>/dev/null

# Kill any existing node processes on port 3001
lsof -ti:3001 | xargs kill -9 2>/dev/null
sleep 2

# Start server with PM2
cd /Users/michaelmchugh/shopify-image-enricher
pm2 start server.js --name buckydrop-shipping --log /tmp/pm2-server.log --error /tmp/pm2-server-error.log

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup | tail -1 | bash

echo ""
echo "✅ Server started with PM2!"
echo ""
echo "Useful commands:"
echo "  pm2 status          - Check server status"
echo "  pm2 logs            - View logs"
echo "  pm2 restart buckydrop-shipping - Restart server"
echo "  pm2 stop buckydrop-shipping    - Stop server"
echo ""
echo "Server should now auto-restart if it crashes!"

