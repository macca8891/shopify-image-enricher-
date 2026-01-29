# 🚀 Railway Quick Start Guide

## Step 1: Go to Railway Website

1. **Open your web browser** (Chrome, Safari, Firefox, etc.)
2. Go to: **https://railway.app**
3. Click **"Login"** or **"Start a New Project"**
4. **Sign in with GitHub** (use the same GitHub account where your code is)

---

## Step 2: Create New Project

1. Once logged in, you'll see Railway dashboard
2. Click **"New Project"** button (usually top right or center)
3. Select **"Deploy from GitHub repo"**
4. Railway will show your GitHub repositories
5. **Select:** `shopify-image-enricher` (or whatever your repo is called)
6. Click **"Deploy"**

---

## Step 3: Wait for Deployment

- Railway will automatically:
  - Detect it's a Node.js app
  - Install dependencies (`npm install`)
  - Start your server (`npm start`)
- This takes **2-5 minutes**
- Watch the build logs for progress

---

## Step 4: Get Your URL

**After deployment completes:**

1. Click on your **service** (the card that appeared)
2. Click **"Settings"** tab (top of page)
3. Scroll to **"Networking"** section
4. Under **"Domains"**, you'll see:
   - `https://your-app-name.up.railway.app`
5. **Copy that URL** - that's your Railway app URL!

**OR:**

- The URL might be shown on the main service page
- Look for a **"Public URL"** or **"Domain"** section
- Click the copy button next to it

---

## Step 5: Set Environment Variables

1. In your Railway service, click **"Variables"** tab
2. Click **"New Variable"** for each one:

```
PORT=3001
NODE_ENV=production
MONGODB_URI=your_mongodb_connection_string
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_APP_URL=https://your-app-name.up.railway.app
SHOPIFY_SCOPES=read_products,write_products,read_orders,read_shipping,write_shipping
BUCKY_DROP_APPCODE=ae75dfea63cc39f6efe052af4a8b9dea
BUCKY_DROP_APPSECRET=8d8e3c046d6bf420b5999899786d8481
```

3. Replace `your-app-name.up.railway.app` with your actual Railway URL
4. Railway will auto-restart after adding variables

---

## Troubleshooting

**"No repositories found"**
- Make sure you're logged into Railway with the correct GitHub account
- Check that your code is pushed to GitHub
- Try refreshing the page

**"Can't find URL"**
- Wait for deployment to finish (check "Deployments" tab)
- Look in Settings → Networking → Domains
- Check the service overview page

**"Deployment failed"**
- Check the logs in "Deployments" tab
- Make sure `package.json` has a `start` script
- Verify all dependencies are in `package.json`

---

## Need Help?

Tell me:
1. Are you on railway.app website?
2. Did you sign in with GitHub?
3. Do you see your repository listed?
4. What step are you stuck on?

