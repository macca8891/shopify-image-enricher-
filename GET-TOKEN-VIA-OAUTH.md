# Get Access Token via OAuth (Easiest Way)

Since you can't find the token in the UI, let's use OAuth to get it automatically.

## Step 1: Add Credentials to .env

Add these to your `.env` file:

```env
SHOPIFY_API_KEY=YOUR_SHOPIFY_API_KEY
SHOPIFY_API_SECRET=YOUR_SHOPIFY_API_SECRET
SHOPIFY_APP_URL=https://your-app-url.ngrok-free.dev
SHOPIFY_SCOPES=read_products,write_products,read_orders,read_shipping,write_shipping
```

## Step 2: Make Sure Server is Running

```bash
npm start
```

## Step 3: Visit OAuth URL

Open this URL in your browser (replace with your store domain):

```
https://your-app-url.ngrok-free.dev/api/auth/shopify?shop=your-shop.myshopify.com
```

This will:
1. Redirect you to Shopify to approve permissions
2. Redirect back to your app
3. Automatically save the access token to your database

## Step 4: Check if Token Was Saved

The token will be saved automatically. Then you can register the carrier service:

```bash
node register-carrier-simple.js
```

That's it! OAuth will handle getting the token for you.

