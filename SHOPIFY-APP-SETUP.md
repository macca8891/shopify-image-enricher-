# 🚀 Shopify App Setup Guide - BuckyDrop Shipping

This guide will help you create a proper Shopify app for your BuckyDrop shipping integration.

## 📋 What You Need

To create a Shopify app, I need the following information:

### 1. **App Details**
- **App Name**: (e.g., "BuckyDrop Shipping" or "BuckyDrop Carrier Service")
- **App Description**: Brief description of what your app does
- **App URL**: Your publicly accessible HTTPS URL (NOT localhost)
  - Example: `https://your-domain.com` or `https://your-app.herokuapp.com`
  - This MUST be HTTPS and publicly accessible

### 2. **Your Current Setup**
Please provide:
- Do you already have a Shopify Partner account? (Yes/No)
- What's your shop domain? (e.g., `your-store.myshopify.com`)
- Where is your app currently hosted? (local, Heroku, Railway, etc.)
- What's your current `SHOPIFY_APP_URL` in your `.env` file?

### 3. **Required Scopes**
For carrier services, you need these scopes:
```
read_products,write_products,read_orders,read_shipping,write_shipping
```

## 🔧 Step-by-Step Setup

### Step 1: Create Shopify Partner Account

1. Go to [partners.shopify.com](https://partners.shopify.com)
2. Sign up or log in (it's free!)
3. Click **Apps** in the left sidebar

### Step 2: Create a New App

1. Click **Create app** → **Custom app** (for private use) or **Public app** (if you want to publish later)
2. Fill in:
   - **App name**: BuckyDrop Shipping (or your preferred name)
   - **App URL**: `https://your-domain.com` (MUST be HTTPS and public)
   - **Allowed redirection URLs**: 
     - `https://your-domain.com/api/auth/shopify/callback`
     - `https://your-domain.com/api/auth/shopify/callback?shop={shop}`

### Step 3: Configure API Scopes

In your app settings, go to **Configuration** → **Scopes** and add:

**Required for Carrier Service:**
- ✅ `read_products` - Read products
- ✅ `write_products` - Write products  
- ✅ `read_orders` - Read orders (REQUIRED for carrier services)
- ✅ `read_shipping` - Read shipping settings
- ✅ `write_shipping` - Write shipping settings

**Optional but recommended:**
- `read_files` - Read files
- `write_files` - Write files

### Step 4: Get Your API Credentials

1. In your app dashboard, go to **Client credentials**
2. Copy:
   - **API key** → This is your `SHOPIFY_API_KEY`
   - **API secret** → This is your `SHOPIFY_API_SECRET`

### Step 5: Update Your .env File

Add/update these values in your `.env` file:

```env
# Shopify App Configuration
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_APP_URL=https://your-domain.com
SHOPIFY_SCOPES=read_products,write_products,read_orders,read_shipping,write_shipping,read_files,write_files
```

### Step 6: Enable Carrier Calculated Shipping

1. In Shopify Admin → **Settings** → **Shipping and delivery**
2. Scroll to **Carrier accounts & fulfillment services**
3. Make sure **"Enable third-party calculated rates at checkout"** is enabled
4. If you don't see this option, you may need to upgrade to Shopify Grow plan or higher

### Step 7: Test the App

1. Restart your server
2. Visit: `https://your-domain.com/?shop=your-store.myshopify.com`
3. Complete the OAuth installation
4. Go to your shipping rates page
5. Click **"Enable Carrier Service"**
6. Check Shopify → Settings → Shipping → Manage rates
7. You should see "BuckyDrop Shipping" in the dropdown

## ⚠️ Important Notes

### HTTPS Requirement
- **Carrier services REQUIRE HTTPS** - localhost will NOT work
- Use a service like:
  - **ngrok** for local testing: `ngrok http 3001`
  - **Heroku** for production
  - **Railway** for production
  - **Cloudflare Tunnel** for production

### Testing Locally with ngrok

If you want to test locally:

```bash
# Install ngrok
brew install ngrok  # Mac
# or download from ngrok.com

# Start your server
npm start

# In another terminal, start ngrok
ngrok http 3001

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Use this as your SHOPIFY_APP_URL
```

### Common Issues

1. **"Carrier service not showing in dropdown"**
   - Make sure Carrier Calculated Shipping is enabled
   - Make sure you have Shopify Grow plan or higher
   - Check that the app is properly installed
   - Verify the callback URL is HTTPS

2. **"Authentication failed"**
   - Check your API key and secret are correct
   - Make sure redirect URLs match exactly
   - Clear browser cache and try again

3. **"Callback URL not accessible"**
   - Make sure your server is running
   - Make sure the URL is publicly accessible (not localhost)
   - Check firewall/security settings

## 📝 What I Need From You

Please provide:

1. **Your shop domain**: `your-store.myshopify.com`
2. **Your app hosting URL**: Where is your app deployed? (or are you using ngrok?)
3. **App name preference**: What do you want to call the app?
4. **Do you have a Shopify Partner account?**: Yes/No

Once you provide these details, I can help you:
- Create the app in Shopify Partners
- Configure all the settings
- Set up the carrier service
- Test everything end-to-end

