# Get Access Token - Simple Steps

## Step 1: Go to Apps Settings

1. In Shopify Admin, click **Settings** (gear icon at bottom left)
2. Click **Apps and sales channels**

## Step 2: Create App

1. Scroll down, find **"Develop apps"** section
2. Click **"Develop apps"**
3. Click **"Create an app"**
4. Name it: `BuckyDrop Shipping`
5. Click **"Create app"**

## Step 3: Configure Scopes

After creating, you'll see tabs at the top:
- **Overview**
- **API credentials** ← Click this one
- **Configuration**

Click **"API credentials"** tab.

Then look for **"Admin API access scopes"** section.

Check these boxes:
- ✅ Read products
- ✅ Write products
- ✅ Read orders
- ✅ Read shipping
- ✅ Write shipping

Click **"Save"** button.

## Step 4: Install App

1. Click **"Install app"** button (top right of the page)
2. Click **"Install"** to confirm

## Step 5: Get Token

After installing, you'll see **"Admin API access token"** section.

Click **"Reveal token once"** or the eye icon.

**Copy the token** - it starts with `shpat_`

## Step 6: Add to .env

Add to your `.env` file:
```
SHOPIFY_ACCESS_TOKEN=shpat_your_token_here
SHOP_DOMAIN=app-test-1111231295.myshopify.com
```

## Step 7: Run Script

```bash
node register-carrier-simple.js
```

Done!

