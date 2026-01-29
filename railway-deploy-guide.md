# Deploy to Railway (Easiest Solution)

Railway is the easiest way to get a single static IP for your BuckyDrop proxy.

## Step-by-Step Guide

### 1. Sign Up for Railway

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Sign up with GitHub (easiest)

### 2. Deploy Your App

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Select this repository (`shopify-image-enricher`)
4. Railway will detect it's a Node.js app and start deploying

### 3. Add Environment Variables

1. Click on your project
2. Go to "Variables" tab
3. Add these variables:

```
BUCKY_DROP_APPCODE=ae75dfea63cc39f6efe052af4a8b9dea
BUCKY_DROP_APPSECRET=8d8e3c046d6bf420b5999899786d8481
PORT=3001
NODE_ENV=production
```

4. Railway will automatically redeploy

### 4. Get Your URL

1. Go to "Settings" → "Networking"
2. Railway will show your public URL (e.g., `https://your-app.up.railway.app`)
3. Copy this URL

### 5. Get Your Static IP

Railway provides static IPs. To find yours:

1. Check Railway's documentation for networking/IP information
2. Or contact Railway support
3. Or use: `curl https://your-app.up.railway.app/api/buckydrop/ip`

The response will show your public IP.

### 6. Configure BuckyDrop

1. Log into BuckyDrop
2. Go to API Settings → Address Configuration
3. In "Public IP Address" field, enter:
   ```
   https://your-app.up.railway.app/api/buckydrop/shipping-rates
   ```
4. Click "Submit"

### 7. Update Google Apps Script

1. Open your Google Sheet → Extensions → Apps Script
2. Update the `PROXY_URL`:
   ```javascript
   const CONFIG = {
     PROXY_URL: "https://your-app.up.railway.app/api/buckydrop/shipping-rates",
     // ... rest
   };
   ```
3. Save

### 8. Test!

1. In Google Sheets: **SPM Tools** → **Calculate Shipping Rates**
2. Check the "Debug Log" sheet
3. Should work! ✅

## Railway Pricing

- **Free tier**: $5 credit/month (usually enough for this)
- **Hobby plan**: $5/month (if you need more)

## Troubleshooting

### App won't start
- Check the "Deployments" tab for errors
- Make sure all environment variables are set
- Check logs in Railway dashboard

### Can't find IP address
- Railway uses their own IP ranges
- Contact Railway support for your specific IP
- Or check Railway's networking documentation

### Still getting IP errors
- Make sure you put the **full URL** in BuckyDrop (not just the domain)
- Verify the URL is accessible: `curl https://your-app.up.railway.app/api/buckydrop/health`

## Alternative: Render.com

If Railway doesn't work, try [Render.com](https://render.com) - same process, similar free tier.


