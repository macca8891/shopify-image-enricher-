# 🚀 Simple Setup - Custom App (Just for Your Store)

**UPDATE**: As of Jan 1, 2026, legacy custom apps are deprecated. We'll create a **Custom app through Partners** instead (still private to you).

See **FINAL-SIMPLE-SETUP.md** for the updated process.

## Step 1: Create Custom App in Shopify Admin

1. Go to: `https://spare-part-mart.myshopify.com/admin`
2. Click: **Settings** (bottom left)
3. Click: **Apps and sales channels**
4. Click: **Develop apps** (at the bottom)
5. Click: **Create an app**
6. Name: `BuckyDrop Shipping`
7. Click: **Create app**

## Step 2: Configure API Scopes

1. Click: **Configure Admin API scopes**
2. Add these scopes:
   - ✅ `read_products`
   - ✅ `write_products`
   - ✅ `read_orders` ⚠️ **REQUIRED for carrier services**
   - ✅ `read_shipping`
   - ✅ `write_shipping`
3. Click: **Save**

## Step 3: Install & Get Token

1. Click: **Install app** (top right)
2. Click: **Install** (confirm)
3. **Copy the Admin API access token** (you'll see it after installation - looks like `shpat_abc123...`)

## Step 4: Configure Your App

1. Go to your shipping rates page: `http://localhost:3001/shipping-rates.html`
2. Open browser console (F12)
3. Run this command (replace with your token):

```javascript
fetch('/api/auth/manual', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    shop: 'spare-part-mart.myshopify.com',
    accessToken: 'YOUR_ADMIN_API_TOKEN_HERE'
  })
}).then(r => r.json()).then(console.log)
```

Replace `YOUR_ADMIN_API_TOKEN_HERE` with your actual token from Step 3.

## Step 5: Enable Carrier Service

**BUT WAIT** - For carrier services to work, Shopify needs to call your app via HTTPS. 

You have two options:

### Option A: Use ngrok (for testing)
1. Set up ngrok (see SETUP-NGROK.md)
2. Start ngrok: `ngrok http 3001`
3. Copy the HTTPS URL
4. Update `.env` with that URL
5. Then register carrier service

### Option B: Deploy to production
Deploy your app to Heroku/Railway/etc. with HTTPS, then use that URL.

---

## Actually, Even Simpler...

For carrier services, you might not even need ngrok if you're just testing locally. The carrier service callback happens at checkout, so you'd need it deployed anyway.

**For now, just:**
1. Create the custom app ✅
2. Get the Admin API token ✅
3. Use manual auth to configure it ✅
4. Test the shipping rate calculations ✅

Then when you're ready to go live, deploy to production and register the carrier service.

---

**Want me to help you test the carrier service registration once you have the token?**

