# 🚀 Production Deployment Guide - Live Store Setup

## What You Need

### 1. **Production Server with HTTPS**
   - Your app needs a publicly accessible HTTPS URL (not ngrok)
   - Examples: AWS, Heroku, DigitalOcean, Railway, etc.
   - **Production URL**: `https://your-production-domain.com`

### 2. **Shopify App Credentials** (from Shopify Partners)
   - **Client ID** (API Key)
   - **Client Secret** (API Secret)
   - These come from creating an app in Shopify Partners Dashboard

### 3. **Shopify Access Token** (one of two methods)
   - **Option A**: OAuth flow (automatic - recommended)
   - **Option B**: Manual Admin API token (if you prefer)

### 4. **BuckyDrop Credentials** (already have these)
   - Already configured in your code

---

## Step-by-Step Deployment

### Step 1: Deploy Your Server

Deploy your Node.js app to a production server with HTTPS. The server needs:
- Node.js 18+ installed
- Port 3001 (or configure PORT env var)
- MongoDB connection (or update MONGODB_URI)

**Example deployment commands:**
```bash
# Install dependencies
npm install

# Set environment variables (see Step 2)
# Start server
npm start
```

---

### Step 2: Create Shopify App in Partners Dashboard

1. Go to: **https://partners.shopify.com**
2. Login with your Shopify Partners account
3. Click: **Apps** → **Create app**
4. Choose: **Custom app** (or **Public app** if you want to publish later)
5. Fill in:
   - **App name**: `BuckyDrop Shipping`
   - **App URL**: `https://your-production-domain.com`
   - **Allowed redirection URL(s)**: `https://your-production-domain.com/api/auth/shopify/callback`
6. Click **Configure** → **Scopes** → Add these:
   - `read_products`
   - `write_products`
   - `read_orders`
   - `read_shipping`
   - `write_shipping`
7. Click **Save**
8. Go to **API credentials** tab
9. **Copy these values:**
   - **Client ID** (this is your `SHOPIFY_API_KEY`)
   - **Client secret** (this is your `SHOPIFY_API_SECRET`)

---

### Step 3: Install App on Your Live Store

**Option A: OAuth Flow (Recommended - Automatic Token)**

1. Set these environment variables on your production server:
```env
SHOPIFY_API_KEY=your_client_id_from_step_2
SHOPIFY_API_SECRET=your_client_secret_from_step_2
SHOPIFY_APP_URL=https://your-production-domain.com
SHOPIFY_SCOPES=read_products,write_products,read_orders,read_shipping,write_shipping

# BuckyDrop (already configured)
BUCKY_DROP_APPCODE=ae75dfea63cc39f6efe052af4a8b9dea
BUCKY_DROP_APPSECRET=8d8e3c046d6bf420b5999899786d8481

# Database
MONGODB_URI=your_mongodb_connection_string

# Server
PORT=3001
NODE_ENV=production
```

2. Restart your server

3. Visit this URL in your browser (replace with your store):
```
https://your-production-domain.com/?shop=spare-part-mart.myshopify.com
```

4. This will redirect you to Shopify to approve permissions
5. After approval, the access token is automatically saved

**Option B: Manual Access Token (Alternative)**

If you prefer to use a manual Admin API token:

1. In Shopify Admin → **Settings** → **Apps and sales channels** → **Develop apps**
2. Create a custom app or use existing one
3. Go to **API credentials** → **Admin API access token**
4. Generate token with scopes: `read_products`, `write_products`, `read_orders`, `read_shipping`, `write_shipping`
5. Copy the token (starts with `shpat_...`)

Then set in your `.env`:
```env
SHOPIFY_ACCESS_TOKEN=shpat_your_token_here
SHOPIFY_API_KEY=your_client_id
SHOPIFY_API_SECRET=your_client_secret
SHOPIFY_APP_URL=https://your-production-domain.com
```

---

### Step 4: Register Carrier Service

Once authenticated, register the carrier service:

1. Visit: `https://your-production-domain.com/app.html?shop=spare-part-mart.myshopify.com`
2. Click **"Enable Carrier Service"**
3. Wait for success message

OR use the API directly:
```bash
curl -X POST https://your-production-domain.com/api/shipping/register-carrier-service \
  -H "Content-Type: application/json" \
  -d '{"shop":"spare-part-mart.myshopify.com"}'
```

---

### Step 5: Add to Shipping Zones

1. Go to Shopify Admin → **Settings** → **Shipping and delivery**
2. For each shipping zone, click **"Manage rates"**
3. Click **"Add rate"**
4. Select **"Use carrier or app to calculate rates"**
5. Choose **"BuckyDrop Shipping"** from dropdown
6. Click **"Done"** → **"Save"**

---

### Step 6: Test at Checkout

1. Add a product to cart
2. Go to checkout
3. Enter a shipping address
4. BuckyDrop rates should appear!

---

## Environment Variables Summary

**Required:**
```env
# Shopify App
SHOPIFY_API_KEY=your_client_id
SHOPIFY_API_SECRET=your_client_secret
SHOPIFY_APP_URL=https://your-production-domain.com
SHOPIFY_SCOPES=read_products,write_products,read_orders,read_shipping,write_shipping

# OR use manual token instead of OAuth:
SHOPIFY_ACCESS_TOKEN=shpat_your_token_here

# BuckyDrop (already configured)
BUCKY_DROP_APPCODE=ae75dfea63cc39f6efe052af4a8b9dea
BUCKY_DROP_APPSECRET=8d8e3c046d6bf420b5999899786d8481

# Database
MONGODB_URI=your_mongodb_connection_string

# Server
PORT=3001
NODE_ENV=production
```

---

## Quick Checklist

- [ ] Server deployed with HTTPS
- [ ] Shopify app created in Partners Dashboard
- [ ] App URL and redirect URL configured
- [ ] Scopes added (read_products, write_products, read_orders, read_shipping, write_shipping)
- [ ] Environment variables set on production server
- [ ] App installed via OAuth or manual token set
- [ ] Carrier service registered
- [ ] Carrier service added to shipping zones
- [ ] Tested at checkout

---

## Troubleshooting

**"Shop not authenticated"**
- Complete OAuth flow OR set `SHOPIFY_ACCESS_TOKEN` in .env

**"Shipping not available"**
- Check carrier service is registered
- Check carrier service is added to shipping zones
- Check server logs for errors
- Verify product has metafields (dimensions, weight)

**"Carrier service not showing in dropdown"**
- Make sure carrier service is registered
- Check shipping zone has "Use carrier or app" enabled
- Refresh Shopify admin page

---

## Need Help?

Check server logs:
```bash
tail -f /tmp/server.log
```

Or check carrier service status:
```bash
curl "https://your-production-domain.com/api/shipping/carrier-service-status?shop=spare-part-mart.myshopify.com"
```

