# ⚡ Simple Setup - 3 Steps

## Step 1: Get Your ngrok URL

**Terminal 1** - Start server:
```bash
npm start
```

**Terminal 2** - Start ngrok:
```bash
ngrok http 3001
```

**Copy the HTTPS URL** - it looks like: `https://abc123.ngrok-free.app`

## Step 2: Create App in Shopify

1. Go to: https://partners.shopify.com
2. Login with: sparepartmartsales@gmail.com
3. Click: **Apps** → **Create app** → **Custom app**
4. Fill in:
   - **App name**: `BuckyDrop Shipping`
   - **App URL**: Paste your ngrok URL here (e.g., `https://abc123.ngrok-free.app`)
   - **Redirect URL**: Paste your ngrok URL + `/api/auth/shopify/callback` (e.g., `https://abc123.ngrok-free.app/api/auth/shopify/callback`)
5. Click **Configure** → **Scopes** → Add these:
   - `read_products`
   - `write_products`
   - `read_orders`
   - `read_shipping`
   - `write_shipping`
6. Click **Save**
7. Go to **API credentials** tab
8. Copy **Client ID** and **Client secret**

## Step 3: Update .env

Add these 4 lines to your `.env` file:

```env
SHOPIFY_API_KEY=paste_client_id_here
SHOPIFY_API_SECRET=paste_client_secret_here
SHOPIFY_APP_URL=paste_ngrok_url_here
SHOPIFY_SCOPES=read_products,write_products,read_orders,read_shipping,write_shipping
```

**Replace**:
- `paste_client_id_here` → Your Client ID from Shopify
- `paste_client_secret_here` → Your Client Secret from Shopify  
- `paste_ngrok_url_here` → Your ngrok URL (e.g., `https://abc123.ngrok-free.app`)

Then restart server: `npm start`

## Done! 

Visit: `https://your-ngrok-url/?shop=spare-part-mart.myshopify.com`

---

**That's it!** Just 3 steps. No need to overthink it.

