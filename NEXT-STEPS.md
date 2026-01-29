# ✅ App Created! Next Steps

Your app "BuckyDrop Shipping" is created! Now:

## Step 1: Get API Credentials

In your Shopify Partners dashboard:

1. Click on your app **"BuckyDrop Shipping"**
2. Go to **API credentials** tab (or **Client credentials**)
3. Copy:
   - **Client ID** (API Key)
   - **Client secret** (API Secret)

## Step 2: Configure Scopes

Make sure these scopes are enabled:
1. Go to **Configuration** → **Scopes**
2. Add these scopes:
   - ✅ `read_products`
   - ✅ `write_products`
   - ✅ `read_orders` ⚠️ **REQUIRED for carrier services**
   - ✅ `read_shipping`
   - ✅ `write_shipping`
3. Click **Save**

## Step 3: Update .env File

Add these to your `.env` file:

```env
SHOPIFY_API_KEY=your_client_id_here
SHOPIFY_API_SECRET=your_client_secret_here
SHOPIFY_APP_URL=https://cynthia-vaccinial-teisha.ngrok-free.dev
SHOPIFY_SCOPES=read_products,write_products,read_orders,read_shipping,write_shipping
```

Replace `your_client_id_here` and `your_client_secret_here` with the actual values from Step 1.

## Step 4: Restart Server

```bash
# Stop server (Ctrl+C in the terminal running npm start)
npm start
```

## Step 5: Install App

Visit this URL:

```
https://cynthia-vaccinial-teisha.ngrok-free.dev/?shop=spare-part-mart.myshopify.com
```

You'll be redirected to Shopify to authorize the app. Click **Install**.

## Step 6: Enable Carrier Service

1. Go to: `https://cynthia-vaccinial-teisha.ngrok-free.dev/shipping-rates.html`
2. Click: **"Enable Carrier Service"** button
3. Check browser console (F12) for success message
4. Go to: Shopify Admin → Settings → Shipping & delivery
5. Click: **"Manage rates"** for your shipping zone
6. Click: **"Add rate"** → **"Use carrier or app to calculate rates"**
7. Look for **"BuckyDrop Shipping"** in the dropdown! 🎉

---

**Share your Client ID and Client Secret** and I'll help you update the .env file!

