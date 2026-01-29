# 🧪 Developer Store Setup - Step by Step

## Prerequisites
- Developer store domain (e.g., `your-dev-store.myshopify.com`)
- Server and ngrok running

---

## Step 1: Start Server & ngrok

**Terminal 1** - Start server:
```bash
cd /Users/michaelmchugh/shopify-image-enricher
npm start
```

Wait until you see: `🚀 BuckyDrop Shipping running on port 3001`

**Terminal 2** - Start ngrok:
```bash
ngrok http 3001
```

**Copy the HTTPS URL** - it looks like: `https://abc123.ngrok-free.app`

**⚠️ Keep both terminals open!**

---

## Step 2: Create App in Shopify Partners

1. Go to: https://partners.shopify.com
2. Login with your Shopify Partners account
3. Click: **Apps** → **Create app** → **Custom app**
4. Fill in:
   - **App name**: `BuckyDrop Shipping`
   - **App URL**: Paste your ngrok URL (e.g., `https://abc123.ngrok-free.app`)
     - ⚠️ NO trailing slash!
   - **Allowed redirection URLs**: 
     ```
     https://abc123.ngrok-free.app/api/auth/shopify/callback
     ```
     - Replace `abc123.ngrok-free.app` with your actual ngrok URL
     - ⚠️ NO trailing slash!

5. Click **Configure** → **Scopes** → Add these:
   - ✅ `read_products`
   - ✅ `write_products`
   - ✅ `read_orders` ⚠️ **REQUIRED for carrier services**
   - ✅ `read_shipping`
   - ✅ `write_shipping`

6. Click **Save**

7. Go to **API credentials** tab

8. Copy these two values:
   - **Client ID** (API Key)
   - **Client secret** (API Secret)

---

## Step 3: Update .env File

Open `.env` file and add/update these lines:

```env
SHOPIFY_API_KEY=paste_client_id_here
SHOPIFY_API_SECRET=paste_client_secret_here
SHOPIFY_APP_URL=https://abc123.ngrok-free.app
SHOPIFY_SCOPES=read_products,write_products,read_orders,read_shipping,write_shipping
```

**Replace:**
- `paste_client_id_here` → Your Client ID from Step 2
- `paste_client_secret_here` → Your Client Secret from Step 2
- `abc123.ngrok-free.app` → Your actual ngrok URL

---

## Step 4: Restart Server

**In Terminal 1**, stop the server (Ctrl+C) and restart:
```bash
npm start
```

---

## Step 5: Install App on Developer Store

1. Visit this URL in your browser (replace with your dev store domain):
   ```
   https://your-ngrok-url/?shop=your-dev-store.myshopify.com
   ```
   
   Example:
   ```
   https://abc123.ngrok-free.app/?shop=test-store.myshopify.com
   ```

2. You'll be redirected to Shopify to authorize the app

3. Click **Install** or **Allow**

4. You should be redirected back to your app

---

## Step 6: Enable Carrier Service

1. Go to: `https://your-ngrok-url/shipping-rates.html?shop=your-dev-store.myshopify.com`

2. You should see a section: **"Carrier Calculated Shipping (CCS)"**

3. Click: **"Enable Carrier Service"**

4. Wait for success message: ✅ **"Carrier service registered successfully!"**

---

## Step 7: Test in Shopify Admin

1. Go to your developer store admin: `https://your-dev-store.myshopify.com/admin`

2. Navigate to: **Settings** → **Shipping and delivery**

3. Click: **"Manage rates"** for your shipping zone

4. Click: **"Add rate"**

5. Select: **"Use carrier or app to calculate rates"**

6. In the dropdown, you should see: **"BuckyDrop Shipping"** 🎉

7. Select it and click **Done**

---

## Step 8: Test at Checkout

1. Add a product to cart in your developer store

2. Go to checkout

3. Enter a shipping address

4. You should see **BuckyDrop Standard** and/or **BuckyDrop Express** rates appear!

---

## Troubleshooting

### "App URL is invalid"
- Make sure server is running (Terminal 1)
- Make sure ngrok is running (Terminal 2)
- Test the ngrok URL in your browser - it should load your app
- Make sure there's NO trailing slash in the URL

### "Carrier service not showing in dropdown"
- Check browser console for errors
- Make sure you clicked "Enable Carrier Service" successfully
- Wait 1-2 minutes for Shopify to sync
- Try refreshing the shipping settings page

### "No rates showing at checkout"
- Check server logs for errors
- Make sure products have dimensions/weight in metafields
- Check that BuckyDrop API credentials are correct in `.env`

---

## Next Steps

Once everything works on the developer store, you can:
1. Test thoroughly with different products and addresses
2. Fix any issues
3. Then install on your live store

