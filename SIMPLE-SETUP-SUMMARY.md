# ✅ Simple Setup - No OAuth, No ngrok Complexity

## What Changed

I've updated the app to work **exactly like your image enricher app** - using a simple Admin API access token from environment variables, **no OAuth complexity**.

## How It Works Now

1. **Get Admin API access token** from Shopify Dev Dashboard (when you install the app)
2. **Add token to `.env`** file
3. **Run registration script** - done!

No OAuth flow, no ngrok URLs, no complex setup.

## Step-by-Step Instructions

### Step 1: Install App & Get Token

Follow the guide: **`GET-TOKEN-FROM-DEV-DASHBOARD.md`**

Quick summary:
1. Dev Dashboard → **Home** → **Install app**
2. Select your store → **Install**
3. Approve scopes (read_products, write_products, read_orders, read_shipping, write_shipping)
4. Copy the **Admin API access token** (starts with `shpat_`)

### Step 2: Add to .env

```env
SHOPIFY_ACCESS_TOKEN=shpat_your_token_here
SHOP_DOMAIN=app-test-1111231295.myshopify.com
SHOPIFY_APP_URL=http://localhost:3001
```

### Step 3: Register Carrier Service

```bash
node register-carrier-simple.js
```

That's it! The app now works with the access token directly, just like the image enricher.

## What Was Updated

✅ **Shipping routes** now check `SHOPIFY_ACCESS_TOKEN` from `.env` first, then fall back to OAuth token  
✅ **Carrier service callback** doesn't require authentication (Shopify calls it directly)  
✅ **Registration script** updated to use latest API version  

## Testing

1. Make sure your server is running: `npm start`
2. Run registration: `node register-carrier-simple.js`
3. Go to Shopify Admin → Settings → Shipping → Manage rates
4. You should see "BuckyDrop Shipping" in the dropdown

## Troubleshooting

**"Shop not authenticated" error:**
- Make sure `SHOPIFY_ACCESS_TOKEN` is set in `.env`
- Make sure the token starts with `shpat_`
- Make sure you installed the app and approved all scopes

**"Missing scopes" error:**
- Reinstall the app and make sure to approve:
  - read_shipping
  - write_shipping  
  - read_orders (REQUIRED!)

That's it! Simple and straightforward, just like you wanted.

