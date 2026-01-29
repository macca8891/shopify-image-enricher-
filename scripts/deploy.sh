#!/bin/bash

# Deployment script for BuckyDrop Proxy
# Usage: ./scripts/deploy.sh [platform]
# Platforms: docker, pm2, systemd

set -e

PLATFORM=${1:-docker}

echo "🚀 Deploying BuckyDrop Proxy using: $PLATFORM"

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "📝 Please create .env file with required variables:"
    echo "   BUCKY_DROP_APPCODE=..."
    echo "   BUCKY_DROP_APPSECRET=..."
    exit 1
fi

case $PLATFORM in
  docker)
    echo "🐳 Building Docker image..."
    docker build -t buckydrop-proxy .
    
    echo "🚀 Starting container..."
    docker-compose up -d
    
    echo "✅ Deployment complete!"
    echo "📋 Check status: docker-compose ps"
    echo "📋 View logs: docker-compose logs -f"
    echo "📋 Get IP: curl http://localhost:3001/api/buckydrop/ip"
    ;;
    
  pm2)
    echo "📦 Installing PM2..."
    npm install -g pm2 || echo "PM2 already installed"
    
    echo "🚀 Starting with PM2..."
    pm2 start ecosystem.config.js --env production
    
    echo "✅ Deployment complete!"
    echo "📋 Check status: pm2 status"
    echo "📋 View logs: pm2 logs buckydrop-proxy"
    echo "📋 Save PM2 config: pm2 save"
    echo "📋 Setup startup: pm2 startup"
    ;;
    
  systemd)
    echo "📝 Creating systemd service..."
    sudo tee /etc/systemd/system/buckydrop-proxy.service > /dev/null <<EOF
[Unit]
Description=BuckyDrop Proxy Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
Environment=NODE_ENV=production
EnvironmentFile=$(pwd)/.env
ExecStart=/usr/bin/node $(pwd)/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    echo "🔄 Reloading systemd..."
    sudo systemctl daemon-reload
    
    echo "🚀 Starting service..."
    sudo systemctl enable buckydrop-proxy
    sudo systemctl start buckydrop-proxy
    
    echo "✅ Deployment complete!"
    echo "📋 Check status: sudo systemctl status buckydrop-proxy"
    echo "📋 View logs: sudo journalctl -u buckydrop-proxy -f"
    ;;
    
  *)
    echo "❌ Unknown platform: $PLATFORM"
    echo "Available platforms: docker, pm2, systemd"
    exit 1
    ;;
esac

echo ""
echo "🌐 Next steps:"
echo "1. Get your server IP: curl http://localhost:3001/api/buckydrop/ip"
echo "2. Add IP to BuckyDrop whitelist"
echo "3. Update Google Apps Script PROXY_URL"


