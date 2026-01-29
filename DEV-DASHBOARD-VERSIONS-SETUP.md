# Dev Dashboard Versions Setup

## Step 1: Configure Scopes

In the Versions page, find the **"Scopes"** section.

Under **"Select scopes"**, enter this exactly:

```
read_products,write_products,read_orders,read_shipping,write_shipping
```

Leave **"Optional scopes"** empty.

## Step 2: Set App URL

In the **"URLs"** section:

- **App URL**: Enter your app URL
  - For local testing: `http://localhost:3001`
  - Or if using ngrok: `https://your-ngrok-url.ngrok-free.dev`

## Step 3: Set Redirect URLs

In **"Redirect URLs"**, enter:

```
http://localhost:3001/api/auth/shopify/callback
```

Or if using ngrok:

```
https://your-ngrok-url.ngrok-free.dev/api/auth/shopify/callback
```

## Step 4: Release Version

Click **"Release"** button at the bottom.

## Step 5: Install App & Get Token

After releasing:

1. Go to **"Home"** in the Dev Dashboard
2. Find **"Installs"** section
3. Click **"Install app"**
4. Select your store
5. Approve the scopes
6. Copy the **Admin API access token** (starts with `shpat_`)

## Step 6: Add to .env

```env
SHOPIFY_ACCESS_TOKEN=shpat_your_token_here
SHOP_DOMAIN=app-test-1111231295.myshopify.com
SHOPIFY_APP_URL=http://localhost:3001
```

## Step 7: Register Carrier Service

```bash
node register-carrier-simple.js
```

Done!

