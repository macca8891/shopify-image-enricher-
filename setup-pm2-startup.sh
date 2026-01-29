#!/bin/bash

# Setup PM2 to auto-start on boot
# This ensures the server restarts automatically when your computer reboots

echo "🔧 Setting up PM2 auto-startup..."
echo ""
echo "Run this command (it will ask for your password):"
echo ""
echo "sudo env PATH=$PATH:/usr/local/Cellar/node/24.7.0/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup launchd -u michaelmchugh --hp /Users/michaelmchugh"
echo ""
echo "After running that, save the current PM2 processes:"
echo "pm2 save"
echo ""
echo "⚠️  Note: This only helps if your computer stays on. For true 24/7 stability, deploy to a production server."

