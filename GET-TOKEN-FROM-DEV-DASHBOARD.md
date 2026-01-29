# Get Admin API Access Token - Dev Dashboard App

## ⚠️ Important: Scopes are NOT configured in Settings/Versions UI

In Shopify's Dev Dashboard, you **don't configure scopes in Settings or Versions**. 

**Scopes are approved when you install the app on your store.**

## Step-by-Step:

### Step 1: Install Your App on Your Store

1. In Dev Dashboard, click **"Home"** (left sidebar, under BuckyDrop Shipping v3)
2. Scroll down to find **"Installs"** section
3. Click **"Install app"** button
4. Select your dev store (e.g., `app-test-1111231295.myshopify.com`)
5. Click **"Install"**

### Step 2: Approve Scopes During Installation

When you install, Shopify shows a permissions screen. **Check these scopes:**
- ✅ **Read products**
- ✅ **Write products**  
- ✅ **Read orders** (REQUIRED for carrier services)
- ✅ **Read shipping**
- ✅ **Write shipping**

Click **"Install"** to confirm.

### Step 3: Get Your Access Token

After installation:

1. Still in Dev Dashboard → **"Home"**
2. In **"Installs"** section, find your store
3. Click on your **store name** (it's a link)
4. You'll see **"Admin API access token"** section
5. Click **"Reveal token once"** or the eye icon 👁️
6. **Copy the token** (starts with `shpat_`)

**⚠️ IMPORTANT:** Copy it now - you might not be able to see it again!

### Step 4: Add to .env File

Open your `.env` file and add:

```env
SHOPIFY_ACCESS_TOKEN=shpat_your_actual_token_here
SHOP_DOMAIN=app-test-1111231295.myshopify.com
SHOPIFY_APP_URL=http://localhost:3001
```

Replace `shpat_your_actual_token_here` with the token you copied.

### Step 5: Register Carrier Service

Run this command:

```bash
node register-carrier-simple.js
```

If it works, you'll see:
```
✅ Carrier service registered!
   ID: 12345678
   Name: BuckyDrop Shipping
```

### Step 6: Test in Shopify

1. Go to Shopify Admin → **Settings** → **Shipping and delivery**
2. Click **"Manage rates"**
3. Click **"Add rate"** or edit an existing rate
4. Under **"Use carrier or app"**, select **"BuckyDrop Shipping"**

Done! No OAuth, no ngrok - just a simple access token like the image enricher app.

