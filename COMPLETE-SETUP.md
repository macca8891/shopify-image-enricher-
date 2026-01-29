# ✅ Complete Setup - Final Steps

Your ngrok URL: `https://cynthia-vaccinial-teisha.ngrok-free.dev`

## Step 1: Create App in Shopify Partners

1. Go to: https://partners.shopify.com
2. Login with: sparepartmartsales@gmail.com
3. Click: **Apps** → **Create app** → **Custom app**
4. Fill in:
   - **App name**: `BuckyDrop Shipping`
   - **App URL**: `https://cynthia-vaccinial-teisha.ngrok-free.dev`
   - **Allowed redirection URLs**: `https://cynthia-vaccinial-teisha.ngrok-free.dev/api/auth/shopify/callback`
5. Click **Configure** → **Scopes** → Add:
   - ✅ `read_products`
   - ✅ `write_products`
   - ✅ `read_orders` ⚠️ REQUIRED
   - ✅ `read_shipping`
   - ✅ `write_shipping`
6. Click **Save**
7. Go to **API credentials** tab
8. Copy:
   - **Client ID** (API Key)
   - **Client secret** (API Secret)

## Step 2: Update .env File

Add/update these lines in your `.env` file:

```env
SHOPIFY_API_KEY=paste_client_id_here
SHOPIFY_API_SECRET=paste_client_secret_here
SHOPIFY_APP_URL=https://cynthia-vaccinial-teisha.ngrok-free.dev
SHOPIFY_SCOPES=read_products,write_products,read_orders,read_shipping,write_shipping
```

Replace `paste_client_id_here` and `paste_client_secret_here` with the values from Step 1.

## Step 3: Restart Server

```bash
# Stop server (Ctrl+C)
npm start
```

## Step 4: Install App

Visit this URL in your browser:

```
https://cynthia-vaccinial-teisha.ngrok-free.dev/?shop=spare-part-mart.myshopify.com
```

Complete the OAuth installation.

## Step 5: Enable Carrier Service

1. Go to: `https://cynthia-vaccinial-teisha.ngrok-free.dev/shipping-rates.html`
2. Click: **"Enable Carrier Service"**
3. Check browser console for success message
4. Go to: Shopify Admin → Settings → Shipping & delivery
5. Click: **"Manage rates"** for your shipping zone
6. Click: **"Add rate"** → **"Use carrier or app to calculate rates"**
7. You should see **"BuckyDrop Shipping"** in the dropdown! 🎉

---

**Keep ngrok running** - if you stop it, the URL will change and you'll need to update Shopify.

