# 🚀 Simple Setup - Private Custom App

Since this is just for YOUR store, we'll create a **Custom App** directly in Shopify Admin. Much simpler!

## Step 1: Create Custom App in Shopify Admin

1. **Go to**: Your Shopify Admin → `spare-part-mart.myshopify.com/admin`
2. **Click**: Settings (bottom left)
3. **Click**: Apps and sales channels
4. **Click**: Develop apps (at the bottom)
5. **Click**: Create an app
6. **Name it**: `BuckyDrop Shipping`
7. **Click**: Create app

## Step 2: Configure API Scopes

1. **Click**: Configure Admin API scopes
2. **Add these scopes**:
   - ✅ `read_products`
   - ✅ `write_products`
   - ✅ `read_orders` (REQUIRED for carrier services)
   - ✅ `read_shipping`
   - ✅ `write_shipping`
3. **Click**: Save

## Step 3: Install the App

1. **Click**: Install app (top right)
2. **Click**: Install (confirm)
3. **Copy the Admin API access token** (you'll see it after installation)

## Step 4: Update Your .env File

Add these to your `.env`:

```env
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_APP_URL=https://your-ngrok-url.ngrok-free.app
SHOPIFY_SCOPES=read_products,write_products,read_orders,read_shipping,write_shipping
```

**Wait** - for a custom app, you don't need API_KEY/SECRET for OAuth. You just need the **Admin API access token**.

Actually, let me check your code to see how it's set up...

## Step 5: Register Carrier Service

Once the app is installed:
1. Go to your shipping rates page
2. Click "Enable Carrier Service"
3. It will register BuckyDrop as a carrier service
4. Go to Settings → Shipping → Manage rates
5. Add "BuckyDrop Shipping" to your shipping zones

---

**That's it!** No Partner account, no OAuth flow, just a simple custom app.

