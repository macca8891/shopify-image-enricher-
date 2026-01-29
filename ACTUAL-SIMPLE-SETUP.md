# ✅ ACTUAL Simple Setup - Skip Dev Dashboard Entirely

**Forget the Dev Dashboard.** Create a custom app directly in Shopify Admin, just like the image enricher app.

## Step 1: Go to Shopify Admin

1. Go to: `https://app-test-1111231295.myshopify.com/admin` (or your dev store URL)
2. Click **Settings** (gear icon at bottom left)
3. Click **Apps and sales channels**

## Step 2: Create Custom App

1. Scroll down to **"Develop apps"** section
2. Click **"Develop apps"** button
3. Click **"Create an app"**
4. Enter app name: `BuckyDrop Shipping`
5. Click **"Create app"**

## Step 3: Configure API Scopes

After creating, you'll see tabs at the top:
- **Overview**
- **API credentials** ← **Click this tab**
- **Configuration**

Click **"API credentials"** tab.

Then look for **"Admin API access scopes"** section.

**Check these boxes:**
- ✅ Read products
- ✅ Write products
- ✅ Read orders (REQUIRED!)
- ✅ Read shipping
- ✅ Write shipping

Click **"Save"** button.

## Step 4: Install App

1. Click **"Install app"** button (top right of the page)
2. Click **"Install"** to confirm

## Step 5: Get Access Token

After installing, you'll see **"Admin API access token"** section.

Click **"Reveal token once"** or the eye icon 👁️

**Copy the token** - it starts with `shpat_`

## Step 6: Add to .env

Add to your `.env` file:

```env
SHOPIFY_ACCESS_TOKEN=shpat_your_token_here
SHOP_DOMAIN=app-test-1111231295.myshopify.com
SHOPIFY_APP_URL=http://localhost:3001
```

## Step 7: Register Carrier Service

Run:

```bash
node register-carrier-simple.js
```

Done! This is exactly how the image enricher app worked - no Dev Dashboard, no OAuth, just a simple custom app in Shopify Admin.

