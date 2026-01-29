# 🚀 Clean Start - BuckyDrop Shipping App

## What You Need

1. **A server with HTTPS** (not ngrok):
   - Railway.app (free tier available)
   - Render.com (free tier available)
   - Heroku (paid)
   - AWS/DigitalOcean (you manage it)

2. **Shopify App** created in Partners dashboard

3. **Environment variables** set

## Quick Setup

### Step 1: Deploy to Railway (Easiest)

1. Go to: https://railway.app
2. Sign up/login
3. Click "New Project" → "Deploy from GitHub repo"
4. Connect your repo
5. Add environment variables (see below)
6. Deploy

Railway gives you HTTPS automatically - no ngrok needed!

### Step 2: Get Your App URL

After deployment, Railway gives you a URL like:
```
https://your-app-name.up.railway.app
```

### Step 3: Create Shopify App

1. Go to: https://partners.shopify.com
2. Create app → Custom app
3. App URL: `https://your-app-name.up.railway.app`
4. Redirect URL: `https://your-app-name.up.railway.app/api/auth/shopify/callback`
5. Scopes: `read_products,write_products,read_orders,read_shipping,write_shipping`

### Step 4: Set Environment Variables

In Railway (or your hosting):
```
SHOPIFY_API_KEY=your_client_id
SHOPIFY_API_SECRET=your_client_secret
SHOPIFY_APP_URL=https://your-app-name.up.railway.app
SHOPIFY_SCOPES=read_products,write_products,read_orders,read_shipping,write_shipping
MONGODB_URI=your_mongodb_uri
BUCKY_DROP_APPCODE=ae75dfea63cc39f6efe052af4a8b9dea
BUCKY_DROP_APPSECRET=8d8e3c046d6bf420b5999899786d8481
```

### Step 5: Access Your App

Visit: `https://your-app-name.up.railway.app/?shop=your-store.myshopify.com`

That's it! No ngrok, no localhost issues.

