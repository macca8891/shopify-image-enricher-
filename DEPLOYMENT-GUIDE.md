# Deployment Guide - BuckyDrop Proxy

This guide will help you deploy the BuckyDrop proxy to various platforms.

## Prerequisites

1. Node.js 16+ installed
2. `.env` file configured with:
   ```bash
   BUCKY_DROP_APPCODE=ae75dfea63cc39f6efe052af4a8b9dea
   BUCKY_DROP_APPSECRET=8d8e3c046d6bf420b5999899786d8481
   PORT=3001
   NODE_ENV=production
   ```

## Option 1: Docker (Recommended for VPS)

### Quick Start
```bash
# Build and start
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Manual Docker
```bash
# Build image
docker build -t buckydrop-proxy .

# Run container
docker run -d \
  --name buckydrop-proxy \
  -p 3001:3001 \
  --env-file .env \
  --restart unless-stopped \
  buckydrop-proxy
```

## Option 2: PM2 (Simple Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Start the app
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions it prints

# Useful commands
pm2 status          # Check status
pm2 logs            # View logs
pm2 restart all     # Restart
pm2 stop all        # Stop
```

## Option 3: Systemd (Linux Service)

```bash
# Use the deployment script
./scripts/deploy.sh systemd

# Or manually:
sudo nano /etc/systemd/system/buckydrop-proxy.service
# Copy the service file content from scripts/deploy.sh

sudo systemctl daemon-reload
sudo systemctl enable buckydrop-proxy
sudo systemctl start buckydrop-proxy
sudo systemctl status buckydrop-proxy
```

## Option 4: Railway (Easiest Cloud Deployment)

1. Go to [railway.app](https://railway.app)
2. Sign up/login
3. Click "New Project" → "Deploy from GitHub repo"
4. Connect your repository
5. Add environment variables:
   - `BUCKY_DROP_APPCODE`
   - `BUCKY_DROP_APPSECRET`
   - `PORT=3001`
   - `NODE_ENV=production`
6. Railway will auto-deploy
7. Get your URL from Railway dashboard
8. Railway provides a static IP (check their docs)

## Option 5: Heroku

```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set BUCKY_DROP_APPCODE=your_appcode
heroku config:set BUCKY_DROP_APPSECRET=your_secret
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# Note: Heroku free tier doesn't have static IPs
# You'll need a paid addon like Fixie or QuotaGuard
```

## Option 6: AWS EC2 (Full Control)

### Step 1: Launch EC2 Instance
1. Go to AWS Console → EC2
2. Launch Instance
3. Choose Ubuntu 22.04 LTS
4. Select t2.micro (free tier) or t3.small
5. Configure security group:
   - Allow HTTP (port 80)
   - Allow HTTPS (port 443)
   - Allow Custom TCP (port 3001)
6. Launch and download key pair

### Step 2: Assign Elastic IP
1. EC2 → Elastic IPs → Allocate Elastic IP
2. Associate with your instance
3. **This is your static IP for whitelisting!**

### Step 3: Connect and Setup
```bash
# SSH into your instance
ssh -i your-key.pem ubuntu@your-elastic-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone your repo (or upload files)
git clone your-repo-url
cd shopify-image-enricher

# Install dependencies
npm install --production

# Create .env file
nano .env
# Add your environment variables

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
# Follow instructions to enable on boot
```

### Step 4: Setup Nginx (Optional but Recommended)
```bash
# Install Nginx
sudo apt install nginx

# Create config
sudo nano /etc/nginx/sites-available/buckydrop-proxy

# Add this content:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/buckydrop-proxy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Option 7: DigitalOcean Droplet

1. Create Droplet (Ubuntu 22.04)
2. Choose plan ($6/month minimum)
3. Add SSH key
4. **Reserve a Static IP** (important!)
5. Follow AWS EC2 steps above (same process)

## Testing Your Deployment

```bash
# Health check
curl https://your-server.com/api/buckydrop/health

# Get IP address
curl https://your-server.com/api/buckydrop/ip

# Test shipping rates
curl -X POST https://your-server.com/api/buckydrop/shipping-rates \
  -H "Content-Type: application/json" \
  -d '{
    "destination": {
      "lang": "en",
      "country": "Australia",
      "countryCode": "AU",
      "provinceCode": "VIC",
      "province": "Victoria",
      "detailAddress": "18 Joan St Moorabbin",
      "postCode": "3189"
    },
    "productList": [{
      "length": 10.5,
      "width": 10.5,
      "height": 15.2,
      "weight": 1.234,
      "count": 1,
      "categoryCode": "other"
    }]
  }'
```

## Getting Your Static IP

After deployment, get your IP:

```bash
# Method 1: Use the endpoint
curl https://your-server.com/api/buckydrop/ip

# Method 2: Use the script
npm run get-ip

# Method 3: Check your hosting provider dashboard
# - AWS: EC2 → Elastic IPs
# - DigitalOcean: Networking → Reserved IPs
# - Railway: Settings → Networking
```

## Next Steps

1. ✅ Deploy the server
2. ✅ Get your static IP
3. ✅ Add IP to BuckyDrop whitelist
4. ✅ Update Google Apps Script `PROXY_URL`
5. ✅ Test from Google Sheets!

## Troubleshooting

### Port Already in Use
```bash
# Find what's using port 3001
sudo lsof -i :3001
# Kill the process or change PORT in .env
```

### Can't Connect
- Check firewall rules
- Verify security groups (AWS) or firewall (DigitalOcean)
- Ensure port 3001 is open

### Service Won't Start
- Check logs: `pm2 logs` or `docker-compose logs`
- Verify `.env` file exists and has correct values
- Check Node.js version: `node --version` (needs 16+)

### IP Not Static
- AWS: Use Elastic IP (free when attached to running instance)
- DigitalOcean: Reserve IP in Networking section
- Heroku: Need paid addon (Fixie, QuotaGuard)
- Railway: Check their networking docs

## Quick Deploy Script

Use the provided script for quick deployment:

```bash
# Make executable (if not already)
chmod +x scripts/deploy.sh

# Deploy with Docker
./scripts/deploy.sh docker

# Deploy with PM2
./scripts/deploy.sh pm2

# Deploy with systemd
./scripts/deploy.sh systemd
```


