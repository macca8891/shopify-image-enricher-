# Get Shopify Access Token - Step by Step

## Step 1: Go to Apps Settings

1. Go to: `https://app-test-1111231295.myshopify.com/admin`
2. Click **Settings** (gear icon at bottom left)
3. Click **Apps and sales channels**

## Step 2: Create Custom App

1. Scroll down to **"Develop apps"** section
2. Click **"Develop apps"** button
3. Click **"Create an app"**
4. Enter app name: `BuckyDrop Shipping`
5. Click **"Create app"**

## Step 3: Configure API Scopes

1. After creating, you'll see the app page
2. Click **"Configure Admin API scopes"** button (or tab)
3. Scroll down to find these scopes and check them:
   - ✅ **Read products**
   - ✅ **Write products** 
   - ✅ **Read orders**
   - ✅ **Read shipping**
   - ✅ **Write shipping**
4. Click **"Save"**

## Step 4: Install App

1. Click **"Install app"** button (top right)
2. Click **"Install"** to confirm

## Step 5: Get Access Token

1. After installation, you'll see **"Admin API access token"**
2. Click **"Reveal token once"** or **"Show token"**
3. **Copy the token** - you'll need it!

## Step 6: Add to .env

Add this line to your `.env` file:
```
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxx
```

Replace `shpat_xxxxxxxxxxxxxxxxxxxxx` with your actual token.

## Step 7: Register Carrier Service

Run:
```bash
node register-carrier-simple.js
```

Done!

