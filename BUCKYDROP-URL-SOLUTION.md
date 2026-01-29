# Solution: BuckyDrop Only Accepts URLs (Not IP Ranges)

## The Problem

BuckyDrop's interface only accepts a **URL** in the "Public IP Address" field, not IP ranges. Since Cloudflare Workers use multiple IP addresses, we need a different solution.

## The Solution

Deploy the Node.js proxy to a service with a **single static IP address**. Then you can:
1. Get that single IP address
2. Put your proxy server's URL in BuckyDrop's field
3. Whitelist that single IP

## Quick Deploy Options

### Option 1: Railway (Easiest - 5 minutes)

1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect this repository
4. Add environment variables:
   - `BUCKY_DROP_APPCODE=ae75dfea63cc39f6efe052af4a8b9dea`
   - `BUCKY_DROP_APPSECRET=8d8e3c046d6bf420b5999899786d8481`
   - `PORT=3001`
   - `NODE_ENV=production`
5. Railway will auto-deploy
6. Get your URL (e.g., `https://your-app.railway.app`)
7. **Get your IP**: Railway provides a static IP - check their networking docs or contact support
8. Put the URL in BuckyDrop: `https://your-app.railway.app/api/buckydrop/shipping-rates`

### Option 2: Render (Also Easy)

1. Go to [render.com](https://render.com) and sign up
2. Click "New" → "Web Service"
3. Connect your GitHub repo
4. Set:
   - **Name**: buckydrop-proxy
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Add environment variables (same as Railway)
6. Deploy
7. Get your URL: `https://your-app.onrender.com`
8. **Get your IP**: Render provides static IPs - check their docs
9. Put the URL in BuckyDrop

### Option 3: AWS EC2 (More Control)

1. Launch an EC2 instance (Ubuntu 22.04)
2. **Assign an Elastic IP** (this is your static IP!)
3. SSH into the instance
4. Install Node.js:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   ```
5. Clone your repo or upload files
6. Install dependencies: `npm install --production`
7. Create `.env` file with your credentials
8. Start with PM2:
   ```bash
   sudo npm install -g pm2
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```
9. Your URL: `http://YOUR_ELASTIC_IP:3001` (or use a domain)
10. Put the URL in BuckyDrop

### Option 4: DigitalOcean Droplet

1. Create a Droplet (Ubuntu 22.04)
2. **Reserve a Static IP** (in Networking section)
3. Follow the same steps as AWS EC2
4. Your URL: `http://YOUR_STATIC_IP:3001`
5. Put the URL in BuckyDrop

## What to Put in BuckyDrop

In the "Public IP Address" field, enter:
- **Your proxy server's URL**: `https://your-app.railway.app/api/buckydrop/shipping-rates`
- Or if using IP directly: `http://YOUR_STATIC_IP:3001/api/buckydrop/shipping-rates`

## Update Google Apps Script

After deploying, update your Google Apps Script:

```javascript
const CONFIG = {
  // Your new proxy server URL (replace with your actual URL)
  PROXY_URL: "https://your-app.railway.app/api/buckydrop/shipping-rates",
  // ... rest of config
};
```

## Testing

1. Deploy your proxy server
2. Test it: `curl https://your-app.railway.app/api/buckydrop/health`
3. Get your server's IP: `curl https://your-app.railway.app/api/buckydrop/ip`
4. Put the URL in BuckyDrop's "Public IP Address" field
5. Test from Google Sheets

## Why This Works

- Your proxy server has **one static IP address**
- You put the **URL** in BuckyDrop's field
- BuckyDrop can whitelist that single IP
- Google Apps Script calls your proxy
- Your proxy calls BuckyDrop with the whitelisted IP
- ✅ Everything works!

## Recommendation

**Use Railway or Render** - they're the easiest and fastest to set up. Both provide static IPs and HTTPS URLs automatically.


