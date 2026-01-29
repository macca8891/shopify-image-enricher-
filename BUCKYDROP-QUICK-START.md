# BuckyDrop Proxy - Quick Start Guide

## The Problem
Google Apps Script uses dynamic IP addresses that change frequently. BuckyDrop requires IP whitelisting, so direct calls from Google Apps Script fail.

## The Solution
A proxy server running on a **fixed IP** that:
1. Receives requests from Google Apps Script
2. Handles HMAC authentication with BuckyDrop
3. Forwards requests to BuckyDrop API
4. Returns formatted results to Google Apps Script

## Quick Setup (5 Steps)

### 1. Deploy Your Server
Deploy this Node.js app to any service with a fixed IP:
- **AWS EC2** (with Elastic IP) - Recommended
- **DigitalOcean Droplet** (with Reserved IP)
- **Heroku** (with static IP addon)
- **Railway/Render** (with static IP)

### 2. Set Environment Variables
```bash
BUCKY_DROP_APPCODE=ae75dfea63cc39f6efe052af4a8b9dea
BUCKY_DROP_APPSECRET=8d8e3c046d6bf420b5999899786d8481
PORT=3001
NODE_ENV=production
```

### 3. Get Your Server's IP
After deployment, run:
```bash
npm run get-ip
```

Or visit: `https://your-server.com/api/buckydrop/ip`

Copy the `publicIp` value.

### 4. Whitelist IP with BuckyDrop
1. Log into BuckyDrop
2. Go to API Settings → Address Configuration
3. Add your server's public IP
4. Save

### 5. Update Google Apps Script
1. Open your Google Sheet → Extensions → Apps Script
2. Copy code from `google-apps-script-buckydrop-proxy.gs`
3. Update `PROXY_URL`:
   ```javascript
   PROXY_URL: "https://your-server.com/api/buckydrop/shipping-rates"
   ```
4. Save and run!

## Testing

Test your proxy is working:
```bash
curl https://your-server.com/api/buckydrop/health
```

Should return:
```json
{"status":"healthy","service":"BuckyDrop Proxy","timestamp":"..."}
```

## Files Created

- `services/BuckyDropService.js` - Core service handling HMAC auth
- `routes/buckydrop.js` - API endpoints
- `google-apps-script-buckydrop-proxy.gs` - Updated Google Apps Script
- `scripts/get-server-ip.js` - Helper to get your IP
- `README-BUCKYDROP-PROXY.md` - Full documentation

## Need Help?

1. Check server logs
2. Check "Debug Log" sheet in Google Sheets
3. Test `/api/buckydrop/health` endpoint
4. Verify IP is whitelisted with BuckyDrop


