# Quick Start - Get This Deployed in 10 Minutes

## Step 1: Setup GitHub (5 minutes)

```bash
# In your terminal, run these commands:
cd /Users/michaelmchugh/shopify-image-enricher

# Initialize git
git init
git add .
git commit -m "BuckyDrop proxy service"

# Create a new repo on GitHub.com (don't initialize with README)
# Then run (replace YOUR_USERNAME):
git remote add origin https://github.com/YOUR_USERNAME/buckydrop-proxy.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Railway (3 minutes)

1. Go to [railway.app](https://railway.app) → Sign up
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your `buckydrop-proxy` repository
4. Railway starts deploying automatically

## Step 3: Add Environment Variables (1 minute)

In Railway dashboard → **Variables** tab, add:

```
BUCKY_DROP_APPCODE=ae75dfea63cc39f6efe052af4a8b9dea
BUCKY_DROP_APPSECRET=8d8e3c046d6bf420b5999899786d8481
PORT=3001
NODE_ENV=production
```

## Step 4: Get Your URL (30 seconds)

1. Railway → **Settings** → **Networking**
2. Copy your URL: `https://your-app.up.railway.app`
3. Full endpoint: `https://your-app.up.railway.app/api/buckydrop/shipping-rates`

## Step 5: Configure BuckyDrop (1 minute)

1. Log into BuckyDrop
2. Go to **API Settings** → **Address Configuration**
3. In **"Public IP Address"** field, paste:
   ```
   https://your-app.up.railway.app/api/buckydrop/shipping-rates
   ```
4. Click **"Submit"**

## Step 6: Update Google Apps Script (30 seconds)

1. Open Google Sheet → **Extensions** → **Apps Script**
2. Open `google-apps-script-buckydrop-proxy.gs`
3. Update line 18:
   ```javascript
   PROXY_URL: "https://your-app.up.railway.app/api/buckydrop/shipping-rates",
   ```
4. Save

## Step 7: Test! ✅

1. In Google Sheets: **SPM Tools** → **Calculate Shipping Rates**
2. Check "Debug Log" sheet
3. Should work!

---

## Troubleshooting

**Git push fails?**
- Make sure you created the GitHub repo first
- Check your GitHub username is correct
- You might need to authenticate (GitHub will prompt you)

**Railway deployment fails?**
- Check the logs in Railway dashboard
- Make sure all environment variables are set
- Verify `server.js` exists (it does!)

**Still confused?**
- See `SETUP-GITHUB.md` for detailed instructions
- Or use Railway CLI (see `SETUP-GITHUB.md` Option 2)

---

**Total time: ~10 minutes** ⏱️


