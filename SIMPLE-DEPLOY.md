# 🚀 Simple Deployment - BuckyDrop Shipping

## Deploy to Railway (5 minutes)

Railway gives you HTTPS automatically - no ngrok needed!

### Step 1: Sign up
1. Go to: https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repo

### Step 2: Add Environment Variables
In Railway dashboard, go to Variables tab and add:

```
SHOPIFY_API_KEY=your_client_id
SHOPIFY_API_SECRET=your_client_secret
SHOPIFY_APP_URL=https://your-app-name.up.railway.app
SHOPIFY_SCOPES=read_products,write_products,read_orders,read_shipping,write_shipping
MONGODB_URI=your_mongodb_uri
BUCKY_DROP_APPCODE=ae75dfea63cc39f6efe052af4a8b9dea
BUCKY_DROP_APPSECRET=8d8e3c046d6bf420b5999899786d8481
PORT=3001
```

### Step 3: Get Your URL
Railway gives you a URL like: `https://your-app-name.up.railway.app`

### Step 4: Create Shopify App
1. Go to: https://partners.shopify.com
2. Create app → Custom app
3. App URL: `https://your-app-name.up.railway.app`
4. Redirect URL: `https://your-app-name.up.railway.app/api/auth/shopify/callback`
5. Scopes: `read_products,write_products,read_orders,read_shipping,write_shipping`

### Step 5: Update Railway Variables
Update `SHOPIFY_APP_URL` with your actual Railway URL

### Step 6: Access Your App
Visit: `https://your-app-name.up.railway.app/?shop=your-store.myshopify.com`

Done! No ngrok, no localhost issues.
