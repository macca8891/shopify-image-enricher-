# 🚀 Quick Setup Guide - BuckyDrop Shipping App

## Your Details
- **Shop**: spare-part-mart.myshopify.com
- **App Name**: BuckyDrop Shipping
- **Partner Email**: sparepartmartsales@gmail.com
- **Running**: Locally (need ngrok for HTTPS)

## Step 1: Install ngrok (if not already installed)

```bash
# Mac (using Homebrew)
brew install ngrok

# Or download from: https://ngrok.com/download
```

## Step 2: Start Your Server

```bash
cd /Users/michaelmchugh/shopify-image-enricher
npm start
# Server should be running on port 3001
```

## Step 3: Start ngrok (in a new terminal)

```bash
ngrok http 3001
```

You'll see output like:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:3001
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok-free.app`)

## Step 4: Create Shopify App

1. Go to [partners.shopify.com](https://partners.shopify.com)
2. Log in with: sparepartmartsales@gmail.com
3. Click **Apps** → **Create app** → **Custom app**
4. Fill in:
   - **App name**: BuckyDrop Shipping
   - **App URL**: `https://abc123.ngrok-free.app` (use your ngrok URL)
   - **Allowed redirection URLs**: 
     - `https://abc123.ngrok-free.app/api/auth/shopify/callback`
5. Click **Configure** → **Scopes** and add:
   - ✅ `read_products`
   - ✅ `write_products`
   - ✅ `read_orders` (REQUIRED for carrier services)
   - ✅ `read_shipping`
   - ✅ `write_shipping`
   - ✅ `read_files`
   - ✅ `write_files`
6. Click **Save**
7. Go to **API credentials** tab
8. Copy:
   - **Client ID** (API Key)
   - **Client secret** (API Secret)

## Step 5: Update .env File

Add these to your `.env` file:

```env
SHOPIFY_API_KEY=your_client_id_here
SHOPIFY_API_SECRET=your_client_secret_here
SHOPIFY_APP_URL=https://abc123.ngrok-free.app
SHOPIFY_SCOPES=read_products,write_products,read_orders,read_shipping,write_shipping,read_files,write_files
```

**Important**: Replace `abc123.ngrok-free.app` with your actual ngrok URL!

## Step 6: Restart Your Server

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm start
```

## Step 7: Install the App

1. Visit: `https://abc123.ngrok-free.app/?shop=spare-part-mart.myshopify.com`
2. Complete the OAuth installation
3. You should be redirected back to your app

## Step 8: Enable Carrier Service

1. Go to your shipping rates page
2. Click **"Enable Carrier Service"**
3. Check the console for success message
4. Go to Shopify Admin → Settings → Shipping & delivery
5. Click **"Manage rates"** for your shipping zone
6. Click **"Add rate"** → **"Use carrier or app to calculate rates"**
7. You should see **"BuckyDrop Shipping"** in the dropdown!

## ⚠️ Important Notes

- **ngrok URL changes** every time you restart ngrok (unless you have a paid plan)
- If ngrok restarts, you'll need to:
  1. Update `SHOPIFY_APP_URL` in `.env` with new URL
  2. Update the app URL in Shopify Partners dashboard
  3. Restart your server

## 🎯 Next Steps After Setup

Once everything is working:
1. Consider deploying to a permanent hosting service (Heroku, Railway, etc.)
2. Or get a paid ngrok plan for a static URL
3. Test the carrier service at checkout

