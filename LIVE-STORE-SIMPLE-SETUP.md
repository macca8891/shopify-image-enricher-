# ✅ Simple Setup for Live Store - Private App Style

**Yes! You can run this as a private app, just like your image enricher app.** No Partners Dashboard needed!

---

## What You Need

1. **Admin API Access Token** (from Shopify Admin - custom app)
2. **Production server URL** (with HTTPS)
3. **BuckyDrop credentials** (already configured)

---

## Step-by-Step Setup

### Step 1: Create Custom App in Shopify Admin (Live Store)

1. Go to: `https://spare-part-mart.myshopify.com/admin`
2. Click **Settings** (gear icon at bottom left)
3. Click **Apps and sales channels**
4. Scroll down to **"Develop apps"** section
5. Click **"Develop apps"** button
6. Click **"Create an app"**
7. Enter app name: `BuckyDrop Shipping`
8. Click **"Create app"**

### Step 2: Configure API Scopes

1. Click **"API credentials"** tab
2. Find **"Admin API access scopes"** section
3. **Check these boxes:**
   - ✅ Read products
   - ✅ Write products
   - ✅ Read orders
   - ✅ Read shipping
   - ✅ Write shipping
4. Click **"Save"**

### Step 3: Install App & Get Token

1. Click **"Install app"** button (top right)
2. Click **"Install"** to confirm
3. After installation, you'll see **"Admin API access token"**
4. Click **"Reveal token once"** or the eye icon 👁️
5. **Copy the token** (starts with `shpat_...`)

**⚠️ IMPORTANT:** Copy it now - you might not be able to see it again!

### Step 4: Set Environment Variables on Production Server

Add these to your production server's `.env` file:

```env
# Shopify Access Token (from Step 3)
SHOPIFY_ACCESS_TOKEN=shpat_your_token_here

# Your production server URL (must be HTTPS)
SHOPIFY_APP_URL=https://your-production-domain.com

# Shop domain
SHOP_DOMAIN=spare-part-mart.myshopify.com

# BuckyDrop (already configured)
BUCKY_DROP_APPCODE=ae75dfea63cc39f6efe052af4a8b9dea
BUCKY_DROP_APPSECRET=8d8e3c046d6bf420b5999899786d8481

# Database
MONGODB_URI=your_mongodb_connection_string

# Server
PORT=3001
NODE_ENV=production
```

**Note:** You don't need `SHOPIFY_API_KEY` or `SHOPIFY_API_SECRET` for this approach!

### Step 5: Register Carrier Service

Once your server is running with the environment variables set, register the carrier service:

**Option A: Via API**
```bash
curl -X POST https://your-production-domain.com/api/shipping/register-carrier-service \
  -H "Content-Type: application/json" \
  -d '{"shop":"spare-part-mart.myshopify.com"}'
```

**Option B: Via Web UI**
Visit: `https://your-production-domain.com/app.html?shop=spare-part-mart.myshopify.com`
Click **"Enable Carrier Service"**

### Step 6: Add to Shipping Zones

1. Go to Shopify Admin → **Settings** → **Shipping and delivery**
2. For each shipping zone, click **"Manage rates"**
3. Click **"Add rate"**
4. Select **"Use carrier or app to calculate rates"**
5. Choose **"BuckyDrop Shipping"** from dropdown
6. Click **"Done"** → **"Save"**

### Step 7: Test at Checkout

1. Add a product to cart
2. Go to checkout
3. Enter a shipping address
4. BuckyDrop rates should appear!

---

## How It Works

- ✅ Uses Admin API token directly (no OAuth needed)
- ✅ Carrier service callback doesn't require authentication (Shopify calls it directly)
- ✅ Works exactly like your image enricher app
- ✅ No Partners Dashboard complexity

---

## Troubleshooting

**"Shop not authenticated"**
- Make sure `SHOPIFY_ACCESS_TOKEN` is set in `.env`
- Make sure token starts with `shpat_`
- Make sure you installed the app and approved all scopes

**"Shipping not available"**
- Check carrier service is registered
- Check carrier service is added to shipping zones
- Check server logs for errors
- Verify product has metafields (dimensions, weight)

**"Carrier service not showing"**
- Make sure carrier service is registered
- Check shipping zone has "Use carrier or app" enabled
- Refresh Shopify admin page

---

## That's It!

This is the simplest approach - just like your image enricher app. No OAuth, no Partners Dashboard, just a custom app and an access token!

