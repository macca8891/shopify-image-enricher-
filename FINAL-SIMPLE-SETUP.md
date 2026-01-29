# 🚀 Final Simple Setup - Private App via Partners

Since custom apps are deprecated, we'll create a **Custom app** through Partners (still private to you, just different process).

## Step 1: Create Partner Account (if needed)

1. Go to: https://partners.shopify.com
2. Sign up/login (free, no credit card)
3. Use: sparepartmartsales@gmail.com

## Step 2: Create Custom App

1. In Partners dashboard → **Apps** → **Create app** → **Custom app**
2. **App name**: `BuckyDrop Shipping`
3. **App URL**: We'll set this after ngrok (see below)
4. **Redirect URL**: We'll set this after ngrok

**Save it for now** (you can update URLs later)

## Step 3: Configure Scopes

1. Click **Configure** → **Scopes**
2. Add:
   - `read_products`
   - `write_products`
   - `read_orders` ⚠️ REQUIRED
   - `read_shipping`
   - `write_shipping`
3. **Save**

## Step 4: Get ngrok URL

1. **Sign up for ngrok**: https://dashboard.ngrok.com/signup (free)
2. **Get authtoken**: https://dashboard.ngrok.com/get-started/your-authtoken
3. **Configure**: `ngrok config add-authtoken YOUR_TOKEN`
4. **Start ngrok**: `ngrok http 3001`
5. **Copy HTTPS URL** (e.g., `https://abc123.ngrok-free.app`)

## Step 5: Update App URLs in Partners

1. Go back to your app in Partners
2. **App URL**: `https://abc123.ngrok-free.app` (your ngrok URL)
3. **Redirect URL**: `https://abc123.ngrok-free.app/api/auth/shopify/callback`
4. **Save**

## Step 6: Get API Credentials

1. Go to **API credentials** tab
2. Copy **Client ID** and **Client secret**

## Step 7: Update .env

```env
SHOPIFY_API_KEY=your_client_id
SHOPIFY_API_SECRET=your_client_secret
SHOPIFY_APP_URL=https://abc123.ngrok-free.app
SHOPIFY_SCOPES=read_products,write_products,read_orders,read_shipping,write_shipping
```

## Step 8: Install App

Visit: `https://abc123.ngrok-free.app/?shop=spare-part-mart.myshopify.com`

Complete OAuth installation.

## Step 9: Enable Carrier Service

1. Go to shipping rates page
2. Click "Enable Carrier Service"
3. Done! 🎉

---

**That's it!** The app is still private to you, just created through Partners instead of admin.

