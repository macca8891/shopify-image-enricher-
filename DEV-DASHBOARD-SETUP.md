# 🚀 Setup via Shopify Dev Dashboard

Shopify now has a **Dev Dashboard** that's simpler than Partners for private apps!

## Step 1: Access Dev Dashboard

1. Go to: `https://spare-part-mart.myshopify.com/admin`
2. Click: **Settings** → **Apps and sales channels**
3. Click: **Develop apps** (or look for "Dev Dashboard")
4. You should see the new Dev Dashboard interface

## Step 2: Create App

1. Click: **Create app** (or similar button)
2. **App name**: `BuckyDrop Shipping`
3. **App URL**: We'll set this after ngrok (see below)
4. **Redirect URL**: We'll set this after ngrok

## Step 3: Set up ngrok (for HTTPS)

**You still need ngrok** because Shopify needs HTTPS to call your carrier service:

1. **Sign up**: https://dashboard.ngrok.com/signup (free)
2. **Get token**: https://dashboard.ngrok.com/get-started/your-authtoken  
3. **Configure**: `ngrok config add-authtoken YOUR_TOKEN`
4. **Start**: `ngrok http 3001`
5. **Copy HTTPS URL** (e.g., `https://abc123.ngrok-free.app`)

## Step 4: Configure App URLs

Back in Dev Dashboard:
1. **App URL**: `https://abc123.ngrok-free.app` (your ngrok URL)
2. **Redirect URL**: `https://abc123.ngrok-free.app/api/auth/shopify/callback`
3. **Scopes**: Add `read_products`, `write_products`, `read_orders`, `read_shipping`, `write_shipping`
4. **Save**

## Step 5: Get Credentials

In Dev Dashboard, find:
- **API Key** (Client ID)
- **API Secret** (Client Secret)

## Step 6: Update .env

```env
SHOPIFY_API_KEY=your_api_key_from_dev_dashboard
SHOPIFY_API_SECRET=your_api_secret_from_dev_dashboard
SHOPIFY_APP_URL=https://abc123.ngrok-free.app
SHOPIFY_SCOPES=read_products,write_products,read_orders,read_shipping,write_shipping
```

## Step 7: Install & Test

1. Restart server: `npm start`
2. Visit: `https://abc123.ngrok-free.app/?shop=spare-part-mart.myshopify.com`
3. Complete OAuth installation
4. Go to shipping rates page
5. Click "Enable Carrier Service"
6. Done! 🎉

---

**The Dev Dashboard should be simpler than Partners!** Let me know what you see in there.

